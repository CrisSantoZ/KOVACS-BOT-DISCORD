
const { EmbedBuilder } = require('discord.js');

// Funções auxiliares que serão passadas como parâmetros
let npcsCollection;
let missoesCollection;
let MAPA_NOMES_ORIGEM_FEITICO_DISPLAY;
let adicionarItemAoInventario;
let atualizarFichaNoCacheEDb;

function inicializarNpcsMissoesSistema(collections, mapas, funcoes) {
    npcsCollection = collections.npcsCollection;
    missoesCollection = collections.missoesCollection;
    MAPA_NOMES_ORIGEM_FEITICO_DISPLAY = mapas.MAPA_NOMES_ORIGEM_FEITICO_DISPLAY;
    adicionarItemAoInventario = funcoes.adicionarItemAoInventario;
    atualizarFichaNoCacheEDb = funcoes.atualizarFichaNoCacheEDb;
}

async function processarInteracaoComNPC(nomeOuIdNPC, fichaJogador, idDialogoEspecifico = null) {
    if (!npcsCollection || !missoesCollection) {
        console.error("Uma ou mais coleções não inicializadas em processarInteracaoComNPC!");
        return { erro: "Erro interno: As coleções do banco de dados não estão prontas." };
    }

    try {
        console.log(`[DEBUG] Início processarInteracaoComNPC. Input Original nomeOuIdNPC: "${nomeOuIdNPC}", idDialogoEspecifico: ${idDialogoEspecifico}`);

        let query = {};
        const inputOriginal = String(nomeOuIdNPC).trim();

        if (idDialogoEspecifico) {
            query = { _id: inputOriginal };
            console.log(`[DEBUG] Buscando NPC por _ID (para diálogo específico): "${inputOriginal}"`);
        } else {
            const escapedName = inputOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (escapedName && escapedName.length > 0) {
                query = { nome: new RegExp(`^${escapedName}$`, 'i') };
                console.log(`[DEBUG] Buscando NPC por NOME (interação inicial): "${escapedName}"`);
            } else {
                console.error(`[DEBUG] ERRO: Nome do NPC para busca inicial está vazio ou inválido! Input original era: "${nomeOuIdNPC}"`);
                return { erro: `Nome do NPC fornecido é inválido ou vazio.` };
            }
        }

        console.log(`[processarInteracaoComNPC] Query MongoDB final: ${JSON.stringify(query)}`);
        const npcData = await npcsCollection.findOne(query);

        if (!npcData) {
            console.warn(`[processarInteracaoComNPC] NPC não encontrado com a query: ${JSON.stringify(query)} para input original: "${inputOriginal}"`);
            return { erro: `NPC "${inputOriginal}" não encontrado em Arcádia.` };
        }

        let dialogoParaMostrar = null;
        let todosObjetivosRealmenteCompletosParaFinalizar = false;
        let recompensasConcedidasLinhas = [];

        if (idDialogoEspecifico) {
            const dialogoAlvo = npcData.dialogos.find(d => d.idDialogo === idDialogoEspecifico);

            if (dialogoAlvo) {
                const condicoesOk = await verificarCondicoesDialogo(dialogoAlvo.condicoesParaMostrar, fichaJogador, npcData, dialogoAlvo.ofereceMissao);

                if (!condicoesOk) {
                    console.log(`[PROCESSAR NPC] Condições não cumpridas para diálogo específico "${idDialogoEspecifico}" do NPC "${npcData.nome}". Retornando mensagem de feedback.`);
                    return { 
                        erro: `${npcData.nome} parece pensar um pouco e responde: "Sinto que ainda não é o momento certo para seguirmos por esse caminho, ${fichaJogador.nomePersonagem}."`
                    };
                } else {
                    dialogoParaMostrar = dialogoAlvo;
                }
            } else {
                console.warn(`[PROCESSAR NPC] Diálogo específico "${idDialogoEspecifico}" NÃO encontrado para NPC "${npcData.nome}". Tentando saudação padrão.`);
                dialogoParaMostrar = npcData.dialogos.find(d => d.tipo === "saudacao_padrao") || npcData.dialogos[0];
            }
        } else {
            console.log(`[PROCESSAR NPC] Interação inicial com "${npcData.nome}". Buscando diálogo priorizado...`);
            const dialogosPriorizados = npcData.dialogos.sort((a, b) => {
                const prioridade = { "fim_missao": 1, "durante_missao": 2, "inicio_missao": 3, "saudacao_condicional": 4, "entrega_missao": 2, "saudacao_padrao": 5 };
                return (prioridade[a.tipo] || 99) - (prioridade[b.tipo] || 99);
            });

            for (const diag of dialogosPriorizados) {
                if (await verificarCondicoesDialogo(diag.condicoesParaMostrar, fichaJogador, npcData, diag.ofereceMissao)) {
                    dialogoParaMostrar = diag;
                    console.log(`[PROCESSAR NPC] Diálogo priorizado encontrado: "${dialogoParaMostrar.idDialogo}" do tipo "${dialogoParaMostrar.tipo}"`);
                    break;
                }
            }
            if (!dialogoParaMostrar) {
                console.log(`[PROCESSAR NPC] Nenhum diálogo priorizado aplicável. Buscando saudação padrão para "${npcData.nome}".`);
                dialogoParaMostrar = npcData.dialogos.find(d => d.tipo === "saudacao_padrao") || npcData.dialogos[0];
            }
        }

        if (!dialogoParaMostrar || !dialogoParaMostrar.texto) {
            console.error(`[PROCESSAR NPC] ERRO FINAL: Nenhum dialogoParaMostrar válido encontrado para NPC "${npcData.nome}" (idDialogoEspecifico: ${idDialogoEspecifico}). Objeto dialogoParaMostrar:`, dialogoParaMostrar);
            return { erro: `NPC "${npcData.nome}" não possui um diálogo válido para esta situação.` };
        }

        // Lógica de finalização de missão
        if (dialogoParaMostrar.encerraMissao) {
            const idMissaoEncerrada = dialogoParaMostrar.encerraMissao;
            const missaoLogIndex = fichaJogador.logMissoes.findIndex(m => m.idMissao === idMissaoEncerrada && m.status === "aceita");

            if (missaoLogIndex !== -1) {
                const definicaoMissaoDB = await missoesCollection.findOne({ _id: idMissaoEncerrada });
                todosObjetivosRealmenteCompletosParaFinalizar = true;

                if (definicaoMissaoDB && definicaoMissaoDB.objetivos) {
                    for (const objDef of definicaoMissaoDB.objetivos) {
                        const objLog = fichaJogador.logMissoes[missaoLogIndex].objetivos.find(ol => ol.idObjetivo === objDef.idObjetivo);

                        let objetivoConsideradoValidoParaFim = false;
                        if (objLog && objLog.concluido) {
                            objetivoConsideradoValidoParaFim = true;
                        } else if (objDef.tipo === "ENTREGA") {
                            const condicaoItemPresenteNoDialogo = dialogoParaMostrar.condicoesParaMostrar?.some(c => 
                                c.tipo === "jogadorPossuiItemQuest" && 
                                objDef.itemNomeQuest && 
                                c.itemNomeQuest.toLowerCase() === objDef.itemNomeQuest.toLowerCase()
                            );
                            const jogadorPossuiItemDeFato = fichaJogador.inventario.some(i => 
                                objDef.itemNomeQuest && 
                                i.itemNome.toLowerCase() === objDef.itemNomeQuest.toLowerCase() &&
                                i.quantidade >= (objDef.quantidadeNecessaria || 1)
                            );

                            if (condicaoItemPresenteNoDialogo && jogadorPossuiItemDeFato) {
                                objetivoConsideradoValidoParaFim = true;
                                if (objLog) objLog.concluido = true;
                            }
                        } else if (objDef.tipo === "COMBATE_OPCIONAL") {
                            objetivoConsideradoValidoParaFim = true;
                        }

                        if (!objetivoConsideradoValidoParaFim && objDef.tipo !== "COMBATE_OPCIONAL") {
                            todosObjetivosRealmenteCompletosParaFinalizar = false;
                            console.warn(`[Fim Missão] Tentativa de encerrar ${idMissaoEncerrada} mas objetivo ${objDef.idObjetivo} (${objDef.descricao}) não está concluído ou item de entrega ausente.`);
                            break; 
                        }
                    }
                }

                if (todosObjetivosRealmenteCompletosParaFinalizar) {
                    fichaJogador.logMissoes[missaoLogIndex].status = "concluida";
                    fichaJogador.logMissoes[missaoLogIndex].dataConclusao = new Date().toISOString();

                    if (definicaoMissaoDB && definicaoMissaoDB.recompensas) {
                        const rec = definicaoMissaoDB.recompensas;
                        if (rec.xp) {
                            fichaJogador.xpAtual = (fichaJogador.xpAtual || 0) + rec.xp;
                            recompensasConcedidasLinhas.push(`${rec.xp} XP`);
                        }
                        if (rec.florinsDeOuro) {
                            fichaJogador.florinsDeOuro = (fichaJogador.florinsDeOuro || 0) + rec.florinsDeOuro;
                            recompensasConcedidasLinhas.push(`${rec.florinsDeOuro} Florins de Ouro`);
                        }
                        if (rec.itens && rec.itens.length > 0) {
                            for (const itemRec of rec.itens) {
                                if (Math.random() < (itemRec.chance || 1.0)) {
                                    await adicionarItemAoInventario(fichaJogador, itemRec.itemId, itemRec.quantidade);
                                    const nomeItemRec = itemRec.itemNomeOverride || itemRec.itemId;
                                    recompensasConcedidasLinhas.push(`${nomeItemRec} (x${itemRec.quantidade})`);
                                }
                            }
                        }
                    }

                    if (definicaoMissaoDB && definicaoMissaoDB.objetivos) {
                        for (const objDef of definicaoMissaoDB.objetivos) {
                            if (objDef.removerItemAoEntregar && objDef.itemNomeQuest) {
                                const itemParaRemoverIndex = fichaJogador.inventario.findIndex(i => i.itemNome.toLowerCase() === objDef.itemNomeQuest.toLowerCase());
                                if (itemParaRemoverIndex > -1) {
                                    const itemNoInventario = fichaJogador.inventario[itemParaRemoverIndex];
                                    const qtdRemover = objDef.quantidadeNecessaria || itemNoInventario.quantidade;

                                    itemNoInventario.quantidade -= qtdRemover;
                                    if (itemNoInventario.quantidade <= 0) {
                                        fichaJogador.inventario.splice(itemParaRemoverIndex, 1);
                                    }
                                }
                            }
                        }
                    }
                    await atualizarFichaNoCacheEDb(fichaJogador._id, fichaJogador);
                    console.log(`Missão ${idMissaoEncerrada} concluída por ${fichaJogador.nomePersonagem}.`);
                }
            }
        }

        let imagemMissaoFinal = "";
        if (dialogoParaMostrar && (dialogoParaMostrar.ofereceMissao || dialogoParaMostrar.encerraMissao)) {
            const idMissao = dialogoParaMostrar.ofereceMissao || dialogoParaMostrar.encerraMissao;
            const missaoDef = idMissao ? (await missoesCollection.findOne({ _id: idMissao })) : null;
            if (missaoDef && missaoDef.imagem) {
                imagemMissaoFinal = missaoDef.imagem;
            }
        }

        return {
            idNPC: npcData._id,
            nomeNPC: npcData.nome,
            tituloNPC: npcData.titulo,
            imagemNPC: npcData.imagem || "",
            descricaoVisualNPC: npcData.descricaoVisual,
            dialogoAtual: dialogoParaMostrar,
            recompensasConcedidasTexto: recompensasConcedidasLinhas,
            missaoRealmenteConcluida: todosObjetivosRealmenteCompletosParaFinalizar && dialogoParaMostrar.encerraMissao && fichaJogador.logMissoes.find(m=>m.idMissao === dialogoParaMostrar.encerraMissao)?.status === "concluida",
            imagemMissao: imagemMissaoFinal
        };

    } catch (error) {
        console.error(`Erro ao processar interação com NPC ${nomeOuIdNPC}:`, error);
        return { erro: "Ocorreu um erro ao buscar informações do NPC no banco de dados." };
    }
}

async function verificarCondicoesDialogo(condicoes, fichaJogador, npcData, idMissaoOferecidaPeloDialogo = null) {
    if (!condicoes || !Array.isArray(condicoes) || condicoes.length === 0) {
        if (idMissaoOferecidaPeloDialogo && fichaJogador.logMissoes) {
            const missaoLog = fichaJogador.logMissoes.find(m => m.idMissao === idMissaoOferecidaPeloDialogo);
            if (missaoLog && (missaoLog.status === 'aceita' || missaoLog.status === 'concluida')) {
                return false; 
            }
        }
        return true; 
    }

    for (const cond of condicoes) {
        if (cond.tipo === "nivelMinJogador" && (!fichaJogador.nivel || fichaJogador.nivel < cond.valor)) return false;

        if (cond.tipo === "missaoNaoIniciada") {
            if (fichaJogador.logMissoes && fichaJogador.logMissoes.some(m => m.idMissao === cond.idMissao)) return false;
        }
        if (cond.tipo === "missaoAtiva") {
            if (!fichaJogador.logMissoes || !fichaJogador.logMissoes.some(m => m.idMissao === cond.idMissao && m.status === "aceita")) return false;
        }
        if (cond.tipo === "missaoConcluida") {
            if (!fichaJogador.logMissoes || !fichaJogador.logMissoes.some(m => m.idMissao === cond.idMissao && m.status === "concluida")) return false;
        }

        if (cond.tipo === "objetivoMissaoCompleto" || cond.tipo === "objetivoMissaoIncompleto") {
            if (!fichaJogador.logMissoes) {
                if (cond.tipo === "objetivoMissaoIncompleto") return true;
                if (cond.tipo === "objetivoMissaoCompleto") return false;
            }

            const missaoLog = fichaJogador.logMissoes.find(m => m.idMissao === cond.idMissao);
            if (!missaoLog || missaoLog.status !== "aceita") {
                if (cond.tipo === "objetivoMissaoIncompleto") {
                    if (cond.tipo === "objetivoMissaoCompleto") return false; 
                } else {
                    return false;
                }
            } else {
                const objetivoNoLog = missaoLog.objetivos ? missaoLog.objetivos.find(o => o.idObjetivo === cond.idObjetivo) : null;
                if (!objetivoNoLog) {
                    console.warn(`[verificarCondicoesDialogo] Objetivo ${cond.idObjetivo} não encontrado no log da missão ${cond.idMissao} para o jogador ${fichaJogador._id}`);
                    if (cond.tipo === "objetivoMissaoCompleto") return false;
                } else {
                    const objetivoEstaRealmenteCompleto = objetivoNoLog.concluido === true;

                    if (cond.tipo === "objetivoMissaoCompleto" && !objetivoEstaRealmenteCompleto) return false;
                    if (cond.tipo === "objetivoMissaoIncompleto" && objetivoEstaRealmenteCompleto) return false;
                }
            }
        }

        if (cond.tipo === "jogadorPossuiItemQuest") {
            if (!fichaJogador.inventario || !fichaJogador.inventario.some(item => 
                item.itemNome.toLowerCase() === cond.itemNomeQuest.toLowerCase() && 
                item.quantidade >= (cond.quantidadeItemQuest || 1) 
            )) return false;
        }
        if (cond.tipo === "jogadorNaoPossuiItemQuest") {
            if (fichaJogador.inventario && fichaJogador.inventario.some(item => 
                item.itemNome.toLowerCase() === cond.itemNomeQuest.toLowerCase()
            )) return false;
        }
        if (cond.tipo === "reputacaoMinima") {
            if (!fichaJogador.reputacao || (fichaJogador.reputacao[cond.faccao] || 0) < cond.valor) return false;
        }
    }
    return true;
}

async function atualizarProgressoMissao(idJogador, idMissao, idObjetivo, progresso, getFichaOuCarregar) {
    try {
        const ficha = await getFichaOuCarregar(idJogador);
        if (!ficha || !ficha.logMissoes) {
            console.log(`[Progresso Missão] Ficha ou log de missões não encontrado para ${idJogador}.`);
            return false;
        }

        const missaoIndex = ficha.logMissoes.findIndex(m => m.idMissao === idMissao && m.status === "aceita");
        if (missaoIndex === -1) {
            console.log(`[Progresso Missão] Missão ${idMissao} não está ativa para ${idJogador}.`);
            return false; 
        }

        const objetivoIndex = ficha.logMissoes[missaoIndex].objetivos.findIndex(o => o.idObjetivo === idObjetivo);
        if (objetivoIndex === -1) {
            console.warn(`[atualizarProgressoMissao] Objetivo ${idObjetivo} não encontrado no log da missão ${idMissao} do jogador ${idJogador}`);
            return false;
        }

        const objetivoLog = ficha.logMissoes[missaoIndex].objetivos[objetivoIndex];
        if (objetivoLog.concluido) {
            console.log(`[Progresso Missão] Objetivo ${idObjetivo} da missão ${idMissao} já está concluído para ${idJogador}.`);
            return false;
        }

        const definicaoMissao = await missoesCollection.findOne({ _id: idMissao });
        if (!definicaoMissao) {
            console.warn(`[atualizarProgressoMissao] Definição da missão ${idMissao} não encontrada no DB.`);
            return false;
        }

        const definicaoObjetivo = definicaoMissao.objetivos.find(o => o.idObjetivo === idObjetivo);
        if (!definicaoObjetivo) {
            console.warn(`[atualizarProgressoMissao] Definição do objetivo ${idObjetivo} não encontrada para missão ${idMissao} no DB.`);
            return false;
        }

        let objetivoConcluidoNesteUpdate = false;
        const quantidadeAnterior = objetivoLog.quantidadeAtual || 0;

        switch (definicaoObjetivo.tipo) {
            case "COMBATE":
            case "COMBATE_OPCIONAL":
                objetivoLog.quantidadeAtual = Math.min(
                    (objetivoLog.quantidadeAtual || 0) + (progresso.quantidadeMortos || 0),
                    definicaoObjetivo.quantidadeNecessaria
                );
                
                if (objetivoLog.quantidadeAtual >= definicaoObjetivo.quantidadeNecessaria) {
                    objetivoLog.concluido = true;
                    objetivoConcluidoNesteUpdate = true;
                }
                break;

            case "COLETA":
                const itemNoInventario = ficha.inventario.find(i => 
                    i.itemNome.toLowerCase() === definicaoObjetivo.itemNomeQuest.toLowerCase()
                );
                const quantidadeAtualNoInventario = itemNoInventario ? itemNoInventario.quantidade : 0;
                objetivoLog.quantidadeAtual = quantidadeAtualNoInventario;

                if (quantidadeAtualNoInventario >= definicaoObjetivo.quantidadeNecessaria) {
                    objetivoLog.concluido = true;
                    objetivoConcluidoNesteUpdate = true;
                }
                break;

            case "ENTREGA":
                if (progresso.itemEntregue) {
                    objetivoLog.concluido = true;
                    objetivoConcluidoNesteUpdate = true;
                    objetivoLog.quantidadeAtual = definicaoObjetivo.quantidadeNecessaria || 1;
                }
                break;

            case "EXPLORAR":
                if (progresso.areaExplorada) {
                    objetivoLog.concluido = true;
                    objetivoConcluidoNesteUpdate = true;
                    objetivoLog.quantidadeAtual = 1;
                }
                break;

            default:
                console.warn(`[atualizarProgressoMissao] Tipo de objetivo desconhecido: ${definicaoObjetivo.tipo}`);
                return false;
        }

        ficha.logMissoes[missaoIndex].objetivos[objetivoIndex] = objetivoLog;
        await atualizarFichaNoCacheEDb(idJogador, ficha);

        if (objetivoConcluidoNesteUpdate) {
            console.log(`[Progresso Missão] ✅ Jogador ${ficha.nomePersonagem}: Objetivo "${objetivoLog.descricao}" da missão "${definicaoMissao.titulo}" CONCLUÍDO!`);
        } else if (quantidadeAnterior !== objetivoLog.quantidadeAtual) {
            console.log(`[Progresso Missão] 📈 Jogador ${ficha.nomePersonagem}: Progresso do objetivo "${objetivoLog.descricao}": ${objetivoLog.quantidadeAtual}/${definicaoObjetivo.quantidadeNecessaria}`);
        }

        return objetivoConcluidoNesteUpdate;

    } catch (error) {
        console.error(`[atualizarProgressoMissao] Erro ao atualizar progresso:`, error);
        return false;
    }
}

async function aceitarMissao(idJogador, idMissao, idNpcQueOfereceu, getFichaOuCarregar) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha) return { erro: "Sua ficha não foi encontrada." };

    if (!missoesCollection || !npcsCollection) {
        console.error("Coleção de missões ou NPCs não inicializada para aceitarMissao.");
        return { erro: "Erro interno: Sistema de missões indisponível." };
    }

    const definicaoMissao = await missoesCollection.findOne({ _id: idMissao });
    if (!definicaoMissao) return { erro: "Definição da missão não encontrada." };

    const missaoExistente = ficha.logMissoes ? ficha.logMissoes.find(m => m.idMissao === idMissao) : null;
    if (missaoExistente) {
        if (missaoExistente.status === "aceita") return { erro: `Você já está com a missão "${definicaoMissao.titulo}" ativa.` };
        if (missaoExistente.status === "concluida") return { erro: `Você já completou a missão "${definicaoMissao.titulo}".` };
    }

    if (definicaoMissao.preRequisitos) {
        for (const preReq of definicaoMissao.preRequisitos) {
            if (preReq.tipo === "nivelMinJogador" && ficha.nivel < preReq.valor) {
                return { erro: `Você precisa ser Nível ${preReq.valor} para aceitar "${definicaoMissao.titulo}". Seu nível é ${ficha.nivel}.` };
            }
            if (preReq.tipo === "missaoConcluidaAnteriormente") {
                const preReqMissaoLog = ficha.logMissoes ? ficha.logMissoes.find(m => m.idMissao === preReq.idMissaoRequisito) : null;
                if (!preReqMissaoLog || preReqMissaoLog.status !== "concluida") {
                    const nomeMissaoReq = (await missoesCollection.findOne({_id: preReq.idMissaoRequisito}))?.titulo || preReq.idMissaoRequisito;
                    return { erro: `Você precisa completar a missão "${nomeMissaoReq}" antes de aceitar esta.` };
                }
            }
        }
    }

    const novaEntradaLogMissao = {
        idMissao: idMissao,
        tituloMissao: definicaoMissao.titulo,
        status: "aceita",
        dataInicio: new Date().toISOString(),
        objetivos: definicaoMissao.objetivos.map(objDef => ({
            idObjetivo: objDef.idObjetivo,
            descricao: objDef.descricao,
            quantidadeAtual: 0,
            concluido: false
        }))
    };

    if (!ficha.logMissoes) ficha.logMissoes = [];
    ficha.logMissoes.push(novaEntradaLogMissao);

    let itensRecebidosMsg = "";
    if (definicaoMissao.itensConcedidosAoAceitar && definicaoMissao.itensConcedidosAoAceitar.length > 0) {
        itensRecebidosMsg = "\n\nItens recebidos:";
        for (const itemQuest of definicaoMissao.itensConcedidosAoAceitar) {
            await adicionarItemAoInventario(ficha, itemQuest.idItem, itemQuest.quantidade);
            itensRecebidosMsg += `\n- ${itemQuest.idItem} (x${itemQuest.quantidade})`;
        }
    }

    await atualizarFichaNoCacheEDb(idJogador, ficha);

    let msgSucesso = `Missão **"${definicaoMissao.titulo}"** aceita!`;
    if (itensRecebidosMsg) msgSucesso += itensRecebidosMsg;

    return { 
        sucesso: msgSucesso, 
        dialogoFeedbackId: definicaoMissao.dialogoFeedbackAoAceitar || null 
    };
}

module.exports = {
    inicializarNpcsMissoesSistema,
    processarInteracaoComNPC,
    verificarCondicoesDialogo,
    atualizarProgressoMissao,
    aceitarMissao
};
