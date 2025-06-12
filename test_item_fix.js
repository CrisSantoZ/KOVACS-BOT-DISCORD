// Teste específico para verificar correção de itens
require('dotenv').config();

const Arcadia = require('./arcadia_sistema.js');

console.log("🧪 Testando correção do sistema de itens...");

// Simular a lógica corrigida
function testarBuscaItem(nomeItem) {
    const itens = Arcadia.ITENS_BASE_ARCADIA;
    
    function normalizaNomeItemArcadia(str) {
        return str
            ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '')
                .toLowerCase()
            : '';
    }
    
    // Buscar item tanto pela chave normalizada quanto pela chave original
    let itemBase = itens[normalizaNomeItemArcadia(nomeItem)];
    if (!itemBase) {
        // Tentar buscar pela chave original (sem normalização)
        itemBase = itens[nomeItem.toLowerCase()];
    }
    if (!itemBase) {
        // Buscar por todas as chaves possíveis
        const nomeNormalizado = normalizaNomeItemArcadia(nomeItem);
        const chaveEncontrada = Object.keys(itens).find(chave => 
            normalizaNomeItemArcadia(chave) === nomeNormalizado
        );
        if (chaveEncontrada) {
            itemBase = itens[chaveEncontrada];
        }
    }
    
    return itemBase;
}

// Testar diferentes variações do nome
const testesNomes = [
    "Poção de Mana Maior",
    "poção de mana maior", 
    "pocao de mana maior",
    "Poção de Cura Menor",
    "poção de cura menor"
];

console.log("\n🔍 Testando busca de itens:");
testesNomes.forEach(nome => {
    const item = testarBuscaItem(nome);
    console.log(`   "${nome}" → ${item ? 'ENCONTRADO ✅' : 'NÃO ENCONTRADO ❌'}`);
    if (item) {
        console.log(`      Nome: ${item.itemNome}`);
        console.log(`      Usável: ${item.usavel}`);
        console.log(`      Efeito: ${item.efeito?.tipoEfeito || 'N/A'}`);
    }
    console.log('');
});

console.log("✨ Teste de correção finalizado!");
