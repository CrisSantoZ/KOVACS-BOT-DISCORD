// arcadia_sistema.js - Lógica Central e Dados do RPG Arcádia (V5 Final)

const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');

// --- ATRIBUTOS VÁLIDOS ---
const atributosValidos = ["forca", "agilidade", "vitalidade", "manabase", "intelecto", "carisma"];

// --- CONFIGURAÇÃO DO MONGODB (lidas do process.env no index.js) ---
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "arcadia_rpg_db";
const MONGODB_FICHAS_COLLECTION = process.env.MONGODB_FICHAS_COLLECTION || "fichas_arcadia";

// --- CONSTANTES DE CONFIGURAÇÃO DO SERVIDOR DISCORD ---
const ID_CANAL_BOAS_VINDAS_RPG = process.env.ID_CANAL_BOAS_VINDAS_RPG;
const ID_CANAL_RECRUTAMENTO = process.env.ID_CANAL_RECRUTAMENTO;
const ID_CANAL_ATUALIZACAO_FICHAS = process.env.ID_CANAL_ATUALIZACAO_FICHAS;
const NOME_CARGO_VISITANTE = process.env.NOME_CARGO_VISITANTE || "Visitante de Arcádia";
const NOME_CARGO_AVENTUREIRO = process.env.NOME_CARGO_AVENTUREIRO || "Aventureiro De Arcádia";

// =====================================================================================
// DADOS DO JOGO (RAÇAS, CLASSES, REINOS, FEITIÇOS, ITENS)
// =====================================================================================

const RACAS_ARCADIA = [
    { nome: "Eldari", grupo: "Puros", desc: "Elfos nobres com domínio natural da magia arcana, conhecidos por sua sabedoria ancestral e afinidade com energias etéreas. Tendem a ser excelentes conjuradores.", nomeCargo: "Raça: Eldari" },
    { nome: "Valtheran", grupo: "Puros", desc: "Anões de montanhas profundas, exímios forjadores e guerreiros resistentes. Valorizam a honra, a tradição e a força bruta.", nomeCargo: "Raça: Valtheran" },
    { nome: "Seraphim", grupo: "Puros", desc: "Raça alada de aparência angelical, guardiões antigos de locais sagrados. Possuem uma ligação natural com magias de proteção e cura.", nomeCargo: "Raça: Seraphim" },
    { nome: "Terrano", grupo: "Humanos", desc: "Humanos comuns, adaptáveis e versáteis, capazes de se destacar em diversas vocações, desde o combate até as artes arcanas.", nomeCargo: "Raça: Terrano" },
    { nome: "Vharen", grupo: "Humanos", desc: "Humanos com sangue de antigos magos, sensíveis à magia e com predisposição natural para o estudo das artes arcanas e elementais.", nomeCargo: "Raça: Vharen" },
    { nome: "Drakyn", grupo: "Humanos", desc: "Humanos com linhagem de dragões, resultando em habilidades físicas e arcanas elevadas, além de uma presença imponente.", nomeCargo: "Raça: Drakyn" },
    { nome: "Mei'ra", grupo: "Mistos", desc: "Meio-elfos, dotados de diplomacia natural e uma forte ligação com a natureza e suas energias. Excelentes batedores e curandeiros.", nomeCargo: "Raça: Mei'ra" },
    { nome: "Thornak", grupo: "Mistos", desc: "Meio-orcs, possuidores de grande força física e lealdade tribal, frequentemente caçados ou marginalizados por seu sangue.", nomeCargo: "Raça: Thornak" },
    { nome: "Lunari", grupo: "Mistos", desc: "Descendentes de humanos e Seraphim, com uma afinidade especial pela magia lunar, ilusões e segredos noturnos.", nomeCargo: "Raça: Lunari" },
    { nome: "Sombrio", grupo: "Impuros", desc: "Criaturas deformadas por magia proibida ou corrupção sombria, que vivem nas sombras e manipulam energias profanas.", nomeCargo: "Raça: Sombrio" },
    { nome: "Ravkar", grupo: "Impuros", desc: "Homens-besta caóticos e selvagens, frutos de experimentos mágicos ou maldições antigas, com instintos predatórios.", nomeCargo: "Raça: Ravkar" },
    { nome: "Vazio", grupo: "Impuros", desc: "Entidades sem alma, criados por necromancia avançada ou vindos de planos niilistas, são frios, letais e resistentes à magia convencional.", nomeCargo: "Raça: Vazio" }
];

const CLASSES_ARCADIA = [
    { nome: "Arcanista", desc: "Mestre da magia pura e elemental, focado no dano arcano e controle de área. Tipo Predominante: Mágico (Dano/Controle).", nomeCargo: "Classe: Arcanista" },
    { nome: "Guerreiro Real", desc: "Lutador disciplinado e especialista em combate corpo a corpo, utilizando diversas armas e armaduras pesadas. Tipo Predominante: Físico (Tanque/Dano).", nomeCargo: "Classe: Guerreiro Real" },
    { nome: "Feiticeiro Negro", desc: "Usuário de magias proibidas, como necromancia e maldições, que causam debilitação e dano sombrio. Tipo Predominante: Mágico (Debuff/Dano Sombrio).", nomeCargo: "Classe: Feiticeiro Negro" },
    { nome: "Caçador Sombrio", desc: "Perito em rastrear e emboscar, utilizando armadilhas, arcos e bestas, com foco em dano à distância e furtividade. Tipo Predominante: Físico (Dano à Distância/Furtivo).", nomeCargo: "Classe: Caçador Sombrio" },
    { nome: "Guardião da Luz", desc: "Defensor divino que canaliza poderes sagrados para proteger aliados, curar ferimentos e punir os profanos. Tipo Predominante: Suporte (Cura/Proteção/Dano Sagrado).", nomeCargo: "Classe: Guardião da Luz" },
    { nome: "Mestre das Bestas", desc: "Controla criaturas selvagens e utiliza o poder primal da natureza para lutar ao lado de seus companheiros animais. Tipo Predominante: Misto (Dano/Controle/Suporte com Pet).", nomeCargo: "Classe: Mestre das Bestas" },
    { nome: "Bardo Arcano", desc: "Manipula emoções e a realidade com música e magia, oferecendo suporte, controle e ocasionais explosões de dano. Tipo Predominante: Suporte (Buff/Debuff/Controle).", nomeCargo: "Classe: Bardo Arcano" },
    { nome: "Alquimista", desc: "Cria poções, elixires e bombas com efeitos variados, desde cura e buffs até dano elemental e debuffs potentes. Tipo Predominante: Misto (Suporte/Dano/Utilitário).", nomeCargo: "Classe: Alquimista" },
    { nome: "Clérigo da Ordem", desc: "Focado na cura divina, proteção e remoção de maldições, servindo como pilar de sustentação para o grupo. Tipo Predominante: Suporte (Cura/Proteção).", nomeCargo: "Classe: Clérigo da Ordem" },
    { nome: "Andarilho Rúnico", desc: "Usa runas ancestrais imbuídas em suas armas ou lançadas como projéteis para causar efeitos mágicos diversos. Tipo Predominante: Misto (Dano Mágico/Físico/Buff).", nomeCargo: "Classe: Andarilho Rúnico" },
    { nome: "Espadachim Etéreo", desc: "Combina a agilidade da esgrima com manifestações de energia etérea, criando lâminas de pura magia ou se teleportando. Tipo Predominante: Misto (Dano Físico/Mágico/Mobilidade).", nomeCargo: "Classe: Espadachim Etéreo" },
    { nome: "Invasor Dracônico", desc: "Guerreiro que canaliza o poder ancestral dos dragões, usando sopros elementais, garras e uma resistência formidável. Tipo Predominante: Misto (Dano Físico/Mágico/Tanque).", nomeCargo: "Classe: Invasor Dracônico" },
    { nome: "Lâmina da Névoa", desc: "Assassino furtivo que utiliza sombras e ilusões para se aproximar de seus alvos e eliminá-los com precisão letal. Tipo Predominante: Físico (Dano Furtivo/Controle).", nomeCargo: "Classe: Lâmina da Névoa" },
    { nome: "Conjurador do Vazio", desc: "Manipula energias interdimensionais e a essência do Vazio para invocar criaturas profanas e lançar magias devastadoras. Tipo Predominante: Mágico (Dano Sombrio/Invocação/Controle).", nomeCargo: "Classe: Conjurador do Vazio" }
];

const CLASSES_ESPECIAIS_ARCADIA = [
    { nome: "Guerreiro Alquimista",
        desc: "Usa alquimia para forjar armas como espada, lança, arco e flecha se tiver os materiais necessários, defesas entre outras coisas envolvendo Alquimia. (Jam)",
        nomeCargo: "Classe Especial: Guerreiro Alquimista" },
    { nome: "Ferreiro Divino",
        desc: "Divindade do fogo, dos metais e da metalurgia, consegue manipular qualquer material desde que haja mana da natureza a sua volta, e criações de armas ou armaduras apenas se houver matérias para tal. (Drak)",
        nomeCargo: "Classe Especial: Ferreiro Divino" },
    { nome: "Arauto Da Fortaleza",
        desc: "Um pilar de apoio no campo de batalha, capaz de alterar o curso de confrontos com curas e auxílios vitais, inspirado em lendas como Faramis. (Isac)",
        nomeCargo: "Classe Especial: Arauto Da Fortaleza" },
    { nome: "Arlequim Sanguinário", 
        desc: "Um assassino caótico e imprevisível com um senso de humor distorcido, encontrando alegria na matança e na confusão. (Erick)",
       nomeCargo: "Classe Especial: Arlequim Sanguinário" },
    { nome: "Rei Esquecido",
        desc: "Um monarca de outrora cujo poder ancestral permite uma transformação colossal, liberando uma força destrutiva comparável à de um Titã. (Felipe)",
        nomeCargo: "Classe Especial: Rei Esquecido" },
    { nome: "Deus Necromante",
        desc: "Um ser que transcende os limites mortais, controlando os fluxos da vida e da morte com seus poderes necromânticos infundidos por uma energia roxa sinistra. (ADM Master)",
        nomeCargo: "Classe Especial: Deus Necromante"}
];

const REINOS_ARCADIA = [
    { nome: "Valdoria", desc: "Reino central dos humanos, conhecido por sua diplomacia, comércio e exércitos bem treinados. Valoriza a ordem e a justiça.", nomeCargo: "Reino: Valdoria" },
    { nome: "Elarion", desc: "Antiga e mística floresta élfica, guardiã de segredos ancestrais e magia da natureza. Os Eldari e Mei'ra frequentemente chamam este lugar de lar.", nomeCargo: "Reino: Elarion" },
    { nome: "Durnholde", desc: "Reino anão escavado nas profundezas das montanhas, famoso por suas minas ricas, metalurgia incomparável e resistência inabalável.", nomeCargo: "Reino: Durnholde" },
    { nome: "Caelum", desc: "Cidade flutuante dos Seraphim, um bastião de luz e conhecimento arcano, raramente visitado por outras raças.", nomeCargo: "Reino: Caelum" },
    { nome: "Ravengard", desc: "Domínio desolado e sombrio onde os Sombrios e outras criaturas da noite encontram refúgio. Um lugar de perigo constante e magia profana.", nomeCargo: "Reino: Ravengard" },
    { nome: "Thornmere", desc: "Vasto território livre, composto por planícies, pântanos e pequenas vilas. É uma terra de fronteira, habitada por diversas raças e facções.", nomeCargo: "Reino: Thornmere" },
    { nome: "Isle of Morwyn", desc: "Ilha envolta em névoas e magia proibida, lar de segredos arcanos perigosos e relíquias de poder imenso. Poucos ousam se aventurar por suas costas.", nomeCargo: "Reino: Isle of Morwyn" }
];


const ATRIBUTOS_FOCO_POR_CLASSE = {
    "Arcanista": "Intelecto e Mana Base",
    "Guerreiro Real": "Força e Vitalidade",
    "Feiticeiro Negro": "Intelecto e Carisma",
    "Caçador Sombrio": "Agilidade e Intelecto",
    "Guardião da Luz": "Carisma e Intelecto",
    "Mestre das Bestas": "Carisma e Agilidade",
    "Bardo Arcano": "Carisma e Intelecto",
    "Alquimista": "Intelecto e Vitalidade",
    "Clérigo da Ordem": "Carisma e Intelecto",
    "Andarilho Rúnico": "Intelecto e Agilidade",
    "Espadachim Etéreo": "Agilidade e Intelecto",
    "Invasor Dracônico": "Força e Intelecto",
    "Lâmina da Névoa": "Agilidade e Intelecto",
    "Conjurador do Vazio": "Intelecto e Mana Base",
    // Classes Especiais
    "Guerreiro Alquimista": "Intelecto e Força",
    "Ferreiro Divino": "Força, Intelecto e Vitalidade",
    "Arauto Da Fortaleza": "Carisma, Intelecto e Vitalidade",
    "Arlequim Sanguinário": "Agilidade, Força e Carisma",
    "Rei Esquecido": "Vitalidade e Força",
    "Deus Necromante": "Intelecto Supremo e Mana Absoluta" // Algo mais temático
};

const ATRIBUTOS_FOCO_POR_RACA = {
    "Eldari": "Intelecto (magia), Agilidade (destreza)",
    "Valtheran": "Força (combate), Vitalidade (resistência)",
    "Seraphim": "Carisma (poder divino), Intelecto (sabedoria)",
    "Terrano": "Versatilidade - adapte seus atributos à sua classe!",
    "Vharen": "Intelecto (afinidade mágica), Mana Base",
    "Drakyn": "Força (poder dracônico), Vitalidade (resistência)",
    "Mei'ra": "Carisma (natureza/social), Agilidade (exploração)",
    "Thornak": "Força Bruta, Vitalidade",
    "Lunari": "Carisma (magia lunar/ilusão), Intelecto (mistérios)",
    "Sombrio": "Agilidade (furtividade), Intelecto (magia sombria)",
    "Ravkar": "Força (ferocidade), Agilidade (instintos)",
    "Vazio": "Intelecto (poder niilista), Vitalidade (natureza antinatural)"
};


// Mapas para fácil acesso aos nomes dos cargos
const MAPA_CARGOS_RACAS = Object.fromEntries(RACAS_ARCADIA.map(r => [r.nome, r.nomeCargo]));
const TODAS_AS_CLASSES_PARA_MAPA = [...CLASSES_ARCADIA,...CLASSES_ESPECIAIS_ARCADIA];
const MAPA_CARGOS_CLASSES = Object.fromEntries(TODAS_AS_CLASSES_PARA_MAPA.map(c => [c.nome, c.nomeCargo]));
const MAPA_CARGOS_REINOS = Object.fromEntries(REINOS_ARCADIA.map(re => [re.nome, re.nomeCargo]));

const MAPA_NOMES_ORIGEM_FEITICO_DISPLAY = {
    "raca": "Raça",
    "classe": "Classe",
    "reino": "Reino",
    "classe_especial": "Classe Especial", // Ou "Arquétipo", "Vocação Única", etc.
    "geral": "Geral" // Se você tiver essa categoria
    // Adicione outros tipos se necessário
};

const ITENS_BASE_ARCADIA = {
    // Moedas
    "florin de ouro": { itemNome: "Florin de Ouro", tipo: "Moeda", descricao: "A moeda comum de todos os reinos.", usavel: false, equipavel: false },
    "essência de arcádia": { itemNome: "Essência de Arcádia", tipo: "Moeda Rara", descricao: "Usada para artefatos e magias poderosas.", usavel: false, equipavel: false },

    // Consumíveis de Cura (PV)
    "poção de cura menor": { itemNome: "Poção de Cura Menor", tipo: "Consumível", descricao: "Restaura uma pequena quantidade de PV.", usavel: true, efeito: { tipoEfeito: "CURA_HP", valor: 25, mensagemAoUsar: "Você bebe a Poção de Cura Menor e sente um alívio imediato." }, cooldownSegundos: 60 },
    "poção de cura média": { itemNome: "Poção de Cura Média", tipo: "Consumível", descricao: "Restaura uma quantidade moderada de PV.", usavel: true, efeito: { tipoEfeito: "CURA_HP", valor: 75, mensagemAoUsar: "Você bebe a Poção de Cura Média e suas feridas começam a se fechar." }, cooldownSegundos: 90 },
    "poção de cura maior": { itemNome: "Poção de Cura Maior", tipo: "Consumível", descricao: "Restaura uma grande quantidade de PV.", usavel: true, efeito: { tipoEfeito: "CURA_HP", valor: 150, mensagemAoUsar: "Você bebe a Poção de Cura Maior e sente uma onda de vitalidade percorrer seu corpo." }, cooldownSegundos: 120 },
    "elixir potente de vitalidade": { itemNome: "Elixir Potente de Vitalidade", tipo: "Consumível", descricao: "Um elixir raro que restaura quase toda a vitalidade.", usavel: true, efeito: { tipoEfeito: "CURA_HP_PERCENT", valor: 0.80, mensagemAoUsar: "Você consome o Elixir Potente e sente uma recuperação quase completa!" }, cooldownSegundos: 300 }, // Cura 80% do PV Máx

    // Consumíveis de Cura (PM)
    "poção de mana menor": { itemNome: "Poção de Mana Menor", tipo: "Consumível", descricao: "Restaura uma pequena quantidade de PM.", usavel: true, efeito: { tipoEfeito: "CURA_PM", valor: 20, mensagemAoUsar: "Você bebe a Poção de Mana Menor e sua energia mágica é revigorada." }, cooldownSegundos: 60 },
    "poção de mana média": { itemNome: "Poção de Mana Média", tipo: "Consumível", descricao: "Restaura uma quantidade moderada de PM.", usavel: true, efeito: { tipoEfeito: "CURA_PM", valor: 60, mensagemAoUsar: "Você bebe a Poção de Mana Média e sente sua reserva arcana se recompor." }, cooldownSegundos: 90 },
    "poção de mana maior": { itemNome: "Poção de Mana Maior", tipo: "Consumível", descricao: "Restaura uma grande quantidade de PM.", usavel: true, efeito: { tipoEfeito: "CURA_PM", valor: 120, mensagemAoUsar: "Você bebe a Poção de Mana Maior e sua mente se clareia com poder arcano." }, cooldownSegundos: 120 },
    "elixir potente de energia": { itemNome: "Elixir Potente de Energia", tipo: "Consumível", descricao: "Um elixir raro que restaura quase toda a energia mágica.", usavel: true, efeito: { tipoEfeito: "CURA_PM_PERCENT", valor: 0.80, mensagemAoUsar: "Você consome o Elixir Potente e sente sua mana quase completamente restaurada!" }, cooldownSegundos: 300 }, // Cura 80% do PM Máx

    // Itens Utilitários e de RPG
    "rações de viagem": { itemNome: "Rações de Viagem", tipo: "Consumível", descricao: "Comida para um dia de jornada. Restaura um pouco de vitalidade.", usavel: true, efeito: { tipoEfeito: "CURA_HP", valor: 10, mensagemAoUsar: "Você consome parte de suas rações e se sente um pouco restaurado." }, cooldownSegundos: 180 },
    "kit de primeiros socorros": { itemNome: "Kit de Primeiros Socorros", tipo: "Consumível", descricao: "Bandagens e ervas medicinais. Restaura um pouco mais de PV que rações e pode remover sangramentos leves (lógica a implementar).", usavel: true, efeito: { tipoEfeito: "CURA_HP", valor: 40, mensagemAoUsar: "Você utiliza o kit de primeiros socorros habilmente." }, cooldownSegundos: 120 },
    "antídoto simples": { itemNome: "Antídoto Simples", tipo: "Consumível", descricao: "Um antídoto básico para venenos fracos (lógica de remoção de condição a implementar).", usavel: true, efeito: { tipoEfeito: "REMOVE_CONDICAO", condicao: "Envenenado_Fraco", mensagemAoUsar: "Você bebe o antídoto e sente o veneno perder a força." }, cooldownSegundos: 90 },
    "bomba de fumaça": { itemNome: "Bomba de Fumaça", tipo: "Consumível", descricao: "Cria uma nuvem de fumaça densa, útil para fugas ou reposicionamento (efeito em combate a implementar).", usavel: true, efeito: { tipoEfeito: "UTILIDADE_COMBATE", efeitoNome: "CortinaDeFumaca", mensagemAoUsar: "Você arremessa a bomba de fumaça, criando uma densa cortina!" }, cooldownSegundos: 180 },
    "pergaminho de teleporte para a cidade": { itemNome: "Pergaminho de Teleporte para a Cidade", tipo: "Consumível", descricao: "Um pergaminho mágico que teleporta o usuário para a capital do reino atual (se aplicável e fora de combate).", usavel: true, efeito: { tipoEfeito: "TELEPORTE", destino: "CapitalDoReino", mensagemAoUsar: "Você lê as palavras do pergaminho e é envolvido por uma luz azulada..." }, cooldownSegundos: 600 }, // Cooldown alto

    // ... (outros itens que já existem no seu ITENS_BASE_ARCADIA) ...

    "pacote selado de elara": { 
        itemNome: "Pacote Selado de Elara", 
        tipo: "Item de Missão", 
        descricao: "Um pequeno pacote cuidadosamente selado por Elara. Seu conteúdo é desconhecido para o portador.", 
        usavel: false, 
        equipavel: false 
        // Não precisa de "quantidade" aqui, pois a quantidade será gerenciada no inventário do jogador.
    },
    
    "mapa_parcial_rotas_comerciais": { 
        itemNome: "Mapa Parcial das Rotas Comerciais", 
        tipo: "Utilitário", 
        descricao: "Um mapa com algumas rotas seguras e perigosas entre Valdoria e Elarion.", 
        usavel: false, 
        equipavel: false 
    },
    "hidromel_especial_do_borin": {
        itemNome: "Hidromel Solar Especial do Borin",
        tipo: "Consumível",
        descricao: "Um hidromel incrivelmente saboroso e dourado, feito por Borin com Cogumelos Solares. Restaura uma boa quantidade de PV e PM, e deixa um calor agradável.",
        usavel: true,
        efeito: { tipoEfeito: "CURA_HP_PM", valorHP: 40, valorPM: 20, mensagemAoUsar: "Você bebe o Hidromel Solar e sente uma energia vibrante e um calor reconfortante!" },
        cooldownSegundos: 120
    },
    "luvas_de_herbalista_simples": {
        itemNome: "Luvas de Herbalista Simples",
        tipo: "Equipamento Leve", // Ou "Vestimenta", "Acessório"
        slot: "maos", // Você precisaria adicionar "maos" aos slots de equipamento na fichaModeloArcadia
        descricao: "Luvas de couro macio e tingido de verde, que parecem ajudar a identificar e coletar ervas com mais facilidade.",
        usavel: false,
        equipavel: true,
        efeitoEquipamento: { 
            bonusPericia: { nome: "Herbalismo", valor: 5 }, // Exemplo de um futuro sistema de perícias
            bonusAtributos: { intelecto: 1 } // Ou um bônus de atributo direto
        }
    },
    "pétala de luar sombrio": { // Item de Quest
        itemNome: "Pétala de Luar Sombrio",
        tipo: "Item de Missão",
        descricao: "Uma pétala de uma flor rara que brilha com uma suave luminescência azul-escura. Parece pulsar com uma energia fria e estranha.",
        usavel: false,
        equipavel: false
    },
    "erva brilhante de elarion": { // Item que Faelan vende
        itemNome: "Erva Brilhante de Elarion",
        tipo: "Ingrediente Alquímico",
        descricao: "Uma erva comum nas clareiras de Elarion, suas folhas emitem um brilho suave. Usada em poções de iluminação e para aguçar a visão.",
        usavel: false,
        equipavel: false
    },
    "hidromel comum": { // Item que Borin vende
        itemNome: "Hidromel Comum",
        tipo: "Consumível",
        descricao: "Um hidromel simples, mas que aquece o corpo e a alma em noites frias.",
        usavel: true,
        efeito: { "tipoEfeito": "CURA_HP", "valor": 5, "mensagemAoUsar": "Você bebe o hidromel e sente um leve calor." },
        cooldownSegundos: 60
    },
        
    // ... (o restante dos seus itens) ...
    
    // Equipamentos Básicos
    "adaga simples": { itemNome: "Adaga Simples", tipo: "Arma Leve", descricao: "Uma adaga básica de bronze.", usavel: false, equipavel: true, slot: "maoDireita", // Ou maoEsquerda
        efeitoEquipamento: { bonusAtributos: { ataqueBase: 1 } } },
    "espada curta": { itemNome: "Espada Curta", tipo: "Arma Média", descricao: "Uma espada curta de ferro, comum entre aventureiros.", usavel: false, equipavel: true, slot: "maoDireita",
        efeitoEquipamento: { bonusAtributos: { ataqueBase: 3, forca: 1 } } },
    "escudo de madeira": { itemNome: "Escudo de Madeira", tipo: "Escudo", descricao: "Um escudo simples feito de madeira reforçada.", usavel: false, equipavel: true, slot: "maoEsquerda",
        efeitoEquipamento: { bonusAtributos: { defesaBase: 2 } } },
    "capuz de couro": { itemNome: "Capuz de Couro", tipo: "Elmo Leve", descricao: "Um capuz de couro simples que oferece pouca proteção.", usavel: false, equipavel: true, slot: "elmo",
        efeitoEquipamento: { bonusAtributos: { defesaBase: 1 } } },
    "túnica de aventureiro": { itemNome: "Túnica de Aventureiro", tipo: "Armadura Leve", descricao: "Uma túnica de tecido resistente, comum para viajantes.", usavel: false, equipavel: true, slot: "armaduraCorpo",
        efeitoEquipamento: { bonusAtributos: { defesaBase: 2, agilidade: 1 } } },

    // Itens de Ofício e Buff Temporário
    "pedra de amolar": { itemNome: "Pedra de Amolar", tipo: "Consumível", descricao: "Afia uma arma cortante ou perfurante, concedendo um bônus temporário de ataque (efeito a implementar).", usavel: true, efeito: { tipoEfeito: "BUFF_ARMA", atributo: "ataqueBase", valor: 2, duracaoMinutos: 10, mensagemAoUsar: "Você afia sua arma, tornando-a mais letal." }, cooldownSegundos: 300 },
    "foco arcano simples": { itemNome: "Foco Arcano Simples", tipo: "Amuleto", descricao: "Um pequeno cristal que ajuda a canalizar magia. Leve bônus de intelecto.", usavel: false, equipavel: true, slot: "amuleto",
        efeitoEquipamento: { bonusAtributos: { intelecto: 1, manabase: 2 } } },
    "amuleto da vitalidade menor": { itemNome: "Amuleto da Vitalidade Menor", tipo: "Amuleto", descricao: "Um amuleto que aumenta levemente a vitalidade do usuário.", usavel: false, equipavel: true, slot: "amuleto",
        efeitoEquipamento: { bonusAtributos: { vitalidade: 2 } } },
};

const JACKPOT_PREMIOS_NOMES_COMUNS = ["poção de cura menor", "rações de viagem", "florin de ouro"];
const JACKPOT_PREMIOS_NOMES_INCOMUNS = ["poção de mana menor", "poção de cura média", "pedra de amolar"];
const JACKPOT_PREMIOS_NOMES_RAROS = ["adaga simples", "essência de arcádia", "poção de cura maior"];

const FEITICOS_BASE_ARCADIA = {
    // --- FEITIÇOS DE RAÇA: ELDARI ---
"raca_eldari_toque_da_floresta": {
    id: "raca_eldari_toque_da_floresta",
    nome: "Toque da Floresta",
    origemTipo: "raca", origemNome: "Eldari",
    tipo: "cura_unico_purificacao",
    descricao: "Canaliza a energia vital da natureza para curar ferimentos leves e remover venenos simples de um alvo.",
    cooldownSegundos: 15,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_eldari_tempestade_silvana", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Cura (Carisma * 1.2 + Intelecto * 0.3) PV e remove 1 efeito de Veneno Fraco.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.2)+(intelecto*0.3)", removeCondicao: { tipo: "Veneno_Fraco", quantidade: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Cura (Carisma * 1.4 + Intelecto * 0.4) PV. Remove Venenos Fracos e Lentidão Leve.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.4)+(intelecto*0.4)", removeCondicao: { tipo: ["Veneno_Fraco", "Lentidao_Leve"], quantidade: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Cura (Carisma * 1.6 + Intelecto * 0.5) PV. Remove Venenos (até moderados) e Lentidão. Concede pequena regeneração de PV por 2 turnos.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.6)+(intelecto*0.5)", removeCondicao: { tipo: ["Veneno_Moderado", "Lentidao"], quantidade: 1 }, buffAdicional: { nome: "Vitalidade da Seiva", atributo: "regeneracaoPV", formulaValor: "(carisma*0.1)", duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Cura (Carisma * 1.8 + Intelecto * 0.6) PV. Remove a maioria dos venenos e lentidões. Regeneração de PV aprimorada.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.8)+(intelecto*0.6)", removeCondicao: { tipo: ["Veneno_QualquerNaoMagico", "Lentidao_QualquerNaoMagica"], quantidade: 1 }, buffAdicional: { nome: "Vitalidade da Seiva Forte", atributo: "regeneracaoPV", formulaValor: "(carisma*0.15)", duracaoTurnos: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Cura (Carisma * 2.1 + Intelecto * 0.7) PV. Remove todos os venenos e lentidões não mágicas. Concede 'Bênção da Natureza' (+5% de todas as resistências por 3 turnos).", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*2.1)+(intelecto*0.7)", removeCondicao: { tipo: "veneno_lentidao_nao_magica_total", quantidade: "todos" }, buffAdicional: { nome: "Bênção da Natureza", atributo: "todasResistenciasPercent", valor: 0.05, duracaoTurnos: 3 } } }
    ]
},
"raca_eldari_raizes_vivas": {
    id: "raca_eldari_raizes_vivas",
    nome: "Raízes Vivas",
    origemTipo: "raca", origemNome: "Eldari",
    tipo: "controle_unico_imobilizar",
    descricao: "Comanda raízes mágicas que emergem do solo para prender um inimigo no lugar.",
    cooldownSegundos: 20,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_eldari_espirito_antigo", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 12, efeitoDesc: "Prende 1 alvo por 1 turno. Alvo pode tentar se libertar (teste de Força vs Intelecto do Eldari).", efeitoDetalhes: { alvo: "unico", condicao: { nome: "Enraizado", duracaoTurnos: 1, testeResistencia: { atributoAlvo: "forca", atributoConjurador: "intelecto" } } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 13, efeitoDesc: "Prende por 1 turno (mais difícil de resistir).", efeitoDetalhes: { alvo: "unico", condicao: { nome: "Enraizado", duracaoTurnos: 1, dificuldadeTesteResistenciaMod: 5 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Prende por 2 turnos. Raízes causam (Intelecto * 0.2) de dano Esmagamento por turno.", efeitoDetalhes: { alvo: "unico", condicao: { nome: "EnraizadoComEspinhos", duracaoTurnos: 2, dificuldadeTesteResistenciaMod: 7 }, danoPorTurnoEnraizado: { tipoDano: "Esmagamento", formulaDano: "(intelecto*0.2)" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 15, efeitoDesc: "Prende por 2 turnos (muito difícil de resistir). Dano das raízes aumentado para (Intelecto * 0.3).", efeitoDetalhes: { alvo: "unico", condicao: { nome: "EnraizadoComEspinhos", duracaoTurnos: 2, dificuldadeTesteResistenciaMod: 10 }, danoPorTurnoEnraizado: { tipoDano: "Esmagamento", formulaDano: "(intelecto*0.3)" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 16, efeitoDesc: "Prende por 3 turnos. Dano (Intelecto * 0.4). Pode prender até 2 alvos próximos se estiverem juntos. Raízes também drenam um pouco de PM do alvo.", efeitoDetalhes: { alvo: "multi_proximo_opcional", maxAlvos: 2, condicao: { nome: "Prisão de Raízes Vivas", duracaoTurnos: 3, dificuldadeTesteResistenciaMod: 12 }, danoPorTurnoEnraizado: { tipoDano: "Esmagamento", formulaDano: "(intelecto*0.4)" }, drenagemPM: { formulaValor: "(intelecto*0.1)" } } }
    ]
},
"raca_eldari_tempestade_silvana": {
    id: "raca_eldari_tempestade_silvana",
    nome: "Tempestade Silvana",
    origemTipo: "raca", origemNome: "Eldari",
    tipo: "ataque_area_natureza",
    descricao: "Invoca a fúria da natureza, inundando uma área com ventos cortantes, folhas afiadas e energia natural destrutiva.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_eldari_toque_da_floresta", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Causa (Intelecto * 1.8 + Carisma * 0.5) de dano de Natureza em área (raio 4m).", efeitoDetalhes: { alvo: "area", raioMetros: 4, tipoDano: "Natureza", formulaDano: "(intelecto*1.8)+(carisma*0.5)" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Dano (Intelecto * 2.0 + Carisma * 0.6). Raio 4.5m. Inimigos atingidos podem ser empurrados para trás.", efeitoDetalhes: { alvo: "area", raioMetros: 4.5, tipoDano: "Natureza", formulaDano: "(intelecto*2.0)+(carisma*0.6)", efeitoEmpurrar: { distanciaMetros: 1, chance: 0.3 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Dano (Intelecto * 2.2 + Carisma * 0.7). Raio 5m. Inimigos são empurrados e têm sua velocidade reduzida por 2 turnos.", efeitoDetalhes: { alvo: "area", raioMetros: 5, tipoDano: "Natureza", formulaDano: "(intelecto*2.2)+(carisma*0.7)", efeitoEmpurrar: { distanciaMetros: 1.5, chance: 0.4 }, debuff: { nome: "RajadaSilvana", atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.20, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Dano (Intelecto * 2.5 + Carisma * 0.8). Raio 5.5m. Empurrão e lentidão mais fortes. A área fica coberta por vinhas que dificultam o movimento.", efeitoDetalhes: { alvo: "area", raioMetros: 5.5, tipoDano: "Natureza", formulaDano: "(intelecto*2.5)+(carisma*0.8)", efeitoEmpurrar: { distanciaMetros: 2, chance: 0.5 }, debuff: { nome: "RajadaSilvanaForte", atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.30, duracaoTurnos: 2 }, efeitoTerreno: "vinhas_dificultam_movimento" }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Dano (Intelecto * 2.8 + Carisma * 1.0). Raio 6m. Empurrão e lentidão severos. Vinhas podem prender inimigos. O Eldari recupera um pouco de PM para cada inimigo atingido.", efeitoDetalhes: { alvo: "area", raioMetros: 6, tipoDano: "Natureza", formulaDano: "(intelecto*2.8)+(carisma*1.0)", efeitoEmpurrar: { distanciaMetros: 2.5, chance: 0.6 }, debuff: { nome: "FuriaDaNatureza", atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.40, duracaoTurnos: 3 }, efeitoTerreno: "vinhas_aprisionadoras", recuperaPMporAlvo: "(intelecto*0.1)" } }
    ]
},
"raca_eldari_espirito_antigo": {
    id: "raca_eldari_espirito_antigo",
    nome: "Espírito Antigo",
    origemTipo: "raca", origemNome: "Eldari",
    tipo: "invocacao_temporaria_buff_sabedoria",
    descricao: "Convoca o espírito de um sábio ancestral Eldari que concede conhecimento e poder mágico ao conjurador ou a um aliado por um tempo.",
    cooldownSegundos: 300, // Cooldown alto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_eldari_raizes_vivas", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // O espírito pode conceder buffs de Intelecto, Carisma, ou acesso temporário a um feitiço simples.
        { nivel: 1, custoPM: 40, efeitoDesc: "Espírito concede + (Carisma * 0.2) de Intelecto e + (Intelecto * 0.1) de Carisma ao alvo por 2 turnos.", efeitoDetalhes: { alvo: "aliado_unico_ou_self", duracaoTurnosBuff: 2, buffs: [{ atributo: "intelecto", formulaValor: "(carisma*0.2)"}, { atributo: "carisma", formulaValor: "(intelecto*0.1)"}] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 43, efeitoDesc: "Buffs aumentados. Intelecto + (Carisma * 0.25), Carisma + (Intelecto * 0.12). Duração 2 turnos.", efeitoDetalhes: { alvo: "aliado_unico_ou_self", duracaoTurnosBuff: 2, buffs: [{ atributo: "intelecto", formulaValor: "(carisma*0.25)"}, { atributo: "carisma", formulaValor: "(intelecto*0.12)"}] }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 46, efeitoDesc: "Buffs aumentados. Intelecto + (Carisma * 0.3), Carisma + (Intelecto * 0.15). Duração 3 turnos. O alvo também ganha a capacidade de entender um idioma antigo aleatório durante o efeito.", efeitoDetalhes: { alvo: "aliado_unico_ou_self", duracaoTurnosBuff: 3, buffs: [{ atributo: "intelecto", formulaValor: "(carisma*0.3)"}, { atributo: "carisma", formulaValor: "(intelecto*0.15)"}], efeitoAdicional: "compreensao_idioma_antigo" }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 49, efeitoDesc: "Buffs aumentados. Intelecto + (Carisma * 0.35), Carisma + (Intelecto * 0.18). Duração 3 turnos. O alvo pode ter uma breve visão do futuro (dica do DM).", efeitoDetalhes: { alvo: "aliado_unico_ou_self", duracaoTurnosBuff: 3, buffs: [{ atributo: "intelecto", formulaValor: "(carisma*0.35)"}, { atributo: "carisma", formulaValor: "(intelecto*0.18)"}], efeitoAdicional: "visao_futuro_breve" }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 52, efeitoDesc: "Buffs aumentados. Intelecto + (Carisma * 0.4), Carisma + (Intelecto * 0.2). Duração 4 turnos. O alvo pode usar um feitiço Eldari básico (ex: Toque da Floresta Nv1) uma vez, mesmo que não o conheça, sem custo de PM.", efeitoDetalhes: { alvo: "aliado_unico_ou_self", duracaoTurnosBuff: 4, buffs: [{ atributo: "intelecto", formulaValor: "(carisma*0.4)"}, { atributo: "carisma", formulaValor: "(intelecto*0.2)"}], efeitoAdicional: "uso_feitico_eldari_bonus" } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: ELDARI ---

// --- FEITIÇOS DE RAÇA: VALTHERANS ---
"raca_valtheran_furia_de_pedra": {
    id: "raca_valtheran_furia_de_pedra",
    nome: "Fúria de Pedra",
    origemTipo: "raca", origemNome: "Valtheran",
    tipo: "buff_pessoal_ofensivo_defensivo",
    descricao: "O Valtheran entra em uma fúria controlada, aumentando sua força física e resistência a dano por um curto período.",
    cooldownSegundos: 60,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_valtheran_ira_dos_forjados", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Ganha + (Vitalidade * 0.2) de Força e + (Forca * 0.1) de Defesa Base por 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "forca", formulaValor: "(vitalidade*0.2)"}, { atributo: "defesaBase", formulaValor: "(forca*0.1)"}] }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 10, efeitoDesc: "Força + (Vitalidade * 0.25), Defesa + (Forca * 0.12) por 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "forca", formulaValor: "(vitalidade*0.25)"}, { atributo: "defesaBase", formulaValor: "(forca*0.12)"}] }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 9, efeitoDesc: "Força + (Vitalidade * 0.3), Defesa + (Forca * 0.15) por 3 turnos. Também ganha resistência a Atordoamento.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "forca", formulaValor: "(vitalidade*0.3)"}, { atributo: "defesaBase", formulaValor: "(forca*0.15)"}], buffAdicional: { nome: "Firmeza Anã", efeitoDesc: "Resistência a Atordoamento" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 9, efeitoDesc: "Força + (Vitalidade * 0.35), Defesa + (Forca * 0.18) por 3 turnos. Resistência a Atordoamento e Empurrões.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "forca", formulaValor: "(vitalidade*0.35)"}, { atributo: "defesaBase", formulaValor: "(forca*0.18)"}], buffAdicional: { nome: "Rocha Inabalável", efeitoDesc: "Resistência a Atordoamento e Empurrões" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 8, efeitoDesc: "Força + (Vitalidade * 0.4), Defesa + (Forca * 0.2) por 4 turnos. Imune a Atordoamento e Empurrões. Ataques corpo-a-corpo têm chance de quebrar armas frágeis do oponente.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 4, buffs: [{ atributo: "forca", formulaValor: "(vitalidade*0.4)"}, { atributo: "defesaBase", formulaValor: "(forca*0.2)"}], buffAdicional: { nome: "Fúria da Montanha", imunidade: ["Atordoamento", "Empurrao"], chanceQuebrarArmaFrágil: 0.10 } } }
    ]
},
"raca_valtheran_martelo_sismico": {
    id: "raca_valtheran_martelo_sismico",
    nome: "Martelo Sísmico",
    origemTipo: "raca", origemNome: "Valtheran",
    tipo: "ataque_fisico_area_controle",
    descricao: "Golpeia o chão com uma arma pesada (ou com os punhos), criando uma onda de choque que causa dano e pode desequilibrar inimigos próximos.",
    cooldownSegundos: 25,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_valtheran_runas_de_ferro", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 12, efeitoDesc: "Causa (Forca * 1.0) de dano Físico em raio de 2m. 20% de chance de Derrubar alvos.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetros: 2, tipoDano: "FisicoContusao", formulaDano: "(forca*1.0)", condicao: { nome: "Derrubado", chance: 0.20, duracaoTurnos: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 14, efeitoDesc: "Dano (Forca * 1.1). Raio 2.5m. Chance de Derrubar 25%.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetros: 2.5, tipoDano: "FisicoContusao", formulaDano: "(forca*1.1)", condicao: { nome: "Derrubado", chance: 0.25, duracaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 16, efeitoDesc: "Dano (Forca * 1.2). Raio 3m. Chance de Derrubar 30%. O chão treme, reduzindo Agilidade dos afetados em 5 por 1 turno.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetros: 3, tipoDano: "FisicoContusao", formulaDano: "(forca*1.2)", condicao: { nome: "Derrubado", chance: 0.30, duracaoTurnos: 1 }, debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 18, efeitoDesc: "Dano (Forca * 1.3). Raio 3.5m. Chance de Derrubar 35%. Redução de Agilidade de 7.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetros: 3.5, tipoDano: "FisicoContusao", formulaDano: "(forca*1.3)", condicao: { nome: "Derrubado", chance: 0.35, duracaoTurnos: 1 }, debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 7, duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 20, efeitoDesc: "Dano (Forca * 1.5). Raio 4m. Chance de Derrubar 40%. Redução de Agilidade de 10. O epicentro do golpe cria terreno difícil por 2 turnos.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetros: 4, tipoDano: "FisicoContusao", formulaDano: "(forca*1.5)", condicao: { nome: "DerrubadoForte", chance: 0.40, duracaoTurnos: 1 }, debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 }, efeitoTerreno: "terreno_dificil_tremor" } }
    ]
},
"raca_valtheran_ira_dos_forjados": {
    id: "raca_valtheran_ira_dos_forjados",
    nome: "Ira dos Forjados",
    origemTipo: "raca", origemNome: "Valtheran",
    tipo: "buff_pessoal_armadura_temporaria",
    descricao: "O Valtheran invoca o espírito dos grandes ferreiros ancestrais, conjurando uma armadura mágica e resistente feita de metal espectral por um tempo.",
    cooldownSegundos: 240,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_valtheran_furia_de_pedra", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Ganha + (Vitalidade * 1.0 + Forca * 0.5) de Defesa Base adicional por 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "armadura_espectral", formulaDefesaAdicional: "(vitalidade*1.0)+(forca*0.5)", duracaoTurnos: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Defesa adicional + (Vitalidade * 1.2 + Forca * 0.6). Duração 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "armadura_espectral", formulaDefesaAdicional: "(vitalidade*1.2)+(forca*0.6)", duracaoTurnos: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Defesa adicional + (Vitalidade * 1.4 + Forca * 0.7). Duração 4 turnos. A armadura também concede +10% de Resistência a dano Físico.", efeitoDetalhes: { alvo: "self", tipoBuff: "armadura_espectral_reforcada", formulaDefesaAdicional: "(vitalidade*1.4)+(forca*0.7)", duracaoTurnos: 4, buffResistencia: { tipo: "Fisico", percentual: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Defesa adicional + (Vitalidade * 1.6 + Forca * 0.8). Duração 4 turnos. Resistência a Dano Físico +15%.", efeitoDetalhes: { alvo: "self", tipoBuff: "armadura_espectral_reforcada", formulaDefesaAdicional: "(vitalidade*1.6)+(forca*0.8)", duracaoTurnos: 4, buffResistencia: { tipo: "Fisico", percentual: 0.15 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 42, efeitoDesc: "Defesa adicional + (Vitalidade * 2.0 + Forca * 1.0). Duração 5 turnos. Resistência a Dano Físico +20% e Mágico +5%. A armadura retalia dano físico corpo-a-corpo (Forca * 0.3).", efeitoDetalhes: { alvo: "self", tipoBuff: "armadura_dos_ancestrais_forjadores", formulaDefesaAdicional: "(vitalidade*2.0)+(forca*1.0)", duracaoTurnos: 5, buffResistencias: [{ tipo: "Fisico", percentual: 0.20 }, { tipo: "Magico", percentual: 0.05 }], retaliacaoDanoCaC: { tipoDano: "Fisico", formulaDano: "(forca*0.3)" } } }
    ]
},
"raca_valtheran_runas_de_ferro": {
    id: "raca_valtheran_runas_de_ferro",
    nome: "Runas de Ferro",
    origemTipo: "raca", origemNome: "Valtheran",
    tipo: "buff_multi_alvo_protecao_forca",
    descricao: "O Valtheran inscreve runas ancestrais de proteção e força em si mesmo e em aliados próximos.",
    cooldownSegundos: 120,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_valtheran_martelo_sismico", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Concede a si e até 2 aliados próximos + (Forca * 0.1) de Defesa Base e + (Vitalidade * 0.05) de Força por 3 turnos.", efeitoDetalhes: { alvo: "self_e_aliados_proximos", maxAlvosAliados: 2, raioMetros: 5, buffs: [{ atributo: "defesaBase", formulaValor: "(forca*0.1)"}, { atributo: "forca", formulaValor: "(vitalidade*0.05)"}], duracaoTurnos: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Defesa + (Forca * 0.12), Força + (Vitalidade * 0.07). Para si e até 2 aliados. Duração 3 turnos.", efeitoDetalhes: { alvo: "self_e_aliados_proximos", maxAlvosAliados: 2, raioMetros: 6, buffs: [{ atributo: "defesaBase", formulaValor: "(forca*0.12)"}, { atributo: "forca", formulaValor: "(vitalidade*0.07)"}], duracaoTurnos: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Defesa + (Forca * 0.15), Força + (Vitalidade * 0.1). Para si e até 3 aliados. Duração 4 turnos. Também concede pequena resistência a debuffs de redução de armadura.", efeitoDetalhes: { alvo: "self_e_aliados_proximos", maxAlvosAliados: 3, raioMetros: 7, buffs: [{ atributo: "defesaBase", formulaValor: "(forca*0.15)"}, { atributo: "forca", formulaValor: "(vitalidade*0.1)"}], duracaoTurnos: 4, buffAdicional: { nome: "Proteção Rúnica", efeitoDesc: "Resistência a Quebra de Armadura" } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Defesa + (Forca * 0.18), Força + (Vitalidade * 0.12). Para si e até 3 aliados. Duração 4 turnos.", efeitoDetalhes: { alvo: "self_e_aliados_proximos", maxAlvosAliados: 3, raioMetros: 8, buffs: [{ atributo: "defesaBase", formulaValor: "(forca*0.18)"}, { atributo: "forca", formulaValor: "(vitalidade*0.12)"}], duracaoTurnos: 4, buffAdicional: { nome: "Proteção Rúnica Forte", efeitoDesc: "Resistência a Quebra de Armadura" } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Defesa + (Forca * 0.22), Força + (Vitalidade * 0.15). Para si e até 4 aliados. Duração 5 turnos. As runas também explodem com energia protetora se um aliado protegido for atingido por um golpe crítico, negando parte do dano extra do crítico.", efeitoDetalhes: { alvo: "self_e_aliados_proximos", maxAlvosAliados: 4, raioMetros: 10, buffs: [{ atributo: "defesaBase", formulaValor: "(forca*0.22)"}, { atributo: "forca", formulaValor: "(vitalidade*0.15)"}], duracaoTurnos: 5, buffAdicional: { nome: "Guardião Rúnico de Ferro", efeitoDesc: "Resistência a Quebra de Armadura", efeitoAoReceberCritico: "reduz_dano_extra_critico_percent_50" } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: VALTHERANS ---

// --- FEITIÇOS DE RAÇA: SERAPHIM ---
"raca_seraphim_luz_celestial": {
    id: "raca_seraphim_luz_celestial",
    nome: "Luz Celestial",
    origemTipo: "raca", origemNome: "Seraphim",
    tipo: "cura_unico_purificacao_leve",
    descricao: "Canaliza uma suave luz celestial para curar ferimentos de um aliado e remover maldições leves.",
    cooldownSegundos: 12,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_seraphim_cantico_divino", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Cura (Carisma * 1.3 + Intelecto * 0.2) PV. Remove 1 maldição de atributo menor (ex: -Força).", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.3)+(intelecto*0.2)", removeCondicao: { tipo: "maldicao_atributo_menor", quantidade: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 11, efeitoDesc: "Cura (Carisma * 1.5 + Intelecto * 0.3) PV. Remove 1 maldição de atributo menor ou lentidão mágica.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.5)+(intelecto*0.3)", removeCondicao: { tipo: ["maldicao_atributo_menor", "lentidao_magica_leve"], quantidade: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 12, efeitoDesc: "Cura (Carisma * 1.7 + Intelecto * 0.4) PV. Remove 1 maldição (até moderada). Concede +5% de Resistência Mágica por 2 turnos.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.7)+(intelecto*0.4)", removeCondicao: { tipo: "maldicao_moderada", quantidade: 1 }, buffAdicional: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.05, duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 13, efeitoDesc: "Cura (Carisma * 1.9 + Intelecto * 0.5) PV. Remove 2 maldições menores. Resistência Mágica +7%.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.9)+(intelecto*0.5)", removeCondicao: { tipo: "maldicao_atributo_menor", quantidade: 2 }, buffAdicional: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.07, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 14, efeitoDesc: "Cura (Carisma * 2.2 + Intelecto * 0.6) PV. Remove todas as maldições não-supremas. Concede 'Bênção Celestial' (+10% Resist. Mágica e +5 Carisma) por 3 turnos.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*2.2)+(intelecto*0.6)", removeCondicao: { tipo: "maldicao_nao_suprema", quantidade: "todas" }, buffAdicional: { nome: "Bênção Celestial", buffs: [{atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.10}, {atributo: "carisma", modificador: "fixo_aditivo", valor: 5}], duracaoTurnos: 3 } } }
    ]
},
"raca_seraphim_asas_de_caelum": {
    id: "raca_seraphim_asas_de_caelum",
    nome: "Asas de Caelum",
    origemTipo: "raca", origemNome: "Seraphim",
    tipo: "mobilidade_defesa_passiva_ativa",
    descricao: "As asas celestiais do Seraphim permitem planar graciosamente e podem ser usadas para uma esquiva rápida de ataques físicos.",
    cooldownSegundos: 20, // Cooldown para a esquiva ativa
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_seraphim_lanca_celeste", aoAtingirNivel: 5 } ],
    niveis: [
        // Passivo: Planar (efeito narrativo/mecânico fora de combate direto). Ativo: Esquiva.
        { nivel: 1, custoPM: 8, efeitoDesc: "Passivo: Pode planar curtas distâncias. Ativo: 20% de chance de esquivar completamente de um ataque físico corpo-a-corpo ou projétil.", efeitoDetalhes: { passivo: "planar_curto", ativo: { tipoEfeito: "esquiva_ataque_fisico", chanceEsquiva: 0.20 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Passivo: Planar melhorado. Ativo: Chance de esquiva 25%.", efeitoDetalhes: { passivo: "planar_medio", ativo: { tipoEfeito: "esquiva_ataque_fisico", chanceEsquiva: 0.25 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Passivo: Planar com mais controle. Ativo: Chance de esquiva 30%. Após uma esquiva bem-sucedida, o Seraphim ganha +10% de velocidade de movimento por 1 turno.", efeitoDetalhes: { passivo: "planar_controlado", ativo: { tipoEfeito: "esquiva_ataque_fisico_com_buff", chanceEsquiva: 0.30, buffAposEsquiva: { atributo: "velocidadeMovimento", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Passivo: Pode realizar um pequeno voo ascendente. Ativo: Chance de esquiva 35%. Buff de velocidade de movimento +15%.", efeitoDetalhes: { passivo: "voo_ascendente_breve", ativo: { tipoEfeito: "esquiva_ataque_fisico_com_buff", chanceEsquiva: 0.35, buffAposEsquiva: { atributo: "velocidadeMovimento", modificador: "percentual_aditivo", valor: 0.15, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Passivo: Voo curto sustentado. Ativo: Chance de esquiva 40%. Após esquivar, o Seraphim pode realizar um contra-ataque de luz (dano Carisma * 0.5) ou se reposicionar 3m.", efeitoDetalhes: { passivo: "voo_curto_sustentado", ativo: { tipoEfeito: "esquiva_avancada_seraphim", chanceEsquiva: 0.40, opcaoContraAtaqueLuz: { formulaDano: "(carisma*0.5)" }, opcaoReposicionamentoMetros: 3 } } }
    ]
},
"raca_seraphim_cantico_divino": {
    id: "raca_seraphim_cantico_divino",
    nome: "Cântico Divino",
    origemTipo: "raca", origemNome: "Seraphim",
    tipo: "buff_area_grupo_moral",
    descricao: "Entoa um cântico celestial que reverbera com poder divino, fortalecendo a moral e as capacidades de todo o grupo de aliados.",
    cooldownSegundos: 180, // Cooldown alto para um buff de grupo potente
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_seraphim_luz_celestial", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 40, efeitoDesc: "Todos os aliados em raio de 10m ganham +10% em todos os atributos primários por 2 turnos.", efeitoDetalhes: { alvo: "area_grupo_total", raioMetros: 10, buffs: [{ atributo: "todos_primarios", modificador: "percentual_aditivo", valor: 0.10 }], duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 43, efeitoDesc: "Buff de +12% em todos atributos primários por 2 turnos. Raio 12m.", efeitoDetalhes: { alvo: "area_grupo_total", raioMetros: 12, buffs: [{ atributo: "todos_primarios", modificador: "percentual_aditivo", valor: 0.12 }], duracaoTurnos: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 46, efeitoDesc: "Buff de +15% em todos atributos primários por 3 turnos. Raio 15m. Aliados também recebem uma cura leve (Carisma * 1.0) ao serem afetados.", efeitoDetalhes: { alvo: "area_grupo_total", raioMetros: 15, buffs: [{ atributo: "todos_primarios", modificador: "percentual_aditivo", valor: 0.15 }], duracaoTurnos: 3, curaInicial: { formulaCura: "(carisma*1.0)" } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 49, efeitoDesc: "Buff de +18% em todos atributos primários por 3 turnos. Raio 18m. Cura inicial aumentada. Aliados ganham resistência a efeitos de medo e desespero.", efeitoDetalhes: { alvo: "area_grupo_total", raioMetros: 18, buffs: [{ atributo: "todos_primarios", modificador: "percentual_aditivo", valor: 0.18 }], duracaoTurnos: 3, curaInicial: { formulaCura: "(carisma*1.5)" }, buffResistenciaMental: true }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 52, efeitoDesc: "Buff de +20% em todos atributos primários e +10% de velocidade de ação por 4 turnos. Raio 20m. Cura inicial potente. Aliados são purificados de 1 debuff mágico e se tornam imunes a medo/desespero.", efeitoDetalhes: { alvo: "area_grupo_total", raioMetros: 20, buffs: [{ atributo: "todos_primarios", modificador: "percentual_aditivo", valor: 0.20 }, { atributo: "velocidadeAcao", modificador: "percentual_aditivo", valor: 0.10 }], duracaoTurnos: 4, curaInicial: { formulaCura: "(carisma*2.0)" }, purificacaoDebuffMagico: 1, imunidadeMentalTotal: true } }
    ]
},
"raca_seraphim_lanca_celeste": {
    id: "raca_seraphim_lanca_celeste",
    nome: "Lança Celeste",
    origemTipo: "raca", origemNome: "Seraphim",
    tipo: "ataque_magico_linha_perfurante",
    descricao: "Conjura e arremessa uma lança feita de pura luz solidificada que perfura inimigos em linha reta, causando dano sagrado.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_seraphim_asas_de_caelum", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Lança causa (Intelecto * 1.5 + Carisma * 0.5) de dano Sagrado, perfurando até 2 alvos em linha (10m). Dano reduz 25% por alvo perfurado.", efeitoDetalhes: { alvo: "linha", alcanceMetros: 10, maxAlvosPerfurados: 2, tipoDano: "SagradoPerfurante", formulaDanoBase: "(intelecto*1.5)+(carisma*0.5)", reducaoDanoPorPerfuração: 0.25 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Dano (Intelecto * 1.7 + Carisma * 0.6). Perfura até 2 alvos. Redução de dano 20%.", efeitoDetalhes: { alvo: "linha", alcanceMetros: 12, maxAlvosPerfurados: 2, tipoDano: "SagradoPerfurante", formulaDanoBase: "(intelecto*1.7)+(carisma*0.6)", reducaoDanoPorPerfuração: 0.20 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Dano (Intelecto * 1.9 + Carisma * 0.7). Perfura até 3 alvos. Redução de dano 15%. Alvos atingidos ficam brevemente cegos pela luz.", efeitoDetalhes: { alvo: "linha", alcanceMetros: 15, maxAlvosPerfurados: 3, tipoDano: "SagradoPerfurante", formulaDanoBase: "(intelecto*1.9)+(carisma*0.7)", reducaoDanoPorPerfuração: 0.15, condicao: { nome: "CegueiraLuminosa", chance: 0.3, duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Dano (Intelecto * 2.1 + Carisma * 0.8). Perfura até 3 alvos. Redução de dano 10%. Chance de cegar aumentada.", efeitoDetalhes: { alvo: "linha", alcanceMetros: 18, maxAlvosPerfurados: 3, tipoDano: "SagradoPerfurante", formulaDanoBase: "(intelecto*2.1)+(carisma*0.8)", reducaoDanoPorPerfuração: 0.10, condicao: { nome: "CegueiraLuminosa", chance: 0.4, duracaoTurnos: 1 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Dano (Intelecto * 2.4 + Carisma * 1.0). Perfura todos os alvos em linha (20m) sem redução de dano. Cegueira garantida por 1 turno. A lança explode no final do percurso causando dano em área adicional.", efeitoDetalhes: { alvo: "linha_explosiva", alcanceMetros: 20, maxAlvosPerfurados: "todos_na_linha", tipoDano: "SagradoPerfurante", formulaDanoBase: "(intelecto*2.4)+(carisma*1.0)", reducaoDanoPorPerfuração: 0, condicao: { nome: "CegueiraDivina", chance: 1.0, duracaoTurnos: 1 }, explosaoFinal: { raioMetros: 2, formulaDano: "(intelecto*1.0)" } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: SERAPHIM ---

// --- FEITIÇOS DE RAÇA: TERRANOS ---
"raca_terrano_golpe_oportuno": {
    id: "raca_terrano_golpe_oportuno",
    nome: "Golpe Oportuno",
    origemTipo: "raca", origemNome: "Terrano",
    tipo: "passivo_ativo_bonus_iniciativa", // Passivo com um componente ativo opcional
    descricao: "A natureza adaptável dos Terranos lhes concede uma chance maior de agir primeiro e capitalizar em aberturas.",
    cooldownSegundos: 0, // Passivo, mas pode ter um cooldown se ativado
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_terrano_instinto_de_sobrevivencia", aoAtingirNivel: 5 } ],
    niveis: [
        // Passivo: Bônus de Iniciativa. Ativo: Gastar para garantir o primeiro ataque com bônus.
        { nivel: 1, custoPM: 0, efeitoDesc: "Passivo: +5 de Iniciativa. Ativo (Custo 10PM, 1x/combate): Próximo ataque tem +10% de chance de crítico se for o primeiro do combate.", efeitoDetalhes: { passivo: { bonusIniciativa: 5 }, ativo: { custoPMAtivacao: 10, usosPorCombate: 1, bonusCriticoPrimeiroAtaque: 0.10 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Passivo: +7 Iniciativa. Ativo: +12% crítico.", efeitoDetalhes: { passivo: { bonusIniciativa: 7 }, ativo: { custoPMAtivacao: 9, usosPorCombate: 1, bonusCriticoPrimeiroAtaque: 0.12 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Passivo: +10 Iniciativa. Ativo: +15% crítico e +5% de dano no primeiro ataque.", efeitoDetalhes: { passivo: { bonusIniciativa: 10 }, ativo: { custoPMAtivacao: 8, usosPorCombate: 1, bonusCriticoPrimeiroAtaque: 0.15, bonusDanoPrimeiroAtaque: 0.05 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Passivo: +12 Iniciativa. Ativo: +18% crítico, +7% dano.", efeitoDetalhes: { passivo: { bonusIniciativa: 12 }, ativo: { custoPMAtivacao: 7, usosPorCombate: 1, bonusCriticoPrimeiroAtaque: 0.18, bonusDanoPrimeiroAtaque: 0.07 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Passivo: +15 Iniciativa. Ativo (Custo 5PM, 1x/combate): Garante o primeiro ataque do combate, que é automaticamente um crítico com +10% de dano.", efeitoDetalhes: { passivo: { bonusIniciativa: 15 }, ativo: { custoPMAtivacao: 5, usosPorCombate: 1, garantePrimeiroAtaqueCriticoComBonusDano: 0.10 } } }
    ]
},
"raca_terrano_adaptacao_rapida": {
    id: "raca_terrano_adaptacao_rapida",
    nome: "Adaptação Rápida",
    origemTipo: "raca", origemNome: "Terrano",
    tipo: "buff_reativo_resistencia_temporaria",
    descricao: "Ao sofrer um tipo específico de dano, o Terrano instintivamente se adapta, ganhando resistência temporária contra aquele tipo de dano.",
    cooldownSegundos: 45, // Cooldown para uma nova adaptação
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_terrano_furia_versatil", aoAtingirNivel: 5 } ],
    niveis: [
        // O tipo de dano é o último sofrido (Fogo, Gelo, Sombrio, Físico, etc.)
        { nivel: 1, custoPM: 5, efeitoDesc: "Após sofrer dano elemental ou mágico, ganha +10% de resistência àquele tipo de dano por 2 turnos.", efeitoDetalhes: { gatilho: "ao_sofrer_dano_elemental_magico", tipoBuff: "resistencia_especifica", percentualResistencia: 0.10, duracaoTurnos: 2 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 5, efeitoDesc: "Resistência +15% por 2 turnos.", efeitoDetalhes: { gatilho: "ao_sofrer_dano_elemental_magico", tipoBuff: "resistencia_especifica", percentualResistencia: 0.15, duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 4, efeitoDesc: "Resistência +20% por 3 turnos. Pode se adaptar a dano físico também (cortante, perfurante, contusão).", efeitoDetalhes: { gatilho: "ao_sofrer_dano_qualquer_nao_puro", tipoBuff: "resistencia_especifica", percentualResistencia: 0.20, duracaoTurnos: 3, adaptaDanoFisico: true }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 4, efeitoDesc: "Resistência +25% por 3 turnos.", efeitoDetalhes: { gatilho: "ao_sofrer_dano_qualquer_nao_puro", tipoBuff: "resistencia_especifica", percentualResistencia: 0.25, duracaoTurnos: 3, adaptaDanoFisico: true }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 3, efeitoDesc: "Resistência +30% por 4 turnos. Ao se adaptar, também recupera uma pequena quantidade de PV (Vitalidade * 0.5).", efeitoDetalhes: { gatilho: "ao_sofrer_dano_qualquer_nao_puro", tipoBuff: "resistencia_especifica_com_cura", percentualResistencia: 0.30, duracaoTurnos: 4, adaptaDanoFisico: true, curaAoAdaptar: { formulaCura: "(vitalidade*0.5)" } } }
    ]
},
"raca_terrano_instinto_de_sobrevivencia": {
    id: "raca_terrano_instinto_de_sobrevivencia",
    nome: "Instinto de Sobrevivência",
    origemTipo: "raca", origemNome: "Terrano",
    tipo: "passivo_cura_emergencia",
    descricao: "Em momentos de perigo extremo, o instinto de sobrevivência Terrano pode se manifestar, curando uma porção de vida automaticamente.",
    cooldownSegundos: 600, // Cooldown muito alto, é uma habilidade de último recurso
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_terrano_golpe_oportuno", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Passivo: Ativa quando o PV chega abaixo de um limiar.
        { nivel: 1, custoPM: 0, efeitoDesc: "Se o PV cair abaixo de 10%, cura automaticamente (Vitalidade * 2.0) PV. Ocorre 1 vez por combate/dia.", efeitoDetalhes: { gatilhoPassivo: "pv_abaixo_percentual", percentualPVGatilho: 0.10, tipoCura: "PV", formulaCura: "(vitalidade*2.0)", usosMaximos: 1 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 0, efeitoDesc: "PV gatilho 12%. Cura (Vitalidade * 2.2) PV.", efeitoDetalhes: { gatilhoPassivo: "pv_abaixo_percentual", percentualPVGatilho: 0.12, tipoCura: "PV", formulaCura: "(vitalidade*2.2)", usosMaximos: 1 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 0, efeitoDesc: "PV gatilho 15%. Cura (Vitalidade * 2.5) PV. Também concede um breve buff de Defesa.", efeitoDetalhes: { gatilhoPassivo: "pv_abaixo_percentual_com_buff", percentualPVGatilho: 0.15, tipoCura: "PV", formulaCura: "(vitalidade*2.5)", usosMaximos: 1, buffAposCura: { atributo: "defesaBase", formulaValor: "(vitalidade*0.5)", duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 0, efeitoDesc: "PV gatilho 18%. Cura (Vitalidade * 2.8) PV. Buff de Defesa mais forte.", efeitoDetalhes: { gatilhoPassivo: "pv_abaixo_percentual_com_buff", percentualPVGatilho: 0.18, tipoCura: "PV", formulaCura: "(vitalidade*2.8)", usosMaximos: 1, buffAposCura: { atributo: "defesaBase", formulaValor: "(vitalidade*0.7)", duracaoTurnos: 2 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 0, efeitoDesc: "PV gatilho 20%. Cura (Vitalidade * 3.2) PV. Buff de Defesa e Resistência Mágica. Pode ocorrer 2 vezes por combate/dia com cooldown reduzido após o primeiro uso.", efeitoDetalhes: { gatilhoPassivo: "pv_abaixo_percentual_mestre", percentualPVGatilho: 0.20, tipoCura: "PV", formulaCura: "(vitalidade*3.2)", usosMaximos: 2, cooldownInternoUsos: 180, buffAposCura: { buffs: [{atributo: "defesaBase", formulaValor: "(vitalidade*1.0)"}, {atributo: "resistenciaMagica", modificador:"percentual_aditivo", valor:0.10}], duracaoTurnos: 2 } } }
    ]
},
"raca_terrano_furia_versatil": {
    id: "raca_terrano_furia_versatil",
    nome: "Fúria Versátil",
    origemTipo: "raca", origemNome: "Terrano",
    tipo: "buff_pessoal_multi_atributo",
    descricao: "O Terrano canaliza sua adaptabilidade inerente em uma explosão de potencial, aumentando todos os seus atributos primários por um curto período.",
    cooldownSegundos: 240,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_terrano_adaptacao_rapida", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Aumenta Força, Agilidade, Vitalidade, Intelecto e Carisma em + (Carisma * 0.1) por 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "todos_primarios", formulaValor: "(carisma*0.1)"}] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 27, efeitoDesc: "Aumenta atributos em + (Carisma * 0.12) por 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "todos_primarios", formulaValor: "(carisma*0.12)"}] }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 29, efeitoDesc: "Aumenta atributos em + (Carisma * 0.15) por 3 turnos. Também concede um pequeno bônus de PM máximo temporário.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "todos_primarios", formulaValor: "(carisma*0.15)"}, { atributo: "pmMax", formulaValor: "(carisma*1.0)", temporario: true }] }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 31, efeitoDesc: "Aumenta atributos em + (Carisma * 0.18) por 3 turnos. Bônus de PM máximo aumentado.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "todos_primarios", formulaValor: "(carisma*0.18)"}, { atributo: "pmMax", formulaValor: "(carisma*1.5)", temporario: true }] }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 33, efeitoDesc: "Aumenta atributos em + (Carisma * 0.22) por 4 turnos. Bônus de PM máximo significativo. Ao final do efeito, recupera uma pequena porcentagem do PM gasto na habilidade.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 4, buffs: [{ atributo: "todos_primarios", formulaValor: "(carisma*0.22)"}, { atributo: "pmMax", formulaValor: "(carisma*2.0)", temporario: true }], recuperaPMAoFinalizarPercentCusto: 0.25 } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: TERRANOS ---

// --- FEITIÇOS DE RAÇA: VHAREN ---
"raca_vharen_eco_magico": {
    id: "raca_vharen_eco_magico",
    nome: "Eco Mágico",
    origemTipo: "raca", origemNome: "Vharen",
    tipo: "buff_pessoal_potencializar_magia",
    descricao: "O Vharen foca sua energia interna para ampliar o alcance e o poder do seu próximo feitiço lançado.",
    cooldownSegundos: 45,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_vharen_canal_da_alma", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "O próximo feitiço lançado em 2 turnos tem seu alcance aumentado em 15% e sua potência (dano/cura) em 10%.", efeitoDetalhes: { tipoBuff: "potencializar_proximo_feitico", aumentoAlcancePercent: 0.15, aumentoPotenciaPercent: 0.10, duracaoTurnosBuff: 2, numeroFeiticosAfetados: 1 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Alcance +20%, Potência +12%.", efeitoDetalhes: { tipoBuff: "potencializar_proximo_feitico", aumentoAlcancePercent: 0.20, aumentoPotenciaPercent: 0.12, duracaoTurnosBuff: 2, numeroFeiticosAfetados: 1 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Alcance +25%, Potência +15%. O custo de PM do feitiço potencializado é reduzido em 5%.", efeitoDetalhes: { tipoBuff: "potencializar_proximo_feitico", aumentoAlcancePercent: 0.25, aumentoPotenciaPercent: 0.15, reducaoCustoPMFeiticoPercent: 0.05, duracaoTurnosBuff: 2, numeroFeiticosAfetados: 1 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Alcance +30%, Potência +18%. Redução de custo de PM de 10%.", efeitoDetalhes: { tipoBuff: "potencializar_proximo_feitico", aumentoAlcancePercent: 0.30, aumentoPotenciaPercent: 0.18, reducaoCustoPMFeiticoPercent: 0.10, duracaoTurnosBuff: 2, numeroFeiticosAfetados: 1 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Alcance +35%, Potência +22%. Redução de custo de PM de 15%. O feitiço potencializado tem 25% de chance de não consumir o buff do Eco Mágico, permitindo um segundo uso.", efeitoDetalhes: { tipoBuff: "potencializar_proximo_feitico_mestre", aumentoAlcancePercent: 0.35, aumentoPotenciaPercent: 0.22, reducaoCustoPMFeiticoPercent: 0.15, duracaoTurnosBuff: 2, numeroFeiticosAfetados: 1, chanceNaoConsumirBuff: 0.25 } }
    ]
},
"raca_vharen_sentir_corrente": {
    id: "raca_vharen_sentir_corrente",
    nome: "Sentir Corrente",
    origemTipo: "raca", origemNome: "Vharen",
    tipo: "utilidade_deteccao_magica_passiva_ativa",
    descricao: "A sensibilidade natural dos Vharen à magia lhes permite detectar fluxos mágicos escondidos e a presença de energias arcanas.",
    cooldownSegundos: 30, // Cooldown para a varredura ativa
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_vharen_explosao_arcana_racial", aoAtingirNivel: 5 } ], // Renomeado para evitar conflito com feitiço de Arcanista
    niveis: [
        // Passivo: Sentir fontes mágicas próximas. Ativo: Varredura mais detalhada.
        { nivel: 1, custoPM: 5, efeitoDesc: "Passivo: Sente a direção geral de fontes mágicas intensas em 20m. Ativo: Varre uma área de 10m de raio revelando auras mágicas de itens ou seres por 30s.", efeitoDetalhes: { passivo: { tipoDeteccao: "fontes_magicas_intensas", raioMetrosPassivo: 20 }, ativo: { tipoDeteccaoAtiva: "auras_magicas_gerais", raioMetrosAtivo: 10, duracaoSegundosDeteccao: 30 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 6, efeitoDesc: "Passivo: Raio 25m. Ativo: Raio 12m, revela tipo básico da magia (ex: elemental, necromancia).", efeitoDetalhes: { passivo: { tipoDeteccao: "fontes_magicas_intensas", raioMetrosPassivo: 25 }, ativo: { tipoDeteccaoAtiva: "auras_magicas_com_tipo", raioMetrosAtivo: 12, duracaoSegundosDeteccao: 35 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 7, efeitoDesc: "Passivo: Raio 30m, sente distorções (ilusões, invisibilidade). Ativo: Raio 15m, revela tipo e intensidade da magia. Duração 45s.", efeitoDetalhes: { passivo: { tipoDeteccao: "fontes_e_distorcoes_magicas", raioMetrosPassivo: 30 }, ativo: { tipoDeteccaoAtiva: "auras_magicas_com_tipo_intensidade", raioMetrosAtivo: 15, duracaoSegundosDeteccao: 45 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 8, efeitoDesc: "Passivo: Raio 35m. Ativo: Raio 18m, revela tipo, intensidade e possível escola da magia. Duração 50s.", efeitoDetalhes: { passivo: { tipoDeteccao: "fontes_e_distorcoes_magicas", raioMetrosPassivo: 35 }, ativo: { tipoDeteccaoAtiva: "auras_magicas_com_escola", raioMetrosAtivo: 18, duracaoSegundosDeteccao: 50 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 9, efeitoDesc: "Passivo: Raio 40m, pode sentir resíduos de feitiços recentes. Ativo: Raio 20m, revela informações detalhadas sobre auras e pode identificar o conjurador de um efeito mágico ativo se estiver próximo. Duração 1min.", efeitoDetalhes: { passivo: { tipoDeteccao: "fontes_distorcoes_residuos_magicos", raioMetrosPassivo: 40 }, ativo: { tipoDeteccaoAtiva: "analise_arcana_completa", raioMetrosAtivo: 20, duracaoSegundosDeteccao: 60, identificaConjuradorProximo: true } } }
    ]
},
"raca_vharen_canal_da_alma": {
    id: "raca_vharen_canal_da_alma",
    nome: "Canal da Alma",
    origemTipo: "raca", origemNome: "Vharen",
    tipo: "utilidade_copiar_magia_aliada",
    descricao: "O Vharen sintoniza sua alma com a de um conjurador aliado próximo, permitindo-lhe usar temporariamente um dos feitiços conhecidos pelo aliado.",
    cooldownSegundos: 600, // Cooldown alto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_vharen_eco_magico", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Esta é uma habilidade complexa de implementar. O Vharen precisaria "ver" os feitiços do aliado.
        { nivel: 1, custoPM: 30, efeitoDesc: "Pode copiar 1 feitiço de Nível 1 de um aliado tocado. O Vharen pode lançá-lo uma vez nas próximas 2 horas, usando seus próprios atributos e PM.", efeitoDetalhes: { tipoEfeito: "copiar_feitico_aliado", nivelMaximoFeiticoCopiado: 1, numeroUsosFeiticoCopiado: 1, duracaoCopiaHoras: 2, requerToque: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 35, efeitoDesc: "Copia feitiço de Nível 1 ou 2. Pode lançá-lo uma vez. Duração 3 horas.", efeitoDetalhes: { tipoEfeito: "copiar_feitico_aliado", nivelMaximoFeiticoCopiado: 2, numeroUsosFeiticoCopiado: 1, duracaoCopiaHoras: 3, requerToque: true }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 40, efeitoDesc: "Copia feitiço até Nível 3. Pode lançá-lo duas vezes. Duração 4 horas. Alcance de cópia 5m (não precisa mais de toque).", efeitoDetalhes: { tipoEfeito: "copiar_feitico_aliado_distancia", nivelMaximoFeiticoCopiado: 3, numeroUsosFeiticoCopiado: 2, duracaoCopiaHoras: 4, alcanceCopiaMetros: 5 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 45, efeitoDesc: "Copia feitiço até Nível 4. Pode lançá-lo duas vezes. Duração 6 horas. Alcance 10m.", efeitoDetalhes: { tipoEfeito: "copiar_feitico_aliado_distancia", nivelMaximoFeiticoCopiado: 4, numeroUsosFeiticoCopiado: 2, duracaoCopiaHoras: 6, alcanceCopiaMetros: 10 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 50, efeitoDesc: "Copia feitiço até Nível 5. Pode lançá-lo três vezes. Duração 8 horas. Alcance 15m. O Vharen lança o feitiço copiado com +10% de eficácia.", efeitoDetalhes: { tipoEfeito: "copiar_feitico_aliado_mestre", nivelMaximoFeiticoCopiado: 5, numeroUsosFeiticoCopiado: 3, duracaoCopiaHoras: 8, alcanceCopiaMetros: 15, bonusEficaciaFeiticoCopiado: 0.10 } }
    ]
},
"raca_vharen_explosao_arcana_racial": { // ID ajustado para não conflitar com o do Arcanista
    id: "raca_vharen_explosao_arcana_racial",
    nome: "Explosão Arcana (Vharen)",
    origemTipo: "raca", origemNome: "Vharen",
    tipo: "ataque_magico_area",
    descricao: "Libera a energia arcana latente do Vharen em uma explosão súbita e poderosa que causa dano mágico massivo em área.",
    cooldownSegundos: 180, // Cooldown alto para um poder racial forte
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_vharen_sentir_corrente", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 40, efeitoDesc: "Causa (Intelecto * 2.0 + Carisma * 0.5) de dano Arcano em raio de 3m.", efeitoDetalhes: { alvo: "area_centrada_conjurador", raioMetros: 3, tipoDano: "ArcanoPuro", formulaDano: "(intelecto*2.0)+(carisma*0.5)" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 44, efeitoDesc: "Dano (Intelecto * 2.2 + Carisma * 0.6). Raio 3.5m.", efeitoDetalhes: { alvo: "area_centrada_conjurador", raioMetros: 3.5, tipoDano: "ArcanoPuro", formulaDano: "(intelecto*2.2)+(carisma*0.6)" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 48, efeitoDesc: "Dano (Intelecto * 2.5 + Carisma * 0.7). Raio 4m. Inimigos atingidos são empurrados para longe do centro.", efeitoDetalhes: { alvo: "area_centrada_conjurador", raioMetros: 4, tipoDano: "ArcanoPuro", formulaDano: "(intelecto*2.5)+(carisma*0.7)", efeitoEmpurrarDoCentro: { distanciaMetros: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 52, efeitoDesc: "Dano (Intelecto * 2.8 + Carisma * 0.8). Raio 4.5m. Empurrão mais forte.", efeitoDetalhes: { alvo: "area_centrada_conjurador", raioMetros: 4.5, tipoDano: "ArcanoPuro", formulaDano: "(intelecto*2.8)+(carisma*0.8)", efeitoEmpurrarDoCentro: { distanciaMetros: 2.5 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 55, efeitoDesc: "Dano (Intelecto * 3.2 + Carisma * 1.0). Raio 5m. Empurra e deixa os inimigos 'Atordoados Arcanamente' (não podem usar magia) por 1 turno.", efeitoDetalhes: { alvo: "area_centrada_conjurador", raioMetros: 5, tipoDano: "ArcanoPuro", formulaDano: "(intelecto*3.2)+(carisma*1.0)", efeitoEmpurrarDoCentro: { distanciaMetros: 3 }, condicao: { nome: "Atordoamento Arcano", chance: 0.75, duracaoTurnos: 1, efeitoDesc: "Impede conjuração" } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: VHAREN ---

// --- FEITIÇOS DE RAÇA: DRAKYN ---
"raca_drakyn_resistencia_draconica": {
    id: "raca_drakyn_resistencia_draconica",
    nome: "Resistência Dracônica",
    origemTipo: "raca", origemNome: "Drakyn",
    tipo: "passivo_buff_resistencia_elemental",
    descricao: "A linhagem dracônica concede ao Drakyn uma resistência natural a certos tipos de dano elemental.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5, // Níveis podem aumentar a % de resistência ou adicionar mais elementos.
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_drakyn_furia_elemental", aoAtingirNivel: 5 } ],
    niveis: [
        // O Drakyn pode escolher uma afinidade elemental na criação que define a qual elemento ele é mais resistente.
        // Ou, os níveis podem adicionar resistências a mais elementos. Vou assumir a segunda opção para progressão.
        { nivel: 1, custoPM: 0, efeitoDesc: "Ganha +10% de Resistência a Fogo.", efeitoDetalhes: { tipoEfeito: "resistencia_elemental_passiva", resistencias: [{ elemento: "Fogo", percentual: 0.10 }] }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Resistência a Fogo +15%. Adiciona +10% de Resistência a Gelo.", efeitoDetalhes: { tipoEfeito: "resistencia_elemental_passiva", resistencias: [{ elemento: "Fogo", percentual: 0.15 }, { elemento: "Gelo", percentual: 0.10 }] }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Resistência a Fogo e Gelo +15%. Adiciona +10% de Resistência a Trovão.", efeitoDetalhes: { tipoEfeito: "resistencia_elemental_passiva", resistencias: [{ elemento: "Fogo", percentual: 0.15 }, { elemento: "Gelo", percentual: 0.15 }, { elemento: "Trovão", percentual: 0.10 }] }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Resistência a Fogo, Gelo, Trovão +15%. Adiciona +10% de Resistência a Ácido.", efeitoDetalhes: { tipoEfeito: "resistencia_elemental_passiva", resistencias: [{ elemento: "Fogo", percentual: 0.15 }, { elemento: "Gelo", percentual: 0.15 }, { elemento: "Trovão", percentual: 0.15 }, { elemento: "Acido", percentual: 0.10 }] }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Resistência a Fogo, Gelo, Trovão, Ácido +20%. Adiciona +10% de Resistência a Veneno. Pequena chance de ignorar completamente um ataque elemental fraco.", efeitoDetalhes: { tipoEfeito: "resistencia_elemental_mestre_passiva", resistencias: [{ elemento: "Fogo", percentual: 0.20 }, { elemento: "Gelo", percentual: 0.20 }, { elemento: "Trovão", percentual: 0.20 }, { elemento: "Acido", percentual: 0.20 }, { elemento: "Veneno", percentual: 0.10 }], chanceIgnorarDanoElementalFraco: 0.05 } }
    ]
},
"raca_drakyn_olhar_intimidante": {
    id: "raca_drakyn_olhar_intimidante",
    nome: "Olhar Intimidante",
    origemTipo: "raca", origemNome: "Drakyn",
    tipo: "controle_debuff_aura_passiva_ativa",
    descricao: "A presença imponente do Drakyn pode fazer inimigos mais fracos hesitarem ou até mesmo fugirem de medo.",
    cooldownSegundos: 45, // Cooldown para o foco ativo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_drakyn_sombra_do_ancestral", aoAtingirNivel: 5 } ],
    niveis: [
        // Passivo: Aura de intimidação. Ativo: Focar em um alvo para um efeito mais forte.
        { nivel: 1, custoPM: 8, efeitoDesc: "Passivo: Inimigos num raio de 3m com Vitalidade < (Carisma do Drakyn / 2) sofrem -5% de chance de acerto. Ativo: Foca em 1 alvo; se sua Vitalidade for baixa, 30% de chance de Medo por 1 turno.", efeitoDetalhes: { passivo: { nomeAura: "Aura Intimidadora", raioMetros: 3, condicaoResistencia: "vitalidadeAlvo < (carismaConjurador/2)", debuffAura: { atributo: "chanceAcerto", modificador: "percentual_negativo_multiplicativo", valor: 0.05 } }, ativo: { alvo: "unico", condicaoResistenciaForte: "vitalidadeAlvo < carismaConjurador", condicao: { nome: "MedoDraconico", chance: 0.30, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Passivo: Raio 4m, -7% acerto. Ativo: Chance de Medo 35%.", efeitoDetalhes: { passivo: { raioMetros: 4, debuffAura: { valor: 0.07 } }, ativo: { condicao: { chance: 0.35 } } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Passivo: Raio 5m, -10% acerto. Ativo: Chance de Medo 40% por 2 turnos. Alvo também sofre -5 de Força.", efeitoDetalhes: { passivo: { raioMetros: 5, debuffAura: { valor: 0.10 } }, ativo: { condicao: { nome: "MedoDraconico", chance: 0.40, duracaoTurnos: 2 }, debuffAdicional: { atributo: "forca", modificador: "fixo_negativo", valor: 5 } } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Passivo: Raio 6m, -12% acerto. Ativo: Chance de Medo 45% por 2 turnos. Debuff de Força -7.", efeitoDetalhes: { passivo: { raioMetros: 6, debuffAura: { valor: 0.12 } }, ativo: { condicao: { nome: "MedoDraconicoForte", chance: 0.45, duracaoTurnos: 2 }, debuffAdicional: { atributo: "forca", modificador: "fixo_negativo", valor: 7 } } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Passivo: Raio 7m, -15% acerto. Ativo: Chance de Medo 50% por 3 turnos. Debuff de Força -10. Inimigos afetados pelo Medo podem largar suas armas.", efeitoDetalhes: { passivo: { raioMetros: 7, debuffAura: { valor: 0.15 } }, ativo: { condicao: { nome: "TerrorDraconico", chance: 0.50, duracaoTurnos: 3, chanceLargarArma: 0.25 }, debuffAdicional: { atributo: "forca", modificador: "fixo_negativo", valor: 10 } } } }
    ]
},
"raca_drakyn_furia_elemental": {
    id: "raca_drakyn_furia_elemental",
    nome: "Fúria Elemental",
    origemTipo: "raca", origemNome: "Drakyn",
    tipo: "buff_pessoal_dano_elemental_arma_magia",
    descricao: "O Drakyn imbui suas armas e magias com a energia elemental de sua linhagem (Fogo, Gelo, Trovão, etc.), causando dano elemental adicional.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_drakyn_resistencia_draconica", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // O elemento é baseado na linhagem do Drakyn.
        { nivel: 1, custoPM: 25, efeitoDesc: "Por 3 turnos, todos os ataques e feitiços de dano causam + (Forca * 0.2 + Intelecto * 0.2) de dano elemental adicional da linhagem.", efeitoDetalhes: { alvo: "self", tipoBuff: "imbuir_dano_elemental_total", duracaoTurnos: 3, formulaDanoAdicional: "(forca*0.2)+(intelecto*0.2)", tipoElementoLinhagem: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Dano elemental adicional + (Forca * 0.25 + Intelecto * 0.25). Duração 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "imbuir_dano_elemental_total", duracaoTurnos: 3, formulaDanoAdicional: "(forca*0.25)+(intelecto*0.25)", tipoElementoLinhagem: true }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Dano elemental adicional + (Forca * 0.3 + Intelecto * 0.3). Duração 4 turnos. Ataques têm chance de aplicar efeito secundário do elemento.", efeitoDetalhes: { alvo: "self", tipoBuff: "imbuir_dano_elemental_total_com_efeito", duracaoTurnos: 4, formulaDanoAdicional: "(forca*0.3)+(intelecto*0.3)", tipoElementoLinhagem: true, chanceEfeitoSecundarioElemental: 0.20 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Dano elemental adicional + (Forca * 0.35 + Intelecto * 0.35). Duração 4 turnos. Chance de efeito secundário aumentada.", efeitoDetalhes: { alvo: "self", tipoBuff: "imbuir_dano_elemental_total_com_efeito", duracaoTurnos: 4, formulaDanoAdicional: "(forca*0.35)+(intelecto*0.35)", tipoElementoLinhagem: true, chanceEfeitoSecundarioElemental: 0.30 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Dano elemental adicional + (Forca * 0.4 + Intelecto * 0.4). Duração 5 turnos. Efeito secundário elemental garantido. O Drakyn também ganha brevemente a capacidade de voar baixo (planar) enquanto a fúria dura.", efeitoDetalhes: { alvo: "self", tipoBuff: "furia_draconica_elemental_mestre", duracaoTurnos: 5, formulaDanoAdicional: "(forca*0.4)+(intelecto*0.4)", tipoElementoLinhagem: true, chanceEfeitoSecundarioElemental: 1.0, efeitoAdicional: "planar_limitado" } }
    ]
},
"raca_drakyn_sombra_do_ancestral": {
    id: "raca_drakyn_sombra_do_ancestral",
    nome: "Sombra do Ancestral",
    origemTipo: "raca", origemNome: "Drakyn",
    tipo: "invocacao_avatar_ataque_coordenado",
    descricao: "Um avatar dracônico semitransparente, a sombra de um ancestral, aparece brevemente e espelha os ataques do Drakyn ou realiza um ataque poderoso próprio.",
    cooldownSegundos: 300, // Cooldown alto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_drakyn_olhar_intimidante", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 50, efeitoDesc: "Por 2 turnos, a sombra espelha os ataques corpo-a-corpo do Drakyn, causando 30% do dano do Drakyn como dano Etéreo.", efeitoDetalhes: { tipoEfeito: "avatar_draconico_espelho", duracaoTurnos: 2, percentualDanoEspelhado: 0.30, tipoDanoEspelhado: "Etereo" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 55, efeitoDesc: "Duração 2 turnos. Dano espelhado 40%.", efeitoDetalhes: { tipoEfeito: "avatar_draconico_espelho", duracaoTurnos: 2, percentualDanoEspelhado: 0.40, tipoDanoEspelhado: "Etereo" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 60, efeitoDesc: "Duração 3 turnos. Dano espelhado 50%. A sombra também pode executar um Sopro Dracônico (Nv1 do feitiço de Drakyn) uma vez.", efeitoDetalhes: { tipoEfeito: "avatar_draconico_espelho_habilidade", duracaoTurnos: 3, percentualDanoEspelhado: 0.50, tipoDanoEspelhado: "Etereo", habilidadeAvatar: { idFeitico: "raca_drakyn_sopro_draconico", nivelFeitico: 1, usos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 65, efeitoDesc: "Duração 3 turnos. Dano espelhado 60%. Sopro Dracônico (Nv2) uma vez.", efeitoDetalhes: { tipoEfeito: "avatar_draconico_espelho_habilidade", duracaoTurnos: 3, percentualDanoEspelhado: 0.60, tipoDanoEspelhado: "Etereo", habilidadeAvatar: { idFeitico: "raca_drakyn_sopro_draconico", nivelFeitico: 2, usos: 1 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 70, efeitoDesc: "Duração 4 turnos. Dano espelhado 70%. Sopro Dracônico (Nv3) uma vez. Ao ser dispensado, o avatar causa uma explosão de medo (Raio 5m, chance 50% de Medo por 1 turno).", efeitoDetalhes: { tipoEfeito: "avatar_draconico_mestre", duracaoTurnos: 4, percentualDanoEspelhado: 0.70, tipoDanoEspelhado: "EtereoElementalLinhagem", habilidadeAvatar: { idFeitico: "raca_drakyn_sopro_draconico", nivelFeitico: 3, usos: 1 }, efeitoAoDispensar: { tipo: "explosao_medo", raioMetros: 5, condicao: { nome: "MedoAncestral", chance: 0.50, duracaoTurnos: 1 } } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: DRAKYN ---

// --- FEITIÇOS DE RAÇA: MEI'RA ---
"raca_meira_conexao_natural": {
    id: "raca_meira_conexao_natural",
    nome: "Conexão Natural",
    origemTipo: "raca", origemNome: "Mei'ra",
    tipo: "utilidade_social_deteccao_natureza", // Passivo com componente ativo
    descricao: "Os Mei'ra possuem uma ligação inata com o mundo natural, permitindo-lhes comunicar-se com animais e plantas e sentir perturbações.",
    cooldownSegundos: 60, // Cooldown para a tentativa de acalmar ou obter informação detalhada
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_meira_chamado_da_floresta", aoAtingirNivel: 5 } ],
    niveis: [
        // Passivo: Entendimento básico de animais/plantas. Ativo: Tentar obter informação ou acalmar.
        { nivel: 1, custoPM: 5, efeitoDesc: "Passivo: Entende intenções básicas de animais/plantas. Ativo: Tenta acalmar 1 animal selvagem hostil (chance baseada no Carisma vs agressividade) ou pedir informação simples a uma planta/animal.", efeitoDetalhes: { passivo: "compreensao_natureza_basica", ativo: { tipoEfeito: "interacao_natureza", acalmarAnimalChanceMod: "(carisma*0.02)", obterInformacaoSimples: true } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 6, efeitoDesc: "Passivo: Melhor entendimento. Ativo: Chance de acalmar aumentada. Pode sentir a 'saúde' de uma pequena área natural.", efeitoDetalhes: { passivo: "compreensao_natureza_media", ativo: { tipoEfeito: "interacao_natureza_sensitiva", acalmarAnimalChanceMod: "(carisma*0.03)", obterInformacaoSimples: true, sentirSaudeAreaNatural: { raioMetros: 10 } } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 7, efeitoDesc: "Passivo: Pode pedir pequenos favores a animais/plantas dóceis. Ativo: Chance de acalmar 2 animais. Pode sentir a presença de venenos ou corrupção na natureza próxima.", efeitoDetalhes: { passivo: "compreensao_natureza_pedir_favores", ativo: { tipoEfeito: "interacao_natureza_detectar_corrupcao", acalmarAnimalChanceMod: "(carisma*0.04)", maxAlvosAcalmar: 2, detectarVenenosCorrupcaoNatural: { raioMetros: 15 } } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 8, efeitoDesc: "Passivo: Comunicação mais clara. Ativo: Chance de acalmar aumentada. Pode pedir ajuda a um pequeno grupo de animais (ex: esquilos para distrair).", efeitoDetalhes: { passivo: "comunicacao_natureza_clara", ativo: { tipoEfeito: "interacao_natureza_pedir_ajuda_menor", acalmarAnimalChanceMod: "(carisma*0.05)", maxAlvosAcalmar: 3, pedirAjudaAnimalPequenoGrupo: true } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 9, efeitoDesc: "Passivo: Quase uma simbiose com a natureza local. Ativo: Pode acalmar animais mais ferozes. Pode pedir a uma planta antiga para revelar um segredo ou criar uma passagem temporária. Sente a 'alma' da floresta.", efeitoDetalhes: { passivo: "simbiose_natureza_local", ativo: { tipoEfeito: "interacao_natureza_mestre", acalmarAnimalFerozChanceMod: "(carisma*0.07)", pedirSegredoPlantaAntiga: true, criarPassagemVegetalTemporaria: true } } }
    ]
},
"raca_meira_presenca_tranquila": {
    id: "raca_meira_presenca_tranquila",
    nome: "Presença Tranquila",
    origemTipo: "raca", origemNome: "Mei'ra",
    tipo: "aura_passiva_social_controle_suave",
    descricao: "A aura naturalmente pacífica e diplomática dos Mei'ra pode reduzir a agressividade de criaturas e pessoas neutras ou levemente hostis.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_meira_harmonia_vital", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Criaturas neutras (não naturalmente agressivas) em raio de 5m têm -10% de chance de se tornarem hostis ao Mei'ra.", efeitoDetalhes: { tipoAura: "reducao_agressividade_neutra", raioMetros: 5, reducaoChanceHostilidadePercent: 0.10 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Raio 6m, redução de hostilidade -15%. Pode afetar criaturas levemente hostis (baixa agressividade).", efeitoDetalhes: { tipoAura: "reducao_agressividade_leve", raioMetros: 6, reducaoChanceHostilidadePercent: 0.15, afetaHostilidadeLeve: true }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Raio 7m, redução de hostilidade -20%. Bônus em testes de Carisma para Diplomacia/Persuasão (+5).", efeitoDetalhes: { tipoAura: "reducao_agressividade_diplomacia", raioMetros: 7, reducaoChanceHostilidadePercent: 0.20, afetaHostilidadeLeve: true, bonusCarismaTestesSociais: 5 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Raio 8m, redução de hostilidade -25%. Bônus em testes de Carisma +7.", efeitoDetalhes: { tipoAura: "reducao_agressividade_diplomacia_forte", raioMetros: 8, reducaoChanceHostilidadePercent: 0.25, afetaHostilidadeModerada: true, bonusCarismaTestesSociais: 7 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Raio 10m, redução de hostilidade -30%. Bônus em testes de Carisma +10. Uma vez por dia, pode tentar 'Apaziguar' um grupo hostil, forçando um teste de Carisma para evitar combate imediato.", efeitoDetalhes: { tipoAura: "aura_pacificadora_mestra", raioMetros: 10, reducaoChanceHostilidadePercent: 0.30, afetaHostilidadeModerada: true, bonusCarismaTestesSociais: 10, habilidadeAtivaApaziguar: { usosPorDia: 1, testeResistenciaGrupo: "carisma_vs_moral_media_grupo" } } }
    ]
},
"raca_meira_chamado_da_floresta": {
    id: "raca_meira_chamado_da_floresta",
    nome: "Chamado da Floresta",
    origemTipo: "raca", origemNome: "Mei'ra",
    tipo: "invocacao_temporaria_natureza",
    descricao: "O Mei'ra emite um chamado que ecoa pela natureza, convocando espíritos silvestres ou pequenas criaturas da floresta para auxiliá-lo temporariamente.",
    cooldownSegundos: 180,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_meira_conexao_natural", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Invoca 1-2 Espíritos Silvestres Menores (ex: esquilos, pássaros) por 1 minuto para distrair ou realizar pequenas tarefas.", efeitoDetalhes: { tipoInvocacao: "espiritos_menores_natureza", quantidadeMin: 1, quantidadeMax: 2, duracaoMinutos: 1, tarefas: ["distracao", "pequenos_recados"] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Invoca 2-3 Espíritos Silvestres Menores ou 1 Lobo Espiritual Fraco por 1.5 minutos.", efeitoDetalhes: { tipoInvocacao: "espiritos_natureza_ou_lobo_fraco", quantidadeMenoresMin: 2, quantidadeMenoresMax: 3, invocaLoboEspiritualFraco: true, duracaoMinutos: 1.5 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Invoca 1 Lobo Espiritual ou 1 Urso Espiritual Menor por 2 minutos. Podem combater.", efeitoDetalhes: { tipoInvocacao: "lobo_ou_urso_espiritual_menor", invocaLoboEspiritual: true, invocaUrsoEspiritualMenor: true, duracaoMinutos: 2, podemCombater: true }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Invoca 1 Enxame de Insetos Cortantes ou 1 Guardião Arbóreo Pequeno por 2 minutos.", efeitoDetalhes: { tipoInvocacao: "enxame_insetos_ou_guardiao_arboreo_pequeno", invocaEnxameInsetos: true, invocaGuardiaoArboreoPequeno: true, duracaoMinutos: 2, podemCombater: true }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Invoca 1 Ent Antigo Menor ou 2 Lobos Espirituais Fortes por 3 minutos. Podem proteger, atacar e usar uma habilidade simples da natureza.", efeitoDetalhes: { tipoInvocacao: "ent_menor_ou_lobos_fortes", invocaEntAntigoMenor: true, invocaLobosEspirituaisFortes: 2, duracaoMinutos: 3, podemCombaterProteger: true, habilidadeNaturezaSimples: true } }
    ]
},
"raca_meira_harmonia_vital": {
    id: "raca_meira_harmonia_vital",
    nome: "Harmonia Vital",
    origemTipo: "raca", origemNome: "Mei'ra",
    tipo: "regeneracao_passiva_ativa_condicional_ambiente",
    descricao: "Em sintonia com os ciclos naturais, o Mei'ra recupera vida e mana mais rapidamente sob a luz do sol ou da lua, e pode canalizar essa energia para uma cura mais potente.",
    cooldownSegundos: 60, // Cooldown para a cura ativa
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_meira_presenca_tranquila", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Passivo: Regeneração em ambientes naturais. Ativo: Canalizar para cura.
        { nivel: 1, custoPM: 15, efeitoDesc: "Passivo: +1 PV/PM por minuto sob sol/lua direta. Ativo: Canaliza por 1 turno para curar (Carisma * 2.0) PV em si mesmo.", efeitoDetalhes: { passivo: { regeneracaoPVPMporMinuto: 1, condicaoAmbiente: ["luz_solar_direta", "luz_lunar_direta"] }, ativo: { tipoCura: "PV_self", formulaCura: "(carisma*2.0)", tempoCanalizacaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 18, efeitoDesc: "Passivo: +2 PV/PM por min. Ativo: Cura (Carisma * 2.5) PV em si ou em um aliado tocado.", efeitoDetalhes: { passivo: { regeneracaoPVPMporMinuto: 2 }, ativo: { alvo: "self_ou_aliado_toque", tipoCura: "PV", formulaCura: "(carisma*2.5)", tempoCanalizacaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 21, efeitoDesc: "Passivo: +3 PV/PM por min. Ativo: Cura (Carisma * 3.0) PV. Pode remover um debuff de atributo menor.", efeitoDetalhes: { passivo: { regeneracaoPVPMporMinuto: 3 }, ativo: { alvo: "self_ou_aliado_toque", tipoCura: "PV", formulaCura: "(carisma*3.0)", removeCondicao: "debuff_atributo_menor", tempoCanalizacaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 24, efeitoDesc: "Passivo: +4 PV/PM por min. Ativo: Cura (Carisma * 3.5) PV. Remove debuffs de atributo menores e lentidão.", efeitoDetalhes: { passivo: { regeneracaoPVPMporMinuto: 4 }, ativo: { alvo: "self_ou_aliado_toque", tipoCura: "PV", formulaCura: "(carisma*3.5)", removeCondicao: ["debuff_atributo_menor", "lentidao_leve"], tempoCanalizacaoTurnos: 1 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 27, efeitoDesc: "Passivo: +5 PV/PM por min. Ativo: Cura (Carisma * 4.0) PV e (Intelecto * 1.0) PM. Remove a maioria dos debuffs não mágicos. A cura pode ser em área pequena (raio 2m) se canalizada por 2 turnos.", efeitoDetalhes: { passivo: { regeneracaoPVPMporMinuto: 5 }, ativo: { alvo: "self_ou_aliado_toque_ou_area_canalizada", tipoCura: ["PV", "PM"], formulaCuraPV: "(carisma*4.0)", formulaCuraPM: "(intelecto*1.0)", removeCondicao: "debuff_nao_magico_comum", canalizacaoParaArea: { turnos: 2, raioMetros: 2 } } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: MEI'RA ---

// --- FEITIÇOS DE RAÇA: THORNAK ---
"raca_thornak_forca_bruta": {
    id: "raca_thornak_forca_bruta",
    nome: "Força Bruta",
    origemTipo: "raca", origemNome: "Thornak",
    tipo: "passivo_bonus_dano_penetracao",
    descricao: "A poderosa musculatura e ferocidade dos Thornak permitem que seus ataques físicos ignorem uma parte da armadura dos inimigos.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_thornak_linhagem_feroz", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Ataques corpo-a-corpo ignoram 5% da Defesa Base do alvo.", efeitoDetalhes: { tipoEfeito: "penetracao_armadura_passiva_cac", percentualIgnorado: 0.05 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Ignora 7% da Defesa Base.", efeitoDetalhes: { tipoEfeito: "penetracao_armadura_passiva_cac", percentualIgnorado: 0.07 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Ignora 10% da Defesa Base. Ataques com armas pesadas (ex: machados, maças) têm chance de empurrar levemente.", efeitoDetalhes: { tipoEfeito: "penetracao_armadura_passiva_cac_com_empurrao", percentualIgnorado: 0.10, chanceEmpurrarArmaPesada: 0.15, distanciaEmpurraoMetros: 0.5 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Ignora 12% da Defesa Base. Chance de empurrar aumentada.", efeitoDetalhes: { tipoEfeito: "penetracao_armadura_passiva_cac_com_empurrao", percentualIgnorado: 0.12, chanceEmpurrarArmaPesada: 0.20, distanciaEmpurraoMetros: 0.5 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Ignora 15% da Defesa Base. Ataques com armas pesadas podem atordoar brevemente (0.5s) com 10% de chance se o alvo estiver com armadura danificada (efeito narrativo/mecânico).", efeitoDetalhes: { tipoEfeito: "forca_bruta_mestra", percentualIgnorado: 0.15, condicaoAtordoarArmaPesada: { chance: 0.10, duracaoSegundos: 0.5, requerArmaduraDanificada: true } } }
    ]
},
"raca_thornak_instinto_de_guerra": {
    id: "raca_thornak_instinto_de_guerra",
    nome: "Instinto de Guerra",
    origemTipo: "raca", origemNome: "Thornak",
    tipo: "passivo_buff_iniciativa_percepcao_combate",
    descricao: "Os Thornak possuem um instinto aguçado para o combate, permitindo-lhes reagir mais rapidamente e perceber perigos iminentes.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_thornak_eco_tribal", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Ganha +7 de Iniciativa. Leve bônus para detectar emboscadas.", efeitoDetalhes: { bonusIniciativa: 7, bonusDeteccaoEmboscaLeve: true }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "+9 Iniciativa. Bônus de detecção melhorado.", efeitoDetalhes: { bonusIniciativa: 9, bonusDeteccaoEmboscaMedio: true }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "+12 Iniciativa. Pode realizar uma ação de esquiva bônus (usando reação) uma vez por combate se for surpreendido.", efeitoDetalhes: { bonusIniciativa: 12, esquivaBonusSurpresa: { usosPorCombate: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "+14 Iniciativa. Esquiva bônus aprimorada (maior chance de sucesso).", efeitoDetalhes: { bonusIniciativa: 14, esquivaBonusSurpresa: { usosPorCombate: 1, chanceSucessoMod: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "+16 Iniciativa. Não pode ser surpreendido em combate (sempre age na primeira rodada, a menos que incapacitado). Esquiva bônus pode ser usada duas vezes.", efeitoDetalhes: { bonusIniciativa: 16, imuneASurpresa: true, esquivaBonusSurpresa: { usosPorCombate: 2, chanceSucessoMod: 0.15 } } }
    ]
},
"raca_thornak_linhagem_feroz": {
    id: "raca_thornak_linhagem_feroz",
    nome: "Linhagem Feroz",
    origemTipo: "raca", origemNome: "Thornak",
    tipo: "buff_pessoal_dano_critico_temporario",
    descricao: "O Thornak desperta a fúria de sua linhagem ancestral, aumentando drasticamente seu dano físico e chance de crítico por um curto período.",
    cooldownSegundos: 180,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_thornak_forca_bruta", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Por 2 turnos, Dano Físico +15% e Chance de Crítico +10%.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.15 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.10 }] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Dano Físico +18%, Chance Crítico +12%. Duração 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.18 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.12 }] }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Dano Físico +22%, Chance Crítico +15%. Duração 3 turnos. Também ganha resistência a dor (ignora penalidades por ferimentos leves).", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.22 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.15 }], buffAdicional: { nome: "Fúria Indomável", efeitoDesc: "Resistência à Dor Leve" } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Dano Físico +26%, Chance Crítico +18%. Duração 3 turnos. Resistência à dor aprimorada.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.26 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.18 }], buffAdicional: { nome: "Fúria Indomável Forte", efeitoDesc: "Resistência à Dor Moderada" } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Dano Físico +30%, Chance Crítico +22%, Dano Crítico +25%. Duração 4 turnos. Imune a dor (ignora penalidades de ferimentos não fatais). Ao final, sofre exaustão (-10 Força por 2 turnos).", efeitoDetalhes: { alvo: "self", duracaoTurnos: 4, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.30 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.22 }, { atributo: "danoCriticoPercent", modificador: "percentual_aditivo", valor: 0.25 }], buffAdicional: { nome: "Fúria Ancestral", imunidadeDor: true }, debuffAoFinalizar: { atributo: "forca", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 } } }
    ]
},
"raca_thornak_eco_tribal": {
    id: "raca_thornak_eco_tribal",
    nome: "Eco Tribal",
    origemTipo: "raca", origemNome: "Thornak",
    tipo: "buff_area_aliados_especificos_moral",
    descricao: "O Thornak solta um grito de guerra ancestral que ecoa com o poder de sua tribo, inspirando coragem e ferocidade em aliados de raças mistas ou com sangue bestial.",
    cooldownSegundos: 150,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_thornak_instinto_de_guerra", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Afeta aliados que se encaixam na descrição "misto" ou "bestial" (ex: Mei'ra, Thornak, Ravkar, Drakyn talvez).
        { nivel: 1, custoPM: 20, efeitoDesc: "Aliados 'Mistos/Bestiais' em raio de 8m ganham +10% de Dano Físico por 2 turnos.", efeitoDetalhes: { alvo: "area_aliados_especificos", tiposAlvoAfetados: ["Misto", "Bestial"], raioMetros: 8, buff: { atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.10 }, duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Dano Físico +12%. Raio 9m. Duração 2 turnos.", efeitoDetalhes: { alvo: "area_aliados_especificos", tiposAlvoAfetados: ["Misto", "Bestial"], raioMetros: 9, buff: { atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.12 }, duracaoTurnos: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Dano Físico +15% e +5 de Vitalidade. Raio 10m. Duração 3 turnos.", efeitoDetalhes: { alvo: "area_aliados_especificos", tiposAlvoAfetados: ["Misto", "Bestial"], raioMetros: 10, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.15 }, { atributo: "vitalidade", modificador: "fixo_aditivo", valor: 5 }], duracaoTurnos: 3 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Dano Físico +18% e +7 Vitalidade. Raio 11m. Duração 3 turnos. Aliados afetados também ganham resistência a medo.", efeitoDetalhes: { alvo: "area_aliados_especificos", tiposAlvoAfetados: ["Misto", "Bestial"], raioMetros: 11, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.18 }, { atributo: "vitalidade", modificador: "fixo_aditivo", valor: 7 }], duracaoTurnos: 3, buffAdicional: "resistencia_medo" }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Dano Físico +22%, +10 Vitalidade e +5% Chance de Crítico. Raio 12m. Duração 4 turnos. Aliados afetados são imunes a medo e ganham uma pequena regeneração de fúria/PM.", efeitoDetalhes: { alvo: "area_aliados_especificos", tiposAlvoAfetados: ["Misto", "Bestial"], raioMetros: 12, buffs: [{ atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.22 }, { atributo: "vitalidade", modificador: "fixo_aditivo", valor: 10 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.05 }], duracaoTurnos: 4, buffAdicional: "imunidade_medo", regeneracaoRecursoSecundario: true } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: THORNAK ---

// --- FEITIÇOS DE RAÇA: LUNARI ---
"raca_lunari_sonho_lucido": {
    id: "raca_lunari_sonho_lucido",
    nome: "Sonho Lúcido",
    origemTipo: "raca", origemNome: "Lunari",
    tipo: "utilidade_deteccao_premonicao_passiva_ativa",
    descricao: "A conexão dos Lunari com o plano onírico e os mistérios da noite lhes concede vislumbres do perigo iminente e a capacidade de interpretar presságios.",
    cooldownSegundos: 300, // Cooldown para a ativação de uma visão mais clara
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_lunari_caminho_dos_sonhos", aoAtingirNivel: 5 } ],
    niveis: [
        // Passivo: Alertas de perigo. Ativo: Tentar ter uma visão mais clara.
        { nivel: 1, custoPM: 10, efeitoDesc: "Passivo: Chance de receber um 'mau pressentimento' antes de uma emboscada ou perigo oculto (alerta do DM). Ativo: Medita por 1 min para tentar ter uma visão sobre um perigo imediato ou local (chance baseada em Carisma).", efeitoDetalhes: { passivo: { nome: "Sexto Sentido Lunar", chanceAlertaPerigo: 0.15 }, ativo: { tipoEfeito: "visao_premonitoria_basica", tempoMeditacaoMin: 1, chanceSucessoVisaoMod: "(carisma*0.02)" } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Passivo: Chance de alerta aumentada (20%). Ativo: Visão pode ser sobre uma pessoa específica ou objeto de interesse.", efeitoDetalhes: { passivo: { chanceAlertaPerigo: 0.20 }, ativo: { tipoEfeito: "visao_premonitoria_focada", tempoMeditacaoMin: 1, chanceSucessoVisaoMod: "(carisma*0.025)", focoVisao: ["pessoa", "objeto"] } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Passivo: Chance de alerta 25%. Ativo: Visão mais clara, pode revelar um detalhe crucial. Pode tentar uma vez por dia 'ler' os sonhos recentes de um alvo adormecido próximo (requer consentimento ou teste de Carisma vs Vontade).", efeitoDetalhes: { passivo: { chanceAlertaPerigo: 0.25 }, ativo: { tipoEfeito: "visao_premonitoria_detalhada", tempoMeditacaoMin: 1, chanceSucessoVisaoMod: "(carisma*0.03)" }, habilidadeAdicional: { nome: "Leitura Onírica", usosPorDia: 1, requerAlvoAdormecido: true } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Passivo: Chance de alerta 30%. Ativo: Visão pode mostrar possíveis futuros imediatos (2-3 opções breves).", efeitoDetalhes: { passivo: { chanceAlertaPerigo: 0.30 }, ativo: { tipoEfeito: "visao_futuros_possiveis", tempoMeditacaoMin: 1, chanceSucessoVisaoMod: "(carisma*0.035)", numeroFuturosVistos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Passivo: Chance de alerta 35%, pode sentir a 'ressonância emocional' de locais. Ativo: Visão muito clara, pode fazer uma pergunta específica ao 'plano onírico' (resposta do DM, pode ser enigmática). Leitura Onírica aprimorada.", efeitoDetalhes: { passivo: { chanceAlertaPerigo: 0.35, sentirRessonanciaEmocionalLocal: true }, ativo: { tipoEfeito: "comunhao_onirica", tempoMeditacaoMin: 1, chanceSucessoVisaoMod: "(carisma*0.04)", permitePerguntaEspecifica: true }, habilidadeAdicional: { nome: "Leitura Onírica Profunda" } } }
    ]
},
"raca_lunari_luz_lunar": {
    id: "raca_lunari_luz_lunar",
    nome: "Luz Lunar",
    origemTipo: "raca", origemNome: "Lunari",
    tipo: "hibrido_regeneracao_pm_ataque_magico_condicional_ambiente",
    descricao: "Os Lunari podem absorver a energia da lua para recuperar seu poder mágico ou canalizá-la como um suave raio de luz que pode ferir ou curar levemente, dependendo da fase lunar e da intenção.",
    cooldownSegundos: 10,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_lunari_eclipse_interior", aoAtingirNivel: 5 } ],
    niveis: [
        // Efeito depende da fase da lua (Lua Nova: foco em PM; Crescente/Minguante: Híbrido; Cheia: foco em efeito mágico)
        // Exemplo: Durante a noite. Durante o dia, o efeito é muito fraco ou nulo.
        { nivel: 1, custoPM: 0, efeitoDesc: "À noite: Recupera (Carisma * 0.5) PM ou causa (Intelecto * 0.5) de dano Lunar/Sagrado leve. Efeito +25% em Lua Cheia, -25% em Lua Nova (para dano/cura, PM é invertido).", efeitoDetalhes: { condicaoAmbiente: "noite", recuperaPMBase: "(carisma*0.5)", formulaDanoBase: "(intelecto*0.5)", tipoDano: "Lunar", modificadorFaseLua: { cheiaBonus: 0.25, novaMalusDanoCura: -0.25, novaBonusPMRecuperado: 0.25 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Recupera (Carisma * 0.6) PM ou Dano (Intelecto * 0.6). Modificador Lua +/-30%.", efeitoDetalhes: { condicaoAmbiente: "noite", recuperaPMBase: "(carisma*0.6)", formulaDanoBase: "(intelecto*0.6)", tipoDano: "Lunar", modificadorFaseLua: { cheiaBonus: 0.30, novaMalusDanoCura: -0.30, novaBonusPMRecuperado: 0.30 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Recupera (Carisma * 0.7) PM ou Dano (Intelecto * 0.7). Modificador Lua +/-35%. Pode optar por uma cura leve (Carisma * 0.5) em vez de dano.", efeitoDetalhes: { condicaoAmbiente: "noite", recuperaPMBase: "(carisma*0.7)", formulaDanoBase: "(intelecto*0.7)", tipoDano: "Lunar", formulaCuraAlternativa: "(carisma*0.5)", modificadorFaseLua: { cheiaBonus: 0.35, novaMalusDanoCura: -0.35, novaBonusPMRecuperado: 0.35 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Recupera (Carisma * 0.8) PM ou Dano (Intelecto * 0.8). Modificador Lua +/-40%. Cura (Carisma * 0.6).", efeitoDetalhes: { condicaoAmbiente: "noite", recuperaPMBase: "(carisma*0.8)", formulaDanoBase: "(intelecto*0.8)", tipoDano: "Lunar", formulaCuraAlternativa: "(carisma*0.6)", modificadorFaseLua: { cheiaBonus: 0.40, novaMalusDanoCura: -0.40, novaBonusPMRecuperado: 0.40 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Recupera (Carisma * 1.0) PM ou Dano (Intelecto * 1.0). Modificador Lua +/-50%. Cura (Carisma * 0.7). Em Lua Cheia, o dano/cura pode atingir um segundo alvo próximo com 50% da eficácia.", efeitoDetalhes: { condicaoAmbiente: "noite", recuperaPMBase: "(carisma*1.0)", formulaDanoBase: "(intelecto*1.0)", tipoDano: "Lunar", formulaCuraAlternativa: "(carisma*0.7)", modificadorFaseLua: { cheiaBonus: 0.50, novaMalusDanoCura: -0.50, novaBonusPMRecuperado: 0.50, cheiaEfeitoRicochete: { chance: 1.0, percentualEficacia: 0.50 } } } }
    ]
},
"raca_lunari_caminho_dos_sonhos": {
    id: "raca_lunari_caminho_dos_sonhos",
    nome: "Caminho dos Sonhos",
    origemTipo: "raca", origemNome: "Lunari",
    tipo: "mobilidade_furtividade_ambiente_condicional",
    descricao: "Utilizando sua afinidade com o crepúsculo e o onírico, o Lunari pode se teleportar através de áreas de sombra densa ou névoa espessa.",
    cooldownSegundos: 45,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_lunari_sonho_lucido", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Teleporta de uma sombra/névoa para outra visível em até 10m. Requer sombra/névoa em ambos os pontos.", efeitoDetalhes: { tipoMovimento: "teleporte_condicional_ambiente", condicaoAmbiente: ["sombra_densa", "nevoa_espesa"], distanciaMaxMetros: 10, requerVisaoDestino: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Distância 12m. Pode levar um item pequeno consigo.", efeitoDetalhes: { tipoMovimento: "teleporte_condicional_ambiente", condicaoAmbiente: ["sombra_densa", "nevoa_espesa"], distanciaMaxMetros: 12, requerVisaoDestino: true, podeLevarItemPequeno: true }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Distância 15m. Ao sair da sombra/névoa, fica invisível por 2 segundos.", efeitoDetalhes: { tipoMovimento: "teleporte_condicional_ambiente_furtivo", condicaoAmbiente: ["sombra_densa", "nevoa_espesa"], distanciaMaxMetros: 15, requerVisaoDestino: true, buffSaida: { nome: "Invisibilidade Onírica", duracaoSegundos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Distância 18m. Invisibilidade por 3 segundos. Pode levar um aliado voluntário que também esteja na sombra/névoa.", efeitoDetalhes: { tipoMovimento: "teleporte_condicional_ambiente_furtivo_grupo", condicaoAmbiente: ["sombra_densa", "nevoa_espesa"], distanciaMaxMetros: 18, requerVisaoDestino: true, buffSaida: { nome: "Invisibilidade Onírica", duracaoSegundos: 3 }, podeLevarAliadoVoluntario: 1 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Distância 25m. Invisibilidade por 4 segundos. Pode atravessar para o 'Reino dos Sonhos' brevemente para evitar um ataque (1x/dia, reação) ou para viajar longas distâncias (requer ritual).", efeitoDetalhes: { tipoMovimento: "mestre_caminho_dos_sonhos", condicaoAmbiente: ["sombra_densa", "nevoa_espesa", "noite_profunda"], distanciaMaxMetros: 25, requerVisaoDestino: true, buffSaida: { nome: "Invisibilidade Onírica Profunda", duracaoSegundos: 4 }, podeLevarAliadoVoluntario: 1, habilidadeEspecialViagemOnirica: true } }
    ]
},
"raca_lunari_eclipse_interior": {
    id: "raca_lunari_eclipse_interior",
    nome: "Eclipse Interior",
    origemTipo: "raca", origemNome: "Lunari",
    tipo: "buff_pessoal_adaptativo_dual",
    descricao: "O Lunari pode sintonizar sua energia interna com a fase lunar ou o ambiente (luz/sombra), alternando entre buffs ofensivos de sombra ou buffs defensivos/regenerativos de luz.",
    cooldownSegundos: 30, // Cooldown para alternar a postura
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_lunari_luz_lunar", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // O jogador escolhe qual postura (Luz ou Sombra) ativar.
        { nivel: 1, custoPM: 20, efeitoDesc: "Postura da Sombra: +10% Dano Furtivo, movimento mais silencioso. Postura da Luz: +10% Eficácia de Cura recebida, leve regeneração de PM (+1/turno). Dura 3 turnos.", efeitoDetalhes: { tipoEfeito: "alternar_postura_dual", duracaoTurnosPostura: 3, posturas: { sombra: { buffs: [{atributo:"danoFurtivoPercent", valor:0.10}, {nome:"MovimentoSilencioso"}] }, luz: { buffs: [{atributo:"eficaciaCuraRecebidaPercent", valor:0.10}, {atributo:"regeneracaoPM", valor:1}] } } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Sombra: +12% Dano Furt. Luz: +12% Cura Rec, Regen PM +2. Dura 3 turnos.", efeitoDetalhes: { duracaoTurnosPostura: 3, posturas: { sombra: { buffs: [{atributo:"danoFurtivoPercent", valor:0.12}, {nome:"MovimentoSilencioso"}] }, luz: { buffs: [{atributo:"eficaciaCuraRecebidaPercent", valor:0.12}, {atributo:"regeneracaoPM", valor:2}] } } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Sombra: +15% Dano Furt, +5% Chance Crítico em Furtividade. Luz: +15% Cura Rec, Regen PM +3, leve resistência a dano Sombrio. Dura 4 turnos.", efeitoDetalhes: { duracaoTurnosPostura: 4, posturas: { sombra: { buffs: [{atributo:"danoFurtivoPercent", valor:0.15}, {atributo:"chanceCriticoFurtivoPercent", valor:0.05}, {nome:"MovimentoSilencioso"}] }, luz: { buffs: [{atributo:"eficaciaCuraRecebidaPercent", valor:0.15}, {atributo:"regeneracaoPM", valor:3}, {atributo:"resistenciaDanoSombrio", valor:0.05}] } } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Sombra: +18% Dano Furt, +7% Chance Crítico. Luz: +18% Cura Rec, Regen PM +4, Resist. Sombrio +7%. Dura 4 turnos.", efeitoDetalhes: { duracaoTurnosPostura: 4, posturas: { sombra: { buffs: [{atributo:"danoFurtivoPercent", valor:0.18}, {atributo:"chanceCriticoFurtivoPercent", valor:0.07}, {nome:"MovimentoSilencioso"}] }, luz: { buffs: [{atributo:"eficaciaCuraRecebidaPercent", valor:0.18}, {atributo:"regeneracaoPM", valor:4}, {atributo:"resistenciaDanoSombrio", valor:0.07}] } } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Sombra: +22% Dano Furt, +10% Chance Crítico, ataques podem aplicar 'Terror Noturno' (debuff Carisma). Luz: +22% Cura Rec, Regen PM +5, Resist. Sombrio +10%, pequena aura de cura para aliados próximos. Dura 5 turnos.", efeitoDetalhes: { duracaoTurnosPostura: 5, posturas: { sombra: { buffs: [{atributo:"danoFurtivoPercent", valor:0.22}, {atributo:"chanceCriticoFurtivoPercent", valor:0.10}, {nome:"MovimentoSilenciosoAvançado"}], condicaoAtaque: {nome:"TerrorNoturno", chance:0.2, debuffCarisma:5, duracaoTurnos:2} }, luz: { buffs: [{atributo:"eficaciaCuraRecebidaPercent", valor:0.22}, {atributo:"regeneracaoPM", valor:5}, {atributo:"resistenciaDanoSombrio", valor:0.10}], auraCuraAliados: {raioMetros:3, formulaCuraPorTurno:"(carisma*0.1)"} } } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: LUNARI ---

// --- FEITIÇOS DE RAÇA: SOMBRIOS ---
"raca_sombrio_forma_sombria": {
    id: "raca_sombrio_forma_sombria",
    nome: "Forma Sombria",
    origemTipo: "raca", origemNome: "Sombrio",
    tipo: "utilidade_furtividade_mobilidade_condicional",
    descricao: "O Sombrio pode mesclar-se com as sombras, tornando-se parcialmente etéreo para atravessar obstáculos finos ou se ocultar melhor.",
    cooldownSegundos: 30, // Cooldown para ativar a forma
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_sombrio_veu_da_morte", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Por 2 turnos, pode atravessar frestas e grades. Bônus de +10 em Furtividade em áreas escuras.", efeitoDetalhes: { tipoEfeito: "forma_eterea_parcial", duracaoTurnos: 2, atravessaObstaculosMenores: true, bonusFurtividadeEscuridao: 10 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 11, efeitoDesc: "Duração 2 turnos. Atravessa obstáculos um pouco maiores. Bônus Furtividade +12.", efeitoDetalhes: { tipoEfeito: "forma_eterea_parcial", duracaoTurnos: 2, atravessaObstaculosMenoresAprimorado: true, bonusFurtividadeEscuridao: 12 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 12, efeitoDesc: "Duração 3 turnos. Pode se mover através de inimigos (sem provocar ataque de oportunidade) se estiver em sombra. Bônus Furtividade +15.", efeitoDetalhes: { tipoEfeito: "forma_sombria_movimento", duracaoTurnos: 3, atravessaInimigosEmSombra: true, bonusFurtividadeEscuridao: 15 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 13, efeitoDesc: "Duração 3 turnos. Movimento através de inimigos mais fácil. Bônus Furtividade +18. Leve resistência a dano não mágico enquanto na forma.", efeitoDetalhes: { tipoEfeito: "forma_sombria_movimento_resistente", duracaoTurnos: 3, atravessaInimigosEmSombra: true, bonusFurtividadeEscuridao: 18, resistenciaDanoNaoMagicoPercent: 0.05 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 14, efeitoDesc: "Duração 4 turnos. Pode se tornar brevemente invisível (1 turno) ao entrar em uma sombra profunda. Bônus Furtividade +20. Resistência a dano não mágico 10%.", efeitoDetalhes: { tipoEfeito: "mestre_forma_sombria", duracaoTurnos: 4, atravessaInimigosEmSombra: true, bonusFurtividadeEscuridao: 20, resistenciaDanoNaoMagicoPercent: 0.10, invisibilidadeAoEntrarSombraProfunda: { duracaoTurnos: 1 } } }
    ]
},
"raca_sombrio_toque_macabro": {
    id: "raca_sombrio_toque_macabro",
    nome: "Toque Macabro",
    origemTipo: "raca", origemNome: "Sombrio",
    tipo: "ataque_magico_unico_debuff",
    descricao: "Um toque gélido e infundido com energia negativa que causa dor intensa e lentidão no alvo.",
    cooldownSegundos: 10,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_sombrio_alma_quebrada", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 8, efeitoDesc: "Causa (Intelecto * 0.8) de dano Sombrio e reduz Agilidade do alvo em 5 por 1 turno.", efeitoDetalhes: { alvo: "unico_toque", tipoDano: "SombrioFrio", formulaDano: "(intelecto*0.8)", debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Dano (Intelecto * 0.9). Reduz Agilidade em 7 por 1 turno.", efeitoDetalhes: { alvo: "unico_toque", tipoDano: "SombrioFrio", formulaDano: "(intelecto*0.9)", debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 7, duracaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Dano (Intelecto * 1.0). Reduz Agilidade em 10 por 2 turnos. Também causa 'Calafrio' (pequena chance de falhar em ações físicas).", efeitoDetalhes: { alvo: "unico_toque", tipoDano: "SombrioFrio", formulaDano: "(intelecto*1.0)", debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 }, condicao: { nome: "CalafrioSombrio", chance: 0.15, duracaoTurnos: 2, efeitoDesc: "Chance de falha em ações físicas" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Dano (Intelecto * 1.1). Reduz Agilidade em 12 por 2 turnos. Chance de 'Calafrio' aumentada.", efeitoDetalhes: { alvo: "unico_toque", tipoDano: "SombrioFrio", formulaDano: "(intelecto*1.1)", debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 12, duracaoTurnos: 2 }, condicao: { nome: "CalafrioSombrio", chance: 0.20, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Dano (Intelecto * 1.3). Reduz Agilidade em 15 por 3 turnos. 'Calafrio Intenso' garantido. O toque também pode drenar uma pequena quantidade de PM do alvo.", efeitoDetalhes: { alvo: "unico_toque", tipoDano: "SombrioFrio", formulaDano: "(intelecto*1.3)", debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 15, duracaoTurnos: 3 }, condicao: { nome: "CalafrioSombrioIntenso", chance: 1.0, duracaoTurnos: 3 }, drenagemPM: { formulaValor: "(intelecto*0.2)" } } }
    ]
},
"raca_sombrio_veu_da_morte": {
    id: "raca_sombrio_veu_da_morte",
    nome: "Véu da Morte",
    origemTipo: "raca", origemNome: "Sombrio",
    tipo: "utilidade_furtividade_invisibilidade_condicional",
    descricao: "O Sombrio se cobre com um véu de sombras profundas, tornando-se completamente invisível em ambientes escuros ou com pouca luz.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_sombrio_forma_sombria", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Fica invisível por até 30 segundos enquanto permanecer em escuridão/penumbra. Quebra ao atacar ou usar habilidade.", efeitoDetalhes: { tipoEfeito: "invisibilidade_condicional", condicaoAmbiente: ["escuridao", "penumbra"], duracaoMaxSegundos: 30, quebraAoAgir: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Invisibilidade por até 45 segundos. Pode se mover um pouco mais rápido sem quebrar.", efeitoDetalhes: { tipoEfeito: "invisibilidade_condicional", condicaoAmbiente: ["escuridao", "penumbra"], duracaoMaxSegundos: 45, quebraAoAgir: true, bonusMovimentoFurtivo: 0.10 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Invisibilidade por até 1 minuto. O primeiro ataque realizado ao sair da invisibilidade causa +25% de dano.", efeitoDetalhes: { tipoEfeito: "invisibilidade_condicional_ofensiva", condicaoAmbiente: ["escuridao", "penumbra"], duracaoMaxSegundos: 60, quebraAoAgir: true, bonusDanoPrimeiroAtaquePercent: 0.25 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Invisibilidade por até 1.5 minutos. Bônus de dano +35%. Pode realizar uma ação não ofensiva (ex: abrir porta) sem quebrar.", efeitoDetalhes: { tipoEfeito: "invisibilidade_condicional_ofensiva_versatil", condicaoAmbiente: ["escuridao", "penumbra"], duracaoMaxSegundos: 90, quebraAoAgirOfensivamente: true, permiteAcaoNaoOfensiva: true, bonusDanoPrimeiroAtaquePercent: 0.35 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Invisibilidade por até 2 minutos. Bônus de dano +50%. Não quebra com ações não ofensivas. Ao reaparecer, pode causar Medo em alvos próximos com baixa Vontade.", efeitoDetalhes: { tipoEfeito: "manto_das_sombras_eterno", condicaoAmbiente: ["escuridao", "penumbra", "noite"], duracaoMaxSegundos: 120, quebraAoAgirOfensivamente: true, permiteAcaoNaoOfensiva: true, bonusDanoPrimeiroAtaquePercent: 0.50, efeitoAoReaparecer: { condicao: { nome: "MedoSubito", chanceVsVontadeAlvo: true, raioMetros: 3, duracaoTurnos: 1 } } } }
    ]
},
"raca_sombrio_alma_quebrada": {
    id: "raca_sombrio_alma_quebrada",
    nome: "Alma Quebrada",
    origemTipo: "raca", origemNome: "Sombrio",
    tipo: "debuff_unico_reducao_atributos_massiva",
    descricao: "O Sombrio foca sua energia negativa em um único alvo, tentando estilhaçar sua força de vontade e resiliência, reduzindo drasticamente seus atributos.",
    cooldownSegundos: 240, // Cooldown alto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_sombrio_toque_macabro", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Reduz todos os atributos primários do alvo em (Intelecto * 0.1) por 2 turnos. Requer teste de Vontade (Carisma do alvo vs Intelecto do Sombrio).", efeitoDetalhes: { alvo: "unico", testeResistencia: { atributoAlvo: "carisma", atributoConjurador: "intelecto" }, debuffGeralAtributosFormula: "(intelecto*0.1)", duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Reduz atributos em (Intelecto * 0.12) por 2 turnos. Teste de Vontade mais difícil para o alvo.", efeitoDetalhes: { alvo: "unico", testeResistencia: { atributoAlvo: "carisma", atributoConjurador: "intelecto", modificadorDificuldadeAlvo: -5 }, debuffGeralAtributosFormula: "(intelecto*0.12)", duracaoTurnos: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Reduz atributos em (Intelecto * 0.15) por 3 turnos. O alvo também tem sua regeneração de PM reduzida pela metade.", efeitoDetalhes: { alvo: "unico", testeResistencia: { atributoAlvo: "carisma", atributoConjurador: "intelecto", modificadorDificuldadeAlvo: -7 }, debuffGeralAtributosFormula: "(intelecto*0.15)", duracaoTurnos: 3, debuffAdicional: { atributo: "regeneracaoPM", modificador: "percentual_negativo_multiplicativo", valor: 0.50 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Reduz atributos em (Intelecto * 0.18) por 3 turnos. Regeneração de PM bloqueada.", efeitoDetalhes: { alvo: "unico", testeResistencia: { atributoAlvo: "carisma", atributoConjurador: "intelecto", modificadorDificuldadeAlvo: -10 }, debuffGeralAtributosFormula: "(intelecto*0.18)", duracaoTurnos: 3, debuffAdicional: { atributo: "regeneracaoPM", modificador: "bloqueio_total", valor: 0 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Reduz atributos em (Intelecto * 0.22) por 4 turnos. Regeneração de PM e PV bloqueada. O alvo não pode receber buffs de moral ou inspiração enquanto durar o efeito.", efeitoDetalhes: { alvo: "unico", testeResistencia: { atributoAlvo: "carisma", atributoConjurador: "intelecto", modificadorDificuldadeAlvo: -12 }, debuffGeralAtributosFormula: "(intelecto*0.22)", duracaoTurnos: 4, debuffsAdicionais: [{ atributo: "regeneracaoPM", modificador: "bloqueio_total", valor: 0 }, { atributo: "regeneracaoPV", modificador: "bloqueio_total", valor: 0 }], bloqueiaBuffsTipo: ["moral", "inspiracao"] } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: SOMBRIOS ---

// --- FEITIÇOS DE RAÇA: RAVKARS ---
"raca_ravkar_frenesi_animal": {
    id: "raca_ravkar_frenesi_animal",
    nome: "Frenesi Animal",
    origemTipo: "raca", origemNome: "Ravkar",
    tipo: "buff_pessoal_ofensivo_velocidade",
    descricao: "O Ravkar sucumbe a seus instintos bestiais, entrando em um frenesi que aumenta drasticamente sua velocidade de ataque e dano físico por um curto período.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_ravkar_instinto_primordial", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Por 2 turnos, ganha +10% de Velocidade de Ataque e + (Forca * 0.15) de Dano Físico.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "velocidadeAtaquePercent", valor: 0.10 }, { atributo: "danoFisicoAdicional", formulaValor: "(forca*0.15)" }] }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Vel. Ataque +12%, Dano Físico + (Forca * 0.18). Duração 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, buffs: [{ atributo: "velocidadeAtaquePercent", valor: 0.12 }, { atributo: "danoFisicoAdicional", formulaValor: "(forca*0.18)" }] }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Vel. Ataque +15%, Dano Físico + (Forca * 0.22). Duração 3 turnos. Também ganha +5 de Agilidade.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "velocidadeAtaquePercent", valor: 0.15 }, { atributo: "danoFisicoAdicional", formulaValor: "(forca*0.22)" }, { atributo: "agilidade", modificador: "fixo_aditivo", valor: 5 }] }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Vel. Ataque +18%, Dano Físico + (Forca * 0.26). Duração 3 turnos. Agilidade +7.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, buffs: [{ atributo: "velocidadeAtaquePercent", valor: 0.18 }, { atributo: "danoFisicoAdicional", formulaValor: "(forca*0.26)" }, { atributo: "agilidade", modificador: "fixo_aditivo", valor: 7 }] }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Vel. Ataque +22%, Dano Físico + (Forca * 0.30). Duração 4 turnos. Agilidade +10. Durante o frenesi, ataques têm chance de causar Sangramento.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 4, buffs: [{ atributo: "velocidadeAtaquePercent", valor: 0.22 }, { atributo: "danoFisicoAdicional", formulaValor: "(forca*0.30)" }, { atributo: "agilidade", modificador: "fixo_aditivo", valor: 10 }], condicaoAtaque: { nome: "SangramentoFeroz", chance: 0.20, duracaoTurnos: 2, formulaDanoPorTurno: "(forca*0.1)" } } }
    ]
},
"raca_ravkar_cheiro_de_sangue": {
    id: "raca_ravkar_cheiro_de_sangue",
    nome: "Cheiro de Sangue",
    origemTipo: "raca", origemNome: "Ravkar",
    tipo: "passivo_deteccao_buff_condicional",
    descricao: "Os sentidos aguçados do Ravkar permitem localizar inimigos feridos com facilidade, e ele se torna mais perigoso ao enfrentar presas enfraquecidas.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_ravkar_rugido_de_guerra_bestial", aoAtingirNivel: 5 } ], // Renomeado para evitar conflito
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Pode detectar a direção geral de seres vivos com PV abaixo de 50% em um raio de 20m. Causa +5% de dano a alvos com PV < 50%.", efeitoDetalhes: { tipoEfeito: "deteccao_passiva_feridos_bonus_dano", raioDeteccaoMetros: 20, limiarPVPercentDeteccao: 0.50, bonusDanoAlvoFeridoPercent: 0.05, limiarPVPercentBonusDano: 0.50 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Raio detecção 25m. Bônus de dano +7% a alvos com PV < 50%.", efeitoDetalhes: { raioDeteccaoMetros: 25, bonusDanoAlvoFeridoPercent: 0.07 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Raio detecção 30m. Bônus de dano +10% a alvos com PV < 50%. Também ganha +5% de chance de crítico contra esses alvos.", efeitoDetalhes: { raioDeteccaoMetros: 30, bonusDanoAlvoFeridoPercent: 0.10, bonusCriticoAlvoFeridoPercent: 0.05 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Raio detecção 35m. Bônus de dano +12%, chance crítico +7% a alvos com PV < 50%.", efeitoDetalhes: { raioDeteccaoMetros: 35, bonusDanoAlvoFeridoPercent: 0.12, bonusCriticoAlvoFeridoPercent: 0.07 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Raio detecção 40m. Bônus de dano +15%, chance crítico +10% a alvos com PV < 40%. Se o Ravkar feriu o alvo recentemente, ele pode rastreá-lo pelo cheiro por uma curta distância.", efeitoDetalhes: { raioDeteccaoMetros: 40, bonusDanoAlvoFeridoPercent: 0.15, bonusCriticoAlvoFeridoPercent: 0.10, limiarPVPercentBonusDano: 0.40, habilidadeRastreioOlfativo: true } }
    ]
},
"raca_ravkar_instinto_primordial": {
    id: "raca_ravkar_instinto_primordial",
    nome: "Instinto Primordial",
    origemTipo: "raca", origemNome: "Ravkar",
    tipo: "buff_pessoal_ofensivo_resistencias_criticas",
    descricao: "Em momentos de desespero ou grande fúria, o instinto primordial do Ravkar assume, permitindo que ignore a dor e desfira ataques que causam hemorragia severa.",
    cooldownSegundos: 240, // Cooldown alto para um buff poderoso
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_ravkar_frenesi_animal", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Por 2 turnos, ataques corpo-a-corpo têm 20% de chance de causar Hemorragia (dano Força*0.2/turno por 2t). Ignora penalidades de dor leve.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, condicaoAtaque: { nome: "HemorragiaPrimordial", chance: 0.20, duracaoTurnosDoT: 2, formulaDanoPorTurno: "(forca*0.2)" }, ignoraDorLeve: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 27, efeitoDesc: "Chance Hemorragia 25% (dano Força*0.25/turno por 2t). Duração 2 turnos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, condicaoAtaque: { nome: "HemorragiaPrimordial", chance: 0.25, duracaoTurnosDoT: 2, formulaDanoPorTurno: "(forca*0.25)" }, ignoraDorLeve: true }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 29, efeitoDesc: "Chance Hemorragia 30% (dano Força*0.3/turno por 3t). Duração 3 turnos. Ignora penalidades de dor moderada. Ganha +10 de Vitalidade temporariamente.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, condicaoAtaque: { nome: "HemorragiaPrimordialGrave", chance: 0.30, duracaoTurnosDoT: 3, formulaDanoPorTurno: "(forca*0.3)" }, ignoraDorModerada: true, buffTemporario: { atributo: "vitalidade", valor: 10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 31, efeitoDesc: "Chance Hemorragia 35% (dano Força*0.35/turno por 3t). Duração 3 turnos. Vitalidade +15.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 3, condicaoAtaque: { nome: "HemorragiaPrimordialGrave", chance: 0.35, duracaoTurnosDoT: 3, formulaDanoPorTurno: "(forca*0.35)" }, ignoraDorModerada: true, buffTemporario: { atributo: "vitalidade", valor: 15 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 33, efeitoDesc: "Chance Hemorragia 40% (dano Forca*0.4/turno por 4t). Duração 4 turnos. Imune a dor (exceto dano massivo). Vitalidade +20. Ataques não podem ser aparados.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 4, condicaoAtaque: { nome: "SangramentoSelvagemExposto", chance: 0.40, duracaoTurnosDoT: 4, formulaDanoPorTurno: "(forca*0.4)" }, imuneDorNaoMassiva: true, buffTemporario: { atributo: "vitalidade", valor: 20 }, ataquesNaoAparaveis: true } }
    ]
},
"raca_ravkar_rugido_de_guerra_bestial": { // ID ajustado
    id: "raca_ravkar_rugido_de_guerra_bestial",
    nome: "Rugido de Guerra (Ravkar)",
    origemTipo: "raca", origemNome: "Ravkar",
    tipo: "buff_area_aliados_debuff_area_inimigos_moral",
    descricao: "O Ravkar solta um rugido gutural e bestial que desmoraliza inimigos próximos e infunde uma fúria selvagem em aliados.",
    cooldownSegundos: 120,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_ravkar_cheiro_de_sangue", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Inimigos em raio de 6m sofrem -10% de Dano por 2 turnos. Aliados na área ganham +10% de Dano Físico por 2 turnos.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 6, debuffInimigos: { atributo: "danoCausadoPercent", modificador: "percentual_negativo_multiplicativo", valor: 0.10, duracaoTurnos: 2 }, buffAliados: { atributo: "danoFisicoPercent", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Debuff -12% Dano Inimigo, Buff +12% Dano Físico Aliado. Raio 7m.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 7, debuffInimigos: { valor: 0.12 }, buffAliados: { valor: 0.12 } }, pontosParaProximoNivel: 4 }, // Simplificado, herda outras props do Nv1
        { nivel: 3, custoPM: 24, efeitoDesc: "Debuff -15% Dano Inimigo, Buff +15% Dano Físico Aliado. Raio 8m, duração 3 turnos. Inimigos têm 15% de chance de sofrer Medo.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 8, debuffInimigos: { valor: 0.15, duracaoTurnos: 3, condicao: { nome: "MedoBestial", chance: 0.15, duracaoTurnos: 1 } }, buffAliados: { valor: 0.15, duracaoTurnos: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Debuff -18% Dano Inimigo, Buff +18% Dano Físico Aliado. Raio 9m, duração 3 turnos. Chance de Medo 20%.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 9, debuffInimigos: { valor: 0.18, duracaoTurnos: 3, condicao: { nome: "MedoBestial", chance: 0.20, duracaoTurnos: 1 } }, buffAliados: { valor: 0.18, duracaoTurnos: 3 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Debuff -20% Dano Inimigo e -10% Acerto, Buff +20% Dano Físico e +5% Chance Crítico Aliado. Raio 10m, duração 4 turnos. Chance de Medo 25%.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 10, debuffInimigos: { atributosDebuff: [{atr:"danoCausadoPercent", val:0.20}, {atr:"chanceAcerto", val:0.10}], duracaoTurnos: 4, condicao: { nome: "TerrorBestial", chance: 0.25, duracaoTurnos: 2 } }, buffAliados: { atributosBuff: [{atr:"danoFisicoPercent", val:0.20}, {atr:"chanceCritico", val:0.05}], duracaoTurnos: 4 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: RAVKARS ---

// --- FEITIÇOS DE RAÇA: VAZIOS ---
"raca_vazio_presenca_fria": {
    id: "raca_vazio_presenca_fria",
    nome: "Presença Fria",
    origemTipo: "raca", origemNome: "Vazio",
    tipo: "aura_passiva_debuff_ambiente",
    descricao: "A natureza niilista do Vazio emana uma aura de frio e desconforto, causando lentidão e apreensão em seres vivos próximos.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_vazio_alma_vazia_habilidade", aoAtingirNivel: 5 } ], // Renomeado para evitar conflito de nome
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Inimigos vivos em raio de 2m sofrem -5% de Agilidade.", efeitoDetalhes: { tipoAura: "debuff_proximidade_seres_vivos", raioMetros: 2, debuff: { atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.05 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Raio 2.5m, Agilidade -7%.", efeitoDetalhes: { raioMetros: 2.5, debuff: { valor: 0.07 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Raio 3m, Agilidade -10%. Inimigos também sofrem pequena penalidade em testes de Vontade/Carisma.", efeitoDetalhes: { raioMetros: 3, debuff: { valor: 0.10 }, penalidadeTesteVontadeCarisma: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Raio 3.5m, Agilidade -12%. Penalidade em testes de Vontade/Carisma aumentada.", efeitoDetalhes: { raioMetros: 3.5, debuff: { valor: 0.12 }, penalidadeTesteVontadeCarisma: 5 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Raio 4m, Agilidade -15%. Penalidade em testes de Vontade/Carisma significativa. Seres de baixa vitalidade podem sentir 'Drenagem Espiritual' (perda lenta de PM).", efeitoDetalhes: { raioMetros: 4, debuff: { valor: 0.15 }, penalidadeTesteVontadeCarisma: 7, efeitoAdicionalBaixaVitalidade: { nome: "DrenagemEspiritualLenta", drenaPMporTurno: "(intelecto*0.05)" } } }
    ]
},
"raca_vazio_corrente_negra": {
    id: "raca_vazio_corrente_negra",
    nome: "Corrente Negra",
    origemTipo: "raca", origemNome: "Vazio",
    tipo: "ataque_magico_unico_amplificavel_dor",
    descricao: "O Vazio manifesta uma corrente de energia entrópica que golpeia um alvo. O dano da corrente aumenta se o alvo já estiver sofrendo de dor ou efeitos negativos.",
    cooldownSegundos: 8,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade racial inicial
    desbloqueiaFeiticos: [ { idFeitico: "raca_vazio_devoracao_eterea", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 12, efeitoDesc: "Causa (Intelecto * 1.1) de dano do Vazio. Dano +20% se o alvo estiver sob efeito de algum debuff de atributo ou DoT.", efeitoDetalhes: { alvo: "unico", tipoDano: "Vazio", formulaDanoBase: "(intelecto*1.1)", bonusDanoCondicional: { condicao: "alvo_com_debuff_ou_dot", percentualAumento: 0.20 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 14, efeitoDesc: "Dano base (Intelecto * 1.2). Bônus +25%.", efeitoDetalhes: { formulaDanoBase: "(intelecto*1.2)", bonusDanoCondicional: { percentualAumento: 0.25 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 16, efeitoDesc: "Dano base (Intelecto * 1.3). Bônus +30%. Se o bônus for ativado, a corrente também pode prender o alvo brevemente (Lentidão 50% por 1 turno).", efeitoDetalhes: { formulaDanoBase: "(intelecto*1.3)", bonusDanoCondicional: { percentualAumento: 0.30, efeitoAdicionalSeBonus: { condicao: { nome: "PrisaoEntropica", chance: 0.5, duracaoTurnos: 1, debuffAgilidadePercent: 0.50 } } } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 18, efeitoDesc: "Dano base (Intelecto * 1.4). Bônus +35%. Lentidão mais forte.", efeitoDetalhes: { formulaDanoBase: "(intelecto*1.4)", bonusDanoCondicional: { percentualAumento: 0.35, efeitoAdicionalSeBonus: { condicao: { nome: "PrisaoEntropica", chance: 0.6, duracaoTurnos: 1, debuffAgilidadePercent: 0.65 } } } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 20, efeitoDesc: "Dano base (Intelecto * 1.6). Bônus +40%. Se o bônus for ativado, o alvo é Imobilizado por 1 turno e a corrente pode saltar para um segundo alvo com debuff/DoT, causando 50% do dano.", efeitoDetalhes: { formulaDanoBase: "(intelecto*1.6)", bonusDanoCondicional: { percentualAumento: 0.40, efeitoAdicionalSeBonus: { condicao: { nome: "PrisaoAbsolutaDoVazio", chance: 0.75, duracaoTurnos: 1, tipoEfeito: "Imobilizar" } }, ricocheteCondicional: { maxAlvos: 1, danoPercent: 0.50, requerAlvoComDebuffOuDot: true } } } }
    ]
},
"raca_vazio_alma_vazia_habilidade": { // Renomeado para evitar conflito com a descrição da raça
    id: "raca_vazio_alma_vazia_habilidade",
    nome: "Alma VazIA (Habilidade)",
    origemTipo: "raca", origemNome: "Vazio",
    tipo: "passivo_defesa_mental_magica",
    descricao: "A natureza desalmada e alienígena do Vazio lhe concede uma forte resistência ou imunidade a efeitos que manipulam a mente e emoções, e uma certa indiferença à magia convencional.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_vazio_presenca_fria", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Imune a Medo. +10% Resistência a feitiços de Ilusão e Encantamento.", efeitoDetalhes: { imunidades: ["Medo"], resistenciasMagicasEspecificas: [{ tipoEscola: "Ilusao", percentual: 0.10 }, { tipoEscola: "Encantamento", percentual: 0.10 }] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Imune a Medo e Confusão. Resistência a Ilusão/Encantamento +15%.", efeitoDetalhes: { imunidades: ["Medo", "Confusao"], resistenciasMagicasEspecificas: [{ tipoEscola: "Ilusao", percentual: 0.15 }, { tipoEscola: "Encantamento", percentual: 0.15 }] }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Imune a Medo, Confusão, Charme. Resistência a Ilusão/Encantamento +20%. Também ganha +5% de Resistência Mágica geral.", efeitoDetalhes: { imunidades: ["Medo", "Confusao", "Charme"], resistenciasMagicasEspecificas: [{ tipoEscola: "Ilusao", percentual: 0.20 }, { tipoEscola: "Encantamento", percentual: 0.20 }], buffResistenciaMagicaGeralPercent: 0.05 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Imunidades do Nv3. Resistência a Ilusão/Encantamento +25%. Resistência Mágica geral +7%.", efeitoDetalhes: { imunidades: ["Medo", "Confusao", "Charme"], resistenciasMagicasEspecificas: [{ tipoEscola: "Ilusao", percentual: 0.25 }, { tipoEscola: "Encantamento", percentual: 0.25 }], buffResistenciaMagicaGeralPercent: 0.07 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Imune a todos os efeitos de controle mental (Medo, Confusão, Charme, Dominação Mental Leve). Resistência a Ilusão/Encantamento +30%. Resistência Mágica geral +10%. Uma vez por dia, pode ignorar completamente o dano de um feitiço.", efeitoDetalhes: { imunidadeControleMentalTotalLeve: true, resistenciasMagicasEspecificas: [{ tipoEscola: "Ilusao", percentual: 0.30 }, { tipoEscola: "Encantamento", percentual: 0.30 }], buffResistenciaMagicaGeralPercent: 0.10, habilidadeEspecialIgnorarFeitico: { usosPorDia: 1 } } }
    ]
},
"raca_vazio_devoracao_eterea": {
    id: "raca_vazio_devoracao_eterea",
    nome: "Devoração Etérea",
    origemTipo: "raca", origemNome: "Vazio",
    tipo: "ataque_area_drenagem_vida_mana",
    descricao: "O Vazio libera sua fome insaciável, absorvendo uma porção da energia vital e mágica de todos os seres vivos em uma área ao seu redor.",
    cooldownSegundos: 180, // Cooldown alto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "raca_vazio_corrente_negra", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Drena (Intelecto * 0.3) de PV e (Intelecto * 0.1) de PM de cada inimigo vivo em raio de 3m, curando o Vazio pela metade do total drenado.", efeitoDetalhes: { alvo: "area_inimigos_vivos", raioMetros: 3, drenagemPVporAlvo: "(intelecto*0.3)", drenagemPMporAlvo: "(intelecto*0.1)", percentualDrenadoParaCuraPropria: 0.50 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Drena PV (Int * 0.35), PM (Int * 0.12). Raio 3.5m. Cura 55% do total.", efeitoDetalhes: { raioMetros: 3.5, drenagemPVporAlvo: "(intelecto*0.35)", drenagemPMporAlvo: "(intelecto*0.12)", percentualDrenadoParaCuraPropria: 0.55 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Drena PV (Int * 0.4), PM (Int * 0.15). Raio 4m. Cura 60% do total. Alvos drenados também sofrem 'Fadiga do Vazio' (-5 Força e Agilidade por 2 turnos).", efeitoDetalhes: { raioMetros: 4, drenagemPVporAlvo: "(intelecto*0.4)", drenagemPMporAlvo: "(intelecto*0.15)", percentualDrenadoParaCuraPropria: 0.60, debuffAlvosDrenados: { nome: "Fadiga do Vazio", atributos: ["forca", "agilidade"], modificador: "fixo_negativo", valor: 5, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Drena PV (Int * 0.45), PM (Int * 0.18). Raio 4.5m. Cura 65% do total. 'Fadiga do Vazio' mais forte (-7 For/Agi).", efeitoDetalhes: { raioMetros: 4.5, drenagemPVporAlvo: "(intelecto*0.45)", drenagemPMporAlvo: "(intelecto*0.18)", percentualDrenadoParaCuraPropria: 0.65, debuffAlvosDrenados: { valor: 7 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 42, efeitoDesc: "Drena PV (Int * 0.5), PM (Int * 0.2). Raio 5m. Cura 70% do total. 'Fadiga do Vazio Extrema' (-10 For/Agi, -10% Regen PV/PM). Se um alvo morrer pela drenagem, o Vazio ganha um escudo de energia etérea.", efeitoDetalhes: { raioMetros: 5, drenagemPVporAlvo: "(intelecto*0.5)", drenagemPMporAlvo: "(intelecto*0.2)", percentualDrenadoParaCuraPropria: 0.70, debuffAlvosDrenados: { nome: "FadigaDoVazioExtrema", atributos: ["forca", "agilidade"], modificador: "fixo_negativo", valor: 10, duracaoTurnos: 3, debuffRegenPercent: 0.10 }, efeitoAoMatarComDrenagem: { tipoBuff: "escudoHP", formulaValor: "(intelecto*1.5)", duracaoTurnos: 2 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE RAÇA: VAZIOS ---

//TODOS OS FEITIÇOS DE CLASSES ABAIXO //

// --- FEITIÇOS DE CLASSE: ARCANISTA ---
"classe_arcanista_orbe_arcano": {
    id: "classe_arcanista_orbe_arcano",
    nome: "Orbe Arcano",
    origemTipo: "classe", origemNome: "Arcanista",
    tipo: "ataque_magico_unico",
    descricao: "Lança uma esfera de pura energia mágica que causa dano moderado ao alvo e pode ricochetear em níveis avançados.",
    cooldownSegundos: 8,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_arcanista_tempestade_eterea", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 12, efeitoDesc: "Causa (Intelecto * 1.2) de dano Arcano.", efeitoDetalhes: { alvo: "unico", tipoDano: "Arcano", formulaDano: "(intelecto*1.2)" }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 14, efeitoDesc: "Causa (Intelecto * 1.4) de dano Arcano.", efeitoDetalhes: { alvo: "unico", tipoDano: "Arcano", formulaDano: "(intelecto*1.4)" }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 16, efeitoDesc: "Causa (Intelecto * 1.6) de dano Arcano. O orbe agora ricocheteia para um segundo alvo próximo causando 50% do dano original.", efeitoDetalhes: { alvo: "unico", tipoDano: "Arcano", formulaDano: "(intelecto*1.6)", ricocheteAlvos: 1, danoRicochetePercent: 0.50 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 18, efeitoDesc: "Causa (Intelecto * 1.8) de dano Arcano. O ricochete causa 75% do dano.", efeitoDetalhes: { alvo: "unico", tipoDano: "Arcano", formulaDano: "(intelecto*1.8)", ricocheteAlvos: 1, danoRicochetePercent: 0.75 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 20, efeitoDesc: "Causa (Intelecto * 2.1) de dano Arcano. O ricochete causa 100% do dano e pode aplicar 'Vulnerabilidade Arcana' (alvo recebe +10% de dano de feitiços por 2 turnos) a ambos os alvos com 25% de chance.", efeitoDetalhes: { alvo: "unico", tipoDano: "Arcano", formulaDano: "(intelecto*2.1)", ricocheteAlvos: 1, danoRicochetePercent: 1.0, condicao: { nome: "Vulnerabilidade Arcana", chance: 0.25, duracaoTurnos: 2, efeitoDesc: "+10% dano Arcano recebido" } } }
    ]
},
"classe_arcanista_barreira_de_mana": {
    id: "classe_arcanista_barreira_de_mana",
    nome: "Barreira de Mana",
    origemTipo: "classe", origemNome: "Arcanista",
    tipo: "defesa_buff_pessoal",
    descricao: "Cria um escudo mágico pessoal que absorve uma quantidade de dano baseada no Intelecto.",
    cooldownSegundos: 25,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_arcanista_olho_de_velion", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Absorve (Intelecto * 1.5) de dano. Dura 2 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "escudoHP", formulaValor: "(intelecto*1.5)", duracaoTurnos: 2 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Absorve (Intelecto * 1.8) de dano. Dura 2 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "escudoHP", formulaValor: "(intelecto*1.8)", duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Absorve (Intelecto * 2.2) de dano. Dura 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "escudoHP", formulaValor: "(intelecto*2.2)", duracaoTurnos: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Absorve (Intelecto * 2.6) de dano. Dura 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "escudoHP", formulaValor: "(intelecto*2.6)", duracaoTurnos: 3 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 24, efeitoDesc: "Absorve (Intelecto * 3.0) de dano. Dura 3 turnos. Ao quebrar, libera uma pequena onda de choque arcano que causa (Intelecto * 0.5) de dano a inimigos adjacentes.", efeitoDetalhes: { alvo: "self", tipoBuff: "escudoHP", formulaValor: "(intelecto*3)", duracaoTurnos: 3, efeitoAoQuebrar: { tipo: "dano_area_adjacente", tipoDano: "Arcano", formulaDano: "(intelecto*0.5)", raio: 1 } } }
    ]
},
"classe_arcanista_tempestade_eterea": {
    id: "classe_arcanista_tempestade_eterea",
    nome: "Tempestade Etérea",
    origemTipo: "classe", origemNome: "Arcanista",
    tipo: "ataque_area_dot",
    descricao: "Evoca uma tempestade de energia arcana em uma área designada, causando dano contínuo aos inimigos dentro dela.",
    cooldownSegundos: 40,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_arcanista_orbe_arcano", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Causa (Intelecto * 0.5) de dano Arcano por turno em área (raio 2m) por 3 turnos.", efeitoDetalhes: { alvo: "area", raioMetros: 2, tipoDano: "Arcano", formulaDanoPorTurno: "(intelecto*0.5)", duracaoTurnosDoT: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Causa (Intelecto * 0.6) de dano Arcano por turno em área (raio 2.5m) por 3 turnos.", efeitoDetalhes: { alvo: "area", raioMetros: 2.5, tipoDano: "Arcano", formulaDanoPorTurno: "(intelecto*0.6)", duracaoTurnosDoT: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Causa (Intelecto * 0.7) de dano Arcano por turno em área (raio 3m) por 4 turnos. Inimigos afetados têm sua velocidade de movimento reduzida em 15%.", efeitoDetalhes: { alvo: "area", raioMetros: 3, tipoDano: "Arcano", formulaDanoPorTurno: "(intelecto*0.7)", duracaoTurnosDoT: 4, debuff: { atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.15, duracaoTurnos: 4, nomeEfeito: "Lentidão Etérea" } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Causa (Intelecto * 0.8) de dano Arcano por turno em área (raio 3.5m) por 4 turnos. Lentidão aumentada para 25%.", efeitoDetalhes: { alvo: "area", raioMetros: 3.5, tipoDano: "Arcano", formulaDanoPorTurno: "(intelecto*0.8)", duracaoTurnosDoT: 4, debuff: { atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.25, duracaoTurnos: 4, nomeEfeito: "Lentidão Etérea Forte" } }, pontosParaProximoNivel: 6 }, // Custo maior para níveis altos de feitiços avançados
        { nivel: 5, custoPM: 42, efeitoDesc: "Causa (Intelecto * 1.0) de dano Arcano por turno em área (raio 4m) por 5 turnos. Lentidão de 30% e inimigos têm 20% de chance por turno de serem Silenciados por 1 turno.", efeitoDetalhes: { alvo: "area", raioMetros: 4, tipoDano: "Arcano", formulaDanoPorTurno: "(intelecto*1.0)", duracaoTurnosDoT: 5, debuff: { atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.30, duracaoTurnos: 5, nomeEfeito: "Lentidão Etérea Severa" }, condicaoPorTurno: { nome: "Silêncio Arcano", chance: 0.20, duracaoTurnos: 1 } } }
    ]
},
"classe_arcanista_olho_de_velion": {
    id: "classe_arcanista_olho_de_velion",
    nome: "Olho de Velion",
    origemTipo: "classe", origemNome: "Arcanista",
    tipo: "utilidade_deteccao_buff_pessoal",
    descricao: "O Arcanista foca sua mente, revelando fenômenos mágicos e ganhando discernimento arcano.",
    cooldownSegundos: 75,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_arcanista_barreira_de_mana", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Revela armadilhas mágicas e auras de itens mágicos num raio de 10m por 1 min. Concede +5% de Resistência Mágica ao conjurador durante o efeito.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["armadilhas_magicas", "auras_itens"], raioMetros: 10 }, duracaoBuffMinutos: 1, buffPessoal: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.05, duracaoTurnos: 6 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Revela armadilhas, auras de itens e inimigos invisíveis num raio de 12m por 1.5 min. Concede +7% de Resistência Mágica.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["armadilhas_magicas", "auras_itens", "inimigos_invisiveis"], raioMetros: 12 }, duracaoBuffMinutos: 1.5, buffPessoal: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.07, duracaoTurnos: 9 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Revela Nv2 + portais ocultos num raio de 15m por 2 min. Concede +10% de Resistência Mágica.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["armadilhas_magicas", "auras_itens", "inimigos_invisiveis", "portais_ocultos"], raioMetros: 15 }, duracaoBuffMinutos: 2, buffPessoal: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 12 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Revela Nv3 num raio de 18m por 2.5 min. Concede +12% Resist. Mágica e chance de identificar a escola de um feitiço sendo lançado.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["armadilhas_magicas", "auras_itens", "inimigos_invisiveis", "portais_ocultos"], raioMetros: 18, chanceIdentificarMagia: 0.30 }, duracaoBuffMinutos: 2.5, buffPessoal: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.12, duracaoTurnos: 15 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Revela Nv4 num raio de 25m por 3 min. Concede +15% Resist. Mágica e chance aprimorada de identificar feitiços, revelando seu nome e custo de PM.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["armadilhas_magicas", "auras_itens", "inimigos_invisiveis", "portais_ocultos", "identificar_magia_completa"], raioMetros: 25, chanceIdentificarMagia: 0.50 }, duracaoBuffMinutos: 3, buffPessoal: { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.15, duracaoTurnos: 18 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE ARCANISTA ---

// --- FEITIÇOS DE CLASSE: GUERREIRO REAL ---
"classe_guerreiro_real_postura_defensiva": {
    id: "classe_guerreiro_real_postura_defensiva",
    nome: "Postura Defensiva",
    origemTipo: "classe", origemNome: "Guerreiro Real",
    tipo: "buff_pessoal_defesa",
    descricao: "O guerreiro adota uma postura focada na defesa, aumentando sua capacidade de resistir a golpes.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_guerreiro_real_grito_de_guerra", aoAtingirNivel: 5 } ], // Exemplo, pode ser Quebra-Escudos
    niveis: [
        { nivel: 1, custoPM: 5, efeitoDesc: "Aumenta a Defesa Base em (Vitalidade * 0.3) + 5 por 3 turnos.", efeitoDetalhes: { alvo: "self", buff: { atributo: "defesaBase", formulaValor: "(vitalidade*0.3)+5", duracaoTurnos: 3 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 5, efeitoDesc: "Aumenta a Defesa Base em (Vitalidade * 0.4) + 7 por 3 turnos. Reduz levemente o dano recebido de ataques físicos.", efeitoDetalhes: { alvo: "self", buff: { atributo: "defesaBase", formulaValor: "(vitalidade*0.4)+7", duracaoTurnos: 3, reducaoDanoFisicoPercent: 0.05 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 4, efeitoDesc: "Aumenta a Defesa Base em (Vitalidade * 0.5) + 10 por 4 turnos. Redução de dano físico aumentada.", efeitoDetalhes: { alvo: "self", buff: { atributo: "defesaBase", formulaValor: "(vitalidade*0.5)+10", duracaoTurnos: 4, reducaoDanoFisicoPercent: 0.10 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 4, efeitoDesc: "Aumenta a Defesa Base em (Vitalidade * 0.6) + 12 por 4 turnos. Redução de dano físico e mágico leve.", efeitoDetalhes: { alvo: "self", buff: { atributo: "defesaBase", formulaValor: "(vitalidade*0.6)+12", duracaoTurnos: 4, reducaoDanoFisicoPercent: 0.15, reducaoDanoMagicoPercent: 0.05 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 3, efeitoDesc: "Aumenta a Defesa Base em (Vitalidade * 0.7) + 15 por 5 turnos. Redução de dano físico e mágico aprimorada. O guerreiro se torna imune a empurrões.", efeitoDetalhes: { alvo: "self", buff: { atributo: "defesaBase", formulaValor: "(vitalidade*0.7)+15", duracaoTurnos: 5, reducaoDanoFisicoPercent: 0.20, reducaoDanoMagicoPercent: 0.10, imunidade: ["empurrao"] } } }
    ]
},
"classe_guerreiro_real_investida_real": {
    id: "classe_guerreiro_real_investida_real",
    nome: "Investida Real",
    origemTipo: "classe", origemNome: "Guerreiro Real",
    tipo: "ataque_fisico_controle",
    descricao: "O guerreiro avança com ímpeto, golpeando um inimigo com força e empurrando-o para trás.",
    cooldownSegundos: 15,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_guerreiro_real_quebra_escudos", aoAtingirNivel: 5 } ], // Exemplo
    niveis: [
        { nivel: 1, custoPM: 8, efeitoDesc: "Causa (Forca * 1.3) de dano Físico e empurra o alvo 1 metro.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.3)", empurraoMetros: 1 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Causa (Forca * 1.5) de dano Físico e empurra o alvo 1.5 metros.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.5)", empurraoMetros: 1.5 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Causa (Forca * 1.7) de dano Físico, empurra o alvo 2 metros e tem 25% de chance de atordoá-lo por 1 turno.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.7)", empurraoMetros: 2, condicao: { nome: "Atordoado", chance: 0.25, duracaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Causa (Forca * 1.9) de dano Físico, empurra o alvo 2.5 metros e chance de atordoar aumentada para 35%.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.9)", empurraoMetros: 2.5, condicao: { nome: "Atordoado", chance: 0.35, duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Causa (Forca * 2.2) de dano Físico, empurra o alvo 3 metros e chance de atordoar de 50%. Se o alvo colidir com um obstáculo, sofre dano adicional (Forca * 0.5).", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*2.2)", empurraoMetros: 3, condicao: { nome: "Atordoado", chance: 0.50, duracaoTurnos: 1 } /* lógica de dano por colisão a implementar */ } }
    ]
},
"classe_guerreiro_real_grito_de_guerra": {
    id: "classe_guerreiro_real_grito_de_guerra",
    nome: "Grito de Guerra",
    origemTipo: "classe", origemNome: "Guerreiro Real",
    tipo: "buff_area_aliados_debuff_area_inimigos",
    descricao: "Um brado poderoso que inspira aliados próximos e desmoraliza inimigos.",
    cooldownSegundos: 60,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_guerreiro_real_postura_defensiva", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Aliados em área (raio 5m) ganham + (Forca * 0.1) de Ataque Base por 3 turnos. Inimigos na mesma área têm seu Ataque Base reduzido em (Forca * 0.05) por 3 turnos.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 5, buffAliados: { atributo: "ataqueBase", formulaValor: "(forca*0.1)", duracaoTurnos: 3 }, debuffInimigos: { atributo: "ataqueBase", formulaValorReducao: "(forca*0.05)", duracaoTurnos: 3 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 18, efeitoDesc: "Buff de Ataque para + (Forca * 0.15), Debuff de Ataque para - (Forca * 0.07). Raio 6m, duração 3 turnos.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 6, buffAliados: { atributo: "ataqueBase", formulaValor: "(forca*0.15)", duracaoTurnos: 3 }, debuffInimigos: { atributo: "ataqueBase", formulaValorReducao: "(forca*0.07)", duracaoTurnos: 3 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 20, efeitoDesc: "Buff de Ataque para + (Forca * 0.2), Debuff de Ataque para - (Forca * 0.1). Raio 7m, duração 4 turnos. Aliados também ganham bônus de moral (resistência a medo).", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 7, buffAliados: { atributo: "ataqueBase", formulaValor: "(forca*0.2)", duracaoTurnos: 4, buffAdicional: { nome: "Moral Elevado", efeitoDesc: "Resistência a Medo" } }, debuffInimigos: { atributo: "ataqueBase", formulaValorReducao: "(forca*0.1)", duracaoTurnos: 4 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 22, efeitoDesc: "Buff de Ataque para + (Forca * 0.25), Debuff de Ataque para - (Forca * 0.12). Raio 8m, duração 4 turnos. Inimigos têm chance de hesitar (perder ação).", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 8, buffAliados: { atributo: "ataqueBase", formulaValor: "(forca*0.25)", duracaoTurnos: 4, buffAdicional: { nome: "Moral Elevado", efeitoDesc: "Resistência a Medo" } }, debuffInimigos: { atributo: "ataqueBase", formulaValorReducao: "(forca*0.12)", duracaoTurnos: 4, condicao: { nome: "Hesitação", chance: 0.15, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 25, efeitoDesc: "Buff de Ataque para + (Forca * 0.3), Debuff de Ataque para - (Forca * 0.15). Raio 10m, duração 5 turnos. Aliados ganham bônus de moral e pequena regeneração de vigor (PM). Inimigos têm chance maior de hesitar ou fugir.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 10, buffAliados: { atributo: "ataqueBase", formulaValor: "(forca*0.3)", duracaoTurnos: 5, buffAdicional: { nome: "Moral Superior", efeitoDesc: "Imunidade a Medo, +Regen PM" } }, debuffInimigos: { atributo: "ataqueBase", formulaValorReducao: "(forca*0.15)", duracaoTurnos: 5, condicao: { nome: "Pânico Leve", chance: 0.25, duracaoTurnos: 1 } } } }
    ]
},
"classe_guerreiro_real_quebra_escudos": {
    id: "classe_guerreiro_real_quebra_escudos",
    nome: "Quebra-Escudos",
    origemTipo: "classe", origemNome: "Guerreiro Real",
    tipo: "ataque_fisico_debuff_defesa",
    descricao: "Um golpe poderoso e preciso focado em destruir a proteção do inimigo, reduzindo sua armadura.",
    cooldownSegundos: 35,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_guerreiro_real_investida_real", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Causa (Forca * 1.1) de dano Físico e reduz a Defesa Base do alvo em 10% por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.1)", debuff: { atributo: "defesaBase", modificador: "percentual_negativo_multiplicativo", valor: 0.10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Causa (Forca * 1.2) de dano Físico e reduz a Defesa Base do alvo em 15% por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.2)", debuff: { atributo: "defesaBase", modificador: "percentual_negativo_multiplicativo", valor: 0.15, duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Causa (Forca * 1.3) de dano Físico e reduz a Defesa Base do alvo em 20% por 3 turnos. Ignora uma pequena quantidade de armadura (ex: 5 pontos fixos).", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.3)", penetracaoArmaduraFixa: 5, debuff: { atributo: "defesaBase", modificador: "percentual_negativo_multiplicativo", valor: 0.20, duracaoTurnos: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Causa (Forca * 1.4) de dano Físico e reduz a Defesa Base do alvo em 25% por 3 turnos. Ignora 10 pontos de armadura.", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.4)", penetracaoArmaduraFixa: 10, debuff: { atributo: "defesaBase", modificador: "percentual_negativo_multiplicativo", valor: 0.25, duracaoTurnos: 3 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Causa (Forca * 1.6) de dano Físico e reduz a Defesa Base do alvo em 30% por 4 turnos. Ignora 15 pontos de armadura e tem 25% de chance de destruir o escudo do alvo (se aplicável, efeito narrativo/mecânico).", efeitoDetalhes: { alvo: "unico", tipoDano: "Fisico", formulaDano: "(forca*1.6)", penetracaoArmaduraFixa: 15, debuff: { atributo: "defesaBase", modificador: "percentual_negativo_multiplicativo", valor: 0.30, duracaoTurnos: 4 } /* Lógica de destruir escudo a implementar */ } }
    ]
},
// --- FIM DOS FEITIÇOS DE GUERREIRO REAL ---

    // --- FEITIÇOS DE CLASSE: FEITICEIRO NEGRO ---
"classe_feiticeiro_negro_toque_das_sombras": {
    id: "classe_feiticeiro_negro_toque_das_sombras",
    nome: "Toque das Sombras",
    origemTipo: "classe", origemNome: "Feiticeiro Negro",
    tipo: "ataque_magico_drenagem",
    descricao: "Um toque gélido que causa dano sombrio e drena uma porção da força vital do alvo, curando o conjurador.",
    cooldownSegundos: 10,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_feiticeiro_negro_corrupcao_da_carne", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 14, efeitoDesc: "Causa (Intelecto * 1.1) de dano Sombrio e cura o Feiticeiro em 25% do dano causado.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sombrio", formulaDano: "(intelecto*1.1)", drenagemVidaPercent: 0.25 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 16, efeitoDesc: "Causa (Intelecto * 1.3) de dano Sombrio e cura 30% do dano causado.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sombrio", formulaDano: "(intelecto*1.3)", drenagemVidaPercent: 0.30 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 18, efeitoDesc: "Causa (Intelecto * 1.5) de dano Sombrio e cura 35% do dano causado. O alvo também sofre uma pequena penalidade de regeneração de vida por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sombrio", formulaDano: "(intelecto*1.5)", drenagemVidaPercent: 0.35, debuff: { nomeEfeito: "Ferida Necrótica", atributo: "regeneracaoPV", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 20, efeitoDesc: "Causa (Intelecto * 1.7) de dano Sombrio e cura 40% do dano causado. Penalidade de regeneração aumentada.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sombrio", formulaDano: "(intelecto*1.7)", drenagemVidaPercent: 0.40, debuff: { nomeEfeito: "Ferida Necrótica Grave", atributo: "regeneracaoPV", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 22, efeitoDesc: "Causa (Intelecto * 2.0) de dano Sombrio e cura 50% do dano causado. A penalidade de regeneração impede totalmente a regeneração de vida por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sombrio", formulaDano: "(intelecto*2.0)", drenagemVidaPercent: 0.50, debuff: { nomeEfeito: "Toque Mortal", atributo: "regeneracaoPV", modificador: "bloqueio_total", valor: 0, duracaoTurnos: 2 } } }
    ]
},
"classe_feiticeiro_negro_sussurros_profanos": {
    id: "classe_feiticeiro_negro_sussurros_profanos",
    nome: "Sussurros Profanos",
    origemTipo: "classe", origemNome: "Feiticeiro Negro",
    tipo: "debuff_controle_mental",
    descricao: "Sussurros enlouquecedores que ecoam na mente de inimigos fracos, provocando medo e confusão.",
    cooldownSegundos: 20,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_feiticeiro_negro_marca_negra", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Alvos com Carisma menor que o Intelecto do Feiticeiro têm 30% de chance de sofrer Medo por 1 turno.", efeitoDetalhes: { alvo: "unico", condicaoResistencia: "carisma < intelectoConjurador", condicao: { nome: "Medo", chance: 0.30, duracaoTurnos: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Chance de Medo aumentada para 40% por 1 turno.", efeitoDetalhes: { alvo: "unico", condicaoResistencia: "carisma < intelectoConjurador", condicao: { nome: "Medo", chance: 0.40, duracaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Chance de Medo de 50% por 2 turnos. Pode afetar até 2 alvos próximos se suas resistências falharem.", efeitoDetalhes: { alvo: "multi_proximo", maxAlvos: 2, condicaoResistencia: "carisma < intelectoConjurador", condicao: { nome: "Medo", chance: 0.50, duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Chance de Medo de 60% por 2 turnos para até 2 alvos. Alvos afetados também sofrem Confusão (chance de atacar aliados) por 1 turno.", efeitoDetalhes: { alvo: "multi_proximo", maxAlvos: 2, condicaoResistencia: "carisma < intelectoConjurador", condicao: { nome: "Medo", chance: 0.60, duracaoTurnos: 2 }, condicaoAdicional: { nome: "Confusão", chance: 1.0, duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Chance de Medo de 75% por 3 turnos para até 3 alvos. Confusão dura 2 turnos. Alvos afetados pelo Medo recebem dano sombrio adicional de outras fontes.", efeitoDetalhes: { alvo: "multi_proximo", maxAlvos: 3, condicaoResistencia: "carisma < intelectoConjurador", condicao: { nome: "Medo Profundo", chance: 0.75, duracaoTurnos: 3, efeitoAdicional: "Vulnerabilidade a Sombra" }, condicaoAdicional: { nome: "Confusão Grave", chance: 1.0, duracaoTurnos: 2 } } }
    ]
},
"classe_feiticeiro_negro_corrupcao_da_carne": {
    id: "classe_feiticeiro_negro_corrupcao_da_carne",
    nome: "Corrupção da Carne",
    origemTipo: "classe", origemNome: "Feiticeiro Negro",
    tipo: "debuff_dot_pv",
    descricao: "Uma maldição necromântica que faz a carne do inimigo apodrecer lentamente, causando perda de vitalidade contínua.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_feiticeiro_negro_toque_das_sombras", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Alvo perde (Intelecto * 0.3) de PV por turno durante 3 turnos.", efeitoDetalhes: { alvo: "unico", tipoDanoPorTurno: "Necrótico", formulaDanoPorTurno: "(intelecto*0.3)", duracaoTurnosDoT: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Alvo perde (Intelecto * 0.4) de PV por turno durante 3 turnos.", efeitoDetalhes: { alvo: "unico", tipoDanoPorTurno: "Necrótico", formulaDanoPorTurno: "(intelecto*0.4)", duracaoTurnosDoT: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Alvo perde (Intelecto * 0.5) de PV por turno durante 4 turnos. Sua Vitalidade é reduzida em 5 pontos enquanto durar o efeito.", efeitoDetalhes: { alvo: "unico", tipoDanoPorTurno: "Necrótico", formulaDanoPorTurno: "(intelecto*0.5)", duracaoTurnosDoT: 4, debuffAtributo: { atributo: "vitalidade", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 4 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Alvo perde (Intelecto * 0.6) de PV por turno durante 4 turnos. Redução de Vitalidade de 10 pontos.", efeitoDetalhes: { alvo: "unico", tipoDanoPorTurno: "Necrótico", formulaDanoPorTurno: "(intelecto*0.6)", duracaoTurnosDoT: 4, debuffAtributo: { atributo: "vitalidade", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 4 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Alvo perde (Intelecto * 0.7) de PV por turno durante 5 turnos. Redução de Vitalidade de 15 pontos. Se o alvo morrer sob este efeito, ele se reanima como um Zumbi fraco sob controle do Feiticeiro por 1 minuto (máx 1).", efeitoDetalhes: { alvo: "unico", tipoDanoPorTurno: "Necrótico", formulaDanoPorTurno: "(intelecto*0.7)", duracaoTurnosDoT: 5, debuffAtributo: { atributo: "vitalidade", modificador: "fixo_negativo", valor: 15, duracaoTurnos: 5 }, efeitoAoMorrer: { tipo: "invocacao_temporaria", nomeCriatura: "Zumbi Corrompido", duracaoMinutos: 1, maximo: 1 } } }
    ]
},
"classe_feiticeiro_negro_marca_negra": {
    id: "classe_feiticeiro_negro_marca_negra",
    nome: "Marca Negra",
    origemTipo: "classe", origemNome: "Feiticeiro Negro",
    tipo: "ataque_magico_atrasado_area",
    descricao: "Aplica um selo sombrio em um local ou alvo que detona com energia profana após alguns instantes, causando dano em área.",
    cooldownSegundos: 50,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_feiticeiro_negro_sussurros_profanos", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 28, efeitoDesc: "Após 2 turnos, a marca explode causando (Intelecto * 1.5) de dano Sombrio em área (raio 2m).", efeitoDetalhes: { alvo: "local_ou_alvo", tipoGatilho: "atrasado_turnos", turnosParaAtivar: 2, efeitoExplosao: { tipoDano: "Sombrio", formulaDano: "(intelecto*1.5)", raioMetros: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 31, efeitoDesc: "Explosão causa (Intelecto * 1.7) de dano Sombrio (raio 2.5m).", efeitoDetalhes: { alvo: "local_ou_alvo", tipoGatilho: "atrasado_turnos", turnosParaAtivar: 2, efeitoExplosao: { tipoDano: "Sombrio", formulaDano: "(intelecto*1.7)", raioMetros: 2.5 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 34, efeitoDesc: "Explosão causa (Intelecto * 1.9) de dano Sombrio (raio 3m). Reduz o tempo de detonação para 1 turno.", efeitoDetalhes: { alvo: "local_ou_alvo", tipoGatilho: "atrasado_turnos", turnosParaAtivar: 1, efeitoExplosao: { tipoDano: "Sombrio", formulaDano: "(intelecto*1.9)", raioMetros: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 37, efeitoDesc: "Explosão causa (Intelecto * 2.2) de dano Sombrio (raio 3.5m). Detona em 1 turno. Inimigos atingidos recebem 'Desespero' (redução de Carisma) por 2 turnos.", efeitoDetalhes: { alvo: "local_ou_alvo", tipoGatilho: "atrasado_turnos", turnosParaAtivar: 1, efeitoExplosao: { tipoDano: "Sombrio", formulaDano: "(intelecto*2.2)", raioMetros: 3.5, debuff: { nomeEfeito: "Desespero", atributo: "carisma", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 } } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 40, efeitoDesc: "Explosão causa (Intelecto * 2.5) de dano Sombrio (raio 4m). Detona em 1 turno. Inimigos atingidos são Aterrados (não podem se mover) por 1 turno e sofrem 'Desespero Intenso'.", efeitoDetalhes: { alvo: "local_ou_alvo", tipoGatilho: "atrasado_turnos", turnosParaAtivar: 1, efeitoExplosao: { tipoDano: "Sombrio", formulaDano: "(intelecto*2.5)", raioMetros: 4, condicao: { nome: "Aterrado", chance: 1.0, duracaoTurnos: 1 }, debuff: { nomeEfeito: "Desespero Intenso", atributo: "carisma", modificador: "fixo_negativo", valor: 15, duracaoTurnos: 3 } } } }
    ]
},
// --- FIM DOS FEITIÇOS DE FEITICEIRO NEGRO ---

  // --- FEITIÇOS DE CLASSE: CAÇADOR SOMBRIO ---
"classe_cacador_sombrio_olhar_do_predador": {
    id: "classe_cacador_sombrio_olhar_do_predador",
    nome: "Olhar do Predador",
    origemTipo: "classe", origemNome: "Caçador Sombrio",
    tipo: "buff_pessoal_deteccao",
    descricao: "Aguça os sentidos do caçador, permitindo revelar inimigos ocultos e aumentar sua precisão crítica.",
    cooldownSegundos: 45,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_cacador_sombrio_chuva_de_setas_negras", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Revela inimigos furtivos num raio de 15m por 30s. Chance de crítico com ataques à distância +5% por 3 turnos.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["inimigos_furtivos"], raioMetros: 15, duracaoSegundos: 30 }, buffPessoal: { atributo: "chanceCriticoDistancia", modificador: "percentual_aditivo", valor: 0.05, duracaoTurnos: 3 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Raio de detecção 20m por 45s. Chance de crítico +7%.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["inimigos_furtivos"], raioMetros: 20, duracaoSegundos: 45 }, buffPessoal: { atributo: "chanceCriticoDistancia", modificador: "percentual_aditivo", valor: 0.07, duracaoTurnos: 3 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Raio de detecção 25m por 1 min. Chance de crítico +10%. Pode ver pontos fracos (ignora 5% da armadura do alvo no próximo ataque à distância).", efeitoDetalhes: { efeitoDeteccao: { tipos: ["inimigos_furtivos", "pontos_fracos"], raioMetros: 25, duracaoSegundos: 60 }, buffPessoal: { atributo: "chanceCriticoDistancia", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 4, efeitoAdicional: "ignora_armadura_proximo_ataque_percent_5" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Raio de detecção 30m por 1.5 min. Chance de crítico +12%. Ignora 10% da armadura no próximo ataque.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["inimigos_furtivos", "pontos_fracos"], raioMetros: 30, duracaoSegundos: 90 }, buffPessoal: { atributo: "chanceCriticoDistancia", modificador: "percentual_aditivo", valor: 0.12, duracaoTurnos: 4, efeitoAdicional: "ignora_armadura_proximo_ataque_percent_10" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Raio de detecção 35m por 2 min. Chance de crítico +15%. Ignora 15% da armadura no próximo ataque. O primeiro ataque contra um alvo revelado por esta habilidade é sempre crítico.", efeitoDetalhes: { efeitoDeteccao: { tipos: ["inimigos_furtivos", "pontos_fracos_critico_garantido"], raioMetros: 35, duracaoSegundos: 120 }, buffPessoal: { atributo: "chanceCriticoDistancia", modificador: "percentual_aditivo", valor: 0.15, duracaoTurnos: 5, efeitoAdicional: "ignora_armadura_proximo_ataque_percent_15" } } }
    ]
},
"classe_cacador_sombrio_armadilha_sombria": {
    id: "classe_cacador_sombrio_armadilha_sombria",
    nome: "Armadilha Sombria",
    origemTipo: "classe", origemNome: "Caçador Sombrio",
    tipo: "controle_armadilha",
    descricao: "Cria uma armadilha mágica invisível no local designado que prende o primeiro inimigo a pisar nela.",
    cooldownSegundos: 25,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_cacador_sombrio_lamina_do_cacador", aoAtingirNivel: 5 } ], // Ou Névoa Envenenada do seu doc
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Armadilha prende o alvo por 1 turno. Máximo 1 armadilha ativa.", efeitoDetalhes: { tipoArmadilha: "raiz_magica", duracaoEfeitoTurnos: 1, maximoAtivas: 1 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Armadilha prende por 2 turnos. Máximo 1 armadilha ativa.", efeitoDetalhes: { tipoArmadilha: "raiz_magica", duracaoEfeitoTurnos: 2, maximoAtivas: 1 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Armadilha prende por 2 turnos e causa (Agilidade * 0.5) de dano Sombrio ao ser ativada. Máximo 2 armadilhas ativas.", efeitoDetalhes: { tipoArmadilha: "raiz_magica_com_dano", duracaoEfeitoTurnos: 2, tipoDano: "Sombrio", formulaDano: "(agilidade*0.5)", maximoAtivas: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Armadilha prende por 3 turnos, causa (Agilidade * 0.7) de dano Sombrio. Máximo 2 armadilhas ativas.", efeitoDetalhes: { tipoArmadilha: "raiz_magica_com_dano", duracaoEfeitoTurnos: 3, tipoDano: "Sombrio", formulaDano: "(agilidade*0.7)", maximoAtivas: 2 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Armadilha prende por 3 turnos, causa (Agilidade * 1.0) de dano Sombrio e aplica 'Marca do Caçador' (alvo recebe mais dano do Caçador) por 3 turnos. Máximo 3 armadilhas ativas.", efeitoDetalhes: { tipoArmadilha: "raiz_magica_avancada", duracaoEfeitoTurnos: 3, tipoDano: "Sombrio", formulaDano: "(agilidade*1.0)", debuff: { nomeEfeito: "Marca do Caçador", efeitoDesc: "+15% dano recebido do Caçador Sombrio", duracaoTurnos: 3 }, maximoAtivas: 3 } }
    ]
},
"classe_cacador_sombrio_chuva_de_setas_negras": {
    id: "classe_cacador_sombrio_chuva_de_setas_negras",
    nome: "Chuva de Setas Negras",
    origemTipo: "classe", origemNome: "Caçador Sombrio",
    tipo: "ataque_fisico_area_distancia",
    descricao: "Dispara uma saraivada de múltiplas flechas encantadas com energia escura, atingindo inimigos em uma área.",
    cooldownSegundos: 35,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_cacador_sombrio_olhar_do_predador", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Dispara 3 setas. Cada seta causa (Agilidade * 0.6 + Forca * 0.3) de dano Físico/Sombrio. Pode atingir múltiplos alvos ou o mesmo alvo.", efeitoDetalhes: { tipoAtaque: "multi_projeteis", numeroProjeteis: 3, tipoDano: "FisicoSombrio", formulaDanoPorProjetil: "(agilidade*0.6)+(forca*0.3)" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Dispara 4 setas. Dano por seta (Agilidade * 0.65 + Forca * 0.3).", efeitoDetalhes: { tipoAtaque: "multi_projeteis", numeroProjeteis: 4, tipoDano: "FisicoSombrio", formulaDanoPorProjetil: "(agilidade*0.65)+(forca*0.3)" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Dispara 5 setas. Dano por seta (Agilidade * 0.7 + Forca * 0.35). Setas podem aplicar sangramento leve.", efeitoDetalhes: { tipoAtaque: "multi_projeteis", numeroProjeteis: 5, tipoDano: "FisicoSombrio", formulaDanoPorProjetil: "(agilidade*0.7)+(forca*0.35)", condicao: { nome: "Sangramento Leve", chance: 0.20, duracaoTurnos: 2, danoPorTurno: 5 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Dispara 6 setas. Dano por seta (Agilidade * 0.75 + Forca * 0.35). Chance de sangramento aumentada.", efeitoDetalhes: { tipoAtaque: "multi_projeteis", numeroProjeteis: 6, tipoDano: "FisicoSombrio", formulaDanoPorProjetil: "(agilidade*0.75)+(forca*0.35)", condicao: { nome: "Sangramento", chance: 0.30, duracaoTurnos: 3, danoPorTurno: 7 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Dispara 7 setas. Dano por seta (Agilidade * 0.8 + Forca * 0.4). Setas podem ricochetear uma vez. Sangramento aprimorado.", efeitoDetalhes: { tipoAtaque: "multi_projeteis_ricochete", numeroProjeteis: 7, tipoDano: "FisicoSombrio", formulaDanoPorProjetil: "(agilidade*0.8)+(forca*0.4)", ricocheteMax: 1, condicao: { nome: "Sangramento Grave", chance: 0.40, duracaoTurnos: 3, danoPorTurno: 10 } } }
    ]
},
// No seu doc, "Lâmina do Caçador (nível 5)" é o próximo.
// Se "Armadilha Sombria" desbloqueia "Lâmina do Caçador", então a estrutura de "Lâmina do Caçador" seria:
"classe_cacador_sombrio_lamina_do_cacador": {
    id: "classe_cacador_sombrio_lamina_do_cacador",
    nome: "Lâmina do Caçador",
    origemTipo: "classe", origemNome: "Caçador Sombrio",
    tipo: "ataque_especial_arma_espiritual",
    descricao: "Conjura uma lâmina espiritual que ignora armadura e retorna à mão do caçador após ser arremessada.",
    cooldownSegundos: 40, // Estimativa, pode ser menor se for um ataque principal
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_cacador_sombrio_armadilha_sombria", nivelMinimo: 5 } ], // Ou poderia ser Névoa Envenenada se o doc tiver essa progressão
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Lâmina causa (Agilidade * 1.2 + Intelecto * 0.5) de dano Sombrio/Mágico. Ignora 10% da armadura.", efeitoDetalhes: { alvo: "unico", tipoDano: "SombrioMagico", formulaDano: "(agilidade*1.2)+(intelecto*0.5)", penetracaoArmaduraPercent: 0.10, efeitoRetorno: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Dano (Agilidade * 1.3 + Intelecto * 0.6). Ignora 15% da armadura.", efeitoDetalhes: { alvo: "unico", tipoDano: "SombrioMagico", formulaDano: "(agilidade*1.3)+(intelecto*0.6)", penetracaoArmaduraPercent: 0.15, efeitoRetorno: true }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Dano (Agilidade * 1.4 + Intelecto * 0.7). Ignora 20% da armadura. Pode acertar até 2 alvos em linha.", efeitoDetalhes: { alvo: "linha", maxAlvos: 2, tipoDano: "SombrioMagico", formulaDano: "(agilidade*1.4)+(intelecto*0.7)", penetracaoArmaduraPercent: 0.20, efeitoRetorno: true }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Dano (Agilidade * 1.5 + Intelecto * 0.8). Ignora 25% da armadura. Pode acertar até 3 alvos em linha.", efeitoDetalhes: { alvo: "linha", maxAlvos: 3, tipoDano: "SombrioMagico", formulaDano: "(agilidade*1.5)+(intelecto*0.8)", penetracaoArmaduraPercent: 0.25, efeitoRetorno: true }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Dano (Agilidade * 1.7 + Intelecto * 1.0). Ignora 30% da armadura. Pode acertar até 3 alvos em linha e aplica 'Ferida Exposta' (aumenta dano crítico recebido) no último alvo atingido.", efeitoDetalhes: { alvo: "linha", maxAlvos: 3, tipoDano: "SombrioMagico", formulaDano: "(agilidade*1.7)+(intelecto*1.0)", penetracaoArmaduraPercent: 0.30, efeitoRetorno: true, debuffUltimoAlvo: { nomeEfeito: "Ferida Exposta", efeitoDesc: "+25% chance de dano crítico recebido", duracaoTurnos: 3 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE CAÇADOR SOMBRIO ---  

// --- FEITIÇOS DE CLASSE: GUARDIÃO DA LUZ ---
"classe_guardiao_da_luz_aura_protetora": {
    id: "classe_guardiao_da_luz_aura_protetora",
    nome: "Aura Protetora",
    origemTipo: "classe", origemNome: "Guardião da Luz",
    tipo: "buff_area_defesa_passiva_ativa", // Pode ser uma aura passiva que pode ser intensificada ativamente
    descricao: "Emite uma aura sagrada que concede um escudo de luz a aliados próximos, absorvendo dano.",
    cooldownSegundos: 45, // Cooldown para a ativação/intensificação
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_guardiao_da_luz_muralha_de_luz", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Aliados em raio de 5m recebem um escudo que absorve (Carisma * 1.0 + Intelecto * 0.5) de dano. Dura 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 5, tipoBuff: "escudoHP", formulaValor: "(carisma*1)+(intelecto*0.5)", duracaoTurnos: 2 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Escudo absorve (Carisma * 1.2 + Intelecto * 0.6) de dano. Raio 6m, dura 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 6, tipoBuff: "escudoHP", formulaValor: "(carisma*1.2)+(intelecto*0.6)", duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Escudo absorve (Carisma * 1.5 + Intelecto * 0.7) de dano. Raio 7m, dura 3 turnos. Aliados afetados também ganham +5% de resistência a dano Sombrio.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 7, tipoBuff: "escudoHP", formulaValor: "(carisma*1.5)+(intelecto*0.7)", duracaoTurnos: 3, buffAdicional: { atributo: "resistenciaDanoSombrio", modificador: "percentual_aditivo", valor: 0.05 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Escudo absorve (Carisma * 1.8 + Intelecto * 0.8) de dano. Raio 8m, dura 3 turnos. Resistência a dano Sombrio +10%.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 8, tipoBuff: "escudoHP", formulaValor: "(carisma*1.8)+(intelecto*0.8)", duracaoTurnos: 3, buffAdicional: { atributo: "resistenciaDanoSombrio", modificador: "percentual_aditivo", valor: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Escudo absorve (Carisma * 2.2 + Intelecto * 1.0) de dano. Raio 10m, dura 4 turnos. Resistência a dano Sombrio +15%. Ao ser ativada, a aura também purifica debuffs menores de atributos dos aliados.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 10, tipoBuff: "escudoHP", formulaValor: "(carisma*2.2)+(intelecto*1.0)", duracaoTurnos: 4, buffAdicional: { atributo: "resistenciaDanoSombrio", modificador: "percentual_aditivo", valor: 0.15 }, efeitoPurificacao: { tipo: "remove_debuff_atributo_menor", quantidade: 1 } } }
    ]
},
"classe_guardiao_da_luz_chama_da_fe": {
    id: "classe_guardiao_da_luz_chama_da_fe",
    nome: "Chama da Fé",
    origemTipo: "classe", origemNome: "Guardião da Luz",
    tipo: "ataque_magico_unico_condicional",
    descricao: "Um ataque de fogo sagrado que queima um inimigo. Causa dano significativamente maior a criaturas das trevas, mortos-vivos e impuros.",
    cooldownSegundos: 6,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_guardiao_da_luz_luz_purificadora", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Causa (Carisma * 1.0 + Intelecto * 0.4) de dano Sagrado. Dano x1.5 contra alvos sombrios/mortos-vivos/impuros.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sagrado", formulaDanoBase: "(carisma*1)+(intelecto*0.4)", multiplicadorCondicional: { tiposAlvo: ["Sombrio", "MortoVivo", "Impuro"], multiplicador: 1.5 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Dano base (Carisma * 1.2 + Intelecto * 0.5). Dano x1.75 contra alvos sombrios/etc.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sagrado", formulaDanoBase: "(carisma*1.2)+(intelecto*0.5)", multiplicadorCondicional: { tiposAlvo: ["Sombrio", "MortoVivo", "Impuro"], multiplicador: 1.75 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Dano base (Carisma * 1.4 + Intelecto * 0.6). Dano x2.0 contra alvos sombrios/etc. Pode aplicar 'Queimadura Sagrada' (dano Sagrado leve por turno).", efeitoDetalhes: { alvo: "unico", tipoDano: "Sagrado", formulaDanoBase: "(carisma*1.4)+(intelecto*0.6)", multiplicadorCondicional: { tiposAlvo: ["Sombrio", "MortoVivo", "Impuro"], multiplicador: 2.0 }, condicao: { nome: "Queimadura Sagrada", chance: 0.30, duracaoTurnos: 2, formulaDanoPorTurno: "(carisma*0.2)" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Dano base (Carisma * 1.6 + Intelecto * 0.7). Dano x2.25 contra alvos sombrios/etc. Chance de Queimadura Sagrada aumentada.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sagrado", formulaDanoBase: "(carisma*1.6)+(intelecto*0.7)", multiplicadorCondicional: { tiposAlvo: ["Sombrio", "MortoVivo", "Impuro"], multiplicador: 2.25 }, condicao: { nome: "Queimadura Sagrada", chance: 0.40, duracaoTurnos: 3, formulaDanoPorTurno: "(carisma*0.25)" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Dano base (Carisma * 1.9 + Intelecto * 0.8). Dano x2.5 contra alvos sombrios/etc. Queimadura Sagrada garantida e mais forte. Alvos sombrios/etc atingidos são brevemente atordoados.", efeitoDetalhes: { alvo: "unico", tipoDano: "Sagrado", formulaDanoBase: "(carisma*1.9)+(intelecto*0.8)", multiplicadorCondicional: { tiposAlvo: ["Sombrio", "MortoVivo", "Impuro"], multiplicador: 2.5, condicaoAdicionalEmAlvoEspecial: { nome: "Atordoamento Sagrado", chance: 0.5, duracaoTurnos: 1 } }, condicao: { nome: "Queimadura Sagrada Intensa", chance: 1.0, duracaoTurnos: 3, formulaDanoPorTurno: "(carisma*0.3)" } } }
    ]
},
"classe_guardiao_da_luz_muralha_de_luz": {
    id: "classe_guardiao_da_luz_muralha_de_luz",
    nome: "Muralha de Luz",
    origemTipo: "classe", origemNome: "Guardião da Luz",
    tipo: "defesa_area_barreira",
    descricao: "Cria uma barreira linear de luz sagrada impenetrável por um tempo limitado, bloqueando projéteis e movimento.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_guardiao_da_luz_aura_protetora", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Cria uma muralha de 5m de comprimento que dura 2 turnos. Inimigos que tocam a muralha recebem dano Sagrado leve.", efeitoDetalhes: { tipoBarreira: "linear", comprimentoMetros: 5, duracaoTurnos: 2, danoAoTocar: { tipoDano: "Sagrado", formulaDano: "(carisma*0.5)" } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Muralha de 6m, dura 2 turnos. Dano ao tocar aumentado.", efeitoDetalhes: { tipoBarreira: "linear", comprimentoMetros: 6, duracaoTurnos: 2, danoAoTocar: { tipoDano: "Sagrado", formulaDano: "(carisma*0.7)" } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Muralha de 7m, dura 3 turnos. Dano ao tocar aumentado. Aliados próximos à muralha recebem pequena cura por turno.", efeitoDetalhes: { tipoBarreira: "linear", comprimentoMetros: 7, duracaoTurnos: 3, danoAoTocar: { tipoDano: "Sagrado", formulaDano: "(carisma*0.9)" }, curaProximidade: { raioMetros: 1, formulaCuraPorTurno: "(carisma*0.3)" } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Muralha de 8m, dura 3 turnos. Dano ao tocar e cura próximos aumentados.", efeitoDetalhes: { tipoBarreira: "linear", comprimentoMetros: 8, duracaoTurnos: 3, danoAoTocar: { tipoDano: "Sagrado", formulaDano: "(carisma*1.1)" }, curaProximidade: { raioMetros: 1.5, formulaCuraPorTurno: "(carisma*0.4)" } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Muralha de 10m, dura 4 turnos. Dano ao tocar e cura próximos maximizados. A muralha repele ativamente projéteis sombrios.", efeitoDetalhes: { tipoBarreira: "linear_repulsiva", comprimentoMetros: 10, duracaoTurnos: 4, danoAoTocar: { tipoDano: "Sagrado", formulaDano: "(carisma*1.3)" }, curaProximidade: { raioMetros: 2, formulaCuraPorTurno: "(carisma*0.5)" }, repeleProjeteis: ["Sombrio"] } }
    ]
},
"classe_guardiao_da_luz_luz_purificadora": {
    id: "classe_guardiao_da_luz_luz_purificadora",
    nome: "Luz Purificadora",
    origemTipo: "classe", origemNome: "Guardião da Luz",
    tipo: "cura_area_buff_remocao_debuff",
    descricao: "Libera uma onda de luz sagrada que cura aliados em área e dissipa efeitos mágicos negativos.",
    cooldownSegundos: 75,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_guardiao_da_luz_chama_da_fe", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 40, efeitoDesc: "Cura (Carisma * 1.5 + Intelecto * 0.5) PV de aliados em raio de 5m. Remove 1 debuff mágico de cada aliado.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 5, tipoCura: "PV", formulaCura: "(carisma*1.5)+(intelecto*0.5)", removeDebuff: { tipo: "magico", quantidade: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 43, efeitoDesc: "Cura (Carisma * 1.8 + Intelecto * 0.6) PV. Raio 6m. Remove 1 debuff mágico.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 6, tipoCura: "PV", formulaCura: "(carisma*1.8)+(intelecto*0.6)", removeDebuff: { tipo: "magico", quantidade: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 46, efeitoDesc: "Cura (Carisma * 2.1 + Intelecto * 0.7) PV. Raio 7m. Remove até 2 debuffs mágicos e concede Resistência a Debuffs por 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 7, tipoCura: "PV", formulaCura: "(carisma*2.1)+(intelecto*0.7)", removeDebuff: { tipo: "magico", quantidade: 2 }, buffAdicional: { nome: "Vontade Sagrada", efeitoDesc: "+Resistência a Debuffs", duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 49, efeitoDesc: "Cura (Carisma * 2.4 + Intelecto * 0.8) PV. Raio 8m. Remove até 2 debuffs mágicos e concede Resistência a Debuffs aprimorada.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 8, tipoCura: "PV", formulaCura: "(carisma*2.4)+(intelecto*0.8)", removeDebuff: { tipo: "magico", quantidade: 2 }, buffAdicional: { nome: "Vontade Sagrada Forte", efeitoDesc: "++Resistência a Debuffs", duracaoTurnos: 3 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 52, efeitoDesc: "Cura (Carisma * 2.8 + Intelecto * 1.0) PV. Raio 10m. Remove todos os debuffs mágicos e concede Imunidade a Debuffs por 1 turno, seguido de Resistência a Debuffs por 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 10, tipoCura: "PV", formulaCura: "(carisma*2.8)+(intelecto*1.0)", removeDebuff: { tipo: "magico", quantidade: "todos" }, buffAdicional: { nome: "Proteção Divina Total", efeitoDesc: "Imunidade a Debuffs (1T), depois Resistência (2T)", duracaoTurnos: 3 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE GUARDIÃO DA LUZ ---

// --- FEITIÇOS DE CLASSE: MESTRE DAS BESTAS ---
"classe_mestre_das_bestas_companheiro_selvagem": {
    id: "classe_mestre_das_bestas_companheiro_selvagem",
    nome: "Companheiro Selvagem",
    origemTipo: "classe", origemNome: "Mestre das Bestas",
    tipo: "invocacao_permanente_companheiro", // Companheiro que evolui com o mestre
    descricao: "Invoca um leal companheiro animal (ex: lobo, urso, águia - escolha inicial) que luta ao lado do Mestre e se fortalece com ele.",
    cooldownSegundos: 300, // Cooldown alto se o companheiro for derrotado, para reinvocá-lo
    maxNivel: 5, // Nível do FEITIÇO, que melhora a sinergia ou as opções de companheiro
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_mestre_das_bestas_furia_da_matilha", aoAtingirNivel: 5 } ],
    niveis: [
        // Os níveis deste feitiço podem melhorar os status base do companheiro invocado,
        // ou desbloquear novas habilidades para o companheiro, ou permitir escolher/trocar de companheiro.
        // A estatística do companheiro em si seria um objeto separado ou definido aqui.
        // Exemplo: O companheiro ganha +X% de status do Mestre das Bestas por nível deste feitiço.
        { nivel: 1, custoPM: 25, efeitoDesc: "Invoca um Companheiro Animal básico (Lobo Cinzento). Seus status são 50% dos do Mestre (For, Agi, Vit).", efeitoDetalhes: { tipoInvocacao: "companheiro_animal", nomeCompanheiroBase: "Lobo Cinzento", percentualStatusMestre: 0.50, habilidadesCompanheiro: ["mordida"] }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 25, efeitoDesc: "Companheiro tem status 60% dos do Mestre. Aprende 'Uivo Amedrontador'.", efeitoDetalhes: { tipoInvocacao: "companheiro_animal", nomeCompanheiroBase: "Lobo Cinzento", percentualStatusMestre: 0.60, habilidadesCompanheiro: ["mordida", "uivo_amedrontador"] }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 25, efeitoDesc: "Companheiro tem status 70% dos do Mestre. Pode escolher entre Lobo, Urso Pardo (mais tanque) ou Falcão (mais ágil, ataques a distância).", efeitoDetalhes: { tipoInvocacao: "companheiro_animal_escolha", opcoesCompanheiro: ["Lobo Cinzento Aprimorado", "Urso Pardo", "Falcão Caçador"], percentualStatusMestre: 0.70 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 25, efeitoDesc: "Companheiro tem status 80% dos do Mestre. Companheiro ganha uma habilidade especial baseada na sua forma.", efeitoDetalhes: { tipoInvocacao: "companheiro_animal_escolha", percentualStatusMestre: 0.80, habilidadeEspecialPorForma: true }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 25, efeitoDesc: "Companheiro tem status 90% dos do Mestre. O Mestre pode se fundir brevemente com o espírito do companheiro, ganhando um de seus sentidos ou habilidades por 1 minuto (ex: faro aguçado do lobo, visão do falcão).", efeitoDetalhes: { tipoInvocacao: "companheiro_animal_escolha", percentualStatusMestre: 0.90, habilidadeFusaoEspiritual: true, duracaoFusaoMinutos: 1 } }
    ]
},
"classe_mestre_das_bestas_uivo_dominante": {
    id: "classe_mestre_das_bestas_uivo_dominante",
    nome: "Uivo Dominante",
    origemTipo: "classe", origemNome: "Mestre das Bestas",
    tipo: "buff_aliados_animais_debuff_inimigos",
    descricao: "Um uivo poderoso que enfraquece a moral de inimigos próximos e fortalece os instintos de companheiros animais aliados.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_mestre_das_bestas_chamado_primal", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Inimigos em raio de 8m sofrem -10% de Ataque por 2 turnos. Companheiros animais aliados na área ganham +10% de Dano por 2 turnos.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 8, debuffInimigos: { atributo: "ataqueBase", modificador: "percentual_negativo_multiplicativo", valor: 0.10, duracaoTurnos: 2 }, buffAliadosAnimais: { atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Debuff -12% Ataque, Buff +12% Dano. Raio 9m.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 9, debuffInimigos: { atributo: "ataqueBase", modificador: "percentual_negativo_multiplicativo", valor: 0.12, duracaoTurnos: 2 }, buffAliadosAnimais: { atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.12, duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Debuff -15% Ataque, Buff +15% Dano. Raio 10m, duração 3 turnos. Inimigos podem hesitar.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 10, debuffInimigos: { atributo: "ataqueBase", modificador: "percentual_negativo_multiplicativo", valor: 0.15, duracaoTurnos: 3, condicao: { nome: "Hesitação Bestial", chance: 0.15, duracaoTurnos: 1 } }, buffAliadosAnimais: { atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.15, duracaoTurnos: 3 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Debuff -18% Ataque, Buff +18% Dano. Raio 11m, duração 3 turnos. Companheiros animais também ganham velocidade de ataque.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 11, debuffInimigos: { atributo: "ataqueBase", modificador: "percentual_negativo_multiplicativo", valor: 0.18, duracaoTurnos: 3, condicao: { nome: "Hesitação Bestial", chance: 0.20, duracaoTurnos: 1 } }, buffAliadosAnimais: { atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.18, duracaoTurnos: 3, buffAdicional: { atributo: "velocidadeAtaque", valor: 0.10 } } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Debuff -20% Ataque e -10% Defesa, Buff +20% Dano e +10% PV Máx para companheiros. Raio 12m, duração 4 turnos. Inimigos têm chance de sofrer Medo.", efeitoDetalhes: { alvo: "area_efeitos_distintos", raioMetros: 12, debuffInimigos: { atributos: [{atr: "ataqueBase", mod: "percentual_negativo_multiplicativo", val: 0.20}, {atr: "defesaBase", mod: "percentual_negativo_multiplicativo", val: 0.10}], duracaoTurnos: 4, condicao: { nome: "Medo Primal", chance: 0.25, duracaoTurnos: 1 } }, buffAliadosAnimais: { atributos: [{atr: "danoCausado", mod: "percentual_aditivo", val: 0.20}, {atr: "pvMax", mod: "percentual_aditivo", val: 0.10}], duracaoTurnos: 4 } } }
    ]
},
"classe_mestre_das_bestas_furia_da_matilha": {
    id: "classe_mestre_das_bestas_furia_da_matilha",
    nome: "Fúria da Matilha",
    origemTipo: "classe", origemNome: "Mestre das Bestas",
    tipo: "buff_poderoso_companheiros",
    descricao: "Incita todos os companheiros animais e invocações bestiais aliadas a um estado de fúria selvagem, aumentando drasticamente sua força e agilidade por um curto período.",
    cooldownSegundos: 120,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_mestre_das_bestas_companheiro_selvagem", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Todos os companheiros animais/invocações bestiais do Mestre ganham +25% de Dano e +15% de Agilidade por 2 turnos.", efeitoDetalhes: { alvo: "todos_companheiros_invocacoes_bestiais_mestre", buffs: [{ atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.25 }, { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.15 }], duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 33, efeitoDesc: "+30% Dano, +20% Agilidade por 2 turnos.", efeitoDetalhes: { alvo: "todos_companheiros_invocacoes_bestiais_mestre", buffs: [{ atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.30 }, { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.20 }], duracaoTurnos: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 36, efeitoDesc: "+35% Dano, +25% Agilidade, +10% Velocidade de Movimento por 3 turnos.", efeitoDetalhes: { alvo: "todos_companheiros_invocacoes_bestiais_mestre", buffs: [{ atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.35 }, { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.25 }, { atributo: "velocidadeMovimento", modificador: "percentual_aditivo", valor: 0.10 }], duracaoTurnos: 3 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 39, efeitoDesc: "+40% Dano, +30% Agilidade, +15% Velocidade de Movimento por 3 turnos. Bestas também ganham Roubo de Vida leve.", efeitoDetalhes: { alvo: "todos_companheiros_invocacoes_bestiais_mestre", buffs: [{ atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.40 }, { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.30 }, { atributo: "velocidadeMovimento", modificador: "percentual_aditivo", valor: 0.15 }, { atributo: "rouboDeVida", modificador: "percentual_aditivo", valor: 0.10 }], duracaoTurnos: 3 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 42, efeitoDesc: "+50% Dano, +35% Agilidade, +20% Velocidade de Movimento por 4 turnos. Bestas ganham Roubo de Vida e se tornam Imparáveis (imunes a controle de grupo).", efeitoDetalhes: { alvo: "todos_companheiros_invocacoes_bestiais_mestre", buffs: [{ atributo: "danoCausado", modificador: "percentual_aditivo", valor: 0.50 }, { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.35 }, { atributo: "velocidadeMovimento", modificador: "percentual_aditivo", valor: 0.20 }, { atributo: "rouboDeVida", modificador: "percentual_aditivo", valor: 0.15 }, { nome: "Imparável", efeitoDesc: "Imune a CC" }], duracaoTurnos: 4 } }
    ]
},
"classe_mestre_das_bestas_chamado_primal": {
    id: "classe_mestre_das_bestas_chamado_primal",
    nome: "Chamado Primal",
    origemTipo: "classe", origemNome: "Mestre das Bestas",
    tipo: "invocacao_temporaria_poderosa",
    descricao: "O Mestre das Bestas entoa um chamado ancestral, invocando temporariamente uma criatura mágica rara e poderosa para lutar ao seu lado.",
    cooldownSegundos: 600, // Cooldown muito alto para uma invocação poderosa
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_mestre_das_bestas_uivo_dominante", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Cada nível pode invocar uma criatura diferente ou a mesma criatura mais forte/com mais habilidades.
        { nivel: 1, custoPM: 50, efeitoDesc: "Invoca um Grifo Veloz por 1 minuto. (Ataques rápidos, pode voar).", efeitoDetalhes: { tipoInvocacao: "criatura_magica_temporaria", nomeCriatura: "Grifo Veloz", duracaoMinutos: 1, estatisticasCriatura: { /* definir stats e habilidades do Grifo */ } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 55, efeitoDesc: "Invoca um Basilisco Rochoso por 1 minuto. (Resistente, pode petrificar com olhar).", efeitoDetalhes: { tipoInvocacao: "criatura_magica_temporaria", nomeCriatura: "Basilisco Rochoso", duracaoMinutos: 1, estatisticasCriatura: { /* definir stats e habilidades do Basilisco */ } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 60, efeitoDesc: "Invoca uma Quimera Elemental por 1.5 minutos. (Sopro de fogo, gelo e raio).", efeitoDetalhes: { tipoInvocacao: "criatura_magica_temporaria", nomeCriatura: "Quimera Elemental", duracaoMinutos: 1.5, estatisticasCriatura: { /* definir stats e habilidades da Quimera */ } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 65, efeitoDesc: "Invoca um Behemoth Ancião por 1.5 minutos. (Força colossal, pisotão em área).", efeitoDetalhes: { tipoInvocacao: "criatura_magica_temporaria", nomeCriatura: "Behemoth Ancião", duracaoMinutos: 1.5, estatisticasCriatura: { /* definir stats e habilidades do Behemoth */ } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 70, efeitoDesc: "Invoca um Dragão Menor Leal por 2 minutos. (Sopro poderoso, voo, garras). O Mestre pode escolher o tipo elemental do dragão (Fogo, Gelo, Trovão).", efeitoDetalhes: { tipoInvocacao: "criatura_magica_temporaria_escolha_elemental", nomeCriaturaBase: "Dragão Menor Leal", duracaoMinutos: 2, estatisticasCriatura: { /* definir stats base e habilidades, com variação elemental */ } } }
    ]
},
// --- FIM DOS FEITIÇOS DE MESTRE DAS BESTAS ---

// --- FEITIÇOS DE CLASSE: BARDO ARCANO ---
"classe_bardo_arcano_cancao_de_inspiracao": {
    id: "classe_bardo_arcano_cancao_de_inspiracao",
    nome: "Canção de Inspiração",
    origemTipo: "classe", origemNome: "Bardo Arcano",
    tipo: "buff_area_aliados_atributos",
    descricao: "Entoa uma melodia inspiradora que eleva os atributos dos aliados próximos.",
    cooldownSegundos: 40,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_bardo_arcano_sinfonia_do_caos", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Aliados em raio de 6m ganham + (Carisma * 0.1) em Força e Agilidade por 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 6, buffs: [{ atributo: "forca", formulaValor: "(carisma*0.1)" }, { atributo: "agilidade", formulaValor: "(carisma*0.1)" }], duracaoTurnos: 2 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Buff para + (Carisma * 0.12) em Força, Agilidade e Intelecto por 2 turnos. Raio 7m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 7, buffs: [{ atributo: "forca", formulaValor: "(carisma*0.12)" }, { atributo: "agilidade", formulaValor: "(carisma*0.12)" }, { atributo: "intelecto", formulaValor: "(carisma*0.12)" }], duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Buff para + (Carisma * 0.15) em Força, Agilidade, Intelecto e Vitalidade por 3 turnos. Raio 8m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 8, buffs: [{ atributo: "forca", formulaValor: "(carisma*0.15)" }, { atributo: "agilidade", formulaValor: "(carisma*0.15)" }, { atributo: "intelecto", formulaValor: "(carisma*0.15)" }, { atributo: "vitalidade", formulaValor: "(carisma*0.15)" }], duracaoTurnos: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Buff para + (Carisma * 0.18) em todos os atributos primários por 3 turnos. Raio 9m. Também concede pequena resistência a medo.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 9, buffs: [{ atributo: "forca", formulaValor: "(carisma*0.18)" }, { atributo: "agilidade", formulaValor: "(carisma*0.18)" }, { atributo: "intelecto", formulaValor: "(carisma*0.18)" }, { atributo: "vitalidade", formulaValor: "(carisma*0.18)" }, { atributo: "carisma", formulaValor: "(carisma*0.18)" }], duracaoTurnos: 3, buffAdicional: { nome: "Coragem Melódica", efeitoDesc: "Resistência a Medo" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Buff para + (Carisma * 0.22) em todos os atributos primários por 4 turnos. Raio 10m. Concede resistência a medo e remove um efeito de desmoralização.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 10, buffs: [{ atributo: "forca", formulaValor: "(carisma*0.22)" }, { atributo: "agilidade", formulaValor: "(carisma*0.22)" }, { atributo: "intelecto", formulaValor: "(carisma*0.22)" }, { atributo: "vitalidade", formulaValor: "(carisma*0.22)" }, { atributo: "carisma", formulaValor: "(carisma*0.22)" }], duracaoTurnos: 4, buffAdicional: { nome: " Bravura Harmônica", efeitoDesc: "Imunidade a Medo" }, efeitoPurificacao: { tipo: "remove_debuff_moral", quantidade: 1 } } }
    ]
},
"classe_bardo_arcano_acorde_disruptivo": {
    id: "classe_bardo_arcano_acorde_disruptivo",
    nome: "Acorde Disruptivo",
    origemTipo: "classe", origemNome: "Bardo Arcano",
    tipo: "debuff_unico_controle",
    descricao: "Emite um acorde dissonante e mágico que desorienta um inimigo, podendo interromper suas ações.",
    cooldownSegundos: 12,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_bardo_arcano_balada_do_vazio", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Alvo tem 30% de chance de ter sua ação atual interrompida (se estiver conjurando/concentrando) e sofre -5 de Intelecto por 1 turno.", efeitoDetalhes: { alvo: "unico", chanceInterromperAcao: 0.30, debuff: { atributo: "intelecto", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 11, efeitoDesc: "Chance de interrupção 40%. Debuff de -7 de Intelecto por 1 turno.", efeitoDetalhes: { alvo: "unico", chanceInterromperAcao: 0.40, debuff: { atributo: "intelecto", modificador: "fixo_negativo", valor: 7, duracaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 12, efeitoDesc: "Chance de interrupção 50%. Debuff de -10 de Intelecto por 2 turnos. Alvo também fica Silenciado por 1 turno com 20% de chance.", efeitoDetalhes: { alvo: "unico", chanceInterromperAcao: 0.50, debuff: { atributo: "intelecto", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 }, condicao: { nome: "Silêncio Dissonante", chance: 0.20, duracaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 13, efeitoDesc: "Chance de interrupção 60%. Debuff de -12 de Intelecto e -5 de Carisma por 2 turnos. Chance de Silêncio aumentada para 30%.", efeitoDetalhes: { alvo: "unico", chanceInterromperAcao: 0.60, debuffs: [{ atributo: "intelecto", modificador: "fixo_negativo", valor: 12, duracaoTurnos: 2 }, { atributo: "carisma", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 2 }], condicao: { nome: "Silêncio Dissonante", chance: 0.30, duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 14, efeitoDesc: "Chance de interrupção 75%. Debuff de -15 de Intelecto e -10 de Carisma por 3 turnos. Silêncio garantido por 1 turno. O acorde também causa (Carisma * 0.5) de dano Sônico.", efeitoDetalhes: { alvo: "unico", chanceInterromperAcao: 0.75, tipoDano: "Sonico", formulaDano: "(carisma*0.5)", debuffs: [{ atributo: "intelecto", modificador: "fixo_negativo", valor: 15, duracaoTurnos: 3 }, { atributo: "carisma", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 3 }], condicao: { nome: "Silêncio Dissonante Maior", chance: 1.0, duracaoTurnos: 1 } } }
    ]
},
"classe_bardo_arcano_sinfonia_do_caos": {
    id: "classe_bardo_arcano_sinfonia_do_caos",
    nome: "Sinfonia do Caos",
    origemTipo: "classe", origemNome: "Bardo Arcano",
    tipo: "debuff_area_aleatorio",
    descricao: "Libera uma onda sonora cacofônica e instável que causa efeitos mágicos aleatórios e prejudiciais nos inimigos em uma área.",
    cooldownSegundos: 70,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_bardo_arcano_cancao_de_inspiracao", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Efeitos aleatórios podem ser: lentidão, dano leve, confusão, silêncio breve, redução de atributo aleatório.
        // A cada nível, aumenta o número de efeitos possíveis, a potência ou a chance de aplicar efeitos mais fortes.
        { nivel: 1, custoPM: 30, efeitoDesc: "Inimigos em raio de 6m têm chance de sofrer 1 de 3 efeitos aleatórios negativos por 2 turnos (ex: Lentidão Leve, Dano Sônico Menor, -5 Agilidade).", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 6, numeroEfeitosAleatorios: 1, listaEfeitosPossiveis: [ {nome:"LentidaoCaotica", chance:0.33}, {nome:"DanoSonicoMenor", chance:0.33}, {nome:"DebuffAgiCaotico", chance:0.33} ], duracaoEfeitosTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Raio 7m. Chance de sofrer 1 de 4 efeitos aleatórios. Efeitos um pouco mais fortes.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 7, numeroEfeitosAleatorios: 1, listaEfeitosPossiveis: [ /* lista atualizada com 4 efeitos */ ], duracaoEfeitosTurnos: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Raio 8m. Chance de sofrer 1 de 5 efeitos aleatórios, ou 2 efeitos mais fracos. Duração 3 turnos.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 8, /* lógica para 1 efeito forte ou 2 fracos */ listaEfeitosPossiveis: [ /* lista atualizada com 5 efeitos */ ], duracaoEfeitosTurnos: 3 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Raio 9m. Chance de sofrer 1 de 6 efeitos, ou 2 efeitos médios. Efeitos mais potentes.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 9, /* ... */ }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 42, efeitoDesc: "Raio 10m. Chance de sofrer 2 de 6 efeitos potentes. Duração 3-4 turnos. Pode incluir 'Transformação Cômica' (alvo vira uma ovelha por 1 turno).", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 10, numeroEfeitosAleatorios: 2, listaEfeitosPossiveis: [ /* lista final com efeitos potentes, incluindo transformação */ ], duracaoEfeitosTurnos: 4 } }
    ]
},
"classe_bardo_arcano_balada_do_vazio": {
    id: "classe_bardo_arcano_balada_do_vazio",
    nome: "Balada do Vazio",
    origemTipo: "classe", origemNome: "Bardo Arcano",
    tipo: "antimagia_debuff_magos",
    descricao: "Uma melodia sombria que interfere com energias arcanas, podendo cancelar feitiços inimigos ativos e enfraquecer a capacidade de conjuração de magos.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_bardo_arcano_acorde_disruptivo", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Tenta dissipar 1 efeito mágico benéfico de cada inimigo em área (raio 6m). Conjuradores inimigos na área sofrem -10 de Intelecto por 2 turnos.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 6, efeitoDissipar: { tipo: "buff", quantidade: 1 }, debuffConjuradores: { atributo: "intelecto", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Dissipa 1 efeito. Debuff de -12 de Intelecto. Raio 7m.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 7, efeitoDissipar: { tipo: "buff", quantidade: 1 }, debuffConjuradores: { atributo: "intelecto", modificador: "fixo_negativo", valor: 12, duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Dissipa até 2 efeitos. Debuff de -15 de Intelecto e aumenta o custo de PM dos feitiços inimigos em 10% por 3 turnos. Raio 8m.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 8, efeitoDissipar: { tipo: "buff", quantidade: 2 }, debuffConjuradores: { atributo: "intelecto", modificador: "fixo_negativo", valor: 15, duracaoTurnos: 3, aumentoCustoPMPercent: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Dissipa até 2 efeitos. Debuff de -18 de Intelecto e +15% custo de PM. Raio 9m, duração 3 turnos.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 9, efeitoDissipar: { tipo: "buff", quantidade: 2 }, debuffConjuradores: { atributo: "intelecto", modificador: "fixo_negativo", valor: 18, duracaoTurnos: 3, aumentoCustoPMPercent: 0.15 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Dissipa todos os efeitos mágicos benéficos. Debuff de -20 de Intelecto e +20% custo de PM. Raio 10m, duração 4 turnos. Conjuradores afetados têm 25% de chance de falha ao lançar feitiços.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 10, efeitoDissipar: { tipo: "buff", quantidade: "todos" }, debuffConjuradores: { atributo: "intelecto", modificador: "fixo_negativo", valor: 20, duracaoTurnos: 4, aumentoCustoPMPercent: 0.20, chanceFalhaFeitico: 0.25 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE BARDO ARCANO ---

// --- FEITIÇOS DE CLASSE: ALQUIMISTA ---
// Nota: As "habilidades" do Alquimista podem ser mais sobre "criar e usar itens alquímicos" do que "lançar feitiços".
// A estrutura de feitiço pode ser usada para representar a "receita" ou "habilidade de criar/usar" o item.
// O custo de PM pode representar os reagentes mentais/foco para preparar rapidamente ou usar o item.

"classe_alquimista_frasco_de_acido": {
    id: "classe_alquimista_frasco_de_acido",
    nome: "Frasco de Ácido",
    origemTipo: "classe", origemNome: "Alquimista",
    tipo: "ataque_item_alquimico_dot", // Item que causa dano ao longo do tempo
    descricao: "Arremessa um frasco contendo uma mistura ácida altamente corrosiva que causa dano contínuo e pode reduzir armadura.",
    cooldownSegundos: 10, // Cooldown para arremessar outro
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_alquimista_bomba_de_essencia", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 8, efeitoDesc: "Alvo atingido sofre (Intelecto * 0.4) de dano Químico por turno por 2 turnos.", efeitoDetalhes: { alvo: "unico_arremesso", tipoDanoPorTurno: "Quimico", formulaDanoPorTurno: "(intelecto*0.4)", duracaoTurnosDoT: 2, areaImpactoMetros: 0.5 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Dano (Intelecto * 0.5) por turno por 2 turnos. Reduz Defesa Base do alvo em 5 pontos por 2 turnos.", efeitoDetalhes: { alvo: "unico_arremesso", tipoDanoPorTurno: "Quimico", formulaDanoPorTurno: "(intelecto*0.5)", duracaoTurnosDoT: 2, areaImpactoMetros: 0.5, debuff: { atributo: "defesaBase", modificador: "fixo_negativo", valor: 5, duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Dano (Intelecto * 0.6) por turno por 3 turnos. Reduz Defesa Base em 10 pontos. Pequena área de respingo (1m).", efeitoDetalhes: { alvo: "unico_arremesso_com_respingo", tipoDanoPorTurno: "Quimico", formulaDanoPorTurno: "(intelecto*0.6)", duracaoTurnosDoT: 3, areaImpactoMetros: 1, debuff: { atributo: "defesaBase", modificador: "fixo_negativo", valor: 10, duracaoTurnos: 3 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Dano (Intelecto * 0.7) por turno por 3 turnos. Reduz Defesa Base em 15 pontos. Área de respingo 1.5m.", efeitoDetalhes: { alvo: "unico_arremesso_com_respingo", tipoDanoPorTurno: "Quimico", formulaDanoPorTurno: "(intelecto*0.7)", duracaoTurnosDoT: 3, areaImpactoMetros: 1.5, debuff: { atributo: "defesaBase", modificador: "fixo_negativo", valor: 15, duracaoTurnos: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Dano (Intelecto * 0.8) por turno por 4 turnos. Reduz Defesa Base em 20 pontos e 5% da Resistência Mágica. Área de respingo 2m. O ácido pode corroer objetos de madeira/couro.", efeitoDetalhes: { alvo: "unico_arremesso_com_respingo", tipoDanoPorTurno: "Quimico", formulaDanoPorTurno: "(intelecto*0.8)", duracaoTurnosDoT: 4, areaImpactoMetros: 2, debuffs: [{ atributo: "defesaBase", modificador: "fixo_negativo", valor: 20, duracaoTurnos: 4 }, { atributo: "resistenciaMagica", modificador: "percentual_negativo_multiplicativo", valor: 0.05, duracaoTurnos: 4 }], efeitoAmbiental: "corrosao_leve" } }
    ]
},
"classe_alquimista_fumaca_alquimica": {
    id: "classe_alquimista_fumaca_alquimica",
    nome: "Fumaça Alquímica",
    origemTipo: "classe", origemNome: "Alquimista",
    tipo: "utilidade_area_ocultacao",
    descricao: "Cria uma névoa densa em uma área, ocultando aliados e dificultando a mira de inimigos.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_alquimista_sangue_de_pedra", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Cria uma nuvem de fumaça (raio 3m) por 2 turnos. Inimigos dentro ou atirando através da fumaça têm -15% de chance de acerto.", efeitoDetalhes: { tipoEfeito: "cortina_fumaca", raioMetros: 3, duracaoTurnos: 2, penalidadeAcertoInimigoPercent: 0.15 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 11, efeitoDesc: "Raio 4m, dura 2 turnos. Penalidade de acerto -20%.", efeitoDetalhes: { tipoEfeito: "cortina_fumaca", raioMetros: 4, duracaoTurnos: 2, penalidadeAcertoInimigoPercent: 0.20 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 12, efeitoDesc: "Raio 5m, dura 3 turnos. Penalidade de acerto -25%. Aliados dentro da fumaça ganham bônus de furtividade.", efeitoDetalhes: { tipoEfeito: "cortina_fumaca_aprimorada", raioMetros: 5, duracaoTurnos: 3, penalidadeAcertoInimigoPercent: 0.25, bonusFurtividadeAliados: true }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 13, efeitoDesc: "Raio 6m, dura 3 turnos. Penalidade de acerto -30%. A fumaça pode ser infundida com um irritante leve (inimigos na fumaça tossem, pequena chance de interromper ação).", efeitoDetalhes: { tipoEfeito: "cortina_fumaca_irritante", raioMetros: 6, duracaoTurnos: 3, penalidadeAcertoInimigoPercent: 0.30, bonusFurtividadeAliados: true, efeitoIrritante: { chanceInterromperAcao: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 14, efeitoDesc: "Raio 7m, dura 4 turnos. Penalidade de acerto -35%. A fumaça pode ser infundida com um sonífero suave (inimigos que permanecem na fumaça por 2 turnos têm chance de adormecer por 1 turno).", efeitoDetalhes: { tipoEfeito: "cortina_fumaca_sonifera", raioMetros: 7, duracaoTurnos: 4, penalidadeAcertoInimigoPercent: 0.35, bonusFurtividadeAliados: true, efeitoSonifero: { turnosParaEfeito: 2, condicao: { nome: "Sonolência Alquímica", chance: 0.25, duracaoTurnos: 1 } } } }
    ]
},
"classe_alquimista_bomba_de_essencia": {
    id: "classe_alquimista_bomba_de_essencia",
    nome: "Bomba de Essência",
    origemTipo: "classe", origemNome: "Alquimista",
    tipo: "ataque_item_alquimico_area_elemental",
    descricao: "Cria e arremessa uma bomba potente imbuída com uma essência elemental instável, causando uma explosão devastadora com efeitos elementais variados.",
    cooldownSegundos: 60,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_alquimista_frasco_de_acido", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // O Alquimista pode escolher o tipo de essência elemental ao preparar/usar a bomba.
        // Ex: Fogo (dano+queimadura), Gelo (dano+lentidão), Trovão (dano+paralisia breve), Terra (dano+atordoamento).
        { nivel: 1, custoPM: 25, efeitoDesc: "Explosão (raio 2m) causa (Intelecto * 1.8) de dano do tipo elemental escolhido. Efeito elemental menor.", efeitoDetalhes: { alvo: "area_arremesso", raioMetros: 2, permiteEscolhaElemento: ["Fogo", "Gelo"], formulaDanoBase: "(intelecto*1.8)", efeitoElementalMenor: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Dano (Intelecto * 2.0). Raio 2.5m. Adiciona elemento Trovão às escolhas. Efeitos elementais moderados.", efeitoDetalhes: { alvo: "area_arremesso", raioMetros: 2.5, permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão"], formulaDanoBase: "(intelecto*2.0)", efeitoElementalModerado: true }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Dano (Intelecto * 2.3). Raio 3m. Adiciona elemento Terra. Efeitos elementais aprimorados.", efeitoDetalhes: { alvo: "area_arremesso", raioMetros: 3, permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão", "Terra"], formulaDanoBase: "(intelecto*2.3)", efeitoElementalAprimorado: true }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Dano (Intelecto * 2.6). Raio 3.5m. Efeitos elementais potentes. Pode deixar terreno perigoso (ex: chão em chamas, escorregadio).", efeitoDetalhes: { alvo: "area_arremesso", raioMetros: 3.5, permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão", "Terra"], formulaDanoBase: "(intelecto*2.6)", efeitoElementalPotente: true, efeitoTerreno: true }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Dano (Intelecto * 3.0). Raio 4m. Efeitos elementais devastadores. Pode criar uma bomba com duas essências combinadas para efeitos únicos.", efeitoDetalhes: { alvo: "area_arremesso", raioMetros: 4, permiteEscolhaElementoAvancada: true, formulaDanoBase: "(intelecto*3.0)", efeitoElementalDevastador: true, efeitoTerrenoAprimorado: true, permiteCombinarEssencias: true } }
    ]
},
"classe_alquimista_sangue_de_pedra": {
    id: "classe_alquimista_sangue_de_pedra",
    nome: "Sangue de Pedra",
    origemTipo: "classe", origemNome: "Alquimista",
    tipo: "buff_pessoal_defesa_transformacao",
    descricao: "O Alquimista ingere uma poção especial que transforma temporariamente sua pele em uma substância rochosa, aumentando drasticamente sua defesa e resistência, mas reduzindo sua mobilidade.",
    cooldownSegundos: 180,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_alquimista_fumaca_alquimica", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Defesa Base + (Vitalidade * 1.0), Resistência Mágica +10%. Agilidade -10. Dura 2 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.0)" }, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.10 }], debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 10 }, duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Defesa Base + (Vitalidade * 1.2), Resist. Mágica +15%. Agilidade -8. Dura 2 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.2)" }, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.15 }], debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 8 }, duracaoTurnos: 2 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Defesa Base + (Vitalidade * 1.5), Resist. Mágica +20%, Redução de Dano Físico 5%. Agilidade -7. Dura 3 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.5)" }, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.20 }, { atributo: "reducaoDanoFisico", modificador: "percentual_aditivo", valor: 0.05 }], debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 7 }, duracaoTurnos: 3 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Defesa Base + (Vitalidade * 1.8), Resist. Mágica +25%, Redução Dano Físico 10%. Agilidade -6. Dura 3 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.8)" }, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.25 }, { atributo: "reducaoDanoFisico", modificador: "percentual_aditivo", valor: 0.10 }], debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 6 }, duracaoTurnos: 3 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Defesa Base + (Vitalidade * 2.2), Resist. Mágica +30%, Redução Dano Físico 15% e Mágico 5%. Agilidade -5. Dura 4 turnos. Imune a atordoamento enquanto ativo.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*2.2)" }, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.30 }, { atributo: "reducaoDanoFisico", modificador: "percentual_aditivo", valor: 0.15 }, { atributo: "reducaoDanoMagico", modificador: "percentual_aditivo", valor: 0.05 }, { nome: "Pele Rochosa", imunidade: ["atordoamento"] } ], debuff: { atributo: "agilidade", modificador: "fixo_negativo", valor: 5 }, duracaoTurnos: 4 } }
    ]
},
// --- FIM DOS FEITIÇOS DE ALQUIMISTA ---

// --- FEITIÇOS DE CLASSE: CLÉRIGO DA ORDEM ---
"classe_clerigo_da_ordem_reza_curativa": {
    id: "classe_clerigo_da_ordem_reza_curativa",
    nome: "Reza Curativa",
    origemTipo: "classe", origemNome: "Clérigo da Ordem",
    tipo: "cura_unico",
    descricao: "Uma prece devota que canaliza energia divina para restaurar a vida de um aliado.",
    cooldownSegundos: 5, // Cooldown baixo para uma cura básica
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_clerigo_da_ordem_milagre_do_sacrificio", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Cura (Carisma * 1.5 + Intelecto * 0.5) PV de um alvo.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.5)+(intelecto*0.5)" }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Cura (Carisma * 1.8 + Intelecto * 0.6) PV.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*1.8)+(intelecto*0.6)" }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Cura (Carisma * 2.1 + Intelecto * 0.7) PV. Também remove um efeito de sangramento leve.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*2.1)+(intelecto*0.7)", removeCondicao: { tipo: "sangramento_leve", quantidade: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Cura (Carisma * 2.4 + Intelecto * 0.8) PV. Remove sangramentos e venenos fracos.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*2.4)+(intelecto*0.8)", removeCondicao: { tipo: ["sangramento", "veneno_fraco"], quantidade: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Cura (Carisma * 2.8 + Intelecto * 1.0) PV. Remove a maioria dos DoTs não mágicos e concede 'Bênção Menor' (+5 em todos atributos por 1 turno).", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*2.8)+(intelecto*1.0)", removeCondicao: { tipo: "dot_nao_magico", quantidade: "todos" }, buffAdicional: { nome: "Bênção Menor", atributos: ["forca","agilidade","vitalidade","intelecto","carisma"], modificador: "fixo_aditivo", valor: 5, duracaoTurnos: 1 } } }
    ]
},
"classe_clerigo_da_ordem_simbolo_da_ordem": {
    id: "classe_clerigo_da_ordem_simbolo_da_ordem",
    nome: "Símbolo da Ordem",
    origemTipo: "classe", origemNome: "Clérigo da Ordem",
    tipo: "controle_area_repelir",
    descricao: "Apresenta um símbolo sagrado que emana poder divino, afastando mortos-vivos e criaturas impuras próximas.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_clerigo_da_ordem_arma_divina", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Mortos-vivos e Impuros em raio de 5m têm 50% de chance de serem Amedrontados por 1 turno.", efeitoDetalhes: { alvo: "area_inimigos_especificos", tiposAlvo: ["MortoVivo", "Impuro"], raioMetros: 5, condicao: { nome: "AmedrontadoPelaOrdem", chance: 0.50, duracaoTurnos: 1 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Chance de Amedrontar aumentada para 60%. Raio 6m.", efeitoDetalhes: { alvo: "area_inimigos_especificos", tiposAlvo: ["MortoVivo", "Impuro"], raioMetros: 6, condicao: { nome: "AmedrontadoPelaOrdem", chance: 0.60, duracaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Chance de Amedrontar 70% por 2 turnos. Raio 7m. Criaturas afetadas também sofrem pequeno dano Sagrado (Carisma * 0.5).", efeitoDetalhes: { alvo: "area_inimigos_especificos", tiposAlvo: ["MortoVivo", "Impuro"], raioMetros: 7, condicao: { nome: "AmedrontadoPelaOrdem", chance: 0.70, duracaoTurnos: 2 }, danoAdicional: { tipoDano: "Sagrado", formulaDano: "(carisma*0.5)" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Chance de Amedrontar 80% por 2 turnos. Raio 8m. Dano Sagrado aumentado (Carisma * 0.7).", efeitoDetalhes: { alvo: "area_inimigos_especificos", tiposAlvo: ["MortoVivo", "Impuro"], raioMetros: 8, condicao: { nome: "AmedrontadoPelaOrdem", chance: 0.80, duracaoTurnos: 2 }, danoAdicional: { tipoDano: "Sagrado", formulaDano: "(carisma*0.7)" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Amedrontamento garantido por 3 turnos para criaturas de nível inferior ao Clérigo (chance de 80% para nível igual ou superior). Raio 10m. Dano Sagrado (Carisma * 1.0). Criaturas repelidas são brevemente atordoadas se atingirem uma parede.", efeitoDetalhes: { alvo: "area_inimigos_especificos", tiposAlvo: ["MortoVivo", "Impuro"], raioMetros: 10, condicao: { nome: "TerrorDivino", chanceNivelInferior: 1.0, chanceNivelIgualSuperior: 0.80, duracaoTurnos: 3 }, danoAdicional: { tipoDano: "Sagrado", formulaDano: "(carisma*1.0)" } /* Lógica de atordoamento por colisão */ } }
    ]
},
"classe_clerigo_da_ordem_milagre_do_sacrificio": {
    id: "classe_clerigo_da_ordem_milagre_do_sacrificio",
    nome: "Milagre do Sacrifício",
    origemTipo: "classe", origemNome: "Clérigo da Ordem",
    tipo: "cura_area_custo_vida",
    descricao: "O Clérigo canaliza sua própria força vital para realizar um milagre, curando todos os aliados próximos em uma quantidade significativa.",
    cooldownSegundos: 180, // Cooldown alto devido ao poder e custo
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_clerigo_da_ordem_reza_curativa", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, custoVidaPercent: 0.25, efeitoDesc: "Sacrifica 25% do PV MÁXIMO do Clérigo para curar aliados em raio de 8m em (Carisma * 3 + Intelecto * 1.0) PV.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 8, tipoCura: "PV", formulaCura: "(carisma*3)+(intelecto*1.0)" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 30, custoVidaPercent: 0.23, efeitoDesc: "Sacrifica 23% PV Máx. Cura (Carisma * 3.5 + Intelecto * 1.2) PV. Raio 9m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 9, tipoCura: "PV", formulaCura: "(carisma*3.5)+(intelecto*1.2)" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 28, custoVidaPercent: 0.20, efeitoDesc: "Sacrifica 20% PV Máx. Cura (Carisma * 4 + Intelecto * 1.4) PV. Raio 10m. Também concede um pequeno escudo de (Carisma * 0.5) PV aos aliados curados por 1 turno.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 10, tipoCura: "PV", formulaCura: "(carisma*4)+(intelecto*1.4)", buffEscudo: { formulaValor: "(carisma*0.5)", duracaoTurnos: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 28, custoVidaPercent: 0.18, efeitoDesc: "Sacrifica 18% PV Máx. Cura (Carisma * 4.5 + Intelecto * 1.6) PV. Raio 11m. Escudo de (Carisma * 0.7) PV por 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 11, tipoCura: "PV", formulaCura: "(carisma*4.5)+(intelecto*1.6)", buffEscudo: { formulaValor: "(carisma*0.7)", duracaoTurnos: 2 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 25, custoVidaPercent: 0.15, efeitoDesc: "Sacrifica 15% PV Máx. Cura (Carisma * 5 + Intelecto * 1.8) PV. Raio 12m. Escudo de (Carisma * 1.0) PV por 2 turnos. Se o Clérigo estiver abaixo de 25% de vida após o sacrifício, ele recebe uma cura instantânea de (Vitalidade * 2).", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 12, tipoCura: "PV", formulaCura: "(carisma*5)+(intelecto*1.8)", buffEscudo: { formulaValor: "(carisma*1.0)", duracaoTurnos: 2 }, autoCuraCondicional: { pvMinimoPercentAposSacrificio: 0.25, formulaAutoCura: "(vitalidade*2)" } } }
    ]
},
"classe_clerigo_da_ordem_arma_divina": {
    id: "classe_clerigo_da_ordem_arma_divina",
    nome: "Arma Divina",
    origemTipo: "classe", origemNome: "Clérigo da Ordem",
    tipo: "buff_arma_dano_condicional",
    descricao: "O Clérigo imbui sua arma (ou conjura uma arma espiritual de luz) com poder divino, fazendo com que seus ataques causem dano sagrado adicional, especialmente eficaz contra criaturas malignas.",
    cooldownSegundos: 75,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_clerigo_da_ordem_simbolo_da_ordem", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Por 3 turnos, ataques corpo-a-corpo causam + (Carisma * 0.5) de dano Sagrado. Dano dobrado contra Malignos.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_arma", duracaoTurnos: 3, tipoDanoAdicional: "Sagrado", formulaDanoAdicional: "(carisma*0.5)", multiplicadorCondicional: { tiposAlvo: ["Maligno", "MortoVivo", "Impuro"], multiplicador: 2.0 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Dano Sagrado adicional + (Carisma * 0.6). Duração 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_arma", duracaoTurnos: 3, tipoDanoAdicional: "Sagrado", formulaDanoAdicional: "(carisma*0.6)", multiplicadorCondicional: { tiposAlvo: ["Maligno", "MortoVivo", "Impuro"], multiplicador: 2.0 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Dano Sagrado adicional + (Carisma * 0.7). Duração 4 turnos. Ataques têm chance de cegar alvos Malignos.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_arma", duracaoTurnos: 4, tipoDanoAdicional: "Sagrado", formulaDanoAdicional: "(carisma*0.7)", multiplicadorCondicional: { tiposAlvo: ["Maligno", "MortoVivo", "Impuro"], multiplicador: 2.0, condicaoEmAlvoEspecial: { nome: "Cegueira Divina", chance: 0.20, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Dano Sagrado adicional + (Carisma * 0.8). Duração 4 turnos. Chance de cegar aumentada.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_arma", duracaoTurnos: 4, tipoDanoAdicional: "Sagrado", formulaDanoAdicional: "(carisma*0.8)", multiplicadorCondicional: { tiposAlvo: ["Maligno", "MortoVivo", "Impuro"], multiplicador: 2.0, condicaoEmAlvoEspecial: { nome: "Cegueira Divina", chance: 0.30, duracaoTurnos: 2 } } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Dano Sagrado adicional + (Carisma * 1.0). Duração 5 turnos. Ataques podem expurgar espíritos menores de alvos Malignos (dano massivo extra ou efeito de controle).", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_arma", duracaoTurnos: 5, tipoDanoAdicional: "Sagrado", formulaDanoAdicional: "(carisma*1.0)", multiplicadorCondicional: { tiposAlvo: ["Maligno", "MortoVivo", "Impuro"], multiplicador: 2.5, efeitoExpurgar: { chance: 0.15, efeitoDesc: "Dano massivo ou banimento temporário de invocações menores" } } } }
    ]
},
// --- FIM DOS FEITIÇOS DE CLÉRIGO DA ORDEM ---

// --- FEITIÇOS DE CLASSE: ANDARILHO RÚNICO ---
"classe_andarilho_runico_runa_da_lamina": {
    id: "classe_andarilho_runico_runa_da_lamina",
    nome: "Runa da Lâmina",
    origemTipo: "classe", origemNome: "Andarilho Rúnico",
    tipo: "buff_arma_encantamento",
    descricao: "Inscreve uma runa em uma arma, imbuindo-a temporariamente com energia mágica que causa dano elemental adicional.",
    cooldownSegundos: 10, // Cooldown para reencantar ou mudar o elemento
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_andarilho_runico_selo_do_caos", aoAtingirNivel: 5 } ],
    niveis: [
        // O Andarilho pode escolher o tipo de dano elemental da runa.
        { nivel: 1, custoPM: 12, efeitoDesc: "Arma causa + (Intelecto * 0.4) de dano do tipo elemental escolhido (Fogo, Gelo, Trovão) por 3 turnos.", efeitoDetalhes: { alvo: "arma_propria_ou_aliado", permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão"], tipoBuff: "dano_adicional_elemental_arma", formulaDanoAdicional: "(intelecto*0.4)", duracaoTurnos: 3 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 14, efeitoDesc: "Dano elemental + (Intelecto * 0.5). Duração 3 turnos.", efeitoDetalhes: { alvo: "arma_propria_ou_aliado", permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão"], tipoBuff: "dano_adicional_elemental_arma", formulaDanoAdicional: "(intelecto*0.5)", duracaoTurnos: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 16, efeitoDesc: "Dano elemental + (Intelecto * 0.6). Duração 4 turnos. Adiciona elemento Terra e Ácido às escolhas.", efeitoDetalhes: { alvo: "arma_propria_ou_aliado", permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão", "Terra", "Acido"], tipoBuff: "dano_adicional_elemental_arma", formulaDanoAdicional: "(intelecto*0.6)", duracaoTurnos: 4 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 18, efeitoDesc: "Dano elemental + (Intelecto * 0.7). Duração 4 turnos. Pequena chance de aplicar efeito secundário do elemento (queimadura, lentidão, etc.).", efeitoDetalhes: { alvo: "arma_propria_ou_aliado", permiteEscolhaElemento: ["Fogo", "Gelo", "Trovão", "Terra", "Acido"], tipoBuff: "dano_adicional_elemental_arma_com_efeito", formulaDanoAdicional: "(intelecto*0.7)", duracaoTurnos: 4, chanceEfeitoSecundario: 0.15 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 20, efeitoDesc: "Dano elemental + (Intelecto * 0.9). Duração 5 turnos. Chance de efeito secundário elemental aumentada. Pode imbuir duas runas elementais diferentes com efeitos reduzidos.", efeitoDetalhes: { alvo: "arma_propria_ou_aliado", permiteEscolhaElementoAvancada: true, tipoBuff: "dano_adicional_elemental_arma_com_efeito_duplo", formulaDanoAdicional: "(intelecto*0.9)", duracaoTurnos: 5, chanceEfeitoSecundario: 0.25, permiteDuasRunas: true } }
    ]
},
"classe_andarilho_runico_runa_de_repulsao": {
    id: "classe_andarilho_runico_runa_de_repulsao",
    nome: "Runa de Repulsão",
    origemTipo: "classe", origemNome: "Andarilho Rúnico",
    tipo: "controle_area_empurrar",
    descricao: "Ativa uma runa inscrita no chão ou no próprio Andarilho que libera uma onda de força rúnica, empurrando inimigos próximos.",
    cooldownSegundos: 20,
    maxNivel: 5,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [ { idFeitico: "classe_andarilho_runico_runa_do_tempo", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Empurra inimigos em raio de 2m para 1m de distância.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetrosEfeito: 2, empurraoMetros: 1 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 12, efeitoDesc: "Empurra inimigos em raio de 2.5m para 1.5m. Causa dano leve (Intelecto * 0.3) de Força.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetrosEfeito: 2.5, empurraoMetros: 1.5, tipoDano: "Forca", formulaDano: "(intelecto*0.3)" }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 14, efeitoDesc: "Empurra inimigos em raio de 3m para 2m. Dano (Intelecto * 0.4). Pode atordoar brevemente (0.5s).", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetrosEfeito: 3, empurraoMetros: 2, tipoDano: "Forca", formulaDano: "(intelecto*0.4)", condicao: { nome: "AtordoamentoRunico", chance: 0.20, duracaoSegundos: 0.5 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 16, efeitoDesc: "Empurra inimigos em raio de 3.5m para 2.5m. Dano (Intelecto * 0.5). Chance de atordoar aumentada.", efeitoDetalhes: { alvo: "area_adjacente_inimigos", raioMetrosEfeito: 3.5, empurraoMetros: 2.5, tipoDano: "Forca", formulaDano: "(intelecto*0.5)", condicao: { nome: "AtordoamentoRunico", chance: 0.30, duracaoSegundos: 0.7 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 18, efeitoDesc: "Empurra inimigos em raio de 4m para 3m. Dano (Intelecto * 0.6). Atordoamento garantido por 1s se colidirem. A runa pode ser deixada no chão como uma armadilha de repulsão.", efeitoDetalhes: { alvo: "area_adjacente_inimigos_ou_armadilha", raioMetrosEfeito: 4, empurraoMetros: 3, tipoDano: "Forca", formulaDano: "(intelecto*0.6)", condicaoColisao: { nome: "AtordoamentoImpactoRunico", duracaoSegundos: 1 }, podeSerArmadilha: true } }
    ]
},
"classe_andarilho_runico_selo_do_caos": {
    id: "classe_andarilho_runico_selo_do_caos",
    nome: "Selo do Caos",
    origemTipo: "classe", origemNome: "Andarilho Rúnico",
    tipo: "ataque_area_armadilha_magica",
    descricao: "Inscreve um selo rúnico instável no solo que explode com energia caótica quando um inimigo se aproxima ou pisa nele.",
    cooldownSegundos: 40, // Cooldown para colocar um novo selo
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_andarilho_runico_runa_da_lamina", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Selo explode causando (Intelecto * 1.5) de dano Mágico (elemento aleatório leve) em raio de 1.5m. Máximo 1 selo ativo.", efeitoDetalhes: { tipoArmadilha: "gatilho_proximidade", raioExplosaoMetros: 1.5, formulaDano: "(intelecto*1.5)", tipoDano: "MagicoAleatorio", maximoAtivas: 1 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Dano (Intelecto * 1.7). Raio 2m. Máximo 1 selo.", efeitoDetalhes: { tipoArmadilha: "gatilho_proximidade", raioExplosaoMetros: 2, formulaDano: "(intelecto*1.7)", tipoDano: "MagicoAleatorio", maximoAtivas: 1 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Dano (Intelecto * 1.9). Raio 2.5m. Pode aplicar um debuff elemental menor aleatório (queimadura, lentidão). Máximo 2 selos ativos.", efeitoDetalhes: { tipoArmadilha: "gatilho_proximidade_com_debuff", raioExplosaoMetros: 2.5, formulaDano: "(intelecto*1.9)", tipoDano: "MagicoAleatorioComDebuff", maximoAtivas: 2 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Dano (Intelecto * 2.2). Raio 3m. Debuff elemental mais provável. Máximo 2 selos.", efeitoDetalhes: { tipoArmadilha: "gatilho_proximidade_com_debuff", raioExplosaoMetros: 3, formulaDano: "(intelecto*2.2)", tipoDano: "MagicoAleatorioComDebuff", chanceDebuff: 0.5, maximoAtivas: 2 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Dano (Intelecto * 2.5). Raio 3.5m. Debuff elemental garantido. O selo pode ser configurado para detonar com um comando ou após um tempo. Máximo 3 selos ativos.", efeitoDetalhes: { tipoArmadilha: "gatilho_proximidade_ou_comando_com_debuff", raioExplosaoMetros: 3.5, formulaDano: "(intelecto*2.5)", tipoDano: "MagicoAleatorioComDebuffGarantido", maximoAtivas: 3, permiteDetonacaoManual: true } }
    ]
},
"classe_andarilho_runico_runa_do_tempo": {
    id: "classe_andarilho_runico_runa_do_tempo",
    nome: "Runa do Tempo",
    origemTipo: "classe", origemNome: "Andarilho Rúnico",
    tipo: "controle_tempo_area_utilidade",
    descricao: "Inscreve uma runa complexa que distorce o fluxo do tempo em uma pequena área, podendo acelerar aliados ou retardar inimigos.",
    cooldownSegundos: 120,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_andarilho_runico_runa_de_repulsao", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 40, efeitoDesc: "Cria uma zona (raio 3m) por 2 turnos. Escolha: Inimigos na zona têm velocidade de ação -15% OU Aliados na zona +15%.", efeitoDetalhes: { tipoEfeito: "distorcao_temporal_escolha", raioMetros: 3, duracaoTurnos: 2, percentualModVelocidade: 0.15 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 43, efeitoDesc: "Raio 3.5m, duração 2 turnos. Modificador de velocidade +/-20%.", efeitoDetalhes: { tipoEfeito: "distorcao_temporal_escolha", raioMetros: 3.5, duracaoTurnos: 2, percentualModVelocidade: 0.20 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 46, efeitoDesc: "Raio 4m, duração 3 turnos. Modificador de velocidade +/-25%. Pode afetar cooldowns de habilidades (levemente).", efeitoDetalhes: { tipoEfeito: "distorcao_temporal_escolha_avancada", raioMetros: 4, duracaoTurnos: 3, percentualModVelocidade: 0.25, afetaCooldownsLeve: true }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 49, efeitoDesc: "Raio 4.5m, duração 3 turnos. Modificador de velocidade +/-30%. Afeta cooldowns moderadamente.", efeitoDetalhes: { tipoEfeito: "distorcao_temporal_escolha_avancada", raioMetros: 4.5, duracaoTurnos: 3, percentualModVelocidade: 0.30, afetaCooldownsModerado: true }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 52, efeitoDesc: "Raio 5m, duração 4 turnos. Modificador de velocidade +/-35%. Afeta cooldowns significativamente. O Andarilho pode optar por parar brevemente o tempo para um único alvo na zona por 1 segundo (ação de alto custo).", efeitoDetalhes: { tipoEfeito: "distorcao_temporal_mestre", raioMetros: 5, duracaoTurnos: 4, percentualModVelocidade: 0.35, afetaCooldownsSignificativo: true, opcaoPararTempoAlvoUnico: { duracaoSegundos: 1, custoAdicionalPM: 30 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE ANDARILHO RÚNICO ---

// --- FEITIÇOS DE CLASSE: ESPADACHIM ETÉREO ---
"classe_espadachim_etereo_passo_nebuloso": {
    id: "classe_espadachim_etereo_passo_nebuloso",
    nome: "Passo Nebuloso",
    origemTipo: "classe", origemNome: "Espadachim Etéreo",
    tipo: "mobilidade_utilidade",
    descricao: "Permite ao Espadachim Etéreo teleportar-se instantaneamente uma curta distância, envolto em uma névoa etérea.",
    cooldownSegundos: 15,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_espadachim_etereo_danca_das_sombras", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Teleporta até 5 metros. Deixa um breve rastro de névoa.", efeitoDetalhes: { tipoMovimento: "teleporte", distanciaMetros: 5, efeitoVisual: "rastro_nevoa" }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Teleporta até 6 metros. A névoa agora confunde levemente inimigos próximos ao ponto de partida por 1 segundo.", efeitoDetalhes: { tipoMovimento: "teleporte", distanciaMetros: 6, efeitoVisual: "rastro_nevoa_confusao", debuffBreve: { nome: "Desorientação Nebulosa", duracaoSegundos: 1, chance: 0.3 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 8, efeitoDesc: "Teleporta até 7 metros. O próximo ataque corpo-a-corpo em 3 segundos causa + (Agilidade * 0.3) de dano Etéreo.", efeitoDetalhes: { tipoMovimento: "teleporte_ofensivo", distanciaMetros: 7, buffProximoAtaque: { tipoDano: "Etereo", formulaDanoAdicional: "(agilidade*0.3)", duracaoSegundosBuff: 3 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 7, efeitoDesc: "Teleporta até 8 metros. Buff de dano etéreo aumentado para + (Agilidade * 0.4). Pode ser usado para atravessar obstáculos finos.", efeitoDetalhes: { tipoMovimento: "teleporte_ofensivo_melhorado", distanciaMetros: 8, atravessaObstaculosFinos: true, buffProximoAtaque: { tipoDano: "Etereo", formulaDanoAdicional: "(agilidade*0.4)", duracaoSegundosBuff: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 6, efeitoDesc: "Teleporta até 10 metros. Buff de dano etéreo + (Agilidade * 0.5). Ao chegar, o Espadachim ganha +20% de Esquiva por 2 segundos e pode realizar um segundo Passo Nebuloso com 50% do custo de PM em até 3 segundos.", efeitoDetalhes: { tipoMovimento: "teleporte_mestre", distanciaMetros: 10, atravessaObstaculosFinos: true, buffProximoAtaque: { tipoDano: "Etereo", formulaDanoAdicional: "(agilidade*0.5)", duracaoSegundosBuff: 3 }, buffPessoalChegada: { atributo: "esquivaPercent", valor: 0.20, duracaoSegundos: 2 }, permiteReconjuracaoRapida: { chance: 1.0, custoPercentReduzido: 0.50, janelaSegundos: 3 } } }
    ]
},
"classe_espadachim_etereo_lamina_arcana": {
    id: "classe_espadachim_etereo_lamina_arcana",
    nome: "Lâmina Arcana",
    origemTipo: "classe", origemNome: "Espadachim Etéreo",
    tipo: "ataque_magico_fisico_unico", // Ataque que mistura dano físico com mágico
    descricao: "O Espadachim imbui sua lâmina com energia etérea, permitindo que seu próximo golpe cause dano mágico adicional e possa atravessar armaduras leves.",
    cooldownSegundos: 6,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_espadachim_etereo_golpe_etereo", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 8, efeitoDesc: "Próximo ataque com arma causa + (Intelecto * 0.8) de dano Etéreo. Ignora 5 pontos de armadura.", efeitoDetalhes: { tipoBuffAtaque: "dano_adicional_arma", tipoDanoAdicional: "Etereo", formulaDanoAdicional: "(intelecto*0.8)", penetracaoArmaduraFixa: 5, numeroAtaquesBuffados: 1 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Dano Etéreo + (Intelecto * 1.0). Ignora 7 pontos de armadura.", efeitoDetalhes: { tipoBuffAtaque: "dano_adicional_arma", tipoDanoAdicional: "Etereo", formulaDanoAdicional: "(intelecto*1.0)", penetracaoArmaduraFixa: 7, numeroAtaquesBuffados: 1 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Dano Etéreo + (Intelecto * 1.2). Ignora 10 pontos de armadura. O golpe também reduz a Resistência Mágica do alvo em 5% por 2 turnos.", efeitoDetalhes: { tipoBuffAtaque: "dano_adicional_arma_debuff", tipoDanoAdicional: "Etereo", formulaDanoAdicional: "(intelecto*1.2)", penetracaoArmaduraFixa: 10, numeroAtaquesBuffados: 1, debuffAlvo: { atributo: "resistenciaMagica", modificador: "percentual_negativo_multiplicativo", valor: 0.05, duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Dano Etéreo + (Intelecto * 1.4). Ignora 12 pontos de armadura. Redução de Resistência Mágica de 10%.", efeitoDetalhes: { tipoBuffAtaque: "dano_adicional_arma_debuff", tipoDanoAdicional: "Etereo", formulaDanoAdicional: "(intelecto*1.4)", penetracaoArmaduraFixa: 12, numeroAtaquesBuffados: 1, debuffAlvo: { atributo: "resistenciaMagica", modificador: "percentual_negativo_multiplicativo", valor: 0.10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Dano Etéreo + (Intelecto * 1.7). Ignora 15 pontos de armadura. Redução de Resistência Mágica de 15% por 3 turnos. O golpe pode se tornar um projétil de lâmina etérea com alcance de 5m se o alvo estiver distante.", efeitoDetalhes: { tipoBuffAtaque: "dano_adicional_arma_debuff_versatil", tipoDanoAdicional: "Etereo", formulaDanoAdicional: "(intelecto*1.7)", penetracaoArmaduraFixa: 15, numeroAtaquesBuffados: 1, debuffAlvo: { atributo: "resistenciaMagica", modificador: "percentual_negativo_multiplicativo", valor: 0.15, duracaoTurnos: 3 }, modoDistancia: { alcanceMetros: 5 } } }
    ]
},
"classe_espadachim_etereo_danca_das_sombras": {
    id: "classe_espadachim_etereo_danca_das_sombras",
    nome: "Dança das Sombras",
    origemTipo: "classe", origemNome: "Espadachim Etéreo",
    tipo: "buff_pessoal_ofensivo_defensivo_combo",
    descricao: "O Espadachim move-se com velocidade sobrenatural, realizando uma sequência de ataques rápidos enquanto tem chance de esquivar automaticamente de golpes inimigos.",
    cooldownSegundos: 75,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_espadachim_etereo_passo_nebuloso", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // Esta habilidade pode ser um buff que dura X turnos, e durante esses turnos, os ataques do Espadachim são mais rápidos ou ele ganha ataques extras, e sua esquiva aumenta.
        { nivel: 1, custoPM: 25, efeitoDesc: "Por 2 turnos, ganha +15% de Agilidade e +10% de Chance de Esquiva. Realiza 1 ataque extra por turno com 50% do dano normal.", efeitoDetalhes: { tipoBuff: "estado_combate", duracaoTurnos: 2, buffs: [{ atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.15 }, { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.10 }], efeitoAtaqueExtra: { quantidade: 1, percentualDanoNormal: 0.50 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Duração 2 turnos. +18% Agi, +12% Esquiva. 1 ataque extra com 60% dano.", efeitoDetalhes: { tipoBuff: "estado_combate", duracaoTurnos: 2, buffs: [{ atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.18 }, { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.12 }], efeitoAtaqueExtra: { quantidade: 1, percentualDanoNormal: 0.60 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Duração 3 turnos. +22% Agi, +15% Esquiva. 1 ataque extra com 70% dano. Ataques durante a dança podem aplicar 'Marca Etérea' (próximo golpe de Lâmina Arcana causa +dano).", efeitoDetalhes: { tipoBuff: "estado_combate_aprimorado", duracaoTurnos: 3, buffs: [{ atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.22 }, { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.15 }], efeitoAtaqueExtra: { quantidade: 1, percentualDanoNormal: 0.70, aplicaDebuff: { nome: "Marca Etérea", chance: 0.3, duracaoTurnos: 0, efeitoDesc: "Amplifica Lâmina Arcana" } } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Duração 3 turnos. +26% Agi, +18% Esquiva. 2 ataques extras com 50% dano cada. Chance de Marca Etérea aumentada.", efeitoDetalhes: { tipoBuff: "estado_combate_aprimorado", duracaoTurnos: 3, buffs: [{ atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.26 }, { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.18 }], efeitoAtaqueExtra: { quantidade: 2, percentualDanoNormal: 0.50, aplicaDebuff: { nome: "Marca Etérea", chance: 0.4, duracaoTurnos: 0, efeitoDesc: "Amplifica Lâmina Arcana" } } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Duração 4 turnos. +30% Agi, +22% Esquiva. 2 ataques extras com 60% dano cada. Marca Etérea garantida. Esquivas bem-sucedidas durante a dança podem gerar uma imagem ilusória breve.", efeitoDetalhes: { tipoBuff: "estado_combate_mestre", duracaoTurnos: 4, buffs: [{ atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.30 }, { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.22 }], efeitoAtaqueExtra: { quantidade: 2, percentualDanoNormal: 0.60, aplicaDebuff: { nome: "Marca Etérea", chance: 1.0, duracaoTurnos: 0, efeitoDesc: "Amplifica Lâmina Arcana" } }, efeitoEsquivaAprimorada: { criaImagemIlusoria: true, duracaoImagemSegundos: 1 } } }
    ]
},
"classe_espadachim_etereo_golpe_etereo": {
    id: "classe_espadachim_etereo_golpe_etereo",
    nome: "Golpe Etéreo",
    origemTipo: "classe", origemNome: "Espadachim Etéreo",
    tipo: "ataque_fisico_magico_unico_finalizador",
    descricao: "Um único e devastador corte que atravessa as defesas do alvo, infundido com pura energia etérea, deixando o inimigo vulnerável a ataques subsequentes.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_espadachim_etereo_lamina_arcana", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Causa (Agilidade * 1.5 + Intelecto * 1.0) de dano misto (Físico/Etéreo). Ignora 25% da armadura total do alvo. Alvo fica 'Vulnerável' (+10% de todo dano recebido) por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "MistoFisicoEtereo", formulaDano: "(agilidade*1.5)+(intelecto*1.0)", penetracaoArmaduraPercentTotal: 0.25, debuff: { nome: "Vulnerabilidade Etérea", efeitoDesc: "+10% todo dano recebido", duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Dano (Agilidade * 1.7 + Intelecto * 1.2). Ignora 30% armadura. Vulnerabilidade +12% por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "MistoFisicoEtereo", formulaDano: "(agilidade*1.7)+(intelecto*1.2)", penetracaoArmaduraPercentTotal: 0.30, debuff: { nome: "Vulnerabilidade Etérea", efeitoDesc: "+12% todo dano recebido", duracaoTurnos: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Dano (Agilidade * 1.9 + Intelecto * 1.4). Ignora 35% armadura. Vulnerabilidade +15% por 3 turnos. Se o alvo estiver com menos de 25% de PV, o dano é crítico.", efeitoDetalhes: { alvo: "unico", tipoDano: "MistoFisicoEtereo", formulaDano: "(agilidade*1.9)+(intelecto*1.4)", penetracaoArmaduraPercentTotal: 0.35, debuff: { nome: "Vulnerabilidade Etérea Grave", efeitoDesc: "+15% todo dano recebido", duracaoTurnos: 3 }, condicaoCritico: "pvAlvoPercent < 0.25" }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Dano (Agilidade * 2.1 + Intelecto * 1.6). Ignora 40% armadura. Vulnerabilidade +18% por 3 turnos. Dano crítico se PV < 30%.", efeitoDetalhes: { alvo: "unico", tipoDano: "MistoFisicoEtereo", formulaDano: "(agilidade*2.1)+(intelecto*1.6)", penetracaoArmaduraPercentTotal: 0.40, debuff: { nome: "Vulnerabilidade Etérea Grave", efeitoDesc: "+18% todo dano recebido", duracaoTurnos: 3 }, condicaoCritico: "pvAlvoPercent < 0.30" }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 42, efeitoDesc: "Dano (Agilidade * 2.4 + Intelecto * 1.9). Ignora 50% armadura. Vulnerabilidade +20% por 4 turnos. Dano crítico se PV < 35%. Se o golpe for fatal, o Espadachim recupera parte do PM e o cooldown é reduzido pela metade.", efeitoDetalhes: { alvo: "unico", tipoDano: "MistoFisicoEtereo", formulaDano: "(agilidade*2.4)+(intelecto*1.9)", penetracaoArmaduraPercentTotal: 0.50, debuff: { nome: "Marca da Ruptura Etérea", efeitoDesc: "+20% todo dano recebido", duracaoTurnos: 4 }, condicaoCritico: "pvAlvoPercent < 0.35", efeitoAoMatar: { recuperaPMPercent: 0.30, reduzCooldownPercent: 0.50 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE ESPADACHIM ETÉREO ---

// --- FEITIÇOS DE CLASSE: INVASOR DRACÔNICO ---
"classe_invasor_draconico_sopro_draconico": {
    id: "classe_invasor_draconico_sopro_draconico",
    nome: "Sopro Dracônico",
    origemTipo: "classe", origemNome: "Invasor Dracônico",
    tipo: "ataque_magico_area_cone",
    descricao: "Exala uma rajada de energia elemental (Fogo ou Gelo, conforme linhagem escolhida na criação ou definida) em um cone à frente, causando dano aos inimigos atingidos.",
    cooldownSegundos: 12,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_invasor_draconico_despertar_da_escama", aoAtingirNivel: 5 } ],
    niveis: [
        // Assumindo que o tipo de sopro (Fogo/Gelo) é uma escolha do jogador ou fixo.
        // O tipo de dano e efeito secundário mudariam com base nisso. Exemplo com Fogo:
        { nivel: 1, custoPM: 15, efeitoDesc: "Sopro de Fogo causa (Forca * 0.8 + Intelecto * 0.4) de dano de Fogo em cone (5m).", efeitoDetalhes: { alvo: "cone", alcanceMetros: 5, tipoDano: "Fogo", formulaDano: "(forca*0.8)+(intelecto*0.4)" }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Dano (Forca * 0.9 + Intelecto * 0.5). Alcance 6m. Chance de aplicar Queimadura leve.", efeitoDetalhes: { alvo: "cone", alcanceMetros: 6, tipoDano: "Fogo", formulaDano: "(forca*0.9)+(intelecto*0.5)", condicao: { nome: "QueimaduraLeve", chance: 0.25, duracaoTurnos: 2, formulaDanoPorTurno: "(intelecto*0.1)"} }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Dano (Forca * 1.0 + Intelecto * 0.6). Alcance 7m. Queimadura mais forte.", efeitoDetalhes: { alvo: "cone", alcanceMetros: 7, tipoDano: "Fogo", formulaDano: "(forca*1.0)+(intelecto*0.6)", condicao: { nome: "Queimadura", chance: 0.35, duracaoTurnos: 3, formulaDanoPorTurno: "(intelecto*0.15)"} }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Dano (Forca * 1.1 + Intelecto * 0.7). Alcance 8m. Queimadura mais duradoura e pode deixar terreno em chamas.", efeitoDetalhes: { alvo: "cone", alcanceMetros: 8, tipoDano: "Fogo", formulaDano: "(forca*1.1)+(intelecto*0.7)", condicao: { nome: "QueimaduraIntensa", chance: 0.45, duracaoTurnos: 3, formulaDanoPorTurno: "(intelecto*0.2)"}, efeitoTerreno: "chamas_leves" }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Dano (Forca * 1.3 + Intelecto * 0.8). Alcance 10m. Queimadura severa. O sopro é mais largo e pode empurrar inimigos leves.", efeitoDetalhes: { alvo: "cone_largo", alcanceMetros: 10, tipoDano: "Fogo", formulaDano: "(forca*1.3)+(intelecto*0.8)", condicao: { nome: "Inferno", chance: 0.60, duracaoTurnos: 3, formulaDanoPorTurno: "(intelecto*0.25)"}, efeitoTerreno: "chamas_intensas", empurraoLeve: true } }
    ]
},
"classe_invasor_draconico_garras_ancestrais": {
    id: "classe_invasor_draconico_garras_ancestrais",
    nome: "Garras Ancestrais",
    origemTipo: "classe", origemNome: "Invasor Dracônico",
    tipo: "buff_pessoal_ataque_fisico",
    descricao: "O Invasor canaliza o poder de seus ancestrais dracônicos, manifestando garras etéreas ou endurecendo as suas, aumentando seu dano físico temporariamente.",
    cooldownSegundos: 20,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_invasor_draconico_ira_do_dragao_antigo", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 10, efeitoDesc: "Ataques corpo-a-corpo causam + (Forca * 0.2) de dano Físico adicional por 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_cac", formulaValor: "(forca*0.2)", duracaoTurnos: 3 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 11, efeitoDesc: "Dano adicional + (Forca * 0.25) por 3 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_cac", formulaValor: "(forca*0.25)", duracaoTurnos: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 12, efeitoDesc: "Dano adicional + (Forca * 0.3) por 4 turnos. Ataques podem causar Sangramento leve.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_cac_com_efeito", formulaValor: "(forca*0.3)", duracaoTurnos: 4, condicaoAtaque: { nome: "SangramentoDraconico", chance: 0.20, duracaoTurnos: 2, formulaDanoPorTurno: "(forca*0.1)" } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 13, efeitoDesc: "Dano adicional + (Forca * 0.35) por 4 turnos. Chance de Sangramento aumentada.", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_cac_com_efeito", formulaValor: "(forca*0.35)", duracaoTurnos: 4, condicaoAtaque: { nome: "SangramentoDraconico", chance: 0.30, duracaoTurnos: 3, formulaDanoPorTurno: "(forca*0.15)" } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 14, efeitoDesc: "Dano adicional + (Forca * 0.45) por 5 turnos. Sangramento mais potente. Os ataques também reduzem a armadura do alvo em 5% por golpe (acumula até 3x).", efeitoDetalhes: { alvo: "self", tipoBuff: "dano_adicional_cac_debuff_cumulativo", formulaValor: "(forca*0.45)", duracaoTurnos: 5, condicaoAtaque: { nome: "SangramentoDraconicoGrave", chance: 0.40, duracaoTurnos: 3, formulaDanoPorTurno: "(forca*0.2)" }, debuffCumulativoPorGolpe: { atributo: "defesaBase", modificador: "percentual_negativo_multiplicativo", valor: 0.05, maxAcumulos: 3, duracaoDebuffTurnos: 3 } } }
    ]
},
"classe_invasor_draconico_despertar_da_escama": {
    id: "classe_invasor_draconico_despertar_da_escama",
    nome: "Despertar da Escama",
    origemTipo: "classe", origemNome: "Invasor Dracônico",
    tipo: "buff_pessoal_defesa_resistencias",
    descricao: "O Invasor manifesta escamas dracônicas em sua pele, ganhando grande resistência mágica e armadura física por um tempo limitado.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_invasor_draconico_sopro_draconico", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Ganha + (Vitalidade * 0.5) de Defesa Base e +15% de Resistência Mágica por 3 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*0.5)"}, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.15 }], duracaoTurnos: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 27, efeitoDesc: "+ (Vitalidade * 0.6) Defesa Base, +20% Resist. Mágica. Duração 3 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*0.6)"}, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.20 }], duracaoTurnos: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 29, efeitoDesc: "+ (Vitalidade * 0.7) Defesa Base, +25% Resist. Mágica, +5% Resistência a Dano Físico. Duração 4 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*0.7)"}, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.25 }, { atributo: "reducaoDanoFisico", modificador: "percentual_aditivo", valor: 0.05 }], duracaoTurnos: 4 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 31, efeitoDesc: "+ (Vitalidade * 0.8) Defesa Base, +30% Resist. Mágica, +10% Resist. Dano Físico. Duração 4 turnos.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*0.8)"}, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.30 }, { atributo: "reducaoDanoFisico", modificador: "percentual_aditivo", valor: 0.10 }], duracaoTurnos: 4 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 33, efeitoDesc: "+ (Vitalidade * 1.0) Defesa Base, +35% Resist. Mágica, +15% Resist. Dano Físico. Duração 5 turnos. Enquanto ativo, reflete 10% do dano mágico recebido de volta ao conjurador.", efeitoDetalhes: { alvo: "self", buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.0)"}, { atributo: "resistenciaMagica", modificador: "percentual_aditivo", valor: 0.35 }, { atributo: "reducaoDanoFisico", modificador: "percentual_aditivo", valor: 0.15 }], duracaoTurnos: 5, efeitoReflexaoDanoMagicoPercent: 0.10 } }
    ]
},
"classe_invasor_draconico_ira_do_dragao_antigo": {
    id: "classe_invasor_draconico_ira_do_dragao_antigo",
    nome: "Ira do Dragão Antigo",
    origemTipo: "classe", origemNome: "Invasor Dracônico",
    tipo: "ataque_area_manifestacao_espiritual",
    descricao: "O Invasor canaliza a fúria de um espírito dracônico ancestral, que se manifesta brevemente e golpeia todos os inimigos ao redor com poder devastador.",
    cooldownSegundos: 150, // Cooldown alto para um "ultimate"
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_invasor_draconico_garras_ancestrais", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 50, efeitoDesc: "Espírito dracônico causa (Forca * 1.5 + Intelecto * 1.0) de dano do tipo elemental da linhagem em raio de 5m.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 5, tipoDano: "ElementalLinhagem", formulaDano: "(forca*1.5)+(intelecto*1.0)" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 55, efeitoDesc: "Dano (Forca * 1.7 + Intelecto * 1.2). Raio 6m. Inimigos atingidos podem ser derrubados.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 6, tipoDano: "ElementalLinhagem", formulaDano: "(forca*1.7)+(intelecto*1.2)", condicao: { nome: "Derrubado", chance: 0.30, duracaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 60, efeitoDesc: "Dano (Forca * 1.9 + Intelecto * 1.4). Raio 7m. Chance de derrubar aumentada. Deixa terreno elemental perigoso por 2 turnos.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 7, tipoDano: "ElementalLinhagem", formulaDano: "(forca*1.9)+(intelecto*1.4)", condicao: { nome: "Derrubado", chance: 0.40, duracaoTurnos: 1 }, efeitoTerrenoElemental: { duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 65, efeitoDesc: "Dano (Forca * 2.1 + Intelecto * 1.6). Raio 8m. Chance de derrubar e Amedrontar inimigos.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 8, tipoDano: "ElementalLinhagem", formulaDano: "(forca*2.1)+(intelecto*1.6)", condicoes: [{ nome: "Derrubado", chance: 0.50, duracaoTurnos: 1 }, { nome: "AmedrontadoPeloDragao", chance: 0.30, duracaoTurnos: 2 }] , efeitoTerrenoElemental: { duracaoTurnos: 3 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 70, efeitoDesc: "Dano (Forca * 2.4 + Intelecto * 1.9). Raio 10m. Derrubada e Amedrontamento mais potentes. O espírito permanece por 1 turno adicional, atacando inimigos aleatórios com versões mais fracas do sopro.", efeitoDetalhes: { alvo: "area_inimigos_com_permanencia", raioMetros: 10, tipoDano: "ElementalLinhagem", formulaDano: "(forca*2.4)+(intelecto*1.9)", condicoes: [{ nome: "DerrubadoForte", chance: 0.60, duracaoTurnos: 1 }, { nome: "TerrorDraconico", chance: 0.40, duracaoTurnos: 2 }] , efeitoTerrenoElemental: { duracaoTurnos: 3 }, espiritoPermanente: { duracaoTurnos: 1, acao: "sopro_fraco_aleatorio" } } }
    ]
},
// --- FIM DOS FEITIÇOS DE INVASOR DRACÔNICO ---

// --- FEITIÇOS DE CLASSE: LÂMINA DA NÉVOA ---
"classe_lamina_da_nevoa_ataque_silencioso": {
    id: "classe_lamina_da_nevoa_ataque_silencioso",
    nome: "Ataque Silencioso",
    origemTipo: "classe", origemNome: "Lâmina da Névoa",
    tipo: "ataque_fisico_condicional_critico",
    descricao: "Um golpe preciso que causa dano crítico massivo se desferido pelas costas do alvo ou enquanto o Lâmina da Névoa está oculto/invisível.",
    cooldownSegundos: 10, // Cooldown se o bônus for ativado
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_lamina_da_nevoa_corte_fantasma", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 8, efeitoDesc: "Se atacar um alvo pelas costas ou estando invisível, o ataque causa +100% de dano (Crítico x2).", efeitoDetalhes: { tipoCondicao: ["ataque_costas", "ataque_invisivel"], bonusCriticoMultiplicador: 2.0 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 9, efeitoDesc: "Bônus de dano crítico aumentado para +125% (Crítico x2.25).", efeitoDetalhes: { tipoCondicao: ["ataque_costas", "ataque_invisivel"], bonusCriticoMultiplicador: 2.25 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 10, efeitoDesc: "Bônus de dano crítico +150% (Crítico x2.5). Adiciona um pequeno bônus de penetração de armadura (10%) ao ataque.", efeitoDetalhes: { tipoCondicao: ["ataque_costas", "ataque_invisivel"], bonusCriticoMultiplicador: 2.5, penetracaoArmaduraPercent: 0.10 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 11, efeitoDesc: "Bônus de dano crítico +175% (Crítico x2.75). Penetração de armadura aumentada para 15%.", efeitoDetalhes: { tipoCondicao: ["ataque_costas", "ataque_invisivel"], bonusCriticoMultiplicador: 2.75, penetracaoArmaduraPercent: 0.15 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 12, efeitoDesc: "Bônus de dano crítico +200% (Crítico x3). Penetração de armadura 20%. Se o Ataque Silencioso for fatal, o Lâmina da Névoa pode entrar em Furtividade Aprimorada por 1 turno.", efeitoDetalhes: { tipoCondicao: ["ataque_costas", "ataque_invisivel"], bonusCriticoMultiplicador: 3.0, penetracaoArmaduraPercent: 0.20, efeitoAoMatar: { buffPessoal: { nome: "Furtividade da Viúva", duracaoTurnos: 1, efeitoDesc: "Invisibilidade e movimento silencioso aprimorados" } } } }
    ]
},
"classe_lamina_da_nevoa_ilusao_de_sombra": {
    id: "classe_lamina_da_nevoa_ilusao_de_sombra",
    nome: "Ilusão de Sombra",
    origemTipo: "classe", origemNome: "Lâmina da Névoa",
    tipo: "utilidade_engano_defesa",
    descricao: "Cria uma cópia ilusória e sombria do Lâmina da Névoa por alguns segundos para confundir os inimigos.",
    cooldownSegundos: 25,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_lamina_da_nevoa_nevoa_envenenada", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 12, efeitoDesc: "Cria 1 cópia ilusória que dura 2 segundos ou até ser atingida. Inimigos têm 30% de chance de atacar a cópia.", efeitoDetalhes: { tipoEfeito: "invocar_clone_ilusorio", quantidadeClones: 1, duracaoSegundosClone: 2, chanceEnganarInimigo: 0.30 }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 14, efeitoDesc: "1 cópia, dura 3 segundos. Chance de enganar 35%.", efeitoDetalhes: { tipoEfeito: "invocar_clone_ilusorio", quantidadeClones: 1, duracaoSegundosClone: 3, chanceEnganarInimigo: 0.35 }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 16, efeitoDesc: "Cria 2 cópias ilusórias, duram 3 segundos. Chance de enganar 40%. As cópias podem simular ataques básicos fracos.", efeitoDetalhes: { tipoEfeito: "invocar_clone_ilusorio_ataque_fraco", quantidadeClones: 2, duracaoSegundosClone: 3, chanceEnganarInimigo: 0.40, clonesAtacam: true, danoClonePercent: 0.1 }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 18, efeitoDesc: "2 cópias, duram 4 segundos. Chance de enganar 45%. Cópias simulam ataques.", efeitoDetalhes: { tipoEfeito: "invocar_clone_ilusorio_ataque_fraco", quantidadeClones: 2, duracaoSegundosClone: 4, chanceEnganarInimigo: 0.45, clonesAtacam: true, danoClonePercent: 0.15 }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 20, efeitoDesc: "Cria 3 cópias ilusórias, duram 5 segundos. Chance de enganar 50%. Cópias simulam ataques. Quando uma cópia é destruída, libera uma pequena névoa que pode cegar o atacante por 1 segundo.", efeitoDetalhes: { tipoEfeito: "invocar_clone_ilusorio_mestre", quantidadeClones: 3, duracaoSegundosClone: 5, chanceEnganarInimigo: 0.50, clonesAtacam: true, danoClonePercent: 0.20, efeitoAoDestruirClone: { condicao: { nome: "Cegueira Nebulosa", chance: 0.5, duracaoSegundos: 1 } } } }
    ]
},
"classe_lamina_da_nevoa_corte_fantasma": {
    id: "classe_lamina_da_nevoa_corte_fantasma",
    nome: "Corte Fantasma",
    origemTipo: "classe", origemNome: "Lâmina da Névoa",
    tipo: "ataque_fisico_magico_ignora_defesa",
    descricao: "Um golpe rápido e etéreo que parece atravessar defesas físicas e mágicas, atingindo o alvo diretamente.",
    cooldownSegundos: 40,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_lamina_da_nevoa_ataque_silencioso", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Causa (Agilidade * 1.0 + Intelecto * 0.6) de dano Etéreo. Ignora 20% da Defesa Física e 10% da Resistência Mágica do alvo.", efeitoDetalhes: { alvo: "unico", tipoDano: "EtereoPuro", formulaDano: "(agilidade*1.0)+(intelecto*0.6)", penetracaoDefesaFisicaPercent: 0.20, penetracaoResistenciaMagicaPercent: 0.10 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Dano (Agilidade * 1.1 + Intelecto * 0.7). Ignora 25% Def. Física, 15% Resist. Mágica.", efeitoDetalhes: { alvo: "unico", tipoDano: "EtereoPuro", formulaDano: "(agilidade*1.1)+(intelecto*0.7)", penetracaoDefesaFisicaPercent: 0.25, penetracaoResistenciaMagicaPercent: 0.15 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Dano (Agilidade * 1.2 + Intelecto * 0.8). Ignora 30% Def. Física, 20% Resist. Mágica. O golpe não pode ser bloqueado por escudos físicos.", efeitoDetalhes: { alvo: "unico", tipoDano: "EtereoPuro", formulaDano: "(agilidade*1.2)+(intelecto*0.8)", penetracaoDefesaFisicaPercent: 0.30, penetracaoResistenciaMagicaPercent: 0.20, ignoraBloqueioEscudo: true }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Dano (Agilidade * 1.3 + Intelecto * 0.9). Ignora 35% Def. Física, 25% Resist. Mágica. Não pode ser bloqueado nem aparado (parry).", efeitoDetalhes: { alvo: "unico", tipoDano: "EtereoPuro", formulaDano: "(agilidade*1.3)+(intelecto*0.9)", penetracaoDefesaFisicaPercent: 0.35, penetracaoResistenciaMagicaPercent: 0.25, ignoraBloqueioEscudo: true, ignoraAparar: true }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Dano (Agilidade * 1.5 + Intelecto * 1.1). Ignora 40% Def. Física, 30% Resist. Mágica. O golpe também silencia o alvo por 1 turno se for um conjurador.", efeitoDetalhes: { alvo: "unico", tipoDano: "EtereoPuro", formulaDano: "(agilidade*1.5)+(intelecto*1.1)", penetracaoDefesaFisicaPercent: 0.40, penetracaoResistenciaMagicaPercent: 0.30, ignoraBloqueioEscudo: true, ignoraAparar: true, condicaoAdicional: { nome: "Silêncio Fantasma", chanceSeConjurador: 0.75, duracaoTurnos: 1 } } }
    ]
},
"classe_lamina_da_nevoa_nevoa_envenenada": {
    id: "classe_lamina_da_nevoa_nevoa_envenenada",
    nome: "Névoa Envenenada",
    origemTipo: "classe", origemNome: "Lâmina da Névoa",
    tipo: "controle_area_dot_debuff_sentidos",
    descricao: "Cria uma área de névoa tóxica que causa dano de veneno mágico ao longo do tempo e afeta os sentidos dos inimigos dentro dela, reduzindo sua percepção e precisão.",
    cooldownSegundos: 60,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_lamina_da_nevoa_ilusao_de_sombra", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 28, efeitoDesc: "Cria névoa (raio 3m) por 2 turnos. Inimigos na névoa sofrem (Intelecto * 0.3) de dano de Veneno por turno e -10% de Acerto.", efeitoDetalhes: { tipoEfeito: "area_nevoa_toxica", raioMetros: 3, duracaoTurnos: 2, tipoDanoPorTurno: "VenenoMagico", formulaDanoPorTurno: "(intelecto*0.3)", debuff: { atributo: "chanceAcerto", modificador: "percentual_negativo_multiplicativo", valor: 0.10 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 31, efeitoDesc: "Raio 3.5m, dura 2 turnos. Dano (Intelecto * 0.4)/turno. Acerto -15%.", efeitoDetalhes: { tipoEfeito: "area_nevoa_toxica", raioMetros: 3.5, duracaoTurnos: 2, tipoDanoPorTurno: "VenenoMagico", formulaDanoPorTurno: "(intelecto*0.4)", debuff: { atributo: "chanceAcerto", modificador: "percentual_negativo_multiplicativo", valor: 0.15 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 34, efeitoDesc: "Raio 4m, dura 3 turnos. Dano (Intelecto * 0.5)/turno. Acerto -20%. Inimigos também têm sua Percepção (Carisma para detectar) reduzida.", efeitoDetalhes: { tipoEfeito: "area_nevoa_toxica_sensorial", raioMetros: 4, duracaoTurnos: 3, tipoDanoPorTurno: "VenenoMagico", formulaDanoPorTurno: "(intelecto*0.5)", debuffs: [{ atributo: "chanceAcerto", modificador: "percentual_negativo_multiplicativo", valor: 0.20 }, { atributo: "carisma", modificador: "fixo_negativo", valor: 10, nomeEfeito: "Sentidos Obscurecidos" }] }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 37, efeitoDesc: "Raio 4.5m, dura 3 turnos. Dano (Intelecto * 0.6)/turno. Acerto -25%. Redução de Percepção maior. Inimigos podem ficar Confusos brevemente.", efeitoDetalhes: { tipoEfeito: "area_nevoa_toxica_sensorial", raioMetros: 4.5, duracaoTurnos: 3, tipoDanoPorTurno: "VenenoMagico", formulaDanoPorTurno: "(intelecto*0.6)", debuffs: [{ atributo: "chanceAcerto", modificador: "percentual_negativo_multiplicativo", valor: 0.25 }, { atributo: "carisma", modificador: "fixo_negativo", valor: 15, nomeEfeito: "Sentidos Obscurecidos" }], condicao: { nome: "Confusão Tóxica", chance: 0.20, duracaoTurnos: 1 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 40, efeitoDesc: "Raio 5m, dura 4 turnos. Dano (Intelecto * 0.7)/turno. Acerto -30%. Redução de Percepção severa. Inimigos têm chance de serem Cegados pela névoa por 1-2 turnos.", efeitoDetalhes: { tipoEfeito: "area_nevoa_cegante_toxica", raioMetros: 5, duracaoTurnos: 4, tipoDanoPorTurno: "VenenoMagico", formulaDanoPorTurno: "(intelecto*0.7)", debuffs: [{ atributo: "chanceAcerto", modificador: "percentual_negativo_multiplicativo", valor: 0.30 }, { atributo: "carisma", modificador: "fixo_negativo", valor: 20, nomeEfeito: "Sentidos Devastados" }], condicao: { nome: "Cegueira Venenosa", chance: 0.30, duracaoTurnos: 2 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE LÂMINA DA NÉVOA ---

// --- FEITIÇOS DE CLASSE: CONJURADOR DO VAZIO ---
"classe_conjurador_do_vazio_fenda_sombria": {
    id: "classe_conjurador_do_vazio_fenda_sombria",
    nome: "Fenda Sombria",
    origemTipo: "classe", origemNome: "Conjurador do Vazio",
    tipo: "ataque_magico_unico_controle_posicionamento",
    descricao: "Abre um pequeno rasgo no tecido da realidade que emana energia do Vazio, causando dano sombrio e puxando o inimigo atingido em direção à fenda.",
    cooldownSegundos: 12,
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_conjurador_do_vazio_chamado_dos_vazios", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 14, efeitoDesc: "Causa (Intelecto * 1.0) de dano do Vazio e puxa o alvo 1 metro em direção ao conjurador.", efeitoDetalhes: { alvo: "unico", tipoDano: "Vazio", formulaDano: "(intelecto*1.0)", efeitoPuxar: { distanciaMetros: 1, direcao: "conjurador" } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 16, efeitoDesc: "Dano (Intelecto * 1.2). Puxa 1.5 metros.", efeitoDetalhes: { alvo: "unico", tipoDano: "Vazio", formulaDano: "(intelecto*1.2)", efeitoPuxar: { distanciaMetros: 1.5, direcao: "conjurador" } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 18, efeitoDesc: "Dano (Intelecto * 1.4). Puxa 2 metros. Alvos puxados sofrem lentidão de 20% por 1 turno.", efeitoDetalhes: { alvo: "unico", tipoDano: "Vazio", formulaDano: "(intelecto*1.4)", efeitoPuxar: { distanciaMetros: 2, direcao: "conjurador" }, debuff: { nome: "Agarre do Vazio", atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.20, duracaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 20, efeitoDesc: "Dano (Intelecto * 1.6). Puxa 2.5 metros. Lentidão de 30% por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "Vazio", formulaDano: "(intelecto*1.6)", efeitoPuxar: { distanciaMetros: 2.5, direcao: "conjurador" }, debuff: { nome: "Agarre do Vazio", atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.30, duracaoTurnos: 2 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 22, efeitoDesc: "Dano (Intelecto * 1.9). Puxa 3 metros. Lentidão de 40% por 2 turnos. Se o alvo for puxado através de outros inimigos, eles também sofrem metade do dano.", efeitoDetalhes: { alvo: "unico_com_efeito_linha_puxao", tipoDano: "Vazio", formulaDano: "(intelecto*1.9)", efeitoPuxar: { distanciaMetros: 3, direcao: "conjurador", danoColateralPercentAoAtravessar: 0.50 }, debuff: { nome: "Prisão do Vazio", atributo: "agilidade", modificador: "percentual_negativo_multiplicativo", valor: 0.40, duracaoTurnos: 2 } } }
    ]
},
"classe_conjurador_do_vazio_olho_do_abismo": {
    id: "classe_conjurador_do_vazio_olho_do_abismo",
    nome: "Olho do Abismo",
    origemTipo: "classe", origemNome: "Conjurador do Vazio",
    tipo: "utilidade_deteccao_debuff_passivo_ativo",
    descricao: "O Conjurador abre um olho etéreo que paira sobre si, revelando inimigos invisíveis e passivamente enfraquecendo as magias de inimigos próximos. Pode ser focado para um debuff mais potente.",
    cooldownSegundos: 60, // Cooldown para o foco ativo
    maxNivel: 5,
    requisitosParaAprender: [], // Feitiço inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_conjurador_do_vazio_ruina_interplanar", aoAtingirNivel: 5 } ],
    niveis: [
        // Efeito passivo: aura de enfraquecimento. Efeito ativo: focar em um alvo.
        { nivel: 1, custoPM: 15, efeitoDesc: "Passivo: Inimigos em raio de 5m têm seus feitiços -5% de eficácia. Ativo: Foca em 1 alvo, reduzindo eficácia de seus feitiços em -15% por 2 turnos.", efeitoDetalhes: { passivo: { nomeAura: "Aura de Entropia", raioMetros: 5, debuffEficaciaMagiaPercent: 0.05 }, ativo: { alvo: "unico", debuffEficaciaMagiaPercent: 0.15, duracaoTurnos: 2 } }, pontosParaProximoNivel: 2 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Passivo: Raio 6m, -7% eficácia. Ativo: -20% eficácia por 2 turnos.", efeitoDetalhes: { passivo: { nomeAura: "Aura de Entropia", raioMetros: 6, debuffEficaciaMagiaPercent: 0.07 }, ativo: { alvo: "unico", debuffEficaciaMagiaPercent: 0.20, duracaoTurnos: 2 } }, pontosParaProximoNivel: 3 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Passivo: Raio 7m, -10% eficácia, revela invisibilidade. Ativo: -25% eficácia e +10% custo de PM para o alvo por 3 turnos.", efeitoDetalhes: { passivo: { nomeAura: "Aura de Nulificação", raioMetros: 7, debuffEficaciaMagiaPercent: 0.10, revelaInvisibilidade: true }, ativo: { alvo: "unico", debuffEficaciaMagiaPercent: 0.25, aumentoCustoPMFeiticosAlvoPercent: 0.10, duracaoTurnos: 3 } }, pontosParaProximoNivel: 4 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Passivo: Raio 8m, -12% eficácia. Ativo: -30% eficácia e +15% custo de PM por 3 turnos.", efeitoDetalhes: { passivo: { nomeAura: "Aura de Nulificação", raioMetros: 8, debuffEficaciaMagiaPercent: 0.12, revelaInvisibilidade: true }, ativo: { alvo: "unico", debuffEficaciaMagiaPercent: 0.30, aumentoCustoPMFeiticosAlvoPercent: 0.15, duracaoTurnos: 3 } }, pontosParaProximoNivel: 5 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Passivo: Raio 10m, -15% eficácia. Ativo: -35% eficácia, +20% custo de PM e 15% chance de falha total do feitiço do alvo por 3 turnos.", efeitoDetalhes: { passivo: { nomeAura: "Aura de Desintegração Arcana", raioMetros: 10, debuffEficaciaMagiaPercent: 0.15, revelaInvisibilidade: true }, ativo: { alvo: "unico", debuffEficaciaMagiaPercent: 0.35, aumentoCustoPMFeiticosAlvoPercent: 0.20, chanceFalhaFeiticoAlvo: 0.15, duracaoTurnos: 3 } } }
    ]
},
"classe_conjurador_do_vazio_chamado_dos_vazios": {
    id: "classe_conjurador_do_vazio_chamado_dos_vazios",
    nome: "Chamado dos Vazios",
    origemTipo: "classe", origemNome: "Conjurador do Vazio",
    tipo: "invocacao_temporaria_controle_area",
    descricao: "Rasga o véu da realidade, permitindo que tentáculos ou gavinhas do Vazio surjam do chão em uma área, agarrando e causando dano aos inimigos.",
    cooldownSegundos: 70,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_conjurador_do_vazio_fenda_sombria", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Em área (raio 3m), 2 tentáculos surgem por 2 turnos. Cada um pode agarrar 1 alvo, causando (Intelecto * 0.4) de dano do Vazio por turno e Imobilizando.", efeitoDetalhes: { tipoEfeito: "invocar_tentaculos_vazio", raioMetrosArea: 3, numeroTentaculos: 2, duracaoTurnosInvocacao: 2, danoPorTurnoPorTentaculo: "(intelecto*0.4)", tipoDano: "Vazio", efeitoTentaculo: "Imobilizar" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Raio 3.5m, 3 tentáculos por 2 turnos. Dano (Intelecto * 0.5)/turno.", efeitoDetalhes: { tipoEfeito: "invocar_tentaculos_vazio", raioMetrosArea: 3.5, numeroTentaculos: 3, duracaoTurnosInvocacao: 2, danoPorTurnoPorTentaculo: "(intelecto*0.5)", tipoDano: "Vazio", efeitoTentaculo: "Imobilizar" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Raio 4m, 3 tentáculos por 3 turnos. Dano (Intelecto * 0.6)/turno. Tentáculos também drenam um pouco de PM dos alvos agarrados.", efeitoDetalhes: { tipoEfeito: "invocar_tentaculos_vazio_drenagem", raioMetrosArea: 4, numeroTentaculos: 3, duracaoTurnosInvocacao: 3, danoPorTurnoPorTentaculo: "(intelecto*0.6)", tipoDano: "Vazio", efeitoTentaculo: "Imobilizar", drenagemPM: "(intelecto*0.1)" }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Raio 4.5m, 4 tentáculos por 3 turnos. Dano (Intelecto * 0.7)/turno. Drenagem de PM aumentada.", efeitoDetalhes: { tipoEfeito: "invocar_tentaculos_vazio_drenagem", raioMetrosArea: 4.5, numeroTentaculos: 4, duracaoTurnosInvocacao: 3, danoPorTurnoPorTentaculo: "(intelecto*0.7)", tipoDano: "Vazio", efeitoTentaculo: "Imobilizar", drenagemPM: "(intelecto*0.15)" }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Raio 5m, 5 tentáculos por 4 turnos. Dano (Intelecto * 0.8)/turno. Drenagem de PM e PV. No final da duração, os tentáculos explodem causando dano adicional.", efeitoDetalhes: { tipoEfeito: "invocar_tentaculos_vazio_supremos", raioMetrosArea: 5, numeroTentaculos: 5, duracaoTurnosInvocacao: 4, danoPorTurnoPorTentaculo: "(intelecto*0.8)", tipoDano: "Vazio", efeitoTentaculo: "Imobilizar", drenagemPM: "(intelecto*0.2)", drenagemPV: "(intelecto*0.1)", efeitoFinalExplosao: { formulaDano: "(intelecto*1.0)" } } }
    ]
},
"classe_conjurador_do_vazio_ruina_interplanar": {
    id: "classe_conjurador_do_vazio_ruina_interplanar",
    nome: "Ruína Interplanar",
    origemTipo: "classe", origemNome: "Conjurador do Vazio",
    tipo: "ataque_magico_unico_debuff_severo",
    descricao: "Uma magia proibida que canaliza energia destrutiva de outros planos para dilacerar a alma de um inimigo, causando dano massivo e aplicando debuffs severos e duradouros.",
    cooldownSegundos: 240, // Cooldown muito alto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_conjurador_do_vazio_olho_do_abismo", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 60, efeitoDesc: "Causa (Intelecto * 2.5) de dano do Vazio. Reduz todos os atributos do alvo em 10% por 3 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "VazioPuro", formulaDano: "(intelecto*2.5)", debuffGeralAtributosPercent: 0.10, duracaoDebuffTurnos: 3 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 65, efeitoDesc: "Dano (Intelecto * 2.8). Reduz atributos em 12% por 3 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "VazioPuro", formulaDano: "(intelecto*2.8)", debuffGeralAtributosPercent: 0.12, duracaoDebuffTurnos: 3 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 70, efeitoDesc: "Dano (Intelecto * 3.2). Reduz atributos em 15% por 4 turnos. O alvo não pode receber curas mágicas durante o debuff.", efeitoDetalhes: { alvo: "unico", tipoDano: "VazioPuro", formulaDano: "(intelecto*3.2)", debuffGeralAtributosPercent: 0.15, duracaoDebuffTurnos: 4, efeitoAdicional: "anticura_magica" }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 75, efeitoDesc: "Dano (Intelecto * 3.6). Reduz atributos em 18% por 4 turnos. Anticura mágica. O alvo também perde uma porção do seu PM máximo.", efeitoDetalhes: { alvo: "unico", tipoDano: "VazioPuro", formulaDano: "(intelecto*3.6)", debuffGeralAtributosPercent: 0.18, duracaoDebuffTurnos: 4, efeitoAdicional: "anticura_magica", perdaPMMaxPercent: 0.15 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 80, efeitoDesc: "Dano (Intelecto * 4.0). Reduz atributos em 20% por 5 turnos. Anticura mágica e de itens. Perda de PM máximo aumentada. Se o alvo morrer sob este efeito, sua alma é obliterada, impedindo ressurreição por meios comuns.", efeitoDetalhes: { alvo: "unico", tipoDano: "VazioPuro", formulaDano: "(intelecto*4.0)", debuffGeralAtributosPercent: 0.20, duracaoDebuffTurnos: 5, efeitoAdicional: "anticura_total", perdaPMMaxPercent: 0.20, efeitoAoMatar: "obliteracao_alma" } }
    ]
},
// --- FIM DOS FEITIÇOS DE CONJURADOR DO VAZIO ---

    // --- TODOS OS FEITIÇOS DE REINOS ABAIXO --- //

    //1. Reino: Valdoria
//Temática: Ordem, justiça, proteção, moral elevada.
//Atributo Principal Sugerido: carisma.
// --- FEITIÇOS DE REINO: VALDORIA ---
"reino_valdoria_estandarte_da_coragem": {
    id: "reino_valdoria_estandarte_da_coragem",
    nome: "Estandarte da Coragem de Valdoria",
    origemTipo: "reino", origemNome: "Valdoria",
    tipo: "buff_aura_moral_defesa",
    descricao: "O nativo de Valdoria invoca um estandarte espectral de pura convicção que inspira coragem e resiliência em aliados próximos.",
    cooldownSegundos: 300, 
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Aliados em raio de 5m ganham +5% de Defesa Base e são imunes a Medo Leve por 2 turnos.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 5, duracaoTurnos: 2, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.05 }], imunidadeCondicao: ["MedoLeve"] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Defesa Base +6%, imunidade a Medo Leve. Duração 2 turnos. Raio 5.5m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 5.5, duracaoTurnos: 2, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.06 }], imunidadeCondicao: ["MedoLeve"] }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Defesa Base +7%, +5 de Carisma (para testes de Vontade). Imune a Medo. Duração 3 turnos. Raio 6m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 6, duracaoTurnos: 3, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.07 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 5, aplicacaoEspecifica: "testes_vontade" }], imunidadeCondicao: ["Medo"] }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Defesa Base +8%, Carisma +6. Duração 3 turnos. Raio 6.5m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 6.5, duracaoTurnos: 3, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.08 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 6 }] }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Defesa Base +10%, Carisma +7. Duração 4 turnos. Raio 7m. Aliados também ganham +5% de Resistência a Dano Físico.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 7, duracaoTurnos: 4, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.10 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 7 }, { atributo: "resistenciaDanoFisico", modificador: "percentual_aditivo", valor: 0.05 }] }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 30, efeitoDesc: "Defesa Base +11%, Carisma +8, Resist. Dano Físico +6%. Duração 4 turnos. Raio 7.5m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 7.5, duracaoTurnos: 4, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.11 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 8 }, { atributo: "resistenciaDanoFisico", modificador: "percentual_aditivo", valor: 0.06 }] }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 32, efeitoDesc: "Defesa Base +12%, Carisma +10, Resist. Dano Físico +7%. Duração 5 turnos. Raio 8m. Remove 1 efeito de Desmoralização dos aliados.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 8, duracaoTurnos: 5, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.12 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 10 }, { atributo: "resistenciaDanoFisico", modificador: "percentual_aditivo", valor: 0.07 }], removeCondicao: { tipo: "Desmoralizacao", quantidade: 1 } }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 34, efeitoDesc: "Defesa Base +13%, Carisma +11, Resist. Dano Físico +8%. Duração 5 turnos. Raio 8.5m.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 8.5, duracaoTurnos: 5, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.13 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 11 }, { atributo: "resistenciaDanoFisico", modificador: "percentual_aditivo", valor: 0.08 }] }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 36, efeitoDesc: "Defesa Base +14%, Carisma +12, Resist. Dano Físico +10%. Duração 6 turnos. Raio 9m. Aliados ganham pequena regeneração de PM (+3/turno).", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 9, duracaoTurnos: 6, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.14 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 12 }, { atributo: "resistenciaDanoFisico", modificador: "percentual_aditivo", valor: 0.10 }, { atributo: "regeneracaoPM", valor: 3 }] }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 38, efeitoDesc: "Defesa Base +15%, Carisma +15, Resist. Dano Físico +12%, Resist. Dano Mágico +5%. Duração 6 turnos. Raio 10m. Aliados são imunes a Medo e Desmoralização, e ganham um bônus único de +1 em todas as rolagens de ataque enquanto o estandarte estiver ativo.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 10, duracaoTurnos: 6, buffs: [{ atributo: "defesaBase", modificador: "percentual_aditivo", valor: 0.15 }, { atributo: "carisma", modificador: "fixo_aditivo", valor: 15 }, { atributo: "resistenciaDanoFisico", modificador: "percentual_aditivo", valor: 0.12 }, { atributo: "resistenciaDanoMagico", modificador: "percentual_aditivo", valor: 0.05 }, { atributo: "regeneracaoPM", valor: 4 }], imunidadeCondicao: ["Medo", "Desmoralizacao"], bonusUniversalAtaque: 1 } }
    ]
},


//2. Reino: Elarion
//Temática: Natureza, magia ancestral, cura, sabedoria élfica.
//Atributo Principal Sugerido: intelecto e carisma.
// --- FEITIÇOS DE REINO: ELARION ---
"reino_elarion_abraco_da_floresta_ancestral": {
    id: "reino_elarion_abraco_da_floresta_ancestral",
    nome: "Abraço da Floresta Ancestral",
    origemTipo: "reino", origemNome: "Elarion",
    tipo: "buff_aura_regeneracao_resistencia_elemental_natureza",
    descricao: "O nativo de Elarion invoca a proteção da floresta ancestral, criando uma aura que regenera vida e mana de aliados e oferece resistência a elementos hostis à natureza.",
    cooldownSegundos: 300,
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Aura (raio 5m) por 3 turnos: Aliados regeneram (Intelecto*0.1) PV/turno. +5% Resistência a Fogo.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 5, duracaoTurnos: 3, regeneracaoPVTurno: "(intelecto*0.1)", resistenciaElemento: { tipo: "Fogo", percentual: 0.05 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 27, efeitoDesc: "Regen PV (Int*0.12)/turno. Resist. Fogo +6%. Raio 5.5m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.12)", resistenciaElemento: { percentual: 0.06 }, raioMetros: 5.5 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 29, efeitoDesc: "Regen PV (Int*0.15)/turno e PM (Carisma*0.05)/turno. Resist. Fogo +7%. Duração 4t. Raio 6m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.15)", regeneracaoPMTurno: "(carisma*0.05)", resistenciaElemento: { percentual: 0.07 }, duracaoTurnos: 4, raioMetros: 6 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 31, efeitoDesc: "Regen PV (Int*0.18)/turno, PM (Car*0.06)/turno. Resist. Fogo +8%. Raio 6.5m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.18)", regeneracaoPMTurno: "(carisma*0.06)", resistenciaElemento: { percentual: 0.08 }, raioMetros: 6.5 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 33, efeitoDesc: "Regen PV (Int*0.22)/turno, PM (Car*0.07)/turno. Resist. Fogo +10% e Gelo +5%. Duração 5t. Raio 7m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.22)", regeneracaoPMTurno: "(carisma*0.07)", resistenciasElementais: [{ tipo: "Fogo", percentual: 0.10 }, { tipo: "Gelo", percentual: 0.05 }], duracaoTurnos: 5, raioMetros: 7 }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 35, efeitoDesc: "Regen PV (Int*0.25)/turno, PM (Car*0.08)/turno. Resist. Fogo/Gelo +12%. Raio 7.5m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.25)", regeneracaoPMTurno: "(carisma*0.08)", resistenciasElementais: [{ tipo: "Fogo", percentual: 0.12 }, { tipo: "Gelo", percentual: 0.12 }], raioMetros: 7.5 }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 37, efeitoDesc: "Regen PV (Int*0.28)/turno, PM (Car*0.1)/turno. Resist. Fogo/Gelo +15%, Veneno +5%. Duração 6t. Raio 8m. Aura também concede bônus em testes de Furtividade em ambientes naturais.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.28)", regeneracaoPMTurno: "(carisma*0.1)", resistenciasElementais: [{ tipo: "Fogo", percentual: 0.15 }, { tipo: "Gelo", percentual: 0.15 }, { tipo: "Veneno", percentual: 0.05 }], duracaoTurnos: 6, raioMetros: 8, bonusPericia: { nome: "Furtividade Silvestre", valor: 10 } }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 39, efeitoDesc: "Regen PV (Int*0.32)/turno, PM (Car*0.12)/turno. Resist. Fogo/Gelo +18%, Veneno +7%. Raio 8.5m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.32)", regeneracaoPMTurno: "(carisma*0.12)", resistenciasElementais: [{ tipo: "Fogo", percentual: 0.18 }, { tipo: "Gelo", percentual: 0.18 }, { tipo: "Veneno", percentual: 0.07 }], raioMetros: 8.5 }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 41, efeitoDesc: "Regen PV (Int*0.36)/turno, PM (Car*0.15)/turno. Resist. Fogo/Gelo +20%, Veneno +10%, Ácido +5%. Duração 7t. Raio 9m.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.36)", regeneracaoPMTurno: "(carisma*0.15)", resistenciasElementais: [{ tipo: "Fogo", percentual: 0.20 }, { tipo: "Gelo", percentual: 0.20 }, { tipo: "Veneno", percentual: 0.10 }, { tipo: "Acido", percentual: 0.05 }], duracaoTurnos: 7, raioMetros: 9 }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 43, efeitoDesc: "Regen PV (Int*0.4)/turno, PM (Car*0.18)/turno. Resist. Fogo/Gelo/Veneno/Ácido +20%. Duração 8t. Raio 10m. Aliados na aura podem se mover sem impedimentos por terreno natural difícil e se tornam indetectáveis por animais comuns.", efeitoDetalhes: { regeneracaoPVTurno: "(intelecto*0.4)", regeneracaoPMTurno: "(carisma*0.18)", resistenciasElementais: [{ tipo: "Fogo", percentual: 0.20 }, { tipo: "Gelo", percentual: 0.20 }, { tipo: "Veneno", percentual: 0.20 }, { tipo: "Acido", percentual: 0.20 }], duracaoTurnos: 8, raioMetros: 10, buffAdicional: { nome: "Passo Leve da Natureza", efeitoDesc: "Movimento livre em terreno natural, indetectável por animais comuns" } } }
    ]
},


//3. Reino: Durnholde
//Temática: Resistência, forja, terra, honra anã.
//Atributo Principal Sugerido: vitalidade e forca.
// --- FEITIÇOS DE REINO: DURNHOLDE ---
"reino_durnholde_bencao_da_montanha_inabalavel": {
    id: "reino_durnholde_bencao_da_montanha_inabalavel",
    nome: "Bênção da Montanha Inabalável",
    origemTipo: "reino", origemNome: "Durnholde",
    tipo: "buff_aura_resistencia_fisica_estabilidade",
    descricao: "O nativo de Durnholde invoca a resiliência das montanhas eternas, concedendo a si e aliados próximos uma incrível resistência a dano físico e estabilidade contra empurrões.",
    cooldownSegundos: 300,
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Aura (raio 4m) por 3 turnos: Aliados ganham +10% de Redução de Dano Físico.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 4, duracaoTurnos: 3, buffReducaoDanoFisicoPercent: 0.10 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Redução Dano Físico +12%. Raio 4.5m.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.12, raioMetros: 4.5 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Redução Dano Físico +15%. Duração 4t. Raio 5m. Aliados também ganham + (Vitalidade*0.2) de Defesa Base.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.15, duracaoTurnos: 4, raioMetros: 5, buffDefesaBase: "(vitalidade*0.2)" }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Redução Dano Físico +18%, Defesa Base + (Vit*0.25). Raio 5.5m.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.18, buffDefesaBase: "(vitalidade*0.25)", raioMetros: 5.5 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Redução Dano Físico +20%, Defesa Base + (Vit*0.3). Duração 5t. Raio 6m. Aliados são imunes a empurrões e derrubadas.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.20, buffDefesaBase: "(vitalidade*0.3)", duracaoTurnos: 5, raioMetros: 6, imunidadeCondicao: ["Empurrao", "Derrubado"] }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 30, efeitoDesc: "Redução Dano Físico +22%, Defesa Base + (Vit*0.35). Raio 6.5m.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.22, buffDefesaBase: "(vitalidade*0.35)", raioMetros: 6.5 }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 32, efeitoDesc: "Redução Dano Físico +25%, Defesa Base + (Vit*0.4). Duração 6t. Raio 7m. A aura também concede uma pequena resistência a dano de contusão.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.25, buffDefesaBase: "(vitalidade*0.4)", duracaoTurnos: 6, raioMetros: 7, resistenciaEspecifica: { tipo: "Contusao", percentual: 0.10 } }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 34, efeitoDesc: "Redução Dano Físico +28%, Defesa Base + (Vit*0.45). Raio 7.5m.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.28, buffDefesaBase: "(vitalidade*0.45)", raioMetros: 7.5 }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 36, efeitoDesc: "Redução Dano Físico +30%, Defesa Base + (Vit*0.5). Duração 7t. Raio 8m. Resistência a contusão +15%.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.30, buffDefesaBase: "(vitalidade*0.5)", duracaoTurnos: 7, raioMetros: 8, resistenciaEspecifica: { tipo: "Contusao", percentual: 0.15 } }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 38, efeitoDesc: "Redução Dano Físico +35%, Defesa Base + (Vit*0.6). Duração 8t. Raio 9m. Imunidade a empurrões, derrubadas e atordoamentos por impacto. Uma vez durante o efeito, um aliado pode ignorar completamente o dano de um golpe físico poderoso.", efeitoDetalhes: { buffReducaoDanoFisicoPercent: 0.35, buffDefesaBase: "(vitalidade*0.6)", duracaoTurnos: 8, raioMetros: 9, imunidadeCondicao: ["Empurrao", "Derrubado", "AtordoamentoImpacto"], habilidadeEspecialAura: "ignorar_golpe_fisico_unico" } }
    ]
},


//4. Reino: Caelum
//Temática: Conhecimento arcano, luz, proteção celestial, pureza.
//Atributo Principal Sugerido: intelecto e carisma.
// --- FEITIÇOS DE REINO: CAELUM ---
"reino_caelum_sabedoria_dos_ceus": {
    id: "reino_caelum_sabedoria_dos_ceus",
    nome: "Sabedoria dos Céus",
    origemTipo: "reino", origemNome: "Caelum",
    tipo: "buff_aura_intelectual_resistencia_magica",
    descricao: "Habitantes de Caelum podem canalizar a clareza dos céus, imbuindo aliados próximos com maior acuidade mental, resistência a ilusões e proteção contra magias hostis.",
    cooldownSegundos: 300,
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 22, efeitoDesc: "Aura (raio 5m) por 3 turnos: Aliados ganham + (Intelecto*0.1) de Intelecto.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 5, duracaoTurnos: 3, buff: { atributo: "intelecto", formulaValor: "(intelecto*0.1)" } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 24, efeitoDesc: "Intelecto + (Int*0.12). Raio 5.5m.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.12)" }, raioMetros: 5.5 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 26, efeitoDesc: "Intelecto + (Int*0.15). Duração 4t. Raio 6m. Concede +5% de Resistência a Magias de Ilusão.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.15)" }, duracaoTurnos: 4, raioMetros: 6, resistenciaEscolaMagia: { escola: "Ilusao", percentual: 0.05 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 28, efeitoDesc: "Intelecto + (Int*0.18). Resist. Ilusão +7%. Raio 6.5m.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.18)" }, resistenciaEscolaMagia: { percentual: 0.07 }, raioMetros: 6.5 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 30, efeitoDesc: "Intelecto + (Int*0.22). Duração 5t. Raio 7m. Resist. Ilusão +10% e Encantamento +5%.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.22)" }, duracaoTurnos: 5, raioMetros: 7, resistenciasEscolaMagia: [{ escola: "Ilusao", percentual: 0.10 }, { escola: "Encantamento", percentual: 0.05 }] }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 32, efeitoDesc: "Intelecto + (Int*0.25). Resist. Ilusão/Encantamento +12%. Raio 7.5m.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.25)" }, resistenciasEscolaMagia: [{ escola: "Ilusao", percentual: 0.12 }, { escola: "Encantamento", percentual: 0.12 }], raioMetros: 7.5 }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 34, efeitoDesc: "Intelecto + (Int*0.28). Duração 6t. Raio 8m. Resist. Ilusão/Encantamento +15%. Concede +5% de Resistência Mágica geral.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.28)" }, duracaoTurnos: 6, raioMetros: 8, resistenciasEscolaMagia: [{ escola: "Ilusao", percentual: 0.15 }, { escola: "Encantamento", percentual: 0.15 }], buffResistenciaMagicaGeralPercent: 0.05 }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 36, efeitoDesc: "Intelecto + (Int*0.32). Resist. Ilusão/Encantamento +18%. Resist. Mágica geral +7%. Raio 8.5m.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.32)" }, resistenciasEscolaMagia: [{ escola: "Ilusao", percentual: 0.18 }, { escola: "Encantamento", percentual: 0.18 }], buffResistenciaMagicaGeralPercent: 0.07, raioMetros: 8.5 }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 38, efeitoDesc: "Intelecto + (Int*0.36). Duração 7t. Raio 9m. Resist. Ilusão/Encantamento +20%. Resist. Mágica geral +10%. Aliados podem identificar magias mais facilmente.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.36)" }, duracaoTurnos: 7, raioMetros: 9, resistenciasEscolaMagia: [{ escola: "Ilusao", percentual: 0.20 }, { escola: "Encantamento", percentual: 0.20 }], buffResistenciaMagicaGeralPercent: 0.10, bonusIdentificarMagia: true }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 40, efeitoDesc: "Intelecto + (Int*0.4 + Carisma*0.1). Duração 8t. Raio 10m. Imunidade a Ilusões e Encantamentos de nível baixo/médio. Resist. Mágica geral +12%. Uma vez durante o efeito, um aliado pode refletir um feitiço hostil de alvo único.", efeitoDetalhes: { buff: { formulaValor: "(intelecto*0.4)+(carisma*0.1)" }, duracaoTurnos: 8, raioMetros: 10, imunidadeEscolaMagiaNivelBaixoMedio: ["Ilusao", "Encantamento"], buffResistenciaMagicaGeralPercent: 0.12, habilidadeEspecialAura: "refletir_feitico_unico_alvo" } }
    ]
},


//5. Reino: Ravengard
//Temática: Sombras, astúcia, magia profana sutil, sobrevivência em ambientes hostis.
//Atributo Principal Sugerido: agilidade e intelecto.
// --- FEITIÇOS DE REINO: RAVENGARD ---
"reino_ravengard_manto_das_sombras_esquivas": {
    id: "reino_ravengard_manto_das_sombras_esquivas",
    nome: "Manto das Sombras Esquivas",
    origemTipo: "reino", origemNome: "Ravengard",
    tipo: "buff_aura_furtividade_esquiva_condicional",
    descricao: "Nativos de Ravengard podem tecer as sombras ao redor de si e de seus aliados, dificultando serem vistos e atingidos, especialmente em ambientes escuros.",
    cooldownSegundos: 300,
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 18, efeitoDesc: "Aura (raio 4m) por 3 turnos: Aliados ganham +5 em testes de Furtividade. Em penumbra/escuridão, também ganham +5% de Chance de Esquiva.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 4, duracaoTurnos: 3, bonusFurtividade: 5, bonusCondicionalAmbiente: { condicao: ["penumbra", "escuridao"], buff: { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.05 } } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 20, efeitoDesc: "Furtividade +6. Esquiva +6% (condicional). Raio 4.5m.", efeitoDetalhes: { bonusFurtividade: 6, bonusCondicionalAmbiente: { buff: { valor: 0.06 } }, raioMetros: 4.5 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 22, efeitoDesc: "Furtividade +7. Esquiva +7% (condicional). Duração 4t. Raio 5m. Leve resistência a dano de Luz.", efeitoDetalhes: { bonusFurtividade: 7, bonusCondicionalAmbiente: { buff: { valor: 0.07 } }, duracaoTurnos: 4, raioMetros: 5, resistenciaElemento: { tipo: "Luz", percentual: 0.05 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 24, efeitoDesc: "Furtividade +8. Esquiva +8% (condicional). Resist. Luz +6%. Raio 5.5m.", efeitoDetalhes: { bonusFurtividade: 8, bonusCondicionalAmbiente: { buff: { valor: 0.08 } }, resistenciaElemento: { percentual: 0.06 }, raioMetros: 5.5 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 26, efeitoDesc: "Furtividade +10. Esquiva +10% (condicional). Duração 5t. Raio 6m. Resist. Luz +7%. Movimento em sombras não gera som.", efeitoDetalhes: { bonusFurtividade: 10, bonusCondicionalAmbiente: { buff: { valor: 0.10 } }, duracaoTurnos: 5, raioMetros: 6, resistenciaElemento: { percentual: 0.07 }, buffAdicional: "movimento_silencioso_em_sombra" }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 28, efeitoDesc: "Furtividade +11. Esquiva +11% (condicional). Resist. Luz +8%. Raio 6.5m.", efeitoDetalhes: { bonusFurtividade: 11, bonusCondicionalAmbiente: { buff: { valor: 0.11 } }, resistenciaElemento: { percentual: 0.08 }, raioMetros: 6.5 }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 30, efeitoDesc: "Furtividade +12. Esquiva +12% (condicional). Duração 6t. Raio 7m. Resist. Luz +10%. Aliados podem se tornar brevemente translúcidos em sombras profundas.", efeitoDetalhes: { bonusFurtividade: 12, bonusCondicionalAmbiente: { buff: { valor: 0.12 } }, duracaoTurnos: 6, raioMetros: 7, resistenciaElemento: { percentual: 0.10 }, buffAdicional: "translucidez_em_sombra_profunda" }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 32, efeitoDesc: "Furtividade +13. Esquiva +13% (condicional). Resist. Luz +11%. Raio 7.5m.", efeitoDetalhes: { bonusFurtividade: 13, bonusCondicionalAmbiente: { buff: { valor: 0.13 } }, resistenciaElemento: { percentual: 0.11 }, raioMetros: 7.5 }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 34, efeitoDesc: "Furtividade +14. Esquiva +14% (condicional). Duração 7t. Raio 8m. Resist. Luz +12%. O primeiro ataque de um aliado vindo de furtividade/sombra causa dano adicional Sombrio.", efeitoDetalhes: { bonusFurtividade: 14, bonusCondicionalAmbiente: { buff: { valor: 0.14 } }, duracaoTurnos: 7, raioMetros: 8, resistenciaElemento: { percentual: 0.12 }, bonusPrimeiroAtaqueFurtivo: { tipoDano: "Sombrio", formulaDano: "(agilidade*0.5)" } }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 36, efeitoDesc: "Furtividade +15. Esquiva +15% (garantida em escuridão total). Duração 8t. Raio 9m. Resist. Luz +15%. Aliados podem se teleportar entre sombras próximas uma vez durante o efeito.", efeitoDetalhes: { bonusFurtividade: 15, bonusCondicionalAmbiente: { condicao: ["escuridao_total"], buff: { atributo: "chanceEsquiva", modificador: "garantido", valor: 1.0 }, condicaoAlternativa: ["penumbra"], buffAlternativo: { atributo: "chanceEsquiva", modificador: "percentual_aditivo", valor: 0.15 } }, duracaoTurnos: 8, raioMetros: 9, resistenciaElemento: { percentual: 0.15 }, habilidadeEspecialAura: "teleporte_entre_sombras_unico" } }
    ]
},


//6. Reino: Thornmere//
//Temática: Fronteira, sobrevivência, versatilidade, adaptabilidade a terrenos hostis.//
//Atributo Principal Sugerido: vitalidade e agilidade.//
// --- FEITIÇOS DE REINO: THORNMERE ---
"reino_thornmere_espiritos_da_fronteira_indomita": {
    id: "reino_thornmere_espiritos_da_fronteira_indomita",
    nome: "Espíritos da Fronteira Indômita",
    origemTipo: "reino", origemNome: "Thornmere",
    tipo: "buff_aura_adaptabilidade_resistencia_ambiente",
    descricao: "Aqueles de Thornmere invocam os espíritos indômitos da fronteira, ganhando para si e seus aliados bônus adaptativos de resistência a perigos ambientais e maior desenvoltura em terrenos selvagens.",
    cooldownSegundos: 300,
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 18, efeitoDesc: "Aura (raio 6m) por 10 min (fora de combate) ou 3 turnos (em combate): Aliados ignoram penalidades de movimento em terreno difícil leve. +5% Resistência a Veneno natural.", efeitoDetalhes: { alvo: "area_aliados", raioMetros: 6, duracaoTurnosCombate: 3, duracaoMinutosForaCombate: 10, ignoraTerrenoDificilLeve: true, resistenciaElemento: { tipo: "VenenoNatural", percentual: 0.05 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 20, efeitoDesc: "Ignora terreno difícil leve. Resist. Veneno natural +7%.", efeitoDetalhes: { resistenciaElemento: { percentual: 0.07 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 22, efeitoDesc: "Ignora terreno difícil moderado. Resist. Veneno natural +10% e Doenças comuns +5%. Duração 4t/15min.", efeitoDetalhes: { ignoraTerrenoDificilModerado: true, resistencias: [{ tipo: "VenenoNatural", percentual: 0.10 }, { tipo: "DoencaComum", percentual: 0.05 }], duracaoTurnosCombate: 4, duracaoMinutosForaCombate: 15 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 24, efeitoDesc: "Resist. Veneno natural +12%, Doenças +7%.", efeitoDetalhes: { resistencias: [{ tipo: "VenenoNatural", percentual: 0.12 }, { tipo: "DoencaComum", percentual: 0.07 }] }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 26, efeitoDesc: "Ignora terreno difícil severo. Resist. Veneno natural +15%, Doenças +10%, Exaustão por clima +5%. Duração 5t/20min. Bônus em testes de Sobrevivência.", efeitoDetalhes: { ignoraTerrenoDificilSevero: true, resistencias: [{ tipo: "VenenoNatural", percentual: 0.15 }, { tipo: "DoencaComum", percentual: 0.10 }, { tipo: "ExaustaoClimatica", percentual: 0.05 }], duracaoTurnosCombate: 5, duracaoMinutosForaCombate: 20, bonusPericia: { nome: "Sobrevivencia", valor: 10 } }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 28, efeitoDesc: "Resist. Veneno natural +18%, Doenças +12%, Exaustão +7%.", efeitoDetalhes: { resistencias: [{ tipo: "VenenoNatural", percentual: 0.18 }, { tipo: "DoencaComum", percentual: 0.12 }, { tipo: "ExaustaoClimatica", percentual: 0.07 }] }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 30, efeitoDesc: "Resist. Veneno natural +20%, Doenças +15%, Exaustão +10%. Duração 6t/25min. Aliados recuperam vigor (PM) mais rápido ao descansar em ermos.", efeitoDetalhes: { resistencias: [{ tipo: "VenenoNatural", percentual: 0.20 }, { tipo: "DoencaComum", percentual: 0.15 }, { tipo: "ExaustaoClimatica", percentual: 0.10 }], duracaoTurnosCombate: 6, duracaoMinutosForaCombate: 25, bonusRecuperacaoPMDescansoErmos: true }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 32, efeitoDesc: "Resist. Veneno natural +22%, Doenças +18%, Exaustão +12%.", efeitoDetalhes: { resistencias: [{ tipo: "VenenoNatural", percentual: 0.22 }, { tipo: "DoencaComum", percentual: 0.18 }, { tipo: "ExaustaoClimatica", percentual: 0.12 }] }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 34, efeitoDesc: "Resist. Veneno natural +25%, Doenças +20%, Exaustão +15%. Duração 7t/30min. O grupo pode encontrar mais facilmente comida/água em ermos.", efeitoDetalhes: { resistencias: [{ tipo: "VenenoNatural", percentual: 0.25 }, { tipo: "DoencaComum", percentual: 0.20 }, { tipo: "ExaustaoClimatica", percentual: 0.15 }], duracaoTurnosCombate: 7, duracaoMinutosForaCombate: 30, bonusEncontrarRecursosErmos: true }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 36, efeitoDesc: "Resist. Veneno natural +30%, Doenças +25%, Exaustão +20%. Duração 8t/1hora. O grupo se torna imune a efeitos de terreno natural perigoso (ex: areia movediça leve, espinhos naturais) e pode se camuflar em ambientes selvagens.", efeitoDetalhes: { resistencias: [{ tipo: "VenenoNatural", percentual: 0.30 }, { tipo: "DoencaComum", percentual: 0.25 }, { tipo: "ExaustaoClimatica", percentual: 0.20 }], duracaoTurnosCombate: 8, duracaoMinutosForaCombate: 60, imunidadeTerrenoNaturalPerigosoLeve: true, habilidadeCamuflagemSelvagem: true } }
    ]
},


//7. Reino: Isle of Morwyn
//Temática: Névoas, magia proibida, segredos arcanos, poder perigoso, relíquias.//
//Atributo Principal Sugerido: intelecto e carisma (para manipular as energias instáveis e resistir a elas).//
// --- FEITIÇOS DE REINO: ISLE OF MORWYN ---
"reino_isle_of_morwyn_eco_das_nevoas_proibidas": {
    id: "reino_isle_of_morwyn_eco_das_nevoas_proibidas",
    nome: "Eco das Névoas Proibidas",
    origemTipo: "reino", origemNome: "Isle of Morwyn",
    tipo: "buff_pessoal_poder_arcano_arriscado_utilidade",
    descricao: "O nativo da Ilha de Morwyn sintoniza-se com as energias instáveis e conhecimentos proibidos das névoas, ganhando um impulso temporário ao seu poder mágico, mas com riscos inerentes, e uma chance de desvendar segredos.",
    cooldownSegundos: 300,
    maxNivel: 10,
    requisitosParaAprender: [],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 15, custoVidaOpcionalPercent: 0.05, efeitoDesc: "Por 2 turnos, feitiços de dano causam +10% de dano. Chance de 5% de um efeito colateral mágico menor (determinado pelo DM). Leve bônus para decifrar runas/textos arcanos.", efeitoDetalhes: { alvo: "self", duracaoTurnos: 2, bonusDanoMagicoPercent: 0.10, chanceEfeitoColateralMenor: 0.05, bonusDecifrarArcanoLeve: true }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Dano mágico +12%. Chance de efeito colateral 6%.", efeitoDetalhes: { bonusDanoMagicoPercent: 0.12, chanceEfeitoColateralMenor: 0.06 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Dano mágico +15%. Duração 3t. Chance de efeito colateral 7%. Pode sacrificar 5% do PV atual para aumentar o bônus de dano para +20% neste uso.", efeitoDetalhes: { duracaoTurnos: 3, bonusDanoMagicoPercent: 0.15, chanceEfeitoColateralMenor: 0.07, opcaoSacrificioPV: { percentPV: 0.05, bonusDanoAdicionalPercent: 0.05 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Dano mágico +18%. Chance efeito colateral 8%. Sacrifício aumenta para +22% dano.", efeitoDetalhes: { bonusDanoMagicoPercent: 0.18, chanceEfeitoColateralMenor: 0.08, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.04 } }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Dano mágico +22%. Duração 4t. Chance efeito colateral 10%. Sacrifício aumenta para +25% dano. Bônus para identificar propriedades de itens mágicos.", efeitoDetalhes: { duracaoTurnos: 4, bonusDanoMagicoPercent: 0.22, chanceEfeitoColateralMenor: 0.10, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.03 }, bonusIdentificarItemMagico: true }, pontosParaProximoNivel: 8 },
        { nivel: 6, custoPM: 25, efeitoDesc: "Dano mágico +25%. Chance efeito colateral 11%. Sacrifício aumenta para +28% dano.", efeitoDetalhes: { bonusDanoMagicoPercent: 0.25, chanceEfeitoColateralMenor: 0.11, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.03 } }, pontosParaProximoNivel: 10 },
        { nivel: 7, custoPM: 27, efeitoDesc: "Dano mágico +28%. Duração 5t. Chance efeito colateral 12%. Sacrifício aumenta para +32% dano. Pode tentar sentir a presença de relíquias poderosas próximas.", efeitoDetalhes: { duracaoTurnos: 5, bonusDanoMagicoPercent: 0.28, chanceEfeitoColateralMenor: 0.12, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.04 }, sentirReliquiasProximas: true }, pontosParaProximoNivel: 12 },
        { nivel: 8, custoPM: 29, efeitoDesc: "Dano mágico +32%. Chance efeito colateral 13%. Sacrifício aumenta para +36% dano.", efeitoDetalhes: { bonusDanoMagicoPercent: 0.32, chanceEfeitoColateralMenor: 0.13, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.04 } }, pontosParaProximoNivel: 15 },
        { nivel: 9, custoPM: 31, efeitoDesc: "Dano mágico +36%. Duração 6t. Chance efeito colateral 15% (pode ser um efeito colateral moderado). Sacrifício aumenta para +40% dano. Maior chance de desvendar segredos arcanos complexos.", efeitoDetalhes: { duracaoTurnos: 6, bonusDanoMagicoPercent: 0.36, chanceEfeitoColateralModerado: 0.15, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.04 }, bonusDesvendarSegredosArcanos: true }, pontosParaProximoNivel: 20 },
        { nivel: 10, custoPM: 33, efeitoDesc: "Dano mágico +40%. Duração 7t. Chance efeito colateral 10% (mas pode ser benéfico ou prejudicial). Sacrifício aumenta para +50% dano. Uma vez por dia, pode tentar comungar com as névoas para receber uma profecia obscura ou um poder proibido temporário (escolha do DM com alto risco/recompensa).", efeitoDetalhes: { duracaoTurnos: 7, bonusDanoMagicoPercent: 0.40, chanceEfeitoColateralAleatorioBenignoMaligno: 0.10, opcaoSacrificioPV: { bonusDanoAdicionalPercent: 0.10 }, habilidadeEspecialComunhaoNevoas: { usosPorDia: 1, altoRiscoRecompensa: true } } }
    ]
},


// --- FEITIÇOS DE CLASSE ESPECIAL: REI ESQUECIDO ---
"classe_rei_esquecido_fortitude_ancestral": { 
    id: "classe_rei_esquecido_fortitude_ancestral",
    nome: "Fortitude Ancestral",
    origemTipo: "classe_especial", origemNome: "Rei Esquecido",
    tipo: "passivo_resistencias_aprimoradas", // Habilidade passiva que se aprimora
    descricao: "O sangue esquecido que corre em suas veias concede uma resistência inata a venenos, doenças e magias que afetam a mente e o corpo.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_rei_esquecido_despertar_do_colosso", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "+15% Resistência a Venenos e Doenças. +5% Resistência a Magia Sagrada.", efeitoDetalhes: { tipoEfeito: "resistencias_passivas", resistencias: [{ tipo: "Veneno", percentual: 0.15 }, { tipo: "Doenca", percentual: 0.15 }, { tipo: "MagiaSagrada", percentual: 0.05 }] }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Resist. Veneno/Doença +20%. Resist. Magia Sagrada +7%. Adiciona +5% Resistência a Maldições.", efeitoDetalhes: { resistencias: [{ tipo: "Veneno", percentual: 0.20 }, { tipo: "Doenca", percentual: 0.20 }, { tipo: "MagiaSagrada", percentual: 0.07 }, { tipo: "Maldicao", percentual: 0.05 }] }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Resist. Veneno/Doença +25%. Resist. Magia Sagrada +10%. Resist. Maldições +7%. Adiciona +5% Resistência a efeitos de controle mental.", efeitoDetalhes: { resistencias: [{ tipo: "Veneno", percentual: 0.25 }, { tipo: "Doenca", percentual: 0.25 }, { tipo: "MagiaSagrada", percentual: 0.10 }, { tipo: "Maldicao", percentual: 0.07 }, { tipo: "ControleMental", percentual: 0.05 }] }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Resist. Veneno/Doença +30%. Resist. Magia Sagrada +12%. Resist. Maldições +10%. Resist. Controle Mental +7%.", efeitoDetalhes: { resistencias: [{ tipo: "Veneno", percentual: 0.30 }, { tipo: "Doenca", percentual: 0.30 }, { tipo: "MagiaSagrada", percentual: 0.12 }, { tipo: "Maldicao", percentual: 0.10 }, { tipo: "ControleMental", percentual: 0.07 }] }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Resist. Veneno/Doença +35%. Resist. Magia Sagrada +15%. Resist. Maldições +12%. Resist. Controle Mental +10%. O Rei Esquecido se torna imune a venenos e doenças comuns não mágicas.", efeitoDetalhes: { tipoEfeito: "fortitude_titânica_passiva", resistencias: [{ tipo: "Veneno", percentual: 0.35 }, { tipo: "Doenca", percentual: 0.35 }, { tipo: "MagiaSagrada", percentual: 0.15 }, { tipo: "Maldicao", percentual: 0.12 }, { tipo: "ControleMental", percentual: 0.10 }], imunidadesComuns: ["VenenoNaoMagico", "DoencaNaoMagica"] } }
    ]
},
"classe_rei_esquecido_presenca_dominadora": {
    id: "classe_rei_esquecido_presenca_dominadora",
    nome: "Presença Dominadora",
    origemTipo: "classe_especial", origemNome: "Rei Esquecido",
    tipo: "aura_passiva_debuff_anti_magia_sutil",
    descricao: "A mera presença do Rei Esquecido emana uma aura de poder primordial que interfere sutilmente com energias mágicas hostis e enfraquece a vontade de conjuradores inimigos.",
    cooldownSegundos: 0, // Passivo
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_rei_esquecido_grito_anulador", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 0, efeitoDesc: "Inimigos conjuradores em raio de 4m têm o custo de PM de seus feitiços aumentado em 5%.", efeitoDetalhes: { tipoAura: "interferencia_arcana_passiva", raioMetros: 4, aumentoCustoPMInimigoPercent: 0.05 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Aumento custo PM inimigo para 7%. Raio 5m.", efeitoDetalhes: { raioMetros: 5, aumentoCustoPMInimigoPercent: 0.07 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Aumento custo PM inimigo para 10%. Raio 6m. Feitiços de alvo único direcionados ao Rei Esquecido têm 5% de chance de falhar.", efeitoDetalhes: { raioMetros: 6, aumentoCustoPMInimigoPercent: 0.10, chanceFalhaMagiaAlvoUnicoReiPercent: 0.05 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Aumento custo PM inimigo para 12%. Raio 7m. Chance de falha de magia 7%.", efeitoDetalhes: { raioMetros: 7, aumentoCustoPMInimigoPercent: 0.12, chanceFalhaMagiaAlvoUnicoReiPercent: 0.07 }, pontosParaProximoNivel: 6 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Aumento custo PM inimigo para 15%. Raio 8m. Chance de falha de magia 10%. A aura também concede ao Rei Esquecido e aliados próximos +5 de Carisma para resistir a feitiços de controle mental.", efeitoDetalhes: { tipoAura: "supressao_magica_passiva", raioMetros: 8, aumentoCustoPMInimigoPercent: 0.15, chanceFalhaMagiaAlvoUnicoReiPercent: 0.10, bonusResistenciaControleMentalCarisma: 5 } }
    ]
},
"classe_rei_esquecido_grito_anulador": {
    id: "classe_rei_esquecido_grito_anulador",
    nome: "Grito Anulador",
    origemTipo: "classe_especial", origemNome: "Rei Esquecido",
    tipo: "habilidade_ativa_antimagia_area_debuff",
    descricao: "O Rei Esquecido libera um urro poderoso carregado de energia primordial que estilhaça magias ativas e silencia conjuradores em área por um curto período.",
    cooldownSegundos: 90,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_rei_esquecido_presenca_dominadora", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Tenta dissipar 1 efeito mágico benéfico de cada inimigo em raio de 6m. Conjuradores na área são Silenciados por 1 turno com 30% de chance.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 6, efeitoDissiparBuffs: { quantidade: 1 }, condicao: { nome: "Silêncio Primordial", chance: 0.30, duracaoTurnos: 1 } }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Dissipa 1 efeito. Chance de Silêncio 35%. Raio 7m.", efeitoDetalhes: { raioMetros: 7, condicao: { chance: 0.35 } }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Dissipa até 2 efeitos. Chance de Silêncio 40% por 2 turnos. Raio 8m. Inimigos afetados também sofrem -10% de Resistência Mágica por 2 turnos.", efeitoDetalhes: { raioMetros: 8, efeitoDissiparBuffs: { quantidade: 2 }, condicao: { nome: "Silêncio Primordial", chance: 0.40, duracaoTurnos: 2 }, debuff: { atributo: "resistenciaMagica", modificador: "percentual_negativo_multiplicativo", valor: 0.10, duracaoTurnos: 2 } }, pontosParaProximoNivel: 6 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Dissipa até 2 efeitos. Chance de Silêncio 45% por 2 turnos. Raio 9m. Redução de Resist. Mágica -15%.", efeitoDetalhes: { raioMetros: 9, condicao: { chance: 0.45 }, debuff: { valor: 0.15 } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 42, efeitoDesc: "Dissipa todos os efeitos mágicos benéficos não-supremos. Silêncio garantido por 2 turnos. Raio 10m. Redução de Resist. Mágica -20%. O grito também quebra escudos mágicos ativos (exceto os mais poderosos).", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 10, efeitoDissiparBuffs: { quantidade: "todos_nao_supremos" }, condicao: { nome: "Silêncio Anulador", chance: 1.0, duracaoTurnos: 2 }, debuff: { atributo: "resistenciaMagica", modificador: "percentual_negativo_multiplicativo", valor: 0.20, duracaoTurnos: 3 }, quebraEscudosMagicos: true } }
    ]
},
"classe_rei_esquecido_despertar_do_colosso": {
    id: "classe_rei_esquecido_despertar_do_colosso",
    nome: "Despertar do Colosso",
    origemTipo: "classe_especial", origemNome: "Rei Esquecido",
    tipo: "transformacao_buff_poderoso_fisico",
    descricao: "O Rei Esquecido libera seu poder ancestral latente, transformando-se em um gigante colossal com força e resistência titânicas por um período limitado.",
    cooldownSegundos: 600, // Cooldown muito alto para uma transformação "ultimate"
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_rei_esquecido_fortitude_ancestral", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 50, efeitoDesc: "Transforma-se por 3 turnos. Ganha + (Vitalidade * 2.0) de PV Máximo (e cura essa quantidade), + (Forca * 1.0) de Força, + (Vitalidade * 1.0) de Defesa Base. Ataques causam dano em área pequena (cleave).", efeitoDetalhes: { tipoEfeito: "transformacao_gigante", duracaoTurnos: 3, buffsTransformacao: [{ atributo: "pvMaxTemp", formulaValor: "(vitalidade*2.0)" }, { atributo: "forca", formulaValor: "(forca*1.0)" }, { atributo: "defesaBase", formulaValor: "(vitalidade*1.0)" }], habilidadePassivaTransformado: "ataque_cleave_pequeno" }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 55, efeitoDesc: "Duração 3 turnos. PV Máx + (Vit*2.2), Força + (For*1.2), Defesa + (Vit*1.2). Cleave melhorado.", efeitoDetalhes: { duracaoTurnos: 3, buffsTransformacao: [{ atributo: "pvMaxTemp", formulaValor: "(vitalidade*2.2)" }, { atributo: "forca", formulaValor: "(forca*1.2)" }, { atributo: "defesaBase", formulaValor: "(vitalidade*1.2)" }], habilidadePassivaTransformado: "ataque_cleave_medio" }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 60, efeitoDesc: "Duração 4 turnos. PV Máx + (Vit*2.5), Força + (For*1.5), Defesa + (Vit*1.5). Ganha 'Pisotão Sísmico' (habilidade de dano em área). Imune a empurrões e derrubadas.", efeitoDetalhes: { tipoEfeito: "transformacao_gigante_com_habilidade", duracaoTurnos: 4, buffsTransformacao: [{ atributo: "pvMaxTemp", formulaValor: "(vitalidade*2.5)" }, { atributo: "forca", formulaValor: "(forca*1.5)" }, { atributo: "defesaBase", formulaValor: "(vitalidade*1.5)" }], imunidades: ["Empurrao", "Derrubado"], habilidadeAtivaTransformado: { nome: "Pisotão Sísmico", custoPM: 10, cooldownInternoTurnos: 2, efeitoDesc: "Dano (ForcaTransformado*1.0) em área e derruba." } }, pontosParaProximoNivel: 6 },
        { nivel: 4, custoPM: 65, efeitoDesc: "Duração 4 turnos. PV Máx + (Vit*2.8), Força + (For*1.8), Defesa + (Vit*1.8). 'Pisotão Sísmico' mais forte. Ganha 'Arremessar Rocha'.", efeitoDetalhes: { duracaoTurnos: 4, buffsTransformacao: [{ atributo: "pvMaxTemp", formulaValor: "(vitalidade*2.8)" }, { atributo: "forca", formulaValor: "(forca*1.8)" }, { atributo: "defesaBase", formulaValor: "(vitalidade*1.8)" }], imunidades: ["Empurrao", "Derrubado"], habilidadesAtivasTransformado: [{ nome: "Pisotão Sísmico Aprimorado" }, { nome: "Arremessar Rocha", custoPM: 15, cooldownInternoTurnos: 3, efeitoDesc: "Dano massivo de contusão a longa distância."}] }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 70, efeitoDesc: "Duração 5 turnos. PV Máx + (Vit*3.2), Força + (For*2.2), Defesa + (Vit*2.2). 'Pisotão Sísmico Devastador'. 'Arremessar Rocha Gigante'. Enquanto transformado, o Rei Esquecido emana uma 'Aura de Desespero Primordial' que reduz a moral e a eficácia de cura em inimigos próximos.", efeitoDetalhes: { tipoEfeito: "transformacao_colossal_mestre", duracaoTurnos: 5, buffsTransformacao: [{ atributo: "pvMaxTemp", formulaValor: "(vitalidade*3.2)" }, { atributo: "forca", formulaValor: "(forca*2.2)" }, { atributo: "defesaBase", formulaValor: "(vitalidade*2.2)" }], imunidades: ["Empurrao", "Derrubado", "AtordoamentoLeve"], habilidadesAtivasTransformado: [{ nome: "Pisotão Sísmico Devastador" }, { nome: "Arremessar Rocha Gigante" }], auraPassivaTransformado: { nome: "Aura de Desespero Primordial", raioMetros: 8, debuffs: [{ atributo: "moral", valorReducao: 20 }, { atributo: "eficaciaCuraRecebidaPercent", valorReducao: 0.25 }] } } }
    ]
},
// --- FIM DOS FEITIÇOS DE REI ESQUECIDO ---

// --- FEITIÇOS DE CLASSE ESPECIAL: GUERREIRO ALQUIMISTA ---
"classe_especial_guerreiro_alquimista_transmutar_lamina": {
    id: "classe_especial_guerreiro_alquimista_transmutar_lamina",
    nome: "Transmutar Lâmina",
    origemTipo: "classe_especial", origemNome: "Guerreiro Alquimista",
    tipo: "buff_arma_transmutacao_ativa",
    descricao: "O Guerreiro Alquimista transmuta temporariamente sua arma corpo-a-corpo (ou cria uma do nada se desarmado usando reagentes básicos), imbuindo-a com propriedades elementais ou efeitos alquímicos potentes.",
    cooldownSegundos: 20, // Cooldown para uma nova transmutação
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_guerreiro_alquimista_elixir_do_berserker_metalico", aoAtingirNivel: 5 } ],
    niveis: [
        // O jogador pode escolher o tipo de transmutação (Fogo, Gelo, Ácido, Veneno, etc.)
        { nivel: 1, custoPM: 15, efeitoDesc: "Arma (ou lâmina transmutada) causa + (Intelecto * 0.5) de dano elemental (escolha: Fogo ou Ácido) por 3 turnos. Requer 'Componentes Comuns' (item simbólico, não consumido mecanicamente por ora).", efeitoDetalhes: { alvo: "arma_propria_ou_criada", permiteEscolhaElementoTransmutacao: ["Fogo", "Acido"], tipoBuff: "dano_adicional_elemental_arma", formulaDanoAdicional: "(intelecto*0.5)", duracaoTurnos: 3, requerComponenteSimbolico: "Componentes Comuns" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Dano elemental + (Intelecto * 0.6). Duração 3 turnos. Adiciona Gelo e Veneno às escolhas.", efeitoDetalhes: { permiteEscolhaElementoTransmutacao: ["Fogo", "Acido", "Gelo", "Veneno"], formulaDanoAdicional: "(intelecto*0.6)" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Dano elemental + (Intelecto * 0.7). Duração 4 turnos. A transmutação adiciona um efeito secundário leve (ex: Fogo causa queimadura, Ácido reduz armadura).", efeitoDetalhes: { formulaDanoAdicional: "(intelecto*0.7)", duracaoTurnos: 4, adicionaEfeitoSecundarioElementalLeve: true }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Dano elemental + (Intelecto * 0.8). Duração 4 turnos. Efeitos secundários moderados. Pode transmutar arcos/flechas para disparos elementais.", efeitoDetalhes: { formulaDanoAdicional: "(intelecto*0.8)", adicionaEfeitoSecundarioElementalModerado: true, permiteTransmutarArmaDistancia: true }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Dano elemental + (Intelecto * 1.0). Duração 5 turnos. Efeitos secundários potentes. Pode criar uma 'Lâmina Instável do Caos' que aplica um debuff aleatório poderoso ou um 'Escudo Reativo Alquímico' que retalia dano elemental.", efeitoDetalhes: { tipoEfeito: "transmutacao_mestra_alquimica", formulaDanoAdicional: "(intelecto*1.0)", duracaoTurnos: 5, adicionaEfeitoSecundarioElementalPotente: true, permiteTransmutarArmaDistancia: true, opcoesAvancadas: ["LaminaInstavelCaos", "EscudoReativoAlquimico"] } }
    ]
},
"classe_especial_guerreiro_alquimista_barricada_transitoria": {
    id: "classe_especial_guerreiro_alquimista_barricada_transitoria",
    nome: "Barricada Transitória",
    origemTipo: "classe_especial", origemNome: "Guerreiro Alquimista",
    tipo: "defesa_criacao_obstaculo_area",
    descricao: "Utilizando alquimia de campo, o guerreiro rapidamente solidifica o ar ou transmuta o solo para criar uma barricada física temporária que oferece cobertura ou impede a passagem.",
    cooldownSegundos: 45,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_guerreiro_alquimista_arsenal_volatil", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Cria uma barricada pequena (2m largura, 1m altura) com (Vitalidade * 3 + Intelecto * 2) PV. Dura 2 turnos ou até ser destruída.", efeitoDetalhes: { tipoCriacao: "barricada_fisica", larguraMetros: 2, alturaMetros: 1, formulaPVBarricada: "(vitalidade*3)+(intelecto*2)", duracaoMaxTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Barricada (2.5m larg, 1.2m alt) com PV (Vit*3.5 + Int*2.5). Dura 2 turnos.", efeitoDetalhes: { larguraMetros: 2.5, alturaMetros: 1.2, formulaPVBarricada: "(vitalidade*3.5)+(intelecto*2.5)" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Barricada (3m larg, 1.5m alt) com PV (Vit*4 + Int*3). Dura 3 turnos. Pode ser imbuída com espinhos que causam dano a quem tentar atravessar.", efeitoDetalhes: { larguraMetros: 3, alturaMetros: 1.5, formulaPVBarricada: "(vitalidade*4)+(intelecto*3)", duracaoMaxTurnos: 3, imbuiEspinhos: { formulaDano: "(intelecto*0.5)" } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Barricada (3.5m larg, 1.8m alt) com PV (Vit*4.5 + Int*3.5). Dura 3 turnos. Espinhos mais danosos. Pode criar duas barricadas menores.", efeitoDetalhes: { larguraMetros: 3.5, alturaMetros: 1.8, formulaPVBarricada: "(vitalidade*4.5)+(intelecto*3.5)", imbuiEspinhos: { formulaDano: "(intelecto*0.7)" }, permiteDuasBarricadasMenores: true }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Barricada (4m larg, 2m alt) com PV (Vit*5 + Int*4). Dura 4 turnos. Espinhos venenosos. Pode optar por criar uma Cúpula Defensiva Alquímica que protege de ataques à distância por 2 turnos.", efeitoDetalhes: { tipoCriacao: "barricada_mestra_ou_cupula", larguraMetros: 4, alturaMetros: 2, formulaPVBarricada: "(vitalidade*5)+(intelecto*4)", duracaoMaxTurnos: 4, imbuiEspinhosVenenosos: { formulaDanoVeneno: "(intelecto*0.3)", duracaoDoTVenenoso: 2 }, opcaoCupulaDefensiva: { duracaoTurnos: 2, protegeAtaqueDistancia: true } } }
    ]
},
"classe_especial_guerreiro_alquimista_elixir_do_berserker_metalico": {
    id: "classe_especial_guerreiro_alquimista_elixir_do_berserker_metalico",
    nome: "Elixir do Berserker Metálico",
    origemTipo: "classe_especial", origemNome: "Guerreiro Alquimista",
    tipo: "buff_pessoal_transformacao_parcial_ofensivo_defensivo",
    descricao: "O alquimista ingere um elixir potente que funde parcialmente metal à sua pele e arma, transformando-o em uma máquina de combate furiosa com força e resistência aumentadas, mas com perda de controle.",
    cooldownSegundos: 240,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_guerreiro_alquimista_transmutar_lamina", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Por 3 turnos: Força + (Int*0.3), Defesa Base + (Int*0.5). Ataques corpo-a-corpo causam dano adicional Metálico (Int*0.2). Chance de 10% de atacar o aliado mais próximo a cada turno.", efeitoDetalhes: { tipoEfeito: "transformacao_berserker_metalico", duracaoTurnos: 3, buffs: [{ atributo: "forca", formulaValor: "(intelecto*0.3)"}, { atributo: "defesaBase", formulaValor: "(intelecto*0.5)"}], danoAdicionalArma: { tipo: "Metalico", formulaValor: "(intelecto*0.2)"}, riscoFogoAmigoPercent: 0.10 }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Força + (Int*0.35), Defesa + (Int*0.6). Dano Metálico + (Int*0.25). Chance de fogo amigo 8%. Duração 3 turnos.", efeitoDetalhes: { buffs: [{ atributo: "forca", formulaValor: "(intelecto*0.35)"}, { atributo: "defesaBase", formulaValor: "(intelecto*0.6)"}], danoAdicionalArma: { formulaValor: "(intelecto*0.25)"}, riscoFogoAmigoPercent: 0.08 }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Força + (Int*0.4), Defesa + (Int*0.7). Dano Metálico + (Int*0.3). Chance de fogo amigo 6%. Duração 4 turnos. Ganha resistência a empurrões.", efeitoDetalhes: { duracaoTurnos: 4, buffs: [{ atributo: "forca", formulaValor: "(intelecto*0.4)"}, { atributo: "defesaBase", formulaValor: "(intelecto*0.7)"}], danoAdicionalArma: { formulaValor: "(intelecto*0.3)"}, riscoFogoAmigoPercent: 0.06, resistenciaEmpurrao: true }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Força + (Int*0.45), Defesa + (Int*0.8). Dano Metálico + (Int*0.35). Chance de fogo amigo 4%. Duração 4 turnos.", efeitoDetalhes: { buffs: [{ atributo: "forca", formulaValor: "(intelecto*0.45)"}, { atributo: "defesaBase", formulaValor: "(intelecto*0.8)"}], danoAdicionalArma: { formulaValor: "(intelecto*0.35)"}, riscoFogoAmigoPercent: 0.04 }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Força + (Int*0.55), Defesa + (Int*1.0). Dano Metálico + (Int*0.4). Chance de fogo amigo 2%. Duração 5 turnos. Imune a dor. Pode realizar um 'Golpe Devastador Metálico' uma vez (dano massivo, ignora armadura).", efeitoDetalhes: { tipoEfeito: "apoteose_berserker_metalico", duracaoTurnos: 5, buffs: [{ atributo: "forca", formulaValor: "(intelecto*0.55)"}, { atributo: "defesaBase", formulaValor: "(intelecto*1.0)"}], danoAdicionalArma: { formulaValor: "(intelecto*0.4)"}, riscoFogoAmigoPercent: 0.02, imunidadeDor: true, habilidadeEspecialUnica: { nome: "Golpe Devastador Metálico", formulaDano: "(forcaTransformado*2.5)", ignoraArmaduraTotal: true } } }
    ]
},
"classe_especial_guerreiro_alquimista_arsenal_volatil": {
    id: "classe_especial_guerreiro_alquimista_arsenal_volatil",
    nome: "Arsenal Volátil",
    origemTipo: "classe_especial", origemNome: "Guerreiro Alquimista",
    tipo: "habilidade_ativa_criacao_item_combate_area",
    descricao: "Num momento de necessidade, o Guerreiro Alquimista combina rapidamente reagentes instáveis para criar e arremessar uma série de pequenas bombas ou frascos com efeitos explosivos e debuffs variados em uma área.",
    cooldownSegundos: 120,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_guerreiro_alquimista_barricada_transitoria", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 40, efeitoDesc: "Arremessa 3 projéteis alquímicos em área (cone 5m). Cada um causa (Intelecto*0.6) de dano de um tipo elemental aleatório (Fogo, Gelo, Ácido).", efeitoDetalhes: { tipoEfeito: "arremesso_multiplo_alquimico", numeroProjeteis: 3, formatoArea: "cone", alcanceMetros: 5, formulaDanoPorProjetil: "(intelecto*0.6)", tipoDano: "ElementalAleatorioComum" }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 43, efeitoDesc: "4 projéteis. Dano (Intelecto*0.65). Podem aplicar debuffs elementais leves (queimadura, lentidão, corrosão leve).", efeitoDetalhes: { numeroProjeteis: 4, formulaDanoPorProjetil: "(intelecto*0.65)", aplicaDebuffElementalLeve: true }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 46, efeitoDesc: "5 projéteis. Dano (Intelecto*0.7). Raio de explosão individual maior. Debuffs elementais moderados. Pode incluir um projétil de Fumaça Ofuscante.", efeitoDetalhes: { numeroProjeteis: 5, formulaDanoPorProjetil: "(intelecto*0.7)", raioExplosaoIndividualMetros: 1, aplicaDebuffElementalModerado: true, incluiProjetilEspecial: "FumacaOfuscante" }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 49, efeitoDesc: "6 projéteis. Dano (Intelecto*0.75). Debuffs potentes. Pode incluir um projétil de Gás Paralisante (chance de paralisia breve).", efeitoDetalhes: { numeroProjeteis: 6, formulaDanoPorProjetil: "(intelecto*0.75)", aplicaDebuffElementalPotente: true, incluiProjetilEspecial: "GasParalisanteLeve" }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 52, efeitoDesc: "7 projéteis. Dano (Intelecto*0.85). Debuffs severos. Pode optar por concentrar todos os projéteis em um único 'Coquetel Alquímico Supremo' com dano massivo e múltiplos efeitos em um alvo ou pequena área.", efeitoDetalhes: { tipoEfeito: "arsenal_alquimico_mestre", numeroProjeteis: 7, formulaDanoPorProjetil: "(intelecto*0.85)", aplicaDebuffElementalSevero: true, opcaoConcentrada: { nome: "Coquetel Alquímico Supremo", formulaDanoConcentrado: "(intelecto*3.0)", efeitosMultiplosConcentrados: true, areaConcentradaMetros: 2 } } }
    ]
},
// --- FIM DOS FEITIÇOS DE GUERREIRO ALQUIMISTA ---

// --- FEITIÇOS DE CLASSE ESPECIAL: FERREIRO DIVINO ---
"classe_especial_ferreiro_divino_forja_elemental_rapida": {
    id: "classe_especial_ferreiro_divino_forja_elemental_rapida",
    nome: "Forja Elemental Rápida",
    origemTipo: "classe_especial", origemNome: "Ferreiro Divino",
    tipo: "buff_arma_criacao_temporaria",
    descricao: "Canalizando a mana da natureza e o fogo divino, o Ferreiro molda instantaneamente sua arma atual ou cria uma arma simples imbuída com poder elemental (Fogo, Terra, Metal Divino). Requer 'Essência Elemental Bruta' (componente temático).",
    cooldownSegundos: 18, // Cooldown para uma nova forja/imbuimento
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_ferreiro_divino_criacao_de_artefato_menor", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Arma (ou criada) causa + (Forca*0.4 + Intelecto*0.3) de dano do elemento escolhido (Fogo ou Terra) por 3 turnos. Arma criada tem dano base (Forca*0.5).", efeitoDetalhes: { tipoEfeito: "imbuir_ou_criar_arma_elemental", duracaoTurnos: 3, elementosDisponiveis: ["Fogo", "Terra"], formulaDanoAdicional: "(forca*0.4)+(intelecto*0.3)", formulaDanoArmaCriada: "(forca*0.5)", componenteTematico: "EssenciaElementalBruta" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Dano elemental + (For*0.5 + Int*0.35). Duração 3t. Adiciona 'Metal Divino' (dano físico puro, ignora parte da armadura).", efeitoDetalhes: { formulaDanoAdicional: "(forca*0.5)+(intelecto*0.35)", elementosDisponiveis: ["Fogo", "Terra", "MetalDivino"], penetracaoArmaduraMetalDivinoPercent: 0.10 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Dano elemental + (For*0.6 + Int*0.4). Duração 4t. Efeitos secundários leves (Fogo: queimadura; Terra: lentidão; Metal: sangramento).", efeitoDetalhes: { formulaDanoAdicional: "(forca*0.6)+(intelecto*0.4)", duracaoTurnos: 4, efeitoSecundarioElementalLeve: true, penetracaoArmaduraMetalDivinoPercent: 0.15 }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Dano elemental + (For*0.7 + Int*0.45). Duração 4t. Efeitos secundários moderados.", efeitoDetalhes: { formulaDanoAdicional: "(forca*0.7)+(intelecto*0.45)", efeitoSecundarioElementalModerado: true, penetracaoArmaduraMetalDivinoPercent: 0.20 }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Dano elemental + (For*0.85 + Int*0.5). Duração 5t. Efeitos secundários potentes. Pode forjar uma 'Lâmina da Alma da Montanha' que também concede +Vitalidade.", efeitoDetalhes: { formulaDanoAdicional: "(forca*0.85)+(intelecto*0.5)", duracaoTurnos: 5, efeitoSecundarioElementalPotente: true, penetracaoArmaduraMetalDivinoPercent: 0.25, opcaoForjaEspecial: { nomeArma: "Lâmina da Alma da Montanha", buffAdicional: { atributo: "vitalidade", formulaValor: "(intelecto*0.3)" } } } }
    ]
},
"classe_especial_ferreiro_divino_baluarte_de_adamante": {
    id: "classe_especial_ferreiro_divino_baluarte_de_adamante",
    nome: "Baluarte de Adamante",
    origemTipo: "classe_especial", origemNome: "Ferreiro Divino",
    tipo: "defesa_buff_pessoal_escudo_temporario",
    descricao: "Com maestria sobre os metais, o Ferreiro Divino forja instantaneamente um escudo de adamante espectral ou reforça sua armadura, concedendo defesa massiva por um curto período.",
    cooldownSegundos: 60,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_ferreiro_divino_armadura_runica_dos_deuses_antigos", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Ganha um escudo que absorve (Vitalidade*2.0 + Intelecto*1.0) de dano. Dura 2 turnos.", efeitoDetalhes: { alvo: "self", tipoBuff: "escudoHP", formulaValor: "(vitalidade*2.0)+(intelecto*1.0)", duracaoTurnos: 2 }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 27, efeitoDesc: "Escudo absorve (Vit*2.4 + Int*1.2). Dura 2 turnos.", efeitoDetalhes: { formulaValor: "(vitalidade*2.4)+(intelecto*1.2)" }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 29, efeitoDesc: "Escudo absorve (Vit*2.8 + Int*1.4). Dura 3 turnos. Enquanto ativo, concede +10% de Resistência a Dano Físico.", efeitoDetalhes: { formulaValor: "(vitalidade*2.8)+(intelecto*1.4)", duracaoTurnos: 3, buffResistencia: { tipo: "Fisico", percentual: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 31, efeitoDesc: "Escudo absorve (Vit*3.2 + Int*1.6). Dura 3 turnos. Resist. Dano Físico +15%.", efeitoDetalhes: { formulaValor: "(vitalidade*3.2)+(intelecto*1.6)", buffResistencia: { percentual: 0.15 } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 33, efeitoDesc: "Escudo absorve (Vit*3.8 + Int*1.9). Dura 4 turnos. Resist. Dano Físico +20%. Ao ser quebrado, o escudo explode causando (Forca*1.0) de dano de metal aos inimigos adjacentes.", efeitoDetalhes: { formulaValor: "(vitalidade*3.8)+(intelecto*1.9)", duracaoTurnos: 4, buffResistencia: { tipo: "Fisico", percentual: 0.20 }, efeitoAoQuebrar: { tipo: "dano_area_adjacente", tipoDano: "MetalPerfurante", formulaDano: "(forca*1.0)", raioMetros: 1.5 } } }
    ]
},
"classe_especial_ferreiro_divino_criacao_de_artefato_menor": {
    id: "classe_especial_ferreiro_divino_criacao_de_artefato_menor",
    nome: "Criação de Artefato Menor",
    origemTipo: "classe_especial", origemNome: "Ferreiro Divino",
    tipo: "utilidade_criacao_item_temporario_buff_aliado",
    descricao: "O Ferreiro Divino usa sua maestria para criar rapidamente um artefato mágico menor (arma ou amuleto) e entregá-lo a um aliado, concedendo um buff específico. O artefato dura alguns minutos ou um combate.",
    cooldownSegundos: 180, // Criar itens mágicos deve ter um cooldown considerável
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_ferreiro_divino_forja_elemental_rapida", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        // O Ferreiro escolhe o tipo de artefato e o buff.
        { nivel: 1, custoPM: 40, efeitoDesc: "Cria 1 Artefato (Amuleto da Vitalidade + (Int*0.2) Vit OU Adaga da Precisão + (Int*0.2) Agi). Dura 5 minutos.", efeitoDetalhes: { tipoEfeito: "criar_item_buff_temporario_aliado", opcoesArtefato: [{ nome: "Amuleto Vital Menor", buff: { atributo: "vitalidade", formulaValor: "(intelecto*0.2)" } }, { nome: "Adaga Precisa Menor", buff: { atributo: "agilidade", formulaValor: "(intelecto*0.2)" } }], duracaoMinutosItem: 5, maximoArtefatosSimultaneos: 1 }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 43, efeitoDesc: "Buffs dos artefatos + (Int*0.25). Adiciona opção: Broquel Refletor (pequena chance de refletir dano mágico menor).", efeitoDetalhes: { opcoesArtefatoAdd: [{ nome: "Broquel Refletor Menor", efeito: "chance_refletir_magia_fraca_10_percent" }], buffsFormulaValorMod: 0.25, duracaoMinutosItem: 7 }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 46, efeitoDesc: "Buffs + (Int*0.3). Duração 10 min. Adiciona: Espada da Chama Divina (dano de fogo adicional). Max 2 artefatos.", efeitoDetalhes: { opcoesArtefatoAdd: [{ nome: "Espada Chama Divina Menor", buff: { tipoDanoAdicional: "Fogo", formulaValor: "(intelecto*0.3)" } }], buffsFormulaValorMod: 0.3, duracaoMinutosItem: 10, maximoArtefatosSimultaneos: 2 }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 49, efeitoDesc: "Buffs + (Int*0.35). Duração 12 min. Adiciona: Martelo Quebra-Terra (chance de derrubar).", efeitoDetalhes: { opcoesArtefatoAdd: [{ nome: "Martelo Quebra-Terra Menor", efeito: "chance_derrubar_20_percent" }], buffsFormulaValorMod: 0.35, duracaoMinutosItem: 12 }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 52, efeitoDesc: "Buffs + (Int*0.4). Duração 15 min. Adiciona: Armadura da Égide Divina (concede escudo de HP temporário potente). Max 3 artefatos. Artefatos têm chance de não se desfazerem após o tempo.", efeitoDetalhes: { tipoEfeito: "mestre_forjador_divino", opcoesArtefatoAdd: [{ nome: "Armadura Égide Divina Menor", buff: { tipo: "escudoHP", formulaValor: "(intelecto*2.0)" } }], buffsFormulaValorMod: 0.4, duracaoMinutosItem: 15, maximoArtefatosSimultaneos: 3, chanceItemPermanecer: 0.15 } }
    ]
},
"classe_especial_ferreiro_divino_armadura_runica_dos_deuses_antigos": {
    id: "classe_especial_ferreiro_divino_armadura_runica_dos_deuses_antigos",
    nome: "Armadura Rúnica dos Deuses Antigos",
    origemTipo: "classe_especial", origemNome: "Ferreiro Divino",
    tipo: "buff_pessoal_transformacao_defensiva_ofensiva",
    descricao: "O Ferreiro Divino se reveste com uma armadura lendária, forjada com runas de poder imenso, tornando-se um avatar de guerra e proteção divina.",
    cooldownSegundos: 600, // Ultimate
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_ferreiro_divino_baluarte_de_adamante", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 60, efeitoDesc: "Por 3 turnos: Defesa Base + (Vit*1.5 + Int*1.0), Força + (Int*0.5 + For*0.5). Ataques imbuídos com 'Julgamento Divino' (dano Sagrado extra).", efeitoDetalhes: { tipoEfeito: "transformacao_avatar_divino", duracaoTurnos: 3, buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.5)+(intelecto*1.0)"}, { atributo: "forca", formulaValor: "(intelecto*0.5)+(forca*0.5)"}], imbuicaoArma: { nome: "Julgamento Divino", tipoDano: "Sagrado", formulaDanoAdicional: "(carisma*0.5 + intelecto*0.3)"} }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 65, efeitoDesc: "Defesa + (Vit*1.7 + Int*1.2), Força + (Int*0.6 + For*0.6). Duração 3t. Julgamento Divino mais forte.", efeitoDetalhes: { buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*1.7)+(intelecto*1.2)"}, { atributo: "forca", formulaValor: "(intelecto*0.6)+(forca*0.6)"}], imbuicaoArma: { formulaDanoAdicional: "(carisma*0.6 + intelecto*0.4)"} }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 70, efeitoDesc: "Defesa + (Vit*2.0 + Int*1.4), Força + (Int*0.7 + For*0.7). Duração 4t. Imune a controle mental leve. Libera uma 'Pulsação Protetora' a cada turno curando aliados próximos (Carisma*0.5).", efeitoDetalhes: { duracaoTurnos: 4, buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*2.0)+(intelecto*1.4)"}, { atributo: "forca", formulaValor: "(intelecto*0.7)+(forca*0.7)"}], imunidadeCondicao: ["ControleMentalLeve"], auraPassivaTransformado: { nome: "Pulsação Protetora", tipoCura: "PV", formulaCura: "(carisma*0.5)", raioMetros: 4 } }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 75, efeitoDesc: "Defesa + (Vit*2.3 + Int*1.6), Força + (Int*0.8 + For*0.8). Duração 4t. Pulsação Protetora mais forte. Pode usar 'Golpe da Forja Divina' (dano massivo único).", efeitoDetalhes: { buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*2.3)+(intelecto*1.6)"}, { atributo: "forca", formulaValor: "(intelecto*0.8)+(forca*0.8)"}], auraPassivaTransformado: { formulaCura: "(carisma*0.7)" }, habilidadeAtivaTransformado: { nome: "Golpe da Forja Divina", custoPM: 20, cooldownInternoTurnos: 0, formulaDano: "(forcaTransformado*2.0 + intelectoTransformado*1.0)", tipoDano: "DivinoFisico" } }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 80, efeitoDesc: "Defesa + (Vit*2.7 + Int*1.8), Força + (Int*1.0 + For*1.0). Duração 5t. Imune a controle mental. Pulsação Protetora e de Represália (reflete dano). 'Golpe da Forja Divina' aprimorado e pode ser usado 2x.", efeitoDetalhes: { tipoEfeito: "avatar_deus_ferreiro", duracaoTurnos: 5, buffs: [{ atributo: "defesaBase", formulaValor: "(vitalidade*2.7)+(intelecto*1.8)"}, { atributo: "forca", formulaValor: "(intelecto*1.0)+(forca*1.0)"}], imunidadeCondicao: ["ControleMentalTotal"], auraPassivaTransformado: { nome: "Aura da Forja Eterna", tipoCura: "PV", formulaCura: "(carisma*1.0)", raioMetros: 5, retaliacaoDanoPercentAura: 0.15 }, habilidadeAtivaTransformado: { nome: "Golpe da Forja Divina Suprema", usos: 2, formulaDano: "(forcaTransformado*2.5 + intelectoTransformado*1.2)" } } }
    ]
},
// --- FIM DOS FEITIÇOS DE FERREIRO DIVINO ---

// --- FEITIÇOS DE CLASSE ESPECIAL: ARAUTO DA FORTALEZA ---
"classe_especial_arauto_da_fortaleza_elo_de_vida": {
    id: "classe_especial_arauto_da_fortaleza_elo_de_vida",
    nome: "Elo de Vida",
    origemTipo: "classe_especial", origemNome: "Arauto Da Fortaleza",
    tipo: "cura_unico_transferencia_condicional",
    descricao: "Cria um elo vital com um aliado, curando-o. Em níveis mais altos, parte do dano sofrido pelo aliado pode ser redirecionado para o Arauto, ou o Arauto pode sacrificar sua própria vida para uma cura maior.",
    cooldownSegundos: 7,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_arauto_da_fortaleza_ultimo_bastião", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Cura (Carisma * 2.0 + Intelecto * 0.5) PV de um aliado.", efeitoDetalhes: { alvo: "aliado_unico", tipoCura: "PV", formulaCura: "(carisma*2.0)+(intelecto*0.5)" }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Cura (Carisma * 2.4 + Intelecto * 0.6) PV. Se o Arauto estiver com PV > 75%, a cura é 10% mais eficaz.", efeitoDetalhes: { formulaCura: "(carisma*2.4)+(intelecto*0.6)", bonusEficaciaCondicional: { condicao: "pvConjuradorPercent > 0.75", bonusPercent: 0.10 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Cura (Carisma * 2.8 + Intelecto * 0.7) PV. Por 2 turnos, 15% do dano que o aliado receberia é transferido para o Arauto (se ele tiver PV suficiente).", efeitoDetalhes: { formulaCura: "(carisma*2.8)+(intelecto*0.7)", redirecionamentoDano: { percentual: 0.15, duracaoTurnos: 2, maximoDanoRedirecionadoPorInstanciaPercentPVMaxArauto: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Cura (Carisma * 3.2 + Intelecto * 0.8) PV. Redirecionamento de 20% do dano por 3 turnos.", efeitoDetalhes: { formulaCura: "(carisma*3.2)+(intelecto*0.8)", redirecionamentoDano: { percentual: 0.20, duracaoTurnos: 3, maximoDanoRedirecionadoPorInstanciaPercentPVMaxArauto: 0.12 } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Cura (Carisma * 3.7 + Intelecto * 1.0) PV. Redirecionamento de 25% do dano por 3 turnos. O Arauto pode optar por sacrificar 15% de seu PV ATUAL para dobrar a cura base desta conjuração.", efeitoDetalhes: { formulaCura: "(carisma*3.7)+(intelecto*1.0)", redirecionamentoDano: { percentual: 0.25, duracaoTurnos: 3, maximoDanoRedirecionadoPorInstanciaPercentPVMaxArauto: 0.15 }, opcaoSacrificioParaAmpliarCura: { percentPVCusto: 0.15, multiplicadorCuraBase: 2.0 } } }
    ]
},
"classe_especial_arauto_da_fortaleza_santuario_protetor": {
    id: "classe_especial_arauto_da_fortaleza_santuario_protetor",
    nome: "Santuário Protetor",
    origemTipo: "classe_especial", origemNome: "Arauto Da Fortaleza",
    tipo: "buff_area_defesa_resistencia_aura",
    descricao: "Cria uma área sagrada de proteção ao redor do Arauto. Aliados dentro da área recebem bônus de defesa e resistência a efeitos negativos.",
    cooldownSegundos: 75,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_arauto_da_fortaleza_intervencao_divina_faramis", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 25, efeitoDesc: "Aura (raio 5m) por 3 turnos: Aliados ganham + (Carisma*0.2) de Defesa Base.", efeitoDetalhes: { alvo: "area_aliados_aura_movel", raioMetros: 5, duracaoTurnos: 3, buff: { atributo: "defesaBase", formulaValor: "(carisma*0.2)" } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 28, efeitoDesc: "Defesa Base + (Car*0.25). Raio 6m. Duração 3t. Concede +5% de Resistência a Debuffs.", efeitoDetalhes: { raioMetros: 6, buff: { formulaValor: "(carisma*0.25)" }, buffAdicional: { nome: "Resiliência do Santuário", atributo: "resistenciaDebuffPercent", valor: 0.05 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 31, efeitoDesc: "Defesa Base + (Car*0.3). Raio 7m. Duração 4t. Resist. Debuffs +10%. Remove 1 debuff de atributo menor ao entrar na aura.", efeitoDetalhes: { raioMetros: 7, duracaoTurnos: 4, buff: { formulaValor: "(carisma*0.3)" }, buffAdicional: { valor: 0.10 }, efeitoPurificacaoEntrada: { tipo: "debuff_atributo_menor", quantidade: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 34, efeitoDesc: "Defesa Base + (Car*0.35), +5% Resist. Mágica. Raio 8m. Duração 4t. Resist. Debuffs +15%.", efeitoDetalhes: { raioMetros: 8, buffs: [{ atributo: "defesaBase", formulaValor: "(carisma*0.35)"}, { atributo: "resistenciaMagica", modificador:"percentual_aditivo", valor: 0.05 }], buffAdicional: { valor: 0.15 } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 37, efeitoDesc: "Defesa Base + (Car*0.4), +10% Resist. Mágica. Raio 10m. Duração 5t. Resist. Debuffs +20%. Aliados na aura regeneram (Carisma*0.1) PV por turno.", efeitoDetalhes: { tipoEfeito: "santuario_supremo", raioMetros: 10, duracaoTurnos: 5, buffs: [{ atributo: "defesaBase", formulaValor: "(carisma*0.4)"}, { atributo: "resistenciaMagica", modificador:"percentual_aditivo", valor: 0.10 }], buffAdicional: { nome: "Fortaleza Inabalável", atributo: "resistenciaDebuffPercent", valor: 0.20 }, regeneracaoPVTurnoAura: "(carisma*0.1)" } }
    ]
},
"classe_especial_arauto_da_fortaleza_ultimo_bastiao": {
    id: "classe_especial_arauto_da_fortaleza_ultimo_bastiao",
    nome: "Último Bastião",
    origemTipo: "classe_especial", origemNome: "Arauto Da Fortaleza",
    tipo: "buff_unico_aliado_imortalidade_temporaria_sacrificio",
    descricao: "Em um ato de devoção suprema, o Arauto concede a um aliado à beira da morte um breve período de invulnerabilidade, absorvendo o dano que seria fatal ou se sacrificando para impedir a morte do companheiro.",
    cooldownSegundos: 900, // Cooldown extremamente alto (Ultimate de sacrifício/proteção)
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_arauto_da_fortaleza_elo_de_vida", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 50, custoVidaPercentArauto: 0.50, efeitoDesc: "Alvo aliado com <10% PV: Se o Arauto sacrificar 50% de seu PV ATUAL, o aliado não pode morrer por 1 turno (PV não cai abaixo de 1).", efeitoDetalhes: { alvo: "aliado_unico_critico", condicaoPVAlvoPercent: 0.10, tipoEfeito: "imortalidade_temporaria_sacrificio_parcial", duracaoImortalidadeTurnos: 1 }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 50, custoVidaPercentArauto: 0.45, efeitoDesc: "Imortalidade por 1 turno. Sacrifício de 45% PV.", efeitoDetalhes: { duracaoImortalidadeTurnos: 1 }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 45, custoVidaPercentArauto: 0.40, efeitoDesc: "Imortalidade por 2 turnos. Sacrifício de 40% PV. O aliado também recebe uma cura massiva (Carisma*3) no final do efeito.", efeitoDetalhes: { duracaoImortalidadeTurnos: 2, curaFinal: { formulaCura: "(carisma*3.0)" } }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 45, custoVidaPercentArauto: 0.35, efeitoDesc: "Imortalidade por 2 turnos. Sacrifício de 35% PV. Cura massiva e remove todos os debuffs do aliado.", efeitoDetalhes: { duracaoImortalidadeTurnos: 2, curaFinal: { formulaCura: "(carisma*3.5)" }, purificacaoTotalDebuffs: true }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 40, custoVidaPercentArautoOpcionalMorte: true, efeitoDesc: "Imortalidade por 3 turnos. O Arauto pode escolher ser Nocauteado (PV a 1) para garantir o efeito sem custo de PM e curar o aliado completamente. Se o Arauto for Nocauteado desta forma, ele tem chance de se auto-reviver com 20% PV após 1 minuto.", efeitoDetalhes: { alvo: "aliado_unico_critico", tipoEfeito: "intervencao_sacrificial_suprema", duracaoImortalidadeTurnos: 3, opcaoNocauteArauto: { curaTotalAliado: true, removeTodosDebuffsAliado: true, chanceAutoReviverArauto: { chance: 0.25, percentPVReviver: 0.20, tempoParaReviverMin: 1 } } } }
    ]
},
"classe_especial_arauto_da_fortaleza_intervencao_divina_faramis": { // Nome inspirado em Faramis
    id: "classe_especial_arauto_da_fortaleza_intervencao_divina_faramis",
    nome: "Intervenção Divina (Estilo Faramis)",
    origemTipo: "classe_especial", origemNome: "Arauto Da Fortaleza",
    tipo: "ultimate_reviver_area_buff_poderoso",
    descricao: "O Arauto canaliza uma poderosa energia divina, criando uma área onde aliados caídos podem retornar à batalha com parte de sua vitalidade, e aliados de pé são fortalecidos.",
    cooldownSegundos: 1200, // Cooldown de ultimate de grande impacto
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_arauto_da_fortaleza_santuario_protetor", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 80, efeitoDesc: "Cria área (raio 6m) por 10 segundos. Aliados que morrerem na área revivem com 20% PV/PM. Aliados vivos na área ganham +10% Dano e Defesa.", efeitoDetalhes: { tipoEfeito: "area_reviver_buff_faramis", raioMetros: 6, duracaoSegundosArea: 10, percentPVPMReviver: 0.20, buffAliadosVivos: { buffs: [{atributo:"danoCausadoPercent", valor:0.10},{atributo:"defesaBasePercent", valor:0.10}] } }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 85, efeitoDesc: "Revive com 25% PV/PM. Buff +12% Dano/Defesa. Raio 7m.", efeitoDetalhes: { raioMetros: 7, percentPVPMReviver: 0.25, buffAliadosVivos: { buffs: [{valor:0.12},{valor:0.12}] } }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 90, efeitoDesc: "Revive com 30% PV/PM. Buff +15% Dano/Defesa. Raio 8m, duração 12s. Aliados revividos ganham breve imunidade a dano (1s).", efeitoDetalhes: { raioMetros: 8, duracaoSegundosArea: 12, percentPVPMReviver: 0.30, buffAliadosVivos: { buffs: [{valor:0.15},{valor:0.15}] }, imunidadePosReviverSegundos: 1 }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 95, efeitoDesc: "Revive com 35% PV/PM. Buff +18% Dano/Defesa. Raio 9m, duração 12s.", efeitoDetalhes: { raioMetros: 9, percentPVPMReviver: 0.35, buffAliadosVivos: { buffs: [{valor:0.18},{valor:0.18}] } }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 100, efeitoDesc: "Revive com 40% PV/PM. Buff +20% Dano/Defesa e +10% Velocidade de Ação. Raio 10m, duração 15s. Aliados revividos ganham um escudo de (Carisma*2.0) PV.", efeitoDetalhes: { tipoEfeito: "intervencao_divina_suprema", raioMetros: 10, duracaoSegundosArea: 15, percentPVPMReviver: 0.40, buffAliadosVivos: { buffs: [{atributo:"danoCausadoPercent", valor:0.20},{atributo:"defesaBasePercent", valor:0.20}, {atributo:"velocidadeAcao", valor:0.10}] }, escudoPosReviver: { formulaValor: "(carisma*2.0)" } } }
    ]
},
// --- FIM DOS FEITIÇOS DE ARAUTO DA FORTALEZA ---

   // --- FEITIÇOS DE CLASSE ESPECIAL: ARLEQUIM SANGUINÁRIO ---
"classe_especial_arlequim_sanguinario_risada_histerica": {
    id: "classe_especial_arlequim_sanguinario_risada_histerica",
    nome: "Risada Histérica",
    origemTipo: "classe_especial", origemNome: "Arlequim Sanguinário",
    tipo: "debuff_area_controle_mental_dano_psiquico",
    descricao: "O Arlequim solta uma gargalhada maníaca e contagiante que ecoa na mente dos inimigos, causando confusão, medo e um leve dano psíquico.",
    cooldownSegundos: 30,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_arlequim_sanguinario_gran_finale_sangrento", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 15, efeitoDesc: "Inimigos em raio de 5m têm 30% de chance de ficarem Confusos (atacam aleatoriamente) por 1 turno. Causa (Carisma*0.5) de dano Psíquico.", efeitoDetalhes: { alvo: "area_inimigos", raioMetros: 5, tipoDano: "Psiquico", formulaDano: "(carisma*0.5)", condicao: { nome: "Confusão Histérica", chance: 0.30, duracaoTurnos: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 17, efeitoDesc: "Chance de Confusão 35%. Dano Psíquico (Car*0.6). Raio 6m.", efeitoDetalhes: { raioMetros: 6, formulaDano: "(carisma*0.6)", condicao: { chance: 0.35 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 19, efeitoDesc: "Chance de Confusão 40% por 2 turnos ou Medo (alvo foge) por 1 turno (50/50 chance de qual efeito). Dano Psíquico (Car*0.7). Raio 7m.", efeitoDetalhes: { raioMetros: 7, formulaDano: "(carisma*0.7)", condicaoAleatoria: [{ nome: "Confusão Profunda", chance: 0.40, duracaoTurnos: 2 }, { nome: "Pânico Incontrolável", chance: 0.40, duracaoTurnos: 1 }] }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 21, efeitoDesc: "Chance dos efeitos 45%. Dano Psíquico (Car*0.8). Raio 8m. Inimigos afetados também têm chance de largar suas armas.", efeitoDetalhes: { raioMetros: 8, formulaDano: "(carisma*0.8)", condicaoAleatoria: [{ chance: 0.45 }, { chance: 0.45 }], chanceLargarArma: 0.20 }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 23, efeitoDesc: "Chance dos efeitos 50% por 2 turnos (ambos podem aplicar). Dano Psíquico (Car*1.0). Raio 10m. Inimigos afetados pela Risada recebem +20% de dano dos próximos ataques do Arlequim.", efeitoDetalhes: { tipoEfeito: "cacofonia_da_loucura", raioMetros: 10, formulaDano: "(carisma*1.0)", condicoesMultiplas: [{ nome: "Confusão Absoluta", chance: 0.50, duracaoTurnos: 2 }, { nome: "Terror Paralisante", chance: 0.50, duracaoTurnos: 2 }], debuffAdicionalAlvosAfetados: { nome: "Marca do Bufão", efeitoDesc: "+20% dano recebido do Arlequim", duracaoTurnos: 2 } } }
    ]
},
"classe_especial_arlequim_sanguinario_danca_das_mil_facas": {
    id: "classe_especial_arlequim_sanguinario_danca_das_mil_facas",
    nome: "Dança das Mil Facas",
    origemTipo: "classe_especial", origemNome: "Arlequim Sanguinário",
    tipo: "ataque_fisico_area_rapido_combo",
    descricao: "O Arlequim se move com velocidade caótica, desferindo uma série de cortes rápidos com suas lâminas em todos os inimigos próximos. Cada golpe tem chance de causar sangramento.",
    cooldownSegundos: 18,
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_arlequim_sanguinario_cortina_de_ilusões_letais", aoAtingirNivel: 5 } ],
    niveis: [
        // Esta habilidade pode ser um único "pulso" de dano em área, ou uma série de ataques rápidos.
        { nivel: 1, custoPM: 20, efeitoDesc: "Ataca até 3 inimigos em raio de 3m. Cada um recebe (Agilidade*0.7 + Forca*0.4) de dano Físico. 15% de chance de Sangramento (dano Agi*0.1/turno por 2t).", efeitoDetalhes: { alvo: "multi_area_rapida", maxAlvos: 3, raioMetros: 3, tipoDano: "Cortante", formulaDanoPorAlvo: "(agilidade*0.7)+(forca*0.4)", condicao: { nome: "SangramentoJocoso", chance: 0.15, duracaoTurnosDoT: 2, formulaDanoPorTurno: "(agilidade*0.1)" } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 22, efeitoDesc: "Até 3 alvos. Dano (Agi*0.8 + For*0.45). Chance Sangramento 20%. Raio 3.5m.", efeitoDetalhes: { formulaDanoPorAlvo: "(agilidade*0.8)+(forca*0.45)", condicao: { chance: 0.20 }, raioMetros: 3.5 }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 24, efeitoDesc: "Até 4 alvos. Dano (Agi*0.9 + For*0.5). Chance Sangramento 25% (dano Agi*0.15/turno por 3t). Raio 4m. O Arlequim se move erraticamente, ganhando +10% Esquiva durante a dança.", efeitoDetalhes: { maxAlvos: 4, raioMetros: 4, formulaDanoPorAlvo: "(agilidade*0.9)+(forca*0.5)", condicao: { nome: "SangramentoProfundo", chance: 0.25, duracaoTurnosDoT: 3, formulaDanoPorTurno: "(agilidade*0.15)" }, buffDuranteAcao: { atributo: "chanceEsquiva", valor: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 26, efeitoDesc: "Até 4 alvos. Dano (Agi*1.0 + For*0.55). Chance Sangramento 30%. Raio 4.5m. Esquiva +15%.", efeitoDetalhes: { formulaDanoPorAlvo: "(agilidade*1.0)+(forca*0.55)", condicao: { chance: 0.30 }, raioMetros: 4.5, buffDuranteAcao: { valor: 0.15 } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 28, efeitoDesc: "Até 5 alvos. Dano (Agi*1.2 + For*0.6). Chance Sangramento 35% (dano Agi*0.2/turno por 3t). Raio 5m. Esquiva +20%. Se um alvo morrer, o cooldown da Dança é reduzido em 50%.", efeitoDetalhes: { tipoEfeito: "frenesi_de_laminas_mortais", maxAlvos: 5, raioMetros: 5, formulaDanoPorAlvo: "(agilidade*1.2)+(forca*0.6)", condicao: { nome: "HemorragiaCaotica", chance: 0.35, duracaoTurnosDoT: 3, formulaDanoPorTurno: "(agilidade*0.2)" }, buffDuranteAcao: { atributo: "chanceEsquiva", valor: 0.20 }, efeitoAoMatarAlvo: "reduz_cooldown_percent_50" } }
    ]
},
"classe_especial_arlequim_sanguinario_gran_finale_sangrento": {
    id: "classe_especial_arlequim_sanguinario_gran_finale_sangrento",
    nome: "Gran Finale Sangrento",
    origemTipo: "classe_especial", origemNome: "Arlequim Sanguinário",
    tipo: "ataque_unico_execucao_condicional_poderoso",
    descricao: "O Arlequim prepara sua 'piada final' para um alvo. Se o alvo estiver sob efeito de medo, confusão ou com PV baixo, o golpe é devastador, muitas vezes fatal, e pode causar uma explosão de alegria sádica (buff para o Arlequim).",
    cooldownSegundos: 120,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_arlequim_sanguinario_risada_histerica", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 35, efeitoDesc: "Causa (Forca*1.5 + Agi*1.0) de dano Físico. Dano x2 se alvo <25% PV ou sob Medo/Confusão. Se fatal, Arlequim ganha +10% Agilidade por 2 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "PerfuranteCritico", formulaDanoBase: "(forca*1.5)+(agilidade*1.0)", multiplicadorCondicional: { condicoes: ["pv_alvo_percent_inferior_0.25", "alvo_com_medo", "alvo_com_confusao"], multiplicador: 2.0 }, efeitoAoMatar: { buffPessoal: { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 2 } } }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 38, efeitoDesc: "Dano base (For*1.7 + Agi*1.1). Dano x2.25 condicional. Buff Agi +12%.", efeitoDetalhes: { formulaDanoBase: "(forca*1.7)+(agilidade*1.1)", multiplicadorCondicional: { multiplicador: 2.25 }, efeitoAoMatar: { buffPessoal: { valor: 0.12 } } }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 41, efeitoDesc: "Dano base (For*1.9 + Agi*1.2). Dano x2.5 condicional. Buff Agi +15% e recupera 10% PM se fatal. Ignora 15% da armadura do alvo se a condição for atendida.", efeitoDetalhes: { formulaDanoBase: "(forca*1.9)+(agilidade*1.2)", multiplicadorCondicional: { multiplicador: 2.5, penetracaoArmaduraPercentSeCondicao: 0.15 }, efeitoAoMatar: { buffPessoal: { atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.15, duracaoTurnos: 3 }, recuperaPMPercentCusto: 0.10 } }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 44, efeitoDesc: "Dano base (For*2.1 + Agi*1.3). Dano x2.75 condicional. Buff Agi +18%. Ignora 20% armadura.", efeitoDetalhes: { formulaDanoBase: "(forca*2.1)+(agilidade*1.3)", multiplicadorCondicional: { multiplicador: 2.75, penetracaoArmaduraPercentSeCondicao: 0.20 }, efeitoAoMatar: { buffPessoal: { valor: 0.18 } } }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 47, efeitoDesc: "Dano base (For*2.4 + Agi*1.5). Dano x3 condicional. Buff Agi +20%, +10% Chance Crítico e recupera 20% PM se fatal. Ignora 25% armadura. Se fatal, a morte do alvo causa Medo em inimigos próximos a ele.", efeitoDetalhes: { tipoEfeito: "execucao_sadica_suprema", formulaDanoBase: "(forca*2.4)+(agilidade*1.5)", multiplicadorCondicional: { multiplicador: 3.0, penetracaoArmaduraPercentSeCondicao: 0.25 }, efeitoAoMatar: { buffsPessoais: [{ atributo: "agilidade", modificador: "percentual_aditivo", valor: 0.20, duracaoTurnos: 3 }, { atributo: "chanceCritico", modificador: "percentual_aditivo", valor: 0.10, duracaoTurnos: 3 }], recuperaPMPercentCusto: 0.20, efeitoAreaAoMatar: { nome: "TerrorContagiante", raioMetros: 4, condicao: { nome: "MedoPorMorte", chance: 0.5, duracaoTurnos: 1 } } } } }
    ]
},
"classe_especial_arlequim_sanguinario_cortina_de_ilusões_letais": {
    id: "classe_especial_arlequim_sanguinario_cortina_de_ilusões_letais",
    nome: "Cortina de Ilusões Letais",
    origemTipo: "classe_especial", origemNome: "Arlequim Sanguinário",
    tipo: "utilidade_furtividade_engano_armadilha_mental",
    descricao: "O Arlequim desaparece em uma explosão de confetes e risadas, tornando-se invisível e deixando para trás múltiplas armadilhas ilusórias que atormentam a mente de quem as ativa.",
    cooldownSegundos: 150,
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_arlequim_sanguinario_danca_das_mil_facas", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Fica invisível por 2 turnos. Deixa 2 armadilhas ilusórias. Se ativadas, causam (Carisma*0.5) de dano Psíquico e Confusão Leve por 1t.", efeitoDetalhes: { tipoEfeito: "desaparecimento_com_armadilhas_ilusorias", duracaoInvisibilidadeTurnos: 2, numeroArmadilhas: 2, armadilha: { tipoGatilho: "proximidade_ou_interacao", efeitoAoAtivar: { tipoDano: "Psiquico", formulaDano: "(carisma*0.5)", condicao: { nome: "ConfusaoOnirica", chance: 0.4, duracaoTurnos: 1 } } } }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 33, efeitoDesc: "Invisível por 3t. 3 armadilhas. Dano Psíquico (Car*0.6). Confusão mais provável.", efeitoDetalhes: { duracaoInvisibilidadeTurnos: 3, numeroArmadilhas: 3, armadilha: { formulaDano: "(carisma*0.6)", condicao: { chance: 0.5 } } }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 36, efeitoDesc: "Invisível por 3t. 4 armadilhas. Dano Psíquico (Car*0.7). Armadilhas podem causar Medo em vez de Confusão.", efeitoDetalhes: { numeroArmadilhas: 4, armadilha: { formulaDano: "(carisma*0.7)", condicaoAlternativa: { nome: "MedoIlusorio", chance: 0.3, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 39, efeitoDesc: "Invisível por 4t. 5 armadilhas. Dano Psíquico (Car*0.8). Efeitos mais potentes.", efeitoDetalhes: { duracaoInvisibilidadeTurnos: 4, numeroArmadilhas: 5, armadilha: { formulaDano: "(carisma*0.8)", condicao: { chance: 0.6, duracaoTurnos: 2 }, condicaoAlternativa: { chance: 0.4, duracaoTurnos: 2 } } }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 42, efeitoDesc: "Invisível por 5t. 6 armadilhas. Dano Psíquico (Car*1.0). Armadilhas podem causar 'Loucura Temporária' (alvo ataca aleatoriamente com bônus de dano, mas também pode se ferir). O Arlequim pode detonar as armadilhas restantes de uma vez.", efeitoDetalhes: { tipoEfeito: "mestre_do_picadeiro_macabro", duracaoInvisibilidadeTurnos: 5, numeroArmadilhas: 6, armadilha: { tipoGatilho: "proximidade_interacao_ou_comando", efeitoAoAtivar: { tipoDano: "Psiquico", formulaDano: "(carisma*1.0)", condicaoEspecial: { nome: "LoucuraTemporaria", chance: 0.3, duracaoTurnos: 2, efeitoDesc: "Ataca aleatoriamente, +dano, chance de auto-dano" } } }, permiteDetonacaoManualArmadilhas: true } }
    ]
},
// --- FIM DOS FEITIÇOS DE ARLEQUIM SANGUINÁRIO --- 

// --- FEITIÇOS DE CLASSE ESPECIAL: DEUS NECROMANTE ---
"classe_especial_deus_necromante_toque_da_nao_vida_supremo": {
    id: "classe_especial_deus_necromante_toque_da_nao_vida_supremo",
    nome: "Toque da Não-Vida Supremo",
    origemTipo: "classe_especial", origemNome: "Deus Necromante",
    tipo: "ataque_magico_unico_drenagem_maldicao_mortal",
    descricao: "Um toque imbuído com a essência da não-vida, causando dano necrótico massivo, drenando grandes quantidades de vida e mana, e aplicando uma maldição que impede a ressurreição por meios comuns.",
    cooldownSegundos: 10, // Cooldown baixo para um ADM Master
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_deus_necromante_legiao_dos_eternos_condenados", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 20, efeitoDesc: "Causa (Intelecto * 2.5) de dano Necrótico. Drena 50% do dano como PV e 25% como PM. Alvo amaldiçoado: -50% eficácia de cura recebida por 3 turnos.", efeitoDetalhes: { alvo: "unico", tipoDano: "NecroticoPuro", formulaDano: "(intelecto*2.5)", drenagemVidaPercent: 0.50, drenagemPMPercent: 0.25, maldicao: { nome: "Marca da Não-Vida", efeitoDesc: "-50% cura recebida", duracaoTurnos: 3 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 18, efeitoDesc: "Dano (Int*3.0). Drena 60% PV, 30% PM. Maldição: -75% cura.", efeitoDetalhes: { formulaDano: "(intelecto*3.0)", drenagemVidaPercent: 0.60, drenagemPMPercent: 0.30, maldicao: { efeitoDesc: "-75% cura recebida" } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 16, efeitoDesc: "Dano (Int*3.5). Drena 70% PV, 35% PM. Maldição: Impede cura mágica por 3 turnos. Se o alvo morrer, ele se reanima instantaneamente como um Espectro Menor sob seu comando (máx 1).", efeitoDetalhes: { formulaDano: "(intelecto*3.5)", drenagemVidaPercent: 0.70, drenagemPMPercent: 0.35, maldicao: { nome: "Selo da Tumba", efeitoDesc: "Impede cura mágica", duracaoTurnos: 3 }, efeitoAoMatar: { tipo: "invocacao_permanente_controlada", nomeCriatura: "Espectro Menor", maximo: 1 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 14, efeitoDesc: "Dano (Int*4.0). Drena 80% PV, 40% PM. Maldição: Impede toda cura por 4 turnos. Espectro reanimado é mais forte.", efeitoDetalhes: { formulaDano: "(intelecto*4.0)", drenagemVidaPercent: 0.80, drenagemPMPercent: 0.40, maldicao: { nome: "Abraço do Vazio Eterno", efeitoDesc: "Impede toda cura", duracaoTurnos: 4 }, efeitoAoMatar: { nomeCriatura: "Espectro Guardião" } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 10, efeitoDesc: "Dano (Int*5.0). Drena 100% do dano como PV e 50% como PM. Maldição: Impede ressurreição por meios não divinos/artefatos supremos. Se o alvo morrer, sua alma é aprisionada, podendo ser usada para fortalecer o Deus Necromante ou suas invocações.", efeitoDetalhes: { tipoEfeito: "toque_obliterador_divino", formulaDano: "(intelecto*5.0)", drenagemVidaPercent: 1.0, drenagemPMPercent: 0.50, maldicaoFinal: { nome: "Oblívio da Alma", impedeRessurreicaoComum: true }, efeitoAoMatarAvancado: { tipo: "aprisionar_alma", usosAlma: ["buff_pessoal_permanente_menor", "fortalecer_invocacoes"] } } }
    ]
},
"classe_especial_deus_necromante_comando_sobre_os_mortos_supremo": {
    id: "classe_especial_deus_necromante_comando_sobre_os_mortos_supremo",
    nome: "Comando Sobre os Mortos Supremo",
    origemTipo: "classe_especial", origemNome: "Deus Necromante",
    tipo: "invocacao_multipla_controle_mortos_vivos",
    descricao: "Com um gesto, o Deus Necromante ergue uma horda de mortos-vivos poderosos de qualquer cadáver próximo ou os invoca diretamente do Vazio. Pode também tentar dominar mortos-vivos existentes, incluindo os de outros necromantes.",
    cooldownSegundos: 60, // Cooldown relativamente baixo para um ADM
    maxNivel: 5,
    requisitosParaAprender: [], // Habilidade inicial
    desbloqueiaFeiticos: [ { idFeitico: "classe_especial_deus_necromante_aura_da_morte_eterna", aoAtingirNivel: 5 } ],
    niveis: [
        { nivel: 1, custoPM: 30, efeitoDesc: "Reanima/Invoca 2-4 Esqueletos Guerreiros ou Zumbis Robustos. Duração: até serem destruídos. Pode tentar controlar 1 morto-vivo inimigo de baixo nível.", efeitoDetalhes: { tipoInvocacao: "multipla_mortos_vivos_basicos", opcoesInvocacao: [{nome: "Esqueleto Guerreiro", min:2, max:4}, {nome:"Zumbi Robusto", min:2, max:4}], duracao: "permanente_ate_destruir", tentarControleMortoVivoInimigo: { nivelMaximoControlavel: "baixo", quantidade: 1 } }, pontosParaProximoNivel: 3 },
        { nivel: 2, custoPM: 35, efeitoDesc: "Reanima/Invoca 3-5 Esqueletos Arqueiros ou Aparições Menores. Pode controlar 2 mortos-vivos de baixo nível.", efeitoDetalhes: { opcoesInvocacao: [{nome: "Esqueleto Arqueiro", min:3, max:5}, {nome:"Aparição Menor", min:3, max:5}], tentarControleMortoVivoInimigo: { quantidade: 2 } }, pontosParaProximoNivel: 4 },
        { nivel: 3, custoPM: 40, efeitoDesc: "Reanima/Invoca 1 Cavaleiro da Morte ou 2 Lichs Menores. Duração: permanente. Pode controlar 1 morto-vivo inimigo de nível médio. Mortos-vivos sob seu comando ganham +10% de dano e PV.", efeitoDetalhes: { tipoInvocacao: "multipla_mortos_vivos_elite_menor", opcoesInvocacao: [{nome: "Cavaleiro da Morte", quantidade:1}, {nome:"Lich Menor", quantidade:2}], tentarControleMortoVivoInimigo: { nivelMaximoControlavel: "medio", quantidade: 1 }, buffInvocacoesComandadas: { atributos: ["danoCausadoPercent", "pvMaxPercent"], valor: 0.10 } }, pontosParaProximoNivel: 5 },
        { nivel: 4, custoPM: 45, efeitoDesc: "Reanima/Invoca 2 Cavaleiros da Morte ou 1 Lorde Espectral. Pode controlar mortos-vivos de nível alto (exceto únicos/chefes). Buff para invocações +15%.", efeitoDetalhes: { opcoesInvocacao: [{nome: "Cavaleiro da Morte", quantidade:2}, {nome:"Lorde Espectral", quantidade:1}], tentarControleMortoVivoInimigo: { nivelMaximoControlavel: "alto_nao_unico" }, buffInvocacoesComandadas: { valor: 0.15 } }, pontosParaProximoNivel: 7 },
        { nivel: 5, custoPM: 50, efeitoDesc: "Reanima/Invoca uma pequena legião (5-8 unidades variadas de elite) OU um Dragão Esquelético colossal. Duração: permanente. Pode dominar instantaneamente qualquer morto-vivo não-divino. Todas as suas invocações ganham +25% de dano e PV e regeneram lentamente.", efeitoDetalhes: { tipoInvocacao: "legiao_ou_colosso_necromantico", opcaoLegiao: { nome: "Legião da Desolação", quantidadeMin:5, quantidadeMax:8, tiposUnidades: ["CavaleiroDaMorte", "LichMenor", "LordeEspectral"]}, opcaoColosso: { nome: "Dragão Esquelético Ancestral" }, dominarMortoVivoNaoDivinoInstantaneo: true, buffInvocacoesComandadasSupremo: { atributos: ["danoCausadoPercent", "pvMaxPercent"], valor: 0.25, regeneracaoLenta: true } } }
    ]
},
"classe_especial_deus_necromante_legiao_dos_eternos_condenados": {
    id: "classe_especial_deus_necromante_legiao_dos_eternos_condenados",
    nome: "Legião dos Eternos Condenados",
    origemTipo: "classe_especial", origemNome: "Deus Necromante",
    tipo: "invocacao_massa_ultimate_exercito",
    descricao: "O Deus Necromante abre um portal para o próprio abismo da não-vida, convocando um exército de mortos-vivos de elite e criaturas necromânticas aterrorizantes que varrem o campo de batalha. Este é um ato de poder cataclísmico.",
    cooldownSegundos: 3600, // Cooldown muito, muito alto (1 hora real)
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_deus_necromante_comando_sobre_os_mortos_supremo", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 150, efeitoDesc: "Invoca 10 Cavaleiros da Morte e 5 Lichs Menores. Duram 5 minutos ou até serem destruídos.", efeitoDetalhes: { tipoEfeito: "convocar_exercito_dos_mortos_1", unidades: [{nome:"Cavaleiro da Morte", quantidade:10}, {nome:"Lich Menor", quantidade:5}], duracaoMinutos: 5 }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 175, efeitoDesc: "Invoca 15 Cavaleiros da Morte, 7 Lichs Menores e 2 Lordes Espectrais. Duração 7 minutos.", efeitoDetalhes: { unidades: [{nome:"Cavaleiro da Morte", quantidade:15}, {nome:"Lich Menor", quantidade:7}, {nome:"Lorde Espectral", quantidade:2}], duracaoMinutos: 7 }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 200, efeitoDesc: "Invoca 20 Cavaleiros da Morte, 10 Lichs Menores, 3 Lordes Espectrais e 1 Devorador de Almas (criatura única poderosa). Duração 10 minutos. As unidades são 10% mais fortes.", efeitoDetalhes: { unidades: [{nome:"Cavaleiro da Morte", quantidade:20}, {nome:"Lich Menor", quantidade:10}, {nome:"Lorde Espectral", quantidade:3}, {nome:"Devorador de Almas", quantidade:1}], duracaoMinutos: 10, buffUnidadesPercent: 0.10 }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 225, efeitoDesc: "Invoca uma horda maior e mais variada, incluindo Abominações de Carne e Ceifadores Espectrais. Duração 12 minutos. Unidades 15% mais fortes.", efeitoDetalhes: { tipoEfeito: "convocar_exercito_dos_mortos_avancado", unidadesAdicionais: [{nome:"Abominação de Carne", quantidade:5}, {nome:"Ceifador Espectral", quantidade:3}], duracaoMinutos: 12, buffUnidadesPercent: 0.15 }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 250, efeitoDesc: "Invoca uma legião quase infinita de todos os tipos de mortos-vivos de elite, liderados por três Generais Lichs pessoalmente nomeados pelo Deus Necromante. Duração 15 minutos ou até o objetivo ser cumprido. As unidades são 25% mais fortes e podem se reconstruir uma vez se destruídas (com 50% PV).", efeitoDetalhes: { tipoEfeito: "apocalipse_necromantico_total", unidadesDescricao: "Horda massiva e variada de elite", lideres: [{nome:"General Lich Comandante", quantidade:3, habilidadesUnicasLider:true}], duracaoMinutosOuObjetivo: 15, buffUnidadesPercent: 0.25, habilidadeUnidades: "auto_reconstrucao_uma_vez" } }
    ]
},
"classe_especial_deus_necromante_aura_da_morte_eterna": {
    id: "classe_especial_deus_necromante_aura_da_morte_eterna",
    nome: "Aura da Morte Eterna",
    origemTipo: "classe_especial", origemNome: "Deus Necromante",
    tipo: "aura_passiva_ativa_devastadora_controle_total",
    descricao: "Uma aura palpável de energia necromântica roxa envolve o Deus Necromante. Passivamente, drena a vida de inimigos próximos e fortalece mortos-vivos aliados. Ativamente, pode ser expandida para causar terror, paralisia ou obliterar instantaneamente seres fracos.",
    cooldownSegundos: 10, // Cooldown para a ativação de efeitos mais potentes da aura
    maxNivel: 5,
    requisitosParaAprender: [ { idFeitico: "classe_especial_deus_necromante_toque_da_nao_vida_supremo", nivelMinimo: 5 } ],
    desbloqueiaFeiticos: [],
    niveis: [
        { nivel: 1, custoPM: 0, // Custo para manter a aura passiva, PM para ativar efeitos
          efeitoDesc: "Passivo (Raio 5m): Inimigos perdem (Int*0.1) PV/turno. Mortos-vivos aliados ganham +10% Dano. Ativo (Custo 30PM): Expande a aura para 10m por 1 turno, causando Medo (chance 50%).", 
          efeitoDetalhes: { passivo: { nomeAura: "Sopro da Tumba", raioMetros: 5, drenagemPVInimigosTurno: "(intelecto*0.1)", buffMortosVivosAliados: { atributo: "danoCausadoPercent", valor: 0.10 } }, ativo: { custoPMAtivacao: 30, nomeEfeitoAtivo: "Onda de Terror Necrótico", raioMetrosExpansao: 10, duracaoTurnosExpansao: 1, condicao: { nome: "Medo da Morte", chance: 0.50 } } }, pontosParaProximoNivel: 4 },
        { nivel: 2, custoPM: 0, efeitoDesc: "Passivo: Raio 6m, Drena (Int*0.15) PV. Buff Mortos-Vivos +12% Dano/PV. Ativo (Custo 35PM): Medo (chance 60%) ou Lentidão Severa (-50% Agi).", 
          efeitoDetalhes: { passivo: { raioMetros: 6, drenagemPVInimigosTurno: "(intelecto*0.15)", buffMortosVivosAliados: { atributos: ["danoCausadoPercent", "pvMaxPercent"], valor: 0.12 } }, ativo: { custoPMAtivacao: 35, condicaoAlternativa: { nome: "Lentidão Tumular", chance: 0.60, debuffAgilidadePercent: 0.50 } } }, pontosParaProximoNivel: 5 },
        { nivel: 3, custoPM: 0, efeitoDesc: "Passivo: Raio 7m, Drena (Int*0.2) PV e (Int*0.05) PM. Buff Mortos-Vivos +15%. Ativo (Custo 40PM): Medo/Lentidão (chance 70%) ou Paralisia (chance 30%) por 1 turno. Impede ressurreição na aura.", 
          efeitoDetalhes: { passivo: { raioMetros: 7, drenagemPVInimigosTurno: "(intelecto*0.2)", drenagemPMInimigosTurno: "(intelecto*0.05)", buffMortosVivosAliados: { valor: 0.15 }, impedeRessurreicaoAura: true }, ativo: { custoPMAtivacao: 40, condicaoAlternativaAvancada: { nome: "Toque Paralisante do Vazio", chance: 0.30, duracaoTurnos: 1 } } }, pontosParaProximoNivel: 7 },
        { nivel: 4, custoPM: 0, efeitoDesc: "Passivo: Raio 8m, Drena (Int*0.25) PV/PM. Buff Mortos-Vivos +20%. Ativo (Custo 45PM): Efeitos anteriores mais potentes ou chance de obliterar instantaneamente 1 inimigo não-elite com PV < 15% (sem saque de alma).", 
          efeitoDetalhes: { passivo: { raioMetros: 8, drenagemPVInimigosTurno: "(intelecto*0.25)", drenagemPMInimigosTurno: "(intelecto*0.25)", buffMortosVivosAliados: { valor: 0.20 } }, ativo: { custoPMAtivacao: 45, opcaoExecucaoInstantanea: { nome: "Ceifar Alma Frágil", chance: 0.50, condicaoPVAlvoPercent: 0.15, tipoAlvo: "nao_elite" } } }, pontosParaProximoNivel: 9 },
        { nivel: 5, custoPM: 0, efeitoDesc: "Passivo: Raio 10m, Drena (Int*0.3) PV/PM. Buff Mortos-Vivos +25% e eles se reconstroem uma vez. Ativo (Custo 50PM): Expande a aura para 20m, todos os efeitos de controle (Medo, Paralisia, Obliterar fracos) com alta chance. O Deus Necromante pode se tornar imortal por 2 turnos (não pode cair abaixo de 1 PV) uma vez por ativação da aura.", 
          efeitoDetalhes: { tipoEfeito: "manifestacao_da_propria_morte", passivo: { nomeAura: "Domínio da Morte Eterna", raioMetros: 10, drenagemPVInimigosTurno: "(intelecto*0.3)", drenagemPMInimigosTurno: "(intelecto*0.3)", buffMortosVivosAliados: { valor: 0.25, autoReconstrucao: true }, impedeRessurreicaoAuraTotal: true }, ativo: { custoPMAtivacao: 50, nomeEfeitoAtivo: "Decreto do Oblívio", raioMetrosExpansao: 20, efeitosMultiplosPotentes: true, buffPessoalImortalidadeTemporaria: { duracaoTurnos: 2, usosPorAtivacaoAura: 1 } } } }
    ]
}

}
// --- FIM DOS FEITIÇOS DE DEUS NECROMANTE ---

    
const fichaModeloArcadia = {
    _id: "", // ID do Discord do Jogador
    nomeJogadorSalvo: "", // Nome de usuário do Discord
    nomePersonagem: "N/A",
    raca: "A Ser Definida",
    classe: "A Ser Definida",
    origemReino: "N/A",
    nivel: 1,
    xpAtual: 0,
    xpProximoNivel: 100, // Calculado por calcularXpProximoNivel(nivel)
    atributos: {
        forca: 5,
        agilidade: 5,
        vitalidade: 5,
        manabase: 5, // Usado para calcular PM Max
        intelecto: 5,
        carisma: 5,
        pontosParaDistribuir: 30
    },
    pvMax: 0, // Calculado: (vitalidade * 5) + (nivel * 5) + 20
    pvAtual: 0,
    pmMax: 0, // Calculado: (manabase * 5) + (nivel * 3) + 10
    pmAtual: 0,
    ataqueBase: 0,
    defesaBase: 0,
    resistenciaMagica: 0, // Novo atributo base para cálculo
    reputacao: {},
    florinsDeOuro: 50,
    essenciaDeArcadia: 0,
    pontosDeFeitico:0,
    habilidadesEspeciais: [],
    pericias: [],
    magiasConhecidas: [], // Array de objetos: { id: "id_feitico", nivel: 1 }
    equipamento: {
        maoDireita: null, maoEsquerda: null, armaduraCorpo: null,
        elmo: null, amuleto: null, anel1: null, anel2: null
    },
    cooldownsFeiticos: {}, // { "id_feitico_idJogador": timestamp_proximo_uso }
    inventario: [
        { ...JSON.parse(JSON.stringify(ITENS_BASE_ARCADIA["adaga simples"])), quantidade: 1 },
        { ...JSON.parse(JSON.stringify(ITENS_BASE_ARCADIA["rações de viagem"])), quantidade: 3 }
    ],
    historiaPersonagem: "",
    idiomas: ["Comum Arcádiano"],
    condicoes: [], // Array de objetos: { nome: "Envenenado", duracaoTurnos: 3, efeito: "..." }
    cooldownsItens: {}, // { "nome_item_lowercase_idJogador": timestamp_proximo_uso }
    ultimaAtualizacao: "",
    logMissoes: [],
    notacoesDM: ""
};

// =====================================================================================
// CONEXÃO COM BANCO DE DADOS E CACHE DE FICHAS
// =====================================================================================
// ... outras require e constantes ...
let dbClient;
let fichasCollection;
let npcsCollection; // Declarada aqui, no escopo do módulo
let missoesCollection; // Adicionando para futuras missões
let todasAsFichas = {}; // Cache local das fichas




    async function conectarMongoDB() { // <-- Certifique-se que 'async' está aqui
    if (dbClient && dbClient.topology && dbClient.topology.isConnected()) {
        console.log("MongoDB já conectado.");
        return;
    }
    if (!MONGODB_URI) {
        console.error("--- ERRO FATAL: MONGODB_URI não definida! Configure-a nos Secrets ou .env ---");
        throw new Error("MONGODB_URI não definida");
    }
    try {
        console.log("Tentando conectar ao MongoDB Atlas...");
        dbClient = new MongoClient(MONGODB_URI);
        await dbClient.connect(); // <-- 'await' está dentro de uma função async
        const db = dbClient.db(MONGODB_DB_NAME);
        fichasCollection = db.collection(MONGODB_FICHAS_COLLECTION);
        npcsCollection = db.collection("npcs_arcadia"); 
        missoesCollection = db.collection("missoes_arcadia");

        console.log("Conectado com sucesso ao MongoDB Atlas e às coleções:", MONGODB_FICHAS_COLLECTION, ", npcs_arcadia, e missoes_arcadia"); 

    } catch (error) {
        console.error("ERRO CRÍTICO ao conectar ao MongoDB:", error);
        throw error;
    }
}

async function carregarFichasDoDB() {
    if (!fichasCollection) {
        console.error("Coleção de fichas não inicializada. Tentando reconectar ao DB...");
        await conectarMongoDB(); // Garante que npcsCollection também será inicializada se a conexão cair
        if (!fichasCollection) {
            console.error("Falha ao reconectar e inicializar coleção de fichas. Carregamento de fichas abortado.");
            return;
        }
    }
    console.log("Carregando fichas do DB para cache...");
    try {
        const fichasDoDB = await fichasCollection.find({}).toArray();
        todasAsFichas = {}; // Limpa o cache antes de carregar
        fichasDoDB.forEach(fichaDB => {
            const idJogador = String(fichaDB._id);
            todasAsFichas[idJogador] = {
                ...JSON.parse(JSON.stringify(fichaModeloArcadia)),
                ...fichaDB,
                _id: idJogador,
                atributos: { ...JSON.parse(JSON.stringify(fichaModeloArcadia.atributos)), ...(fichaDB.atributos || {}) },
                inventario: fichaDB.inventario && Array.isArray(fichaDB.inventario) ? fichaDB.inventario : [],
                magiasConhecidas: fichaDB.magiasConhecidas && Array.isArray(fichaDB.magiasConhecidas) ? fichaDB.magiasConhecidas : [],
                cooldownsFeiticos: fichaDB.cooldownsFeiticos || {},
                cooldownsItens: fichaDB.cooldownsItens || {},
                logMissoes: fichaDB.logMissoes && Array.isArray(fichaDB.logMissoes) ? fichaDB.logMissoes : [] // Garante que logMissoes exista
            };
        });
        console.log(`${Object.keys(todasAsFichas).length} fichas carregadas para o cache.`);
    } catch (error) {
        console.error("Erro ao carregar fichas do MongoDB para o cache:", error);
    }
}

async function getFichaOuCarregar(idJogadorDiscord) {
    const idNormalizado = String(idJogadorDiscord);
    let ficha = todasAsFichas[idNormalizado];
    if (!ficha && fichasCollection) {
        try {
            console.log(`Ficha para ${idNormalizado} não encontrada no cache. Buscando no DB...`);
            const fichaDB = await fichasCollection.findOne({ _id: idNormalizado });
            if (fichaDB) {
                ficha = {
                    ...JSON.parse(JSON.stringify(fichaModeloArcadia)),
                    ...fichaDB,
                    _id: idNormalizado,
                    atributos: { ...JSON.parse(JSON.stringify(fichaModeloArcadia.atributos)), ...(fichaDB.atributos || {}) },
                    inventario: fichaDB.inventario && Array.isArray(fichaDB.inventario) ? fichaDB.inventario : [],
                    magiasConhecidas: fichaDB.magiasConhecidas && Array.isArray(fichaDB.magiasConhecidas) ? fichaDB.magiasConhecidas : [],
                    cooldownsFeiticos: fichaDB.cooldownsFeiticos || {},
                    cooldownsItens: fichaDB.cooldownsItens || {}
                };
                todasAsFichas[idNormalizado] = ficha;
                console.log(`Ficha para ${idNormalizado} carregada do DB e adicionada ao cache.`);
            } else {
                console.log(`Nenhuma ficha encontrada no DB para ${idNormalizado}.`);
                return null;
            }
        } catch (dbError) {
            console.error(`Erro ao buscar ficha ${idNormalizado} no DB:`, dbError);
            return null;
        }
    }

    if (ficha) {
        if (!ficha.atributos) ficha.atributos = JSON.parse(JSON.stringify(fichaModeloArcadia.atributos));
        if (typeof ficha.nivel !== 'number' || ficha.nivel < 1) ficha.nivel = 1;
        ficha.pvMax = (ficha.atributos.vitalidade * 5) + (ficha.nivel * 5) + 20;
        ficha.pmMax = (ficha.atributos.manabase * 5) + (ficha.nivel * 3) + 10;
        if (typeof ficha.pvAtual !== 'number' || ficha.pvAtual > ficha.pvMax || ficha.pvAtual < 0) ficha.pvAtual = ficha.pvMax;
        if (typeof ficha.pmAtual !== 'number' || ficha.pmAtual > ficha.pmMax || ficha.pmAtual < 0) ficha.pmAtual = ficha.pmMax;
        if (typeof ficha.xpProximoNivel !== 'number') ficha.xpProximoNivel = calcularXpProximoNivel(ficha.nivel);
    }
    return ficha;
}

async function salvarFichaNoDB(idJogadorDiscord, fichaData) {
    if (!fichasCollection) {
        console.error("Coleção de fichas não inicializada. Não foi possível salvar a ficha:", idJogadorDiscord);
        return;
    }
    const idNormalizado = String(idJogadorDiscord);
    try {
        const { _id, ...dadosParaSalvar } = fichaData;
        await fichasCollection.updateOne(
            { _id: idNormalizado },
            { $set: dadosParaSalvar },
            { upsert: true }
        );
    } catch (error) {
        console.error(`Erro ao salvar ficha ${idNormalizado} no MongoDB:`, error);
    }
}

async function atualizarFichaNoCacheEDb(idJogadorDiscord, ficha) {
    const idNormalizado = String(idJogadorDiscord);
    ficha.ultimaAtualizacao = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    if (!ficha.atributos) ficha.atributos = JSON.parse(JSON.stringify(fichaModeloArcadia.atributos));
    if (typeof ficha.nivel !== 'number' || ficha.nivel < 1) ficha.nivel = 1;
    ficha.pvMax = (ficha.atributos.vitalidade * 5) + (ficha.nivel * 5) + 20;
    ficha.pmMax = (ficha.atributos.manabase * 5) + (ficha.nivel * 3) + 10;

    if (ficha.pvAtual > ficha.pvMax) ficha.pvAtual = ficha.pvMax;
    if (ficha.pmAtual > ficha.pmMax) ficha.pmAtual = ficha.pmMax;
    if (ficha.pvAtual < 0) ficha.pvAtual = 0;
    if (ficha.pmAtual < 0) ficha.pmAtual = 0;

    if (typeof ficha.xpProximoNivel !== 'number') ficha.xpProximoNivel = calcularXpProximoNivel(ficha.nivel);

    todasAsFichas[idNormalizado] = ficha;
    await salvarFichaNoDB(idNormalizado, ficha);
}

function calcularXpProximoNivel(nivelAtual) {
    return (nivelAtual * 100) + 50;
}


function calcularPFGanhosNoNivel(novoNivelPersonagem) {
    if (novoNivelPersonagem <= 1) return 0; // Não ganha PF ao atingir o nível 1 (já começa com 0)

    let pfGanhosBase = 2;
    // A cada 5 níveis, aumenta 1 PF ganho por nível a partir dali
    // Ex: Nv 1-4 ganha 2. Nv 5-9 ganha 3. Nv 10-14 ganha 4.
    const incrementos = Math.floor((novoNivelPersonagem - 1) / 5); // Quantos blocos de 5 níveis foram completados
    pfGanhosBase += incrementos;

    // Você pode querer um teto para o ganho de PF por nível, se houver um nível máximo muito alto
    // Ex: pfGanhosBase = Math.min(pfGanhosBase, 7); // Limita a um máximo de 7 PF por nível
    return pfGanhosBase;
}

// =====================================================================================
// FUNÇÕES DE LÓGICA DE COMANDOS
// =====================================================================================

function gerarEmbedErro(titulo, descricao) {
    return new EmbedBuilder().setColor(0xFF0000).setTitle(`❌ ${titulo}`).setDescription(descricao);
}

function gerarEmbedSucesso(titulo, descricao) {
    return new EmbedBuilder().setColor(0x00FF00).setTitle(`✅ ${titulo}`).setDescription(descricao);
}

function gerarEmbedAviso(titulo, descricao) {
    return new EmbedBuilder().setColor(0xFFCC00).setTitle(`⚠️ ${titulo}`).setDescription(descricao);
}

function gerarMensagemBoasVindas(nomeUsuarioDiscord) {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🌟 Saudações, ${nomeUsuarioDiscord}! Bem-vindo(a) a Arcádia! 🌟`)
        .setDescription("Um mundo medieval vibrante com magia, mas também repleto de perigos...\n\nUse `/comandos` para ver a lista de ações disponíveis.\nUse `/criar` para iniciar sua jornada!")
        .setFooter({text: "Que seus dados rolem a seu favor!"});
}

function gerarEmbedHistoria() {
    return new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle("📜 ARCÁDIA — A ERA DOS REINOS 📜")
        .setDescription('*"Quando os deuses dormem... os mortos despertam."*')
        .addFields(
            { name: "Um Equilíbrio Desfeito", value: "O mundo de Arcádia já conheceu eras de ouro, onde os reinos coexistiam em equilíbrio instável, entre florestas encantadas, cidades flutuantes e fortalezas forjadas sob montanhas. Mas toda paz é uma pausa... e a escuridão sempre encontra seu caminho de volta." },
            { name: "O Despertar Sombrio", value: "Há trinta ciclos lunares, uma presença antiga rompeu os véus entre vida e morte. Sebastian Azakin, o Deus Necromante, despertou dos abismos esquecidos do mundo. Sua alma, banida pelos próprios deuses, retornou com poder sombrio suficiente para dobrar os reinos mais orgulhosos. Com um exército de vazios e mortos silenciosos, ele não quer governar — ele quer reescrever o destino." },
            { name: "A Sombra se Espalha", value: "Sob sua sombra, as fronteiras ruíram. Ravengard se ergueu em guerra, a Ilha de Morwyn sussurrou segredos antes proibidos, e os Sombrios marcharam novamente. Em Valdoria, reis hesitam. Em Elarion, as árvores choram. Em Caelum, nem os Seraphim ousam pronunciar seu nome." },
            { name: "O Chamado", value: "Mas o mundo não pertence apenas aos deuses.\n\nAgora, aventureiros de todas as raças — puros, humanos, mistos e até impuros — despertam para um chamado inevitável. Você pode ser um herói, um traidor, um explorador ou um monstro. Escolha sua raça, seu reino, sua classe... e descubra quem você será nesta nova era de trevas e possibilidades." }
        )
        .setFooter({ text: "Pois em Arcádia, até mesmo os mortos têm histórias para contar..." });
}

function gerarListaRacasEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle("📜 Raças de Arcádia 📜")
        .setDescription("Escolha uma raça para seu personagem. Use o nome exato no comando `/criar`.");
    RACAS_ARCADIA.forEach(raca => {
        embed.addFields({ name: `${raca.nome} (${raca.grupo})`, value: `*${raca.desc}*`, inline: false });
    });
    return embed;
}

function gerarListaClassesEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("⚔️ Classes de Arcádia ⚔️")
        .setDescription("Escolha uma classe. Use o nome exato no comando `/criar`.");
    CLASSES_ARCADIA.forEach(classe => {
        embed.addFields({ name: classe.nome, value: `*${classe.desc}*`, inline: true });
    });
    return embed;
}

function gerarListaReinosEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🏰 Reinos de Arcádia 🏰")
        .setDescription("Escolha um reino de origem. Use o nome exato no comando `/criar`.");
    REINOS_ARCADIA.forEach(reino => {
        embed.addFields({ name: reino.nome, value: `*${reino.desc}*`, inline: false });
    });
    return embed;
}

async function processarCriarFichaSlash(idJogadorDiscord, nomeJogadorDiscord, nomePersonagem, racaNomeInput, classeNomeInput, reinoNomeInput) {
    const fichaExistente = await getFichaOuCarregar(idJogadorDiscord);
    if (fichaExistente && fichaExistente.nomePersonagem !== "N/A") {
        return gerarEmbedAviso("Personagem Já Existente", `Você já tem: **${fichaExistente.nomePersonagem}**. Use \`/ficha\` para vê-lo.`);
    }

    const racaValida = RACAS_ARCADIA.find(r => r.nome.toLowerCase() === racaNomeInput.toLowerCase());
    const classeValida = CLASSES_ARCADIA.find(c => c.nome.toLowerCase() === classeNomeInput.toLowerCase());
    const reinoValido = REINOS_ARCADIA.find(reino => reino.nome.toLowerCase() === reinoNomeInput.toLowerCase());

    let errorMessages = [];
    if (!nomePersonagem || nomePersonagem.length < 3 || nomePersonagem.length > 25) {
        errorMessages.push("Nome do personagem deve ter entre 3 e 25 caracteres.");
    }
    if (!racaValida) { errorMessages.push(`Raça "${racaNomeInput}" inválida. Use \`/listaracas\`.`); }
    if (!classeValida) { errorMessages.push(`Classe "${classeNomeInput}" inválida. Use \`/listaclasses\`.`); }
    if (!reinoValido) { errorMessages.push(`Reino "${reinoNomeInput}" inválido. Use \`/listareinos\`.`); }

    if (errorMessages.length > 0) {
        return gerarEmbedErro("Erro na Criação", errorMessages.join("\n"));
    }

    let novaFicha = JSON.parse(JSON.stringify(fichaModeloArcadia));
    novaFicha._id = String(idJogadorDiscord);
    novaFicha.nomeJogadorSalvo = nomeJogadorDiscord;
    novaFicha.nomePersonagem = nomePersonagem;
    novaFicha.raca = racaValida.nome;
    novaFicha.classe = classeValida.nome;
    novaFicha.origemReino = reinoValido.nome;

    await atualizarFichaNoCacheEDb(idJogadorDiscord, novaFicha);

    return gerarEmbedSucesso("🎉 Personagem Criado! 🎉",
        `**${nomePersonagem}** (${novaFicha.raca} ${novaFicha.classe} de ${novaFicha.origemReino}) foi criado para ${nomeJogadorDiscord}!\n\nUse \`/distribuirpontos\` para gastar seus 30 pontos iniciais e depois \`/ficha\` para ver seu personagem.`
    ).setTimestamp();
}

async function processarVerFichaEmbed(idAlvoDiscord, isAdminConsultandoOutro, idInvocadorOriginal, nomeInvocadorOriginal) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    const nomeAlvoDisplay = (ficha && ficha.nomeJogadorSalvo) ? ficha.nomeJogadorSalvo : `ID: ${idAlvoDiscord}`;

    if (!ficha || ficha.nomePersonagem === "N/A") {
        let desc = "Ficha não encontrada.";
        if (idAlvoDiscord === idInvocadorOriginal) {
            desc = "Sua ficha não foi encontrada. Use `/criar` para começar sua aventura!";
        } else if (isAdminConsultandoOutro) {
            desc = `Ficha para ${nomeAlvoDisplay} não encontrada.`;
        }
        return gerarEmbedErro("Ficha não Encontrada", desc);
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099FF) // Você pode escolher uma cor que combine com seu RPG
        .setTitle(`🌟 Ficha de Personagem: ${ficha.nomePersonagem} 🌟`)
        .setThumbnail(null) // Você pode adicionar uma URL de imagem do personagem aqui se tiver, ex: ficha.urlImagemPersonagem
        .setDescription(`*Uma visão geral do aventureiro ${ficha.nomePersonagem}, ${ficha.raca} ${ficha.classe} de ${ficha.origemReino}.*`) // Descrição um pouco mais elaborada
        .addFields(
            // --- NOVOS CAMPOS PARA RAÇA, CLASSE E REINO ---
            { name: '📜 Raça', value: ficha.raca || 'Não definida', inline: true },
            { name: '⚔️ Classe', value: ficha.classe || 'Não definida', inline: true },
            { name: '🏰 Reino de Origem', value: ficha.origemReino || 'Não definido', inline: true },
            // --- FIM DOS NOVOS CAMPOS ---

            { name: '👤 Jogador Discord', value: ficha.nomeJogadorSalvo || 'N/A', inline: true },
            { name: '✨ Nível', value: `${ficha.nivel} (XP: ${ficha.xpAtual}/${ficha.xpProximoNivel})`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, // Campo vazio para ajudar no alinhamento, pode ser ajustado

            { name: '❤️ PV (Pontos de Vida)', value: `${ficha.pvAtual} / ${ficha.pvMax}`, inline: true },
            { name: '💧 PM (Pontos de Mana)', value: `${ficha.pmAtual} / ${ficha.pmMax}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, // Outro campo vazio para layout

            { name: '💰 Moedas', value: `🪙 ${ficha.florinsDeOuro || 0} Florins de Ouro\n💎 ${ficha.essenciaDeArcadia || 0} Essências de Arcádia`, inline: false }
        );

    let atributosStr = "";
    if (ficha.atributos) {
        for (const [attr, valor] of Object.entries(ficha.atributos)) {
            if (attr !== "pontosParaDistribuir") {
                // Formata o nome do atributo para melhor leitura
                let nomeAtributoFormatado = attr.charAt(0).toUpperCase() + attr.slice(1);
                if (nomeAtributoFormatado === "Manabase") nomeAtributoFormatado = "Mana Base";
                atributosStr += `**${nomeAtributoFormatado}**: ${valor}\n`;
            }
        }
        const pontosParaDistribuir = ficha.atributos.pontosParaDistribuir || 0;
        if (pontosParaDistribuir > 0) {
            const msgPontos = (idAlvoDiscord === idInvocadorOriginal) ? "Você tem" : `${ficha.nomePersonagem} tem`;
            atributosStr += `\n✨ ${msgPontos} **${pontosParaDistribuir}** pontos para distribuir${(idAlvoDiscord === idInvocadorOriginal) ? " (Use `/distribuirpontos`)" : "."}`;
        }
    } else {
        atributosStr = "Atributos não definidos.";
    }
    embed.addFields({ name: '🧠 Atributos', value: atributosStr || 'N/A', inline: false });

    let inventarioStr = "Inventário vazio.";
    if (ficha.inventario && ficha.inventario.length > 0) {
        const itensValidos = ficha.inventario.filter(i => i && i.itemNome);
        if (itensValidos.length > 0) {
            inventarioStr = itensValidos.slice(0, 10).map(i => `• ${i.itemNome} (x${i.quantidade || 0})`).join('\n');
            if (itensValidos.length > 10) inventarioStr += `\n*...e mais ${itensValidos.length - 10} item(s).*`;
        }
    }
    embed.addFields({ name: '🎒 Inventário (Primeiros 10 itens)', value: inventarioStr, inline: true });

    let equipamentoStr = "Nenhum item equipado.";
    if (ficha.equipamento) {
        let tempEqStr = "";
        const slotsEquipamento = [
            { key: 'maoDireita', nome: 'Mão Direita' },
            { key: 'maoEsquerda', nome: 'Mão Esquerda' },
            { key: 'elmo', nome: 'Elmo' },
            { key: 'armaduraCorpo', nome: 'Peitoral' },
            { key: 'amuleto', nome: 'Amuleto' },
            { key: 'anel1', nome: 'Anel 1' },
            { key: 'anel2', nome: 'Anel 2' }
        ];

        slotsEquipamento.forEach(slotInfo => {
            const itemEquipado = ficha.equipamento[slotInfo.key];
            if (itemEquipado) {
                const nomeItem = (typeof itemEquipado === 'object' && itemEquipado.itemNome) ? itemEquipado.itemNome : String(itemEquipado);
                tempEqStr += `**${slotInfo.nome}**: ${nomeItem}\n`;
            }
        });
        if (tempEqStr) equipamentoStr = tempEqStr.trim();
    }
    embed.addFields({ name: '⚙️ Equipamento', value: equipamentoStr, inline: true });

    // Adicionando um campo em branco para separar as seções de inventário/equipamento e magias
    if(inventarioStr !== "Inventário vazio." || equipamentoStr !== "Nenhum item equipado.") {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: false }); // Espaço em branco de largura total
    }


    let magiasStr = "Nenhum feitiço conhecido.";
    if (ficha.magiasConhecidas && ficha.magiasConhecidas.length > 0) {
        magiasStr = ficha.magiasConhecidas.slice(0, 10).map(magia => { // Limitar a 10 magias também
            const feiticoBase = FEITICOS_BASE_ARCADIA[magia.id];
            return feiticoBase ? `• ${feiticoBase.nome} (Nível ${magia.nivel})` : `• Feitiço Desconhecido (ID: ${magia.id})`;
        }).join('\n');
        if (ficha.magiasConhecidas.length > 10) magiasStr += `\n*...e mais ${ficha.magiasConhecidas.length - 10} feitiço(s).*`;
    }
    embed.addFields({ name: '🔮 Feitiços Conhecidos (Primeiros 10)', value: magiasStr, inline: false});

    embed.setFooter({ text: `Consultada por ${nomeInvocadorOriginal} | Arcádia RPG • Atualizada em: ${ficha.ultimaAtualizacao || 'Data não registrada'}` })
        new Date(); // Usa a data da última atualização ou a data atual

    return embed;
}

async function processarDistribuirPontosSlash(idJogadorDiscord, atributosOpcoes) {
    const ficha = await getFichaOuCarregar(idJogadorDiscord);
    if (!ficha || ficha.nomePersonagem === "N/A") {
        return gerarEmbedErro("Erro", "Sua ficha não foi encontrada ou não está completa. Use `/criar`.");
    }

    const pontosDisponiveis = ficha.atributos.pontosParaDistribuir || 0;
    if (pontosDisponiveis <= 0) {
        return gerarEmbedAviso("Sem Pontos", "Você não tem pontos de atributo para distribuir no momento.");
    }

    let totalPontosSolicitados = 0;
    let mudancas = {};
    let errosParse = [];

    for (const atrInput in atributosOpcoes) {
        const atrKey = atrInput.toLowerCase().replace('manabase', 'manaBase');
        if (atributosValidos.includes(atrKey)) {
            const valorInt = atributosOpcoes[atrInput];
            if (valorInt <= 0) {
                errosParse.push(`Valor para '${atrKey}' (${valorInt}) deve ser positivo.`);
            } else {
                mudancas[atrKey] = (mudancas[atrKey] || 0) + valorInt;
                totalPontosSolicitados += valorInt;
            }
        }
    }

    if (errosParse.length > 0) {
        return gerarEmbedErro("Erro na Distribuição", "Valores inválidos:\n- " + errosParse.join("\n- "));
    }
    if (totalPontosSolicitados === 0) {
        return gerarEmbedAviso("Nenhuma Alteração", `Nenhum ponto foi especificado para distribuição. Você tem ${pontosDisponiveis} pontos.`);
    }
    if (totalPontosSolicitados > pontosDisponiveis) {
        return gerarEmbedErro("Pontos Insuficientes", `Você tentou usar ${totalPontosSolicitados} pontos, mas só tem ${pontosDisponiveis} disponíveis.`);
    }

    let feedbackMudancasTexto = [];
    for (const atributo in mudancas) {
        const valorAntigo = ficha.atributos[atributo] || 0;
        ficha.atributos[atributo] = valorAntigo + mudancas[atributo];
        feedbackMudancasTexto.push(`**${atributo.charAt(0).toUpperCase() + atributo.slice(1).replace('base',' Base')}**: ${valorAntigo} + ${mudancas[atributo]} → ${ficha.atributos[atributo]}`);
    }
    ficha.atributos.pontosParaDistribuir -= totalPontosSolicitados;

    await atualizarFichaNoCacheEDb(idJogadorDiscord, ficha);

    return gerarEmbedSucesso(`Pontos Distribuídos para ${ficha.nomePersonagem}!`,
        feedbackMudancasTexto.join("\n")
    ).addFields({ name: '✨ Pontos Restantes', value: `**${ficha.atributos.pontosParaDistribuir}**` }).setTimestamp();
}

async function aprenderFeitico(idJogador, idFeitico) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha || ficha.nomePersonagem === "N/A") {
        return { erro: "Sua ficha não foi encontrada ou não está completa. Use `/criar`." };
    }
    const feiticoBase = FEITICOS_BASE_ARCADIA[idFeitico];
    if (!feiticoBase) {
        return { erro: "Feitiço desconhecido. Verifique o nome." };
    }

    // 1. Checar se o jogador já conhece o feitiço
    if (ficha.magiasConhecidas.some(m => m.id === idFeitico)) {
        return { erro: "Você já conhece este feitiço." };
    }

    // 2. Checar se o jogador tem a origem primária (Raça, Classe, Reino) se o feitiço tiver uma.
    //    Feitiços que são APENAS desbloqueados por outros feitiços podem não ter origemTipo/Nome
    //    ou ter um "geral" que não confere direito de aprendizado direto.
    let temOrigemPrimariaCompativel = false;
    if (feiticoBase.origemTipo === "raca" && ficha.raca === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
    if (feiticoBase.origemTipo === "classe" && ficha.classe === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
    if (feiticoBase.origemTipo === "classe_especial" && ficha.classe === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
    if (feiticoBase.origemTipo === "reino" && ficha.origemReino === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
    // if (feiticoBase.origemTipo === "geral") temOrigemPrimariaCompativel = true; // Se tiver feitiços gerais aprendíveis diretamente

    // 3. Checar os requisitos da árvore de habilidades
    let cumpreRequisitosDaArvore = true;
    let mensagemRequisitoFaltante = "";

    if (feiticoBase.requisitosParaAprender && feiticoBase.requisitosParaAprender.length > 0) {
        mensagemRequisitoFaltante = `Você não cumpre os seguintes pré-requisitos para aprender **${feiticoBase.nome}**:\n`;
        for (const req of feiticoBase.requisitosParaAprender) {
            const magiaRequisitoConhecida = ficha.magiasConhecidas.find(m => m.id === req.idFeitico);
            if (!magiaRequisitoConhecida || magiaRequisitoConhecida.nivel < req.nivelMinimo) {
                cumpreRequisitosDaArvore = false;
                const nomeFeiticoRequisito = FEITICOS_BASE_ARCADIA[req.idFeitico]?.nome || req.idFeitico;
                mensagemRequisitoFaltante += `- Precisa de **${nomeFeiticoRequisito}** no Nível ${req.nivelMinimo} (você tem Nível ${magiaRequisitoConhecida?.nivel || 0}).\n`;
            }
        }
    } else {
        // Se NÃO tem requisitosParaAprender, ele só pode ser aprendido se for de origem primária do jogador
        // (ou "geral" se você implementar isso). Isso evita aprender feitiços "órfãos" da árvore.
        if (!temOrigemPrimariaCompativel) {
             // A menos que seja um feitiço inicial que não deveria ter origemTipo (raro)
            if (feiticoBase.origemTipo && feiticoBase.origemTipo !== "geral") { // Adicionado para permitir feitiços gerais sem origem
                 return { erro: `Você não pode aprender "${feiticoBase.nome}" diretamente sem os pré-requisitos ou a origem (${feiticoBase.origemTipo}: ${feiticoBase.origemNome}) correta.` };
            }
        }
    }

    // Decisão final para aprender:
    // Se tem requisitos, precisa cumprir.
    // Se não tem requisitos, precisa ter a origem primária compatível.
    if (feiticoBase.requisitosParaAprender && feiticoBase.requisitosParaAprender.length > 0) {
        if (!cumpreRequisitosDaArvore) {
            return { erro: mensagemRequisitoFaltante.trim() };
        }
        // Se cumpriu os requisitos da árvore, a origem primária original do feitiço se torna menos relevante,
        // pois o desbloqueio é o caminho principal. Mas ainda é bom ter `origemTipo/Nome` para organização.
    } else { // Sem requisitos explícitos na árvore
        if (!temOrigemPrimariaCompativel) {
            return { erro: `Você não tem a origem (${feiticoBase.origemTipo}: ${feiticoBase.origemNome}) necessária para aprender "${feiticoBase.nome}" diretamente.` };
        }
    }

    // Se chegou até aqui, pode aprender
    ficha.magiasConhecidas.push({ id: idFeitico, nivel: 1 }); // Adiciona no nível 1
    await atualizarFichaNoCacheEDb(idJogador, ficha);
    return { sucesso: `Feitiço **${feiticoBase.nome}** (Nv. 1) aprendido com sucesso!` };
}

async function getFeiticosDisponiveisParaAprender(idJogador) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha) return [];
    const aprendidosIds = ficha.magiasConhecidas.map(m => m.id);
    let disponiveis = [];

    for (const idFeiticoBase in FEITICOS_BASE_ARCADIA) {
        if (aprendidosIds.includes(idFeiticoBase)) continue;

        const feiticoBase = FEITICOS_BASE_ARCADIA[idFeiticoBase];
        let temOrigemPrimariaCompativel = false;
        if (feiticoBase.origemTipo === "raca" && ficha.raca === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
        if (feiticoBase.origemTipo === "classe" && ficha.classe === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
        if (feiticoBase.origemTipo === "classe_especial" && ficha.classe === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
        if (feiticoBase.origemTipo === "reino" && ficha.origemReino === feiticoBase.origemNome) temOrigemPrimariaCompativel = true;
        if (feiticoBase.origemTipo === "geral") temOrigemPrimariaCompativel = true;

        const nomeDisplayOrigem = MAPA_NOMES_ORIGEM_FEITICO_DISPLAY[feiticoBase.origemTipo] || feiticoBase.origemTipo; 

        let cumpreRequisitosDaArvore = true;
        if (feiticoBase.requisitosParaAprender && feiticoBase.requisitosParaAprender.length > 0) {
            for (const req of feiticoBase.requisitosParaAprender) {
                const magiaRequisito = ficha.magiasConhecidas.find(m => m.id === req.idFeitico);
                if (!magiaRequisito || magiaRequisito.nivel < req.nivelMinimo) {
                    cumpreRequisitosDaArvore = false;
                    break;
                }
            }
        } else {
            if (!temOrigemPrimariaCompativel && feiticoBase.origemTipo && feiticoBase.origemTipo !== "geral") {
                 cumpreRequisitosDaArvore = true;
            }
        }
        
        if (temOrigemPrimariaCompativel && cumpreRequisitosDaArvore) {
            disponiveis.push({ 
                name: `${feiticoBase.nome} (Nv.1 - ${nomeDisplayOrigem}: ${feiticoBase.origemNome})`, 
                value: feiticoBase.id 
            });
        }
    }
    return disponiveis;
}

function calcularValorDaFormula(formula, atributosConjurador, atributosAlvo = {}) {
    let expressao = formula.replace(/\s/g, '').toLowerCase();
    const todosAtributos = { ...atributosConjurador, ...atributosAlvo };

    for (const atr in todosAtributos) {
        const regex = new RegExp(atr.toLowerCase().replace('base', ''), 'g'); // Remove 'base' do nome do atributo na regex
        expressao = expressao.replace(regex, String(todosAtributos[atr] || 0));
    }
    // Substitui atributos específicos do modelo, como 'manabase' para 'mana' se a fórmula usar 'mana'
    expressao = expressao.replace(/manabase/g, String(todosAtributos.manabase || 0));


    try {
        if (!/^[0-9.+\-*/()\.]+$/.test(expressao)) {
            console.warn("[Parser Fórmula] Expressão contém caracteres inválidos após substituição:", expressao);
            return 0;
        }
        return Math.floor(new Function(`return ${expressao}`)());
    } catch (e) {
        console.error(`[Parser Fórmula] Erro ao calcular fórmula "${formula}" (expressão resultante: "${expressao}"):`, e);
        return 0;
    }
}

async function getFeiticosUparaveisParaAutocomplete(idJogador) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha || !ficha.magiasConhecidas || ficha.magiasConhecidas.length === 0) {
        return [{ name: "Você não conhece nenhum feitiço para evoluir.", value: "sem_feiticos_upar" }]; // Mensagem informativa
    }

    const feitiçosUparaveis = [];
    for (const magiaConhecida of ficha.magiasConhecidas) {
        const feiticoBase = FEITICOS_BASE_ARCADIA[magiaConhecida.id];
        if (feiticoBase) {
            if (magiaConhecida.nivel < feiticoBase.maxNivel) {
                // Encontrar o nível atual na definição base para pegar o custo de PF para o próximo
                const nivelAtualInfo = feiticoBase.niveis.find(n => n.nivel === magiaConhecida.nivel);
                if (nivelAtualInfo && typeof nivelAtualInfo.pontosParaProximoNivel !== 'undefined') {
                    const nomeFormatado = `${feiticoBase.nome} (Nv. ${magiaConhecida.nivel} → ${magiaConhecida.nivel + 1}) - Custo: ${nivelAtualInfo.pontosParaProximoNivel} PF`;
                    feitiçosUparaveis.push({ name: nomeFormatado, value: magiaConhecida.id });
                } else if (magiaConhecida.nivel < feiticoBase.maxNivel) {
                    // Fallback se pontosParaProximoNivel não estiver no nível atual (não deveria acontecer se bem definido)
                    const nomeFormatado = `${feiticoBase.nome} (Nv. ${magiaConhecida.nivel} → ${magiaConhecida.nivel + 1}) - Custo: ? PF`;
                    feitiçosUparaveis.push({ name: nomeFormatado, value: magiaConhecida.id });
                     console.warn(`[Autocomplete Upar] Feitiço ${feiticoBase.nome} Nv.${magiaConhecida.nivel} não tem 'pontosParaProximoNivel' definido, mas maxNivel é ${feiticoBase.maxNivel}`);
                }
            }
        }
    }

    if (feitiçosUparaveis.length === 0) {
        return [{ name: "Todos os seus feitiços conhecidos estão no nível máximo!", value: "max_nivel_todos" }];
    }

    return feitiçosUparaveis;
}


async function processarMeusFeiticos(idJogador) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha || ficha.nomePersonagem === "N/A") {
        return gerarEmbedErro("Grimório Vazio", "Sua ficha não foi encontrada. Use `/criar`!");
    }

    const embed = new EmbedBuilder()
        .setColor(0xC27C0E) // Uma cor de grimório/conhecimento
        .setTitle(`📖 Grimório de ${ficha.nomePersonagem} 📖`)
        .setDescription(`Aqui estão seus feitiços conhecidos, seus níveis e como aprimorá-los.\nVocê possui **${ficha.pontosDeFeitico || 0}** Pontos de Feitiço (PF) para evoluir suas habilidades.`);

    // Adicionar Dicas de Atributos
    let dicasAtributos = "**Atributos Chave para você:**\n";
    const focoClasse = ATRIBUTOS_FOCO_POR_CLASSE[ficha.classe];
    if (focoClasse) {
        dicasAtributos += `Como **${ficha.classe}**, focar em **${focoClasse}** pode aprimorar seus poderes.\n`;
    }
    const focoRaca = ATRIBUTOS_FOCO_POR_RACA[ficha.raca];
    if (focoRaca) {
        dicasAtributos += `Sua herança **${ficha.raca}** se beneficia de **${focoRaca}**.\n`;
    }
    if (focoClasse || focoRaca) {
        embed.addFields({ name: "💡 Foco de Atributos", value: dicasAtributos, inline: false });
        embed.addFields({ name: '\u200B', value: '\u200B' }); // Espaço
    }


    if (!ficha.magiasConhecidas || ficha.magiasConhecidas.length === 0) {
        embed.addFields({ name: "Nenhum Feitiço Conhecido", value: "Você ainda não aprendeu nenhum feitiço. Use `/aprenderfeitico` para começar!" });
    } else {
        let contadorFeiticos = 0;
        for (const magia of ficha.magiasConhecidas) {
            if (contadorFeiticos >= 25) { // Limite de fields do Embed
                embed.addFields({name: "Muitos Feitiços...", value: "Você conhece mais feitiços do que podem ser listados aqui (limite de 25). Use `/ficha` para uma lista completa."});
                break;
            }

            const feiticoBase = FEITICOS_BASE_ARCADIA[magia.id];
            if (feiticoBase) {
                const nivelAtualInfo = feiticoBase.niveis.find(n => n.nivel === magia.nivel);
                if (nivelAtualInfo) {
                    let infoFeiticoStr = `**Tipo:** ${MAPA_NOMES_ORIGEM_FEITICO_DISPLAY[feiticoBase.origemTipo] || feiticoBase.origemTipo}: ${feiticoBase.origemNome}\n`;
                    infoFeiticoStr += `**Descrição (Nv. ${magia.nivel}):** ${nivelAtualInfo.efeitoDesc}\n`;
                    infoFeiticoStr += `**Custo de PM:** ${nivelAtualInfo.custoPM}\n`;
                    if (feiticoBase.cooldownSegundos && feiticoBase.cooldownSegundos > 0) {
                        infoFeiticoStr += `**Cooldown:** ${feiticoBase.cooldownSegundos}s\n`;
                    }

                    if (magia.nivel < feiticoBase.maxNivel) {
                        const proximoNivelInfo = feiticoBase.niveis.find(n => n.nivel === magia.nivel + 1); // Pega info do próximo nível para o custo
                        if (nivelAtualInfo.pontosParaProximoNivel) { // O nível atual DEVE ter pontosParaProximoNivel
                            infoFeiticoStr += `**Próximo Nível (${magia.nivel + 1}):** Custa ${nivelAtualInfo.pontosParaProximoNivel} PF.`;
                            if (proximoNivelInfo && proximoNivelInfo.efeitoDesc && proximoNivelInfo.efeitoDesc !== nivelAtualInfo.efeitoDesc) {
                                infoFeiticoStr += `\n*Efeito Nv.${magia.nivel + 1}: ${proximoNivelInfo.efeitoDesc.substring(0, 150)}${proximoNivelInfo.efeitoDesc.length > 150 ? '...' : ''}*`;
                            }
                        } else {
                            infoFeiticoStr += `Custo para próximo nível não definido.`;
                        }
                    } else {
                        infoFeiticoStr += `**NÍVEL MÁXIMO ALCANÇADO!**`;
                    }
                    embed.addFields({ name: `✨ ${feiticoBase.nome} (Nível ${magia.nivel}/${feiticoBase.maxNivel}) ✨`, value: infoFeiticoStr, inline: false });
                    contadorFeiticos++;
                }
            }
        }
    }
    return embed;
}

// NOVA FUNÇÃO PARA PROCESSAR O COMANDO /uparfeitico
async function processarUparFeitico(idJogador, idFeiticoAlvo) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha || !ficha.magiasConhecidas) {
        return gerarEmbedErro("Erro ao Evoluir", "Sua ficha não foi encontrada ou você não conhece nenhuma magia para evoluir.");
    }

    const magiaDoJogadorParaUpar = ficha.magiasConhecidas.find(m => m.id === idFeiticoAlvo);
    if (!magiaDoJogadorParaUpar) {
    
        return gerarEmbedErro("Erro ao Evoluir", "Você não parece conhecer o feitiço selecionado para evoluir. Tente novamente a partir das sugestões.");
    }

    const definicaoBaseFeitico = FEITICOS_BASE_ARCADIA[idFeiticoAlvo];
    if (!definicaoBaseFeitico) {
        console.error(`[CRÍTICO - UPAR FEITIÇO] Definição base não encontrada para idFeitico: ${idFeiticoAlvo}`);
        return gerarEmbedErro("Erro ao Evoluir", "Definição base do feitiço não encontrada no sistema. Contate um administrador.");
    }

    if (magiaDoJogadorParaUpar.nivel >= definicaoBaseFeitico.maxNivel) {
        return gerarEmbedAviso("Nível Máximo Atingido", `O feitiço "**${definicaoBaseFeitico.nome}**" já está no seu nível máximo (${definicaoBaseFeitico.maxNivel}).`);
    }

    // Encontrar informações do nível atual para pegar o custo de PF para o próximo
    const nivelAtualInfo = definicaoBaseFeitico.niveis.find(n => n.nivel === magiaDoJogadorParaUpar.nivel);
    if (!nivelAtualInfo || typeof nivelAtualInfo.pontosParaProximoNivel === 'undefined') {
    
        console.error(`[CRÍTICO - UPAR FEITIÇO] 'pontosParaProximoNivel' não definido para ${definicaoBaseFeitico.nome} Nv.${magiaDoJogadorParaUpar.nivel}`);
        return gerarEmbedErro("Erro de Configuração do Feitiço", `Não foi possível encontrar o custo para evoluir "${definicaoBaseFeitico.nome}" do Nível ${magiaDoJogadorParaUpar.nivel}. Contate um administrador.`);
    }

    const custoPF = nivelAtualInfo.pontosParaProximoNivel;
    const pontosDeFeiticoJogador = ficha.pontosDeFeitico || 0;

    if (pontosDeFeiticoJogador < custoPF) {
        return gerarEmbedAviso("Pontos de Feitiço Insuficientes", 
            `Você precisa de **${custoPF} PF** para evoluir "**${definicaoBaseFeitico.nome}**" para o Nível ${magiaDoJogadorParaUpar.nivel + 1}.\n` +
            `Você possui **${pontosDeFeiticoJogador} PF** no momento.`
        );
    }

    // Tudo OK para upar!
    ficha.pontosDeFeitico = pontosDeFeiticoJogador - custoPF;
    magiaDoJogadorParaUpar.nivel++; 

    let mensagensFeedback = [];
    const nomeFeiticoDisplay = definicaoBaseFeitico.nome; 
    mensagensFeedback.push(`🎉 Feitiço **${nomeFeiticoDisplay}** evoluído para o **Nível ${magiaDoJogadorParaUpar.nivel}**!`);
    mensagensFeedback.push(`Custo: ${custoPF} PF. Seus Pontos de Feitiço restantes: **${ficha.pontosDeFeitico}**.`);

    const novoNivelInfo = definicaoBaseFeitico.niveis.find(n => n.nivel === magiaDoJogadorParaUpar.nivel);
    if (novoNivelInfo && novoNivelInfo.efeitoDesc) {
        mensagensFeedback.push(`\n**Efeito Nv. ${magiaDoJogadorParaUpar.nivel}:** ${novoNivelInfo.efeitoDesc}`);
    }

    if (definicaoBaseFeitico.desbloqueiaFeiticos && definicaoBaseFeitico.desbloqueiaFeiticos.length > 0) {
        for (const desbloqueio of definicaoBaseFeitico.desbloqueiaFeiticos) {
            if (magiaDoJogadorParaUpar.nivel === desbloqueio.aoAtingirNivel) {
                const novoFeiticoBase = FEITICOS_BASE_ARCADIA[desbloqueio.idFeitico];
                if (novoFeiticoBase) {
                    if (!ficha.magiasConhecidas.some(m => m.id === desbloqueio.idFeitico)) {
                        
                        let podeAprenderNovoDesbloqueado = true;
                        let msgReqNovo = "";
                        if (novoFeiticoBase.requisitosParaAprender && novoFeiticoBase.requisitosParaAprender.length > 0) {
                            for (const reqNovo of novoFeiticoBase.requisitosParaAprender) {
                                // Este if garante que o requisito não seja o próprio feitiço que está desbloqueando (evita loop de checagem desnecessário)
                                // E que estamos verificando um requisito *diferente* do que acabou de ser cumprido pela evolução atual.
                                if (reqNovo.idFeitico !== idFeiticoAlvo) { 
                                    const magiaRequisitoNovo = ficha.magiasConhecidas.find(m => m.id === reqNovo.idFeitico);
                                    if (!magiaRequisitoNovo || magiaRequisitoNovo.nivel < reqNovo.nivelMinimo) {
                                        podeAprenderNovoDesbloqueado = false;
                                        const nomeReqFaltante = FEITICOS_BASE_ARCADIA[reqNovo.idFeitico]?.nome || reqNovo.idFeitico;
                                        msgReqNovo += `\n- Requer ${nomeReqFaltante} Nv. ${reqNovo.nivelMinimo}.`;
                                    }
                                }
                            }
                        }
                        

                        let temOrigemNovoDesbloqueado = false;
                        if (!novoFeiticoBase.origemTipo || novoFeiticoBase.origemTipo === "geral") temOrigemNovoDesbloqueado = true; // Feitiços "gerais" ou sem origem definida são OK
                        if (novoFeiticoBase.origemTipo === "raca" && ficha.raca === novoFeiticoBase.origemNome) temOrigemNovoDesbloqueado = true;
                        if (novoFeiticoBase.origemTipo === "classe" && ficha.classe === novoFeiticoBase.origemNome) temOrigemNovoDesbloqueado = true;
                        if (novoFeiticoBase.origemTipo === "classe_especial" && ficha.classe === novoFeiticoBase.origemNome) temOrigemNovoDesbloqueado = true;
                        if (novoFeiticoBase.origemTipo === "reino" && ficha.origemReino === novoFeiticoBase.origemNome) temOrigemNovoDesbloqueado = true;

                        if (podeAprenderNovoDesbloqueado && temOrigemNovoDesbloqueado) {
                            ficha.magiasConhecidas.push({ id: desbloqueio.idFeitico, nivel: 1 });
                            mensagensFeedback.push(`\n✨ **NOVO FEITIÇO DESBLOQUEADO:** Você aprendeu **${novoFeiticoBase.nome} (Nv. 1)**!`);
                        } else if (!temOrigemNovoDesbloqueado) {
                            mensagensFeedback.push(`\n⚠️ Você desbloqueou a possibilidade de aprender ${novoFeiticoBase.nome}, mas parece não ter a origem (${novoFeiticoBase.origemTipo}: ${novoFeiticoBase.origemNome}) correta para ele.`);
                        } else { // Não cumpriu outros requisitos do feitiço desbloqueado
                            mensagensFeedback.push(`\n⚠️ Você desbloqueou a possibilidade de aprender ${novoFeiticoBase.nome}, mas ainda há outros pré-requisitos não cumpridos para ele:${msgReqNovo}`);
                        }
                    }
                } else {
                     console.warn(`[DESBLOQUEIO FEITIÇO] Tentativa de desbloquear feitiço com ID "${desbloqueio.idFeitico}" que não existe em FEITICOS_BASE_ARCADIA.`);
                }
            }
        }
    }

    await atualizarFichaNoCacheEDb(idJogador, ficha);
    return gerarEmbedSucesso("Evolução de Feitiço Concluída!", mensagensFeedback.join("\n\n")); // Use \n\n para melhor espaçamento
}


async function usarFeitico(idJogador, idFeitico, idAlvo = null) {
    const fichaConjurador = await getFichaOuCarregar(idJogador);
    if (!fichaConjurador || fichaConjurador.nomePersonagem === "N/A") {
        return { erro: "Sua ficha não foi encontrada ou não está completa." };
    }

    const feiticoBase = FEITICOS_BASE_ARCADIA[idFeitico];
    if (!feiticoBase) return { erro: "Feitiço não encontrado." };

    const magiaAprendida = fichaConjurador.magiasConhecidas.find(m => m.id === idFeitico);
    if (!magiaAprendida) return { erro: "Você não conhece este feitiço." };

    const nivelDoFeiticoNoJogador = magiaAprendida.nivel;
    const detalhesDoNivelFeitico = feiticoBase.niveis.find(n => n.nivel === nivelDoFeiticoNoJogador);
    if (!detalhesDoNivelFeitico) return { erro: "Detalhes para este nível de feitiço não foram encontrados." };

    if (fichaConjurador.pmAtual < detalhesDoNivelFeitico.custoPM) return { erro: `Mana insuficiente. Necessário: ${detalhesDoNivelFeitico.custoPM} PM.` };

    const cooldownKey = `${idFeitico}_${idJogador}`;
    if (fichaConjurador.cooldownsFeiticos && fichaConjurador.cooldownsFeiticos[cooldownKey] > Date.now()) {
        const tempoRestante = Math.ceil((fichaConjurador.cooldownsFeiticos[cooldownKey] - Date.now()) / 1000);
        return { erro: `Feitiço "${feiticoBase.nome}" em recarga. Aguarde ${tempoRestante}s.` };
    }

    fichaConjurador.pmAtual -= detalhesDoNivelFeitico.custoPM;
    const cooldownBaseSegundos = feiticoBase.cooldownSegundos || 0;
    const cooldownNivelSegundos = detalhesDoNivelFeitico.cooldownSegundos;
    const cooldownFinalSegundos = typeof cooldownNivelSegundos === 'number' ? cooldownNivelSegundos : cooldownBaseSegundos;

    if (cooldownFinalSegundos > 0) {
        if (!fichaConjurador.cooldownsFeiticos) fichaConjurador.cooldownsFeiticos = {};
        fichaConjurador.cooldownsFeiticos[cooldownKey] = Date.now() + (cooldownFinalSegundos * 1000);
    }

    let mensagemResultadoEfeito = `**${fichaConjurador.nomePersonagem}** usou **${feiticoBase.nome}** (Nível ${nivelDoFeiticoNoJogador})!\n`;
    let mensagemEfeitoEspecifico = "";
    let fichaAlvo = null;
    const efeitoConfig = detalhesDoNivelFeitico.efeitoDetalhes;

    if (!efeitoConfig || !efeitoConfig.alvo) {
        await atualizarFichaNoCacheEDb(idJogador, fichaConjurador); // Salva gasto de mana mesmo se config errada
        return { erro: "Configuração de efeito ou alvo ausente para este feitiço." };
    }

    if (efeitoConfig.alvo === 'self') {
        fichaAlvo = fichaConjurador;
    } else if (['único', 'aliado', 'inimigo'].includes(efeitoConfig.alvo)) {
        if (!idAlvo) {
            await atualizarFichaNoCacheEDb(idJogador, fichaConjurador);
            return { embed: gerarEmbedAviso("Alvo Necessário", `${mensagemResultadoEfeito}\n⚠️ Este feitiço requer um alvo, mas nenhum foi fornecido.`) };
        }
        fichaAlvo = await getFichaOuCarregar(idAlvo);
        if (!fichaAlvo) {
            await atualizarFichaNoCacheEDb(idJogador, fichaConjurador);
            return { embed: gerarEmbedAviso("Alvo Não Encontrado", `${mensagemResultadoEfeito}\n⚠️ Alvo com ID ${idAlvo} não encontrado. O feitiço não teve efeito.`) };
        }
    }

    if (efeitoConfig.alvo === 'área') {
        mensagemEfeitoEspecifico = `(Efeito em área ativado - lógica de múltiplos alvos a ser implementada).\n`;
        // Lógica de dano em área (exemplo simplificado, aplicar a todos os inimigos em um futuro sistema de combate)
        if (feiticoBase.tipo === "ataque" && efeitoConfig.formulaDano) {
             const danoCalculado = calcularValorDaFormula(efeitoConfig.formulaDano, fichaConjurador.atributos); // Sem atributos de alvo específico para área por enquanto
             mensagemEfeitoEspecifico += `💥 Causou **${danoCalculado}** de dano ${efeitoConfig.tipoDano || 'mágico'} em área!\n`;
        }
    } else if (fichaAlvo) {
        switch (feiticoBase.tipo) {
            case "ataque":
                if (efeitoConfig.formulaDano) {
                    const danoCalculado = calcularValorDaFormula(efeitoConfig.formulaDano, fichaConjurador.atributos, fichaAlvo.atributos);
                    if (danoCalculado > 0) {
                        const pvAntes = fichaAlvo.pvAtual;
                        fichaAlvo.pvAtual = Math.max(0, pvAntes - danoCalculado);
                        mensagemEfeitoEspecifico += `💥 Causou **${danoCalculado}** de dano ${efeitoConfig.tipoDano || 'mágico'} a **${fichaAlvo.nomePersonagem}**! (PV: ${pvAntes} → ${fichaAlvo.pvAtual}/${fichaAlvo.pvMax})\n`;
                        if (efeitoConfig.debuff) {
                            // Adicionar à lista de condições do alvo
                            if (!fichaAlvo.condicoes) fichaAlvo.condicoes = [];
                            fichaAlvo.condicoes.push({ nome: `Debuff: ${feiticoBase.nome}`, atributo: efeitoConfig.debuff.atributo, modificador: efeitoConfig.debuff.modificador, valor: efeitoConfig.debuff.valor, duracaoTurnos: efeitoConfig.debuff.duracaoTurnos, origem: feiticoBase.nome });
                            mensagemEfeitoEspecifico += `✨ Aplicou debuff: ${efeitoConfig.debuff.atributo} afetado por ${efeitoConfig.debuff.duracaoTurnos} turno(s).\n`;
                        }
                        if (efeitoConfig.condicao) {
                             if (Math.random() < (efeitoConfig.condicao.chance || 1)) { // Aplica se chance for 1 ou sortear
                                if (!fichaAlvo.condicoes) fichaAlvo.condicoes = [];
                                fichaAlvo.condicoes.push({ nome: efeitoConfig.condicao.nome, duracaoTurnos: efeitoConfig.condicao.duracaoTurnos, origem: feiticoBase.nome });
                                mensagemEfeitoEspecifico += `✨ Aplicou condição: ${efeitoConfig.condicao.nome} por ${efeitoConfig.condicao.duracaoTurnos} turno(s).\n`;
                            }
                        }
                        if (efeitoConfig.curaPropriaPercentDano) {
                            const curaRealizada = Math.floor(danoCalculado * efeitoConfig.curaPropriaPercentDano);
                            if (curaRealizada > 0) {
                                const pvConjuradorAntes = fichaConjurador.pvAtual;
                                fichaConjurador.pvAtual = Math.min(fichaConjurador.pvMax, pvConjuradorAntes + curaRealizada);
                                mensagemEfeitoEspecifico += `🩸 **${fichaConjurador.nomePersonagem}** drenou **${curaRealizada}** PV de **${fichaAlvo.nomePersonagem}**! (PV: ${pvConjuradorAntes} → ${fichaConjurador.pvAtual}/${fichaConjurador.pvMax})\n`;
                            }
                        }

                    } else {
                        mensagemEfeitoEspecifico += `🛡️ O ataque não causou dano efetivo a **${fichaAlvo.nomePersonagem}**.\n`;
                    }
                } else {
                    mensagemEfeitoEspecifico += `❓ Efeito de ataque não detalhado.\n`;
                }
                break;
            case "cura":
                if (efeitoConfig.formulaCura) {
                    const curaCalculada = calcularValorDaFormula(efeitoConfig.formulaCura, fichaConjurador.atributos, fichaAlvo.atributos);
                    if (curaCalculada > 0) {
                        const pvAntes = fichaAlvo.pvAtual;
                        fichaAlvo.pvAtual = Math.min(fichaAlvo.pvMax, pvAntes + curaCalculada);
                        mensagemEfeitoEspecifico += `💖 Curou **${curaCalculada}** ${efeitoConfig.tipoCura || 'PV'} de **${fichaAlvo.nomePersonagem}**! (PV: ${pvAntes} → ${fichaAlvo.pvAtual}/${fichaAlvo.pvMax})\n`;
                    } else {
                        mensagemEfeitoEspecifico += `🌿 A cura não teve efeito significativo em **${fichaAlvo.nomePersonagem}**.\n`;
                    }
                } else if (efeitoConfig.formulaCuraPorTurno) { // Para HoT
                    // Lógica de aplicar HoT (adicionar à lista de condições/buffs do alvo)
                    if (!fichaAlvo.condicoes) fichaAlvo.condicoes = [];
                     const curaPorTurno = calcularValorDaFormula(efeitoConfig.formulaCuraPorTurno, fichaConjurador.atributos, fichaAlvo.atributos);
                    fichaAlvo.condicoes.push({
                        nome: `Cura Contínua: ${feiticoBase.nome}`,
                        tipo: "CURA_HOT",
                        valorPorTurno: curaPorTurno,
                        duracaoTurnos: efeitoConfig.duracaoTurnos,
                        origem: feiticoBase.nome
                    });
                    mensagemEfeitoEspecifico += `🌿 **${fichaAlvo.nomePersonagem}** recebe uma cura contínua de **${curaPorTurno} PV/turno** por ${efeitoConfig.duracaoTurnos} turnos.\n`;
                } else {
                    mensagemEfeitoEspecifico += `❓ Efeito de cura não detalhado.\n`;
                }
                break;
            case "defesa": // Buffs e escudos
                 if (efeitoConfig.tipoBuff === "escudoHP") {
                    const valorEscudo = calcularValorDaFormula(efeitoConfig.formulaValor, fichaConjurador.atributos, fichaAlvo.atributos);
                    // Adicionar lógica para PV temporário ou escudo
                    mensagemEfeitoEspecifico += `🛡️ **${fichaAlvo.nomePersonagem}** recebe um escudo de **${valorEscudo}** por ${efeitoConfig.duracaoTurnos} turnos.\n`;
                } else if (efeitoConfig.tipoBuff === "atributo" && efeitoConfig.buff) { // Correção aqui: era efeitoConfig.buff.formulaValor e efeitoConfig.buff.valor
                    const valorBuff = calcularValorDaFormula(efeitoConfig.buff.formulaValor || String(efeitoConfig.buff.valor || 0), fichaConjurador.atributos, fichaAlvo.atributos);
                    // Adicionar à lista de condições/buffs
                    mensagemEfeitoEspecifico += `✨ **${fichaAlvo.nomePersonagem}** recebe buff em ${efeitoConfig.buff.atributo} de **${valorBuff}** por ${efeitoConfig.buff.duracaoTurnos} turnos.\n`;
                } else if (efeitoConfig.tipoBuff === "resistenciaMagicaPercent" && efeitoConfig.formulaValor) { // Exemplo para Runa de Proteção
                    const valorBuff = calcularValorDaFormula(efeitoConfig.formulaValor, fichaConjurador.atributos, fichaAlvo.atributos);
                     mensagemEfeitoEspecifico += `✨ **${fichaAlvo.nomePersonagem}** aumenta sua Resistência Mágica em **${valorBuff}%** por ${efeitoConfig.duracaoTurnos} turnos.\n`;
                    // Implementar a lógica de buff de resistência mágica na ficha do alvo
                }
                // Adicionar mais lógicas de defesa/buff aqui
                break;
            default:
                mensagemEfeitoEspecifico += `❓ Tipo de feitiço "${feiticoBase.tipo}" com efeito em alvo único não implementado totalmente.\n`;
                break;
        }
    } else if (!['área'].includes(efeitoConfig.alvo)) {
        mensagemEfeitoEspecifico = `⚠️ Não foi possível determinar o alvo para o efeito do feitiço.\n`;
    }

    await atualizarFichaNoCacheEDb(idJogador, fichaConjurador);
    if (fichaAlvo && idJogador !== idAlvo && !['área'].includes(efeitoConfig.alvo)) {
        await atualizarFichaNoCacheEDb(fichaAlvo._id, fichaAlvo);
    }

    const embedResultado = new EmbedBuilder()
        .setColor(0x8A2BE2)
        .setTitle(`✨ Feitiço Lançado: ${feiticoBase.nome}! ✨`)
        .setDescription(mensagemResultadoEfeito + mensagemEfeitoEspecifico.trim())
        .setFooter({text: `PM restante de ${fichaConjurador.nomePersonagem}: ${fichaConjurador.pmAtual}/${fichaConjurador.pmMax}`});
    return { embed: embedResultado };
}


async function processarUsarItem(idJogadorDiscord, nomeItemInput, quantidadeUsar = 1) {
    const ficha = await getFichaOuCarregar(idJogadorDiscord);
    if (!ficha) return gerarEmbedErro("Uso de Item", "Sua ficha não foi encontrada.");

    const nomeItemNormalizado = nomeItemInput.toLowerCase();
    const itemNoInventario = ficha.inventario.find(i => i.itemNome.toLowerCase() === nomeItemNormalizado);

    if (!itemNoInventario) {
        return gerarEmbedAviso("Item Não Encontrado", `Você não possui o item "${nomeItemInput}" no seu inventário.`);
    }
    if (itemNoInventario.quantidade < quantidadeUsar) {
        return gerarEmbedAviso("Quantidade Insuficiente", `Você tentou usar ${quantidadeUsar} de "${itemNoInventario.itemNome}", mas só tem ${itemNoInventario.quantidade}.`);
    }

    const itemBase = ITENS_BASE_ARCADIA[nomeItemNormalizado]; // Pega a definição base do item
    if (!itemBase || !itemBase.usavel) {
        return gerarEmbedAviso("Item Não Usável", `O item "${itemNoInventario.itemNome}" não pode ser usado desta forma.`);
    }

    const cooldownKey = `${nomeItemNormalizado}_${idJogadorDiscord}`;
    if (itemBase.cooldownSegundos && ficha.cooldownsItens && ficha.cooldownsItens[cooldownKey] > Date.now()) {
        const tempoRestante = Math.ceil((ficha.cooldownsItens[cooldownKey] - Date.now()) / 1000);
        return gerarEmbedAviso("Item em Recarga", `"${itemBase.itemNome}" está em recarga. Aguarde ${tempoRestante}s.`);
    }

    let mensagemEfeito = itemBase.efeito.mensagemAoUsar || `Você usou ${itemBase.itemNome}.`;
    let efeitoAplicado = false;

    // Aplicar efeitos do item
    switch (itemBase.efeito.tipoEfeito) {
        case "CURA_HP":
            const pvAntesHP = ficha.pvAtual;
            ficha.pvAtual = Math.min(ficha.pvMax, ficha.pvAtual + itemBase.efeito.valor);
            mensagemEfeito += `\n❤️ PV restaurado: +${ficha.pvAtual - pvAntesHP} (Total: ${ficha.pvAtual}/${ficha.pvMax})`;
            efeitoAplicado = true;
            break;
        case "CURA_PM":
            const pmAntes = ficha.pmAtual;
            ficha.pmAtual = Math.min(ficha.pmMax, ficha.pmAtual + itemBase.efeito.valor);
            mensagemEfeito += `\n💧 PM restaurado: +${ficha.pmAtual - pmAntes} (Total: ${ficha.pmAtual}/${ficha.pmMax})`;
            efeitoAplicado = true;
            break;
        case "CURA_HP_PERCENT":
            const curaPercentHP = Math.floor(ficha.pvMax * itemBase.efeito.valor);
            const pvAntesPercentHP = ficha.pvAtual;
            ficha.pvAtual = Math.min(ficha.pvMax, ficha.pvAtual + curaPercentHP);
             mensagemEfeito += `\n❤️ PV restaurado: +${ficha.pvAtual - pvAntesPercentHP} (Total: ${ficha.pvAtual}/${ficha.pvMax})`;
            efeitoAplicado = true;
            break;
        case "CURA_PM_PERCENT":
            const curaPercentPM = Math.floor(ficha.pmMax * itemBase.efeito.valor);
            const pmAntesPercent = ficha.pmAtual;
            ficha.pmAtual = Math.min(ficha.pmMax, ficha.pmAtual + curaPercentPM);
            mensagemEfeito += `\n💧 PM restaurado: +${ficha.pmAtual - pmAntesPercent} (Total: ${ficha.pmAtual}/${ficha.pmMax})`;
            efeitoAplicado = true;
            break;
        // Adicionar mais tipos de efeito conforme necessário (REMOVE_CONDICAO, BUFF_ARMA, etc.)
        default:
            mensagemEfeito += "\n(Efeito específico não implementado ou item de utilidade.)";
            // Para itens de utilidade, o efeito pode ser narrativo ou gerenciado externamente.
            efeitoAplicado = true; // Assume que foi usado, mesmo que o efeito seja passivo/narrativo
            break;
    }

    if (efeitoAplicado) {
        itemNoInventario.quantidade -= quantidadeUsar;
        if (itemNoInventario.quantidade <= 0) {
            ficha.inventario = ficha.inventario.filter(i => i.itemNome.toLowerCase() !== nomeItemNormalizado);
        }

        if (itemBase.cooldownSegundos) {
            if (!ficha.cooldownsItens) ficha.cooldownsItens = {};
            ficha.cooldownsItens[cooldownKey] = Date.now() + (itemBase.cooldownSegundos * 1000);
        }
        await atualizarFichaNoCacheEDb(idJogadorDiscord, ficha);
        return gerarEmbedSucesso("Item Usado!", mensagemEfeito);
    } else {
        return gerarEmbedAviso("Efeito Não Aplicado", `Não foi possível aplicar o efeito do item "${itemBase.itemNome}".`);
    }
}


async function processarJackpot(idJogadorDiscord, args) {
    const ficha = await getFichaOuCarregar(idJogadorDiscord);
    if (!ficha) { return gerarEmbedErro("Jackpot Arcádia", "Sua ficha não foi encontrada para tentar a sorte."); }

    const custoPorGiro = 25;
    const numGirosInput = args[0] ? parseInt(args[0]) : 1;
    const numGiros = Math.max(1, Math.min(numGirosInput, 10)); // Entre 1 e 10 giros
    const custoTotal = custoPorGiro * numGiros;

    if (ficha.florinsDeOuro < custoTotal) {
        return gerarEmbedAviso("Jackpot Arcádia", `Você não tem ${custoTotal} Florins de Ouro para ${numGiros} giro(s). Você possui ${ficha.florinsDeOuro} FO.`);
    }

    ficha.florinsDeOuro -= custoTotal;
    let resultados = [];
    let premiosTexto = [];
    let ganhouAlgo = false;

    for (let i = 0; i < numGiros; i++) {
        const resultadoGiro = [];
        for (let j = 0; j < 3; j++) { // 3 slots
            const rand = Math.random() * 100;
            if (rand < 5) resultadoGiro.push("💎"); // Raro (5%)
            else if (rand < 25) resultadoGiro.push("🌟"); // Incomum (20%)
            else resultadoGiro.push("⚪"); // Comum (75%)
        }
        resultados.push(resultadoGiro.join(" | "));

        // Verificar prêmios (exemplo simples)
        if (resultadoGiro[0] === "💎" && resultadoGiro[1] === "💎" && resultadoGiro[2] === "💎") {
            const premio = JACKPOT_PREMIOS_NOMES_RAROS[Math.floor(Math.random() * JACKPOT_PREMIOS_NOMES_RAROS.length)];
            premiosTexto.push(`💎💎💎 Jackpot Raro! Você ganhou: **${premio}**!`);
            await adicionarItemAoInventario(ficha, premio, 1);
            ganhouAlgo = true;
        } else if (resultadoGiro.every(s => s === "🌟")) {
            const premio = JACKPOT_PREMIOS_NOMES_INCOMUNS[Math.floor(Math.random() * JACKPOT_PREMIOS_NOMES_INCOMUNS.length)];
            premiosTexto.push(`🌟🌟🌟 Prêmio Incomum! Você ganhou: **${premio}**!`);
            await adicionarItemAoInventario(ficha, premio, 1);
            ganhouAlgo = true;
        } else if (resultadoGiro.filter(s => s === "🌟").length >= 2) {
             const premio = JACKPOT_PREMIOS_NOMES_COMUNS[Math.floor(Math.random() * JACKPOT_PREMIOS_NOMES_COMUNS.length)];
            premiosTexto.push(`🌟🌟 Prêmio Comum! Você ganhou: **${premio}**!`);
            await adicionarItemAoInventario(ficha, premio, 1);
            ganhouAlgo = true;
        }
    }

    await atualizarFichaNoCacheEDb(idJogadorDiscord, ficha);

    const embed = new EmbedBuilder()
        .setColor(ganhouAlgo ? 0xFFD700 : 0x7F8C8D)
        .setTitle("🎰 Jackpot Arcádia 🎰")
        .setDescription(`Você gastou ${custoTotal} FO em ${numGiros} giro(s).\n\n**Resultados:**\n${resultados.join("\n")}`)
        .setFooter({ text: `Saldo atual: ${ficha.florinsDeOuro} FO` });

    if (premiosTexto.length > 0) {
        embed.addFields({ name: "🏆 Prêmios Ganhos:", value: premiosTexto.join("\n") });
    } else {
        embed.addFields({ name: "😕 Resultado:", value: "Que pena! Mais sorte da próxima vez." });
    }
    return embed;
}

async function adicionarItemAoInventario(ficha, nomeItem, quantidade) {
    if (!ficha || !ficha.inventario) return;
    const itemBase = ITENS_BASE_ARCADIA[nomeItem.toLowerCase()];
    if (!itemBase) return; // Não adiciona se não for um item base conhecido

    const itemExistente = ficha.inventario.find(i => i.itemNome.toLowerCase() === nomeItem.toLowerCase());
    if (itemExistente) {
        itemExistente.quantidade = (itemExistente.quantidade || 0) + quantidade;
    } else {
        const novoItem = JSON.parse(JSON.stringify(itemBase));
        novoItem.quantidade = quantidade;
        ficha.inventario.push(novoItem);
    }
}


// Em arcadia_sistema.js

async function processarInteracaoComNPC(nomeOuIdNPC, fichaJogador, idDialogoEspecifico = null) {
    if (!npcsCollection || !fichasCollection || !missoesCollection) { // Adicionei missoesCollection
        console.error("Uma ou mais coleções não inicializadas! Tentando reconectar...");
        await conectarMongoDB();
        if (!npcsCollection || !fichasCollection || !missoesCollection) {
            return { erro: "Erro interno: As coleções do banco de dados não estão prontas." };
        }
    }

    try {
        const npcData = await npcsCollection.findOne(
            idDialogoEspecifico ? { _id: nomeOuIdNPC } : { nome: new RegExp(`^${nomeOuIdNPC}$`, 'i') }
        );

        if (!npcData) {
            return { erro: `NPC "${nomeOuIdNPC}" não encontrado em Arcádia.` };
        }

        let dialogoParaMostrar = null;

        if (idDialogoEspecifico) {
            dialogoParaMostrar = npcData.dialogos.find(d => d.idDialogo === idDialogoEspecifico);
            if (dialogoParaMostrar) {
                // Ainda precisamos checar as condições deste diálogo específico
                const condicoesOk = verificarCondicoesDialogo(dialogoParaMostrar.condicoesParaMostrar, fichaJogador, npcData);
                if (!condicoesOk) {
                    // O jogador tentou acessar um diálogo cujas condições ele não cumpre mais
                    // Poderia retornar um diálogo genérico de "Não tenho mais nada a dizer sobre isso" ou a saudação padrão
                    dialogoParaMostrar = npcData.dialogos.find(d => d.tipo === "saudacao_padrao") || npcData.dialogos[0];
                }
            }
        } else {
            // Lógica de prioridade para diálogo inicial/contextual
            const dialogosPriorizados = npcData.dialogos.sort((a, b) => {
                const prioridade = { "fim_missao": 1, "durante_missao": 2, "inicio_missao": 3, "saudacao_condicional": 4, "saudacao_padrao": 5 };
                return (prioridade[a.tipo] || 99) - (prioridade[b.tipo] || 99);
            });

            for (const diag of dialogosPriorizados) {
                if (verificarCondicoesDialogo(diag.condicoesParaMostrar, fichaJogador, npcData, diag.ofereceMissao)) {
                    dialogoParaMostrar = diag;
                    break;
                }
            }
            // Fallback se nenhum diálogo condicional for encontrado
            if (!dialogoParaMostrar) {
                dialogoParaMostrar = npcData.dialogos.find(d => d.tipo === "saudacao_padrao" || (d.idDialogo && d.idDialogo.includes("saudacao_inicial"))) || npcData.dialogos[0];
            }
        }
        
        if (!dialogoParaMostrar || !dialogoParaMostrar.texto) {
            return { erro: `NPC "${npcData.nome}" não possui um diálogo válido para esta situação.` };
        }

        return {
            npcId: npcData._id,
            nomeNPC: npcData.nome,
            tituloNPC: npcData.titulo,
            descricaoVisualNPC: npcData.descricaoVisual,
            dialogoAtual: dialogoParaMostrar 
        };

    } catch (error) {
        console.error(`Erro ao processar interação com NPC ${nomeOuIdNPC}:`, error);
        return { erro: "Ocorreu um erro ao buscar informações do NPC no banco de dados." };
    }
}

// Nova função auxiliar para verificar condições
function verificarCondicoesDialogo(condicoes, fichaJogador, npcData, idMissaoOferecidaPeloDialogo = null) {
    if (!condicoes || !Array.isArray(condicoes) || condicoes.length === 0) {
        // ... (lógica para oferta de missão já feita/ativa) ...
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
        if (cond.tipo === "objetivoMissaoCompleto") {
            const missaoLog = fichaJogador.logMissoes && fichaJogador.logMissoes.find(m => m.idMissao === cond.idMissao && m.status === "aceita");
            if (!missaoLog) return false; // Missão nem está ativa

            // LÓGICA DE VERIFICAÇÃO DE OBJETIVO PRECISA SER IMPLEMENTADA AQUI
            // Você precisará buscar a definição da missão no `missoesCollection` para saber o tipo do objetivo.
            // Ex: Se for "COLETA", verificar `fichaJogador.inventario`.
            // Por agora, se esta condição está presente e a missão está ativa, PODE ser que precise de uma lógica mais elaborada.
            // Para simplificar o teste inicial de fim de missão, talvez você possa comentar esta checagem
            // ou implementar uma forma de marcar objetivos como completos na ficha do jogador.
            // Exemplo SIMPLES (NÃO IDEAL PARA PRODUÇÃO):
            // if (!missaoLog.objetivosConcluidos || !missaoLog.objetivosConcluidos.includes(cond.idObjetivo)) {
            //    return false; 
            // }
        }
        if (cond.tipo === "jogadorPossuiItemQuest") {
            if (!fichaJogador.inventario || !fichaJogador.inventario.some(item => item.itemNome === cond.itemNomeQuest && item.quantidade >= (cond.quantidadeItemQuest || 1) )) return false;
        }
        if (cond.tipo === "jogadorNaoPossuiItemQuest") {
            if (fichaJogador.inventario && fichaJogador.inventario.some(item => item.itemNome === cond.itemNomeQuest)) return false;
        }
    }
    return true;
}

    for (const cond of condicoes) {
        if (cond.nivelMinJogador && (!fichaJogador.nivel || fichaJogador.nivel < cond.nivelMinJogador.$numberInt)) return false;
        if (cond.nivelMaxJogador && (fichaJogador.nivel > cond.nivelMaxJogador.$numberInt)) return false;
        
        if (cond.missaoNaoIniciada) {
            if (fichaJogador.logMissoes && fichaJogador.logMissoes.some(m => m.idMissao === cond.missaoNaoIniciada)) return false;
        }
        if (cond.missaoAtiva) {
            if (!fichaJogador.logMissoes || !fichaJogador.logMissoes.some(m => m.idMissao === cond.missaoAtiva && m.status === "aceita")) return false;
        }
        if (cond.missaoConcluida) {
            if (!fichaJogador.logMissoes || !fichaJogador.logMissoes.some(m => m.idMissao === cond.missaoConcluida && m.status === "concluida")) return false;
        }
        if (cond.objetivoMissaoCompleto) {
            // Esta é a parte mais complexa. Precisamos checar o progresso do objetivo na ficha do jogador.
            // Exemplo: if (!jogadorCompletouObjetivo(fichaJogador, cond.objetivoMissaoCompleto.idMissao, cond.objetivoMissaoCompleto.idObjetivo)) return false;
            // Por agora, vamos simplificar e assumir que se a missão está ativa, o objetivo pode estar completo se o tipo for fim_missao.
            // Para uma implementação real, você precisaria de um sistema para marcar objetivos como completos na ficha.
            const missaoParaCompletar = fichaJogador.logMissoes && fichaJogador.logMissoes.find(m => m.idMissao === cond.objetivoMissaoCompleto.idMissao && m.status === "aceita");
            if (!missaoParaCompletar) return false; // Se a missão nem está ativa, não pode completar objetivo
            // Adicionar aqui a lógica para verificar se o objetivo específico da missão X foi cumprido.
            // Por exemplo, checando itens no inventário se o objetivo for de coleta.
            // if (cond.objetivoMissaoCompleto.tipo === "COLETA") { ... }
        }
        if (cond.jogadorPossuiItemQuest) {
            if (!fichaJogador.inventario || !fichaJogador.inventario.some(item => item.itemNome === cond.jogadorPossuiItemQuest && item.quantidade >= (cond.quantidadeItemQuest || 1) )) return false;
        }
         if (cond.jogadorNaoPossuiItemQuest) {
            if (fichaJogador.inventario && fichaJogador.inventario.some(item => item.itemNome === cond.jogadorNaoPossuiItemQuest)) return false;
        }
        // Adicionar mais tipos de condição (reputação, classe, raça etc.)
    }
    return true;
}

// Adicionar `verificarCondicoesDialogo` aos exports se for útil em outros lugares,
// mas por enquanto ela é uma auxiliar para `processarInteracaoComNPC`.



// --- Funções de Lógica de Comandos de Admin ---
async function processarAdminCriarFicha(client, idAlvoDiscord, nomePersonagem, racaNome, classeNome, reinoNome, adminNome) {
    let nomeJogadorAlvoDisplay = `ID:${idAlvoDiscord}`;
    try {
        const targetUser = await client.users.fetch(idAlvoDiscord);
        if (targetUser) nomeJogadorAlvoDisplay = targetUser.username;
    } catch (fetchError) {
        console.warn(`[AdminCriarFicha] Não foi possível buscar nome para ID ${idAlvoDiscord}: ${fetchError.message}`);
    }

    const racaValida = RACAS_ARCADIA.find(r => r.nome.toLowerCase() === racaNome.toLowerCase());
    let classeValida = CLASSES_ARCADIA.find(c => c.nome.toLowerCase() === classeNome.toLowerCase());
    if (!classeValida) {
        classeValida = CLASSES_ESPECIAIS_ARCADIA.find(c => c.nome.toLowerCase() === classeNome.toLowerCase());
    }
    const reinoValido = REINOS_ARCADIA.find(reino => reino.nome.toLowerCase() === reinoNome.toLowerCase());

    let errorMessages = [];
    if (!nomePersonagem || nomePersonagem.length < 3 || nomePersonagem.length > 32) errorMessages.push("Nome do personagem (3-32 chars).");
    if (!racaValida) errorMessages.push(`Raça "${racaNome}" inválida.`);
    if (!classeValida) errorMessages.push(`Classe "${classeNome}" inválida.`);
    if (!reinoValido) errorMessages.push(`Reino "${reinoNome}" inválido.`);

    if (errorMessages.length > 0) {
        return gerarEmbedErro("Erro ao Criar Ficha (Admin)", errorMessages.join("\n"));
    }

    let ficha = JSON.parse(JSON.stringify(fichaModeloArcadia));
    ficha._id = String(idAlvoDiscord);
    ficha.nomeJogadorSalvo = nomeJogadorAlvoDisplay;
    ficha.nomePersonagem = nomePersonagem;
    ficha.raca = racaValida.nome;
    ficha.classe = classeValida.nome;
    ficha.origemReino = reinoValido.nome;

    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    return gerarEmbedSucesso("Ficha Criada/Sobrescrita (Admin)",
        `Personagem **${nomePersonagem}** (${ficha.raca} ${ficha.classe} de ${ficha.origemReino}) para ${ficha.nomeJogadorSalvo} foi criado/sobrescrito por ${adminNome}.`
    ).setTimestamp();
}

async function processarAdminAddXP(idAlvoDiscord, valorXP, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha) return gerarEmbedErro("Erro Admin", `Ficha não encontrada para ID ${idAlvoDiscord}.`);
    if (isNaN(valorXP)) return gerarEmbedErro("Erro Admin", "Valor de XP inválido.");

    const xpAntes = ficha.xpAtual || 0;
    const nivelOriginal = ficha.nivel || 1; // Guarda o nível original
    let pontosAtributoGanhosTotal = 0;
    let pontosFeiticoGanhosTotal = 0;

    ficha.xpAtual = xpAntes + valorXP;
    let msgsLevelUpIndividuaisParaLog = []; // Para log detalhado no console do bot
    let subiuNivel = false;
    let ultimoNivelAlcancado = nivelOriginal;

    while (ficha.xpAtual >= ficha.xpProximoNivel && (ficha.xpProximoNivel || 0) > 0 && ficha.nivel < 200) { // Adicionado limite de nível 200 para segurança
        subiuNivel = true;
        ficha.xpAtual -= ficha.xpProximoNivel;
        const nivelAntigoLoop = ficha.nivel || 0; 
        ficha.nivel = nivelAntigoLoop + 1;
        ultimoNivelAlcancado = ficha.nivel;
    
        const pfGanhosEsteNivel = calcularPFGanhosNoNivel(ficha.nivel);
        const paGanhosEsteNivel = 2; 

        ficha.pontosDeFeitico = (ficha.pontosDeFeitico || 0) + pfGanhosEsteNivel;
        pontosFeiticoGanhosTotal += pfGanhosEsteNivel;

        if (!ficha.atributos) ficha.atributos = JSON.parse(JSON.stringify(fichaModeloArcadia.atributos));
        ficha.atributos.pontosParaDistribuir = (ficha.atributos.pontosParaDistribuir || 0) + paGanhosEsteNivel;
        pontosAtributoGanhosTotal += paGanhosEsteNivel;
        
        msgsLevelUpIndividuaisParaLog.push(`- Nível ${ficha.nivel}: +${paGanhosEsteNivel} PA, +${pfGanhosEsteNivel} PF.`);
        ficha.xpProximoNivel = calcularXpProximoNivel(ficha.nivel);
    }

    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);

    let descEmbed;
    if (subiuNivel) {
        descEmbed = `🎉 **${ficha.nomePersonagem}** subiu do Nível **${nivelOriginal}** para o Nível **${ultimoNivelAlcancado}**!\n`;
        descEmbed += `✨ Ganhou no total: **${pontosAtributoGanhosTotal}** Pontos de Atributo e **${pontosFeiticoGanhosTotal}** Pontos de Feitiço.\n\n`;
        descEmbed += `XP atual: ${ficha.xpAtual}/${ficha.xpProximoNivel}. (Adicionado por ${adminNome}).`;
        
        // Log detalhado no console do servidor, não para o Discord diretamente
        console.log(`[LEVEL UP DETALHADO] Jogador ${ficha.nomePersonagem} (ID: ${idAlvoDiscord}):\n${msgsLevelUpIndividuaisParaLog.join("\n")}`);
    } else {
        descEmbed = `XP de **${ficha.nomePersonagem}** (ID: ${idAlvoDiscord}) alterado de ${xpAntes} para ${ficha.xpAtual}/${ficha.xpProximoNivel} por ${adminNome}. Nenhum nível ganho.`;
    }
    
    // Segurança extra para o comprimento da descrição do embed
    if (descEmbed.length > 4000) { 
        descEmbed = `Muitos níveis foram ganhos! ${ficha.nomePersonagem} subiu do Nível ${nivelOriginal} para o Nível ${ultimoNivelAlcancado}. Detalhes extensos foram logados no console do bot. XP atual: ${ficha.xpAtual}/${ficha.xpProximoNivel}. (Admin: ${adminNome})`;
    }

    return gerarEmbedSucesso("XP Adicionado (Admin)", descEmbed).setTimestamp();
}

async function processarAdminSetNivel(idAlvoDiscord, novoNivel, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha) return gerarEmbedErro("Erro Admin", `Ficha não encontrada para ID ${idAlvoDiscord}.`);
    if (isNaN(novoNivel) || novoNivel < 1) return gerarEmbedErro("Erro Admin", "Nível inválido. Deve ser um número maior ou igual a 1.");

    const nivelAntigo = ficha.nivel || 1;
    ficha.nivel = novoNivel;
    ficha.xpAtual = 0;
    ficha.xpProximoNivel = calcularXpProximoNivel(ficha.nivel);
    if (!ficha.atributos) ficha.atributos = JSON.parse(JSON.stringify(fichaModeloArcadia.atributos));
    const diffNivel = novoNivel - nivelAntigo;
    if (diffNivel !== 0) {
      ficha.atributos.pontosParaDistribuir = Math.max(0, (ficha.atributos.pontosParaDistribuir || 0) + (diffNivel * 2));
    }

    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    return gerarEmbedSucesso("Nível Definido (Admin)",
        `Nível de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** (ID: ${idAlvoDiscord}) definido para **${ficha.nivel}** por ${adminNome}.\nXP zerado. Pontos para distribuir: **${ficha.atributos.pontosParaDistribuir || 0}**.`);
}

async function processarAdminAddMoedas(idAlvoDiscord, quantidade, tipoMoeda, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha) return gerarEmbedErro("Erro Admin", `Ficha não encontrada para o jogador com ID ${idAlvoDiscord}.`);
    if (isNaN(quantidade)) return gerarEmbedErro("Erro Admin", "Quantidade de moeda inválida.");

    const nomeMoedaDisplay = tipoMoeda === 'florinsDeOuro' ? "Florins de Ouro (FO)" : "Essências de Arcádia (EA)";
    const saldoAnterior = ficha[tipoMoeda] || 0;
    ficha[tipoMoeda] = saldoAnterior + quantidade;
    if (ficha[tipoMoeda] < 0) ficha[tipoMoeda] = 0;

    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    return gerarEmbedSucesso(`${nomeMoedaDisplay} Ajustados (Admin)`,
        `${nomeMoedaDisplay} de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** (ID: ${idAlvoDiscord}) ${quantidade >= 0 ? 'aumentados' : 'diminuídos'} em **${Math.abs(quantidade)}** por ${adminNome}.\nSaldo Anterior: ${saldoAnterior}\nNovo Saldo: **${ficha[tipoMoeda]}**.`);
}

async function processarAdminAddItem(idAlvoDiscord, nomeItemInput, quantidade = 1, tipoCustom, descricaoCustom, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha) return gerarEmbedErro("Erro Admin", `Ficha não encontrada para o jogador com ID ${idAlvoDiscord}.`);
    if (!ficha.inventario) ficha.inventario = [];
    if (quantidade < 1) return gerarEmbedErro("Erro Admin", "Quantidade do item deve ser ao menos 1.");

    const itemBaseDef = ITENS_BASE_ARCADIA[nomeItemInput.toLowerCase()];
    let itemFinal;
    let origemItemMsg = "";

    if (itemBaseDef) {
        itemFinal = JSON.parse(JSON.stringify(itemBaseDef));
        itemFinal.quantidade = quantidade;
        if (tipoCustom) itemFinal.tipo = tipoCustom;
        if (descricaoCustom) itemFinal.descricao = descricaoCustom;
        origemItemMsg = "Item da base de dados.";
    } else {
        itemFinal = {
            itemNome: nomeItemInput,
            quantidade: quantidade,
            tipo: tipoCustom || "Item Especial (Admin)",
            descricao: descricaoCustom || "Adicionado por um administrador.",
            usavel: false, // Itens customizados por admin são não usáveis por padrão
            equipavel: false // E não equipáveis por padrão
        };
        origemItemMsg = "Item customizado criado.";
    }

    const itemExistenteIndex = ficha.inventario.findIndex(i => i.itemNome.toLowerCase() === itemFinal.itemNome.toLowerCase());
    if (itemExistenteIndex > -1) {
        ficha.inventario[itemExistenteIndex].quantidade = (ficha.inventario[itemExistenteIndex].quantidade || 0) + itemFinal.quantidade;
        if (tipoCustom) ficha.inventario[itemExistenteIndex].tipo = tipoCustom;
        if (descricaoCustom) ficha.inventario[itemExistenteIndex].descricao = descricaoCustom;
    } else {
        ficha.inventario.push(itemFinal);
    }
    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    return gerarEmbedSucesso("Item Adicionado ao Inventário (Admin)",
        `**${itemFinal.itemNome}** (x${quantidade}) adicionado ao inventário de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** (ID: ${idAlvoDiscord}) por ${adminNome}.\n*${origemItemMsg}*`);
}

async function processarAdminDelItem(idAlvoDiscord, nomeItem, quantidadeRemover = 1, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha || !ficha.inventario) return gerarEmbedErro("Erro Admin", `Ficha ou inventário não encontrado para ID ${idAlvoDiscord}.`);
    if (quantidadeRemover < 1) return gerarEmbedErro("Erro Admin", "Quantidade a remover deve ser ao menos 1.");

    const itemExistenteIndex = ficha.inventario.findIndex(i => i.itemNome.toLowerCase() === nomeItem.toLowerCase());
    if (itemExistenteIndex === -1) return gerarEmbedAviso("Item Não Encontrado (Admin)", `Item "${nomeItem}" não encontrado no inventário de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}**.`);

    const itemOriginal = ficha.inventario[itemExistenteIndex];
    if (itemOriginal.quantidade < quantidadeRemover) {
        return gerarEmbedAviso("Quantidade Insuficiente (Admin)",
            `**${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** não tem ${quantidadeRemover} de "${itemOriginal.itemNome}". Possui ${itemOriginal.quantidade}.`);
    }

    itemOriginal.quantidade -= quantidadeRemover;
    let msgRetorno = "";
    if (itemOriginal.quantidade <= 0) {
        ficha.inventario.splice(itemExistenteIndex, 1);
        msgRetorno = `**${itemOriginal.itemNome}** foi removido completamente do inventário de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** por ${adminNome}.`;
    } else {
        msgRetorno = `${quantidadeRemover}x **${itemOriginal.itemNome}** removido(s). Restam ${itemOriginal.quantidade} no inventário de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}**. (Admin: ${adminNome})`;
    }
    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    return gerarEmbedSucesso("Item Removido do Inventário (Admin)", msgRetorno);
}

async function processarAdminSetAtributo(idAlvoDiscord, nomeAtributo, novoValor, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha) return gerarEmbedErro("Erro Admin", `Ficha não encontrada para ID ${idAlvoDiscord}.`);

    const attrKey = nomeAtributo.toLowerCase();
    if (!atributosValidos.includes(attrKey)) {
        return gerarEmbedErro("Erro Admin", `Atributo "${nomeAtributo}" inválido. Válidos: ${atributosValidos.join(', ')}.`);
    }
    if (isNaN(novoValor) || novoValor < 0) {
        return gerarEmbedErro("Erro Admin", `Valor "${novoValor}" para ${attrKey} inválido. Deve ser um número não negativo.`);
    }

    if (!ficha.atributos) ficha.atributos = JSON.parse(JSON.stringify(fichaModeloArcadia.atributos));
    const valorAntigo = ficha.atributos[attrKey] || 0;
    ficha.atributos[attrKey] = novoValor;
    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    const nomeAtributoDisplay = attrKey.charAt(0).toUpperCase() + attrKey.slice(1).replace('base', ' Base');
    return gerarEmbedSucesso("Atributo Definido (Admin)",
        `Atributo **${nomeAtributoDisplay}** de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** (ID: ${idAlvoDiscord}) foi alterado de ${valorAntigo} para **${novoValor}** por ${adminNome}.`);
}

async function processarAdminAddPontosAtributo(idAlvoDiscord, quantidade, adminNome) {
    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha) return gerarEmbedErro("Erro Admin", `Ficha não encontrada para ID ${idAlvoDiscord}.`);
    if (isNaN(quantidade)) return gerarEmbedErro("Erro Admin", "Quantidade de pontos inválida.");

    if (!ficha.atributos) ficha.atributos = JSON.parse(JSON.stringify(fichaModeloArcadia.atributos));
    const pontosAntes = ficha.atributos.pontosParaDistribuir || 0;
    ficha.atributos.pontosParaDistribuir = pontosAntes + quantidade;
    if (ficha.atributos.pontosParaDistribuir < 0) ficha.atributos.pontosParaDistribuir = 0;

    await atualizarFichaNoCacheEDb(idAlvoDiscord, ficha);
    return gerarEmbedSucesso("Pontos de Atributo Ajustados (Admin)",
        `Pontos para distribuir de **${ficha.nomePersonagem || ficha.nomeJogadorSalvo}** (ID: ${idAlvoDiscord}) ajustados em ${quantidade} por ${adminNome}.\nDe ${pontosAntes} para **${ficha.atributos.pontosParaDistribuir}**.`);
}

async function processarAdminExcluirFicha(idAlvoDiscord, confirmacao, adminNome, membroAlvo) {
    if (confirmacao !== "CONFIRMAR EXCLUSAO") {
        return gerarEmbedAviso("Exclusão Não Confirmada",
            "A frase de confirmação para excluir a ficha é inválida ou não foi fornecida corretamente. A ficha **NÃO** foi excluída.\nPara confirmar, na opção `confirmacao` do comando, digite a frase exata (maiúsculas e minúsculas importam): `CONFIRMAR EXCLUSAO`");
    }

    const ficha = await getFichaOuCarregar(idAlvoDiscord);
    if (!ficha || ficha.nomePersonagem === "N/A") {
        return gerarEmbedErro("Erro Admin", `Nenhuma ficha válida encontrada para o ID ${idAlvoDiscord}. Nada foi excluído.`);
    }

    const nomePersonagemExcluido = ficha.nomePersonagem;
    const nomeJogadorExcluido = ficha.nomeJogadorSalvo || `ID: ${idAlvoDiscord}`;

    if (!fichasCollection) {
        console.error("Coleção de fichas não inicializada. Exclusão abortada para jogador:", idAlvoDiscord);
        return gerarEmbedErro("Erro Crítico no DB", "Não foi possível conectar à base de dados para excluir a ficha.");
    }

    try {
        const resultadoDB = await fichasCollection.deleteOne({ _id: String(idAlvoDiscord) });
        if (resultadoDB.deletedCount === 1) {
            delete todasAsFichas[String(idAlvoDiscord)];

            let feedbackCargos = "\n\n🎭 Cargos do personagem foram gerenciados.";
            if (membroAlvo) {
                try {
                    const cargosParaRemoverNomes = [
                        MAPA_CARGOS_RACAS[ficha.raca],
                        MAPA_CARGOS_CLASSES[ficha.classe], // Adicionado
                        MAPA_CARGOS_REINOS[ficha.origemReino], // Adicionado
                        NOME_CARGO_AVENTUREIRO
                    ].filter(Boolean);

                    for (const nomeCargo of cargosParaRemoverNomes) {
                        const cargoObj = membroAlvo.guild.roles.cache.find(role => role.name === nomeCargo);
                        if (cargoObj && membroAlvo.roles.cache.has(cargoObj.id)) {
                            await membroAlvo.roles.remove(cargoObj);
                        }
                    }

                    const cargoVisitanteObj = membroAlvo.guild.roles.cache.find(role => role.name === NOME_CARGO_VISITANTE);
                    if (cargoVisitanteObj && !membroAlvo.roles.cache.has(cargoVisitanteObj.id)) {
                        await membroAlvo.roles.add(cargoVisitanteObj); // Readiciona cargo visitante
                    }
                } catch (roleError) {
                    console.error(`Erro ao gerenciar cargos para ${idAlvoDiscord} após exclusão de ficha:`, roleError);
                    feedbackCargos = "\n\n⚠️ Houve um erro ao tentar gerenciar os cargos do membro.";
                }
            } else {
                feedbackCargos = "\n\n(Membro não encontrado no servidor para ajuste de cargos.)";
            }

            console.log(`[ADMIN] Ficha para ${nomeJogadorExcluido} (Personagem: ${nomePersonagemExcluido}, ID: ${idAlvoDiscord}) excluída por ${adminNome}.`);
            return gerarEmbedSucesso("Ficha Excluída Permanentemente (Admin)",
                `A ficha de **${nomePersonagemExcluido}** (Jogador: ${nomeJogadorExcluido}) foi **EXCLUÍDA PERMANENTEMENTE** do banco de dados por ${adminNome}.${feedbackCargos}`);
        } else {
            console.log(`[ADMIN] Tentativa de excluir ficha para ID ${idAlvoDiscord} por ${adminNome}, mas a ficha não foi encontrada no DB (deletedCount: 0).`);
            return gerarEmbedAviso("Atenção (Admin)",
                `A ficha para ID ${idAlvoDiscord} não foi encontrada no banco de dados para ser excluída (ou já havia sido removida).`);
        }
    } catch (error) {
        console.error(`Erro ao excluir ficha para ${idAlvoDiscord} no MongoDB:`, error);
        return gerarEmbedErro("Erro ao Excluir Ficha (Admin)", "Ocorreu um erro no servidor ao tentar excluir a ficha.");
    }
}


function gerarListaComandos(isOwner) {
    let embed = new EmbedBuilder().setColor(0x4A90E2).setTitle("📜 Comandos de Arcádia (Discord)")
        .setDescription("Use os comandos abaixo para interagir com o mundo de Arcádia!");
    embed.addFields(
        { name: '👋 Boas-vindas', value: "`/arcadia`, `/bemvindo`, `/oi`\n*Mensagem inicial.*", inline: false },
        { name: '🏓 Teste', value: "`/ping`\n*Verifica se o bot está responsivo.*", inline: false },
        { name: '✨ Personagem', value: "`/criar nome:<Nome> raca:<Raça> classe:<Classe> reino:<Reino>`\n*Cria seu personagem.*\n\n`/ficha [@jogador]` (opcional)\n*Exibe sua ficha ou de outro jogador (admin).*\n\n`/distribuirpontos [forca:val] [agilidade:val] ...`\n*Distribui seus pontos de atributo.*", inline: false },
        { name: '⚔️ Combate & Magia', value: "`/aprenderfeitico feitico:<nome>`\n*Aprende um feitiço disponível.*\n\n`/usarfeitico feitico:<nome> [alvo:@jogador]`\n*Usa um feitiço conhecido.*", inline: false },
        { name: '🎒 Itens & Ações', value: "`/usaritem item:<nome> [quantidade:val]`\n*Usa um item.*\n\n`/jackpot [giros:val]` (Custo: 25 FO)\n*Tente sua sorte!*", inline: false },
        { name: '📚 Informativos', value: "`/listaracas`, `/listaclasses`, `/listareinos`, `/historia`", inline: false }
    );
    if (isOwner) {
        let adminCommandsDescription = "";
        adminCommandsDescription += "`/admincriar jogador:<@jogador> nome:<nome> raca:<raça> classe:<classe> reino:<reino>`\n*Cria/sobrescreve uma ficha.*\n\n";
        adminCommandsDescription += "`/adminaddxp jogador:<@jogador> xp:<quantidade>`\n*Adiciona XP.*\n\n";
        adminCommandsDescription += "`/adminsetnivel jogador:<@jogador> nivel:<novo_nivel>`\n*Define o nível.*\n\n";
        adminCommandsDescription += "`/adminaddflorins jogador:<@jogador> quantidade:<valor>`\n*Adiciona/remove Florins.*\n\n";
        adminCommandsDescription += "`/adminaddessencia jogador:<@jogador> quantidade:<valor>`\n*Adiciona/remove Essência.*\n\n";
        adminCommandsDescription += "`/adminadditem jogador:<@jogador> item:<nome> [quantidade:val] [tipo:val] [descricao:val]`\n*Adiciona item.*\n\n";
        adminCommandsDescription += "`/admindelitem jogador:<@jogador> item:<nome> [quantidade:val]`\n*Remove item.*\n\n";
        adminCommandsDescription += "`/adminsetattr jogador:<@jogador> atributo:<atr> valor:<val>`\n*Define um atributo.*\n\n";
        adminCommandsDescription += "`/adminaddpontosattr jogador:<@jogador> quantidade:<val>`\n*Adiciona/remove pontos para distribuir.*\n\n";
        adminCommandsDescription += "`/adminexcluirficha jogador:<@jogador> confirmacao:CONFIRMAR EXCLUSAO`\n*EXCLUI PERMANENTEMENTE uma ficha.*";

        embed.addFields(
            {
                name: '👑 Comandos de Admin (Visível Apenas para Você)',
                value: adminCommandsDescription,
                inline: false
            }
        );
    }
    embed.setFooter({ text: "Use /comandos para ver esta lista."});
    return embed;
}

// --- Novas Funções de Autocomplete ---
async function getMagiasConhecidasParaAutocomplete(jogadorId) {
    const ficha = await getFichaOuCarregar(jogadorId);
    if (!ficha || !ficha.magiasConhecidas || ficha.magiasConhecidas.length === 0) {
        return [];
    }
    return ficha.magiasConhecidas.map(magiaAprendida => {
        const feiticoBase = FEITICOS_BASE_ARCADIA[magiaAprendida.id];
        return feiticoBase ? { name: feiticoBase.nome, value: magiaAprendida.id } : null; // Ajustado para 'name' e 'value'
    }).filter(Boolean);
}

async function getInventarioParaAutocomplete(jogadorId) {
    const ficha = await getFichaOuCarregar(jogadorId);
    if (!ficha || !ficha.inventario || ficha.inventario.length === 0) {
        return [];
    }
    // Agrupa itens e mostra quantidade para facilitar a escolha
    const itensAgrupados = ficha.inventario.reduce((acc, item) => {
        const nomeItem = item.itemNome;
        if (nomeItem) { // Garante que o item tem nome
             acc[nomeItem] = (acc[nomeItem] || 0) + (item.quantidade || 0);
        }
        return acc;
    }, {});

    return Object.entries(itensAgrupados)
        .map(([nome, qtd]) => ({ name: `${nome} (x${qtd})`, value: nome })) // value é o nome exato do item
        .filter(item => item.name && item.value); // Garante que tem nome e valor
}


async function getItensBaseParaAutocomplete() {
    return Object.values(ITENS_BASE_ARCADIA)
        .map(item => ({ name: item.itemNome, value: item.itemNome })) // value é o nome exato
        .filter(item => item.name && item.value);
}

async function getTodosFeiticosBaseParaAutocomplete() {
    return Object.values(FEITICOS_BASE_ARCADIA)
        .map(feitico => ({
            name: `${feitico.nome} (${feitico.origemTipo}: ${feitico.origemNome})`,
            value: feitico.id // value é o ID do feitiço
        }))
        .filter(feitico => feitico.name && feitico.value);
}

async function getTodosNPCsParaAutocomplete() {
    if (!npcsCollection) {
        console.warn("[Autocomplete NPCs] npcsCollection não inicializada.");
        return [];
    }
    try {
        const npcs = await npcsCollection.find({}, { projection: { nome: 1 } }).toArray();
        return npcs.map(npc => ({ name: npc.nome, value: npc.nome })); // value deve ser o nome exato
    } catch (error) {
        console.error("Erro ao buscar NPCs para autocomplete:", error);
        return [];
    }
}


// =====================================================================================
// EXPORTS DO MÓDULO
// =====================================================================================
module.exports = {
    // Dados e Constantes
    RACAS_ARCADIA, CLASSES_ARCADIA, CLASSES_ESPECIAIS_ARCADIA, REINOS_ARCADIA,
    MAPA_CARGOS_RACAS, MAPA_CARGOS_CLASSES,
    MAPA_CARGOS_REINOS,
    NOME_CARGO_AVENTUREIRO, NOME_CARGO_VISITANTE,
    ID_CANAL_BOAS_VINDAS_RPG, ID_CANAL_RECRUTAMENTO, ID_CANAL_ATUALIZACAO_FICHAS,
    FEITICOS_BASE_ARCADIA, ITENS_BASE_ARCADIA, fichaModeloArcadia,
    atributosValidos,
    JACKPOT_PREMIOS_NOMES_COMUNS, JACKPOT_PREMIOS_NOMES_INCOMUNS, JACKPOT_PREMIOS_NOMES_RAROS,
    ATRIBUTOS_FOCO_POR_CLASSE,
    ATRIBUTOS_FOCO_POR_RACA,

    // Funções de Banco de Dados e Cache
    conectarMongoDB, carregarFichasDoDB, getFichaOuCarregar,
    atualizarFichaNoCacheEDb, calcularXpProximoNivel,
    calcularPFGanhosNoNivel,npcsCollection,

    // Funções de Geração de Embeds Genéricas
    gerarEmbedErro, gerarEmbedSucesso, gerarEmbedAviso,

    // Funções de Lógica de Comandos de Jogador
    gerarMensagemBoasVindas, gerarEmbedHistoria,
    gerarListaRacasEmbed, gerarListaClassesEmbed, gerarListaReinosEmbed,
    processarCriarFichaSlash, processarVerFichaEmbed, processarDistribuirPontosSlash,
    aprenderFeitico, usarFeitico,
    processarJackpot, processarUsarItem,
    gerarListaComandos,
    processarMeusFeiticos,

    // Funções de Lógica de Comandos de Admin
    processarAdminCriarFicha, processarAdminAddXP, processarAdminSetNivel,
    processarAdminAddMoedas, processarAdminAddItem, processarAdminDelItem,
    processarAdminSetAtributo, processarAdminAddPontosAtributo, processarAdminExcluirFicha,
    processarUparFeitico,processarInteracaoComNPC, 

    // Novas Funções de Autocomplete
    getMagiasConhecidasParaAutocomplete, // Mantida e ajustada
    getInventarioParaAutocomplete,
    getItensBaseParaAutocomplete,
    getFeiticosDisponiveisParaAprender,
    getFeiticosUparaveisParaAutocomplete,
    getTodosFeiticosBaseParaAutocomplete,
    getTodosNPCsParaAutocomplete,
};
