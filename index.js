const { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();
const Arcadia = require('./arcadia_sistema.js');


process.on('unhandledRejection', error => {
    console.error('GRAVE: Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('GRAVE: Uncaught exception:', error);
    process.exit(1);
});

// --- CONSTANTES DE RESTRIÇÃO DE CANAL ---
const COMANDOS_CANAL_BEMVINDO = ['historia', 'listaracas', 'listaclasses', 'listareinos', 'comandos', 'ping', 'oi', 'arcadia', 'bemvindo'];
const COMANDOS_GERAIS_PERMITIDOS_EM_OUTROS_CANAIS = ['comandos', 'ficha', 'distribuirpontos', 'jackpot', 'usaritem', 'usarfeitico', 'aprenderfeitico', 'meusfeiticos', 'ping', 'historia', 'interagir'];
const COMANDOS_CANAL_RECRUTAMENTO = ['criar', 'ficha', 'comandos', 'ping', 'listaracas', 'listaclasses', 'listareinos'];
const COMANDOS_CANAL_ATUALIZACAO_FICHAS = ['ficha', 'distribuirpontos', 'comandos', 'ping'];

// --- Configuração do Express para Keep-Alive ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Arcádia (Discord) está online e operante!'));
app.listen(port, () => console.log(`Servidor web de keep-alive rodando na porta ${port}.`));

// --- Inicialização do Cliente Discord ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message]
});

const OWNER_ID_DISCORD = process.env.OWNER_ID;

// Cache para combates ativos
const combatesAtivos = {};

// Exportar para que arcadia_sistema.js possa acessar
module.exports = { combatesAtivos };

// --- Evento: Bot Pronto ---
client.on('ready', async () => {
    console.log(`Logado no Discord como ${client.user.tag}!`);
    client.user.setActivity('Arcádia RPG | Use /comandos', { type: ActivityType.Playing });
    try {
        await Arcadia.conectarMongoDB();
        await Arcadia.carregarFichasDoDB();
        console.log("Conexão com MongoDB e carregamento de dados iniciais concluídos.");
    } catch (error) {
        console.error("ERRO CRÍTICO na inicialização do DB no evento 'ready':", error);
    }
});

// --- Evento: Novo Membro no Servidor ---
client.on('guildMemberAdd', async member => {
    if (member.user.bot) return;
    console.log(`[EVENTO] Novo membro entrou: ${member.user.tag} (${member.id}) no servidor ${member.guild.name}`);

    const canalBoasVindas = member.guild.channels.cache.get(Arcadia.ID_CANAL_BOAS_VINDAS_RPG);
    if (canalBoasVindas && canalBoasVindas.isTextBased()) {
        try {
            const embedBoasVindas = Arcadia.gerarMensagemBoasVindas(member.displayName || member.user.username);
            await canalBoasVindas.send({ embeds: [embedBoasVindas] });
            console.log(`[BOAS-VINDAS] Mensagem enviada para ${member.user.tag}.`);
        } catch (error) {
            console.error(`[BOAS-VINDAS] Erro ao enviar mensagem para ${member.user.tag}:`, error);
        }
    } else {
        console.warn(`[AVISO DE CONFIG] Canal de boas-vindas ID "${Arcadia.ID_CANAL_BOAS_VINDAS_RPG}" não encontrado ou não é textual.`);
    }

    try {
        const cargoVisitante = member.guild.roles.cache.find(role => role.name === Arcadia.NOME_CARGO_VISITANTE);
        if (cargoVisitante) {
            await member.roles.add(cargoVisitante);
            console.log(`[CARGO] Cargo "${Arcadia.NOME_CARGO_VISITANTE}" adicionado a ${member.user.tag}.`);
        } else {
            console.warn(`[AVISO DE CONFIG] Cargo de visitante "${Arcadia.NOME_CARGO_VISITANTE}" não encontrado.`);
        }
    } catch (error) {
        console.error(`[CARGO] Erro ao adicionar cargo "${Arcadia.NOME_CARGO_VISITANTE}" para ${member.user.tag}:`, error);
    }
});

// --- HANDLERS ORGANIZADOS ---

// Handler para Autocomplete
async function handleAutocomplete(interaction) {
    const commandName = interaction.commandName;
    const focusedOption = interaction.options.getFocused(true);
    let choices = [];
    const jogadorId = interaction.user.id;

    try {
        if (interaction.responded) {
            console.warn("[AUTOCOMPLETE] Interação já foi respondida, ignorando...");
            return;
        }

        if (commandName === 'usarfeitico' && focusedOption.name === 'feitico') {
            const magiasConhecidas = await Arcadia.getMagiasConhecidasParaAutocomplete(jogadorId);
            if (magiasConhecidas) {
                choices = magiasConhecidas
                    .filter(magia => magia.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .map(magia => ({ name: magia.name, value: magia.value }));
            }
        } else if (commandName === 'aprenderfeitico' && focusedOption.name === 'feitico') {
            const feiticosDisponiveis = await Arcadia.getFeiticosDisponiveisParaAprender(jogadorId);
            if (feiticosDisponiveis) {
                choices = feiticosDisponiveis
                    .filter(feitico => feitico.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .map(feitico => ({ name: feitico.name, value: feitico.value }));
            }
        } else if (commandName === 'usaritem' && focusedOption.name === 'item') {
            const itensInventario = await Arcadia.getInventarioParaAutocomplete(jogadorId);
            if (itensInventario) {
                choices = itensInventario
                    .filter(item => item.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .map(item => ({ name: item.name, value: item.value }));
            }
        } else if (commandName === 'uparfeitico' && focusedOption.name === 'feitico') {
            const feiticosUparaveis = await Arcadia.getFeiticosUparaveisParaAutocomplete(jogadorId);
            choices = [];
            if (feiticosUparaveis) {
                choices = feiticosUparaveis
                    .filter(f => f.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 25);
            }
        } else if (commandName === 'adminadditem' && focusedOption.name === 'item') {
            const itensBase = await Arcadia.getItensBaseParaAutocomplete();
            if (itensBase) {
                choices = itensBase
                    .filter(item => item.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .map(item => ({ name: item.name, value: item.value }));
            }
        } else if (commandName === 'admindelitem' && focusedOption.name === 'item') {
            const alvoId = interaction.options.getUser('jogador')?.id;
            if (alvoId) {
                const itensInventarioAlvo = await Arcadia.getInventarioParaAutocomplete(alvoId);
                if (itensInventarioAlvo) {
                    choices = itensInventarioAlvo
                        .filter(item => item.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                        .map(item => ({ name: item.name, value: item.value }));
                }
            } else {
                choices.push({name: `(Primeiro selecione o jogador alvo)`, value: focusedOption.value || "placeholder_no_alvo"});
            }
        } else if (commandName === 'interagir' && focusedOption.name === 'npc') {
            const todosNPCs = await Arcadia.getTodosNPCsParaAutocomplete();
            if (todosNPCs) {
                choices = todosNPCs
                    .filter(npc => npc.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .map(npc => ({ name: npc.name, value: npc.value }));
            }
        }

        if (!interaction.responded) {
            await interaction.respond(choices.slice(0, 25) || []);
        }
    } catch (error) {
        console.error(`[AUTOCOMPLETE] Erro ao processar autocomplete para /${commandName}, opção ${focusedOption.name}:`, error.message);
        if (!interaction.responded && error.code !== 10062 && !error.message.includes("Unknown interaction")) {
            try {
                await interaction.respond([]);
            } catch (respondError) {
                console.error("[AUTOCOMPLETE] Erro ao responder com lista vazia:", respondError.message);
            }
        }
    }
}

// Handler para Select Menus
async function handleSelectMenu(interaction) {
    console.log(`[SELECT MENU] Processando: ${interaction.customId}`);
    
    try {
        // **CRITICAL: Sempre fazer deferUpdate primeiro para select menus**
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }

        if (interaction.customId.startsWith('combate_SELECTFEITICO_')) {
            await handleSelectFeiticoCombate(interaction);
        } else if (interaction.customId.startsWith('combate_SELECTITEM_')) {
            await handleSelectItemCombate(interaction);
        } else {
            console.warn(`[SELECT MENU] CustomId não reconhecido: ${interaction.customId}`);
            await interaction.editReply({ 
                content: "Seleção não reconhecida.", 
                components: [],
                embeds: []
            });
        }
    } catch (error) {
        console.error(`[SELECT MENU] Erro crítico ao processar ${interaction.customId}:`, error);
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: "Ocorreu um erro ao processar sua seleção.", 
                    ephemeral: true 
                });
            } else {
                await interaction.editReply({ 
                    content: "Ocorreu um erro ao processar sua seleção.", 
                    components: [],
                    embeds: []
                });
            }
        } catch (editError) {
            console.error("[SELECT MENU] Erro ao tentar responder sobre erro:", editError);
        }
    }
}

// Handler específico para Select de Feitiços em Combate
async function handleSelectFeiticoCombate(interaction) {
    const idCombate = interaction.customId.replace('combate_SELECTFEITICO_', '');
    const idFeiticoSelecionado = interaction.values[0];
    const senderIdButton = interaction.user.id;

    console.log(`[SELECT FEITICO] Combate: ${idCombate}, Feitiço: ${idFeiticoSelecionado}`);

    if (!combatesAtivos[idCombate]) {
        await interaction.editReply({ 
            content: "❌ Esse combate não está mais ativo!", 
            components: [],
            embeds: []
        });
        return;
    }

    // Executa o feitiço escolhido
    const resultado = await Arcadia.processarAcaoJogadorCombate(
        idCombate,
        senderIdButton,
        "USAR_FEITICO",
        { idFeitico: idFeiticoSelecionado }
    );

    if (!resultado || typeof resultado !== 'object') {
        await interaction.editReply({ 
            content: "❌ Erro crítico ao usar feitiço (retorno inesperado).", 
            components: [],
            embeds: []
        });
        return;
    }

    if (resultado.erro) {
        await interaction.editReply({ 
            content: `❌ Erro ao usar feitiço: ${resultado.erro}`, 
            components: [],
            embeds: []
        });
        return;
    }

    // Processar resultado e atualizar embed
    await processarResultadoCombate(interaction, resultado, idCombate, senderIdButton, "🔮 Combate (Feitiço)", 0x800080);
}

// Handler específico para Select de Itens em Combate
async function handleSelectItemCombate(interaction) {
    const customIdParts = interaction.customId.split('_');
    const idCombate = customIdParts.slice(2).join('_');
    const nomeItemSelecionado = interaction.values[0];
    const senderIdButton = interaction.user.id;

    console.log(`[SELECT ITEM] Combate: ${idCombate}, Item: ${nomeItemSelecionado}`);

    if (!combatesAtivos[idCombate]) {
        await interaction.editReply({ 
            content: "❌ Esse combate não está mais ativo!", 
            components: [],
            embeds: []
        });
        return;
    }

    const resultado = await Arcadia.processarAcaoJogadorCombate(
        idCombate, 
        senderIdButton, 
        "USAR_ITEM", 
        { nomeItem: nomeItemSelecionado }
    );

    if (!resultado || typeof resultado !== 'object') {
        await interaction.editReply({ 
            content: "❌ Erro crítico ao usar item.", 
            components: [],
            embeds: []
        });
        return;
    }

    if (resultado.erro) {
        await interaction.editReply({ 
            content: `❌ Erro ao usar item: ${resultado.erro}`, 
            components: [],
            embeds: []
        });
        return;
    }

    // Processar resultado e atualizar embed
    await processarResultadoCombate(interaction, resultado, idCombate, senderIdButton, "🎒 Combate (Item)", 0xF8C300);
}

// Função auxiliar para processar resultado de combate (evita código duplicado)
async function processarResultadoCombate(interaction, resultado, idCombate, senderIdButton, tituloEmbed, corEmbed) {
    const jogadorEstado = resultado.estadoCombate?.jogador;
    const mobEstado = resultado.estadoCombate?.mob;

    let embedCombate = new EmbedBuilder()
        .setColor(corEmbed)
        .setTitle(tituloEmbed)
        .setDescription((resultado.logTurnoAnterior || []).join('\n'))
        .addFields(
            { 
                name: `👤 ${jogadorEstado?.nome ?? "Jogador"}`, 
                value: `❤️ PV: **${jogadorEstado?.pvAtual ?? "?"}/${jogadorEstado?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstado?.pmAtual ?? "?"}/${jogadorEstado?.pmMax ?? "?"}**`, 
                inline: true 
            },
            { name: `\u200B`, value: `\u200B`, inline: true },
            { 
                name: `👹 ${mobEstado?.nome ?? "Criatura"} (Nv. ${typeof mobEstado?.nivel === "number" ? mobEstado.nivel : "?"})`, 
                value: `❤️ PV: **${mobEstado?.pvAtual ?? "?"}/${mobEstado?.pvMax ?? "?"}**`, 
                inline: true 
            }
        );

    // Adicionar imagem do mob se disponível
    if (mobEstado?.imagem && (mobEstado.imagem.startsWith('http://') || mobEstado.imagem.startsWith('https://'))) {
        embedCombate.setThumbnail(mobEstado.imagem.trim());
    }

    // Vitória do jogador
    if (resultado.mobDerrotado) {
        const resultadoFinal = await Arcadia.finalizarCombate(idCombate, senderIdButton, true, resultado.dadosParaFinalizar?.eUltimoMobDaMissao);
        
        embedCombate.setTitle("🏆 VITÓRIA! 🏆")
            .setColor(0x00FF00)
            .setDescription((resultadoFinal.logCombateFinal || resultado.logTurnoAnterior).join('\n'));

        if (resultadoFinal.recompensasTextoFinal && resultadoFinal.recompensasTextoFinal.length > 0) {
            embedCombate.addFields({
                name: "🎁 Recompensas Obtidas",
                value: resultadoFinal.recompensasTextoFinal.join('\n')
            });
        }

        await interaction.editReply({ embeds: [embedCombate], components: [] });
        return;
    }

    // Turno do mob
    if (resultado.proximoTurno === 'mob') {
        const resultadoTurnoMob = await Arcadia.processarTurnoMobCombate(idCombate);
        
        if (!resultadoTurnoMob || typeof resultadoTurnoMob !== 'object') {
            await interaction.editReply({ 
                content: "❌ Erro crítico no turno do oponente.", 
                components: [],
                embeds: []
            });
            return;
        }

        let logCombateAtualizado = resultado.logTurnoAnterior || [];
        
        if (resultadoTurnoMob.erro) {
            logCombateAtualizado.push(`⚠️ Erro no turno do oponente: ${resultadoTurnoMob.erro}`);
        } else {
            logCombateAtualizado.push(...(resultadoTurnoMob.logTurnoAnterior || []));
        }

        const jogadorEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.jogador || jogadorEstado;
        const mobEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.mob || mobEstado;
        
        embedCombate.setDescription(logCombateAtualizado.join('\n'));
        embedCombate.setFields(
            { 
                name: `👤 ${jogadorEstadoTurnoMob?.nome ?? "Jogador"}`, 
                value: `❤️ PV: **${jogadorEstadoTurnoMob?.pvAtual ?? "?"}/${jogadorEstadoTurnoMob?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoTurnoMob?.pmAtual ?? "?"}/${jogadorEstadoTurnoMob?.pmMax ?? "?"}**`, 
                inline: true 
            },
            { name: `\u200B`, value: `\u200B`, inline: true },
            { 
                name: `👹 ${mobEstadoTurnoMob?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoTurnoMob?.nivel === "number" ? mobEstadoTurnoMob.nivel : "?"})`, 
                value: `❤️ PV: **${mobEstadoTurnoMob?.pvAtual ?? "?"}/${mobEstadoTurnoMob?.pvMax ?? "?"}**`, 
                inline: true 
            }
        );

        // Atualizar imagem se necessário
        if (mobEstadoTurnoMob?.imagem && (mobEstadoTurnoMob.imagem.startsWith('http://') || mobEstadoTurnoMob.imagem.startsWith('https://'))) {
            embedCombate.setThumbnail(mobEstadoTurnoMob.imagem.trim());
        }

        // Fim do combate se o jogador perdeu
        if (resultadoTurnoMob.combateTerminou) {
            if (resultadoTurnoMob.vencedorFinal === "mob") {
                embedCombate.setTitle("☠️ DERROTA... ☠️").setColor(0x8B0000);
            } else if (resultadoTurnoMob.vencedorFinal === "jogador") {
                embedCombate.setTitle("🏆 VITÓRIA INESPERADA! 🏆").setColor(0x00FF00);
            } else {
                embedCombate.setTitle("⚔️ COMBATE ENCERRADO ⚔️").setColor(0x808080);
            }

            if (resultadoTurnoMob.logCombateFinal) {
                embedCombate.setDescription(resultadoTurnoMob.logCombateFinal.join('\n'));
            }

            if (resultadoTurnoMob.recompensasTextoFinal && resultadoTurnoMob.recompensasTextoFinal.length > 0) {
                embedCombate.addFields({
                    name: "🎁 Recompensas",
                    value: resultadoTurnoMob.recompensasTextoFinal.join('\n')
                });
            }

            await interaction.editReply({ embeds: [embedCombate], components: [] });
            return;
        }
    }

    // Se o combate continua, mostra os botões de ação novamente
    const combatActionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`combate_ATAQUEBASICO_${idCombate}`)
                .setLabel("⚔️ Ataque Básico")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`combate_USARFEITICO_${idCombate}`)
                .setLabel("🔮 Usar Feitiço")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`combate_USARITEM_${idCombate}`)
                .setLabel("🎒 Usar Item")
                .setStyle(ButtonStyle.Success)
        );

    await interaction.editReply({ embeds: [embedCombate], components: [combatActionRow] });
}

// Handler para Botões
async function handleButton(interaction) {
    const customIdParts = interaction.customId.split('_');
    const tipoComponente = customIdParts[0];
    const senderIdButton = interaction.user.id;

    console.log(`[BOTÃO] Processando: ${interaction.customId} pelo usuário ${senderIdButton}`);

    try {
        if (tipoComponente === 'dialogo') {
            await handleDialogoButton(interaction);
        } else if (tipoComponente === 'missao') {
            await handleMissaoButton(interaction);
        } else if (tipoComponente === 'combate') {
            await handleCombateButton(interaction);
        } else {
            console.warn(`[BOTÃO] Tipo não reconhecido: ${tipoComponente}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: "❌ Ação de botão não reconhecida.", 
                    ephemeral: true 
                });
            }
        }
    } catch (error) {
        console.error(`[BOTÃO] Erro crítico ao processar ${interaction.customId}:`, error);
        
        if (error.code !== 10062 && !interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: "❌ Ocorreu um erro interno ao processar esta ação.", 
                    ephemeral: true 
                });
            } catch (editError) {
                console.error("[BOTÃO] Erro ao tentar responder sobre erro:", editError);
            }
        }
    }
}

// Handler específico para botões de diálogo
async function handleDialogoButton(interaction) {
    if (interaction.replied || interaction.deferred) {
        console.warn("[DIALOGO] Interação já foi processada, ignorando...");
        return;
    }

    try {
        await interaction.deferUpdate();
    } catch (deferError) {
        console.error("[DIALOGO] Erro ao fazer deferUpdate:", deferError.message);
        if (deferError.message.includes("Unknown interaction")) {
            return;
        }
    }

    const customIdParts = interaction.customId.split('_');
    const acaoDialogo = customIdParts[1]?.toUpperCase();
    const idNpc = customIdParts[2];
    const idParametro3 = customIdParts[3];

    const fichaJogador = await Arcadia.getFichaOuCarregar(interaction.user.id);
    if (!fichaJogador) {
        await interaction.editReply({ 
            content: "❌ Sua ficha não foi encontrada.", 
            embeds: [], 
            components: [] 
        });
        return;
    }

    if (acaoDialogo === 'ENCERRAR' || (acaoDialogo === 'CONTINUAR' && idParametro3 === 'sem_acao')) {
        await interaction.editReply({ 
            content: "✅ Conversa encerrada.", 
            embeds: [], 
            components: [] 
        });
        return;
    }

    if (acaoDialogo === 'CONTINUAR') {
        const idProximoDialogo = idParametro3;
        const resultadoInteracao = await Arcadia.processarInteracaoComNPC(idNpc, fichaJogador, idProximoDialogo);

        if (resultadoInteracao.erro) {
            await interaction.followUp({ 
                embeds: [Arcadia.gerarEmbedAviso("Interação Falhou", resultadoInteracao.erro)], 
                components: [] 
            });
            return;
        }

        // Construir embed e componentes para continuação do diálogo
        const embedNPC = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle(`🗣️ ${resultadoInteracao.tituloNPC || resultadoInteracao.nomeNPC}`)
            .setAuthor({ name: resultadoInteracao.nomeNPC });

        if (resultadoInteracao.descricaoVisualNPC) {
            embedNPC.setDescription(resultadoInteracao.descricaoVisualNPC);
        }

        if (resultadoInteracao.imagemNPC && resultadoInteracao.imagemNPC.trim()) {
            try {
                embedNPC.setThumbnail(resultadoInteracao.imagemNPC);
            } catch (error) {
                console.error(`[DIALOGO] Erro ao adicionar imagem do NPC: ${error.message}`);
            }
        }

        if (resultadoInteracao.imagemMissao && resultadoInteracao.imagemMissao.trim()) {
            try {
                embedNPC.setImage(resultadoInteracao.imagemMissao);
            } catch (error) {
                console.error(`[DIALOGO] Erro ao adicionar imagem da missão: ${error.message}`);
            }
        }

        embedNPC.addFields({ 
            name: "💬 Diálogo:", 
            value: resultadoInteracao.dialogoAtual.texto || "*...*" 
        });

        const novaActionRow = new ActionRowBuilder();
        let novasOpcoes = false;

        if (resultadoInteracao.dialogoAtual.respostasJogador?.length > 0) {
            resultadoInteracao.dialogoAtual.respostasJogador.slice(0, 4).forEach(opcao => {
                novaActionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`dialogo_CONTINUAR_${resultadoInteracao.idNPC}_${opcao.levaParaDialogoId || 'sem_acao'}_${resultadoInteracao.dialogoAtual.idDialogo}_${interaction.user.id}`)
                        .setLabel(opcao.textoResposta.substring(0, 80))
                        .setStyle(ButtonStyle.Primary)
                );
                novasOpcoes = true;
            });
        }

        if (resultadoInteracao.dialogoAtual.ofereceMissao) {
            const missaoLog = fichaJogador.logMissoes?.find(m => m.idMissao === resultadoInteracao.dialogoAtual.ofereceMissao);
            if ((!missaoLog || (missaoLog.status !== 'aceita' && missaoLog.status !== 'concluida')) && novaActionRow.components.length < 5) {
                novaActionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`missao_ACEITAR_${resultadoInteracao.idNPC}_${resultadoInteracao.dialogoAtual.ofereceMissao}_${interaction.user.id}`)
                        .setLabel("Aceitar Missão")
                        .setStyle(ButtonStyle.Success)
                );
                novasOpcoes = true;
            }
        }

        if (novaActionRow.components.length < 5 && (!novasOpcoes || resultadoInteracao.dialogoAtual.encerraDialogo)) {
            novaActionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`dialogo_ENCERRAR_${resultadoInteracao.idNPC}_${resultadoInteracao.dialogoAtual.idDialogo}_${interaction.user.id}`)
                    .setLabel(novasOpcoes && resultadoInteracao.dialogoAtual.encerraDialogo ? "Finalizar" : "Encerrar Conversa")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        await interaction.followUp({ 
            embeds: [embedNPC], 
            components: novaActionRow.components.length > 0 ? [novaActionRow] : [] 
        });
    }
}

// Handler específico para botões de missão
async function handleMissaoButton(interaction) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate();
    }

    const customIdParts = interaction.customId.split('_');
    const acaoMissao = customIdParts[1];
    const idNpcMissao = customIdParts[2];
    const idMissaoParaAceitar = customIdParts[3];
    const senderIdButton = interaction.user.id;

    if (acaoMissao === 'ACEITAR') {
        const resultadoAceite = await Arcadia.aceitarMissao(senderIdButton, idMissaoParaAceitar, idNpcMissao);
        
        if (!resultadoAceite.sucesso) {
            await interaction.editReply({ 
                embeds: [Arcadia.gerarEmbedAviso("Missão", resultadoAceite.erro || "Não foi possível aceitar a missão.")], 
                components: [] 
            });
            return;
        }

        const embedConfirmacao = Arcadia.gerarEmbedSucesso("🎯 Missão Aceita!", resultadoAceite.sucesso);
        
        // Verificar se precisa iniciar combate automaticamente
        if (idMissaoParaAceitar === "mVRatos") {
            const fichaJogador = await Arcadia.getFichaOuCarregar(senderIdButton);
            await iniciarCombateAutomatico(interaction, embedConfirmacao, idMissaoParaAceitar, senderIdButton, fichaJogador);
            return;
        }

        await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
    }
}

// Handler específico para botões de combate
async function handleCombateButton(interaction) {
    const customIdParts = interaction.customId.split('_');
    const acaoCombate = customIdParts[1];
    const idCombate = customIdParts.slice(2).join('_');
    const senderIdButton = interaction.user.id;

    console.log(`[COMBATE] Ação: ${acaoCombate}, ID: ${idCombate}`);

    if (acaoCombate === 'ATAQUEBASICO') {
        await handleAtaqueBasico(interaction, idCombate, senderIdButton);
    } else if (acaoCombate === 'USARFEITICO') {
        await handleUsarFeitico(interaction, idCombate, senderIdButton);
    } else if (acaoCombate === 'USARITEM') {
        await handleUsarItem(interaction, idCombate, senderIdButton);
    }
}

// Handler específico para ataque básico
async function handleAtaqueBasico(interaction, idCombate, senderIdButton) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate();
    }

    try {
        const resultado = await Arcadia.processarAcaoJogadorCombate(idCombate, senderIdButton, "ATAQUE_BASICO");
        
        if (!resultado || typeof resultado !== 'object') {
            await interaction.editReply({ 
                content: "❌ Erro crítico ao processar ataque.", 
                components: [], 
                embeds: [] 
            });
            return;
        }

        if (resultado.erro) {
            await interaction.followUp({ 
                content: `❌ Erro na ação: ${resultado.erro}`, 
                ephemeral: true 
            });
            return;
        }

        await processarResultadoCombate(interaction, resultado, idCombate, senderIdButton, "⚔️ Combate (Ataque)", 0xFF0000);
        
    } catch (error) {
        console.error("[COMBATE] Erro no ataque básico:", error);
        await interaction.editReply({ 
            content: "❌ Erro crítico ao processar seu ataque.", 
            components: [], 
            embeds: [] 
        });
    }
}

// Handler específico para usar feitiço
async function handleUsarFeitico(interaction, idCombate, senderIdButton) {
    try {
        const magiasConhecidas = await Arcadia.getMagiasConhecidasParaAutocomplete(senderIdButton);

        if (!magiasConhecidas || magiasConhecidas.length === 0) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: "❌ Você não conhece nenhum feitiço para usar!", 
                    ephemeral: true 
                });
            }
            return;
        }

        // Se só tem 1 feitiço, usar direto
        if (magiasConhecidas.length === 1) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferUpdate();
            }

            const resultado = await Arcadia.processarAcaoJogadorCombate(
                idCombate, 
                senderIdButton, 
                "USAR_FEITICO", 
                { idFeitico: magiasConhecidas[0].value }
            );

            if (!resultado || typeof resultado !== 'object') {
                await interaction.editReply({ 
                    content: "❌ Erro crítico ao usar feitiço.", 
                    components: [], 
                    embeds: [] 
                });
                return;
            }

            if (resultado.erro) {
                await interaction.editReply({ 
                    content: `❌ Erro ao usar feitiço: ${resultado.erro}`, 
                    components: [] 
                });
                return;
            }

            await processarResultadoCombate(interaction, resultado, idCombate, senderIdButton, "🔮 Combate (Feitiço)", 0x800080);
            return;
        }

        // Múltiplos feitiços: mostrar select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`combate_SELECTFEITICO_${idCombate}`)
            .setPlaceholder('🔮 Selecione um feitiço para usar...')
            .addOptions(
                magiasConhecidas.slice(0, 25).map(magia => ({
                    label: magia.name,
                    value: magia.value
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "🎯 **Escolha o feitiço que deseja usar:**",
                components: [selectRow],
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: "🎯 **Escolha o feitiço que deseja usar:**",
                components: [selectRow],
                ephemeral: true
            });
        }

    } catch (error) {
        console.error("[COMBATE] Erro ao processar botão de feitiço:", error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: "❌ Erro ao processar uso de feitiço.", 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error("[COMBATE] Erro ao responder sobre erro de feitiço:", replyError);
            }
        }
    }
}

// Handler específico para usar item
async function handleUsarItem(interaction, idCombate, senderIdButton) {
    try {
        const ITENS_BASE_ARCADIA = Arcadia.ITENS_BASE_ARCADIA;
        const ficha = await Arcadia.getFichaOuCarregar(senderIdButton);

        if (!ficha || !ficha.inventario) {
            await interaction.reply({ 
                content: "❌ Seu inventário não foi encontrado!", 
                ephemeral: true 
            });
            return;
        }

        // Filtrar apenas itens usáveis
        const itensUsaveis = ficha.inventario.filter(item => {
            const base = ITENS_BASE_ARCADIA[item.itemNome?.toLowerCase()];
            return base && base.usavel && item.quantidade > 0;
        });

        if (!itensUsaveis || itensUsaveis.length === 0) {
            await interaction.reply({ 
                content: "❌ Você não tem itens usáveis!", 
                ephemeral: true 
            });
            return;
        }

        // Se só tem 1 item usável, usar direto
        if (itensUsaveis.length === 1) {
            await interaction.deferUpdate();

            const resultado = await Arcadia.processarAcaoJogadorCombate(
                idCombate, 
                senderIdButton, 
                "USAR_ITEM", 
                { nomeItem: itensUsaveis[0].itemNome }
            );

            if (!resultado || typeof resultado !== 'object') {
                await interaction.editReply({ 
                    content: "❌ Erro crítico ao usar item.", 
                    components: [], 
                    embeds: [] 
                });
                return;
            }

            if (resultado.erro) {
                await interaction.editReply({ 
                    content: `❌ Erro ao usar item: ${resultado.erro}`, 
                    components: [] 
                });
                return;
            }

            await processarResultadoCombate(interaction, resultado, idCombate, senderIdButton, "🎒 Combate (Item)", 0xF8C300);
            return;
        }

        // Múltiplos itens: mostrar select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`combate_SELECTITEM_${idCombate}`)
            .setPlaceholder('🎒 Selecione um item para usar...')
            .addOptions(
                itensUsaveis.slice(0, 25).map(item => ({
                    label: `${item.itemNome} x${item.quantidade}`,
                    value: item.itemNome
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "🧪 **Escolha o item que deseja usar:**",
                components: [selectRow],
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: "🧪 **Escolha o item que deseja usar:**",
                components: [selectRow],
                ephemeral: true
            });
        }

    } catch (error) {
        console.error("[COMBATE] Erro ao processar botão de item:", error);
        try {
            await interaction.reply({ 
                content: "❌ Erro ao processar uso de item.", 
                ephemeral: true 
            });
        } catch (replyError) {
            console.error("[COMBATE] Erro ao responder sobre erro de item:", replyError);
        }
    }
}

// Handler específico para select menus
async function handleSelectMenu(interaction) {
    const customIdParts = interaction.customId.split('_');
    const tipoComponente = customIdParts[0];
    const acaoSelect = customIdParts[1];
    const idCombate = customIdParts.slice(2).join('_');
    const senderIdSelect = interaction.user.id;

    console.log(`[SELECT MENU] Processando: ${interaction.customId} pelo usuário ${senderIdSelect}`);

    try {
        if (tipoComponente === 'combate') {
            if (acaoSelect === 'SELECTFEITICO') {
                await handleSelectFeitico(interaction, idCombate, senderIdSelect);
            } else if (acaoSelect === 'SELECTITEM') {
                await handleSelectItem(interaction, idCombate, senderIdSelect);
            } else {
                console.warn(`[SELECT MENU] Ação de combate não reconhecida: ${acaoSelect}`);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: "❌ Ação de seleção não reconhecida.", 
                        ephemeral: true 
                    });
                }
            }
        } else {
            console.warn(`[SELECT MENU] Tipo não reconhecido: ${tipoComponente}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: "❌ Tipo de seleção não reconhecida.", 
                    ephemeral: true 
                });
            }
        }
    } catch (error) {
        console.error(`[SELECT MENU] Erro crítico ao processar ${interaction.customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: "❌ Ocorreu um erro interno ao processar esta seleção.", 
                    ephemeral: true 
                });
            } catch (editError) {
                console.error("[SELECT MENU] Erro ao tentar responder sobre erro:", editError);
            }
        }
    }
}

// Handler específico para seleção de feitiço
async function handleSelectFeitico(interaction, idCombate, senderIdSelect) {
    try {
        await interaction.deferUpdate();

        const idFeiticoSelecionado = interaction.values[0];
        
        const resultado = await Arcadia.processarAcaoJogadorCombate(
            idCombate, 
            senderIdSelect, 
            "USAR_FEITICO", 
            { idFeitico: idFeiticoSelecionado }
        );

        if (!resultado || typeof resultado !== 'object') {
            await interaction.editReply({ 
                content: "❌ Erro crítico ao usar feitiço.", 
                components: [], 
                embeds: [] 
            });
            return;
        }

        if (resultado.erro) {
            await interaction.editReply({ 
                content: `❌ Erro ao usar feitiço: ${resultado.erro}`, 
                components: [] 
            });
            return;
        }

        await processarResultadoCombate(interaction, resultado, idCombate, senderIdSelect, "🔮 Combate (Feitiço)", 0x800080);
        
    } catch (error) {
        console.error("[SELECT MENU] Erro ao processar seleção de feitiço:", error);
        await interaction.editReply({ 
            content: "❌ Erro crítico ao processar seleção de feitiço.", 
            components: [], 
            embeds: [] 
        });
    }
}

// Handler específico para seleção de item
async function handleSelectItem(interaction, idCombate, senderIdSelect) {
    try {
        await interaction.deferUpdate();

        const nomeItemSelecionado = interaction.values[0];
        
        const resultado = await Arcadia.processarAcaoJogadorCombate(
            idCombate, 
            senderIdSelect, 
            "USAR_ITEM", 
            { nomeItem: nomeItemSelecionado }
        );

        if (!resultado || typeof resultado !== 'object') {
            await interaction.editReply({ 
                content: "❌ Erro crítico ao usar item.", 
                components: [], 
                embeds: [] 
            });
            return;
        }

        if (resultado.erro) {
            await interaction.editReply({ 
                content: `❌ Erro ao usar item: ${resultado.erro}`, 
                components: [] 
            });
            return;
        }

        await processarResultadoCombate(interaction, resultado, idCombate, senderIdSelect, "🎒 Combate (Item)", 0xF8C300);
        
    } catch (error) {
        console.error("[SELECT MENU] Erro ao processar seleção de item:", error);
        await interaction.editReply({ 
            content: "❌ Erro crítico ao processar seleção de item.", 
            components: [], 
            embeds: [] 
        });
    }
}

// Função auxiliar para iniciar combate automático
async function iniciarCombateAutomatico(interaction, embedConfirmacao, idMissao, senderIdButton, fichaJogador) {
    try {
        const missoesCol = Arcadia.getMissoesCollection();
        if (!missoesCol) {
            console.error("ERRO: getMissoesCollection() retornou undefined!");
            await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
            return;
        }

        const missaoDef = await missoesCol.findOne({ _id: idMissao });
        if (!missaoDef || !missaoDef.objetivos?.[0] || missaoDef.objetivos[0].tipo !== "COMBATE") {
            await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
            return;
        }

        const primeiroObjetivo = missaoDef.objetivos[0];
        const resultadoInicioCombate = await Arcadia.iniciarCombatePvE(
            senderIdButton,
            primeiroObjetivo.alvo,
            idMissao,
            primeiroObjetivo.idObjetivo
        );

        if (!resultadoInicioCombate.sucesso) {
            embedConfirmacao.addFields({ 
                name: "⚠️ Falha ao Iniciar Combate", 
                value: resultadoInicioCombate.erro || "Não foi possível iniciar o combate." 
            });
            await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
            return;
        }

        // Salvar combate no cache
        const idCombateParaSalvar = String(resultadoInicioCombate.idCombate).trim();
        if (resultadoInicioCombate.objetoCombate) {
            combatesAtivos[idCombateParaSalvar] = resultadoInicioCombate.objetoCombate;
            console.log(`[COMBATE] Combate ${idCombateParaSalvar} salvo no cache.`);
        }

        const jogadorEstado = resultadoInicioCombate.estadoCombate.jogador;
        const mobEstado = resultadoInicioCombate.estadoCombate.mob;

        // Criar embed de combate
        let descricaoCombate = `📜 **Missão:** ${missaoDef.titulo || "Missão Ativa"}\n\n`;
        descricaoCombate += `*${resultadoInicioCombate.mensagemInicial || "O combate começou!"}*\n\n`;
        descricaoCombate += `**Turno de:** ${jogadorEstado.nome || fichaJogador.nomePersonagem}`;

        const embedCombate = new EmbedBuilder()
            .setColor(0xDC143C)
            .setTitle(`⚔️ COMBATE INICIADO! ⚔️`)
            .setDescription(descricaoCombate)
            .addFields(
                {
                    name: `👤 ${jogadorEstado.nome || fichaJogador.nomePersonagem}`,
                    value: `❤️ PV: **${jogadorEstado.pvAtual}/${jogadorEstado.pvMax}**\n💧 PM: **${jogadorEstado.pmAtual}/${jogadorEstado.pmMax}**`,
                    inline: true
                },
                { name: `\u200B`, value: `\u200B`, inline: true },
                {
                    name: `👹 ${mobEstado.nome} (Nv. ${mobEstado.nivel || '?'})`,
                    value: `❤️ PV: **${mobEstado.pvAtual}/${mobEstado.pvMax}**`,
                    inline: true
                }
            )
            .setFooter({ text: "Prepare-se para a batalha!" });

        // Adicionar imagem do mob se disponível
        if (mobEstado?.imagem && mobEstado.imagem.trim() && 
            (mobEstado.imagem.startsWith('http://') || mobEstado.imagem.startsWith('https://'))) {
            embedCombate.setThumbnail(mobEstado.imagem.trim());
        }

        const combatActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`combate_ATAQUEBASICO_${resultadoInicioCombate.idCombate}`)
                    .setLabel("⚔️ Ataque Básico")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`combate_USARFEITICO_${resultadoInicioCombate.idCombate}`)
                    .setLabel("🔮 Usar Feitiço")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`combate_USARITEM_${resultadoInicioCombate.idCombate}`)
                    .setLabel("🎒 Usar Item")
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
        await interaction.followUp({ embeds: [embedCombate], components: [combatActionRow] });

    } catch (error) {
        console.error("[COMBATE AUTO] Erro ao iniciar combate automático:", error);
        await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
    }
}

// --- Evento: Interação (Slash Commands, Autocomplete, Buttons, Select Menus) ---
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        } else if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        }
    } catch (error) {
        console.error(`[INTERACTION] Erro crítico geral:`, error);
    }
});

// Handler para Slash Commands (mantido do código original, mas simplificado)
async function handleSlashCommand(interaction) {
    const { commandName, channelId, user, options, member } = interaction;
    const senderId = user.id;
    const senderUsername = user.username;
    const isOwner = senderId === OWNER_ID_DISCORD;
    
    console.log(`[SLASH CMD] /${commandName} | by ${senderUsername} (${senderId})`);
    
    let respostaParaEnviar;
    let podeProcessar = true;

    // Lógica de restrição de canal (mantida do original)
    if (channelId === Arcadia.ID_CANAL_BOAS_VINDAS_RPG) {
        if (!COMANDOS_CANAL_BEMVINDO.includes(commandName)) podeProcessar = false;
    } else if (channelId === Arcadia.ID_CANAL_RECRUTAMENTO) {
        if (!COMANDOS_CANAL_RECRUTAMENTO.includes(commandName)) podeProcessar = false;
    } else if (channelId === Arcadia.ID_CANAL_ATUALIZACAO_FICHAS) {
        if (!COMANDOS_CANAL_ATUALIZACAO_FICHAS.includes(commandName)) podeProcessar = false;
    } else {
        const comandosBloqueadosEmOutrosCanais = [
            ...COMANDOS_CANAL_BEMVINDO.filter(cmd => !COMANDOS_GERAIS_PERMITIDOS_EM_OUTROS_CANAIS.includes(cmd)),
            ...COMANDOS_CANAL_RECRUTAMENTO.filter(cmd => !COMANDOS_GERAIS_PERMITIDOS_EM_OUTROS_CANAIS.includes(cmd))
        ].filter((value, index, self) => self.indexOf(value) === index);
        
        if (comandosBloqueadosEmOutrosCanais.includes(commandName)) {
            podeProcessar = false;
        }
    }

    if (!podeProcessar && !isOwner) {
        await interaction.reply({
            embeds: [Arcadia.gerarEmbedAviso("Comando Inválido Neste Canal", "Este comando não pode ser utilizado aqui.")],
            ephemeral: true
        });
        return;
    }

    try {
        // Switch para comandos (mantido do original, mas com alguns ajustes)
        const comandosAdmin = [
            'admincriar', 'adminaddxp', 'adminsetnivel', 'adminaddflorins',
            'adminaddessencia', 'adminadditem', 'admindelitem',
            'adminsetattr', 'adminaddpontosattr', 'adminexcluirficha'
        ];
        
        if (comandosAdmin.includes(commandName) && !isOwner) {
            respostaParaEnviar = Arcadia.gerarEmbedErro("Acesso Negado", "Este comando é apenas para administradores do bot.");
        } else {
            switch (commandName) {
                case 'ping':
                    respostaParaEnviar = 'Pong!';
                    break;
                case 'oi':
                case 'arcadia':
                case 'bemvindo':
                    respostaParaEnviar = Arcadia.gerarMensagemBoasVindas(senderUsername);
                    break;
                case 'comandos':
                case 'help':
                    respostaParaEnviar = Arcadia.gerarListaComandos(isOwner);
                    break;
                case 'meusfeiticos':
                    respostaParaEnviar = await Arcadia.processarMeusFeiticos(senderId);
                    break;

                case 'uparfeitico': {
                    const idFeiticoParaUpar = options.getString('feitico');
                    if (!idFeiticoParaUpar || idFeiticoParaUpar === "sem_feiticos_upar" || idFeiticoParaUpar === "max_nivel_todos") {
                        let msgAviso = "Nenhum feitiço válido selecionado ou disponível para evoluir.";
                        if (idFeiticoParaUpar === "sem_feiticos_upar") msgAviso = "Você não parece conhecer feitiços que podem ser evoluídos no momento.";
                        if (idFeiticoParaUpar === "max_nivel_todos") msgAviso = "Todos os seus feitiços conhecidos já estão no nível máximo!";
                        respostaParaEnviar = Arcadia.gerarEmbedAviso("Evoluir Feitiço", msgAviso);
                    } else {
                        respostaParaEnviar = await Arcadia.processarUparFeitico(senderId, idFeiticoParaUpar);
                    }
                    break;
                }
                case 'listaracas':
                    respostaParaEnviar = Arcadia.gerarListaRacasEmbed();
                    break;
                case 'listaclasses':
                    respostaParaEnviar = Arcadia.gerarListaClassesEmbed();
                    break;
                case 'listareinos':
                    respostaParaEnviar = Arcadia.gerarListaReinosEmbed();
                    break;
                case 'historia':
                    respostaParaEnviar = Arcadia.gerarEmbedHistoria();
                    break;
                case 'criar': {
                    const nomePersonagem = options.getString('nome');
                    const racaNomeInput = options.getString('raca');
                    const classeNomeInput = options.getString('classe');
                    const reinoNomeInput = options.getString('reino');
                    const imagemUrl = options.getString('imagem');

                    const resultadoCriacao = await Arcadia.processarCriarFichaSlash(senderId, senderUsername, nomePersonagem, racaNomeInput, classeNomeInput, reinoNomeInput, imagemUrl);

                    // Lógica de cargos após criação (mantida do original)
                    if (resultadoCriacao && typeof resultadoCriacao.setTitle === 'function' && resultadoCriacao.data && resultadoCriacao.data.title && resultadoCriacao.data.title.includes("🎉 Personagem Criado! 🎉")) {
                        if (member) {
                            const fichaCriada = await Arcadia.getFichaOuCarregar(senderId);
                            if (fichaCriada) {
                                let cargosAdicionadosMsgs = [];
                                let cargosNaoEncontradosMsgs = [];
                                let cargosRemovidosMsgs = [];

                                const cargoVisitante = member.guild.roles.cache.find(role => role.name === Arcadia.NOME_CARGO_VISITANTE);
                                if (cargoVisitante && member.roles.cache.has(cargoVisitante.id)) {
                                    try { 
                                        await member.roles.remove(cargoVisitante); 
                                        cargosRemovidosMsgs.push(Arcadia.NOME_CARGO_VISITANTE); 
                                    }
                                    catch (e) { 
                                        console.error(`Erro ao REMOVER ${Arcadia.NOME_CARGO_VISITANTE} de ${senderUsername}:`, e); 
                                    }
                                }

                                const nomesCargosParaAdicionar = [
                                    Arcadia.NOME_CARGO_AVENTUREIRO,
                                    Arcadia.MAPA_CARGOS_RACAS[fichaCriada.raca],
                                    Arcadia.MAPA_CARGOS_CLASSES[fichaCriada.classe],
                                    Arcadia.MAPA_CARGOS_REINOS[fichaCriada.origemReino]
                                ].filter(Boolean);

                                for (const nomeCargo of nomesCargosParaAdicionar) {
                                    const cargoObj = member.guild.roles.cache.find(role => role.name === nomeCargo);
                                    if (cargoObj) {
                                        try {
                                            if (!member.roles.cache.has(cargoObj.id)) {
                                                await member.roles.add(cargoObj);
                                                cargosAdicionadosMsgs.push(nomeCargo);
                                            }
                                        } catch (e) {
                                            console.error(`Erro ao ADICIONAR cargo ${nomeCargo} para ${senderUsername}:`, e);
                                            cargosNaoEncontradosMsgs.push(`${nomeCargo} (erro ao adicionar)`);
                                        }
                                    } else {
                                        cargosNaoEncontradosMsgs.push(`${nomeCargo} (não encontrado no servidor)`);
                                    }
                                }
                                
                                if (resultadoCriacao.addFields) {
                                    if (cargosRemovidosMsgs.length > 0) resultadoCriacao.addFields({ name: '🚪 Cargo Removido', value: cargosRemovidosMsgs.join(', '), inline: false });
                                    if (cargosAdicionadosMsgs.length > 0) resultadoCriacao.addFields({ name: '✅ Cargos Adicionados', value: cargosAdicionadosMsgs.join(', '), inline: false });
                                    if (cargosNaoEncontradosMsgs.length > 0) resultadoCriacao.addFields({ name: '⚠️ Cargos Não Atribuídos/Erro', value: cargosNaoEncontradosMsgs.join(', '), inline: false });
                                }
                            }
                        } else {
                            console.warn(`[CARGOS PÓS-CRIAÇÃO] Objeto 'member' não disponível para ${senderUsername}.`);
                        }
                    }
                    respostaParaEnviar = resultadoCriacao;
                    break;
                }
                case 'ficha': {
                    const jogadorAlvoFichaOpt = options.getUser('jogador');
                    let idAlvoFicha = senderId;
                    if (jogadorAlvoFichaOpt) {
                        if (!isOwner) {
                            respostaParaEnviar = Arcadia.gerarEmbedErro("🚫 Acesso Negado", "Apenas administradores podem ver a ficha de outros jogadores.");
                        } else {
                            idAlvoFicha = jogadorAlvoFichaOpt.id;
                        }
                    }
                    if (!respostaParaEnviar) {
                        respostaParaEnviar = await Arcadia.processarVerFichaEmbed(idAlvoFicha, isOwner && !!jogadorAlvoFichaOpt, senderId, senderUsername);
                    }
                    break;
                }
                case 'aprenderfeitico': {
                    const idFeitico = options.getString('feitico');
                    const resultado = await Arcadia.aprenderFeitico(senderId, idFeitico);
                    respostaParaEnviar = resultado.erro
                        ? Arcadia.gerarEmbedErro("Falha ao Aprender", resultado.erro)
                        : Arcadia.gerarEmbedSucesso("Feitiço Aprendido", resultado.sucesso);
                    break;
                }
                case 'usarfeitico': {
                    const idFeitico = options.getString('feitico');
                    const alvo = options.getUser('alvo');
                    const resultado = await Arcadia.usarFeitico(senderId, idFeitico, alvo?.id);
                    if (resultado.erro) {
                        respostaParaEnviar = Arcadia.gerarEmbedErro("Falha ao Usar Feitiço", resultado.erro);
                    } else {
                        respostaParaEnviar = resultado;
                    }
                    break;
                }
                case 'distribuirpontos': {
                    const atrArgsDist = {};
                    Arcadia.atributosValidos.forEach(atr => {
                        const val = options.getInteger(atr.toLowerCase().replace('base', ''));
                        if (val !== null && val !== undefined) {
                            const atrKeyNaOpcao = atr.toLowerCase().replace('base', '');
                            const atrKeyNaFicha = atrKeyNaOpcao === 'manabase' ? 'manaBase' : atrKeyNaOpcao;
                            atrArgsDist[atrKeyNaFicha] = val;
                        }
                    });
                    respostaParaEnviar = await Arcadia.processarDistribuirPontosSlash(senderId, atrArgsDist);
                    break;
                }
                case 'jackpot':
                    respostaParaEnviar = await Arcadia.processarJackpot(senderId, [String(options.getInteger('giros') || 1)]);
                    break;
                case 'usaritem': {
                    const nomeItem = options.getString('item');
                    const quantidade = options.getInteger('quantidade') || 1;
                    respostaParaEnviar = await Arcadia.processarUsarItem(senderId, nomeItem, quantidade);
                    break;
                }
                case 'inventario': {
                    const fichaJogador = await Arcadia.getFichaOuCarregar(senderId);
                    if (!fichaJogador) {
                        respostaParaEnviar = { embeds: [Arcadia.gerarEmbedErro("Ficha não encontrada", "Você precisa criar uma ficha primeiro com `/criar`.")] };
                        break;
                    }
                    respostaParaEnviar = await Arcadia.processarInventario(senderId);
                    break;
                }
                case 'interagir': {
                    if (interaction.replied || interaction.deferred) {
                        console.warn("[INTERAGIR] Interação já foi respondida ou deferida, ignorando...");
                        break;
                    }

                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (deferError) {
                        console.error("[INTERAGIR] Erro ao fazer deferReply:", deferError.message);
                        if (deferError.message.includes("Unknown interaction")) {
                            return;
                        }
                        break;
                    }

                    const nomeNPCInput = options.getString('npc');
                    const fichaJogador = await Arcadia.getFichaOuCarregar(senderId);

                    if (!fichaJogador || fichaJogador.nomePersonagem === "N/A") {
                        try {
                            await interaction.editReply({ embeds: [Arcadia.gerarEmbedErro("Ficha não encontrada", "Você precisa criar uma ficha primeiro com `/criar`.")] });
                        } catch (editError) {
                            console.error("[INTERAGIR] Erro ao editar reply com erro de ficha:", editError.message);
                        }
                        break;
                    }

                    const resultadoInteracao = await Arcadia.processarInteracaoComNPC(nomeNPCInput, fichaJogador);

                    if (resultadoInteracao.erro) {
                        try {
                            await interaction.editReply({ embeds: [Arcadia.gerarEmbedAviso("Interação Falhou", resultadoInteracao.erro)] });
                        } catch (editError) {
                            console.error("[INTERAGIR] Erro ao editar reply com erro:", editError.message);
                        }
                    } else {
                        const embedNPC = new EmbedBuilder()
                            .setColor(0x7289DA)
                            .setTitle(`🗣️ ${resultadoInteracao.tituloNPC || resultadoInteracao.nomeNPC}`)
                            .setAuthor({ name: resultadoInteracao.nomeNPC });

                        if (resultadoInteracao.descricaoVisualNPC) {
                            embedNPC.setDescription(resultadoInteracao.descricaoVisualNPC);
                        }

                        if (resultadoInteracao.imagemNPC && resultadoInteracao.imagemNPC.trim() !== '') {
                            try {
                                embedNPC.setThumbnail(resultadoInteracao.imagemNPC);
                            } catch (error) {
                                console.error(`Erro ao adicionar imagem do NPC: ${error.message}`);
                            }
                        }
                        
                        if (resultadoInteracao.imagemMissao && resultadoInteracao.imagemMissao.trim() !== '') {
                            try {
                                embedNPC.setImage(resultadoInteracao.imagemMissao);
                            } catch (error) {
                                console.error(`Erro ao adicionar imagem da missão: ${error.message}`);
                            }
                        }

                        embedNPC.addFields({ name: "💬 Diálogo:", value: resultadoInteracao.dialogoAtual.texto || "*Este personagem não diz nada no momento.*" });

                        if (resultadoInteracao.missaoRealmenteConcluida && resultadoInteracao.recompensasConcedidasTexto && resultadoInteracao.recompensasConcedidasTexto.length > 0) {
                            embedNPC.addFields({
                                name: "🏅 Missão Concluída! Recompensas:",
                                value: resultadoInteracao.recompensasConcedidasTexto.join("\n")
                            });
                        } else if (resultadoInteracao.missaoRealmenteConcluida) {
                            embedNPC.addFields({ name: "🏅 Missão Concluída!", value: "Tarefa finalizada." });
                        }

                        const actionRow = new ActionRowBuilder();
                        let temOpcoesParaBotoes = false;

                        if (resultadoInteracao.dialogoAtual.respostasJogador && resultadoInteracao.dialogoAtual.respostasJogador.length > 0) {
                            resultadoInteracao.dialogoAtual.respostasJogador.slice(0, 4).forEach(opcao => {
                                actionRow.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`dialogo_CONTINUAR_${resultadoInteracao.idNPC}_${opcao.levaParaDialogoId || 'sem_acao'}_${resultadoInteracao.dialogoAtual.idDialogo}_${interaction.user.id}`)
                                        .setLabel(opcao.textoResposta.substring(0, 80))
                                        .setStyle(ButtonStyle.Primary)
                                );
                                temOpcoesParaBotoes = true;
                            });
                        }

                        if (resultadoInteracao.dialogoAtual.ofereceMissao && !resultadoInteracao.missaoRealmenteConcluida) {
                            const missaoLog = fichaJogador.logMissoes ? fichaJogador.logMissoes.find(m => m.idMissao === resultadoInteracao.dialogoAtual.ofereceMissao) : null;
                            if ((!missaoLog || (missaoLog.status !== 'aceita' && missaoLog.status !== 'concluida')) && actionRow.components.length < 5) {
                                actionRow.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`missao_ACEITAR_${resultadoInteracao.idNPC}_${resultadoInteracao.dialogoAtual.ofereceMissao}_${interaction.user.id}`)
                                        .setLabel("Aceitar Missão")
                                        .setStyle(ButtonStyle.Success)
                                );
                                temOpcoesParaBotoes = true;
                            }
                        }

                        if (actionRow.components.length < 5 && (!temOpcoesParaBotoes || resultadoInteracao.dialogoAtual.encerraDialogo)) {
                            actionRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`dialogo_ENCERRAR_${resultadoInteracao.idNPC}_${resultadoInteracao.dialogoAtual.idDialogo}_${interaction.user.id}`)
                                    .setLabel(temOpcoesParaBotoes && resultadoInteracao.dialogoAtual.encerraDialogo ? "Finalizar" : "Encerrar Conversa")
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        }

                        try {
                            if (actionRow.components.length > 0) {
                                await interaction.editReply({ embeds: [embedNPC], components: [actionRow] });
                            } else {
                                await interaction.editReply({ embeds: [embedNPC] });
                            }
                        } catch (editError) {
                            console.error("[INTERAGIR] Erro ao editar reply final:", editError.message);
                        }
                    }
                    break;
                }

                // Comandos de Admin (mantidos do original)
                case 'admincriar':
                    respostaParaEnviar = await Arcadia.processarAdminCriarFicha(client, options.getUser('jogador').id, options.getString('nome'), options.getString('raca'), options.getString('classe'), options.getString('reino'), senderUsername);
                    break;
                case 'adminaddxp':
                    respostaParaEnviar = await Arcadia.processarAdminAddXP(options.getUser('jogador').id, options.getInteger('xp'), senderUsername);
                    break;
                case 'adminsetnivel':
                    respostaParaEnviar = await Arcadia.processarAdminSetNivel(options.getUser('jogador').id, options.getInteger('nivel'), senderUsername);
                    break;
                case 'adminaddflorins':
                    respostaParaEnviar = await Arcadia.processarAdminAddMoedas(options.getUser('jogador').id, options.getInteger('quantidade'), 'florinsDeOuro', senderUsername);
                    break;
                case 'adminaddessencia':
                    respostaParaEnviar = await Arcadia.processarAdminAddMoedas(options.getUser('jogador').id, options.getInteger('quantidade'), 'essenciaDeArcadia', senderUsername);
                    break;
                case 'adminadditem':
                    respostaParaEnviar = await Arcadia.processarAdminAddItem(options.getUser('jogador').id, options.getString('item'), options.getInteger('quantidade') || 1, options.getString('tipo'), options.getString('descricao'), senderUsername);
                    break;
                case 'admindelitem':
                    respostaParaEnviar = await Arcadia.processarAdminDelItem(options.getUser('jogador').id, options.getString('item'), options.getInteger('quantidade') || 1, senderUsername);
                    break;
                case 'adminsetattr':
                    respostaParaEnviar = await Arcadia.processarAdminSetAtributo(options.getUser('jogador').id, options.getString('atributo'), options.getInteger('valor'), senderUsername);
                    break;
                case 'adminaddpontosattr':
                    respostaParaEnviar = await Arcadia.processarAdminAddPontosAtributo(options.getUser('jogador').id, options.getInteger('quantidade'), senderUsername);
                    break;
                case 'adminexcluirficha':
                    const alvoExcluir = options.getUser('jogador');
                    const membroAlvo = interaction.guild ? interaction.guild.members.cache.get(alvoExcluir.id) : null;
                    respostaParaEnviar = await Arcadia.processarAdminExcluirFicha(alvoExcluir.id, options.getString('confirmacao'), senderUsername, membroAlvo);
                    break;
                case 'admincriardummy':
                    respostaParaEnviar = await Arcadia.processarAdminCriarDummy(
                        options.getString('nome'),
                        options.getInteger('nivel'),
                        options.getInteger('pv'),
                        options.getInteger('pm'),
                        options.getBoolean('contraataca'),
                        options.getString('tipo'),
                        senderUsername,
                        interaction.user.id
                    );
                    break;
                case 'adminremoverdummy':
                    respostaParaEnviar = await Arcadia.processarAdminRemoverDummy(
                        options.getString('nome'),
                        options.getBoolean('resetar'),
                        senderUsername
                    );
                    break;
                case 'adminlistardummies':
                    respostaParaEnviar = await Arcadia.processarAdminListarDummies();
                    break;
                default:
                    if (commandName) {
                        respostaParaEnviar = Arcadia.gerarEmbedAviso("Comando Desconhecido", `O comando \`/${commandName}\` não foi reconhecido ou não está implementado no switch principal.`);
                    } else {
                        respostaParaEnviar = Arcadia.gerarEmbedErro("Erro Interno", "Nome do comando não recebido.");
                    }
                    break;
            }
        }

        // Lógica de envio da resposta
        if (respostaParaEnviar) {
            const payload = {};
            
            if (typeof respostaParaEnviar === 'string') {
                payload.content = respostaParaEnviar;
            } else if (respostaParaEnviar.embeds && Array.isArray(respostaParaEnviar.embeds)) {
                payload.embeds = respostaParaEnviar.embeds;
                if (respostaParaEnviar.content) { 
                    payload.content = respostaParaEnviar.content; 
                }
            } else if (respostaParaEnviar.embed && typeof respostaParaEnviar.embed.setTitle === 'function') {
                // Caso especial para dummies que retornam objeto com embed e informações de combate
                payload.embeds = [respostaParaEnviar.embed];
                if (respostaParaEnviar.combateIniciado) {
                    console.log(`[COMBATE] Dummy criado e combate iniciado: ${respostaParaEnviar.idCombate}`);
                    
                    // Adicionar botões de combate para dummies
                    const combatActionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`combate_ATAQUEBASICO_${respostaParaEnviar.idCombate}`)
                                .setLabel("⚔️ Ataque Básico")
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId(`combate_USARFEITICO_${respostaParaEnviar.idCombate}`)
                                .setLabel("🔮 Usar Feitiço")
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`combate_USARITEM_${respostaParaEnviar.idCombate}`)
                                .setLabel("🎒 Usar Item")
                                .setStyle(ButtonStyle.Success)
                        );
                    payload.components = [combatActionRow];
                }
            } else if (respostaParaEnviar && typeof respostaParaEnviar.setTitle === 'function' && respostaParaEnviar.data) {
                payload.embeds = [respostaParaEnviar];
            } else {
                console.warn("[RESPOSTA FINAL] Formato não reconhecido:", JSON.stringify(respostaParaEnviar, null, 2));
                payload.content = "Ocorreu um erro inesperado ao formatar a resposta do bot.";
            }

            let deveSerEfêmera = false;
            if (commandName === 'adminexcluirficha' && payload.embeds && payload.embeds[0] && payload.embeds[0].data.title && payload.embeds[0].data.title.includes('Exclusão Não Confirmada')) {
                deveSerEfêmera = true;
            }
            if (deveSerEfêmera) { 
                payload.flags = [64]; 
            }

            if (Object.keys(payload).length === 0 || (!payload.content && (!payload.embeds || payload.embeds.length === 0))) {
                if (!interaction.replied && !interaction.deferred && commandName !== 'interagir' && commandName !== 'criar' && commandName !== 'ficha') {
                    console.error("[ENVIO ERRO] Payload vazio:", JSON.stringify(payload, null, 2));
                    await interaction.reply({ content: "Ocorreu um problema ao gerar a resposta (payload vazio/inválido).", ephemeral: true });
                }
            } else {
                if (interaction.replied || interaction.deferred) {
                    if (['interagir', 'criar', 'ficha'].includes(commandName)) {
                        console.warn(`[AVISO] 'respostaParaEnviar' definida para /${commandName} que já respondeu. Usando followUp.`);
                        await interaction.followUp(payload);
                    } else {
                        await interaction.editReply(payload);
                    }
                } else {
                    await interaction.reply(payload);
                }
            }
        } else if (!['criar', 'ficha', 'interagir'].includes(commandName)) {
            console.warn(`[RESPOSTA] 'respostaParaEnviar' é undefined para /${commandName}.`);
        }

    } catch (error) {
        console.error(`Erro CRÍTICO ao processar comando /${commandName} por ${user.username}:`, error.message);

        if (error.code !== 10062) {
            let errorEmbedParaUsuario = Arcadia.gerarEmbedErro("😥 Erro Crítico", "Desculpe, ocorreu um erro crítico ao processar seu comando. O Mestre foi notificado e investigará o problema.");
            const errorReplyPayload = { embeds: [errorEmbedParaUsuario], ephemeral: true };
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(errorReplyPayload);
                } else {
                    await interaction.reply(errorReplyPayload);
                }
            } catch (finalError) {
                console.error("Erro ao tentar responder sobre um erro anterior:", finalError.message);
            }
        }
    }
}

// --- Login do Bot ---
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("ERRO CRÍTICO: Token do Discord (DISCORD_TOKEN) não encontrado nas variáveis de ambiente!");
    process.exit(1);
} else {
    client.login(token).catch(err => {
        console.error("ERRO AO FAZER LOGIN NO DISCORD:", err.message);
        if (err.code === 'DisallowedIntents') {
            console.error("--> DICA: Verifique se todas as 'Privileged Gateway Intents' estão ATIVADAS no Portal de Desenvolvedores do Discord!");
        }
    });
}

