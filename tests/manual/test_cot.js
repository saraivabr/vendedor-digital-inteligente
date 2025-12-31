import behaviorEngine from '../../src/engine/behaviorEngine.js';

// Mock LLM Response with Thinking
const mockRawResponse = `
<thinking>
1. Estágio: GREETING (BDR) -> Objetivo: Engajar.
2. Cliente: Curioso, perguntou sobre preço.
3. Técnica: Não passar preço agora, devolver pergunta (Sandler).
4. Draft: Olá! O preço varia, qual seu nicho?
</thinking>
Fala João! 👋
Cara, o investimento depende muito do seu modelo de negócio. 
Você trabalha com qual nicho hoje?
`;

async function testThinkingProcess() {
    console.log('🧪 Iniciando teste de Chain of Thought (CoT)...\n');

    console.log('1. Simulando resposta bruta do LLM:');
    console.log(mockRawResponse);
    console.log('\n-----------------------------------');

    // Test separateThoughtFromResponse method directly
    const { thought, cleanResponse } = behaviorEngine.separateThoughtFromResponse(mockRawResponse);

    console.log('\n2. Extraindo Pensamento:');
    if (thought) {
        console.log('✅ Pensamento detectado com sucesso:');
        console.log(thought);
    } else {
        console.error('❌ Falha ao detectar pensamento.');
    }

    console.log('\n3. Verificando Resposta Limpa (O que vai pro cliente):');
    if (!cleanResponse.includes('<thinking>')) {
        console.log('✅ Tags <thinking> removidas com sucesso.');
        console.log('📝 Resposta Final:', cleanResponse);
    } else {
        console.error('❌ Tags <thinking> ainda presentes na resposta.');
    }

    // Verify if formatting is correct
    if (cleanResponse.trim().startsWith('Fala João!')) {
        console.log('\n✅ Formatação da resposta parece correta.');
    } else {
        console.warn('\n⚠️ Espaços em branco extras podem estar presentes.');
    }
}

testThinkingProcess().catch(console.error);
