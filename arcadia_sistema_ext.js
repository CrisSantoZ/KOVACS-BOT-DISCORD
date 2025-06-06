
const { EmbedBuilder } = require('discord.js');

// Importar o sistema principal
const Arcadia = require('./arcadia_sistema.js');

// =====================================================================================
// EXTENSÕES PARA O SISTEMA ARCADIA
// =====================================================================================

// --- NOVOS FEITIÇOS DE EXEMPLO ---
const FEITICOS_EXTENSAO_ARCADIA = {
    // Exemplo de novos feitiços que podem ser adicionados
    "classe_necromante_vortice_das_almas": {
        id: "classe_necromante_vortice_das_almas",
        nome: "Vórtice das Almas",
        origemTipo: "classe", 
        origemNome: "Necromante",
        tipo: "ataque_area_drenagem_vida",
        descricao: "Cria um vórtice de energia necromântica que puxa e drena a vida de múltiplos inimigos.",
        cooldownSegundos: 60,
        maxNivel: 5,
        requisitosParaAprender: [],
        desbloqueiaFeiticos: [],
        niveis: [
            { 
                nivel: 1, 
                custoPM: 35, 
                efeitoDesc: "Cria vórtice que puxa inimigos em raio de 4m e drena (Intelecto * 0.8) PV de cada um, curando o conjurador em 30% do total drenado.", 
                efeitoDetalhes: { 
                    alvo: "area_vortice", 
                    raioMetros: 4, 
                    tipoDano: "Necrotico", 
                    formulaDrenagemPorAlvo: "(intelecto*0.8)", 
                    percentualCuraParaConjurador: 0.30,
                    efeitoPuxar: true
                }, 
                pontosParaProximoNivel: 3 
            }
        ]
    }
};

// --- NOVOS ITENS DE EXEMPLO ---
const ITENS_EXTENSAO_ARCADIA = {
    "pergaminho_de_teleporte_avancado": {
        itemNome: "Pergaminho de Teleporte Avançado",
        tipo: "Consumível Raro",
        descricao: "Um pergaminho que permite teleporte para qualquer local já visitado.",
        usavel: true,
        equipavel: false,
        efeito: {
            tipoEfeito: "TELEPORTE_AVANCADO",
            destino: "local_escolhido",
            mensagemAoUsar: "Você é envolvido por uma luz azulada e desaparece..."
        },
        cooldownSegundos: 1200
    },
    "elixir_de_transformacao": {
        itemNome: "Elixir de Transformação",
        tipo: "Consumível Épico",
        descricao: "Um elixir misterioso que permite assumir temporariamente a forma de uma criatura mágica.",
        usavel: true,
        equipavel: false,
        efeito: {
            tipoEfeito: "TRANSFORMACAO_TEMPORARIA",
            duracaoMinutos: 30,
            formasDisponiveis: ["Lobo Sombrio", "Águia Dourada", "Urso de Ferro"],
            mensagemAoUsar: "Você sente seu corpo se transformando..."
        },
        cooldownSegundos: 3600
    }
};

// --- NOVOS MOBS DE EXEMPLO ---
const MOBS_EXTENSAO_ARCADIA = {
    "golem_de_cristal": {
        _id: "golem_de_cristal",
        nome: "Golem de Cristal",
        nivel: 8,
        descricao: "Uma construção mágica feita de cristais mágicos brilhantes, extremamente resistente.",
        imagemUrl: "https://example.com/golem_cristal.jpg",
        atributos: {
            pvMax: 120,
            pvAtual: 120,
            ataqueBase: 18,
            defesaBase: 12,
            agilidade: 8,
            precisao: 80
        },
        habilidades: [
            { idHabilidade: "rajada_de_cristal", chanceDeUso: 0.3 },
            { idHabilidade: "barreira_cristalina", chanceDeUso: 0.2 }
        ],
        lootTable: [
            { itemId: "fragmento_de_cristal_magico", quantidadeMin: 1, quantidadeMax: 3, chanceDrop: 0.8 },
            { itemId: "essência de arcádia", quantidadeMin: 1, quantidadeMax: 2, chanceDrop: 0.4 }
        ],
        xpRecompensa: 35,
        florinsRecompensaMin: 8,
        florinsRecompensaMax: 15
    }
};

// --- NOVAS MISSÕES DE EXEMPLO ---
const MISSOES_EXTENSAO_ARCADIA = {
    "mExploracao_Ruinas": {
        _id: "mExploracao_Ruinas",
        nome: "Exploração das Ruínas Antigas",
        descricao: "Explore as ruínas misteriosas encontradas nos arredores da cidade.",
        tipo: "exploracao",
        dificuldade: "medio",
        nivelMinimo: 5,
        recompensas: {
            xp: 150,
            florinsDeOuro: 50,
            essenciaDeArcadia: 3,
            itens: [
                { itemId: "pergaminho_de_teleporte_avancado", quantidade: 1 }
            ]
        },
        objetivos: [
            {
                idObjetivo: "explorar_sala_principal",
                tipo: "LOCALIZACAO",
                descricao: "Encontre e explore a sala principal das ruínas",
                alvo: "sala_principal_ruinas",
                quantidadeAtual: 0,
                quantidadeNecessaria: 1
            }
        ]
    }
};

// --- FUNÇÕES DE EXTENSÃO ---

/**
 * Mescla os feitiços de extensão com os feitiços principais
 */
function mesclarFeiticos() {
    Object.assign(Arcadia.FEITICOS_BASE_ARCADIA, FEITICOS_EXTENSAO_ARCADIA);
    console.log(`[EXTENSÃO] ${Object.keys(FEITICOS_EXTENSAO_ARCADIA).length} novos feitiços adicionados.`);
}

/**
 * Mescla os itens de extensão com os itens principais
 */
function mesclarItens() {
    Object.assign(Arcadia.ITENS_BASE_ARCADIA, ITENS_EXTENSAO_ARCADIA);
    console.log(`[EXTENSÃO] ${Object.keys(ITENS_EXTENSAO_ARCADIA).length} novos itens adicionados.`);
}

/**
 * Adiciona novos mobs ao sistema
 */
function adicionarNovosMobs() {
    // Esta função seria chamada quando necessário para adicionar os mobs ao banco de dados
    console.log(`[EXTENSÃO] ${Object.keys(MOBS_EXTENSAO_ARCADIA).length} novos mobs preparados para adição.`);
}

/**
 * Adiciona novas missões ao sistema
 */
function adicionarNovasMissoes() {
    // Esta função seria chamada quando necessário para adicionar as missões ao banco de dados
    console.log(`[EXTENSÃO] ${Object.keys(MISSOES_EXTENSAO_ARCADIA).length} novas missões preparadas para adição.`);
}

/**
 * Exemplo de nova função utilitária
 */
function gerarEmbedPersonalizado(titulo, descricao, cor = 0x7289DA, campos = []) {
    const embed = new EmbedBuilder()
        .setColor(cor)
        .setTitle(titulo)
        .setDescription(descricao)
        .setTimestamp();

    campos.forEach(campo => {
        embed.addFields({ 
            name: campo.nome, 
            value: campo.valor, 
            inline: campo.inline || false 
        });
    });

    return embed;
}

/**
 * Exemplo de sistema de conquistas
 */
const CONQUISTAS_SISTEMA = {
    "primeira_vitoria": {
        id: "primeira_vitoria",
        nome: "Primeira Vitória",
        descricao: "Vença seu primeiro combate",
        categoria: "combate",
        recompensa: {
            xp: 25,
            florinsDeOuro: 10
        }
    },
    "colecionador_iniciante": {
        id: "colecionador_iniciante",
        nome: "Colecionador Iniciante",
        descricao: "Colete 10 itens diferentes",
        categoria: "colecao",
        recompensa: {
            essenciaDeArcadia: 2,
            itens: [{ itemId: "elixir_de_transformacao", quantidade: 1 }]
        }
    }
};

/**
 * Verifica e concede conquistas
 */
async function verificarConquistas(jogadorId, tipoEvento, dadosEvento = {}) {
    try {
        // Lógica para verificar se o jogador merece alguma conquista
        // baseada no tipo de evento (ex: "vitoria_combate", "item_coletado", etc.)
        
        console.log(`[CONQUISTAS] Verificando conquistas para ${jogadorId} - Evento: ${tipoEvento}`);
        
        // Aqui você implementaria a lógica específica de verificação
        // Por exemplo, para primeira vitória:
        if (tipoEvento === "vitoria_combate") {
            // Verificar se é a primeira vitória do jogador
            // Se for, conceder a conquista "primeira_vitoria"
        }
        
    } catch (error) {
        console.error("[CONQUISTAS] Erro ao verificar conquistas:", error);
    }
}

// --- FUNÇÕES PARA ATIVAR IMAGENS EM EMBEDS ---

/**
 * Valida e retorna URL de imagem se for válida
 */
function validarURLImagemExtensao(url) {
    if (!url || typeof url !== 'string') return null;
    const urlLimpa = url.trim();
    if (urlLimpa && (urlLimpa.startsWith('http://') || urlLimpa.startsWith('https://'))) {
        // Verificar se é uma extensão de imagem válida ou domínio confiável
        const extensoesValidas = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const dominiosConfiáveis = ['imgur.com', 'discord', 'cdn', 'githubusercontent'];
        
        const temExtensaoValida = extensoesValidas.some(ext => urlLimpa.toLowerCase().includes(ext));
        const temDominioConfiavel = dominiosConfiáveis.some(dominio => urlLimpa.toLowerCase().includes(dominio));
        
        if (temExtensaoValida || temDominioConfiavel) {
            return urlLimpa;
        }
    }
    return null;
}

/**
 * Adiciona imagem de NPC ao embed se disponível
 */
function adicionarImagemNPCAoEmbed(embed, dadosNPC) {
    try {
        // Verificar se o NPC tem imagem
        const imagemNPC = dadosNPC.imagemUrl || dadosNPC.imagem || dadosNPC.avatar;
        const imagemValidaNPC = validarURLImagemExtensao(imagemNPC);
        
        if (imagemValidaNPC) {
            embed.setThumbnail(imagemValidaNPC);
            console.log(`[EXTENSÃO] Imagem do NPC ${dadosNPC.nome} adicionada: ${imagemValidaNPC}`);
        }
        
        // Verificar se há imagem de missão associada
        if (dadosNPC.missaoAtual && dadosNPC.missaoAtual.imagemMissao) {
            const imagemMissao = validarURLImagemExtensao(dadosNPC.missaoAtual.imagemMissao);
            if (imagemMissao) {
                embed.setImage(imagemMissao);
                console.log(`[EXTENSÃO] Imagem da missão adicionada: ${imagemMissao}`);
            }
        }
        
    } catch (error) {
        console.error(`[EXTENSÃO] Erro ao adicionar imagem do NPC: ${error.message}`);
    }
    
    return embed;
}

/**
 * Adiciona imagem de Mob ao embed se disponível
 */
function adicionarImagemMobAoEmbed(embed, dadosMob) {
    try {
        const imagemMob = dadosMob.imagemUrl || dadosMob.imagem || dadosMob.sprite;
        const imagemValidaMob = validarURLImagemExtensao(imagemMob);
        
        if (imagemValidaMob) {
            embed.setThumbnail(imagemValidaMob);
            console.log(`[EXTENSÃO] Imagem do mob ${dadosMob.nome} adicionada: ${imagemValidaMob}`);
        }
        
    } catch (error) {
        console.error(`[EXTENSÃO] Erro ao adicionar imagem do mob: ${error.message}`);
    }
    
    return embed;
}

/**
 * Adiciona imagem de Missão ao embed se disponível
 */
function adicionarImagemMissaoAoEmbed(embed, dadosMissao) {
    try {
        const imagemMissao = dadosMissao.imagemUrl || dadosMissao.imagem || dadosMissao.banner;
        const imagemValidaMissao = validarURLImagemExtensao(imagemMissao);
        
        if (imagemValidaMissao) {
            embed.setImage(imagemValidaMissao);
            console.log(`[EXTENSÃO] Imagem da missão ${dadosMissao.nome} adicionada: ${imagemValidaMissao}`);
        }
        
        // Se a missão tem NPC associado com imagem, usar como thumbnail
        if (dadosMissao.npcAssociado && dadosMissao.npcAssociado.imagem) {
            const imagemNPCMissao = validarURLImagemExtensao(dadosMissao.npcAssociado.imagem);
            if (imagemNPCMissao) {
                embed.setThumbnail(imagemNPCMissao);
                console.log(`[EXTENSÃO] Imagem do NPC da missão adicionada como thumbnail: ${imagemNPCMissao}`);
            }
        }
        
    } catch (error) {
        console.error(`[EXTENSÃO] Erro ao adicionar imagem da missão: ${error.message}`);
    }
    
    return embed;
}

/**
 * Gera embed aprimorado para NPC com imagens
 */
function gerarEmbedNPCComImagem(dadosNPC, dialogoAtual = null, opcoesMissao = {}) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle(`🗣️ ${dadosNPC.nome}`)
            .setAuthor({ name: dadosNPC.nome });
        
        // Adicionar descrição se disponível
        if (dadosNPC.descricao) {
            embed.setDescription(dadosNPC.descricao);
        }
        
        // Adicionar diálogo atual
        if (dialogoAtual) {
            embed.addFields({ 
                name: "💬 Diálogo:", 
                value: dialogoAtual.texto || "*Este personagem não diz nada no momento.*" 
            });
        }
        
        // Adicionar informações de missão se disponível
        if (opcoesMissao.temMissao) {
            embed.addFields({ 
                name: "📋 Missão Disponível:", 
                value: opcoesMissao.nomeMissao || "Missão misteriosa" 
            });
        }
        
        // Adicionar imagens
        adicionarImagemNPCAoEmbed(embed, dadosNPC);
        
        return embed;
        
    } catch (error) {
        console.error(`[EXTENSÃO] Erro ao gerar embed do NPC: ${error.message}`);
        return gerarEmbedPersonalizado("Erro", "Não foi possível carregar informações do NPC", 0xFF0000);
    }
}

/**
 * Gera embed aprimorado para Mob com imagens
 */
function gerarEmbedMobComImagem(dadosMob, estadoCombate = null) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`⚔️ ${dadosMob.nome} (Nível ${dadosMob.nivel || '?'})`)
            .setAuthor({ name: `Criatura Hostil - ${dadosMob.nome}` });
        
        // Adicionar descrição se disponível
        if (dadosMob.descricao) {
            embed.setDescription(dadosMob.descricao);
        }
        
        // Adicionar status de combate se fornecido
        if (estadoCombate) {
            embed.addFields({ 
                name: "❤️ Vida:", 
                value: `${estadoCombate.pvAtual}/${estadoCombate.pvMax}`,
                inline: true 
            });
            
            if (estadoCombate.pmMax > 0) {
                embed.addFields({ 
                    name: "💧 Mana:", 
                    value: `${estadoCombate.pmAtual}/${estadoCombate.pmMax}`,
                    inline: true 
                });
            }
        } else {
            // Status base do mob
            embed.addFields({ 
                name: "⚡ Atributos:", 
                value: `**Ataque:** ${dadosMob.atributos?.ataqueBase || '?'}\n**Defesa:** ${dadosMob.atributos?.defesaBase || '?'}\n**Agilidade:** ${dadosMob.atributos?.agilidade || '?'}`,
                inline: true 
            });
        }
        
        // Adicionar imagens
        adicionarImagemMobAoEmbed(embed, dadosMob);
        
        return embed;
        
    } catch (error) {
        console.error(`[EXTENSÃO] Erro ao gerar embed do mob: ${error.message}`);
        return gerarEmbedPersonalizado("Erro", "Não foi possível carregar informações do mob", 0xFF0000);
    }
}

/**
 * Gera embed aprimorado para Missão com imagens
 */
function gerarEmbedMissaoComImagem(dadosMissao, progressoJogador = null) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle(`📋 ${dadosMissao.nome}`)
            .setAuthor({ name: `Missão - ${dadosMissao.tipo || 'Geral'}` });
        
        // Adicionar descrição
        if (dadosMissao.descricao) {
            embed.setDescription(dadosMissao.descricao);
        }
        
        // Adicionar informações básicas
        embed.addFields([
            { 
                name: "🎯 Dificuldade:", 
                value: dadosMissao.dificuldade || "Normal", 
                inline: true 
            },
            { 
                name: "📊 Nível Mínimo:", 
                value: dadosMissao.nivelMinimo?.toString() || "1", 
                inline: true 
            }
        ]);
        
        // Adicionar objetivos
        if (dadosMissao.objetivos && dadosMissao.objetivos.length > 0) {
            const objetivosTexto = dadosMissao.objetivos.map((obj, index) => {
                const progresso = progressoJogador?.objetivos?.[index] || { quantidadeAtual: 0 };
                return `${index + 1}. ${obj.descricao} (${progresso.quantidadeAtual}/${obj.quantidadeNecessaria})`;
            }).join('\n');
            
            embed.addFields({ 
                name: "📝 Objetivos:", 
                value: objetivosTexto || "Objetivos não definidos" 
            });
        }
        
        // Adicionar recompensas
        if (dadosMissao.recompensas) {
            const recompensasTexto = [];
            if (dadosMissao.recompensas.xp) recompensasTexto.push(`**XP:** ${dadosMissao.recompensas.xp}`);
            if (dadosMissao.recompensas.florinsDeOuro) recompensasTexto.push(`**Florins:** ${dadosMissao.recompensas.florinsDeOuro}`);
            if (dadosMissao.recompensas.essenciaDeArcadia) recompensasTexto.push(`**Essência:** ${dadosMissao.recompensas.essenciaDeArcadia}`);
            
            if (recompensasTexto.length > 0) {
                embed.addFields({ 
                    name: "🎁 Recompensas:", 
                    value: recompensasTexto.join('\n') 
                });
            }
        }
        
        // Adicionar imagens
        adicionarImagemMissaoAoEmbed(embed, dadosMissao);
        
        return embed;
        
    } catch (error) {
        console.error(`[EXTENSÃO] Erro ao gerar embed da missão: ${error.message}`);
        return gerarEmbedPersonalizado("Erro", "Não foi possível carregar informações da missão", 0xFF0000);
    }
}

// --- INICIALIZAÇÃO DA EXTENSÃO ---
function inicializarExtensao() {
    console.log("[EXTENSÃO] Inicializando Arcadia Sistema Extensão...");
    
    // Mesclar novos conteúdos
    mesclarFeiticos();
    mesclarItens();
    
    // Preparar novos sistemas
    adicionarNovosMobs();
    adicionarNovasMissoes();
    
    console.log("[EXTENSÃO] Arcadia Sistema Extensão inicializada com sucesso!");
}

// --- EXPORTAÇÕES ---
module.exports = {
    // Dados
    FEITICOS_EXTENSAO_ARCADIA,
    ITENS_EXTENSAO_ARCADIA,
    MOBS_EXTENSAO_ARCADIA,
    MISSOES_EXTENSAO_ARCADIA,
    CONQUISTAS_SISTEMA,
    
    // Funções básicas
    inicializarExtensao,
    mesclarFeiticos,
    mesclarItens,
    adicionarNovosMobs,
    adicionarNovasMissoes,
    gerarEmbedPersonalizado,
    verificarConquistas,
    
    // Funções de imagem
    validarURLImagemExtensao,
    adicionarImagemNPCAoEmbed,
    adicionarImagemMobAoEmbed,
    adicionarImagemMissaoAoEmbed,
    gerarEmbedNPCComImagem,
    gerarEmbedMobComImagem,
    gerarEmbedMissaoComImagem
};
