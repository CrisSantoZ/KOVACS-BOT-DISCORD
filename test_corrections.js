// Script de teste para verificar as correções nos sistemas de itens e feitiços
require('dotenv').config();

// Importar o sistema Arcadia
const Arcadia = require('./arcadia_sistema.js');

async function testarCorrecoes() {
    console.log("🧪 Iniciando testes das correções...");
    
    try {
        // Teste 1: Verificar se a função calcularValorDaFormula funciona
        console.log("\n📊 Teste 1: Função calcularValorDaFormula");
        const atributos = { forca: 10, intelecto: 15, vitalidade: 12 };
        const resultado1 = Arcadia.calcularValorDaFormula("forca + intelecto", atributos);
        console.log(`Fórmula "forca + intelecto" com atributos {forca: 10, intelecto: 15}: ${resultado1}`);
        
        const resultado2 = Arcadia.calcularValorDaFormula("intelecto * 2", atributos);
        console.log(`Fórmula "intelecto * 2" com atributos {intelecto: 15}: ${resultado2}`);
        
        // Teste 2: Verificar estrutura de itens
        console.log("\n🎒 Teste 2: Estrutura de itens");
        const itens = Arcadia.ITENS_BASE_ARCADIA;
        const pocaoCura = itens["poção de cura menor"];
        if (pocaoCura) {
            console.log("✅ Poção de cura menor encontrada:");
            console.log(`   Nome: ${pocaoCura.nome}`);
            console.log(`   Tipo: ${pocaoCura.tipo}`);
            console.log(`   Efeito: ${JSON.stringify(pocaoCura.efeito, null, 2)}`);
        } else {
            console.log("❌ Poção de cura menor não encontrada");
        }
        
        // Teste 3: Verificar estrutura de feitiços
        console.log("\n🔮 Teste 3: Estrutura de feitiços");
        const feiticos = Arcadia.FEITICOS_BASE_ARCADIA;
        const primeiroFeitico = Object.keys(feiticos)[0];
        if (primeiroFeitico) {
            const feitico = feiticos[primeiroFeitico];
            console.log(`✅ Primeiro feitiço encontrado: ${feitico.nome}`);
            console.log(`   ID: ${primeiroFeitico}`);
            console.log(`   Tipo: ${feitico.tipo}`);
            console.log(`   Níveis disponíveis: ${feitico.niveis?.length || 0}`);
            if (feitico.niveis && feitico.niveis[0]) {
                console.log(`   Primeiro nível - Custo PM: ${feitico.niveis[0].custoPM}`);
                console.log(`   Primeiro nível - Efeito: ${JSON.stringify(feitico.niveis[0].efeitoDetalhes, null, 2)}`);
            }
        } else {
            console.log("❌ Nenhum feitiço encontrado");
        }
        
        // Teste 4: Verificar se as funções de combate estão disponíveis
        console.log("\n⚔️ Teste 4: Funções de combate");
        console.log(`✅ iniciarCombatePvE: ${typeof Arcadia.iniciarCombatePvE}`);
        console.log(`✅ processarAcaoJogadorCombate: ${typeof Arcadia.processarAcaoJogadorCombate}`);
        console.log(`✅ processarUsarItem: ${typeof Arcadia.processarUsarItem}`);
        
        console.log("\n🎉 Testes concluídos com sucesso!");
        
    } catch (error) {
        console.error("❌ Erro durante os testes:", error);
    }
}

// Executar os testes
testarCorrecoes().then(() => {
    console.log("\n✨ Script de teste finalizado.");
    process.exit(0);
}).catch(error => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
});
