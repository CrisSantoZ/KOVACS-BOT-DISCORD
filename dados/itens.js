//Lista de Itens:
module.exports = {
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
"cogumelo solar": {
    itemNome: "Cogumelo Solar",
    tipo: "Item de Missão", // ou "Ingrediente Alquímico"
    descricao: "Um cogumelo alaranjado que brilha suavemente, usado em receitas especiais.",
    usavel: false,
    equipavel: false
},
"mapa local de valdoria": {
    itemNome: "Mapa Local de Valdoria",
    tipo: "Utilitário",
    descricao: "Um mapa simples da cidade capital de Valdoria e seus arredores imediatos.",
    usavel: false, // Ou true se tiver uma função de visualização
    equipavel: false
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

"pelederatorustica": { 
    itemNome: "Pele de Rato Rústica", 
    tipo: "Material", 
    descricao: "Uma pele grossa e um tanto fedida, útil para artesanato simples.", 
    usavel: false, 
    equipavel: false 
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
