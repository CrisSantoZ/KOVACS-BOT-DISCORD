//Combates Lógica
const combatesAtivos = {}; // Cache local de combates ativos
let mobsCollection = null; // Deve ser setada na inicialização do módulo
let getFichaOuCarregar, atualizarFichaNoCacheEDb, adicionarXPELevelUp, adicionarItemAoInventario, ITENS_BASE_ARCADIA, atualizarProgressoMissao;

function setupCombate(deps) {
  getFichaOuCarregar = deps.getFichaOuCarregar;
  atualizarFichaNoCacheEDb = deps.atualizarFichaNoCacheEDb;
  adicionarXPELevelUp = deps.adicionarXPELevelUp;
  adicionarItemAoInventario = deps.adicionarItemAoInventario;
  ITENS_BASE_ARCADIA = deps.ITENS_BASE_ARCADIA;
  atualizarProgressoMissao = deps.atualizarProgressoMissao;
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
    if (combate.mobInstancia.pvAtual <= 0) return { erro: "Oponente já derrotado.", combateTerminou: true, vencedor: "jogador" }

    const fichaJogador = combate.fichaJogador;
    const mob = combate.mobInstancia;
    let logDoTurno = [];

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
    } 
    // Futuramente: else if (tipoAcao === "USAR_FEITICO") { ... }
    // Futuramente: else if (tipoAcao === "USAR_ITEM") { ... }
    else {
        logDoTurno.push(`Ação "${tipoAcao}" ainda não é suportada.`);
        combate.log.push(...logDoTurno); // Adiciona ao log principal
        return { 
            sucesso: false, 
            erro: `Ação "${tipoAcao}" não suportada.`,
            idCombate: idCombate,
            logTurnoAnterior: logDoTurno, // Renomeado para clareza
            proximoTurno: "jogador", // Devolve o turno se a ação falhou
            estadoCombate: getEstadoCombateParaRetorno(combate)
        };
    }

    combate.log.push(...logDoTurno);

    if (mob.pvAtual <= 0) {
        logDoTurno.push(`🏆 ${mob.nome} foi derrotado!`);
        combate.numeroMobsDerrotadosNaMissao = (combate.numeroMobsDerrotadosNaMissao || 0) + 1;
        // finalizarCombate agora será chamado pelo index.js após verificar se mais mobs são necessários para a missão
        return { 
            sucesso: true,
            mobDerrotado: true,
            idCombate: idCombate,
            logTurnoAnterior: logDoTurno,
            estadoCombate: getEstadoCombateParaRetorno(combate),
            dadosParaFinalizar: { // Passa dados para finalizar, se for o caso
                idJogador: combate.idJogador,
                mobInstancia: mob, // Mob derrotado
                idMissaoVinculada: combate.idMissaoVinculada,
                idObjetivoVinculado: combate.idObjetivoVinculado,
                numeroMobsJaDerrotados: combate.numeroMobsDerrotadosNaMissao
            }
        };
    }

    combate.turnoDoJogador = false; 

    return { 
        sucesso: true, 
        idCombate: idCombate,
        logTurnoAnterior: logDoTurno,
        proximoTurno: "mob", 
        estadoCombate: getEstadoCombateParaRetorno(combate)
    };
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
