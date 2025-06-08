
const { EmbedBuilder } = require('discord.js');

// Cache para combates ativos
let combatesAtivos = {};

// Função para definir o cache de combates (chamada pelo index.js)
function setCombatesAtivos(cache) {
    combatesAtivos = cache;
}

// Função para obter o cache de combates
function getCombatesAtivos() {
    return combatesAtivos;
}

async function iniciarCombatePvE(idJogador, idMob, fichaJogador, mobBase, idMissaoVinculada = null, idObjetivoVinculado = null) {
    if (fichaJogador.pvAtual <= 0) {
        return { erro: `${fichaJogador.nomePersonagem} está incapacitado e não pode iniciar um combate.` };
    }

    // Cria uma instância do mob para este combate
    const mobInstancia = JSON.parse(JSON.stringify(mobBase));
    mobInstancia.pvAtual = mobInstancia.atributos.pvMax; // Garante PV cheio no início

    const idCombate = `${idJogador}_${idMob}_${Date.now()}`;
    combatesAtivos[idCombate] = {
        idJogador: idJogador,
        fichaJogador: fichaJogador, 
        mobOriginalId: idMob,
        mobInstancia: mobInstancia,
        idMissaoVinculada: idMissaoVinculada,
        idObjetivoVinculado: idObjetivoVinculado,
        log: [`⚔️ ${fichaJogador.nomePersonagem} (PV: ${fichaJogador.pvAtual}/${fichaJogador.pvMax}) encontra ${mobInstancia.nome} (PV: ${mobInstancia.pvAtual}/${mobInstancia.atributos.pvMax})! ⚔️`],
        turnoDoJogador: true,
        numeroMobsDerrotadosNaMissao: 0
    };

    console.log(`[COMBATE PvE] Combate ${idCombate} iniciado: ${fichaJogador.nomePersonagem} vs ${mobInstancia.nome}`);
    
    return { 
        sucesso: true, 
        idCombate: idCombate, 
        mensagemInicial: combatesAtivos[idCombate].log[0],
        estadoCombate: getEstadoCombateParaRetorno(combatesAtivos[idCombate]),
        objetoCombate: combatesAtivos[idCombate]
    };
}

async function processarAcaoJogadorCombate(idCombate, idJogadorAcao, tipoAcao = "ATAQUE_BASICO", detalhesAcao = {}, atualizarFichaNoCacheEDb, calcularValorDaFormula, FEITICOS_BASE_ARCADIA, ITENS_BASE_ARCADIA) {
    const combate = combatesAtivos[idCombate];
    if (!combate) return { erro: "Combate não encontrado ou já finalizado.", combateTerminou: true };
    if (combate.idJogador !== idJogadorAcao) return { erro: "Não é você quem está neste combate.", combateTerminou: false };
    if (!combate.turnoDoJogador) return { erro: "Aguarde, não é o seu turno de agir!", combateTerminou: false };

    const fichaJogador = combate.fichaJogador;
    const mob = combate.mobInstancia;
    let logDoTurno = [];

    if (fichaJogador.pvAtual <= 0) {
        return { erro: "Você está incapacitado!", terminou: true, vencedor: "mob", logCombate: combate.log, recompensasTexto: [] };
    }

    let efeitoAplicado = false;

    if (tipoAcao === "ATAQUE_BASICO") {
        const ataqueJogador = (fichaJogador.atributos.forca || 5) + (fichaJogador.ataqueBase || 0) + (fichaJogador.equipamento?.maoDireita?.efeitoEquipamento?.bonusAtributos?.ataqueBase || 0);
        const defesaMob = mob.atributos.defesaBase || 0;
        const danoCausado = Math.max(1, ataqueJogador - defesaMob);

        mob.pvAtual = Math.max(0, mob.pvAtual - danoCausado);
        logDoTurno.push(`💥 ${fichaJogador.nomePersonagem} ataca ${mob.nome}, causando ${danoCausado} de dano!`);
        logDoTurno.push(`🩸 ${mob.nome} agora tem ${mob.pvAtual}/${mob.atributos.pvMax} PV.`);
        efeitoAplicado = true;
    } 
    else if (tipoAcao === "USAR_FEITICO") {
        const idFeitico = detalhesAcao.idFeitico;
        if (!idFeitico) {
            logDoTurno.push("⚠️ Nenhum feitiço especificado para usar.");
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: "Nenhum feitiço especificado.",
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        const feiticoBase = FEITICOS_BASE_ARCADIA[idFeitico];
        if (!feiticoBase) {
            logDoTurno.push(`⚠️ Feitiço "${idFeitico}" não encontrado.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Feitiço "${idFeitico}" não encontrado.`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        const magiaAprendida = fichaJogador.magiasConhecidas.find(m => m.id === idFeitico);
        if (!magiaAprendida) {
            logDoTurno.push(`⚠️ Você não conhece o feitiço "${feiticoBase.nome}".`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Você não conhece o feitiço "${feiticoBase.nome}".`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        const nivelFeitico = magiaAprendida.nivel;
        const detalhesNivel = feiticoBase.niveis.find(n => n.nivel === nivelFeitico);
        if (!detalhesNivel) {
            logDoTurno.push(`⚠️ Detalhes do nível ${nivelFeitico} do feitiço não encontrados.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: "Detalhes do feitiço não encontrados.",
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        if (fichaJogador.pmAtual < detalhesNivel.custoPM) {
            logDoTurno.push(`⚠️ Mana insuficiente. Necessário: ${detalhesNivel.custoPM} PM.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Mana insuficiente. Necessário: ${detalhesNivel.custoPM} PM.`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        // Verificar cooldown
        const cooldownKey = `${idFeitico}_${combate.idJogador}`;
        if (fichaJogador.cooldownsFeiticos && fichaJogador.cooldownsFeiticos[cooldownKey] > Date.now()) {
            const tempoRestante = Math.ceil((fichaJogador.cooldownsFeiticos[cooldownKey] - Date.now()) / 1000);
            logDoTurno.push(`⚠️ Feitiço "${feiticoBase.nome}" em recarga. Aguarde ${tempoRestante}s.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Feitiço em recarga. Aguarde ${tempoRestante}s.`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        // Consumir PM
        fichaJogador.pmAtual -= detalhesNivel.custoPM;

        // Aplicar cooldown
        const cooldownSegundos = detalhesNivel.cooldownSegundos || feiticoBase.cooldownSegundos || 0;
        if (cooldownSegundos > 0) {
            if (!fichaJogador.cooldownsFeiticos) fichaJogador.cooldownsFeiticos = {};
            fichaJogador.cooldownsFeiticos[cooldownKey] = Date.now() + (cooldownSegundos * 1000);
        }

        logDoTurno.push(`🔮 ${fichaJogador.nomePersonagem} usa ${feiticoBase.nome} (Nv. ${nivelFeitico})!`);

        // Aplicar efeitos do feitiço
        const efeitoConfig = detalhesNivel.efeitoDetalhes;
        if (efeitoConfig && feiticoBase.tipo === "ataque" && efeitoConfig.formulaDano) {
            const danoCalculado = calcularValorDaFormula(efeitoConfig.formulaDano, fichaJogador.atributos, mob.atributos);
            const pvAntes = mob.pvAtual;
            mob.pvAtual = Math.max(0, pvAntes - danoCalculado);
            logDoTurno.push(`💥 Causa ${danoCalculado} de dano ${efeitoConfig.tipoDano || 'mágico'} ao ${mob.nome}!`);
            logDoTurno.push(`🩸 ${mob.nome} agora tem ${mob.pvAtual}/${mob.atributos.pvMax} PV.`);
        } else if (efeitoConfig && feiticoBase.tipo === "cura" && efeitoConfig.formulaCura) {
            const curaCalculada = calcularValorDaFormula(efeitoConfig.formulaCura, fichaJogador.atributos);
            const pvAntes = fichaJogador.pvAtual;
            fichaJogador.pvAtual = Math.min(fichaJogador.pvMax, pvAntes + curaCalculada);
            logDoTurno.push(`💖 ${fichaJogador.nomePersonagem} se cura em ${curaCalculada} PV!`);
            logDoTurno.push(`❤️ ${fichaJogador.nomePersonagem} agora tem ${fichaJogador.pvAtual}/${fichaJogador.pvMax} PV.`);
        } else {
            logDoTurno.push(`✨ Efeito de ${feiticoBase.nome} aplicado!`);
        }

        efeitoAplicado = true;
    }
    else if (tipoAcao === "USAR_ITEM") {
        const nomeItem = detalhesAcao.nomeItem;
        if (!nomeItem) {
            logDoTurno.push("⚠️ Nenhum item especificado para usar.");
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: "Nenhum item especificado.",
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        const itemNoInventario = fichaJogador.inventario.find(i => i.itemNome.toLowerCase() === nomeItem.toLowerCase());
        if (!itemNoInventario || itemNoInventario.quantidade <= 0) {
            logDoTurno.push(`⚠️ Você não possui "${nomeItem}" no inventário.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Item "${nomeItem}" não encontrado no inventário.`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        const itemBase = ITENS_BASE_ARCADIA[nomeItem.toLowerCase()];
        if (!itemBase || !itemBase.usavel) {
            logDoTurno.push(`⚠️ "${itemNoInventario.itemNome}" não pode ser usado em combate.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Item "${itemNoInventario.itemNome}" não é usável em combate.`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        // Verificar cooldown
        const cooldownKey = `${nomeItem.toLowerCase()}_${combate.idJogador}`;
        if (itemBase.cooldownSegundos && fichaJogador.cooldownsItens && fichaJogador.cooldownsItens[cooldownKey] > Date.now()) {
            const tempoRestante = Math.ceil((fichaJogador.cooldownsItens[cooldownKey] - Date.now()) / 1000);
            logDoTurno.push(`⚠️ "${itemBase.itemNome}" em recarga. Aguarde ${tempoRestante}s.`);
            combate.log.push(...logDoTurno);
            return { 
                sucesso: false, 
                erro: `Item em recarga. Aguarde ${tempoRestante}s.`,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                proximoTurno: "jogador",
                estadoCombate: getEstadoCombateParaRetorno(combate)
            };
        }

        logDoTurno.push(`🎒 ${fichaJogador.nomePersonagem} usa ${itemBase.itemNome}!`);

        // Aplicar efeitos do item
        let efeitoAplicadoItem = false;
        switch (itemBase.efeito.tipoEfeito) {
            case "CURA_HP":
                const pvAntes = fichaJogador.pvAtual;
                fichaJogador.pvAtual = Math.min(fichaJogador.pvMax, fichaJogador.pvAtual + itemBase.efeito.valor);
                logDoTurno.push(`❤️ PV restaurado: +${fichaJogador.pvAtual - pvAntes} (Total: ${fichaJogador.pvAtual}/${fichaJogador.pvMax})`);
                efeitoAplicadoItem = true;
                break;
            case "CURA_PM":
                const pmAntes = fichaJogador.pmAtual;
                fichaJogador.pmAtual = Math.min(fichaJogador.pmMax, fichaJogador.pmAtual + itemBase.efeito.valor);
                logDoTurno.push(`💧 PM restaurado: +${fichaJogador.pmAtual - pmAntes} (Total: ${fichaJogador.pmAtual}/${fichaJogador.pmMax})`);
                efeitoAplicadoItem = true;
                break;
            default:
                logDoTurno.push(`✨ Efeito de ${itemBase.itemNome} aplicado!`);
                efeitoAplicadoItem = true;
                break;
        }

        if (efeitoAplicadoItem) {
            // Consumir item
            itemNoInventario.quantidade -= 1;
            if (itemNoInventario.quantidade <= 0) {
                fichaJogador.inventario = fichaJogador.inventario.filter(i => i.itemNome.toLowerCase() !== nomeItem.toLowerCase());
            }

            // Aplicar cooldown
            if (itemBase.cooldownSegundos) {
                if (!fichaJogador.cooldownsItens) fichaJogador.cooldownsItens = {};
                fichaJogador.cooldownsItens[cooldownKey] = Date.now() + (itemBase.cooldownSegundos * 1000);
            }
        }

        efeitoAplicado = true;
    }
    else {
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

    if (efeitoAplicado) {
        combate.log.push(...logDoTurno);

        if (mob.pvAtual <= 0) {
            logDoTurno.push(`🏆 ${mob.nome} foi derrotado!`);
            combate.numeroMobsDerrotadosNaMissao = (combate.numeroMobsDerrotadosNaMissao || 0) + 1;
            return { 
                sucesso: true,
                mobDerrotado: true,
                idCombate: idCombate,
                logTurnoAnterior: logDoTurno,
                estadoCombate: getEstadoCombateParaRetorno(combate),
                dadosParaFinalizar: {
                    idJogador: combate.idJogador,
                    mobInstancia: mob,
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

    return { sucesso: false, erro: "Nenhum efeito foi aplicado." };
}

async function processarTurnoMobCombate(idCombate, atualizarFichaNoCacheEDb) {
    const combate = combatesAtivos[idCombate];
    if (!combate) return { erro: "Combate não encontrado ou já finalizado.", combateTerminou: true };
    if (combate.turnoDoJogador) return { erro: "Ainda é o turno do jogador!", combateTerminou: false };
    if (combate.mobInstancia.pvAtual <= 0) return { erro: "Oponente já derrotado.", combateTerminou: true, vencedor: "jogador" };

    const fichaJogador = combate.fichaJogador;
    const mob = combate.mobInstancia;
    let logDoTurno = [];

    // Ação do Mob (Ataque Básico)
    const ataqueMob = mob.atributos.ataqueBase || 5;
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
    await atualizarFichaNoCacheEDb(combate.idJogador, fichaJogador);

    if (fichaJogador.pvAtual <= 0) {
        logDoTurno.push(`☠️ ${fichaJogador.nomePersonagem} foi derrotado!`);
        delete combatesAtivos[idCombate];
        return { 
            combateTerminou: true,
            vencedorFinal: "mob",
            logCombateFinal: [...combate.log],
            log: [...combate.log] 
        };
    }

    combate.turnoDoJogador = true;

    return { 
        sucesso: true, 
        idCombate: idCombate,
        logTurnoAnterior: logDoTurno,
        proximoTurno: "jogador",
        estadoCombate: getEstadoCombateParaRetorno(combate)
    };
}

function getEstadoCombateParaRetorno(combate) {
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

module.exports = {
    setCombatesAtivos,
    getCombatesAtivos,
    iniciarCombatePvE,
    processarAcaoJogadorCombate,
    processarTurnoMobCombate,
    getEstadoCombateParaRetorno
};
