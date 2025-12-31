import humanizer from '../../src/utils/humanizer.js';
import assert from 'assert';

console.log('🧪 Iniciando testes do Humanizer...');

// Teste 1: Remoção de pontuação excessiva
const text1 = 'Olá!!!!!!! Tudo bem?????';
const clean1 = humanizer.removeExcessPunctuation(text1);
assert.strictEqual(clean1, 'Olá! Tudo bem?', 'Deve reduzir pontuação excessiva');
console.log('✅ Teste 1: Pontuação excessiva OK');

// Teste 2: Geração de Typos (QWERTY)
const text2 = 'banana';
// Força typo chance 100% para teste (hackeando o método chance se possível, 
// mas como não é mocado facilmente, vamos rodar várias vezes até sair um typo ou validar a lógica)
// Melhor: vamos confiar que em 100 tentativas, a maioria vai ter typos se a chance for alta.
// Vou usar uma chance alta direto no método
let typosCount = 0;
for (let i = 0; i < 100; i++) {
    const res = humanizer.addTypos(text2, 100);
    if (res !== text2) {
        typosCount++;
        // Verifica se o typo faz sentido (letra vizinha ou duplicada/removida)
        // b -> v, g, h, n (vizinhos) ou bb (dupla) ou anana (remocao)
        // Isso é complexo validar regex, mas basta saber que mudou
    }
}
assert.ok(typosCount > 80, 'Deve gerar typos na maioria das vezes com chance alta');
console.log(`✅ Teste 2: Geração de Typos OK (${typosCount}/100)`);

// Teste 3: Fragmentação Inteligente (via BehaviorEngine, mas podemos testar lógica similar se extraída, 
// mas aqui vamos focar no humanizer utils)
// O humanizer não tem fragmentMessage, está no BehaviorEngine. Vamos pular ou mockar BehaviorEngine.

console.log('🎉 Todos os testes do Humanizer passaram!');
