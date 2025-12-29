/**
 * Teste Manual das Funcionalidades Multimídia
 *
 * Execute: node test_multimedia.js
 */

import llm from './src/services/llm.js';

console.log('🧪 Testando Funcionalidades Multimídia\n');

// Test 1: shouldRespondWithAudio
console.log('📋 Teste 1: Decisão de Áudio');
const analysis = {
    intent: 'buying_signal',
    sentiment: 'positive',
    buyingSignal: true,
    engagementLevel: 'hot',
    shouldSendAudio: true
};

const conversationData = {
    engagement_level: 'hot'
};

const shouldUseAudio = llm.shouldRespondWithAudio(analysis, conversationData);
console.log(`   Análise: engagementLevel=${analysis.engagementLevel}, buyingSignal=${analysis.buyingSignal}`);
console.log(`   Resultado: ${shouldUseAudio ? '🎤 ÁUDIO' : '📝 TEXTO'}`);
console.log(`   (Chance base 30% + bônus = alta probabilidade)\n`);

// Test 2: analyzeMessage com shouldSendAudio
console.log('📋 Teste 2: Análise de Mensagem');
const testMessage = "oi! adorei o produto, quero começar hoje mesmo!";

llm.analyzeMessage(testMessage, 'Lead interessado no Vendedor Digital')
    .then(result => {
        console.log(`   Mensagem: "${testMessage}"`);
        console.log(`   Intent: ${result.intent}`);
        console.log(`   Sentiment: ${result.sentiment}`);
        console.log(`   BuyingSignal: ${result.buyingSignal}`);
        console.log(`   Urgency: ${result.urgency}`);
        console.log(`   EngagementLevel: ${result.engagementLevel}`);
        console.log(`   ShouldSendAudio: ${result.shouldSendAudio}\n`);
    })
    .catch(error => {
        console.error('   ❌ Erro:', error.message, '\n');
    });

// Test 3: generateAudio (stub)
console.log('📋 Teste 3: TTS (stub)');
llm.generateAudio("teste de áudio")
    .then(buffer => {
        if (buffer) {
            console.log('   ✅ Buffer de áudio gerado');
        } else {
            console.log('   ℹ️ TTS não implementado (esperado)');
        }
        console.log('   Para implementar: adicione Google TTS, ElevenLabs ou OpenAI\n');
    })
    .catch(error => {
        console.error('   ❌ Erro:', error.message, '\n');
    });

// Test 4: Verificação de configuração
setTimeout(() => {
    console.log('📋 Teste 4: Configuração');
    console.log(`   AUDIO_ENABLED: ${process.env.AUDIO_ENABLED || 'false'}`);
    console.log(`   AUDIO_CHANCE: ${process.env.AUDIO_CHANCE || '30'}`);
    console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);

    console.log('\n✅ Testes concluídos!');
    console.log('\n📚 Recursos implementados:');
    console.log('   ✅ Transcrição de áudio (llm.transcribeAudio)');
    console.log('   ✅ Análise de imagens (llm.analyzeImage)');
    console.log('   ✅ Reações automáticas (👍 positivo, 🔥 buying signal)');
    console.log('   ✅ Decisão inteligente de áudio (llm.shouldRespondWithAudio)');
    console.log('   ⏳ TTS em desenvolvimento (llm.generateAudio - stub)');

    console.log('\n📖 Documentação: FEATURES_MULTIMIDIA.md');
}, 2000);
