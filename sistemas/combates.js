//Combates Lógica
// Importar o cache de combates do index.js
let combatesAtivos = {};
let mobsCollection = null; // Deve ser setada na inicialização do módulo
let getFichaOuCarregar, atualizarFichaNoCacheEDb, adicionarXPELevelUp, adicionarItemAoInventario, processarUsarItem, ITENS_BASE_ARCADIA, FEITICOS_BASE_ARCADIA, atualizarProgressoMissao, calcularValorDaFormula;

// Importar o sistema completo de feitiços
const SistemaFeiticos = require('./sistema_feiticos.js');
const sistemaFeiticos = new SistemaFeiticos();

function setupCombate(deps) {
  getFichaOuCarregar = deps.getFichaOuCarregar;
  atualizarFichaNoCacheEDb = deps.atualizarFichaNoCacheEDb;
  adicionarXPELevelUp = deps.adicionarXPELevelUp;
  adicionarItemAoInventario = deps.adicionarItemAoInventario;
  ITENS_BASE_ARCADIA = deps.ITENS_BASE_ARCADIA;
  FEITICOS_BASE_ARCADIA = deps.FEITICOS_BASE_ARCADIA;
  processarUsarItem = deps.processarUsarItem;
  atualizarProgressoMissao = deps.atualizarProgressoMissao;
  conectarMongoDB = deps.conectarMongoDB;
  calcularValorDaFormula = deps.calcularValorDaFormula;
  
  // Configurar o cache de combates compartilhado
  if (deps.combatesAtivos) {
    combatesAtivos = deps.combatesAtivos;
    console.log('[COMBATE] Cache de combates compartilhado configurado');
  }
}


function setMobsCollection(collection) {
    mobsCollection = collection;
}

module.exports = {
  setupCombate,
    iniciarCombatePvE,
    processarTurnoMobCombate,
    processarAcaoJogadorCombate,
    finalizarCombate,
    getEstadoCombateParaRetorno,
    setMobsCollection,
    combatesAtivos // só exporte se for necessário manipular de fora
};

  async function iniciarCombatePvE(idJogador, idMob, idMissaoVinculada = null, idObjetivoVinculado = null) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha) return { erro: "Sua ficha não foi encontrada para iniciar o combate." };
    if (ficha.pvAtual <= 0) return { erro: `${ficha.nomePersonagem} está incapacitado e não pode iniciar um combate.` };

    if (!mobsCollection) {
        console.error("[COMBATE PvE] mobsCollection não está inicializada!");
        await conectarMongoDB();
        if (!mobsCollection) return { erro: "Sistema de combate indisponível (mobs)." };
    }
    const mobBase = await mobsCollection.findOne({ _id: idMob });
    if (!mobBase) return { erro: `A criatura hostil "${idMob}" não foi encontrada nos registros de Arcádia.` };

    // Cria uma instância do mob para este combate
    const mobInstancia = JSON.parse(JSON.stringify(mobBase));
    mobInstancia.pvAtual = mobInstancia.atributos.pvMax; // Garante PV cheio no início

    const idCombate = `${idJogador}_${idMob}_${Date.now()}`;
    combatesAtivos[idCombate] = {
        idJogador: idJogador,
        fichaJogador: ficha, 
        mobOriginalId: idMob, // Guardar o ID original do mob base
        mobInstancia: mobInstancia,
        idMissaoVinculada: idMissaoVinculada,
        idObjetivoVinculado: idObjetivoVinculado,
        log: [`⚔️ ${ficha.nomePersonagem} (PV: ${ficha.pvAtual}/${ficha.pvMax}) encontra ${mobInstancia.nome} (PV: ${mobInstancia.pvAtual}/${mobInstancia.atributos.pvMax})! ⚔️`],
        turnoDoJogador: true, // Jogador sempre começa
        numeroMobsDerrotadosNaMissao: 0 // Para missões de matar X monstros
    };
    console.log(`[COMBATE PvE] Combate ${idCombate} iniciado: ${ficha.nomePersonagem} vs ${mobInstancia.nome}`);
    return { 
        sucesso: true, 
        idCombate: idCombate, 
        mensagemInicial: combatesAtivos[idCombate].log[0],
        estadoCombate: getEstadoCombateParaRetorno(combatesAtivos[idCombate])  
    };
}

async function processarTurnoMobCombate(idCombate) {
    const combate = combatesAtivos[idCombate];
    if (!combate) return { erro: "Combate não encontrado ou já finalizado.", combateTerminou: true };
    if (combate.turnoDoJogador) return { erro: "Ainda é o turno do jogador!", combateTerminou: false };
    if (combate.mobInstancia.pvAtual <= 0) return { erro: "Oponente já derrotado.", combateTerminou: true, vencedor: "jogador" };

    const fichaJogador = combate.fichaJogador;
    const mob = combate.mobInstancia;
    let logDoTurno = [];

    // Verificar se é um dummy que não contra-ataca
    if (mob.ehDummyTreino && !mob.contraataca) {
        console.log(`[DEBUG TURNO MOB] Dummy ${mob.nome} não contra-ataca, pulando turno do mob`);
        combate.turnoDoJogador = true; // Passa o turno de volta para o jogador
        return { 
            sucesso: true, 
            idCombate: idCombate,
            logTurnoAnterior: [`🎯 ${mob.nome} não reage ao ataque (dummy de treino).`],
            proximoTurno: "jogador",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    }

    // Processar efeitos por turno no início do turno do mob
    const efeitosMob = sistemaFeiticos.processarEfeitosPorTurno(mob);
    const efeitosJogador = sistemaFeiticos.processarEfeitosPorTurno(fichaJogador);
    
    if (efeitosMob.length > 0) {
        logDoTurno.push(...efeitosMob);
    }
    if (efeitosJogador.length > 0) {
        logDoTurno.push(...efeitosJogador);
    }

    // Verificar se o mob morreu por efeitos
    console.log(`[DEBUG TURNO MOB] Verificando PV do mob após efeitos: ${mob.nome} tem ${mob.pvAtual} PV`);
    if (mob.pvAtual <= 0) {
        console.log(`[DEBUG TURNO MOB] Mob ${mob.nome} morreu por efeitos! PV: ${mob.pvAtual}`);
        logDoTurno.push(`💀 ${mob.nome} sucumbiu aos efeitos mágicos!`);
        combate.log.push(...logDoTurno);
        const resultadoFinal = await finalizarCombate(idCombate, combate.idJogador, true); // true = jogador venceu
        return { 
            ...resultadoFinal, 
            log: [...combate.log] 
        };
    }
    console.log(`[DEBUG TURNO MOB] Mob ${mob.nome} ainda vivo após efeitos com ${mob.pvAtual} PV`);

    // Verificar se o jogador morreu por efeitos
    if (fichaJogador.pvAtual <= 0) {
        logDoTurno.push(`💀 ${fichaJogador.nomePersonagem} sucumbiu aos efeitos mágicos!`);
        combate.log.push(...logDoTurno);
        const resultadoFinal = await finalizarCombate(idCombate, combate.idJogador, false); // false = jogador perdeu
        return { 
            ...resultadoFinal, 
            log: [...combate.log] 
        };
    }

    // Ação do Mob (Ataque Básico)
    const ataqueMob = mob.atributos.ataqueBase || 5;
    // Calcula defesa do jogador (considerando item equipado, se houver)
    let defesaJogador = fichaJogador.atributos.defesaBase || 0;
    if (fichaJogador.equipamento) {
        for (const slot in fichaJogador.equipamento) {
            if (fichaJogador.equipamento[slot] && fichaJogador.equipamento[slot].efeitoEquipamento && fichaJogador.equipamento[slot].efeitoEquipamento.bonusAtributos && fichaJogador.equipamento[slot].efeitoEquipamento.bonusAtributos.defesaBase) {
                defesaJogador += fichaJogador.equipamento[slot].efeitoEquipamento.bonusAtributos.defesaBase;
            }
        }
    }

    // Aplicar modificadores de efeitos temporários
    const modificadoresJogador = sistemaFeiticos.obterModificadoresAtivos(fichaJogador);
    if (modificadoresJogador.defesaBase) {
        defesaJogador += modificadoresJogador.defesaBase.aditivo;
        defesaJogador *= modificadoresJogador.defesaBase.multiplicativo;
    }

    const danoCausadoAoJogador = Math.max(1, ataqueMob - defesaJogador);

    fichaJogador.pvAtual = Math.max(0, fichaJogador.pvAtual - danoCausadoAoJogador);
    logDoTurno.push(`💢 ${mob.nome} ataca ${fichaJogador.nomePersonagem}, causando ${danoCausadoAoJogador} de dano!`);
    logDoTurno.push(`❤️ ${fichaJogador.nomePersonagem} agora tem ${fichaJogador.pvAtual}/${fichaJogador.pvMax} PV.`);

    combate.log.push(...logDoTurno);
    await atualizarFichaNoCacheEDb(combate.idJogador, fichaJogador); // Salva o PV do jogador

    if (fichaJogador.pvAtual <= 0) {
        logDoTurno.push(`☠️ ${fichaJogador.nomePersonagem} foi derrotado!`);
        const resultadoFinal = await finalizarCombate(idCombate, combate.idJogador, false); // false = jogador perdeu
        return { 
            ...resultadoFinal, 
            log: [...combate.log] 
        };
    }

    combate.turnoDoJogador = true; // Passa o turno para o jogador

    return { 
        sucesso: true, 
        idCombate: idCombate,
        logTurnoAnterior: logDoTurno,
        proximoTurno: "jogador",
        estadoCombate: getEstadoCombateParaRetorno(combate)
    };
}

async function processarAcaoJogadorCombate(idCombate, idJogadorAcao, tipoAcao = "ATAQUE_BASICO", detalhesAcao = {}) {
    const combate = combatesAtivos[idCombate];
    if (!combate) return { erro: "Combate não encontrado ou já finalizado.", combateTerminou: true };
    if (combate.idJogador !== idJogadorAcao) return { erro: "Não é você quem está neste combate.", combateTerminou: false }; // Não encerra, só avisa
    if (!combate.turnoDoJogador) return { erro: "Aguarde, não é o seu turno de agir!", combateTerminou: false };

    const fichaJogador = combate.fichaJogador;
    const mob = combate.mobInstancia;
    let logDoTurno = []; // Log específico desta ação e suas consequências imediatas

    if (fichaJogador.pvAtual <= 0) { // Checagem extra
        return { erro: "Você está incapacitado!", terminou: true, vencedor: "mob", logCombate: combate.log, recompensasTexto: [] };
    }

    if (tipoAcao === "ATAQUE_BASICO") {
        const ataqueJogador = (fichaJogador.atributos.forca || 5) + (fichaJogador.ataqueBase || 0) + (fichaJogador.equipamento?.maoDireita?.efeitoEquipamento?.bonusAtributos?.ataqueBase || 0);
        const defesaMob = mob.atributos.defesaBase || 0;
        const danoCausado = Math.max(1, ataqueJogador - defesaMob);

        mob.pvAtual = Math.max(0, mob.pvAtual - danoCausado);
        logDoTurno.push(`💥 ${fichaJogador.nomePersonagem} ataca ${mob.nome}, causando ${danoCausado} de dano!`);
        logDoTurno.push(`🩸 ${mob.nome} agora tem ${mob.pvAtual}/${mob.atributos.pvMax} PV.`);

        // Verificar se o mob foi derrotado
        console.log(`[DEBUG COMBATE] Verificando morte do mob: ${mob.nome}, PV atual: ${mob.pvAtual}, PV máximo: ${mob.atributos.pvMax}`);
        if (mob.pvAtual <= 0) {
            console.log(`[DEBUG COMBATE] Mob ${mob.nome} foi derrotado! PV: ${mob.pvAtual}`);
            logDoTurno.push(`🏆 ${mob.nome} foi derrotado!`);
            combate.log.push(...logDoTurno);
            combate.numeroMobsDerrotadosNaMissao = (combate.numeroMobsDerrotadosNaMissao || 0) + 1;
            
            return {
                sucesso: true,
                mobDerrotado: true,
                idCombate,
                logTurnoAnterior: logDoTurno,
                estadoCombate: getEstadoCombateParaRetorno(combate),
                dadosParaFinalizar: {
                    idJogador: combate.idJogador,
                    mobInstancia: combate.mobInstancia,
                    idMissaoVinculada: combate.idMissaoVinculada,
                    idObjetivoVinculado: combate.idObjetivoVinculado,
                    numeroMobsJaDerrotados: combate.numeroMobsDerrotadosNaMissao
                }
            };
        }
        console.log(`[DEBUG COMBATE] Mob ${mob.nome} ainda vivo com ${mob.pvAtual} PV`);

        // Mob ainda vivo, passa o turno para ele
        combate.turnoDoJogador = false;
        combate.log.push(...logDoTurno);
        return {
            sucesso: true,
            mobDerrotado: false,
            idCombate,
            logTurnoAnterior: logDoTurno,
            proximoTurno: "mob",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    } 
    else if (tipoAcao === "USAR_ITEM") {
    const nomeItem = detalhesAcao.nomeItem || combate.itemSelecionado;
    if (!nomeItem) {
        logDoTurno.push("Nenhum item foi especificado.");
        combate.log.push(...logDoTurno);
        return {
            sucesso: false,
            erro: "Nenhum item foi especificado.",
            idCombate,
            logTurnoAnterior: logDoTurno,
            proximoTurno: "jogador",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    }

    // Use a função de uso de item já existente
    const resultadoItem = await processarUsarItem(idJogadorAcao, nomeItem, 1);
    console.log("[DEBUG Combate] Resultado de processarUsarItem:", resultadoItem);

    // Verificar se o item foi usado com sucesso
    // Verifica se é um embed de sucesso (cor verde) ou se tem propriedade sucesso
    const itemUsadoComSucesso = (resultadoItem && resultadoItem.data && resultadoItem.data.color === 0x00FF00) ||
                               (resultadoItem && resultadoItem.sucesso) ||
                               (resultadoItem && resultadoItem.data && resultadoItem.data.title && resultadoItem.data.title.includes("Item Usado"));

    if (itemUsadoComSucesso) {
        // Item usado com sucesso
        const mensagemSucesso = resultadoItem.data?.description || 
                               resultadoItem.data?.fields?.[0]?.value || 
                               resultadoItem.mensagem || 
                               'Item usado com sucesso!';
        logDoTurno.push(`🎒 ${mensagemSucesso}`);
        
        // Atualizar a ficha do jogador no combate com os novos valores
        const fichaAtualizada = await getFichaOuCarregar(idJogadorAcao);
        if (fichaAtualizada) {
            combate.fichaJogador = fichaAtualizada;
        }

        combate.log.push(...logDoTurno);
        combate.turnoDoJogador = false;

        return {
            sucesso: true,
            mobDerrotado: false,
            idCombate,
            logTurnoAnterior: logDoTurno,
            proximoTurno: "mob",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    } else {
        // Item não pôde ser usado (erro ou aviso)
        const mensagemErro = resultadoItem?.data?.description || 
                            resultadoItem?.data?.fields?.[0]?.value || 
                            resultadoItem?.erro || 
                            "Não foi possível usar o item.";
        logDoTurno.push(`❌ ${mensagemErro}`);
        combate.log.push(...logDoTurno);
        return {
            sucesso: false,
            erro: mensagemErro,
            idCombate,
            logTurnoAnterior: logDoTurno,
            proximoTurno: "jogador",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    }
}

else if (tipoAcao === "USAR_FEITICO") {
    const idFeitico = detalhesAcao.idFeitico;
    if (!idFeitico) {
        logDoTurno.push("Nenhum feitiço foi especificado.");
        combate.log.push(...logDoTurno);
        return {
            sucesso: false,
            erro: "Nenhum feitiço foi especificado.",
            idCombate,
            logTurnoAnterior: logDoTurno,
            proximoTurno: "jogador",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    }

    // Usar o sistema completo de feitiços
    const fichaConjurador = combate.fichaJogador;
    const alvo = combate.mobInstancia; // Por enquanto, alvo é sempre o mob em combate PvE
    
    const resultadoFeitico = await sistemaFeiticos.processarFeitico(
        fichaConjurador, 
        idFeitico, 
        alvo, 
        combate, 
        calcularValorDaFormula
    );

    if (!resultadoFeitico.sucesso) {
        logDoTurno.push(resultadoFeitico.erro);
        combate.log.push(...logDoTurno);
        return {
            sucesso: false,
            erro: resultadoFeitico.erro,
            idCombate,
            logTurnoAnterior: logDoTurno,
            proximoTurno: "jogador",
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    }

    // Processar efeitos por turno em entidades
    const efeitosMob = sistemaFeiticos.processarEfeitosPorTurno(combate.mobInstancia);
    const efeitosJogador = sistemaFeiticos.processarEfeitosPorTurno(fichaConjurador);

    // Atualizar ficha do jogador no combate
    combate.fichaJogador = fichaConjurador;
    
    // Salvar a ficha atualizada no banco de dados
    try {
        await atualizarFichaNoCacheEDb(idJogadorAcao, fichaConjurador);
    } catch (saveError) {
        console.error("[COMBATE] Erro ao salvar ficha após usar feitiço:", saveError);
    }

    // Adicionar mensagem do feitiço ao log
    logDoTurno.push(resultadoFeitico.resultado.mensagem);
    
    // Adicionar efeitos por turno ao log
    if (efeitosMob.length > 0) {
        logDoTurno.push(...efeitosMob);
    }
    if (efeitosJogador.length > 0) {
        logDoTurno.push(...efeitosJogador);
    }

    // Verificar vitória do jogador
    if (combate.mobInstancia.pvAtual <= 0) {
        logDoTurno.push(`🏆 ${combate.mobInstancia.nome} foi derrotado!`);
        combate.log.push(...logDoTurno);
        combate.numeroMobsDerrotadosNaMissao = (combate.numeroMobsDerrotadosNaMissao || 0) + 1;
            return {
                sucesso: true,
                mobDerrotado: true,
                idCombate,
                logTurnoAnterior: logDoTurno,
                estadoCombate: getEstadoCombateParaRetorno(combate),
                dadosParaFinalizar: {
                    idJogador: combate.idJogador,
                    mobInstancia: combate.mobInstancia,
                    idMissaoVinculada: combate.idMissaoVinculada,
                    idObjetivoVinculado: combate.idObjetivoVinculado,
                    numeroMobsJaDerrotados: combate.numeroMobsDerrotadosNaMissao
                }
            };
    }

    combate.turnoDoJogador = false;
    combate.log.push(...logDoTurno);
    return {
        sucesso: true,
        mobDerrotado: false,
        idCombate,
        logTurnoAnterior: logDoTurno,
        proximoTurno: "mob",
        estadoCombate: getEstadoCombateParaRetorno(combate)
    };
} else {
    // Ação não reconhecida
    logDoTurno.push(`Ação "${tipoAcao}" ainda não é suportada.`);
    combate.log.push(...logDoTurno);
    return { 
        sucesso: false, 
        erro: `Ação "${tipoAcao}" não suportada.`,
        idCombate: idCombate,
        logTurnoAnterior: logDoTurno,
        proximoTurno: "jogador",
        estadoCombate: getEstadoCombateParaRetorno(combate)
    };
}
}

async function finalizarCombate(idCombate, idJogadorFicha, jogadorVenceuEsteMob, eUltimoMobDaMissao = true) {
    const combate = combatesAtivos[idCombate];
    if (!combate) {
        console.warn(`[FINALIZAR COMBATE] Tentativa de finalizar combate inexistente: ${idCombate}`);
        return { erro: "Combate não encontrado para finalizar.", combateRealmenteTerminou: true };
    }

    const ficha = await getFichaOuCarregar(idJogadorFicha);
    if (!ficha) {
        console.error(`[FINALIZAR COMBATE] Ficha do jogador ${idJogadorFicha} não encontrada!`);
        delete combatesAtivos[idCombate];
        return { erro: "Ficha do jogador não encontrada.", combateRealmenteTerminou: true };
    }

    const mob = combate.mobInstancia;
    let mensagemResultado = "";
    let recompensasTextoArray = [];
    let logCompleto = [...combate.log];

    if (jogadorVenceuEsteMob) {
        mensagemResultado = `🏆 ${ficha.nomePersonagem} derrotou ${mob.nome}!`;
        logCompleto.push(mensagemResultado);

        // Adicionar XP pelo mob derrotado
        const xpGanhoMob = mob.xpRecompensa || 0;
        if (xpGanhoMob > 0) {
            try {
                const resultadoXP = await adicionarXPELevelUp(ficha, xpGanhoMob);
                recompensasTextoArray.push(`✨ +${xpGanhoMob} XP`);
                
                if (resultadoXP.subiuNivel) {
                    recompensasTextoArray.push(`🎉 SUBIU PARA O NÍVEL ${resultadoXP.ultimoNivelAlcancado}!`);
                    if (resultadoXP.pontosAtributoGanhosTotal > 0) {
                        recompensasTextoArray.push(`💪 +${resultadoXP.pontosAtributoGanhosTotal} Pontos de Atributo`);
                    }
                    if (resultadoXP.pontosFeiticoGanhosTotal > 0) {
                        recompensasTextoArray.push(`🔮 +${resultadoXP.pontosFeiticoGanhosTotal} Pontos de Feitiço`);
                    }
                }
            } catch (xpError) {
                console.error(`[FINALIZAR COMBATE] Erro ao processar XP:`, xpError);
                recompensasTextoArray.push(`⚠️ Erro ao processar XP (${xpGanhoMob} XP)`);
            }
        }

        // Adicionar Florins pelo mob derrotado
        if (mob.florinsRecompensaMin !== undefined && mob.florinsRecompensaMax !== undefined) {
            const florinsGanhos = Math.floor(Math.random() * (mob.florinsRecompensaMax - mob.florinsRecompensaMin + 1)) + mob.florinsRecompensaMin;
            if (florinsGanhos > 0) {
                ficha.florinsDeOuro = (ficha.florinsDeOuro || 0) + florinsGanhos;
                recompensasTextoArray.push(`🪙 +${florinsGanhos} Florins de Ouro`);
            }
        }

        // Processar loot table
        if (mob.lootTable && Array.isArray(mob.lootTable) && mob.lootTable.length > 0) {
            for (const itemLoot of mob.lootTable) {
                try {
                    const chanceRoll = Math.random();
                    if (chanceRoll < (itemLoot.chanceDrop || 0)) {
                        const qtdMin = itemLoot.quantidadeMin || 1;
                        const qtdMax = itemLoot.quantidadeMax || qtdMin;
                        const qtdDrop = Math.floor(Math.random() * (qtdMax - qtdMin + 1)) + qtdMin;
                        
                        if (qtdDrop > 0 && itemLoot.itemId) {
                            await adicionarItemAoInventario(ficha, itemLoot.itemId, qtdDrop);
                            const nomeItem = ITENS_BASE_ARCADIA[itemLoot.itemId.toLowerCase()]?.itemNome || 
                                           itemLoot.itemNomeOverride || 
                                           itemLoot.itemId;
                            recompensasTextoArray.push(`🎁 ${qtdDrop}x ${nomeItem}`);
                        }
                    }
                } catch (lootError) {
                    console.error(`[FINALIZAR COMBATE] Erro ao processar loot:`, lootError);
                }
            }
        }

        // Atualizar progresso da missão
        if (combate.idMissaoVinculada && combate.idObjetivoVinculado) {
            try {
                const progressoAtualizado = await atualizarProgressoMissao(
                    combate.idJogador, 
                    combate.idMissaoVinculada, 
                    combate.idObjetivoVinculado, 
                    { quantidadeMortos: 1 }
                );
                
                if (progressoAtualizado) {
                    recompensasTextoArray.push(`📋 Objetivo da missão atualizado!`);
                }
            } catch (missaoError) {
                console.error(`[FINALIZAR COMBATE] Erro ao atualizar missão:`, missaoError);
            }
        }

        // Salvar a ficha atualizada
        try {
            await atualizarFichaNoCacheEDb(combate.idJogador, ficha);
            console.log(`[FINALIZAR COMBATE] Ficha de ${ficha.nomePersonagem} atualizada com sucesso`);
        } catch (saveError) {
            console.error(`[FINALIZAR COMBATE] Erro ao salvar ficha:`, saveError);
            recompensasTextoArray.push(`⚠️ Erro ao salvar progresso`);
        }

    } else {
        // Jogador foi derrotado
        mensagemResultado = `☠️ ${ficha.nomePersonagem} foi derrotado por ${mob.nome}...`;
        logCompleto.push(mensagemResultado);
        
        // Aplicar penalidades de derrota se necessário
        ficha.pvAtual = Math.max(1, Math.floor(ficha.pvMax * 0.1)); // Deixa com 10% do PV máximo
        try {
            await atualizarFichaNoCacheEDb(combate.idJogador, ficha);
        } catch (saveError) {
            console.error(`[FINALIZAR COMBATE] Erro ao salvar ficha após derrota:`, saveError);
        }
    }

    // Limpar o combate do cache
    delete combatesAtivos[idCombate];
    console.log(`[FINALIZAR COMBATE] Combate ${idCombate} finalizado. Vencedor: ${jogadorVenceuEsteMob ? ficha.nomePersonagem : mob.nome}`);

    return {
        combateRealmenteTerminou: true,
        vencedorFinal: jogadorVenceuEsteMob ? "jogador" : "mob",
        logCombateFinal: logCompleto,
        recompensasTextoFinal: recompensasTextoArray,
        mensagemFinal: mensagemResultado
    };
}

// Função auxiliar para estado do combate (evita repetição)
function getEstadoCombateParaRetorno(combate) {
    console.log(">>> [SISTEMA | getEstadoCombate] combate.mobInstancia É:", combate.mobInstancia); 
    console.log(">>> [SISTEMA | getEstadoCombate] combate.mobInstancia.nivel É:", combate.mobInstancia.nivel, "(Tipo:", typeof combate.mobInstancia.nivel, ")"); 
    return {
        jogador: { 
            nome: combate.fichaJogador.nomePersonagem, 
            pvAtual: combate.fichaJogador.pvAtual, 
            pvMax: combate.fichaJogador.pvMax,
            pmAtual: combate.fichaJogador.pmAtual,
            pmMax: combate.fichaJogador.pmMax
        },
        mob: { 
            nome: combate.mobInstancia.nome, 
            pvAtual: combate.mobInstancia.pvAtual, 
            pvMax: combate.mobInstancia.atributos.pvMax,
            imagem: combate.mobInstancia.imagem,
            nivel: combate.mobInstancia.nivel
        }
    };
            }
