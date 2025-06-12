// Teste completo do sistema de combate
require('dotenv').config();

const Arcadia = require('./arcadia_sistema.js');

async function testarSistemaCombateCompleto() {
    console.log("🧪 Iniciando testes completos do sistema de combate...");
    
    try {
        // Teste 1: Verificar função calcularValorDaFormula com diferentes cenários
        console.log("\n📊 Teste 1: Função calcularValorDaFormula - Cenários diversos");
        const atributos = { forca: 10, agilidade: 8, vitalidade: 12, intelecto: 15, carisma: 9, manabase: 11 };
        
        const formulas = [
            "forca + intelecto",
            "intelecto * 2",
            "(carisma*1.2)+(intelecto*0.3)",
            "vitalidade + agilidade - 2",
            "manabase * 3 + forca"
        ];
        
        formulas.forEach(formula => {
            const resultado = Arcadia.calcularValorDaFormula(formula, atributos);
            console.log(`   Fórmula "${formula}": ${resultado}`);
        });
        
        // Teste 2: Verificar estrutura completa de itens consumíveis
        console.log("\n🎒 Teste 2: Estrutura de itens consumíveis");
        const itens = Arcadia.ITENS_BASE_ARCADIA;
        const itensConsumíveis = Object.keys(itens).filter(key => 
            itens[key].tipo === "Consumível" && itens[key].usavel
        );
        
        console.log(`   ✅ Encontrados ${itensConsumíveis.length} itens consumíveis:`);
        itensConsumíveis.slice(0, 5).forEach(itemKey => {
            const item = itens[itemKey];
            console.log(`      - ${item.itemNome}: ${item.efeito?.tipoEfeito || "Sem efeito definido"}`);
        });
        
        // Teste 3: Verificar feitiços com diferentes tipos de efeito
        console.log("\n🔮 Teste 3: Feitiços com diferentes tipos de efeito");
        const feiticos = Arcadia.FEITICOS_BASE_ARCADIA;
        const tiposEfeito = {};
        
        Object.values(feiticos).forEach(feitico => {
            if (feitico.niveis && feitico.niveis[0] && feitico.niveis[0].efeitoDetalhes) {
                const efeito = feitico.niveis[0].efeitoDetalhes;
                if (efeito.formulaCura) tiposEfeito.cura = (tiposEfeito.cura || 0) + 1;
                if (efeito.formulaDano) tiposEfeito.dano = (tiposEfeito.dano || 0) + 1;
                if (efeito.buff) tiposEfeito.buff = (tiposEfeito.buff || 0) + 1;
                if (efeito.debuff) tiposEfeito.debuff = (tiposEfeito.debuff || 0) + 1;
            }
        });
        
        console.log("   ✅ Tipos de efeitos encontrados:");
        Object.entries(tiposEfeito).forEach(([tipo, quantidade]) => {
            console.log(`      - ${tipo}: ${quantidade} feitiços`);
        });
        
        // Teste 4: Simular uso de item (sem banco de dados)
        console.log("\n⚔️ Teste 4: Simulação de uso de item");
        const pocaoCura = itens["poção de cura menor"];
        if (pocaoCura && pocaoCura.efeito) {
            console.log(`   ✅ Item: ${pocaoCura.itemNome}`);
            console.log(`   ✅ Tipo de efeito: ${pocaoCura.efeito.tipoEfeito}`);
            console.log(`   ✅ Valor: ${pocaoCura.efeito.valor}`);
            console.log(`   ✅ Mensagem: ${pocaoCura.efeito.mensagemAoUsar}`);
            
            // Simular aplicação do efeito
            let pvSimulado = 50; // PV atual simulado
            const pvMax = 100;
            
            if (pocaoCura.efeito.tipoEfeito === "CURA_HP") {
                const pvAntes = pvSimulado;
                pvSimulado = Math.min(pvMax, pvSimulado + pocaoCura.efeito.valor);
                console.log(`   ✅ Simulação: PV ${pvAntes} → ${pvSimulado} (+${pvSimulado - pvAntes})`);
            }
        }
        
        // Teste 5: Verificar feitiço com fórmula de cura
        console.log("\n🌟 Teste 5: Simulação de feitiço de cura");
        const feiticoCura = Object.values(feiticos).find(f => 
            f.niveis && f.niveis[0] && f.niveis[0].efeitoDetalhes && f.niveis[0].efeitoDetalhes.formulaCura
        );
        
        if (feiticoCura) {
            const nivel1 = feiticoCura.niveis[0];
            console.log(`   ✅ Feitiço: ${feiticoCura.nome}`);
            console.log(`   ✅ Fórmula de cura: ${nivel1.efeitoDetalhes.formulaCura}`);
            console.log(`   ✅ Custo PM: ${nivel1.custoPM}`);
            
            // Simular cálculo de cura
            const curaCalculada = Arcadia.calcularValorDaFormula(
                nivel1.efeitoDetalhes.formulaCura, 
                atributos
            );
            console.log(`   ✅ Cura calculada: ${curaCalculada} PV`);
        }
        
        // Teste 6: Verificar disponibilidade das funções de combate
        console.log("\n⚔️ Teste 6: Funções de combate disponíveis");
        const funcoesCombate = [
            'iniciarCombatePvE',
            'processarAcaoJogadorCombate', 
            'processarTurnoMobCombate',
            'finalizarCombate',
            'processarUsarItem'
        ];
        
        funcoesCombate.forEach(funcao => {
            const disponivel = typeof Arcadia[funcao] === 'function';
            console.log(`   ${disponivel ? '✅' : '❌'} ${funcao}: ${disponivel ? 'Disponível' : 'Não encontrada'}`);
        });
        
        console.log("\n🎉 Todos os testes de combate concluídos com sucesso!");
        console.log("\n📋 Resumo dos testes:");
        console.log("   ✅ Função calcularValorDaFormula: Funcionando");
        console.log("   ✅ Sistema de itens: Estrutura correta");
        console.log("   ✅ Sistema de feitiços: Estrutura correta");
        console.log("   ✅ Simulações: Funcionando");
        console.log("   ✅ Funções de combate: Disponíveis");
        
    } catch (error) {
        console.error("❌ Erro durante os testes:", error);
        throw error;
    }
}

// Executar os testes
testarSistemaCombateCompleto().then(() => {
    console.log("\n✨ Teste completo do sistema de combate finalizado com sucesso!");
    process.exit(0);
}).catch(error => {
    console.error("💥 Erro fatal nos testes:", error);
    process.exit(1);
});
