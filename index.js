// index.js
const { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();
const Arcadia = require('./arcadia_sistema.js');

process.on('unhandledRejection', error => {
    console.error('GRAVE: Unhandled promise rejection:', error);
    // Em um ambiente de produção, você poderia notificar um canal de desenvolvimento aqui
});

process.on('uncaughtException', error => {
    console.error('GRAVE: Uncaught exception:', error);
    // Tentar um graceful shutdown ou log e sair
    process.exit(1); // Encerra para evitar estado inconsistente
});

// --- CONSTANTES DE RESTRIÇÃO DE CANAL ---
const COMANDOS_CANAL_BEMVINDO = ['historia', 'listaracas', 'listaclasses', 'listareinos', 'comandos', 'ping', 'oi', 'arcadia', 'bemvindo'];
const COMANDOS_GERAIS_PERMITIDOS_EM_OUTROS_CANAIS = ['comandos', 'comandos', 'ficha', 'distribuirpontos', 'jackpot', 'usaritem', 'usarfeitico', 'aprenderfeitico', 'ping', 'historia', 'interagir', 'inventario']; // Adicionei 'interagir' e 'inventario' aqui
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

// --- Evento: Interação (Slash Commands, Autocomplete, Buttons, Select Menus) ---
client.on('interactionCreate', async interaction => {
    console.log("Recebi interaction!", interaction.type, interaction.customId || interaction.commandName || "");

    // --- BLOCO DE AUTOCOMPLETE ---
    if (interaction.isAutocomplete()) {
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
                choices = []; // Reset choices
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
        return;
    }

    // --- TRATAMENTO DE COMANDOS SLASH ---
    if (interaction.isChatInputCommand()) {
        const { commandName, channelId, user, options, member } = interaction;
        const senderId = user.id;
        const senderUsername = user.username;
        const isOwner = senderId === OWNER_ID_DISCORD;
        console.log(`[Slash CMD] /${commandName} | by ${senderUsername} (${senderId})`);
        let respostaParaEnviar;
        let podeProcessar = true;

        // --- LÓGICA DE RESTRIÇÃO DE CANAL ---
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
            ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicatas
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
        // Fim da lógica de restrição de canal

        try { // INÍCIO DO TRY/CATCH PRINCIPAL PARA COMANDOS SLASH
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

                        // Lógica de cargos após criação
                        if (resultadoCriacao && typeof resultadoCriacao.setTitle === 'function' && resultadoCriacao.data && resultadoCriacao.data.title && resultadoCriacao.data.title.includes("🎉 Personagem Criado! 🎉")) {
                            if (member) {
                                const fichaCriada = await Arcadia.getFichaOuCarregar(senderId);
                                if (fichaCriada) {
                                    let cargosAdicionadosMsgs = [];
                                    let cargosNaoEncontradosMsgs = [];
                                    let cargosRemovidosMsgs = [];

                                    const cargoVisitante = member.guild.roles.cache.find(role => role.name === Arcadia.NOME_CARGO_VISITANTE);
                                    if (cargoVisitante && member.roles.cache.has(cargoVisitante.id)) {
                                        try { await member.roles.remove(cargoVisitante); cargosRemovidosMsgs.push(Arcadia.NOME_CARGO_VISITANTE); }
                                        catch (e) { console.error(`Erro ao REMOVER ${Arcadia.NOME_CARGO_VISITANTE} de ${senderUsername}:`, e); }
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
                            return; // Retorna para evitar erro de interação já tratada
                        }

                        try {
                            await interaction.deferReply({ ephemeral: true });
                        } catch (deferError) {
                            console.error("[INTERAGIR] Erro ao fazer deferReply:", deferError.message);
                            if (deferError.message.includes("Unknown interaction")) {
                                return;
                            }
                            return; // Retorna em caso de erro no defer
                        }

                        const nomeNPCInput = options.getString('npc');
                        const fichaJogador = await Arcadia.getFichaOuCarregar(senderId);

                        if (!fichaJogador || fichaJogador.nomePersonagem === "N/A") {
                            try {
                                await interaction.editReply({ embeds: [Arcadia.gerarEmbedErro("Ficha não encontrada", "Você precisa criar uma ficha primeiro com `/criar`.")] });
                            } catch (editError) {
                                console.error("[INTERAGIR] Erro ao editar reply com erro de ficha:", editError.error);
                            }
                            return; // Retorna após erro de ficha
                        }

                        const resultadoInteracao = await Arcadia.processarInteracaoComNPC(nomeNPCInput, fichaJogador);
                        const idNpc = resultadoInteracao.idNPC;

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
                                    console.error(`[DEBUG] Erro ao adicionar imagem do NPC: ${error.message}`);
                                }
                            }
                            if (resultadoInteracao.imagemMissao && resultadoInteracao.imagemMissao.trim() !== '') {
                                try {
                                    embedNPC.setImage(resultadoInteracao.imagemMissao);
                                } catch (error) {
                                    console.error(`[DEBUG] Erro ao adicionar imagem da missão: ${error.message}`);
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

                    // --- Comandos de Admin ---
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
                    default:
                        if (commandName) {
                            respostaParaEnviar = Arcadia.gerarEmbedAviso("Comando Desconhecido", `O comando \`/${commandName}\` não foi reconhecido ou não está implementado no switch principal.`);
                        } else {
                            respostaParaEnviar = Arcadia.gerarEmbedErro("Erro Interno", "Nome do comando não recebido.");
                        }
                        break;
                }
            }

            if (respostaParaEnviar) {
                const payload = {};
                if (typeof respostaParaEnviar === 'string') {
                    payload.content = respostaParaEnviar;
                } else if (respostaParaEnviar.embeds && Array.isArray(respostaParaEnviar.embeds)) {
                    payload.embeds = respostaParaEnviar.embeds;
                    if (respostaParaEnviar.content) { payload.content = respostaParaEnviar.content; }
                } else if (respostaParaEnviar && typeof respostaParaEnviar.setTitle === 'function' && respostaParaEnviar.data) {
                    payload.embeds = [respostaParaEnviar];
                } else {
                    console.warn("[RESPOSTA FINAL ELSE] Formato de respostaParaEnviar não reconhecido:", JSON.stringify(respostaParaEnviar, null, 2));
                    payload.content = "Ocorreu um erro inesperado ao formatar a resposta do bot.";
                }

                let deveSerEfêmera = false;
                if (commandName === 'adminexcluirficha' && payload.embeds && payload.embeds[0] && payload.embeds[0].data.title && payload.embeds[0].data.title.includes('Exclusão Não Confirmada')) {
                    deveSerEfêmera = true;
                }
                if (deveSerEfêmera) { payload.ephemeral = true; } // Use payload.ephemeral = true for consistency

                if (Object.keys(payload).length === 0 || (!payload.content && (!payload.embeds || payload.embeds.length === 0))) {
                    if (!interaction.replied && !interaction.deferred && commandName !== 'interagir' && commandName !== 'criar' && commandName !== 'ficha') {
                        console.error("[ENVIO ERRO] Payload resultou em mensagem vazia e interação não respondida:", JSON.stringify(payload, null, 2));
                        await interaction.reply({ content: "Ocorreu um problema ao gerar a resposta (payload vazio/inválido).", ephemeral: true });
                    } else {
                         console.warn(`[ENVIO] Payload vazio ou incompleto para /${commandName}, mas interação já respondida/adiada ou é um comando que responde por si só.`);
                    }
                } else {
                     if (interaction.replied || interaction.deferred) {
                        if (['interagir', 'criar', 'ficha'].includes(commandName)) { // Only commands that are designed to defer/editReply should reach here
                             console.warn(`[AVISO LÓGICA] 'respostaParaEnviar' foi definida para /${commandName} que já deveria ter respondido. Usamos followUp.`);
                             await interaction.followUp(payload);
                        } else {
                            await interaction.editReply(payload);
                        }
                    } else {
                        await interaction.reply(payload);
                    }
                }
            } else if (!['criar', 'ficha', 'interagir'].includes(commandName)) {
                console.warn(`[RESPOSTA] 'respostaParaEnviar' é undefined para /${commandName}, e este comando não respondeu diretamente à interação.`);
            }

        } catch (error) {
            console.error(`Erro CRÍTICO ao processar comando /${commandName} por ${user.username}:`, error);

            if (error.code !== 10062) { // Discord API Unknown Interaction error
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
        return; // Important: ensure we exit after handling chat input commands
    }

    // --- TRATAMENTO DE INTERAÇÕES DE BOTÃO ---
    else if (interaction.isButton()) {
        const customIdParts = interaction.customId.split('_');
        const tipoComponente = customIdParts[0];
        const senderIdButton = interaction.user.id;
        const fichaJogador = await Arcadia.getFichaOuCarregar(senderIdButton);

        if (!fichaJogador) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "Sua ficha não foi encontrada para continuar a interação.", embeds: [], components: [], ephemeral: true });
            }
            return;
        }

        try {
            if (tipoComponente === 'dialogo') {
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

                const acaoDialogo = customIdParts[1] ? customIdParts[1].toUpperCase() : null;
                const idNpc = customIdParts[2];
                const idParametro3 = customIdParts[3]; // levaParaDialogoId ou 'sem_acao'
                // const idDialogoOriginal = customIdParts[4]; // Não usado diretamente aqui, mas pode ser útil para debug

                if (acaoDialogo === 'ENCERRAR' || (acaoDialogo === 'CONTINUAR' && idParametro3 === 'sem_acao')) {
                    try {
                        await interaction.editReply({ content: "Conversa encerrada.", embeds: [], components: [] });
                    } catch (editError) {
                        console.error("[DIALOGO] Erro ao encerrar conversa:", editError.message);
                    }
                    return;
                } else if (acaoDialogo === 'CONTINUAR') {
                    const idProximoDialogo = idParametro3;
                    const resultadoInteracao = await Arcadia.processarInteracaoComNPC(idNpc, fichaJogador, idProximoDialogo);

                    if (resultadoInteracao.erro) {
                        await interaction.followUp({ embeds: [Arcadia.gerarEmbedAviso("Interação Falhou", resultadoInteracao.erro)], components: [], ephemeral: true });
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
                                console.error(`[DEBUG] Erro ao adicionar imagem do NPC (continuação): ${error.message}`);
                            }
                        }
                        if (resultadoInteracao.imagemMissao && resultadoInteracao.imagemMissao.trim() !== '') {
                            try {
                                embedNPC.setImage(resultadoInteracao.imagemMissao);
                            } catch (error) {
                                console.error(`[DEBUG] Erro ao adicionar imagem da missão (continuação): ${error.message}`);
                            }
                        }

                        embedNPC.addFields({ name: "💬 Diálogo:", value: resultadoInteracao.dialogoAtual.texto || "*...*" });

                        const novaActionRow = new ActionRowBuilder();
                        let novasOpcoes = false;

                        if (resultadoInteracao.dialogoAtual.respostasJogador && resultadoInteracao.dialogoAtual.respostasJogador.length > 0) {
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
                            const missaoLog = fichaJogador.logMissoes ? fichaJogador.logMissoes.find(m => m.idMissao === resultadoInteracao.dialogoAtual.ofereceMissao) : null;
                            if ((!missaoLog || (missaoLog.status !== 'aceita' && missaoLog.status !== 'concluida')) && novaActionRow.components.length < 5 ) {
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
                        await interaction.editReply({ embeds: [embedNPC], components: novaActionRow.components.length > 0 ? [novaActionRow] : [] });
                    }
                } else {
                     await interaction.editReply({ content: `Ação de diálogo "${customIdParts[1]}" não reconhecida.`, embeds:[], components: [] });
                }
            } // FECHA if (tipoComponente === 'dialogo')

            else if (tipoComponente === 'missao') {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferUpdate();
                }

                const acaoMissao = customIdParts[1];
                const idNpcMissao = customIdParts[2];
                const idMissaoParaAceitar = customIdParts[3];

                if (acaoMissao === 'ACEITAR') {
                    const resultadoAceite = await Arcadia.aceitarMissao(senderIdButton, idMissaoParaAceitar, idNpcMissao);

                    if (resultadoAceite.sucesso) {
                        const embedConfirmacao = Arcadia.gerarEmbedSucesso("🎯 Missão Aceita!", resultadoAceite.sucesso);
                        const novoDialogoPosAceite = await Arcadia.processarInteracaoComNPC(idNpcMissao, fichaJogador, resultadoAceite.dialogoFeedbackId);

                        let componentesResposta = [];
                        let iniciarCombateInfo = null;

                        if (idMissaoParaAceitar === "mVRatos") {
                            const missoesCol = Arcadia.getMissoesCollection();
                            if (!missoesCol) {
                                console.error("ERRO GRAVE no index.js: getMissoesCollection() retornou undefined!");
                                await interaction.followUp({ embeds: [Arcadia.gerarEmbedErro("Erro de Sistema", "Não foi possível acessar os dados da missão.")], ephemeral: true });
                                return;
                            }
                            const missaoDef = await missoesCol.findOne({ _id: "mVRatos" });
                            if (missaoDef && missaoDef.objetivos && missaoDef.objetivos[0] && missaoDef.objetivos[0].tipo === "COMBATE") {
                                const primeiroObjetivo = missaoDef.objetivos[0];
                                iniciarCombateInfo = {
                                    idMob: primeiroObjetivo.alvo,
                                    idMissao: idMissaoParaAceitar,
                                    idObjetivo: primeiroObjetivo.idObjetivo
                                };
                            }
                        }

                        if (iniciarCombateInfo) {
                            const resultadoInicioCombate = await Arcadia.iniciarCombatePvE(
                                senderIdButton,
                                iniciarCombateInfo.idMob,
                                iniciarCombateInfo.idMissao,
                                iniciarCombateInfo.idObjetivo
                            );

                            if (resultadoInicioCombate.sucesso) {
                                const jogadorEstado = resultadoInicioCombate.estadoCombate.jogador;
                                const mobEstado = resultadoInicioCombate.estadoCombate.mob;

                                const nomeJogador = jogadorEstado.nome || (fichaJogador.nomePersonagem || "Jogador");
                                const pvAtualJogador = jogadorEstado.pvAtual;
                                const pvMaxJogador = jogadorEstado.pvMax;
                                const pmAtualJogador = jogadorEstado.pmAtual;
                                const pmMaxJogador = jogadorEstado.pmMax;

                                const nomeMob = mobEstado.nome || "Criatura Hostil";
                                const pvAtualMob = mobEstado.pvAtual;
                                const pvMaxMob = mobEstado.pvMax;
                                const nivelMob = mobEstado && typeof mobEstado.nivel === 'number' && mobEstado.nivel > 0 ? mobEstado.nivel : '?';

                                const idCombateParaSalvar = String(resultadoInicioCombate.idCombate).trim();
                                if (resultadoInicioCombate.objetoCombate) {
                                    combatesAtivos[idCombateParaSalvar] = resultadoInicioCombate.objetoCombate;
                                    console.log(`[COMBATE] Combate ${idCombateParaSalvar} salvo no cache.`);
                                } else {
                                    console.error(`[COMBATE] ERRO: objetoCombate não retornado por iniciarCombatePvE!`);
                                }

                                let descricaoCombate = `📜 **Missão:** Infestação no Armazém\n\n`;
                                descricaoCombate += `*${resultadoInicioCombate.mensagemInicial || "O combate começou!"}*\n\n`;
                                descricaoCombate += `**Turno de:** ${nomeJogador}`;

                                const embedCombate = new EmbedBuilder()
                                    .setColor(0xDC143C)
                                    .setTitle(`⚔️ COMBATE IMINENTE! ⚔️`)
                                    .setDescription(descricaoCombate);

                                if (mobEstado && mobEstado.imagem && mobEstado.imagem.trim() && (mobEstado.imagem.startsWith('http://') || mobEstado.imagem.startsWith('https://'))) {
                                    embedCombate.setThumbnail(mobEstado.imagem.trim());
                                }

                                embedCombate.addFields(
                                    {
                                        name: `👤 ${nomeJogador}`,
                                        value: `❤️ PV: **${pvAtualJogador}/${pvMaxJogador}**\n💧 PM: **${pmAtualJogador}/${pmMaxJogador}**`,
                                        inline: true
                                    },
                                    {
                                        name: `\u200B`,
                                        value: `\u200B`,
                                        inline: true
                                    },
                                    {
                                        name: `👹 ${nomeMob} (Nv. ${nivelMob})`,
                                        value: `❤️ PV: **${pvAtualMob}/${pvMaxMob}**`,
                                        inline: true
                                    }
                                )
                                    .setFooter({ text: "Prepare-se para a batalha!" });

                                const combatActionRow = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`combate_ATAQUEBASICO_${resultadoInicioCombate.idCombate}`).setLabel("⚔️ Ataque Básico").setStyle(ButtonStyle.Danger),
                                        new ButtonBuilder().setCustomId(`combate_USARFEITICO_${resultadoInicioCombate.idCombate}`).setLabel("🔮 Usar Feitiço").setStyle(ButtonStyle.Primary),
                                        new ButtonBuilder().setCustomId(`combate_USARITEM_${resultadoInicioCombate.idCombate}`).setLabel("🎒 Usar Item").setStyle(ButtonStyle.Success)
                                    );

                                await interaction.editReply({ embeds: [embedConfirmacao], components: [] });
                                await interaction.followUp({ embeds: [embedCombate], components: [combatActionRow] });
                                return;

                            } else {
                                embedConfirmacao.addFields({ name: "⚠️ Falha ao Iniciar Combate", value: resultadoInicioCombate.erro || "Não foi possível iniciar o combate." });
                            }
                        }

                        if (novoDialogoPosAceite && !novoDialogoPosAceite.erro && novoDialogoPosAceite.dialogoAtual) {
                            embedConfirmacao.addFields({name: `${novoDialogoPosAceite.nomeNPC} diz:`, value: novoDialogoPosAceite.dialogoAtual.texto});
                            const proximaActionRow = new ActionRowBuilder();
                            let temProximasOpcoes = false;
                            if (novoDialogoPosAceite.dialogoAtual.respostasJogador && novoDialogoPosAceite.dialogoAtual.respostasJogador.length > 0) {
                                novoDialogoPosAceite.dialogoAtual.respostasJogador.slice(0,4).forEach(opcao => {
                                    proximaActionRow.addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`dialogo_CONTINUAR_${idNpcMissao}_${opcao.levaParaDialogoId || 'sem_acao'}_${novoDialogoPosAceite.dialogoAtual.idDialogo}_${interaction.user.id}`)
                                            .setLabel(opcao.textoResposta.substring(0,80))
                                            .setStyle(ButtonStyle.Primary)
                                    );
                                    temProximasOpcoes = true;
                                });
                            }
                            if (proximaActionRow.components.length < 5 && (!temProximasOpcoes || novoDialogoPosAceite.dialogoAtual.encerraDialogo)) {
                                proximaActionRow.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`dialogo_ENCERRAR_${idNpcMissao}_${novoDialogoPosAceite.dialogoAtual.idDialogo}_${interaction.user.id}`)
                                        .setLabel("Encerrar Conversa")
                                        .setStyle(ButtonStyle.Secondary)
                                );
                            }
                            if(proximaActionRow.components.length > 0) componentesResposta = [proximaActionRow];
                        }
                        await interaction.editReply({ embeds: [embedConfirmacao], components: componentesResposta });

                    } else {
                        await interaction.editReply({ embeds: [Arcadia.gerarEmbedAviso("Missão", resultadoAceite.erro || "Não foi possível aceitar a missão.")], components: [] });
                    }
                } else {
                    await interaction.editReply({ content: `Ação de missão "${acaoMissao}" não reconhecida.`, embeds:[], components: [] });
                }
            } // FECHA if (tipoComponente === 'missao')

            else if (tipoComponente === 'combate') {
                const acaoCombate = customIdParts[1];
                const idCombate = customIdParts.slice(2).join('_');

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferUpdate();
                }

                if (acaoCombate === 'ATAQUEBASICO') {
                    try {
                        const resultadoAcaoJogador = await Arcadia.processarAcaoJogadorCombate(idCombate, senderIdButton, "ATAQUE_BASICO");

                        if (!resultadoAcaoJogador || typeof resultadoAcaoJogador !== 'object') {
                            console.error("ERRO: processarAcaoJogadorCombate não retornou um objeto válido.");
                            await interaction.editReply({ content: "Ocorreu um erro crítico ao processar a ação de combate (retorno inesperado).", components: [], embeds: [] });
                            return;
                        }

                        if (resultadoAcaoJogador.erro) {
                            await interaction.editReply({ content: `Erro na ação: ${resultadoAcaoJogador.erro}`, ephemeral: true });
                            if (resultadoAcaoJogador.combateTerminou) {
                                 await interaction.editReply({ content: `Combate encerrado devido a um erro: ${resultadoAcaoJogador.erro}`, embeds: [], components: [] });
                            }
                            return;
                        }

                        const jogadorEstadoAcao = resultadoAcaoJogador.estadoCombate?.jogador;
                        const mobEstadoAcao = resultadoAcaoJogador.estadoCombate?.mob;

                        const nomeJogadorAcao = jogadorEstadoAcao?.nome ?? "Jogador";
                        const pvAtualJogadorAcao = jogadorEstadoAcao?.pvAtual ?? "N/A";
                        const pvMaxJogadorAcao = jogadorEstadoAcao?.pvMax ?? "N/A";
                        const pmAtualJogadorAcao = jogadorEstadoAcao?.pmAtual ?? "N/A";
                        const pmMaxJogadorAcao = jogadorEstadoAcao?.pmMax ?? "N/A";

                        const nomeMobAcao = mobEstadoAcao?.nome ?? "Criatura";
                        const pvAtualMobAcao = mobEstadoAcao?.pvAtual ?? "N/A";
                        const pvMaxMobAcao = mobEstadoAcao?.pvMax ?? "N/A";
                        const nivelMobCombat = mobEstadoAcao && typeof mobEstadoAcao.nivel === 'number' && mobEstadoAcao.nivel > 0 ? mobEstadoAcao.nivel : '?';

                        let logCombateAtualizado = resultadoAcaoJogador.logTurnoAnterior || [];
                        const embedCombateAtualizado = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle(`⚔️ Combate em Andamento ⚔️`)
                            .setDescription(logCombateAtualizado.join('\n') || "Ação processada.")
                            .addFields(
                                { name: `👤 ${nomeJogadorAcao}`, value: `❤️ PV: **${pvAtualJogadorAcao}/${pvMaxJogadorAcao}**\n💧 PM: **${pmAtualJogadorAcao}/${pmMaxJogadorAcao}**`, inline: true },
                                { name: `\u200B`, value: `\u200B`, inline: true },
                                { name: `👹 ${nomeMobAcao} (Nv. ${nivelMobCombat})`, value: `❤️ PV: **${pvAtualMobAcao}/${pvMaxMobAcao}**`, inline: true }
                            );

                        if (mobEstadoAcao?.imagem && mobEstadoAcao.imagem.trim() && (mobEstadoAcao.imagem.startsWith('http://') || mobEstadoAcao.imagem.startsWith('https://'))) {
                            embedCombateAtualizado.setThumbnail(mobEstadoAcao.imagem.trim());
                        }

                        if (resultadoAcaoJogador.mobDerrotado) {
                            const eUltimoMob = resultadoAcaoJogador.dadosParaFinalizar?.eUltimoMobDaMissao ?? true;
                            const resultadoFinal = await Arcadia.finalizarCombate(idCombate, senderIdButton, true, eUltimoMob);

                            if (resultadoFinal.erro) {
                                await interaction.editReply({ content: `Erro ao finalizar combate: ${resultadoFinal.erro}`, embeds: [], components: [] });
                                return;
                            }

                            const embedVitoria = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle("🏆 VITÓRIA! 🏆")
                                .setDescription(resultadoFinal.mensagemFinal || `${nomeJogadorAcao} venceu o combate!`);

                            embedVitoria.addFields(
                                { name: `👤 ${nomeJogadorAcao}`, value: `❤️ PV: **${pvAtualJogadorAcao}/${pvMaxJogadorAcao}**\n💧 PM: **${pmAtualJogadorAcao}/${pmMaxJogadorAcao}**`, inline: true },
                                { name: `\u200B`, value: `\u200B`, inline: true },
                                { name: `👹 ${nomeMobAcao} (Nv. ${nivelMobCombat})`, value: `❤️ PV: **0/${pvMaxMobAcao}** ☠️`, inline: true }
                            );

                            if (resultadoFinal.recompensasTextoFinal && resultadoFinal.recompensasTextoFinal.length > 0) {
                                embedVitoria.addFields({
                                    name: "🎁 Recompensas Obtidas",
                                    value: resultadoFinal.recompensasTextoFinal.join('\n'),
                                    inline: false
                                });
                            }

                            if (resultadoFinal.logCombateFinal && resultadoFinal.logCombateFinal.length > 0) {
                                const logResumido = resultadoFinal.logCombateFinal.slice(-3).join('\n');
                                embedVitoria.addFields({
                                    name: "📋 Resultado do Combate",
                                    value: logResumido,
                                    inline: false
                                });
                            }

                            if (mobEstadoAcao?.imagem && mobEstadoAcao.imagem.trim() &&
                                (mobEstadoAcao.imagem.startsWith('http://') || mobEstadoAcao.imagem.startsWith('https://'))) {
                                embedVitoria.setThumbnail(mobEstadoAcao.imagem.trim());
                            }

                            embedVitoria.setFooter({ text: "Combate finalizado com sucesso!" });
                            embedVitoria.setTimestamp();

                            await interaction.editReply({ embeds: [embedVitoria], components: [] });
                            return;
                        }

                        if (resultadoAcaoJogador.proximoTurno === 'mob') {
                            const resultadoTurnoMob = await Arcadia.processarTurnoMobCombate(idCombate);

                            if (!resultadoTurnoMob || typeof resultadoTurnoMob !== 'object') {
                                console.error("ERRO: processarTurnoMobCombate não retornou um objeto válido.");
                                await interaction.editReply({ content: "Ocorreu um erro crítico no turno do oponente.", components: [], embeds: [] });
                                return;
                            }

                            if (resultadoTurnoMob.erro) {
                                logCombateAtualizado.push(`⚠️ Erro no turno do oponente: ${resultadoTurnoMob.erro}`);
                            } else {
                                logCombateAtualizado.push(...(resultadoTurnoMob.logTurnoAnterior || []));
                            }
                            embedCombateAtualizado.setDescription(logCombateAtualizado.join('\n'));

                            const jogadorEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.jogador || jogadorEstadoAcao;
                            const mobEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.mob || mobEstadoAcao;

                            const nomeJogadorTurnoMob = jogadorEstadoTurnoMob?.nome ?? "Jogador";
                            const pvAtualJogadorTurnoMob = jogadorEstadoTurnoMob?.pvAtual ?? "N/A";
                            const pvMaxJogadorTurnoMob = jogadorEstadoTurnoMob?.pvMax ?? "N/A";
                            const pmAtualJogadorTurnoMob = jogadorEstadoTurnoMob?.pmAtual ?? "N/A";
                            const pmMaxJogadorTurnoMob = jogadorEstadoTurnoMob?.pmMax ?? "N/A";
                            const nomeMobTurnoMob = mobEstadoTurnoMob?.nome ?? "Criatura";
                            const pvAtualMobTurnoMob = mobEstadoTurnoMob?.pvAtual ?? "N/A";
                            const pvMaxMobTurnoMob = mobEstadoTurnoMob?.pvMax ?? "N/A";
                            const nivelMobTurnoMob = typeof mobEstadoTurnoMob?.nivel === 'number' ? mobEstadoTurnoMob.nivel : '?';


                            embedCombateAtualizado.setFields(
                                { name: `👤 ${nomeJogadorTurnoMob}`, value: `❤️ PV: **${pvAtualJogadorTurnoMob}/${pvMaxJogadorTurnoMob}**\n💧 PM: **${pmAtualJogadorTurnoMob}/${pmMaxJogadorTurnoMob}**`, inline: true },
                                { name: `\u200B`, value: `\u200B`, inline: true },
                                { name: `👹 ${nomeMobTurnoMob} (Nv. ${nivelMobTurnoMob})`, value: `❤️ PV: **${pvAtualMobTurnoMob}/${pvMaxMobTurnoMob}**`, inline: true }
                            );

                            if (resultadoTurnoMob.combateTerminou && resultadoTurnoMob.vencedorFinal === "mob") {
                                embedCombateAtualizado.setTitle("☠️ Derrota... ☠️");
                                embedCombateAtualizado.setColor(0x8B0000);
                                if (resultadoTurnoMob.logCombateFinal) {
                                     embedCombateAtualizado.setDescription((resultadoTurnoMob.logCombateFinal).join('\n'));
                                }
                                await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                                delete combatesAtivos[idCombate]; // Clear combat from cache
                                return;
                            } else if (resultadoTurnoMob.combateTerminou) {
                                embedCombateAtualizado.setTitle(resultadoTurnoMob.vencedorFinal === "jogador" ? "🏆 Vitória Inesperada! 🏆" : "⚔️ Combate Encerrado ⚔️");
                                if (resultadoTurnoMob.logCombateFinal) {
                                     embedCombateAtualizado.setDescription((resultadoTurnoMob.logCombateFinal).join('\n'));
                                }
                                if(resultadoTurnoMob.recompensasTextoFinal && resultadoTurnoMob.recompensasTextoFinal.length > 0) {
                                    embedCombateAtualizado.addFields({ name: "Recompensas", value: resultadoTurnoMob.recompensasTextoFinal.join('\n') });
                                }
                                await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                                return;
                            }
                        }

                        const combatActionRowContinuacao = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`combate_ATAQUEBASICO_${idCombate}`).setLabel("⚔️ Ataque Básico").setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId(`combate_USARFEITICO_${idCombate}`).setLabel("🔮 Usar Feitiço").setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId(`combate_USARITEM_${idCombate}`).setLabel("🎒 Usar Item").setStyle(ButtonStyle.Success)
                            );
                        await interaction.editReply({ embeds: [embedCombateAtualizado], components: [combatActionRowContinuacao] });

                    } catch (e) {
                        console.error("ERRO BRUTO no bloco ATAQUEBASICO:", e);
                        await interaction.editReply({ content: "Ocorreu um erro crítico severo ao processar seu ataque.", components: [], embeds:[] });
                        return;
                    }
                } // Fecha if (acaoCombate === 'ATAQUEBASICO')

                else if (acaoCombate === 'USARFEITICO') {
                    try {
                        const magiasConhecidas = await Arcadia.getMagiasConhecidasParaAutocomplete(senderIdButton);

                        if (!magiasConhecidas || magiasConhecidas.length === 0) {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({ content: "Você não conhece nenhum feitiço para usar!", ephemeral: true });
                            }
                            return;
                        }

                        if (magiasConhecidas.length === 1) {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.deferUpdate();
                            }

                            const resultado = await Arcadia.processarAcaoJogadorCombate(
                                idCombate, senderIdButton, "USAR_FEITICO", { idFeitico: magiasConhecidas[0].value }
                            );

                            if (!resultado || typeof resultado !== 'object') {
                                await interaction.editReply({ content: "Erro crítico ao usar feitiço.", components: [], embeds: [] });
                                return;
                            }
                            if (resultado.erro) {
                                await interaction.editReply({ content: `Erro ao usar feitiço: ${resultado.erro}`, components: [] });
                                return;
                            }

                            const jogadorEstadoAcao = resultado.estadoCombate?.jogador;
                            const mobEstadoAcao = resultado.estadoCombate?.mob;

                            let logCombateAtualizado = resultado.logTurnoAnterior || [];
                            let embedCombateAtualizado = new EmbedBuilder()
                                .setColor(0x800080)
                                .setTitle(`🔮 Combate em Andamento (Feitiço)`)
                                .setDescription(logCombateAtualizado.join('\n') || "Feitiço usado.")
                                .addFields(
                                    { name: `👤 ${jogadorEstadoAcao?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoAcao?.pvAtual ?? "?"}/${jogadorEstadoAcao?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoAcao?.pmAtual ?? "?"}/${jogadorEstadoAcao?.pmMax ?? "?"}**`, inline: true },
                                    { name: `\u200B`, value: `\u200B`, inline: true },
                                    { name: `👹 ${mobEstadoAcao?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoAcao?.nivel === "number" ? mobEstadoAcao.nivel : "?"})`, value: `❤️ PV: **${mobEstadoAcao?.pvAtual ?? "?"}/${mobEstadoAcao?.pvMax ?? "?"}**`, inline: true }
                                );

                            if (mobEstadoAcao?.imagem && (mobEstadoAcao.imagem.startsWith('http://') || mobEstadoAcao.imagem.startsWith('https://'))) {
                                embedCombateAtualizado.setThumbnail(mobEstadoAcao.imagem.trim());
                            }

                            if (resultado.mobDerrotado) {
                                const resultadoFinal = await Arcadia.finalizarCombate(idCombate, senderIdButton, true, resultado.dadosParaFinalizar?.eUltimoMobDaMissao);
                                embedCombateAtualizado.setTitle("🏆 Vitória! 🏆");
                                embedCombateAtualizado.setDescription((resultadoFinal.logCombateFinal || logCombateAtualizado).join('\n'));
                                if (resultadoFinal.recompensasTextoFinal && resultadoFinal.recompensasTextoFinal.length > 0) {
                                    embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoFinal.recompensasTextoFinal.join('\n') });
                                }
                                await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                                return;
                            }

                            if (resultado.proximoTurno === 'mob') {
                                const resultadoTurnoMob = await Arcadia.processarTurnoMobCombate(idCombate);
                                if (!resultadoTurnoMob || typeof resultadoTurnoMob !== 'object') {
                                    await interaction.editReply({ content: "Erro crítico no turno do oponente.", components: [], embeds: [] });
                                    return;
                                }

                                if (resultadoTurnoMob.erro) {
                                    logCombateAtualizado.push(`⚠️ Erro no turno do oponente: ${resultadoTurnoMob.erro}`);
                                } else {
                                    logCombateAtualizado.push(...(resultadoTurnoMob.logTurnoAnterior || []));
                                }
                                embedCombateAtualizado.setDescription(logCombateAtualizado.join('\n'));

                                const jogadorEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.jogador || jogadorEstadoAcao;
                                const mobEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.mob || mobEstadoAcao;
                                embedCombateAtualizado.setFields(
                                    { name: `👤 ${jogadorEstadoTurnoMob?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoTurnoMob?.pvAtual ?? "?"}/${jogadorEstadoTurnoMob?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoTurnoMob?.pmAtual ?? "?"}/${jogadorEstadoTurnoMob?.pmMax ?? "?"}**`, inline: true },
                                    { name: `\u200B`, value: `\u200B`, inline: true },
                                    { name: `👹 ${mobEstadoTurnoMob?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoTurnoMob?.nivel === "number" ? mobEstadoTurnoMob.nivel : "?"})`, value: `❤️ PV: **${mobEstadoTurnoMob?.pvAtual ?? "?"}/${mobEstadoTurnoMob?.pvMax ?? "?"}**`, inline: true }
                                );

                                if (resultadoTurnoMob.combateTerminou) {
                                    embedCombateAtualizado.setTitle(resultadoTurnoMob.vencedorFinal === "mob" ? "☠️ Derrota... ☠️" : "🏆 Vitória Inesperada! 🏆");
                                    if (resultadoTurnoMob.logCombateFinal) {
                                        embedCombateAtualizado.setDescription((resultadoTurnoMob.logCombateFinal).join('\n'));
                                    }
                                    if (resultadoTurnoMob.recompensasTextoFinal && resultadoTurnoMob.recompensasTextoFinal.length > 0) {
                                        embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoTurnoMob.recompensasTextoFinal.join('\n') });
                                    }
                                    await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                                    return;
                                }
                            }

                            const combatActionRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`combate_ATAQUEBASICO_${idCombate}`).setLabel("⚔️ Ataque Básico").setStyle(ButtonStyle.Danger),
                                    new ButtonBuilder().setCustomId(`combate_USARFEITICO_${idCombate}`).setLabel("🔮 Usar Feitiço").setStyle(ButtonStyle.Primary),
                                    new ButtonBuilder().setCustomId(`combate_USARITEM_${idCombate}`).setLabel("🎒 Usar Item").setStyle(ButtonStyle.Success)
                                );
                            await interaction.editReply({ embeds: [embedCombateAtualizado], components: [combatActionRow] });
                            return;
                        }

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

                    } catch (e) {
                        console.error(`Erro CRÍTICO ao processar botão de feitiço:`, e);
                        if (!interaction.replied && !interaction.deferred) {
                            try {
                                await interaction.reply({ content: "Ocorreu um erro interno ao processar o uso de feitiço.", ephemeral: true });
                            } catch (replyError) {
                                console.error("Erro ao tentar responder sobre erro de botão de feitiço:", replyError);
                            }
                        }
                    }
                } // Fecha else if (acaoCombate === 'USARFEITICO')

                else if (acaoCombate === 'USARITEM') {
                    try {
                        const ITENS_BASE_ARCADIA = Arcadia.ITENS_BASE_ARCADIA;
                        const ficha = await Arcadia.getFichaOuCarregar(senderIdButton);

                        if (!ficha || !ficha.inventario) {
                            await interaction.reply({ content: "Seu inventário não foi encontrado!", ephemeral: true });
                            return;
                        }

                        const itensUsaveis = ficha.inventario.filter(item => {
                            const base = ITENS_BASE_ARCADIA[item.itemNome?.toLowerCase()];
                            return base && base.usavel && item.quantidade > 0;
                        });

                        if (!itensUsaveis || itensUsaveis.length === 0) {
                            await interaction.reply({ content: "Você não tem itens usáveis!", ephemeral: true });
                            return;
                        }

                        if (itensUsaveis.length === 1) {
                            await interaction.deferUpdate();

                            const resultado = await Arcadia.processarAcaoJogadorCombate(
                                idCombate, senderIdButton, "USAR_ITEM", { nomeItem: itensUsaveis[0].itemNome }
                            );

                            const jogadorEstadoAcao = resultado.estadoCombate?.jogador;
                            const mobEstadoAcao = resultado.estadoCombate?.mob;
                            const nomeJogadorAcao = jogadorEstadoAcao?.nome ?? "Jogador";
                            const pvAtualJogadorAcao = jogadorEstadoAcao?.pvAtual ?? "N/A";
                            const pvMaxJogadorAcao = jogadorEstadoAcao?.pvMax ?? "N/A";
                            const pmAtualJogadorAcao = jogadorEstadoAcao?.pmAtual ?? "N/A";
                            const pmMaxJogadorAcao = jogadorEstadoAcao?.pmMax ?? "N/A";
                            const nomeMobAcao = mobEstadoAcao?.nome ?? "Criatura";
                            const pvAtualMobAcao = mobEstadoAcao?.pvAtual ?? "N/A";
                            const pvMaxMobAcao = mobEstadoAcao?.pvMax ?? "N/A";
                            const nivelMobCombat = mobEstadoAcao && typeof mobEstadoAcao.nivel === 'number' && mobEstadoAcao.nivel > 0 ? mobEstadoAcao.nivel : '?';

                            let logCombateAtualizado = resultado.logTurnoAnterior || [];
                            let embedCombateAtualizado = new EmbedBuilder()
                                .setColor(0xF8C300)
                                .setTitle(`🎒 Combate em Andamento (Item)`)
                                .setDescription(logCombateAtualizado.join('\n') || "Item usado.")
                                .addFields(
                                    { name: `👤 ${nomeJogadorAcao}`, value: `❤️ PV: **${pvAtualJogadorAcao}/${pvMaxJogadorAcao}**\n💧 PM: **${pmAtualJogadorAcao}/${pmMaxJogadorAcao}**`, inline: true },
                                    { name: `\u200B`, value: `\u200B`, inline: true },
                                    { name: `👹 ${nomeMobAcao} (Nv. ${nivelMobCombat})`, value: `❤️ PV: **${pvAtualMobAcao}/${pvMaxMobAcao}**`, inline: true }
                                );

                            if (mobEstadoAcao?.imagem && mobEstadoAcao.imagem.trim() && (mobEstadoAcao.imagem.startsWith('http://') || mobEstadoAcao.imagem.startsWith('https://'))) {
                                embedCombateAtualizado.setThumbnail(mobEstadoAcao.imagem.trim());
                            }

                            if (resultado.mobDerrotado) {
                                const resultadoFinal = await Arcadia.finalizarCombate(idCombate, senderIdButton, true, resultado.dadosParaFinalizar?.eUltimoMobDaMissao);
                                embedCombateAtualizado.setTitle("🏆 Vitória! 🏆");
                                embedCombateAtualizado.setDescription((resultadoFinal.logCombateFinal || logCombateAtualizado).join('\n'));
                                if (resultadoFinal.recompensasTextoFinal && resultadoFinal.recompensasTextoFinal.length > 0) {
                                    embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoFinal.recompensasTextoFinal.join('\n') });
                                }
                                await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                                return;
                            }

                            if (resultado.proximoTurno === 'mob') {
                                const resultadoTurnoMob = await Arcadia.processarTurnoMobCombate(idCombate);

                                if (!resultadoTurnoMob || typeof resultadoTurnoMob !== 'object') {
                                    await interaction.editReply({ content: "Erro crítico no turno do oponente.", components: [], embeds: [] });
                                    return;
                                }

                                let logCombateAtualizadoMob = resultadoTurnoMob.logTurnoAnterior || [];
                                if (resultadoTurnoMob.erro) {
                                    logCombateAtualizadoMob.push(`⚠️ Erro no turno do oponente: ${resultadoTurnoMob.erro}`);
                                } else {
                                    logCombateAtualizadoMob.push(...(resultadoTurnoMob.logTurnoAnterior || []));
                                }
                                embedCombateAtualizado.setDescription(logCombateAtualizadoMob.join('\n'));

                                const jogadorEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.jogador || jogadorEstadoAcao;
                                const mobEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.mob || mobEstadoAcao;

                                embedCombateAtualizado.setFields(
                                    { name: `👤 ${jogadorEstadoTurnoMob?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoTurnoMob?.pvAtual ?? "?"}/${jogadorEstadoTurnoMob?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoTurnoMob?.pmAtual ?? "?"}/${jogadorEstadoTurnoMob?.pmMax ?? "?"}**`, inline: true },
                                    { name: `\u200B`, value: `\u200B`, inline: true },
                                    { name: `👹 ${mobEstadoTurnoMob?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoTurnoMob?.nivel === 'number' ? mobEstadoTurnoMob.nivel : '?'})`, value: `❤️ PV: **${mobEstadoTurnoMob?.pvAtual ?? "?"}/${mobEstadoTurnoMob?.pvMax ?? "?"}**`, inline: true }
                                );

                                if (resultadoTurnoMob.combateTerminou) {
                                    embedCombateAtualizado.setTitle(resultadoTurnoMob.vencedorFinal === "mob" ? "☠️ Derrota... ☠️" : "🏆 Vitória Inesperada! 🏆");
                                    if (resultadoTurnoMob.logCombateFinal) {
                                        embedCombateAtualizado.setDescription((resultadoTurnoMob.logCombateFinal).join('\n'));
                                    }
                                    if (resultadoTurnoMob.recompensasTextoFinal && resultadoTurnoMob.recompensasTextoFinal.length > 0) {
                                        embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoTurnoMob.recompensasTextoFinal.join('\n') });
                                    }
                                    await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                                    return;
                                }
                            }

                            const combatActionRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`combate_ATAQUEBASICO_${idCombate}`).setLabel("⚔️ Ataque Básico").setStyle(ButtonStyle.Danger),
                                    new ButtonBuilder().setCustomId(`combate_USARFEITICO_${idCombate}`).setLabel("🔮 Usar Feitiço").setStyle(ButtonStyle.Primary),
                                    new ButtonBuilder().setCustomId(`combate_USARITEM_${idCombate}`).setLabel("🎒 Usar Item").setStyle(ButtonStyle.Success)
                                );
                            await interaction.editReply({ embeds: [embedCombateAtualizado], components: [combatActionRow] });
                            return;
                        }

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

                    } catch (e) {
                        console.error("Erro CRÍTICO ao processar botão de item:", e);
                        try {
                            await interaction.reply({ content: "Ocorreu um erro ao processar uso de item.", ephemeral: true });
                        } catch (replyError) {
                            console.error("Erro ao tentar responder sobre erro de botão de item:", replyError);
                        }
                    }
                } // Fecha else if (acaoCombate === 'USARITEM')

                else {
                    console.warn(`[AVISO COMBATE BOTÃO] Ação de combate "${acaoCombate}" não reconhecida.`);
                    await interaction.editReply({ content: `Ação de combate "${acaoCombate}" não reconhecida.`, embeds: [], components: [] });
                }
            } // FECHA else if (tipoComponente === 'combate')

            else {
                console.warn(`[AVISO BOTÃO] Tipo de componente não reconhecido no botão: ${tipoComponente} (customId: ${interaction.customId})`);
                await interaction.editReply({ content: 'Ação de botão não reconhecida ou não implementada.', embeds: [], components: [] });
            }

        } catch (buttonError) {
            console.error(`Erro CRÍTICO ao processar botão ${interaction.customId} para ${interaction.user.username}:`, buttonError.message);
            if (buttonError.code !== 10062 && !interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ content: "Ocorreu um erro interno ao processar esta ação.", embeds: [], components: [], ephemeral: true });
                } catch (editError) {
                    console.error("Erro ao tentar responder sobre erro de botão:", editError.message);
                }
            }
        }
        return; // Important: ensure we exit after handling button interactions
    }

    // Handler de SELECT MENU
    else if (interaction.isStringSelectMenu()) {
        try {
            if (interaction.customId.startsWith('combate_SELECTFEITICO_')) {
                await interaction.deferUpdate();

                const idCombate = interaction.customId.replace('combate_SELECTFEITICO_', '');
                const idFeiticoSelecionado = interaction.values[0];
                const senderIdSelect = interaction.user.id;

                if (!combatesAtivos[idCombate]) {
                    await interaction.editReply({ content: "Esse combate não está mais ativo!", ephemeral: true, components: [] });
                    return;
                }

                const resultado = await Arcadia.processarAcaoJogadorCombate(
                    idCombate, senderIdSelect, "USAR_FEITICO", { idFeitico: idFeiticoSelecionado }
                );

                if (!resultado || typeof resultado !== 'object') {
                    await interaction.editReply({ content: "Erro crítico ao usar feitiço.", components: [], embeds: [] });
                    return;
                }
                if (resultado.erro) {
                    await interaction.editReply({ content: `Erro ao usar feitiço: ${resultado.erro}`, components: [] });
                    return;
                }

                const jogadorEstadoAcao = resultado.estadoCombate?.jogador;
                const mobEstadoAcao = resultado.estadoCombate?.mob;

                let logCombateAtualizado = resultado.logTurnoAnterior || [];
                let embedCombateAtualizado = new EmbedBuilder()
                    .setColor(0x800080)
                    .setTitle(`🔮 Combate em Andamento (Feitiço)`)
                    .setDescription(logCombateAtualizado.join('\n') || "Feitiço usado.")
                    .addFields(
                        { name: `👤 ${jogadorEstadoAcao?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoAcao?.pvAtual ?? "?"}/${jogadorEstadoAcao?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoAcao?.pmAtual ?? "?"}/${jogadorEstadoAcao?.pmMax ?? "?"}**`, inline: true },
                        { name: `\u200B`, value: `\u200B`, inline: true },
                        { name: `👹 ${mobEstadoAcao?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoAcao?.nivel === "number" ? mobEstadoAcao.nivel : "?"})`, value: `❤️ PV: **${mobEstadoAcao?.pvAtual ?? "?"}/${mobEstadoAcao?.pvMax ?? "?"}**`, inline: true }
                    );

                if (mobEstadoAcao?.imagem && (mobEstadoAcao.imagem.startsWith('http://') || mobEstadoAcao.imagem.startsWith('https://'))) {
                    embedCombateAtualizado.setThumbnail(mobEstadoAcao.imagem.trim());
                }

                if (resultado.mobDerrotado) {
                    const resultadoFinal = await Arcadia.finalizarCombate(idCombate, senderIdSelect, true, resultado.dadosParaFinalizar?.eUltimoMobDaMissao);
                    embedCombateAtualizado.setTitle("🏆 Vitória! 🏆");
                    embedCombateAtualizado.setDescription((resultadoFinal.logCombateFinal || logCombateAtualizado).join('\n'));
                    if (resultadoFinal.recompensasTextoFinal && resultadoFinal.recompensasTextoFinal.length > 0) {
                        embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoFinal.recompensasTextoFinal.join('\n') });
                    }
                    await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                    return;
                }

                if (resultado.proximoTurno === 'mob') {
                    const resultadoTurnoMob = await Arcadia.processarTurnoMobCombate(idCombate);
                    if (!resultadoTurnoMob || typeof resultadoTurnoMob !== 'object') {
                        await interaction.editReply({ content: "Erro crítico no turno do oponente.", components: [], embeds: [] });
                        return;
                    }

                    if (resultadoTurnoMob.erro) {
                        logCombateAtualizado.push(`⚠️ Erro no turno do oponente: ${resultadoTurnoMob.erro}`);
                    } else {
                        logCombateAtualizado.push(...(resultadoTurnoMob.logTurnoAnterior || []));
                    }
                    embedCombateAtualizado.setDescription(logCombateAtualizado.join('\n'));

                    const jogadorEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.jogador || jogadorEstadoAcao;
                    const mobEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.mob || mobEstadoAcao;
                    embedCombateAtualizado.setFields(
                        { name: `👤 ${jogadorEstadoTurnoMob?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoTurnoMob?.pvAtual ?? "?"}/${jogadorEstadoTurnoMob?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoTurnoMob?.pmAtual ?? "?"}/${jogadorEstadoTurnoMob?.pmMax ?? "?"}**`, inline: true },
                        { name: `\u200B`, value: `\u200B`, inline: true },
                        { name: `👹 ${mobEstadoTurnoMob?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoTurnoMob?.nivel === "number" ? mobEstadoTurnoMob.nivel : "?"})`, value: `❤️ PV: **${mobEstadoTurnoMob?.pvAtual ?? "?"}/${mobEstadoTurnoMob?.pvMax ?? "?"}**`, inline: true }
                    );

                    if (resultadoTurnoMob.combateTerminou) {
                        embedCombateAtualizado.setTitle(resultadoTurnoMob.vencedorFinal === "mob" ? "☠️ Derrota... ☠️" : "🏆 Vitória Inesperada! 🏆");
                        if (resultadoTurnoMob.logCombateFinal) {
                            embedCombateAtualizado.setDescription((resultadoTurnoMob.logCombateFinal).join('\n'));
                        }
                        if (resultadoTurnoMob.recompensasTextoFinal && resultadoTurnoMob.recompensasTextoFinal.length > 0) {
                            embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoTurnoMob.recompensasTextoFinal.join('\n') });
                        }
                        await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                        return;
                    }
                }

                const combatActionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`combate_ATAQUEBASICO_${idCombate}`).setLabel("⚔️ Ataque Básico").setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`combate_USARFEITICO_${idCombate}`).setLabel("🔮 Usar Feitiço").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`combate_USARITEM_${idCombate}`).setLabel("🎒 Usar Item").setStyle(ButtonStyle.Success)
                    );
                await interaction.editReply({ embeds: [embedCombateAtualizado], components: [combatActionRow] });

            }
            else if (interaction.customId.startsWith('combate_SELECTITEM_')) {
                await interaction.deferUpdate();

                const customIdParts = interaction.customId.split('_');
                const idCombate = customIdParts.slice(2).join('_');
                const nomeItemSelecionado = interaction.values[0];

                const resultado = await Arcadia.processarAcaoJogadorCombate(
                    idCombate, interaction.user.id, "USAR_ITEM", { nomeItem: nomeItemSelecionado }
                );

                if (!resultado || typeof resultado !== 'object') {
                    await interaction.editReply({ content: "Erro crítico ao usar item.", components: [], embeds: [] });
                    return;
                }
                if (resultado.erro) {
                    await interaction.editReply({ content: `Erro ao usar item: ${resultado.erro}`, components: [] });
                    return;
                }

                const jogadorEstadoAcao = resultado.estadoCombate?.jogador;
                const mobEstadoAcao = resultado.estadoCombate?.mob;

                let logCombateAtualizado = resultado.logTurnoAnterior || [];
                let embedCombateAtualizado = new EmbedBuilder()
                    .setColor(0xF8C300)
                    .setTitle(`🎒 Combate em Andamento (Item)`)
                    .setDescription(logCombateAtualizado.join('\n') || "Item usado.")
                    .addFields(
                        { name: `👤 ${jogadorEstadoAcao?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoAcao?.pvAtual ?? "?"}/${jogadorEstadoAcao?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoAcao?.pmAtual ?? "?"}/${jogadorEstadoAcao?.pmMax ?? "?"}**`, inline: true },
                        { name: `\u200B`, value: `\u200B`, inline: true },
                        { name: `👹 ${mobEstadoAcao?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoAcao?.nivel === "number" ? mobEstadoAcao.nivel : "?"})`, value: `❤️ PV: **${mobEstadoAcao?.pvAtual ?? "?"}/${mobEstadoAcao?.pvMax ?? "?"}**`, inline: true }
                    );

                if (mobEstadoAcao?.imagem && (mobEstadoAcao.imagem.startsWith('http://') || mobEstadoAcao.imagem.startsWith('https://'))) {
                    embedCombateAtualizado.setThumbnail(mobEstadoAcao.imagem.trim());
                }

                if (resultado.mobDerrotado) {
                    const resultadoFinal = await Arcadia.finalizarCombate(idCombate, interaction.user.id, true, resultado.dadosParaFinalizar?.eUltimoMobDaMissao);
                    embedCombateAtualizado.setTitle("🏆 Vitória! 🏆");
                    embedCombateAtualizado.setDescription((resultadoFinal.logCombateFinal || logCombateAtualizado).join('\n'));
                    if (resultadoFinal.recompensasTextoFinal && resultadoFinal.recompensasTextoFinal.length > 0) {
                        embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoFinal.recompensasTextoFinal.join('\n') });
                    }
                    await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                    return;
                }

                if (resultado.proximoTurno === 'mob') {
                    const resultadoTurnoMob = await Arcadia.processarTurnoMobCombate(idCombate);
                    if (!resultadoTurnoMob || typeof resultadoTurnoMob !== 'object') {
                        await interaction.editReply({ content: "Erro crítico no turno do oponente.", components: [], embeds: [] });
                        return;
                    }

                    if (resultadoTurnoMob.erro) {
                        logCombateAtualizado.push(`⚠️ Erro no turno do oponente: ${resultadoTurnoMob.erro}`);
                    } else {
                        logCombateAtualizado.push(...(resultadoTurnoMob.logTurnoAnterior || []));
                    }
                    embedCombateAtualizado.setDescription(logCombateAtualizado.join('\n'));

                    const jogadorEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.jogador || jogadorEstadoAcao;
                    const mobEstadoTurnoMob = resultadoTurnoMob.estadoCombate?.mob || mobEstadoAcao;
                    embedCombateAtualizado.setFields(
                        { name: `👤 ${jogadorEstadoTurnoMob?.nome ?? "Jogador"}`, value: `❤️ PV: **${jogadorEstadoTurnoMob?.pvAtual ?? "?"}/${jogadorEstadoTurnoMob?.pvMax ?? "?"}**\n💧 PM: **${jogadorEstadoTurnoMob?.pmAtual ?? "?"}/${jogadorEstadoTurnoMob?.pmMax ?? "?"}**`, inline: true },
                        { name: `\u200B`, value: `\u200B`, inline: true },
                        { name: `👹 ${mobEstadoTurnoMob?.nome ?? "Criatura"} (Nv. ${typeof mobEstadoTurnoMob?.nivel === "number" ? mobEstadoTurnoMob.nivel : "?"})`, value: `❤️ PV: **${mobEstadoTurnoMob?.pvAtual ?? "?"}/${mobEstadoTurnoMob?.pvMax ?? "?"}**`, inline: true }
                    );

                    if (resultadoTurnoMob.combateTerminou) {
                        embedCombateAtualizado.setTitle(resultadoTurnoMob.vencedorFinal === "mob" ? "☠️ Derrota... ☠️" : "🏆 Vitória Inesperada! 🏆");
                        if (resultadoTurnoMob.logCombateFinal) {
                            embedCombateAtualizado.setDescription((resultadoTurnoMob.logCombateFinal).join('\n'));
                        }
                        if (resultadoTurnoMob.recompensasTextoFinal && resultadoTurnoMob.recompensasTextoFinal.length > 0) {
                            embedCombateAtualizado.addFields({ name: "🎁 Recompensas", value: resultadoTurnoMob.recompensasTextoFinal.join('\n') });
                        }
                        await interaction.editReply({ embeds: [embedCombateAtualizado], components: [] });
                        return;
                    }
                }

                const combatActionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`combate_ATAQUEBASICO_${idCombate}`).setLabel("⚔️ Ataque Básico").setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`combate_USARFEITICO_${idCombate}`).setLabel("🔮 Usar Feitiço").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`combate_USARITEM_${idCombate}`).setLabel("🎒 Usar Item").setStyle(ButtonStyle.Success)
                    );
                await interaction.editReply({ embeds: [embedCombateAtualizado], components: [combatActionRow] });
            }
            else {
                console.log('[DEBUG] Select menu não reconhecido:', interaction.customId);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "Seleção não reconhecida.", ephemeral: true });
                }
            }
        } catch (e) {
            console.error("Erro CRÍTICO ao processar select menu:", e);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ content: "Ocorreu um erro interno.", ephemeral: true });
                } catch (replyError) {
                    console.error("Erro ao tentar responder sobre erro de select menu:", replyError);
                }
            }
        }
    } // FECHA else if (interaction.isStringSelectMenu())
}); // FIM DO client.on('interactionCreate')


// --- Login do Bot ---
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("ERRO CRÍTICO: Token do Discord (DISCORD_TOKEN) não encontrado nas variáveis de ambiente!");
    process.exit(1);
} else {
    client.login(token).catch(err => {
        console.error("ERRO AO FAZER LOGIN NO DISCORD:", err.message);
        if (err.code === 'DisallowedIntents') {
            console.error("--> DICA: Verifique se todas as 'Privileged Gateway Intents' (ESPECIALMENTE Server Members Intent e Message Content Intent) estão ATIVADAS no Portal de Desenvolvedores do Discord para o seu bot!");
        }
    });
}
