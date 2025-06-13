// Sistema de Sacos de Pancada (Dummies) para Testes

// Configurações padrão para diferentes tipos de dummies
const TIPOS_DUMMIES = {
        basico: {
            nome: "Saco de Pancada Básico",
            nivel: 10,
            atributos: {
                forca: 15,
                agilidade: 10,
                vitalidade: 20,
                manabase: 5,
                intelecto: 8,
                carisma: 5
            },
            pvBase: 150,
            pmBase: 50,
            contraataca: false,
            resistencias: {},
            descricao: "Um saco de pancada básico para testes simples de combate."
        },
        resistente: {
            nome: "Saco de Pancada Resistente",
            nivel: 20,
            atributos: {
                forca: 20,
                agilidade: 8,
                vitalidade: 35,
                manabase: 10,
                intelecto: 12,
                carisma: 8
            },
            pvBase: 400,
            pmBase: 100,
            contraataca: false,
            resistencias: {
                fisico: 0.2,
                magico: 0.1
            },
            descricao: "Um saco de pancada reforçado com alta resistência a danos."
        },
        magico: {
            nome: "Saco de Pancada Mágico",
            nivel: 25,
            atributos: {
                forca: 12,
                agilidade: 15,
                vitalidade: 25,
                manabase: 30,
                intelecto: 28,
                carisma: 20
            },
            pvBase: 300,
            pmBase: 400,
            contraataca: true,
            resistencias: {
                magico: 0.3,
                fogo: 0.2,
                gelo: 0.2,
                raio: 0.2
            },
            descricao: "Um saco de pancada imbuído com magia, capaz de contra-atacar com feitiços simples."
        },
        agil: {
            nome: "Saco de Pancada Ágil",
            nivel: 18,
            atributos: {
                forca: 18,
                agilidade: 30,
                vitalidade: 22,
                manabase: 15,
                intelecto: 15,
                carisma: 12
            },
            pvBase: 250,
            pmBase: 150,
            contraataca: true,
            resistencias: {
                fisico: 0.1
            },
            descricao: "Um saco de pancada móvel que pode esquivar e contra-atacar rapidamente."
        },
        personalizado: {
            nome: "Saco de Pancada Personalizado",
            nivel: 15,
            atributos: {
                forca: 15,
                agilidade: 15,
                vitalidade: 25,
                manabase: 15,
                intelecto: 15,
                carisma: 10
            },
            pvBase: 200,
            pmBase: 150,
            contraataca: false,
            resistencias: {},
            descricao: "Um saco de pancada com configurações personalizáveis."
        }
};

// Feitiços simples que dummies mágicos podem usar
const FEITICOS_DUMMY = {
        "contra_ataque_basico": {
            nome: "Contra-ataque Básico",
            tipo: "ataque_fisico",
            custoPM: 5,
            dano: "forca * 0.8",
            descricao: "Um contra-ataque físico simples."
        },
        "rajada_magica": {
            nome: "Rajada Mágica",
            tipo: "ataque_magico",
            custoPM: 10,
            dano: "intelecto * 1.2",
            descricao: "Uma rajada de energia mágica básica."
        },
        "cura_automatica": {
            nome: "Cura Automática",
            tipo: "cura",
            custoPM: 15,
            cura: "intelecto * 0.5 + carisma * 0.3",
            descricao: "Uma cura automática quando PV fica baixo."
        }
};

// Função para gerar um dummy baseado no tipo
function gerarDummy(nome, tipo = 'basico', configuracaoCustom = {}) {
    const tipoBase = TIPOS_DUMMIES[tipo] || TIPOS_DUMMIES.basico;
    
    const dummy = {
        _id: `dummy_${nome.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        nome: configuracaoCustom.nome || nome,
        tipo: tipo,
        nivel: configuracaoCustom.nivel || tipoBase.nivel,
        atributos: { ...tipoBase.atributos, ...configuracaoCustom.atributos },
        pvMaximo: configuracaoCustom.pv || tipoBase.pvBase,
        pvAtual: configuracaoCustom.pv || tipoBase.pvBase,
        pmMaximo: configuracaoCustom.pm || tipoBase.pmBase,
        pmAtual: configuracaoCustom.pm || tipoBase.pmBase,
        defesa: tipoBase.atributos.vitalidade + (configuracaoCustom.nivel || tipoBase.nivel),
        resistenciaMagica: tipoBase.atributos.intelecto + (configuracaoCustom.nivel || tipoBase.nivel) * 0.5,
        agilidade: tipoBase.atributos.agilidade,
        contraataca: configuracaoCustom.contraataca !== undefined ? configuracaoCustom.contraataca : tipoBase.contraataca,
        resistencias: { ...tipoBase.resistencias, ...configuracaoCustom.resistencias },
        descricao: configuracaoCustom.descricao || tipoBase.descricao,
        criadoEm: new Date(),
        criadoPor: configuracaoCustom.criadoPor || "admin",
        ativo: true,
        // Feitiços que o dummy pode usar (se contraataca)
        feiticosDisponiveis: tipoBase.contraataca ? ["contra_ataque_basico", "rajada_magica"] : [],
        // Comportamento de IA simples
        comportamento: {
            usaCuraQuandoPVBaixo: tipo === 'magico',
            percentualPVParaCura: 30,
            chanceContraAtaque: tipo === 'agil' ? 0.7 : (tipo === 'magico' ? 0.5 : 0.3)
        }
    };

    return dummy;
}

// Função para calcular dano baseado em fórmula
function calcularDanoDummy(formula, atributosDummy) {
    try {
        let expressao = formula.toLowerCase();
        
        // Substituir atributos na fórmula
        Object.keys(atributosDummy).forEach(attr => {
            const regex = new RegExp(attr, 'g');
            expressao = expressao.replace(regex, atributosDummy[attr]);
        });
        
        // Avaliar a expressão matematicamente (básico)
        return Math.floor(eval(expressao)) || 0;
    } catch (error) {
        console.error("[DUMMY] Erro ao calcular fórmula:", error);
        return 0;
    }
}

module.exports = {
    TIPOS_DUMMIES,
    FEITICOS_DUMMY,
    gerarDummy,
    calcularDanoDummy
};
