
// Sistema de Viagens e Exploração - Arcádia RPG
module.exports = {
    // ===== REGIÕES E LOCAIS =====
    regioes: {
        "pradarias_valdoria": {
            id: "pradarias_valdoria",
            nome: "Pradarias de Valdoria",
            descricao: "Vastas planícies douradas onde comerciantes viajam entre cidades prósperas.",
            nivelMinimo: 1,
            nivelMaximo: 15,
            tempoViagemBaseMinutos: 30,
            custoFlorins: 10,
            reino: "Valdoria",
            imagem: "https://example.com/pradarias.jpg",
            clima: "temperado",
            terreno: "planicie",
            pontos_interesse: [
                {
                    id: "vila_mercadores",
                    nome: "Vila dos Mercadores",
                    tipo: "comercio",
                    descricao: "Pequena vila com comerciantes experientes."
                },
                {
                    id: "ruinas_antigas",
                    nome: "Ruínas do Forte Perdido",
                    tipo: "exploracao",
                    descricao: "Restos de uma fortaleza abandonada há décadas."
                }
            ],
            mobs_regiao: ["lobo_das_pradarias", "bandido_estrada", "javali_selvagem"],
            recursos_coletaveis: ["ervas_medicinais", "madeira_comum", "pedras_pequenas"]
        },

        "florestas_elarion": {
            id: "florestas_elarion",
            nome: "Florestas Ancestrais de Elarion",
            descricao: "Antigas florestas élficas repletas de magia e mistérios milenares.",
            nivelMinimo: 5,
            nivelMaximo: 20,
            tempoViagemBaseMinutos: 45,
            custoFlorins: 15,
            reino: "Elarion",
            imagem: "https://example.com/floresta_elfica.jpg",
            clima: "magico",
            terreno: "floresta",
            pontos_interesse: [
                {
                    id: "arvore_vida",
                    nome: "Árvore da Vida Eterna",
                    tipo: "magico",
                    descricao: "Uma árvore colossal que irradia energia mágica pura."
                },
                {
                    id: "observatorio_elfos",
                    nome: "Observatório Élfico",
                    tipo: "conhecimento",
                    descricao: "Torre onde os elfos estudam as estrelas e o tempo."
                }
            ],
            mobs_regiao: ["lobo_fantasma", "elemental_natureza", "guardiao_floresta"],
            recursos_coletaveis: ["essencia_magica", "frutos_elficos", "cristais_natureza"]
        },

        "montanhas_durnholde": {
            id: "montanhas_durnholde",
            nome: "Montanhas Rochosas de Durnholde",
            descricao: "Picos nevados onde os anões forjam as melhores armas do mundo.",
            nivelMinimo: 15,
            nivelMaximo: 30,
            tempoViagemBaseMinutos: 60,
            custoFlorins: 25,
            reino: "Durnholde",
            imagem: "https://example.com/montanhas.jpg",
            clima: "frio",
            terreno: "montanha",
            pontos_interesse: [
                {
                    id: "forjas_eternas",
                    nome: "Forjas Eternas",
                    tipo: "artesanato",
                    descricao: "Forjas anãs que nunca se apagam, aquecidas pelo coração da montanha."
                },
                {
                    id: "minas_profundas",
                    nome: "Minas dos Cristais Profundos",
                    tipo: "mineracao",
                    descricao: "Túneis que se estendem até o núcleo da montanha."
                }
            ],
            mobs_regiao: ["troll_montanha", "dragao_gelo_jovem", "elemental_pedra"],
            recursos_coletaveis: ["minerios_raros", "gemas_poder", "ferro_durnholde"]
        },

        "pantanos_thornmere": {
            id: "pantanos_thornmere",
            nome: "Pântanos Sombrios de Thornmere",
            descricao: "Terras alagadiças onde criaturas estranhas vagam entre névoas venenosas.",
            nivelMinimo: 20,
            nivelMaximo: 35,
            tempoViagemBaseMinutos: 75,
            custoFlorins: 30,
            reino: "Thornmere",
            imagem: "https://example.com/pantano.jpg",
            clima: "umido",
            terreno: "pantano",
            pontos_interesse: [
                {
                    id: "torre_bruxa",
                    nome: "Torre da Bruxa dos Pântanos",
                    tipo: "magia_sombria",
                    descricao: "Uma torre retorcida habitada por uma bruxa ancestral."
                },
                {
                    id: "cemiterio_perdido",
                    nome: "Cemitério dos Esquecidos",
                    tipo: "mortos_vivos",
                    descricao: "Local onde os mortos não descansam em paz."
                }
            ],
            mobs_regiao: ["hidra_pantano", "esqueleto_guerreiro", "bruxa_menor"],
            recursos_coletaveis: ["plantas_venenosas", "ossos_antigos", "lama_magica"]
        },

        "desertos_ravengard": {
            id: "desertos_ravengard",
            nome: "Desertos Sombrios de Ravengard",
            descricao: "Areias negras sob um céu vermelho, onde apenas os mais resistentes sobrevivem.",
            nivelMinimo: 30,
            nivelMaximo: 45,
            tempoViagemBaseMinutos: 90,
            custoFlorins: 40,
            reino: "Ravengard",
            imagem: "https://example.com/deserto_sombrio.jpg",
            clima: "seco_quente",
            terreno: "deserto",
            pontos_interesse: [
                {
                    id: "oasis_ilusorio",
                    nome: "Oásis das Ilusões",
                    tipo: "armadilha",
                    descricao: "Um oásis que pode ser real... ou uma armadilha mortal."
                },
                {
                    id: "tumulo_rei_esquecido",
                    nome: "Tumba do Rei Esquecido",
                    tipo: "tesouro",
                    descricao: "Pirâmide enterrada contendo tesouros inimagináveis."
                }
            ],
            mobs_regiao: ["escorpiao_gigante", "mumia_guardiao", "demonio_areia"],
            recursos_coletaveis: ["areia_temporal", "cristais_sombra", "reliquias_antigas"]
        },

        "ilha_morwyn": {
            id: "ilha_morwyn",
            nome: "Ilha Misteriosa de Morwyn",
            descricao: "Ilha envolta em névoa eterna, onde a realidade se dobra às leis da magia.",
            nivelMinimo: 40,
            nivelMaximo: 60,
            tempoViagemBaseMinutos: 120,
            custoFlorins: 75,
            reino: "Isle of Morwyn",
            imagem: "https://example.com/ilha_magica.jpg",
            clima: "magico_instavel",
            terreno: "ilha",
            requerViagem: "navio_magico",
            pontos_interesse: [
                {
                    id: "biblioteca_perdida",
                    nome: "Biblioteca dos Conhecimentos Perdidos",
                    tipo: "conhecimento_supremo",
                    descricao: "Contém feitiços e conhecimentos banidos de outros reinos."
                },
                {
                    id: "portal_dimensional",
                    nome: "Portal para Outras Dimensões",
                    tipo: "portal",
                    descricao: "Gateway instável para realidades paralelas."
                }
            ],
            mobs_regiao: ["arquimago_corrompido", "elemental_caos", "aberracao_dimensional"],
            recursos_coletaveis: ["essencia_pura", "fragmentos_realidade", "conhecimento_proibido"]
        }
    },

    // ===== EVENTOS DE VIAGEM =====
    eventosViagem: {
        // Eventos Positivos
        "mercador_viajante": {
            id: "mercador_viajante",
            nome: "Mercador Viajante",
            tipo: "comercio",
            chance: 0.15,
            nivelMinimo: 1,
            descricao: "Você encontra um mercador simpático vendendo itens úteis.",
            opcoes: [
                {
                    texto: "Comprar itens",
                    acao: "abrir_loja_viagem",
                    custoFlorins: 0
                },
                {
                    texto: "Apenas conversar",
                    acao: "bonus_informacao",
                    recompensa: "dica_sobre_regiao"
                }
            ]
        },

        "fonte_magica": {
            id: "fonte_magica",
            nome: "Fonte Mágica Oculta",
            tipo: "cura",
            chance: 0.08,
            nivelMinimo: 5,
            descricao: "Uma fonte cristalina irradia energia mágica restauradora.",
            efeito: {
                tipo: "restauracao_completa",
                restauraPV: 1.0,
                restauraPM: 1.0,
                removeTodosDebuffs: true
            }
        },

        "tesouro_escondido": {
            id: "tesouro_escondido",
            nome: "Baú do Tesouro Antigo",
            tipo: "tesouro",
            chance: 0.05,
            nivelMinimo: 10,
            descricao: "Você descobre um baú antigo meio enterrado na vegetação.",
            recompensas: [
                { tipo: "florins", quantidadeMin: 50, quantidadeMax: 150 },
                { tipo: "item_aleatorio", raridade: "incomum" },
                { tipo: "essencia", quantidadeMin: 2, quantidadeMax: 5 }
            ]
        },

        // Eventos Neutros/Informativos
        "viajante_perdido": {
            id: "viajante_perdido",
            nome: "Viajante Perdido",
            tipo: "informacao",
            chance: 0.12,
            nivelMinimo: 1,
            descricao: "Um viajante confuso pede direções e compartilha notícias.",
            efeito: {
                tipo: "informacao_regiao",
                revelaLocaisOcultos: true,
                dicas: "eventos_futuros"
            }
        },

        // Eventos Negativos/Desafios
        "emboscada_bandidos": {
            id: "emboscada_bandidos",
            nome: "Emboscada de Bandidos",
            tipo: "combate",
            chance: 0.20,
            nivelMinimo: 3,
            descricao: "Bandidos saltam dos arbustos bloqueando sua passagem!",
            opcoes: [
                {
                    texto: "Lutar contra os bandidos",
                    acao: "iniciar_combate",
                    mobId: "grupo_bandidos_viagem"
                },
                {
                    texto: "Tentar subornar (50 FO)",
                    acao: "suborno",
                    custoFlorins: 50,
                    chanceSuccesso: 0.70
                },
                {
                    texto: "Fugir (chance de perseguição)",
                    acao: "fuga",
                    chanceSuccesso: 0.60,
                    penalidade: "aumenta_tempo_viagem"
                }
            ]
        },

        "tempestade_magica": {
            id: "tempestade_magica",
            nome: "Tempestade Mágica",
            tipo: "perigo_ambiental",
            chance: 0.10,
            nivelMinimo: 15,
            descricao: "Uma tempestade carregada de energia mágica bloqueia seu caminho.",
            efeito: {
                tipo: "debuff_temporario",
                debuffs: [
                    { atributo: "pmMax", modificador: -0.25, duracaoMinutos: 60 }
                ],
                aumentoTempoViagem: 0.50
            },
            opcoes: [
                {
                    texto: "Atravessar a tempestade",
                    acao: "resistir_tempestade",
                    testAtributo: "vitalidade",
                    dificuldade: 25
                },
                {
                    texto: "Esperar passar (+50% tempo)",
                    acao: "esperar",
                    aumentoTempo: 0.50
                }
            ]
        },

        "criatura_territorial": {
            id: "criatura_territorial",
            nome: "Criatura Territorial",
            tipo: "encontro_especial",
            chance: 0.08,
            nivelMinimo: 20,
            descricao: "Uma poderosa criatura marca território e não quer intrusos.",
            opcoes: [
                {
                    texto: "Enfrentar a criatura",
                    acao: "combate_elite",
                    mobId: "criatura_territorial_boss"
                },
                {
                    texto: "Mostrar respeito e passar",
                    acao: "teste_carisma",
                    testAtributo: "carisma",
                    dificuldade: 30,
                    recompensaSuccesso: "bencao_criatura"
                },
                {
                    texto: "Contornar (+75% tempo)",
                    acao: "contornar",
                    aumentoTempo: 0.75
                }
            ]
        }
    },

    // ===== MODIFICADORES DE VIAGEM =====
    modificadoresViagem: {
        // Baseado em atributos do jogador
        agilidade: {
            25: { reducaoTempo: 0.10, bonusEvento: 0.05 },
            50: { reducaoTempo: 0.20, bonusEvento: 0.10 },
            75: { reducaoTempo: 0.30, bonusEvento: 0.15 }
        },
        
        // Baseado em itens equipados
        "botas_viajante": { reducaoTempo: 0.15, reducaoCusto: 0.10 },
        "mapa_detalhado": { reducaoTempo: 0.05, revelaEventos: true },
        "amuleto_protecao": { reducaoEventosNegativos: 0.25 },
        
        // Baseado em feitiços ativos
        "velocidade_magica": { reducaoTempo: 0.25, duracaoMinutos: 120 },
        "protecao_viagem": { reducaoEventosNegativos: 0.50, duracaoMinutos: 180 }
    },

    // ===== MOBS ESPECÍFICOS DE VIAGEM =====
    mobsViagem: {
        "grupo_bandidos_viagem": {
            id: "grupo_bandidos_viagem",
            nome: "Grupo de Bandidos",
            tipo: "grupo",
            quantidade: 3,
            nivelBase: 8,
            descricao: "Três bandidos armados bloqueiam a estrada.",
            lootTable: [
                { itemId: "moedas_bandidos", quantidadeMin: 20, quantidadeMax: 40, chanceDrop: 0.8 },
                { itemId: "adaga simples", quantidadeMin: 1, quantidadeMax: 1, chanceDrop: 0.3 }
            ],
            xpRecompensa: 45,
            florinsRecompensaMin: 15,
            florinsRecompensaMax: 35
        },

        "criatura_territorial_boss": {
            id: "criatura_territorial_boss",
            nome: "Guardião Ancestral",
            tipo: "boss",
            nivel: 25,
            descricao: "Uma criatura majestosa que protege estes territórios há séculos.",
            atributos: {
                pvMax: 450,
                ataqueBase: 35,
                defesaBase: 20,
                agilidade: 25,
                precisao: 85
            },
            habilidadesEspeciais: [
                "rugido_intimidante",
                "golpe_territorial",
                "regeneracao_natural"
            ],
            lootTable: [
                { itemId: "bencao_natureza", quantidadeMin: 1, quantidadeMax: 1, chanceDrop: 1.0 },
                { itemId: "essencia_guardiao", quantidadeMin: 2, quantidadeMax: 4, chanceDrop: 0.7 }
            ],
            xpRecompensa: 200,
            florinsRecompensaMin: 80,
            florinsRecompensaMax: 120
        }
    },

    // ===== CONFIGURAÇÕES DO SISTEMA =====
    configuracoes: {
        tempoRealPorMinutoJogo: 1, // 1 minuto real = 1 minuto de viagem
        maxViagensSimultaneas: 1,
        custoEnergia: true,
        permiteCancelarViagem: true,
        penaliadeCancelamento: 0.50, // 50% do custo perdido
        
        // Multiplicadores por nível de dificuldade
        multiplicadoresNivel: {
            facil: { tempo: 0.75, custo: 0.75, eventos: 0.50 },
            normal: { tempo: 1.0, custo: 1.0, eventos: 1.0 },
            dificil: { tempo: 1.25, custo: 1.25, eventos: 1.50 },
            pesadelo: { tempo: 1.50, custo: 1.50, eventos: 2.0 }
        }
    }
};
