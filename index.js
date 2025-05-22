// index.js

const { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
const COMANDOS_GERAIS_PERMITIDOS_EM_OUTROS_CANAIS = ['comandos', 'ficha', 'distribuirpontos', 'jackpot', 'usaritem', 'usarfeitico', 'aprenderfeitico', 'ping', 'historia', 'interagir']; // Adicionei 'interagir' aqui
const COMANDOS_CANAL_RECRUTAMENTO = ['criar', 'ficha', 'comandos', 'ping', 'listaracas', 'listaclasses', 'listareinos'];
const COMANDOS_CANAL_ATUALIZACAO_FICHAS = ['ficha', 'distribuirpontos', 'comandos', 'ping'];

// --- Configuração do Express para Keep-Alive ---
// ... (seu código Express) ...
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

// --- Evento: Interação (Slash Commands, Autocomplete, Buttons) ---
client.on('interactionCreate', async interaction => {
    // --- BLOCO DE AUTOCOMPLETE ---
    if (interaction.isAutocomplete()) {
        const commandName = interaction.commandName;
        const focusedOption = interaction.options.getFocused(true);
        let choices = [];
        const jogadorId = interaction.user.id;

        try {
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
                // Adicionar autocomplete para NPCs
                const todosNPCs = await Arcadia.getTodosNPCsParaAutocomplete(); // Você precisará criar esta função em arcadia_sistema.js
                if (todosNPCs) {
                    choices = todosNPCs
                        .filter(npc => npc.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                        .map(npc => ({ name: npc.name, value: npc.value })); // value deve ser o nome exato do NPC
                }
            }
            await interaction.respond(choices.slice(0, 25) || []);
        } catch (error) {
            console.error(`[AUTOCOMPLETE] Erro ao processar autocomplete para /${commandName}, opção ${focusedOption.name}:`, error);
            try { await interaction.respond([]); } catch (respondError) { /* ignore */ }
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
                        const resultadoCriacao = await Arcadia.processarCriarFichaSlash(senderId, senderUsername, nomePersonagem, racaNomeInput, classeNomeInput, reinoNomeInput);

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
                                    if (resultadoCriacao.addFields) { // Adiciona os campos ao embed original
                                        if (cargosRemovidosMsgs.length > 0) resultadoCriacao.addFields({ name: '🚪 Cargo Removido', value: cargosRemovidosMsgs.join(', '), inline: false });
                                        if (cargosAdicionadosMsgs.length > 0) resultadoCriacao.addFields({ name: '✅ Cargos Adicionados', value: cargosAdicionadosMsgs.join(', '), inline: false });
                                        if (cargosNaoEncontradosMsgs.length > 0) resultadoCriacao.addFields({ name: '⚠️ Cargos Não Atribuídos/Erro', value: cargosNaoEncontradosMsgs.join(', '), inline: false });
                                    }
                                }
                            } else {
                                console.warn(`[CARGOS PÓS-CRIAÇÃO] Objeto 'member' não disponível para ${senderUsername}.`);
                            }
                        }
                        // 'resultadoCriacao' já é um EmbedBuilder, então será tratado pela lógica de envio genérica
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
                        if (!respostaParaEnviar) { // Só processa se não houve erro de permissão
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
                            // usarFeitico retorna { embeds: [embed] } ou { erro: "..." }
                            // A lógica de envio genérica tratará { embeds: [embed] } corretamente
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

                    case 'interagir': {
                        await interaction.deferReply({ ephemeral: false }); 
                        const nomeNPCInput = options.getString('npc');
                        const fichaJogador = await Arcadia.getFichaOuCarregar(senderId);

                        if (!fichaJogador || fichaJogador.nomePersonagem === "N/A") {
                            await interaction.editReply({ embeds: [Arcadia.gerarEmbedErro("Ficha não encontrada", "Você precisa criar uma ficha primeiro com `/criar`.")] });
                            break; 
                        }

                        const resultadoInteracao = await Arcadia.processarInteracaoComNPC(nomeNPCInput, fichaJogador); // Passa ficha para lógica de condições

                        if (resultadoInteracao.erro) {
                            await interaction.editReply({ embeds: [Arcadia.gerarEmbedAviso("Interação Falhou", resultadoInteracao.erro)] });
                        } else {
                            const embedNPC = new EmbedBuilder()
                                .setColor(0x7289DA) 
                                .setTitle(`🗣️ ${resultadoInteracao.tituloNPC || resultadoInteracao.nomeNPC}`)
                                .setAuthor({ name: resultadoInteracao.nomeNPC });

                            if (resultadoInteracao.descricaoVisualNPC) {
                                embedNPC.setDescription(resultadoInteracao.descricaoVisualNPC);
                            }

                            embedNPC.addFields({ name: "Diálogo:", value: resultadoInteracao.dialogoAtual.texto || "*Este personagem não diz nada no momento.*" });

                            const actionRow = new ActionRowBuilder();
                            let temOpcoesParaBotoes = false;


if (resultadoInteracao.dialogoAtual.respostasJogador && resultadoInteracao.dialogoAtual.respostasJogador.length > 0) {
    resultadoInteracao.dialogoAtual.respostasJogador.slice(0, 4).forEach(opcao => {
        actionRow.addComponents(
            new ButtonBuilder()
                // ADICIONE "CONTINUAR" AQUI E USE MAIÚSCULAS PARA A AÇÃO
                .setCustomId(`dialogo_CONTINUAR_${resultadoInteracao.npcId}_${opcao.levaParaDialogoId || 'sem_acao'}_${resultadoInteracao.dialogoAtual.idDialogo}`)
                .setLabel(opcao.textoResposta.substring(0, 80))
                .setStyle(ButtonStyle.Primary)
        );
        temOpcoesParaBotoes = true;
    });
}

if (resultadoInteracao.dialogoAtual.ofereceMissao) {
    const missaoLog = fichaJogador.logMissoes ? fichaJogador.logMissoes.find(m => m.idMissao === resultadoInteracao.dialogoAtual.ofereceMissao) : null;
    if ((!missaoLog || (missaoLog.status !== 'aceita' && missaoLog.status !== 'concluida')) && actionRow.components.length < 5) {
        actionRow.addComponents(
            new ButtonBuilder()
                // USE "ACEITAR" EM MAIÚSCULAS
                .setCustomId(`missao_ACEITAR_${resultadoInteracao.npcId}_${resultadoInteracao.dialogoAtual.ofereceMissao}`)
                .setLabel("Aceitar Missão")
                .setStyle(ButtonStyle.Success)
        );
        temOpcoesParaBotoes = true;
    }
}

if (actionRow.components.length < 5 && (!temOpcoesParaBotoes || resultadoInteracao.dialogoAtual.encerraDialogo)) {
     actionRow.addComponents(
        new ButtonBuilder()
            // USE "ENCERRAR" EM MAIÚSCULAS
            .setCustomId(`dialogo_ENCERRAR_${resultadoInteracao.npcId}_${resultadoInteracao.dialogoAtual.idDialogo}`)
            .setLabel(temOpcoesParaBotoes && resultadoInteracao.dialogoAtual.encerraDialogo ? "Finalizar" : "Encerrar Conversa")
            .setStyle(ButtonStyle.Secondary)
    );
}
                            
                            if (actionRow.components.length > 0) {
                                await interaction.editReply({ embeds: [embedNPC], components: [actionRow] });
                            } else {
                                await interaction.editReply({ embeds: [embedNPC] });
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
                } // Fim do switch
            } // Fim do else (do if comandosAdmin)

// --- LÓGICA DE ENVIO DA RESPOSTA (para comandos que definem 'respostaParaEnviar') ---
            if (respostaParaEnviar) {
                // ... (sua lógica de envio de payload que já estava correta) ...
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
                if (deveSerEfêmera) { payload.ephemeral = true; }

                if (Object.keys(payload).length === 0 || (!payload.content && (!payload.embeds || payload.embeds.length === 0))) {
                    if (!interaction.replied && !interaction.deferred && commandName !== 'interagir' && commandName !== 'criar' && commandName !== 'ficha' /* adicione outros que respondem direto */) {
                        console.error("[ENVIO ERRO] Payload resultou em mensagem vazia e interação não respondida:", JSON.stringify(payload, null, 2));
                        await interaction.reply({ content: "Ocorreu um problema ao gerar a resposta (payload vazio/inválido).", ephemeral: true });
                    } else {
                         console.warn(`[ENVIO] Payload vazio ou incompleto para /${commandName}, mas interação já respondida/adiada ou é um comando que responde por si só.`);
                    }
                } else {
                     if (interaction.replied || interaction.deferred) { 
                        // Se o comando /interagir ou outro já deu deferReply/editReply,
                        // e mesmo assim chegamos aqui com um `respostaParaEnviar` (o que não deveria acontecer para /interagir),
                        // usamos followUp para não dar erro. Mas o ideal é que `respostaParaEnviar` seja null para esses casos.
                        if (commandName === 'interagir' || commandName === 'criar' || commandName === 'ficha') {
                             console.warn(`[AVISO LÓGICA] 'respostaParaEnviar' foi definida para /${commandName} que já deveria ter respondido. Usando followUp.`);
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
            let errorEmbedParaUsuario = Arcadia.gerarEmbedErro("😥 Erro Crítico", "Desculpe, ocorreu um erro crítico ao processar seu comando. O Mestre foi notificado e investigará o problema.");
            const errorReplyPayload = { embeds: [errorEmbedParaUsuario], ephemeral: true };
            try { 
                if (interaction.replied || interaction.deferred) { 
                    await interaction.editReply(errorReplyPayload); 
                } else { 
                    await interaction.reply(errorReplyPayload); 
                }
            } catch (finalError) { 
                console.error("Erro catastrófico ao tentar responder sobre um erro anterior:", finalError);
            } 
        } // FIM DO BLOCO 'catch'

    } // FIM DO "if (interaction.isChatInputCommand())"

// --- TRATAMENTO DE INTERAÇÕES DE BOTÃO ---

else if (interaction.isButton()) {
        await interaction.deferUpdate(); // Acknowledge a interação rapidamente
        const customIdParts = interaction.customId.split('_');
        const tipoComponente = customIdParts[0];
        const senderIdButton = interaction.user.id;
        const fichaJogador = await Arcadia.getFichaOuCarregar(senderIdButton);

        if (!fichaJogador) {
            await interaction.editReply({ content: "Sua ficha não foi encontrada para continuar a interação.", embeds: [], components: [] });
            return;
        }

        try { 

            if (tipoComponente === 'dialogo') {
                // Normaliza a ação para maiúsculas para consistência na comparação
                const acaoDialogo = customIdParts[1] ? customIdParts[1].toUpperCase() : null; 
                const idNpc = customIdParts[2];
                const idParametro3 = customIdParts[3]; // Para CONTINUAR, é levaParaDialogoId. Para ENCERRAR, é idDialogoAtual.
                const idDialogoOriginal = customIdParts[4]; // Para CONTINUAR, é o idDialogoAtual de onde o botão foi clicado.

                // Se a ação é ENCERRAR, ou se um botão de continuar leva para 'sem_acao'
                if (acaoDialogo === 'ENCERRAR' || (acaoDialogo === 'CONTINUAR' && idParametro3 === 'sem_acao')) {
                    await interaction.editReply({ content: "Conversa encerrada.", embeds: [], components: [] });
                    return;
                } else if (acaoDialogo === 'CONTINUAR') {
                    const idProximoDialogo = idParametro3; // Este é o levaParaDialogoId
                    const resultadoInteracao = await Arcadia.processarInteracaoComNPC(idNpc, fichaJogador, idProximoDialogo);

                    if (resultadoInteracao.erro) {
                        await interaction.editReply({ embeds: [Arcadia.gerarEmbedAviso("Interação Falhou", resultadoInteracao.erro)], components: [] });
                    } else {
                        const embedNPC = new EmbedBuilder()
                            .setColor(0x7289DA)
                            .setTitle(`🗣️ ${resultadoInteracao.tituloNPC || resultadoInteracao.nomeNPC}`)
                            .setAuthor({ name: resultadoInteracao.nomeNPC });
                        if (resultadoInteracao.descricaoVisualNPC) embedNPC.setDescription(resultadoInteracao.descricaoVisualNPC);
                        embedNPC.addFields({ name: "Diálogo:", value: resultadoInteracao.dialogoAtual.texto || "*...*" });

                        const novaActionRow = new ActionRowBuilder();
                        let novasOpcoes = false;

                        // Gera botões para as próximas opções de diálogo
                        if (resultadoInteracao.dialogoAtual.respostasJogador && resultadoInteracao.dialogoAtual.respostasJogador.length > 0) {
                            resultadoInteracao.dialogoAtual.respostasJogador.slice(0, 4).forEach(opcao => {
                                novaActionRow.addComponents(
                                    new ButtonBuilder()
                                        // Geração do customId para o PRÓXIMO botão de continuar
                                        .setCustomId(`dialogo_CONTINUAR_${idNpc}_${opcao.levaParaDialogoId || 'sem_acao'}_${resultadoInteracao.dialogoAtual.idDialogo}`)
                                        .setLabel(opcao.textoResposta.substring(0, 80))
                                        .setStyle(ButtonStyle.Primary)
                                );
                                novasOpcoes = true;
                            });
                        }

                        // Gera botão para aceitar missão, se oferecida
                        if (resultadoInteracao.dialogoAtual.ofereceMissao) {
                            const missaoLog = fichaJogador.logMissoes ? fichaJogador.logMissoes.find(m => m.idMissao === resultadoInteracao.dialogoAtual.ofereceMissao) : null;
                            if ((!missaoLog || (missaoLog.status !== 'aceita' && missaoLog.status !== 'concluida')) && novaActionRow.components.length < 5 ) {
                                 novaActionRow.addComponents(
                                    new ButtonBuilder()
                                        // Geração do customId para ACEITAR missão
                                        .setCustomId(`missao_ACEITAR_${idNpc}_${resultadoInteracao.dialogoAtual.ofereceMissao}`)
                                        .setLabel("Aceitar Missão") // Idealmente, buscar o nome da missão para o label
                                        .setStyle(ButtonStyle.Success)
                                );
                                novasOpcoes = true;
                            }
                        }

                        // Botão de Encerrar: adicionado se não houver outras opções ou se o diálogo for para encerrar
                        if (novaActionRow.components.length < 5 && (!novasOpcoes || resultadoInteracao.dialogoAtual.encerraDialogo)) {
                             novaActionRow.addComponents(
                                new ButtonBuilder()
                                    // Geração do customId para ENCERRAR este novo diálogo
                                    .setCustomId(`dialogo_ENCERRAR_${idNpc}_${resultadoInteracao.dialogoAtual.idDialogo}`)
                                    .setLabel(novasOpcoes && resultadoInteracao.dialogoAtual.encerraDialogo ? "Finalizar" : "Encerrar Conversa")
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        }
                        await interaction.editReply({ embeds: [embedNPC], components: novaActionRow.components.length > 0 ? [novaActionRow] : [] });
                    }
                } else {
                     // Se acaoDialogo não for nem 'ENCERRAR' nem 'CONTINUAR'
                     await interaction.editReply({ content: `Ação de diálogo "${customIdParts[1]}" não reconhecida. Verifique o formato do customId.`, embeds:[], components: [] });
                }
            } else if (tipoComponente === 'missao') {
                const acaoMissao = customIdParts[1]; // Deveria ser ACEITAR
                const idNpcMissao = customIdParts[2]; 
                const idMissaoParaAceitar = customIdParts[3];

                if (acaoMissao === 'ACEITAR') {
                    const resultadoAceite = await Arcadia.aceitarMissao(senderIdButton, idMissaoParaAceitar, idNpcMissao);

                    if (resultadoAceite.sucesso) {
                        const embedConfirmacao = Arcadia.gerarEmbedSucesso("Missão Aceita!", resultadoAceite.sucesso);
                        // Tenta obter um diálogo de feedback do NPC pós-aceite
                        const novoDialogoPosAceite = await Arcadia.processarInteracaoComNPC(idNpcMissao, fichaJogador, resultadoAceite.dialogoFeedbackId);
                        
                        let componentesResposta = [];
                        if (novoDialogoPosAceite && !novoDialogoPosAceite.erro && novoDialogoPosAceite.dialogoAtual) {
                            embedConfirmacao.addFields({name: `${novoDialogoPosAceite.nomeNPC} diz:`, value: novoDialogoPosAceite.dialogoAtual.texto});
                            
                            // Adiciona botões para o novo diálogo, se houver
                            const proximaActionRow = new ActionRowBuilder();
                            let temProximasOpcoes = false;
                            if (novoDialogoPosAceite.dialogoAtual.respostasJogador && novoDialogoPosAceite.dialogoAtual.respostasJogador.length > 0) {
                                novoDialogoPosAceite.dialogoAtual.respostasJogador.slice(0,4).forEach(opcao => {
                                    proximaActionRow.addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`dialogo_CONTINUAR_${idNpcMissao}_${opcao.levaParaDialogoId || 'sem_acao'}_${novoDialogoPosAceite.dialogoAtual.idDialogo}`)
                                            .setLabel(opcao.textoResposta.substring(0,80))
                                            .setStyle(ButtonStyle.Primary)
                                    );
                                    temProximasOpcoes = true;
                                });
                            }
                             if (proximaActionRow.components.length < 5 && (!temProximasOpcoes || novoDialogoPosAceite.dialogoAtual.encerraDialogo)) {
                                proximaActionRow.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`dialogo_ENCERRAR_${idNpcMissao}_${novoDialogoPosAceite.dialogoAtual.idDialogo}`)
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
            }
            // Adicione o tipoComponente 'conversa' para tratar o customId 'conversa_ENCERRAR_${npcId}_${idDialogoAtual}'
            else if (tipoComponente === 'conversa') {
                const acaoConversa = customIdParts[1]; // Deveria ser ENCERRAR
                // const idNpcConversa = customIdParts[2];
                // const idDialogoAtualConversa = customIdParts[3];

                if (acaoConversa === 'ENCERRAR') {
                    await interaction.editReply({ content: "Conversa encerrada.", embeds: [], components: [] });
                    return;
                } else {
                    await interaction.editReply({ content: `Ação de conversa "${acaoConversa}" não reconhecida.`, embeds:[], components: [] });
                }
            }
             else {
                console.warn(`[AVISO BOTÃO] Tipo de componente não reconhecido no botão: ${tipoComponente} (customId: ${interaction.customId})`);
                await interaction.editReply({ content: 'Ação de botão não reconhecida ou não implementada.', embeds:[], components: [] });
            }
        } catch(buttonError) {
            console.error(`Erro CRÍTICO ao processar botão ${interaction.customId} para ${interaction.user.username}:`, buttonError);
            // Tenta editar a resposta com um erro, mas pode falhar se a interação já estiver muito antiga
            try {
                await interaction.editReply({ content: "Ocorreu um erro interno ao processar esta ação.", embeds: [], components: [] });
            } catch (editError) {
                console.error("Erro ao tentar editar a resposta do botão com mensagem de erro:", editError);
            }
        }
        return;
    }
    
    // Outros 'else if' para Modals, Select Menus, etc. podem vir aqui.

}); // FIM DO client.on('interactionCreate'...)
    
    
// --- Login do Bot ---
const token = process.env.DISCORD_TOKEN; // Pega o token da variável de ambiente

if (!token) {
    // Se o token não for encontrado, exibe um erro crítico no console e encerra o processo
    console.error("ERRO CRÍTICO: Token do Discord (DISCORD_TOKEN) não encontrado nas variáveis de ambiente!");
    process.exit(1); // Encerra o processo com código de erro
} else {
    // Se o token for encontrado, tenta fazer login no Discord
    client.login(token).catch(err => {
        // Se ocorrer um erro durante o login, exibe a mensagem de erro
        console.error("ERRO AO FAZER LOGIN NO DISCORD:", err.message);
        // Se o erro for específico de 'Intents não permitidas', dá uma dica ao usuário
        if (err.code === 'DisallowedIntents') {
            console.error("--> DICA: Verifique se todas as 'Privileged Gateway Intents' (ESPECIALMENTE Server Members Intent e Message Content Intent) estão ATIVADAS no Portal de Desenvolvedores do Discord para o seu bot!");
        }
    });
}
