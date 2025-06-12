// Debug para verificar chaves dos itens
require('dotenv').config();

const Arcadia = require('./arcadia_sistema.js');

console.log("🔍 Debugando sistema de itens...");

// Verificar algumas chaves dos itens
const itens = Arcadia.ITENS_BASE_ARCADIA;
const chavesItens = Object.keys(itens).slice(0, 10);

console.log("\n📋 Primeiras 10 chaves dos itens:");
chavesItens.forEach(chave => {
    console.log(`   "${chave}"`);
});

// Testar função de normalização
function normalizaNomeItemArcadia(str) {
    return str
        ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .toLowerCase()
        : '';
}

console.log("\n🧪 Testando normalização:");
const testesNomes = [
    "Poção de Mana Maior",
    "poção de mana maior", 
    "pocao de mana maior",
    "PocaoDeManamaior"
];

testesNomes.forEach(nome => {
    const normalizado = normalizaNomeItemArcadia(nome);
    const itemEncontrado = itens[normalizado];
    console.log(`   "${nome}" → "${normalizado}" → ${itemEncontrado ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
});

// Procurar itens que contenham "mana maior"
console.log("\n🔍 Procurando itens com 'mana maior':");
Object.keys(itens).forEach(chave => {
    if (chave.includes('mana') && chave.includes('maior')) {
        const item = itens[chave];
        console.log(`   Chave: "${chave}"`);
        console.log(`   Nome: "${item.itemNome || item.nome}"`);
        console.log(`   Usável: ${item.usavel}`);
        console.log(`   Efeito: ${item.efeito ? 'SIM' : 'NÃO'}`);
        console.log('');
    }
});
