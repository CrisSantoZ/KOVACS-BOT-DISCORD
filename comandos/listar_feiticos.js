// Comando para listar feitiços disponíveis
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const FEITICOS_BASE_ARCADIA = require('../dados/feiticos.js');

async function listarFeiticos(message, args, getFichaOuCarregar) {
    try {
        const ficha = await getFichaOuCarregar(message.author.id);
        if (!ficha) {
            return message.reply("❌ Você precisa criar uma ficha primeiro! Use `/criar` para começar sua jornada em Arcádia.");
        }

        // Se não há argumentos, mostrar categorias
        if (!args || args.length === 0) {
            return mostrarCategoriasFeiticos(message);
        }

        const categoria = args[0].toLowerCase();
        
        switch (categoria) {
            case 'raca':
            case 'raça':
                return mostrarFeiticosPorOrigem(message, 'raca', ficha);
            case 'classe':
                return mostrarFeiticosPorOrigem(message, 'classe', ficha);
            case 'especial':
                return mostrarFeiticosPorOrigem(message, 'classe_especial', ficha);
            case 'conhecidos':
                return mostrarFeiticosConhecidos(message, ficha);
            case 'info':
                if (args[1]) {
                    return mostrarInfoFeitico(message, args[1], ficha);
                } else {
                    return message.reply("❌ Especifique o ID do feitiço. Exemplo: `!listarfeiticos info raca_humano_cura_menor`");
                }
            default:
                return mostrarCategoriasFeiticos(message);
        }
    } catch (error) {
        console.error('[LISTAR FEITIÇOS] Erro:', error);
        return message.reply("❌ Erro interno ao listar feitiços.");
    }
}

function mostrarCategoriasFeiticos(message) {
    const embed = new EmbedBuilder()
        .setTitle("📜 Sistema de Feitiços de Arcádia")
        .setDescription("Escolha uma categoria para explorar os feitiços disponíveis:")
        .addFields(
            { 
                name: "🧬 Feitiços de Raça", 
                value: "`!listarfeiticos raca` - Feitiços únicos da sua raça", 
                inline: true 
            },
            { 
                name: "⚔️ Feitiços de Classe", 
                value: "`!listarfeiticos classe` - Feitiços da sua classe", 
                inline: true 
            },
            { 
                name: "✨ Feitiços Especiais", 
                value: "`!listarfeiticos especial` - Feitiços de classes especiais", 
                inline: true 
            },
            { 
                name: "📚 Feitiços Conhecidos", 
                value: "`!listarfeiticos conhecidos` - Seus feitiços aprendidos", 
                inline: true 
            },
            { 
                name: "🔍 Informações Detalhadas", 
                value: "`!listarfeiticos info <id>` - Detalhes de um feitiço específico", 
                inline: true 
            },
            { 
                name: "💡 Dica", 
                value: "Use os feitiços em combate com `!usarfeitico <id>`", 
                inline: false 
            }
        )
        .setColor(0x9932CC)
        .setFooter({ text: "Sistema de Magia de Arcádia" });

    return message.reply({ embeds: [embed] });
}

async function mostrarFeiticosPorOrigem(message, tipoOrigem, ficha) {
    const feiticosFiltrados = Object.values(FEITICOS_BASE_ARCADIA).filter(feitico => {
        if (feitico.origemTipo !== tipoOrigem) return false;
        
        // Filtrar por raça/classe do jogador
        if (tipoOrigem === 'raca' && feitico.origemNome !== ficha.raca) return false;
        if (tipoOrigem === 'classe' && feitico.origemNome !== ficha.classe) return false;
        
        return true;
    });

    if (feiticosFiltrados.length === 0) {
        const tipoTexto = tipoOrigem === 'raca' ? 'raça' : 'classe';
        return message.reply(`❌ Não há feitiços disponíveis para sua ${tipoTexto}.`);
    }

    // Agrupar por nível de requisito
    const feiticosPorNivel = {};
    feiticosFiltrados.forEach(feitico => {
        const nivelReq = feitico.requisitosParaAprender.length > 0 ? 
            Math.max(...feitico.requisitosParaAprender.map(req => req.nivelMinimo || 1)) : 1;
        
        if (!feiticosPorNivel[nivelReq]) {
            feiticosPorNivel[nivelReq] = [];
        }
        feiticosPorNivel[nivelReq].push(feitico);
    });

    const embed = new EmbedBuilder()
        .setTitle(`📜 Feitiços de ${tipoOrigem === 'raca' ? 'Raça' : 'Classe'}: ${ficha[tipoOrigem]}`)
        .setDescription("Feitiços disponíveis organizados por nível de requisito:")
        .setColor(0x9932CC);

    Object.keys(feiticosPorNivel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(nivel => {
        const feiticos = feiticosPorNivel[nivel];
        const feiticosTexto = feiticos.map(f => {
            const conhecido = ficha.magiasConhecidas?.find(m => m.id === f.id);
            const status = conhecido ? `✅ Nv.${conhecido.nivel}` : '❌';
            return `${status} **${f.nome}** (${f.id})`;
        }).join('\n');

        embed.addFields({
            name: `🎯 Nível ${nivel}+`,
            value: feiticosTexto || 'Nenhum feitiço disponível',
            inline: false
        });
    });

    embed.setFooter({ text: "Use !listarfeiticos info <id> para mais detalhes" });

    return message.reply({ embeds: [embed] });
}

async function mostrarFeiticosConhecidos(message, ficha) {
    if (!ficha.magiasConhecidas || ficha.magiasConhecidas.length === 0) {
        return message.reply("❌ Você ainda não aprendeu nenhum feitiço. Use `!aprenderfeitico` para aprender novos feitiços!");
    }

    const embed = new EmbedBuilder()
        .setTitle(`📚 Feitiços Conhecidos - ${ficha.nomePersonagem}`)
        .setDescription(`Você conhece **${ficha.magiasConhecidas.length}** feitiços:`)
        .setColor(0x00FF00);

    // Agrupar por origem
    const feiticosPorOrigem = {};
    ficha.magiasConhecidas.forEach(magiaAprendida => {
        const feiticoBase = FEITICOS_BASE_ARCADIA[magiaAprendida.id];
        if (!feiticoBase) return;

        const origem = `${feiticoBase.origemTipo}_${feiticoBase.origemNome}`;
        if (!feiticosPorOrigem[origem]) {
            feiticosPorOrigem[origem] = [];
        }
        feiticosPorOrigem[origem].push({ ...magiaAprendida, base: feiticoBase });
    });

    Object.keys(feiticosPorOrigem).forEach(origem => {
        const feiticos = feiticosPorOrigem[origem];
        const [tipo, nome] = origem.split('_', 2);
        const tipoTexto = tipo === 'raca' ? '🧬 Raça' : tipo === 'classe' ? '⚔️ Classe' : '✨ Especial';
        
        const feiticosTexto = feiticos.map(f => {
            const detalhesNivel = f.base.niveis.find(n => n.nivel === f.nivel);
            const custoPM = detalhesNivel?.custoPM || 0;
            const cooldown = f.base.cooldownSegundos || 0;
            
            return `**${f.base.nome}** (Nv.${f.nivel})\n` +
                   `└ 💙 ${custoPM} PM | ⏱️ ${cooldown}s | ID: \`${f.id}\``;
        }).join('\n\n');

        embed.addFields({
            name: `${tipoTexto}: ${nome}`,
            value: feiticosTexto,
            inline: false
        });
    });

    embed.setFooter({ text: "Use !usarfeitico <id> em combate para usar um feitiço" });

    return message.reply({ embeds: [embed] });
}

async function mostrarInfoFeitico(message, idFeitico, ficha) {
    const feiticoBase = FEITICOS_BASE_ARCADIA[idFeitico];
    if (!feiticoBase) {
        return message.reply("❌ Feitiço não encontrado. Verifique o ID do feitiço.");
    }

    const magiaAprendida = ficha.magiasConhecidas?.find(m => m.id === idFeitico);
    const nivelAtual = magiaAprendida?.nivel || 0;

    const embed = new EmbedBuilder()
        .setTitle(`✨ ${feiticoBase.nome}`)
        .setDescription(feiticoBase.descricao)
        .addFields(
            { name: "🏷️ ID", value: feiticoBase.id, inline: true },
            { name: "📋 Tipo", value: feiticoBase.tipo, inline: true },
            { name: "🎯 Origem", value: `${feiticoBase.origemTipo}: ${feiticoBase.origemNome}`, inline: true },
            { name: "⏱️ Cooldown Base", value: `${feiticoBase.cooldownSegundos || 0}s`, inline: true },
            { name: "📊 Nível Máximo", value: feiticoBase.maxNivel.toString(), inline: true },
            { name: "📚 Status", value: magiaAprendida ? `✅ Conhecido (Nv.${nivelAtual})` : "❌ Não aprendido", inline: true }
        )
        .setColor(magiaAprendida ? 0x00FF00 : 0xFF6B6B);

    // Mostrar requisitos
    if (feiticoBase.requisitosParaAprender.length > 0) {
        const requisitos = feiticoBase.requisitosParaAprender.map(req => {
            const feiticoReq = FEITICOS_BASE_ARCADIA[req.idFeitico];
            const temRequisito = ficha.magiasConhecidas?.find(m => m.id === req.idFeitico && m.nivel >= req.nivelMinimo);
            const status = temRequisito ? "✅" : "❌";
            return `${status} ${feiticoReq?.nome || req.idFeitico} (Nv.${req.nivelMinimo})`;
        }).join('\n');

        embed.addFields({ name: "📋 Requisitos", value: requisitos, inline: false });
    }

    // Mostrar níveis do feitiço
    const niveisTexto = feiticoBase.niveis.map(nivel => {
        const status = nivelAtual >= nivel.nivel ? "✅" : "❌";
        const custoPM = nivel.custoPM || 0;
        const pontos = nivel.pontosParaProximoNivel || 0;
        
        return `${status} **Nível ${nivel.nivel}** (${custoPM} PM)\n` +
               `└ ${nivel.efeitoDesc}\n` +
               `└ Pontos necessários: ${pontos}`;
    }).join('\n\n');

    embed.addFields({ name: "📈 Níveis do Feitiço", value: niveisTexto, inline: false });

    // Mostrar feitiços desbloqueados
    if (feiticoBase.desbloqueiaFeiticos.length > 0) {
        const desbloqueados = feiticoBase.desbloqueiaFeiticos.map(desb => {
            const feiticoDesb = FEITICOS_BASE_ARCADIA[desb.idFeitico];
            return `**${feiticoDesb?.nome || desb.idFeitico}** (ao atingir nv.${desb.aoAtingirNivel})`;
        }).join('\n');

        embed.addFields({ name: "🔓 Desbloqueia", value: desbloqueados, inline: false });
    }

    return message.reply({ embeds: [embed] });
}

module.exports = { listarFeiticos };
