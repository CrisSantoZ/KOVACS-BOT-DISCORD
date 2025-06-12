// test-combat-final.js - Teste final do sistema de combate
const Arcadia = require('./arcadia_sistema.js');

// Mock de dados para teste
const mockFicha = {
    _id: 'test_player',
    nomePersonagem: 'Teste Mago',
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
        { id: 'classe_arcanista_orbe_arcano', nivel: 2 }
    ],
    inventario: [
        { itemNome: 'Poção de Cura Menor', quantidade: 3 }
    ],
    cooldownsFeiticos: {},
    cooldownsItens: {}
};

const mockMob = {
    _id: 'goblin_teste',
    nome: 'Goblin Teste',
    nivel: 3,
    pvAtual: 40,
    pvMax: 40,
    atributos: {
        pvMax: 40,
        ataqueBase: 8,
        defesaBase: 2
    }
};

async function testCombatFinal() {
    console.log('🧪 TESTE FINAL DO SISTEMA DE COMBATE');
    console.log('');
    
    try {
        // Simular combate ativo
        const idCombate = 'test_combat_final';
        const combatesAtivos = {};
        
        // Mock do sistema de combates
        combatesAtivos[idCombate] = {
            idJogador: 'test_player',
            fichaJogador: mockFicha,
            mobInstancia: mockMob,
            turnoDoJogador: true,
            log: ['Combate iniciado!']
        };
        
        console.log('=== TESTANDO USO DE FEITIÇO ===');
        console.log('Feitiço: Orbe Arcano (Nível 2)');
        console.log('PM antes:', mockFicha.pmAtual);
        console.log('PV do mob antes:', mockMob.pvAtual);
        
        // Simular uso de feitiço através do sistema
        const resultadoFeitico = await Arcadia.processarAcaoJogadorCombate(
            idCombate,
            'test_player',
            'USAR_FEITICO',
            { idFeitico: 'classe_arcanista_orbe_arcano' }
        );
        
        console.log('Resultado do feitiço:', resultadoFeitico ? 'Sucesso' : 'Erro');
        if (resultadoFeitico && resultadoFeitico.logTurnoAnterior) {
            console.log('Log do turno:', resultadoFeitico.logTurnoAnterior.join(' '));
        }
        
        console.log('');
        console.log('=== TESTANDO USO DE ITEM ===');
        console.log('Item: Poção de Cura Menor');
        console.log('PV antes:', mockFicha.pvAtual);
        console.log('Quantidade antes:', mockFicha.inventario[0].quantidade);
        
        // Simular uso de item através do sistema
        const resultadoItem = await Arcadia.processarAcaoJogadorCombate(
            idCombate,
            'test_player',
            'USAR_ITEM',
            { nomeItem: 'Poção de Cura Menor' }
        );
        
        console.log('Resultado do item:', resultadoItem ? 'Sucesso' : 'Erro');
        if (resultadoItem && resultadoItem.logTurnoAnterior) {
            console.log('Log do turno:', resultadoItem.logTurnoAnterior.join(' '));
        }
        
        console.log('');
        console.log('✅ TESTE FINAL CONCLUÍDO');
        
    } catch (error) {
        console.error('❌ Erro durante o teste final:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar o teste
testCombatFinal().catch(console.error);
