// Sistema Completo de Feitiços para Arcádia
const FEITICOS_BASE_ARCADIA = require('../dados/feiticos.js');

class SistemaFeiticos {
    constructor() {
        this.efeitosAtivos = new Map(); // Armazena efeitos temporários ativos
        this.cooldowns = new Map(); // Armazena cooldowns de feitiços
    }

    // Função principal para processar uso de feitiço em combate
    async processarFeitico(fichaConjurador, idFeitico, alvo, combate, calcularValorDaFormula) {
        try {
            // Validações básicas
            const validacao = this.validarUsoFeitico(fichaConjurador, idFeitico);
            if (!validacao.sucesso) {
                return { sucesso: false, erro: validacao.erro };
            }

            const feiticoBase = FEITICOS_BASE_ARCADIA[idFeitico];
            const magiaAprendida = fichaConjurador.magiasConhecidas.find(m => m.id === idFeitico);
            const nivelFeitico = magiaAprendida.nivel;
            const detalhesNivel = feiticoBase.niveis.find(n => n.nivel === nivelFeitico);

            // Verificar e consumir recursos
            const consumoRecursos = this.consumirRecursos(fichaConjurador, detalhesNivel, feiticoBase);
            if (!consumoRecursos.sucesso) {
                return { sucesso: false, erro: consumoRecursos.erro };
            }

            // Aplicar cooldown
            this.aplicarCooldown(fichaConjurador, idFeitico, feiticoBase, detalhesNivel);

            // Processar efeito do feitiço
            const resultado = await this.executarEfeitoFeitico(
                feiticoBase, 
                detalhesNivel, 
                fichaConjurador, 
                alvo, 
                combate, 
                calcularValorDaFormula
            );

            return {
                sucesso: true,
                resultado: resultado,
                custoPM: detalhesNivel.custoPM,
                nomeFeitico: feiticoBase.nome,
                nivel: nivelFeitico
            };

        } catch (error) {
            console.error('[SISTEMA FEITIÇOS] Erro ao processar feitiço:', error);
            return { sucesso: false, erro: 'Erro interno ao processar feitiço.' };
        }
    }

    // Validar se o feitiço pode ser usado
    validarUsoFeitico(fichaConjurador, idFeitico) {
        const feiticoBase = FEITICOS_BASE_ARCADIA[idFeitico];
        if (!feiticoBase) {
            return { sucesso: false, erro: 'Feitiço não encontrado.' };
        }

        const magiaAprendida = fichaConjurador.magiasConhecidas?.find(m => m.id === idFeitico);
        if (!magiaAprendida) {
            return { sucesso: false, erro: 'Você não conhece este feitiço.' };
        }

        const detalhesNivel = feiticoBase.niveis.find(n => n.nivel === magiaAprendida.nivel);
        if (!detalhesNivel) {
            return { sucesso: false, erro: 'Nível do feitiço inválido.' };
        }

        // Verificar PM
        if (fichaConjurador.pmAtual < detalhesNivel.custoPM) {
            return { sucesso: false, erro: `Mana insuficiente. Necessário: ${detalhesNivel.custoPM} PM.` };
        }

        // Verificar cooldown
        const cooldownKey = `${idFeitico}_${fichaConjurador._id || fichaConjurador.idJogador}`;
        if (fichaConjurador.cooldownsFeiticos?.[cooldownKey] > Date.now()) {
            const tempoRestante = Math.ceil((fichaConjurador.cooldownsFeiticos[cooldownKey] - Date.now()) / 1000);
            return { sucesso: false, erro: `Feitiço em recarga. Aguarde ${tempoRestante}s.` };
        }

        // Verificar custos especiais (vida, etc.)
        if (detalhesNivel.custoVidaPercentArauto) {
            const custoVida = Math.floor(fichaConjurador.pvAtual * detalhesNivel.custoVidaPercentArauto);
            if (fichaConjurador.pvAtual <= custoVida) {
                return { sucesso: false, erro: 'Vida insuficiente para este feitiço.' };
            }
        }

        return { sucesso: true };
    }

    // Consumir recursos necessários
    consumirRecursos(fichaConjurador, detalhesNivel, feiticoBase) {
        // Consumir PM
        fichaConjurador.pmAtual -= detalhesNivel.custoPM;

        // Consumir vida se necessário (Arauto da Fortaleza)
        if (detalhesNivel.custoVidaPercentArauto) {
            const custoVida = Math.floor(fichaConjurador.pvAtual * detalhesNivel.custoVidaPercentArauto);
            fichaConjurador.pvAtual -= custoVida;
        }

        return { sucesso: true };
    }

    // Aplicar cooldown do feitiço
    aplicarCooldown(fichaConjurador, idFeitico, feiticoBase, detalhesNivel) {
        const cooldownSegundos = detalhesNivel.cooldownSegundos || feiticoBase.cooldownSegundos || 0;
        if (cooldownSegundos > 0) {
            if (!fichaConjurador.cooldownsFeiticos) {
                fichaConjurador.cooldownsFeiticos = {};
            }
            const cooldownKey = `${idFeitico}_${fichaConjurador._id || fichaConjurador.idJogador}`;
            fichaConjurador.cooldownsFeiticos[cooldownKey] = Date.now() + (cooldownSegundos * 1000);
        }
    }

    // Executar o efeito principal do feitiço
    async executarEfeitoFeitico(feiticoBase, detalhesNivel, conjurador, alvo, combate, calcularValorDaFormula) {
        const efeitoConfig = detalhesNivel.efeitoDetalhes;
        let mensagem = `✨ **${conjurador.nomePersonagem}** usou **${feiticoBase.nome}** (Nível ${detalhesNivel.nivel})!\n`;
        let resultados = [];

        // Processar diferentes tipos de feitiços
        switch (feiticoBase.tipo) {
            case 'cura_unico_purificacao':
            case 'cura':
                resultados.push(await this.processarCura(efeitoConfig, conjurador, alvo, calcularValorDaFormula));
                break;

            case 'dano_unico':
            case 'dano_area':
            case 'ataque_magico_unico':
            case 'ataque_magico_area':
                resultados.push(await this.processarDano(efeitoConfig, conjurador, alvo, combate, calcularValorDaFormula));
                break;

            case 'controle_unico_imobilizar':
            case 'controle_area':
                resultados.push(await this.processarControle(efeitoConfig, conjurador, alvo, combate));
                break;

            case 'buff_pessoal':
            case 'buff_aliado':
                resultados.push(await this.processarBuff(efeitoConfig, conjurador, alvo));
                break;

            case 'debuff_unico':
            case 'debuff_area':
                resultados.push(await this.processarDebuff(efeitoConfig, conjurador, alvo, combate));
                break;

            case 'invocacao_temporaria':
            case 'invocacao_temporaria_natureza':
                resultados.push(await this.processarInvocacao(efeitoConfig, conjurador, combate));
                break;

            case 'utilidade_deteccao_buff_pessoal':
            case 'utilidade_area_ocultacao':
                resultados.push(await this.processarUtilidade(efeitoConfig, conjurador, combate));
                break;

            case 'regeneracao_passiva_ativa_condicional_ambiente':
                resultados.push(await this.processarRegeneracao(efeitoConfig, conjurador));
                break;

            case 'ultimate_reviver_area_buff_poderoso':
                resultados.push(await this.processarUltimate(efeitoConfig, conjurador, combate));
                break;

            default:
                resultados.push(await this.processarEfeitoGenerico(efeitoConfig, conjurador, alvo, combate, calcularValorDaFormula));
                break;
        }

        // Processar efeitos adicionais
        if (efeitoConfig.removeCondicao) {
            resultados.push(this.processarRemocaoCondicoes(efeitoConfig.removeCondicao, alvo || conjurador));
        }

        if (efeitoConfig.buffAdicional) {
            resultados.push(this.processarBuffAdicional(efeitoConfig.buffAdicional, alvo || conjurador));
        }

        if (efeitoConfig.debuff) {
            resultados.push(this.processarDebuffAdicional(efeitoConfig.debuff, alvo, combate));
        }

        // Compilar mensagem final
        const mensagensValidas = resultados
            .filter(r => r && r.mensagem)
            .map(r => r.mensagem);
        
        mensagem += mensagensValidas.join('\n');

        return {
            mensagem: mensagem,
            efeitosAplicados: resultados.filter(r => r && r.efeito),
            danoTotal: resultados.reduce((total, r) => total + (r?.dano || 0), 0),
            curaTotal: resultados.reduce((total, r) => total + (r?.cura || 0), 0)
        };
    }

    // Processar feitiços de cura
    async processarCura(efeitoConfig, conjurador, alvo, calcularValorDaFormula) {
        const alvoReal = alvo || conjurador;
        let mensagem = '';
        let curaTotal = 0;

        if (efeitoConfig.tipoCura === 'PV' && efeitoConfig.formulaCura) {
            const valorCura = calcularValorDaFormula(efeitoConfig.formulaCura, conjurador.atributos);
            const pvAntes = alvoReal.pvAtual;
            alvoReal.pvAtual = Math.min(alvoReal.pvMax, alvoReal.pvAtual + valorCura);
            const curaEfetiva = alvoReal.pvAtual - pvAntes;
            curaTotal += curaEfetiva;
            mensagem += `💚 **${alvoReal.nomePersonagem}** foi curado em **${curaEfetiva}** PV! (${pvAntes} → ${alvoReal.pvAtual}/${alvoReal.pvMax})`;
        }

        if (efeitoConfig.tipoCura === 'PM' && efeitoConfig.formulaCura) {
            const valorCura = calcularValorDaFormula(efeitoConfig.formulaCura, conjurador.atributos);
            const pmAntes = alvoReal.pmAtual;
            alvoReal.pmAtual = Math.min(alvoReal.pmMax, alvoReal.pmAtual + valorCura);
            const curaEfetiva = alvoReal.pmAtual - pmAntes;
            mensagem += `💙 **${alvoReal.nomePersonagem}** restaurou **${curaEfetiva}** PM! (${pmAntes} → ${alvoReal.pmAtual}/${alvoReal.pmMax})`;
        }

        return { mensagem, cura: curaTotal };
    }

    // Processar feitiços de dano
    async processarDano(efeitoConfig, conjurador, alvo, combate, calcularValorDaFormula) {
        let mensagem = '';
        let danoTotal = 0;

        if (efeitoConfig.formulaDano) {
            const dano = calcularValorDaFormula(efeitoConfig.formulaDano, conjurador.atributos);
            
            if (efeitoConfig.alvo === 'area' || efeitoConfig.alvo === 'multi_proximo_opcional') {
                // Dano em área (por enquanto só no mob principal)
                if (combate && combate.mobInstancia) {
                    const pvAntes = combate.mobInstancia.pvAtual;
                    combate.mobInstancia.pvAtual = Math.max(0, combate.mobInstancia.pvAtual - dano);
                    danoTotal += dano;
                    const tipoDanoTexto = efeitoConfig.tipoDano ? ` de ${efeitoConfig.tipoDano}` : '';
                    mensagem += `💥 Causou **${dano}** de dano${tipoDanoTexto} em **${combate.mobInstancia.nome}**! (PV: ${pvAntes} → ${combate.mobInstancia.pvAtual}/${combate.mobInstancia.atributos.pvMax})`;
                }
            } else if (alvo) {
                // Dano em alvo único
                const pvAntes = alvo.pvAtual;
                alvo.pvAtual = Math.max(0, alvo.pvAtual - dano);
                danoTotal += dano;
                const tipoDanoTexto = efeitoConfig.tipoDano ? ` de ${efeitoConfig.tipoDano}` : '';
                mensagem += `💥 Causou **${dano}** de dano${tipoDanoTexto} em **${alvo.nome || alvo.nomePersonagem}**! (PV: ${pvAntes} → ${alvo.pvAtual}/${alvo.pvMax || alvo.atributos?.pvMax})`;
            }
        }

        // Processar dano por turno (DoT)
        if (efeitoConfig.formulaDanoPorTurno) {
            const danoPorTurno = calcularValorDaFormula(efeitoConfig.formulaDanoPorTurno, conjurador.atributos);
            const duracaoTurnos = efeitoConfig.duracaoTurnosDoT || 1;
            mensagem += `\n🔥 Aplicou efeito de **${danoPorTurno}** de dano por turno por **${duracaoTurnos}** turnos!`;
            
            // Aplicar efeito DoT
            this.aplicarEfeitoTemporario(alvo || combate?.mobInstancia, {
                tipo: 'dano_por_turno',
                valor: danoPorTurno,
                duracao: duracaoTurnos,
                tipoDano: efeitoConfig.tipoDano || 'Mágico'
            });
        }

        return { mensagem, dano: danoTotal };
    }

    // Processar feitiços de controle
    async processarControle(efeitoConfig, conjurador, alvo, combate) {
        let mensagem = '';
        const alvoReal = alvo || combate?.mobInstancia;

        if (efeitoConfig.condicao) {
            const condicao = efeitoConfig.condicao;
            mensagem += `🌪️ **${alvoReal.nome || alvoReal.nomePersonagem}** foi afetado por: **${condicao.nome}**`;
            
            if (condicao.duracaoTurnos) {
                mensagem += ` por **${condicao.duracaoTurnos}** turnos`;
            }

            // Aplicar condição de controle
            this.aplicarEfeitoTemporario(alvoReal, {
                tipo: 'condicao_controle',
                nome: condicao.nome,
                duracao: condicao.duracaoTurnos || 1,
                testeResistencia: condicao.testeResistencia
            });
        }

        return { mensagem };
    }

    // Processar buffs
    async processarBuff(efeitoConfig, conjurador, alvo) {
        let mensagem = '';
        const alvoReal = alvo || conjurador;

        if (efeitoConfig.buffs) {
            efeitoConfig.buffs.forEach(buff => {
                mensagem += `📈 **${alvoReal.nomePersonagem}** ganhou bônus em **${buff.atributo}**`;
                if (buff.valor) {
                    mensagem += ` (+${buff.valor})`;
                }
                if (buff.duracaoTurnos) {
                    mensagem += ` por **${buff.duracaoTurnos}** turnos`;
                }
                mensagem += '\n';

                // Aplicar buff temporário
                this.aplicarEfeitoTemporario(alvoReal, {
                    tipo: 'buff',
                    atributo: buff.atributo,
                    valor: buff.valor,
                    duracao: buff.duracaoTurnos || 1,
                    modificador: buff.modificador || 'aditivo'
                });
            });
        }

        return { mensagem };
    }

    // Processar debuffs
    async processarDebuff(efeitoConfig, conjurador, alvo, combate) {
        let mensagem = '';
        const alvoReal = alvo || combate?.mobInstancia;

        if (efeitoConfig.debuff || efeitoConfig.debuffs) {
            const debuffs = efeitoConfig.debuffs || [efeitoConfig.debuff];
            
            debuffs.forEach(debuff => {
                mensagem += `📉 **${alvoReal.nome || alvoReal.nomePersonagem}** sofreu penalidade em **${debuff.atributo}**`;
                if (debuff.valor) {
                    mensagem += ` (-${debuff.valor})`;
                }
                if (debuff.duracaoTurnos) {
                    mensagem += ` por **${debuff.duracaoTurnos}** turnos`;
                }
                mensagem += '\n';

                // Aplicar debuff temporário
                this.aplicarEfeitoTemporario(alvoReal, {
                    tipo: 'debuff',
                    atributo: debuff.atributo,
                    valor: debuff.valor,
                    duracao: debuff.duracaoTurnos || 1,
                    modificador: debuff.modificador || 'negativo'
                });
            });
        }

        return { mensagem };
    }

    // Processar invocações
    async processarInvocacao(efeitoConfig, conjurador, combate) {
        let mensagem = '';

        if (efeitoConfig.tipoInvocacao) {
            const duracao = efeitoConfig.duracaoMinutos || 1;
            mensagem += `🐉 **${conjurador.nomePersonagem}** invocou: **${this.obterNomeInvocacao(efeitoConfig)}**!`;
            mensagem += ` (Duração: ${duracao} min)`;

            // Adicionar invocação ao combate
            if (combate) {
                if (!combate.invocacoes) combate.invocacoes = [];
                combate.invocacoes.push({
                    tipo: efeitoConfig.tipoInvocacao,
                    conjurador: conjurador.nomePersonagem,
                    duracao: duracao,
                    criadoEm: Date.now(),
                    podeAtacar: efeitoConfig.podemCombater || false,
                    podeProteger: efeitoConfig.podemCombaterProteger || false
                });
            }
        }

        return { mensagem };
    }

    // Processar feitiços de utilidade
    async processarUtilidade(efeitoConfig, conjurador, combate) {
        let mensagem = '';

        if (efeitoConfig.efeitoDeteccao) {
            mensagem += `🔍 **${conjurador.nomePersonagem}** ativou detecção mágica!`;
            if (efeitoConfig.efeitoDeteccao.raioMetros) {
                mensagem += ` (Raio: ${efeitoConfig.efeitoDeteccao.raioMetros}m)`;
            }
        }

        if (efeitoConfig.tipoEfeito === 'cortina_fumaca') {
            mensagem += `💨 **${conjurador.nomePersonagem}** criou uma cortina de fumaça!`;
            if (efeitoConfig.raioMetros) {
                mensagem += ` (Raio: ${efeitoConfig.raioMetros}m)`;
            }
            if (efeitoConfig.penalidadeAcertoInimigoPercent) {
                mensagem += ` Inimigos têm -${Math.round(efeitoConfig.penalidadeAcertoInimigoPercent * 100)}% chance de acerto`;
            }
        }

        return { mensagem };
    }

    // Processar regeneração
    async processarRegeneracao(efeitoConfig, conjurador) {
        let mensagem = '';

        if (efeitoConfig.passivo && efeitoConfig.passivo.regeneracaoPVPMporMinuto) {
            mensagem += `🌟 **${conjurador.nomePersonagem}** ativou regeneração passiva!`;
            mensagem += ` (+${efeitoConfig.passivo.regeneracaoPVPMporMinuto} PV/PM por minuto)`;
        }

        if (efeitoConfig.ativo) {
            const cura = efeitoConfig.ativo.formulaCura;
            if (cura) {
                mensagem += `\n💚 Cura ativa disponível!`;
            }
        }

        return { mensagem };
    }

    // Processar ultimates
    async processarUltimate(efeitoConfig, conjurador, combate) {
        let mensagem = '';

        if (efeitoConfig.tipoEfeito === 'area_reviver_buff_faramis') {
            mensagem += `⚡ **${conjurador.nomePersonagem}** ativou **Intervenção Divina**!`;
            if (efeitoConfig.raioMetros) {
                mensagem += ` (Raio: ${efeitoConfig.raioMetros}m)`;
            }
            if (efeitoConfig.percentPVPMReviver) {
                mensagem += ` Aliados caídos revivem com ${Math.round(efeitoConfig.percentPVPMReviver * 100)}% PV/PM`;
            }
        }

        return { mensagem };
    }

    // Processar efeito genérico
    async processarEfeitoGenerico(efeitoConfig, conjurador, alvo, combate, calcularValorDaFormula) {
        let mensagem = '🔮 Efeito mágico ativado!';
        
        // Tentar processar efeitos conhecidos
        if (efeitoConfig.formulaDano) {
            return await this.processarDano(efeitoConfig, conjurador, alvo, combate, calcularValorDaFormula);
        }
        
        if (efeitoConfig.formulaCura) {
            return await this.processarCura(efeitoConfig, conjurador, alvo, calcularValorDaFormula);
        }

        return { mensagem };
    }

    // Processar remoção de condições
    processarRemocaoCondicoes(removeConfig, alvo) {
        let mensagem = '';
        
        if (removeConfig.tipo) {
            const tipos = Array.isArray(removeConfig.tipo) ? removeConfig.tipo : [removeConfig.tipo];
            mensagem += `✨ Condições removidas de **${alvo.nomePersonagem || alvo.nome}**: ${tipos.join(', ')}`;
        }

        return { mensagem };
    }

    // Processar buff adicional
    processarBuffAdicional(buffConfig, alvo) {
        let mensagem = '';
        
        if (buffConfig.nome) {
            mensagem += `🔮 **${alvo.nomePersonagem || alvo.nome}** recebeu: **${buffConfig.nome}**`;
            if (buffConfig.duracaoTurnos) {
                mensagem += ` por ${buffConfig.duracaoTurnos} turnos`;
            }
        }

        return { mensagem };
    }

    // Processar debuff adicional
    processarDebuffAdicional(debuffConfig, alvo, combate) {
        let mensagem = '';
        const alvoReal = alvo || combate?.mobInstancia;
        
        if (debuffConfig.atributo) {
            mensagem += `📉 **${alvoReal.nome || alvoReal.nomePersonagem}** sofreu penalidade em **${debuffConfig.atributo}**`;
            if (debuffConfig.valor) {
                mensagem += ` (-${debuffConfig.valor})`;
            }
        }

        return { mensagem };
    }

    // Aplicar efeito temporário
    aplicarEfeitoTemporario(alvo, efeito) {
        if (!alvo.efeitosTemporarios) {
            alvo.efeitosTemporarios = [];
        }

        alvo.efeitosTemporarios.push({
            ...efeito,
            inicioTurno: Date.now(),
            turnosRestantes: efeito.duracao
        });
    }

    // Obter nome da invocação
    obterNomeInvocacao(efeitoConfig) {
        if (efeitoConfig.nomeCriatura) return efeitoConfig.nomeCriatura;
        if (efeitoConfig.nomeCriaturaBase) return efeitoConfig.nomeCriaturaBase;
        
        // Mapear tipos de invocação para nomes
        const nomes = {
            'espiritos_menores_natureza': 'Espíritos da Natureza',
            'lobo_espiritual': 'Lobo Espiritual',
            'urso_espiritual_menor': 'Urso Espiritual',
            'guardiao_arboreo_pequeno': 'Guardião Arbóreo',
            'ent_menor': 'Ent Menor',
            'esqueleto_guerreiro': 'Esqueleto Guerreiro',
            'zumbi_putrefato': 'Zumbi Pútrido',
            'espectro_sombrio': 'Espectro Sombrio'
        };

        return nomes[efeitoConfig.tipoInvocacao] || 'Criatura Mágica';
    }

    // Processar efeitos por turno (DoT, regeneração, etc.)
    processarEfeitosPorTurno(entidade) {
        if (!entidade.efeitosTemporarios) return [];

        const mensagens = [];
        const efeitosParaRemover = [];

        entidade.efeitosTemporarios.forEach((efeito, index) => {
            if (efeito.turnosRestantes <= 0) {
                efeitosParaRemover.push(index);
                return;
            }

            switch (efeito.tipo) {
                case 'dano_por_turno':
                    entidade.pvAtual = Math.max(0, entidade.pvAtual - efeito.valor);
                    mensagens.push(`🔥 **${entidade.nome || entidade.nomePersonagem}** sofreu ${efeito.valor} de dano de ${efeito.tipoDano}!`);
                    break;

                case 'regeneracao':
                    const cura = Math.min(efeito.valor, entidade.pvMax - entidade.pvAtual);
                    entidade.pvAtual += cura;
                    if (cura > 0) {
                        mensagens.push(`💚 **${entidade.nome || entidade.nomePersonagem}** regenerou ${cura} PV!`);
                    }
                    break;

                case 'buff':
                case 'debuff':
                    // Efeitos de atributo são aplicados durante os cálculos
                    break;
            }

            efeito.turnosRestantes--;
        });

        // Remover efeitos expirados
        efeitosParaRemover.reverse().forEach(index => {
            entidade.efeitosTemporarios.splice(index, 1);
        });

        return mensagens;
    }

    // Obter modificadores ativos de uma entidade
    obterModificadoresAtivos(entidade) {
        if (!entidade.efeitosTemporarios) return {};

        const modificadores = {};

        entidade.efeitosTemporarios.forEach(efeito => {
            if (efeito.tipo === 'buff' || efeito.tipo === 'debuff') {
                if (!modificadores[efeito.atributo]) {
                    modificadores[efeito.atributo] = { aditivo: 0, multiplicativo: 1 };
                }

                if (efeito.modificador === 'multiplicativo') {
                    modificadores[efeito.atributo].multiplicativo *= (1 + efeito.valor);
                } else {
                    modificadores[efeito.atributo].aditivo += efeito.valor * (efeito.tipo === 'debuff' ? -1 : 1);
                }
            }
        });

        return modificadores;
    }

    // Limpar efeitos expirados
    limparEfeitosExpirados(entidade) {
        if (!entidade.efeitosTemporarios) return;

        entidade.efeitosTemporarios = entidade.efeitosTemporarios.filter(
            efeito => efeito.turnosRestantes > 0
        );
    }
}

module.exports = SistemaFeiticos;
