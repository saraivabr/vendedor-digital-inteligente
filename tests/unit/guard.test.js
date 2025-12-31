import aiGuard from '../../src/services/aiGuard.js';
import assert from 'assert';

console.log('🧪 Iniciando testes do AIGuard...');

// Mock analysis object
const analysis = { intent: 'price_inquiry', sentiment: 'neutral' };

// Teste 1: Bloqueio de preço em estágio inicial
const result1 = aiGuard.validate('O valor é R$ 100,00', { stage: 'DISCOVERY', analysis });
assert.strictEqual(result1.isValid, false, 'Deveria bloquear preço no estágio DISCOVERY');
assert.strictEqual(result1.violation.includes('forbidden_price'), true, 'Violação deve ser forbidden_price');
console.log('✅ Teste 1: Bloqueio de preço OK');

// Teste 2: Permissão de preço em estágio avançado
const result2 = aiGuard.validate('O valor é R$ 100,00', { stage: 'CLOSING', analysis });
assert.strictEqual(result2.isValid, true, 'Deveria permitir preço no estágio CLOSING');
console.log('✅ Teste 2: Permissão de preço OK');

// Teste 3: Bloqueio de termo proibido (bot)
const result3 = aiGuard.validate('Sou um bot da loja', { stage: 'GREETING', analysis });
assert.strictEqual(result3.isValid, false, 'Deveria bloquear a palavra "bot"');
console.log('✅ Teste 3: Bloqueio de "bot" OK');

// Teste 4: Fallback seguro sem menção de erro
const result4 = aiGuard.validate('O preço é 50 reais', { stage: 'DISCOVERY', analysis });
assert.strictEqual(result4.isValid, false);
assert.ok(result4.safeResponse, 'Deve ter uma safeResponse');
assert.ok(!result4.safeResponse.includes('preço'), 'SafeResponse não deve ter o termo proibido');
console.log('✅ Teste 4: Fallback seguro OK');

console.log('🎉 Todos os testes do AIGuard passaram!');
