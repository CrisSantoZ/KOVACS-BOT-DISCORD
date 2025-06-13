
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
// IMPORTAÇÃO DOS DADOS DO JOGO (RAÇAS, CLASSES, REINOS, FEITIÇOS, ITENS)
// =====================================================================================

// Importando dados modulares da pasta "dados"
const racas = require('./dados/racas');
const classes = require('./dados/classes');
const classesEspeciais = require('./dados/classesEspeciais');
const reinos = require('./dados/reinos');
const itens = require('./dados/itens');
const feiticos = require('./dados/feiticos');
const dummies = require('./dados/dummies');

// Criando aliases para compatibilidade com código existente
const RACAS_ARCADIA = racas;
const CLASSES_ARCADIA = classes;
const CLASSES_ESPECIAIS_ARCADIA = classesEspeciais;
const REINOS_ARCADIA = reinos;
const ITENS_BASE_ARCADIA = itens;
const FEITICOS_BASE_ARCADIA = feiticos;

// Função para calcular valores de fórmulas (definida antes do setup de combates)
function calcularValorDaFormula(formula, atributosConjurador, atributosAlvo = {}) {
    if (!formula || typeof formula !== 'string') {
        console.warn("[Parser Fórmula] Fórmula inválida:", formula);
        return 0;
    }
    
    let expressao = formula.toLowerCase();
    const todosAtributos = { ...atributosConjurador, ...atributosAlvo };

    // Lista de atributos válidos para substituição
    const atributosValidos = ['forca', 'agilidade', 'vitalidade', 'manabase', 'intelecto', 'carisma'];
    
    // Substituir cada atributo na expressão
    for (const atributo of atributosValidos) {
        if (todosAtributos[atributo] !== undefined) {
            // Usar replace simples para garantir que funcione
            while (expressao.includes(atributo)) {
                expressao = expressao.replace(atributo, String(todosAtributos[atributo] || 0));
            }
        }
    }

    // Remover espaços após substituições
    expressao = expressao.replace(/\s/g, '');

    try {
        // Verificar se a expressão contém apenas caracteres válidos para cálculo matemático
        if (!/^[0-9.+\-*/()]+$/.test(expressao)) {
            console.warn(`[Parser Fórmula] Expressão contém caracteres inválidos após substituição: ${expressao}`);
            console.warn(`[Parser Fórmula] Fórmula original: ${formula}`);
            console.warn(`[Parser Fórmula] Atributos disponíveis:`, todosAtributos);
            return 0;
        }
        const resultado = Math.floor(eval(expressao));
        return isNaN(resultado) ? 0 : resultado;
    } catch (e) {
        console.error(`[Parser Fórmula] Erro ao calcular fórmula "${formula}" (expressão resultante: "${expressao}"):`, e);
        return 0;
    }
}

const combates = require('./sistemas/combates');

combates.setupCombate({
  getFichaOuCarregar,
  atualizarFichaNoCacheEDb,
  adicionarXPELevelUp,
  adicionarItemAoInventario,
  ITENS_BASE_ARCADIA,
  FEITICOS_BASE_ARCADIA,
  conectarMongoDB,
  atualizarProgressoMissao,
  processarUsarItem,
  calcularValorDaFormula,
});

const { 
  iniciarCombatePvE,
  processarTurnoMobCombate,
  processarAcaoJogadorCombate,
  finalizarCombate,
  getEstadoCombateParaRetorno
} = combates;


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
const TODAS_AS_CLASSES_PARA_MAPA = [...CLASSES_ARCADIA, ...CLASSES_ESPECIAIS_ARCADIA];
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

const JACKPOT_PREMIOS_NOMES_COMUNS = ["poção de cura menor", "rações de viagem", "florin de ouro"];
const JACKPOT_PREMIOS_NOMES_INCOMUNS = ["poção de mana menor", "poção de cura média", "pedra de amolar"];
const JACKPOT_PREMIOS_NOMES_RAROS = ["adaga simples", "essência de arcádia", "poção de cura maior"];


// Função para validar URLs de imagem
function validarURLImagem(url) {
    if (!url || typeof url !== 'string') return null;
    const urlLimpa = url.trim();
    if (urlLimpa && (urlLimpa.startsWith('http://') || urlLimpa.startsWith('https://'))) {
        // Verificar se é uma extensão de imagem válida
        const extensoesValidas = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const temExtensaoValida = extensoesValidas.some(ext => urlLimpa.toLowerCase().includes(ext));
        if (temExtensaoValida || urlLimpa.includes('imgur.com') || urlLimpa.includes('discord') || urlLimpa.includes('cdn')) {
            return urlLimpa;
        }
    }
    return null;
}

// Em arcadia_sistema.js
const MOB_MODELO_BASE = {
    _id: "", // ID único do mob, ex: "ratoGiganteNivel1", "goblinBatedor" (curto e sem underscores)
    nome: "Nome do Monstro",
    nivel: 1,
    descricao: "Uma breve descrição do monstro.", // Para ser usada em embeds de combate ou informações
    imagemUrl: null, // URL para a imagem do monstro
    atributos: {
        pvMax: 30,
        pvAtual: 30, // Mobs geralmente começam com PV cheio
        ataqueBase: 5,   // Dano que o mob causa com ataque básico
        defesaBase: 2,   // Redução de dano que o mob tem
        agilidade: 10, // Para futura ordem de turno ou esquiva
        precisao: 75,  // Chance base de acertar um ataque (em %)
        // Outros atributos podem ser adicionados depois: pmMax, intelecto, resistencias, etc.
    },
    habilidades: [ 
        // Futuramente: { idHabilidade: "mordidaToxica", chanceDeUso: 0.25 }
    ],
    lootTable: [
        // Ex: { itemId: "peleDeRato", quantidadeMin: 1, quantidadeMax: 1, chanceDrop: 0.7 }
        // itemId deve corresponder a uma chave em ITENS_BASE_ARCADIA
    ],
    xpRecompensa: 10,
    florinsRecompensaMin: 1,
    florinsRecompensaMax: 5
};

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
    florinsDeOuro: 100,
    essenciaDeArcadia: 10,
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
        { ...JSON.parse(JSON.stringify(itens["adaga simples"])), quantidade: 1 },
        { ...JSON.parse(JSON.stringify(itens["rações de viagem"])), quantidade: 3 }
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
let dummiesCollection; // Coleção para sacos de pancada
let todasAsFichas = {}; // Cache local das fichas
let dummiesAtivos = {}; // Cache de dummies ativos em memória




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
        dummiesCollection = db.collection("dummies_arcadia");
console.log(">>> [arcadia_sistema.js | conectarMongoDB] missoesCollection foi atribuída:", typeof missoesCollection, !!missoesCollection);
        mobsCollection = db.collection("mobs_arcadia");
        combates.setMobsCollection(mobsCollection);

        console.log("Conectado com sucesso ao MongoDB Atlas e às coleções:", MONGODB_FICHAS_COLLECTION, ", npcs_arcadia, missoes_arcadia, mobs_arcadia, e dummies_arcadia");

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

function getFichasCollection() { return fichasCollection; }
function getNpcsCollection() { return npcsCollection; }
function getMissoesCollection() { return missoesCollection; }
function getMobsCollection() { return mobsCollection; }

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

async function processarCriarFichaSlash(idJogadorDiscord, nomeJogadorDiscord, nomePersonagem, racaNomeInput, classeNomeInput, reinoNomeInput, imagemUrl) {
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
    novaFicha.imagem = imagemUrl || "";

    novaFicha.pvMax = (novaFicha.atributos.vitalidade * 5) + (novaFicha.nivel * 5) + 20;
    novaFicha.pmMax = (novaFicha.atributos.manabase * 5) + (novaFicha.nivel * 3) + 10;

    novaFicha.pvAtual = novaFicha.pvMax;
    novaFicha.pmAtual = novaFicha.pmMax;

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
        .setThumbnail(ficha.imagem && ficha.imagem.startsWith('http') ? ficha.imagem : null)
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

async function processarInventario(idJogador) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha) {
        return { embeds: [gerarEmbedErro("Ficha não encontrada", "Use `/criar` para criar sua ficha!")] };
    }
    if (!ficha.inventario || ficha.inventario.length === 0) {
        return { embeds: [gerarEmbedAviso("Inventário Vazio", "Você não possui itens no inventário.")] };
    }

    // Agrupa por nome e soma quantidades
    const itensAgrupados = {};
    ficha.inventario.forEach(item => {
        const nome = item.itemNome || item.nome || item;
        if (!itensAgrupados[nome]) {
            itensAgrupados[nome] = { ...item, quantidade: 0 };
        }
        itensAgrupados[nome].quantidade += item.quantidade || 1;
    });

    // Monta descrição dos itens
    const linhas = Object.values(itensAgrupados).map(item => {
        let linha = `**${item.itemNome || item.nome}**`;
        if (item.quantidade > 1) linha += ` x${item.quantidade}`;
        if (item.descricao) linha += `\n> ${item.descricao}`;
        return linha;
    });

    const embed = new EmbedBuilder()
        .setColor(0xF8C300)
        .setTitle('🎒 Seu Inventário')
        .setDescription(linhas.join('\n\n'))
        .setFooter({ text: 'Para usar um item: /usaritem [nome]' })
        .setTimestamp();

    return { embeds: [embed] };
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


// Função auxiliar para adicionar XP e tratar level up (REVISADA E MELHORADA)
async function adicionarXPELevelUp(ficha, xpAdicionar) {
    if (xpAdicionar <= 0) return { subiuNivel: false };

    const nivelOriginal = ficha.nivel;
    ficha.xpAtual = (ficha.xpAtual || 0) + xpAdicionar;
    let subiuNivelFlag = false;
    let pontosAtributoGanhosNesteLevelUp = 0;
    let pontosFeiticoGanhosNesteLevelUp = 0;
    let ultimoNivelAlcancadoNaLogica = nivelOriginal;
    let logDetalhadoLevelUp = [];

    while (ficha.xpAtual >= ficha.xpProximoNivel && (ficha.xpProximoNivel || 0) > 0 && ficha.nivel < 200) {
        subiuNivelFlag = true;
        ficha.xpAtual -= ficha.xpProximoNivel;
        ficha.nivel++;
        ultimoNivelAlcancadoNaLogica = ficha.nivel;

        const paGanhos = 2; 
        const pfGanhos = calcularPFGanhosNoNivel(ficha.nivel);

        ficha.atributos.pontosParaDistribuir = (ficha.atributos.pontosParaDistribuir || 0) + paGanhos;
        pontosAtributoGanhosNesteLevelUp += paGanhos;
        ficha.pontosDeFeitico = (ficha.pontosDeFeitico || 0) + pfGanhos;
        pontosFeiticoGanhosNesteLevelUp += pfGanhos;

        logDetalhadoLevelUp.push(`Atingiu Nível ${ficha.nivel}! Ganhou: ${paGanhos} Pontos de Atributo, ${pfGanhos} Pontos de Feitiço.`);

        // Recalcular PV/PM Max e encher
        ficha.pvMax = (ficha.atributos.vitalidade * 5) + (ficha.nivel * 5) + 20;
        ficha.pmMax = (ficha.atributos.manabase * 5) + (ficha.nivel * 3) + 10;
        ficha.pvAtual = ficha.pvMax;
        ficha.pmAtual = ficha.pmMax;

        ficha.xpProximoNivel = calcularXpProximoNivel(ficha.nivel);
    }

    if (subiuNivelFlag) {
        console.log(`[LEVEL UP] ${ficha.nomePersonagem} (ID: <span class="math-inline">\{ficha\.\_id\}\) de Nv\.</span>{nivelOriginal} para Nv.${ultimoNivelAlcancadoNaLogica}.\nDetalhes: ${logDetalhadoLevelUp.join(" | ")}`);
    }
    // Não precisa chamar atualizarFichaNoCacheEDb aqui, pois finalizarCombate fará isso.
    return { 
        subiuNivel: subiuNivelFlag, 
        pontosAtributoGanhosTotal: pontosAtributoGanhosNesteLevelUp, 
        pontosFeiticoGanhosTotal: pontosFeiticoGanhosNesteLevelUp, 
        ultimoNivelAlcancado: ultimoNivelAlcancadoNaLogica, 
        nivelOriginal: nivelOriginal 
    };
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


function normalizaNomeItemArcadia(str) {
    return str
        ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .toLowerCase()
        : '';
}

async function processarUsarItem(idJogadorDiscord, nomeItemInput, quantidadeUsar = 1) {
    const ficha = await getFichaOuCarregar(idJogadorDiscord);
    if (!ficha) return gerarEmbedErro("Uso de Item", "Sua ficha não foi encontrada.");

    const nomeItemNormalizado = normalizaNomeItemArcadia(nomeItemInput);
    const itemNoInventario = ficha.inventario.find(i => 
        normalizaNomeItemArcadia(i.itemNome) === nomeItemNormalizado
    );

    if (!itemNoInventario) {
        return gerarEmbedAviso("Item Não Encontrado", `Você não possui o item "${nomeItemInput}" no seu inventário.`);
    }
    if (itemNoInventario.quantidade < quantidadeUsar) {
        return gerarEmbedAviso("Quantidade Insuficiente", `Você tentou usar ${quantidadeUsar} de "${itemNoInventario.itemNome}", mas só tem ${itemNoInventario.quantidade}.`);
    }

    // O restante do seu código permanece igual:
    // Buscar item tanto pela chave normalizada quanto pela chave original
    let itemBase = ITENS_BASE_ARCADIA[normalizaNomeItemArcadia(itemNoInventario.itemNome)];
    if (!itemBase) {
        // Tentar buscar pela chave original (sem normalização)
        itemBase = ITENS_BASE_ARCADIA[itemNoInventario.itemNome.toLowerCase()];
    }
    if (!itemBase) {
        // Buscar por todas as chaves possíveis
        const nomeNormalizado = normalizaNomeItemArcadia(itemNoInventario.itemNome);
        const chaveEncontrada = Object.keys(ITENS_BASE_ARCADIA).find(chave => 
            normalizaNomeItemArcadia(chave) === nomeNormalizado
        );
        if (chaveEncontrada) {
            itemBase = ITENS_BASE_ARCADIA[chaveEncontrada];
        }
    }
    if (!itemBase || !itemBase.usavel) {
        return gerarEmbedAviso("Item Não Usável", `O item "${itemNoInventario.itemNome}" não pode ser usado desta forma.`);
    }

    const cooldownKey = `${normalizaNomeItemArcadia(itemNoInventario.itemNome)}_${idJogadorDiscord}`;
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
            efeitoAplicado = true;
            break;
    }

    if (efeitoAplicado) {
        itemNoInventario.quantidade -= quantidadeUsar;
        if (itemNoInventario.quantidade <= 0) {
            ficha.inventario = ficha.inventario.filter(i => normalizaNomeItemArcadia(i.itemNome) !== nomeItemNormalizado);
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


// NPC'S E MISSÕES

async function processarInteracaoComNPC(nomeOuIdNPC, fichaJogador, idDialogoEspecifico = null) {
    if (!npcsCollection || !fichasCollection || !missoesCollection) {
        console.error("Uma ou mais coleções não inicializadas em processarInteracaoComNPC! Tentando reconectar...");
        await conectarMongoDB();
        if (!npcsCollection || !fichasCollection || !missoesCollection) {
            return { erro: "Erro interno: As coleções do banco de dados não estão prontas." };
        }
    }

    // Em arcadia_sistema.js, substitua a lógica de query dentro de processarInteracaoComNPC por isto:
    try {
        console.log(`[DEBUG] Início processarInteracaoComNPC. Input Original nomeOuIdNPC: "${nomeOuIdNPC}", idDialogoEspecifico: ${idDialogoEspecifico}`);

        let query = {};
        const inputOriginal = String(nomeOuIdNPC).trim(); // Usar o input original para a lógica

        // Se um idDialogoEspecifico foi passado, assumimos que nomeOuIdNPC é um _id de NPC.
        // Os _id dos seus NPCs são strings como "npc_valdoria_guarda_arthur".
        if (idDialogoEspecifico) {
            query = { _id: inputOriginal };
            console.log(`[DEBUG] Buscando NPC por _ID (para diálogo específico): "${inputOriginal}"`);
        } else {
            // Se não há idDialogoEspecifico, é uma interação inicial via /interagir,
            // então nomeOuIdNPC é o NOME do NPC.
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
        const npcData = await npcsCollection.findOne(query); // ESTA DEVE SER A ÚNICA DECLARAÇÃO DE npcData aqui

        if (!npcData) {
            console.warn(`[processarInteracaoComNPC] NPC não encontrado com a query: ${JSON.stringify(query)} para input original: "${inputOriginal}"`);
            return { erro: `NPC "${inputOriginal}" não encontrado em Arcádia.` };
        }

        let dialogoParaMostrar = null;
        let todosObjetivosRealmenteCompletosParaFinalizar = false; // Se você usa essa variável
        let recompensasConcedidasLinhas = []; // Se você usa essa variável

        if (idDialogoEspecifico) {
            // Lógica para quando um BOTÃO foi clicado e um diálogo específico é solicitado
            const dialogoAlvo = npcData.dialogos.find(d => d.idDialogo === idDialogoEspecifico);

            if (dialogoAlvo) { // Se o diálogo específico foi encontrado nos dados do NPC
                const condicoesOk = await verificarCondicoesDialogo(dialogoAlvo.condicoesParaMostrar, fichaJogador, npcData, dialogoAlvo.ofereceMissao);

                if (!condicoesOk) {
                    // CONDIÇÕES NÃO CUMPRIDAS PARA O DIÁLOGO ESPECÍFICO
                    console.log(`[PROCESSAR NPC] Condições não cumpridas para diálogo específico "${idDialogoEspecifico}" do NPC "${npcData.nome}". Retornando mensagem de feedback.`);
                    return { 
                        erro: `${npcData.nome} parece pensar um pouco e responde: "Sinto que ainda não é o momento certo para seguirmos por esse caminho, ${fichaJogador.nomePersonagem}."`
                    };
                } else {
                    // Condições cumpridas, este é o diálogo para mostrar
                    dialogoParaMostrar = dialogoAlvo;
                }
            } else {
                // O idDialogoEspecifico solicitado não foi encontrado para este NPC
                console.warn(`[PROCESSAR NPC] Diálogo específico "${idDialogoEspecifico}" NÃO encontrado para NPC "${npcData.nome}". Tentando saudação padrão.`);
                dialogoParaMostrar = npcData.dialogos.find(d => d.tipo === "saudacao_padrao") || npcData.dialogos[0];
            }
        } else {
            // Lógica para INTERAÇÃO INICIAL (quando idDialogoEspecifico é null, vindo do comando /interagir)
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
            if (!dialogoParaMostrar) { // Fallback se nenhum diálogo priorizado com condições satisfeitas for encontrado
                console.log(`[PROCESSAR NPC] Nenhum diálogo priorizado aplicável. Buscando saudação padrão para "${npcData.nome}".`);
                dialogoParaMostrar = npcData.dialogos.find(d => d.tipo === "saudacao_padrao") || npcData.dialogos[0];
            }
        }

        // Verificação final (esta parte do seu código já está correta e deve ser mantida)
        if (!dialogoParaMostrar || !dialogoParaMostrar.texto) {
            console.error(`[PROCESSAR NPC] ERRO FINAL: Nenhum dialogoParaMostrar válido encontrado para NPC "${npcData.nome}" (idDialogoEspecifico: ${idDialogoEspecifico}). Objeto dialogoParaMostrar:`, dialogoParaMostrar);
            return { erro: `NPC "${npcData.nome}" não possui um diálogo válido para esta situação.` };
        }

        // ---- INÍCIO DA LÓGICA DE FINALIZAÇÃO DE MISSÃO ----
        if (dialogoParaMostrar.encerraMissao) {
            const idMissaoEncerrada = dialogoParaMostrar.encerraMissao;
            const missaoLogIndex = fichaJogador.logMissoes.findIndex(m => m.idMissao === idMissaoEncerrada && m.status === "aceita");

            if (missaoLogIndex !== -1) {
                const definicaoMissaoDB = await missoesCollection.findOne({ _id: idMissaoEncerrada });
                todosObjetivosRealmenteCompletosParaFinalizar = true; // Assumir verdadeiro inicialmente

                if (definicaoMissaoDB && definicaoMissaoDB.objetivos) {
                    for (const objDef of definicaoMissaoDB.objetivos) {
                        const objLog = fichaJogador.logMissoes[missaoLogIndex].objetivos.find(ol => ol.idObjetivo === objDef.idObjetivo);

                        let objetivoConsideradoValidoParaFim = false;
                        if (objLog && objLog.concluido) {
                            objetivoConsideradoValidoParaFim = true;
                        } else if (objDef.tipo === "ENTREGA") {
                            const condicaoItemPresenteNoDialogo = dialogoParaMostrar.condicoesParaMostrar?.some(c => 
                                c.tipo === "jogadorPossuiItemQuest" && 
                                objDef.itemNomeQuest && // Garantir que itemNomeQuest está definido no objetivo
                                c.itemNomeQuest.toLowerCase() === objDef.itemNomeQuest.toLowerCase()
                            );
                            const jogadorPossuiItemDeFato = fichaJogador.inventario.some(i => 
                                objDef.itemNomeQuest && // Garantir que itemNomeQuest está definido
                                i.itemNome.toLowerCase() === objDef.itemNomeQuest.toLowerCase() &&
                                i.quantidade >= (objDef.quantidadeNecessaria || 1)
                            );

                            if (condicaoItemPresenteNoDialogo && jogadorPossuiItemDeFato) {
                                objetivoConsideradoValidoParaFim = true;
                                if (objLog) objLog.concluido = true; // Marcar objetivo de entrega como concluído
                            }
                        } else if (objDef.tipo === "COMBATE_OPCIONAL") {
                            objetivoConsideradoValidoParaFim = true; // Opcionais não bloqueiam
                        }

                        if (!objetivoConsideradoValidoParaFim && objDef.tipo !== "COMBATE_OPCIONAL") {
                            todosObjetivosRealmenteCompletosParaFinalizar = false;
                            console.warn(`[Fim Missão] Tentativa de encerrar ${idMissaoEncerrada} mas objetivo <span class="math-inline">\{objDef\.idObjetivo\} \(</span>{objDef.descricao}) não está concluído ou item de entrega ausente.`);
                            // A mensagem de erro/aviso ao jogador seria melhor tratada no index.js
                            // baseado em 'todosObjetivosRealmenteCompletosParaFinalizar'
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
                            // Lógica de level up pode ser chamada aqui se xpAtual >= xpProximoNivel
                        }
                        if (rec.florinsDeOuro) {
                            fichaJogador.florinsDeOuro = (fichaJogador.florinsDeOuro || 0) + rec.florinsDeOuro;
                            recompensasConcedidasLinhas.push(`${rec.florinsDeOuro} Florins de Ouro`);
                        }
                        if (rec.itens && rec.itens.length > 0) {
                            for (const itemRec of rec.itens) {
                                if (Math.random() < (itemRec.chance || 1.0)) {
                                    await adicionarItemAoInventario(fichaJogador, itemRec.itemId, itemRec.quantidade);
                                    const nomeItemRec = ITENS_BASE_ARCADIA[itemRec.itemId.toLowerCase()]?.itemNome || itemRec.itemNomeOverride || itemRec.itemId;
                                    recompensasConcedidasLinhas.push(`<span class="math-inline">\{nomeItemRec\} \(x</span>{itemRec.quantidade})`);
                                }
                            }
                        }
                        // Adicionar lógica para reputação se necessário
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
        // ---- FIM DA LÓGICA DE FINALIZAÇÃO DE MISSÃO ----


        let imagemMissaoFinal = "";
if (dialogoParaMostrar && (dialogoParaMostrar.ofereceMissao || dialogoParaMostrar.encerraMissao)) {
    // Tenta buscar missão no banco pelo ID
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
            recompensasConcedidasTexto: recompensasConcedidasLinhas, // Novo campo para o index.js usar
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
            if (!fichaJogador.logMissoes) { // Se não tem log de missões
                 // Se a condição é para ser incompleto, e não há log, então está incompleto.
                if (cond.tipo === "objetivoMissaoIncompleto") return true;
                // Se a condição é para ser completo, e não há log, então não está completo.
                if (cond.tipo === "objetivoMissaoCompleto") return false;
            }

            const missaoLog = fichaJogador.logMissoes.find(m => m.idMissao === cond.idMissao);
            if (!missaoLog || missaoLog.status !== "aceita") {
                // Se a missão não está ativa, um objetivo específico dela não pode estar "completo".
                // E para "incompleto", se a missão não está ativa, o objetivo está de fato incompleto.
                if (cond.tipo === "objetivoMissaoIncompleto") {
                    // Não retorne true aqui ainda, pois pode haver outras condições.
                    // Se esta for a única condição e for verdadeira, o loop continua e retorna true no final.
                    // Se for falso, o loop deve ser interrompido.
                    // Esta parte da lógica é sutil: se a missão não está ativa, o objetivo está "incompleto"
                    // Se a condição é "objetivoMissaoIncompleto", essa parte da condição é atendida.
                    // Se a condição é "objetivoMissaoCompleto", essa parte da condição NÃO é atendida.
                    if (cond.tipo === "objetivoMissaoCompleto") return false; 
                    // Se for "objetivoMissaoIncompleto" e a missão não está ativa, esta parte está OK, continue verificando outras condições.
                } else { // cond.tipo === "objetivoMissaoCompleto"
                    return false; // Objetivo não pode estar completo se a missão não está ativa.
                }
            } else { // Missão está ativa, verificar o objetivo específico
                const objetivoNoLog = missaoLog.objetivos ? missaoLog.objetivos.find(o => o.idObjetivo === cond.idObjetivo) : null;
                if (!objetivoNoLog) {
                    console.warn(`[verificarCondicoesDialogo] Objetivo ${cond.idObjetivo} não encontrado no log da missão ${cond.idMissao} para o jogador ${fichaJogador._id}`);
                    // Se o objetivo não está no log (pode acontecer se a estrutura do log for alterada ou houver erro)
                    // considera-se incompleto.
                    if (cond.tipo === "objetivoMissaoCompleto") return false;
                    // Se for "objetivoMissaoIncompleto", esta parte está OK.
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

async function atualizarProgressoMissao(idJogador, idMissao, idObjetivo, progresso) {
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

        // Atualizar o log no array da ficha
        ficha.logMissoes[missaoIndex].objetivos[objetivoIndex] = objetivoLog;
        
        // Salvar a ficha
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

async function aceitarMissao(idJogador, idMissao, idNpcQueOfereceu) {
    const ficha = await getFichaOuCarregar(idJogador);
    if (!ficha) return { erro: "Sua ficha não foi encontrada." };

    if (!missoesCollection || !npcsCollection) { // Verifica se as coleções de missões e NPCs estão prontas
        console.error("Coleção de missões ou NPCs não inicializada para aceitarMissao.");
        return { erro: "Erro interno: Sistema de missões indisponível." };
    }

    const definicaoMissao = await missoesCollection.findOne({ _id: idMissao });
    if (!definicaoMissao) return { erro: "Definição da missão não encontrada." };

    // 1. Verificar se o jogador já tem a missão
    const missaoExistente = ficha.logMissoes ? ficha.logMissoes.find(m => m.idMissao === idMissao) : null;
    if (missaoExistente) {
        if (missaoExistente.status === "aceita") return { erro: `Você já está com a missão "${definicaoMissao.titulo}" ativa.` };
        if (missaoExistente.status === "concluida") return { erro: `Você já completou a missão "${definicaoMissao.titulo}".` };
        // Poderia haver outros status como "falhou", "cancelada"
    }

    // 2. Verificar pré-requisitos da missão (se houver)
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
            // Adicionar outras checagens de pré-requisitos (itens, reputação, etc.)
        }
    }

    const novaEntradaLogMissao = {
        idMissao: idMissao,
        tituloMissao: definicaoMissao.titulo,
        status: "aceita",
        dataInicio: new Date().toISOString(),
        objetivos: definicaoMissao.objetivos.map(objDef => ({ // Copia os objetivos da definição da missão
            idObjetivo: objDef.idObjetivo,
            descricao: objDef.descricao,
            // tipo: objDef.tipo, // O tipo já está na definição, não precisa repetir no log talvez
            quantidadeAtual: 0, // INICIALIZA A CONTAGEM
            concluido: false     // INICIALIZA COMO NÃO CONCLUÍDO
        })),
        // dialogoFeedbackAoAceitar: definicaoMissao.dialogoFeedbackAoAceitar || null // Se você usa isso
    };

    if (!ficha.logMissoes) ficha.logMissoes = [];
    ficha.logMissoes.push(novaEntradaLogMissao);

    // 4. Adicionar itens de quest (se houver)
    let itensRecebidosMsg = "";
    if (definicaoMissao.itensConcedidosAoAceitar && definicaoMissao.itensConcedidosAoAceitar.length > 0) {
        itensRecebidosMsg = "\n\nItens recebidos:";
        for (const itemQuest of definicaoMissao.itensConcedidosAoAceitar) {
            await adicionarItemAoInventario(ficha, itemQuest.idItem, itemQuest.quantidade); // Usar a função já existente
            itensRecebidosMsg += `\n- ${itemQuest.idItem} (x${itemQuest.quantidade})`;
        }
    }

    // 5. Salvar a ficha
    await atualizarFichaNoCacheEDb(idJogador, ficha);

    let msgSucesso = `Missão **"${definicaoMissao.titulo}"** aceita!`;
    if (itensRecebidosMsg) msgSucesso += itensRecebidosMsg;

    // Retorna o ID do diálogo de feedback se existir, para o NPC "responder"
    return { 
        sucesso: msgSucesso, 
        dialogoFeedbackId: definicaoMissao.dialogoFeedbackAoAceitar || null 
    };
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

// =====================================================================================
// FUNÇÃO DE TESTE DE FEITIÇOS
// =====================================================================================

async function processarTestarTodosFeiticos(jogadorId) {
    const ficha = await getFichaOuCarregar(jogadorId);
    if (!ficha) {
        return gerarEmbedErro("Ficha Não Encontrada", "Você precisa ter uma ficha criada para testar feitiços.");
    }

    // Contar feitiços por categoria
    const categorias = {
        raca: 0,
        classe: 0,
        escola: 0,
        total: 0
    };

    const feiticosPorCategoria = {
        raca: [],
        classe: [],
        escola: []
    };

    // Analisar todos os feitiços
    for (const [id, feitico] of Object.entries(FEITICOS_BASE_ARCADIA)) {
        categorias.total++;
        
        if (feitico.origemTipo === 'raca') {
            categorias.raca++;
            feiticosPorCategoria.raca.push(feitico.nome);
        } else if (feitico.origemTipo === 'classe') {
            categorias.classe++;
            feiticosPorCategoria.classe.push(feitico.nome);
        } else if (feitico.origemTipo === 'escola') {
            categorias.escola++;
            feiticosPorCategoria.escola.push(feitico.nome);
        }
    }

    // Verificar feitiços conhecidos pelo jogador
    const feiticosConhecidos = ficha.magias ? ficha.magias.length : 0;
    const feiticosDisponiveis = Object.values(FEITICOS_BASE_ARCADIA).filter(f => 
        (f.origemTipo === 'raca' && f.origemNome === ficha.raca) ||
        (f.origemTipo === 'classe' && f.origemNome === ficha.classe)
    ).length;

    const embed = gerarEmbedSucesso("🔮 Análise Completa do Sistema de Feitiços", 
        `**📊 Estatísticas Gerais:**
` +
        `• **Total de Feitiços:** ${categorias.total}
` +
        `• **Feitiços de Raça:** ${categorias.raca}
` +
        `• **Feitiços de Classe:** ${categorias.classe}
` +
        `• **Feitiços de Escola:** ${categorias.escola}

` +
        
        `**👤 Status do Personagem:**
` +
        `• **Nome:** ${ficha.nomePersonagem}
` +
        `• **Raça:** ${ficha.raca}
` +
        `• **Classe:** ${ficha.classe}
` +
        `• **Nível:** ${ficha.nivel}
` +
        `• **Feitiços Conhecidos:** ${feiticosConhecidos}
` +
        `• **Feitiços Disponíveis:** ${feiticosDisponiveis}

` +
        
        `**🎯 Exemplos por Categoria:**
` +
        `• **Raça:** ${feiticosPorCategoria.raca.slice(0, 3).join(', ')}${feiticosPorCategoria.raca.length > 3 ? '...' : ''}
` +
        `• **Classe:** ${feiticosPorCategoria.classe.slice(0, 3).join(', ')}${feiticosPorCategoria.classe.length > 3 ? '...' : ''}
` +
        `• **Escola:** ${feiticosPorCategoria.escola.slice(0, 3).join(', ')}${feiticosPorCategoria.escola.length > 3 ? '...' : ''}

` +
        
        `*Sistema de feitiços funcionando corretamente!*
` +
        `*Use /admincriardummy para criar um dummy e testar seus feitiços em combate.*`
    );

    return embed;
}

// =====================================================================================
// FUNÇÕES DE ADMIN PARA SACOS DE PANCADA (DUMMIES)
// =====================================================================================

async function processarAdminCriarDummy(nomeDummy, nivel, pv, pm, contraataca, tipo, adminNome, jogadorId) {
    if (!dummiesCollection) {
        console.error("Coleção de dummies não inicializada.");
        await conectarMongoDB();
        if (!dummiesCollection) {
            return gerarEmbedErro("Erro do Sistema", "Sistema de dummies indisponível.");
        }
    }

    if (!mobsCollection) {
        console.error("Coleção de mobs não inicializada.");
        await conectarMongoDB();
        if (!mobsCollection) {
            return gerarEmbedErro("Erro do Sistema", "Sistema de combate indisponível.");
        }
    }

    try {
        // Verificar se já existe um dummy com esse nome
        const dummyExistente = await dummiesCollection.findOne({ nome: nomeDummy });
        if (dummyExistente) {
            return gerarEmbedAviso("Dummy Já Existe", `Já existe um saco de pancada chamado "${nomeDummy}". Use um nome diferente ou remova o existente primeiro.`);
        }

        // Verificar se o jogador tem uma ficha
        const ficha = await getFichaOuCarregar(jogadorId);
        if (!ficha) {
            return gerarEmbedErro("Ficha Não Encontrada", "Você precisa ter uma ficha criada para lutar contra dummies.");
        }

        if (ficha.pvAtual <= 0) {
            return gerarEmbedErro("Personagem Incapacitado", `${ficha.nomePersonagem} está incapacitado e não pode iniciar combate.`);
        }

        // Configuração personalizada baseada nos parâmetros
        const configuracaoCustom = {
            criadoPor: adminNome
        };

        if (nivel !== null) configuracaoCustom.nivel = nivel;
        if (pv !== null) configuracaoCustom.pv = pv;
        if (pm !== null) configuracaoCustom.pm = pm;
        if (contraataca !== null) configuracaoCustom.contraataca = contraataca;

        // Gerar o dummy usando o sistema de dados
        const novoDummy = dummies.gerarDummy(nomeDummy, tipo || 'basico', configuracaoCustom);

        // Salvar como mob temporário para combate
        await mobsCollection.insertOne(novoDummy);
        
        // Adicionar ao cache de dummies
        dummiesAtivos[novoDummy._id] = novoDummy;

        console.log(`[ADMIN] Dummy "${nomeDummy}" criado por ${adminNome} e combate iniciado com ${ficha.nomePersonagem}`);

        // Iniciar combate automaticamente
        const resultadoCombate = await iniciarCombatePvE(jogadorId, novoDummy._id);
        
        if (resultadoCombate.erro) {
            return gerarEmbedErro("Erro ao Iniciar Combate", resultadoCombate.erro);
        }

        const embed = gerarEmbedSucesso("⚔️ Dummy Criado e Combate Iniciado!", 
            `**${novoDummy.nome}** foi criado e o combate começou!

` +
            `**Tipo:** ${tipo || 'básico'}
` +
            `**Nível:** ${novoDummy.nivel}
` +
            `**PV:** ${novoDummy.pvAtual}/${novoDummy.atributos.pvMax}
` +
            `**PM:** ${novoDummy.pmAtual}/${novoDummy.atributos.pmMax}
` +
            `**Contra-ataca:** ${novoDummy.contraataca ? 'Sim' : 'Não'}

` +
            `🎯 **${ficha.nomePersonagem}** vs **${novoDummy.nome}**
` +
            `${resultadoCombate.mensagemInicial}

` +
            `*Use seus feitiços e habilidades para testar contra este dummy!*
` +
            `*ID do Combate: \`${resultadoCombate.idCombate}\`*`
        );

        // Retornar embed com informações do combate
        return {
            embed: embed,
            combateIniciado: true,
            idCombate: resultadoCombate.idCombate,
            estadoCombate: resultadoCombate.estadoCombate
        };

    } catch (error) {
        console.error("Erro ao criar dummy:", error);
        return gerarEmbedErro("Erro ao Criar Dummy", "Ocorreu um erro interno ao criar o saco de pancada.");
    }
}

async function processarAdminRemoverDummy(nomeDummy, resetar, adminNome) {
    if (!dummiesCollection) {
        console.error("Coleção de dummies não inicializada.");
        await conectarMongoDB();
        if (!dummiesCollection) {
            return gerarEmbedErro("Erro do Sistema", "Sistema de dummies indisponível.");
        }
    }

    try {
        // Buscar o dummy pelo nome
        const dummy = await dummiesCollection.findOne({ nome: nomeDummy });
        if (!dummy) {
            return gerarEmbedAviso("Dummy Não Encontrado", `Nenhum saco de pancada chamado "${nomeDummy}" foi encontrado.`);
        }

        if (resetar) {
            // Resetar o dummy (restaurar PV/PM)
            const atualizacao = {
                pvAtual: dummy.pvMaximo,
                pmAtual: dummy.pmMaximo,
                ativo: true,
                ultimoReset: new Date()
            };

            await dummiesCollection.updateOne({ _id: dummy._id }, { $set: atualizacao });
            
            // Atualizar cache
            if (dummiesAtivos[dummy._id]) {
                Object.assign(dummiesAtivos[dummy._id], atualizacao);
            }

            console.log(`[ADMIN] Dummy "${nomeDummy}" resetado por ${adminNome}`);
            
            return gerarEmbedSucesso("🔄 Dummy Resetado", 
                `**${dummy.nome}** foi resetado com sucesso!\n\n` +
                `**PV:** ${dummy.pvMaximo}/${dummy.pvMaximo}\n` +
                `**PM:** ${dummy.pmMaximo}/${dummy.pmMaximo}\n` +
                `**Status:** Ativo\n\n` +
                `*Resetado por ${adminNome}*`
            );
        } else {
            // Remover o dummy permanentemente
            await dummiesCollection.deleteOne({ _id: dummy._id });
            
            // Remover do cache
            delete dummiesAtivos[dummy._id];

            console.log(`[ADMIN] Dummy "${nomeDummy}" removido por ${adminNome}`);
            
            return gerarEmbedSucesso("🗑️ Dummy Removido", 
                `**${dummy.nome}** foi removido permanentemente.\n\n` +
                `*Removido por ${adminNome}*`
            );
        }

    } catch (error) {
        console.error("Erro ao remover/resetar dummy:", error);
        return gerarEmbedErro("Erro ao Processar Dummy", "Ocorreu um erro interno ao processar o saco de pancada.");
    }
}

async function processarAdminListarDummies() {
    if (!dummiesCollection) {
        console.error("Coleção de dummies não inicializada.");
        await conectarMongoDB();
        if (!dummiesCollection) {
            return gerarEmbedErro("Erro do Sistema", "Sistema de dummies indisponível.");
        }
    }

    try {
        const dummiesAtivos = await dummiesCollection.find({ ativo: { $ne: false } }).toArray();
        
        if (dummiesAtivos.length === 0) {
            return gerarEmbedAviso("Nenhum Dummy Ativo", "Não há sacos de pancada ativos no momento.");
        }

        const embed = new EmbedBuilder()
            .setColor(0x4A90E2)
            .setTitle("🎯 Sacos de Pancada Ativos")
            .setDescription(`Total: ${dummiesAtivos.length} dummy(s) ativo(s)`)
            .setTimestamp();

        let descricao = "";
        dummiesAtivos.forEach((dummy, index) => {
            const statusPV = `${dummy.pvAtual}/${dummy.pvMaximo}`;
            const statusPM = `${dummy.pmAtual}/${dummy.pmMaximo}`;
            const contraataca = dummy.contraataca ? "✅" : "❌";
            
            descricao += `**${index + 1}. ${dummy.nome}**\n`;
            descricao += `• Nível: ${dummy.nivel} | PV: ${statusPV} | PM: ${statusPM}\n`;
            descricao += `• Contra-ataca: ${contraataca} | Tipo: ${dummy.tipo || 'básico'}\n`;
            descricao += `• ID: \`${dummy._id}\`\n`;
            descricao += `• Criado por: ${dummy.criadoPor || 'N/A'}\n\n`;
        });

        // Dividir em campos se a descrição for muito longa
        if (descricao.length > 4000) {
            const campos = [];
            let campoAtual = "";
            const linhas = descricao.split('\n');
            
            for (const linha of linhas) {
                if ((campoAtual + linha + '\n').length > 1000) {
                    if (campoAtual) campos.push(campoAtual);
                    campoAtual = linha + '\n';
                } else {
                    campoAtual += linha + '\n';
                }
            }
            if (campoAtual) campos.push(campoAtual);
            
            campos.forEach((campo, index) => {
                embed.addFields({
                    name: index === 0 ? "Lista de Dummies" : `Continuação ${index + 1}`,
                    value: campo,
                    inline: false
                });
            });
        } else {
            embed.addFields({
                name: "Lista de Dummies",
                value: descricao,
                inline: false
            });
        }

        return embed;

    } catch (error) {
        console.error("Erro ao listar dummies:", error);
        return gerarEmbedErro("Erro ao Listar Dummies", "Ocorreu um erro interno ao listar os sacos de pancada.");
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
        adminCommandsDescription += "`/adminexcluirficha jogador:<@jogador> confirmacao:CONFIRMAR EXCLUSAO`\n*EXCLUI PERMANENTEMENTE uma ficha.*\n\n";
        adminCommandsDescription += "**🎯 Comandos de Sacos de Pancada:**\n";
        adminCommandsDescription += "`/admincriardummy nome:<nome> [nivel:val] [pv:val] [pm:val] [contraataca:bool] [tipo:tipo]`\n*Cria um saco de pancada.*\n\n";
        adminCommandsDescription += "`/adminremoverdummy nome:<nome> [resetar:bool]`\n*Remove/reseta um saco de pancada.*\n\n";
        adminCommandsDescription += "`/adminlistardummies`\n*Lista todos os sacos de pancada ativos.*";

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
console.log(">>> [arcadia_sistema.js | FIM DO ARQUIVO] Estado de missoesCollection ANTES do module.exports:", typeof missoesCollection, !!missoesCollection);
module.exports = {
    // Dados e Constantes
    RACAS_ARCADIA, CLASSES_ARCADIA, CLASSES_ESPECIAIS_ARCADIA, REINOS_ARCADIA,
    FEITICOS_BASE_ARCADIA, ITENS_BASE_ARCADIA, combates,
    MAPA_CARGOS_RACAS, MAPA_CARGOS_CLASSES, MAPA_CARGOS_REINOS,
    NOME_CARGO_AVENTUREIRO, NOME_CARGO_VISITANTE,
    ID_CANAL_BOAS_VINDAS_RPG, ID_CANAL_RECRUTAMENTO, ID_CANAL_ATUALIZACAO_FICHAS,
    fichaModeloArcadia,
    atributosValidos, iniciarCombatePvE, finalizarCombate, processarAcaoJogadorCombate, processarTurnoMobCombate, getEstadoCombateParaRetorno,
    JACKPOT_PREMIOS_NOMES_COMUNS, JACKPOT_PREMIOS_NOMES_INCOMUNS, JACKPOT_PREMIOS_NOMES_RAROS,
    ATRIBUTOS_FOCO_POR_CLASSE,
    ATRIBUTOS_FOCO_POR_RACA,

    // Funções de Banco de Dados e Cache
    conectarMongoDB, carregarFichasDoDB, getFichaOuCarregar,
    atualizarFichaNoCacheEDb, calcularXpProximoNivel,
    calcularPFGanhosNoNivel, calcularValorDaFormula,

getFichasCollection,
    getNpcsCollection,
    getMissoesCollection,
    getMobsCollection,

    // Funções de Geração de Embeds Genéricas
    gerarEmbedErro, gerarEmbedSucesso, gerarEmbedAviso,

    // Funções de Lógica de Comandos de Jogador
    gerarMensagemBoasVindas, gerarEmbedHistoria,
    gerarListaRacasEmbed, gerarListaClassesEmbed, gerarListaReinosEmbed,
    processarCriarFichaSlash, processarVerFichaEmbed, processarDistribuirPontosSlash,
    aprenderFeitico, usarFeitico,
    processarJackpot, processarUsarItem,
    gerarListaComandos, processarInventario,
    processarMeusFeiticos, aceitarMissao,

    // Funções de Lógica de Comandos de Admin
    processarAdminCriarFicha, processarAdminAddXP, processarAdminSetNivel,
    processarAdminAddMoedas, processarAdminAddItem, processarAdminDelItem,
    processarAdminSetAtributo, processarAdminAddPontosAtributo, processarAdminExcluirFicha,
    processarUparFeitico,processarInteracaoComNPC,
    
    // Funções de Admin para Dummies
    processarAdminCriarDummy, processarAdminRemoverDummy, processarAdminListarDummies,
    
    // Função de Teste de Sistema
    processarTestarTodosFeiticos,


    // Novas Funções de Autocomplete
    getMagiasConhecidasParaAutocomplete, // Mantida e ajustada
    getInventarioParaAutocomplete,
    getItensBaseParaAutocomplete,
    getFeiticosDisponiveisParaAprender,
    getFeiticosUparaveisParaAutocomplete,
    getTodosFeiticosBaseParaAutocomplete,
    getTodosNPCsParaAutocomplete,
};
