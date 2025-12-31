
import engine from '../../src/engine/behaviorEngine.js';
import { SALES_STAGES } from '../../src/knowledge/product.js';

// Mock data helpers
const mockConversation = (stage) => ({
    id: 1,
    phone: '5511999999999',
    name: 'Teste User',
    stage: stage,
    extracted_needs: 'Consultoria',
    extracted_pain: 'Perde muito lead',
    qualification_score: 5,
    engagement_level: 'high'
});

const mockAnalysis = {
    intent: 'interest',
    sentiment: 'positive',
    buyingSignal: false
};

console.log('🧪 INICIANDO TESTE DE SMART CONTEXT (BDR/SDR/CLOSER)\n');

const testStages = ['GREETING', 'DISCOVERY', 'CLOSING'];

testStages.forEach(stage => {
    console.log(`\n--- TESTANDO ESTÁGIO: ${stage} ---`);
    console.log(`Role Esperado: ${SALES_STAGES[stage].role || 'BDR'}`);

    try {
        const prompt = engine.buildSpecializedPrompt(mockConversation(stage), mockAnalysis, null, '');

        // Verifica Role
        const roleMatch = prompt.match(/VOCÊ ESTÁ NO PAPEL DE \*\*(.*?)\*\*/);
        if (roleMatch) {
            console.log(`✅ Role Injetado: ${roleMatch[1]}`);
        } else {
            console.error('❌ ERRO: Role não encontrado no prompt!');
            console.log('DEBUG Prompt start:', prompt.substring(0, 200));
        }

        // Verifica Contexto Especifico
        if (stage === 'GREETING') {
            if (prompt.includes('SANDLER (No-Pressure)') && prompt.includes('CIALDINI (Reciprocidade')) {
                console.log('✅ Contexto BDR (Sandler/Cialdini) presente.');
            } else {
                console.error('❌ Contexto BDR ausente.');
            }
            if (!prompt.includes('SPIN SELLING')) console.log('✅ Contexto SDR (SPIN) corretamente AUSENTE.');
        }

        if (stage === 'DISCOVERY') {
            if (prompt.includes('SPIN SELLING') && prompt.includes('CHALLENGER')) {
                console.log('✅ Contexto SDR (SPIN/Challenger) presente.');
            } else {
                console.error('❌ Contexto SDR ausente.');
            }
            if (!prompt.includes('CIALDINI (Reciprocidade')) console.log('✅ Contexto BDR corretamente AUSENTE.');
        }

        if (stage === 'CLOSING') {
            if (prompt.includes('ANCORAGEM DE VALOR') && prompt.includes('FECHAMENTO ASSUMIDO')) {
                console.log('✅ Contexto CLOSER (Ancoragem/Fechamento) presente.');
            } else {
                console.error('❌ Contexto CLOSER ausente.');
            }
            if (!prompt.includes('SPIN SELLING')) console.log('✅ Contexto SDR (SPIN) corretamente AUSENTE.');
        }

    } catch (error) {
        console.error('❌ Erro ao gerar prompt:', error);
    }
});

console.log('\n🏁 Teste finalizado.');
