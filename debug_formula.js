const { calcularValorDaFormula } = require('./arcadia_sistema.js');

console.log('🔍 Debug da função calcularValorDaFormula');

const atributos = {
    forca: 10,
    agilidade: 8,
    vitalidade: 12,
    manabase: 15,
    intelecto: 20,
    carisma: 14
};

console.log('Atributos de teste:', atributos);

// Teste 1: Fórmula simples
console.log('\n--- Teste 1: Fórmula simples ---');
const formula1 = 'forca + intelecto';
console.log(`Fórmula original: "${formula1}"`);

// Simular o processo interno
let expressao = formula1.toLowerCase();
console.log(`Após toLowerCase: "${expressao}"`);

// Substituir atributos
const atributosValidos = ['forca', 'agilidade', 'vitalidade', 'manabase', 'intelecto', 'carisma'];
for (const atributo of atributosValidos) {
    if (atributos[atributo] !== undefined) {
        const regex = new RegExp(`\\b${atributo}\\b`, 'g');
        const antes = expressao;
        expressao = expressao.replace(regex, String(atributos[atributo] || 0));
        if (antes !== expressao) {
            console.log(`Substituindo ${atributo}: "${antes}" → "${expressao}"`);
        }
    }
}

// Remover espaços
expressao = expressao.replace(/\s/g, '');
console.log(`Após remover espaços: "${expressao}"`);

// Testar regex
const regex = /^[0-9.+\-*/()]+$/;
console.log(`Regex test: ${regex.test(expressao)}`);

// Testar função completa
const resultado = calcularValorDaFormula(formula1, atributos);
console.log(`Resultado da função: ${resultado}`);

console.log('\n--- Teste 2: Fórmula com parênteses ---');
const formula2 = '(carisma*1.2)+(intelecto*0.3)';
const resultado2 = calcularValorDaFormula(formula2, atributos);
console.log(`Fórmula: "${formula2}"`);
console.log(`Resultado: ${resultado2}`);
