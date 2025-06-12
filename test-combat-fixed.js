// test-combat-fixed.js - Teste específico para comandos no combate
const Arcadia = require('./arcadia_sistema.js');

// Mock de dados para teste
const mockFicha = {
    _id: 'test_player',
    nomePersonagem: 'Teste Jogador',
    nivel: 5,
    pvAtual: 80,
    pvMax: 100,
    pmAtual: 50,
    pmMax: 60,
    atributos: {
        forca: 10,
        agilidade: 8,
        vitalidade: 12,
        manabase: 10,
        intelecto: 15,
        carisma: 8
    },
    magiasConhecidas: [
        { id: 'classe_arcanista_orbe_arcano', nivel: 2 },
        { id: 'raca_eldari_toque_da_floresta', nivel: 1 }
    ],
    inventario: [
        { itemNome: 'Poção de Cura Menor', quantidade: 3 },
        { itemNome: 'Poção de Mana Menor', quantidade: 2 }
    ],
    cooldownsFeiticos: {}
};

async function testCombatCommands() {
    console.log('🧪 TESTANDO COMANDOS NO COMBATE');
    console.log('');
    
    try {
        // Testar função calcularValorDaFormula
        console.log('=== TESTANDO FUNÇÃO calcularValorDaFormula ===');
        if (typeof Arcadia.calcularValorDaFormula === 'function') {
            console.log('✅ Função calcularValorDaFormula encontrada');
            
            // Teste com fórmula simples
            const resultado = Arcadia.calcularValorDaFormula('10 + intelecto', mockFicha.atributos);
            console.log('   Teste: "10 + intelecto" =', resultado);
            console.log('   (Intelecto do jogador:', mockFicha.atributos.intelecto, ')');
        } else {
            console.log('❌ Função calcularValorDaFormula não encontrada');
        }
        
        // Simular uso de feitiço
        console.log('');
        console.log('=== TESTANDO USAR FEITIÇO NO COMBATE ===');
        console.log('Tentando usar: classe_arcanista_orbe_arcano');
        
        // Verificar se o feitiço existe na base
        const feiticoBase = Arcadia.FEITICOS_BASE_ARCADIA['classe_arcanista_orbe_arcano'];
        if (feiticoBase) {
            console.log('✅ Feitiço encontrado na base:', feiticoBase.nome);
            console.log('   Níveis disponíveis:', feiticoBase.niveis.length);
            
            // Verificar se o jogador conhece o feitiço
            const magiaConhecida = mockFicha.magiasConhecidas.find(m => m.id === 'classe_arcanista_orbe_arcano');
            if (magiaConhecida) {
                console.log('✅ Jogador conhece o feitiço no nível:', magiaConhecida.nivel);
                
                // Verificar detalhes do nível
                const detalhesNivel = feiticoBase.niveis.find(n => n.nivel === magiaConhecida.nivel);
                if (detalhesNivel) {
                    console.log('✅ Detalhes do nível encontrados:');
                    console.log('   Custo PM:', detalhesNivel.custoPM);
                    console.log('   Efeito:', JSON.stringify(detalhesNivel.efeitoDetalhes, null, 2));
                } else {
                    console.log('❌ Detalhes do nível não encontrados');
                }
            } else {
                console.log('❌ Jogador não conhece este feitiço');
            }
        } else {
            console.log('❌ Feitiço não encontrado na base');
        }
        
        // Simular uso de item
        console.log('');
        console.log('=== TESTANDO USAR ITEM NO COMBATE ===');
        console.log('Tentando usar: Poção de Cura Menor');
        
        // Verificar se o item existe na base
        const itemBase = Arcadia.ITENS_BASE_ARCADIA['poção de cura menor'];
        if (itemBase) {
            console.log('✅ Item encontrado na base:', itemBase.nome);
            console.log('   Usável:', itemBase.usavel);
            console.log('   Efeito:', JSON.stringify(itemBase.efeito, null, 2));
            
            // Verificar se o jogador tem o item
            const itemInventario = mockFicha.inventario.find(i => 
                i.itemNome.toLowerCase() === 'poção de cura menor'
            );
            if (itemInventario) {
                console.log('✅ Jogador possui o item, quantidade:', itemInventario.quantidade);
            } else {
                console.log('❌ Jogador não possui este item');
            }
        } else {
            console.log('❌ Item não encontrado na base');
        }
        
        console.log('');
        console.log('✅ TESTES DE COMBATE CONCLUÍDOS');
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar os testes
testCombatCommands().catch(console.error);
