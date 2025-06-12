// Debug detalhado da função calcularValorDaFormula
require('dotenv').config();

console.log("🔍 Debug detalhado da função calcularValorDaFormula...");

// Função de debug com logs detalhados
function calcularValorDaFormulaDebug(formula, atributosConjurador, atributosAlvo = {}) {
    console.log(`\n🧮 === PROCESSANDO FÓRMULA: "${formula}" ===`);
    
    if (!formula || typeof formula !== 'string') {
        console.warn("❌ Fórmula inválida:", formula);
        return 0;
    }
    
    let expressao = formula.replace(/\s/g, '').toLowerCase();
    console.log(`   📝 Expressão inicial: "${expressao}"`);
    
    const todosAtributos = { ...atributosConjurador, ...atributosAlvo };
    console.log(`   📊 Atributos disponíveis:`, todosAtributos);

    // Lista de atributos válidos para substituição
    const atributosValidos = ['forca', 'agilidade', 'vitalidade', 'manabase', 'intelecto', 'carisma'];
    
    // Substituir cada atributo na expressão
    for (const atributo of atributosValidos) {
        if (todosAtributos[atributo] !== undefined) {
            const valorAntes = expressao;
            const regex = new RegExp(`\\b${atributo}\\b`, 'g');
            expressao = expressao.replace(regex, String(todosAtributos[atributo] || 0));
            if (valorAntes !== expressao) {
                console.log(`   🔄 Substituiu "${atributo}" (${todosAtributos[atributo]}): "${valorAntes}" → "${expressao}"`);
            }
        }
    }

    console.log(`   📝 Expressão final: "${expressao}"`);
    
    // Debug do regex de validação
    const regexValidacao = /^[0-9.+\-*/()]+$/;
    const ehValida = regexValidacao.test(expressao);
    console.log(`   🔍 Regex de validação: ${regexValidacao}`);
    console.log(`   ✅ Expressão é válida: ${ehValida}`);
    
    if (!ehValida) {
        console.log(`   🔍 Caracteres na expressão:`);
        for (let i = 0; i < expressao.length; i++) {
            const char = expressao[i];
            const charCode = char.charCodeAt(0);
            const ehValido = /[0-9.+\-*/()]/.test(char);
            console.log(`      [${i}] "${char}" (código: ${charCode}) - ${ehValido ? 'VÁLIDO' : 'INVÁLIDO'}`);
        }
    }

    try {
        if (!ehValida) {
            console.warn("   ❌ Expressão contém caracteres inválidos após substituição:", expressao);
            return 0;
        }
        const resultado = Math.floor(new Function(`return ${expressao}`)());
        const resultadoFinal = isNaN(resultado) ? 0 : resultado;
        console.log(`   ✅ Resultado calculado: ${resultado} → ${resultadoFinal}`);
        return resultadoFinal;
    } catch (e) {
        console.error(`   ❌ Erro ao calcular:`, e.message);
        return 0;
    }
}

// Testar com atributos
const atributos = { 
    forca: 10, 
    agilidade: 8, 
    vitalidade: 12, 
    intelecto: 15, 
    carisma: 9, 
    manabase: 11 
};

const formulas = [
    "forca + intelecto",
    "forca*1.3"
];

formulas.forEach(formula => {
    calcularValorDaFormulaDebug(formula, atributos);
});

console.log("\n✨ Debug detalhado finalizado!");
