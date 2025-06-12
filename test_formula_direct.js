// Teste direto da função calcularValorDaFormula
require('dotenv').config();

const Arcadia = require('./arcadia_sistema.js');

console.log("🔍 Teste direto da função calcularValorDaFormula...");

// Verificar se a função está disponível
console.log("\n📋 Verificando disponibilidade:");
console.log("   calcularValorDaFormula:", typeof Arcadia.calcularValorDaFormula);

if (typeof Arcadia.calcularValorDaFormula === 'function') {
    console.log("\n✅ Função encontrada! Testando...");
    
    const atributos = { 
        forca: 10, 
        agilidade: 8, 
        vitalidade: 12, 
        intelecto: 15, 
        carisma: 9, 
        manabase: 11 
    };
    
    console.log("\n📊 Atributos de teste:", atributos);
    
    const formulas = [
        "forca + intelecto",
        "forca*1.3", 
        "intelecto * 2",
        "(carisma*1.2)+(intelecto*0.3)",
        "manabase * 3 + forca"
    ];
    
    console.log("\n🧮 Testando fórmulas:");
    formulas.forEach(formula => {
        try {
            const resultado = Arcadia.calcularValorDaFormula(formula, atributos);
            console.log(`   "${formula}" → ${resultado}`);
        } catch (error) {
            console.error(`   ❌ Erro em "${formula}":`, error.message);
        }
    });
    
} else {
    console.log("\n❌ Função calcularValorDaFormula não encontrada!");
    console.log("\n📋 Funções disponíveis no módulo Arcadia:");
    Object.keys(Arcadia).forEach(key => {
        if (typeof Arcadia[key] === 'function') {
            console.log(`   - ${key}`);
        }
    });
}

console.log("\n✨ Teste direto finalizado!");
