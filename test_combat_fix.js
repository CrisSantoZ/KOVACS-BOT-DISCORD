// Teste para verificar se a correção do cache de combates funcionou
const Arcadia = require('./arcadia_sistema.js');

// Simular o cache de combates do index.js
const combatesAtivos = {};

// Configurar o cache compartilhado
Arcadia.setCombatesAtivos(combatesAtivos);

async function testarCorrecaoCombate() {
    console.log('🧪 TESTANDO CORREÇÃO DO CACHE DE COMBATES');
    console.log('');
    
    try {
        // Conectar ao MongoDB
        await Arcadia.conectarMongoDB();
        console.log('✅ Conectado ao MongoDB');
        
        // Simular uma ficha de jogador
        const fichaJogador = {
            _id: 'test_player_123',
            nomePersonagem: 'Guerreiro Teste',
            nivel: 3,
            pvAtual: 60,
            pvMax: 60,
            pmAtual: 20,
            pmMax: 20,
            atributos: {
                forca: 12,
                agilidade: 8,
                vitalidade: 10,
                manabase: 6,
                intelecto: 7,
                carisma: 5
            },
            magiasConhecidas: [],
            inventario: [],
            cooldownsFeiticos: {},
            cooldownsItens: {}
        };
        
        // Adicionar a ficha ao cache do Arcadia
        const fichasCollection = Arcadia.getFichasCollection();
        if (fichasCollection) {
            await fichasCollection.deleteOne({ _id: fichaJogador._id }); // Limpar se existir
            await fichasCollection.insertOne(fichaJogador);
            console.log('✅ Ficha de teste criada');
        }
        
        // Tentar iniciar um combate com um dummy
        console.log('🎯 Iniciando combate com dummy...');
        const resultadoInicio = await Arcadia.iniciarCombatePvE(
            fichaJogador._id,
            'dummy_basico', // ID do dummy básico
            null, // sem missão
            null  // sem objetivo
        );
        
        if (!resultadoInicio.sucesso) {
            console.log('❌ Erro ao iniciar combate:', resultadoInicio.erro);
            return;
        }
        
        console.log('✅ Combate iniciado com sucesso!');
        console.log('ID do Combate:', resultadoInicio.idCombate);
        
        // Verificar se o combate está no cache
        console.log('🔍 Verificando cache de combates...');
        console.log('Combates no cache:', Object.keys(combatesAtivos));
        
        if (combatesAtivos[resultadoInicio.idCombate]) {
            console.log('✅ Combate encontrado no cache!');
        } else {
            console.log('❌ Combate NÃO encontrado no cache!');
            return;
        }
        
        // Tentar fazer uma ação de combate (ataque básico)
        console.log('⚔️ Tentando fazer ataque básico...');
        const resultadoAtaque = await Arcadia.processarAcaoJogadorCombate(
            resultadoInicio.idCombate,
            fichaJogador._id,
            'ATAQUE_BASICO',
            {}
        );
        
        if (resultadoAtaque.erro) {
            console.log('❌ ERRO na ação de combate:', resultadoAtaque.erro);
            console.log('🔍 Debug - Combates no cache:', Object.keys(combatesAtivos));
        } else {
            console.log('✅ Ataque básico executado com sucesso!');
            console.log('Estado do combate:', resultadoAtaque.estadoCombate ? 'OK' : 'ERRO');
        }
        
        // Limpar dados de teste
        if (fichasCollection) {
            await fichasCollection.deleteOne({ _id: fichaJogador._id });
            console.log('🧹 Dados de teste limpos');
        }
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    }
}

// Executar o teste
testarCorrecaoCombate().then(() => {
    console.log('\n🏁 Teste concluído');
    process.exit(0);
}).catch(error => {
    console.error('💥 Erro fatal no teste:', error);
    process.exit(1);
});
