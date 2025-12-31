/**
 * AI Guard - Camada de Segurança e Anti-Alucinação
 * Valida as respostas do LLM antes de enviar para o usuário.
 */

import { SALES_STAGES, POSITIONING } from '../knowledge/product.js';

class AIGuard {
    constructor() {
        // Regex de termos sensíveis
        this.sensitiveTerms = {
            price: /\b(preço|valor|custa|reais|R\$|investimento|pagamento|boleto|pix|cartão)\b/i,
            tech_jargon: /\b(llm|gpt|gemini|openai|bot|ia|inteligência artificial|algoritmo)\b/i,
            apology: /\b(desculpe|infelizmente|sinto muito|perdoe|erro|não entendi)\b/i,
            fake_promises: /\b(garanto|prometo|certeza|milagre|mágica)\b/i
        };

        // Regras de estágio (quais termos são PROIBIDOS em quais estágios)
        this.stageRules = {
            'GREETING': ['price', 'tech_jargon', 'fake_promises'],
            'DISCOVERY': ['price', 'tech_jargon', 'fake_promises'],
            'PAIN_AMPLIFICATION': ['price', 'tech_jargon', 'fake_promises'],
            'SOLUTION': ['price', 'tech_jargon'], // No solution ainda evita falar preço direto
            'DEMONSTRATION': ['fake_promises'],     // Demo pode ter tech jargon moderado, preço se perguntado
            'OBJECTION_HANDLING': ['fake_promises'],
            'CLOSING': ['fake_promises'],           // Closing libera preço
            'WON': [],
            'LOST': []
        };
    }

    /**
     * Valida a resposta gerada pelo LLM
     * @param {string} response - Resposta do LLM
     * @param {object} context - Contexto (estágio, analysis, etc)
     * @returns {object} { isValid, violation, safeResponse }
     */
    validate(response, context) {
        const stage = context.stage || 'GREETING';
        const forbiddenTypes = this.stageRules[stage] || [];
        
        // 1. Verifica termos proibidos para o estágio atual
        for (const type of forbiddenTypes) {
            const regex = this.sensitiveTerms[type];
            if (regex.test(response)) {
                console.warn(`🛡️ AI GUARD: Bloqueado termo '${type}' no estágio '${stage}'`);
                
                // Se o lead perguntou explicitamente de preço no estágio errado,
                // o BehaviorEngine deve lidar (mudando estágio ou desviando),
                // mas se o LLM "alucinou" e soltou o preço do nada, bloqueamos.
                
                // Exceção: Se o cliente PERGUNTOU de preço, podemos ser mais lenientes com 'valor',
                // mas não com números específicos (R$).
                if (type === 'price' && context.analysis?.intent === 'question') {
                    // Deixa passar se for evasiva, mas bloqueia valores numéricos
                    if (/\d+/.test(response)) {
                        return {
                            isValid: false,
                            violation: 'explicit_price_too_early',
                            safeResponse: this.getFallbackResponse(stage, 'price')
                        };
                    }
                } else {
                    return {
                        isValid: false,
                        violation: `forbidden_${type}`,
                        safeResponse: this.getFallbackResponse(stage, type)
                    };
                }
            }
        }

        // 2. Verifica comprimento e formatação (Human Guard)
        // Se a resposta for um bloco gigante único > 300 chars, está robótico
        if (response.length > 300 && !response.includes('\n')) {
            console.warn(`🛡️ AI GUARD: Bloqueado texto muito longo sem quebras`);
            return {
                isValid: false,
                violation: 'length_robotic',
                safeResponse: this.getFallbackResponse(stage, 'robotic')
            };
        }

        // 3. Verifica alucinação de identidade
        if (/\b(eu sou (uma )?ia|sou um robô|modelo de linguagem)\b/i.test(response)) {
            console.warn(`🛡️ AI GUARD: Bloqueado quebra de personagem`);
            return {
                isValid: false,
                violation: 'identity_break',
                safeResponse: this.getFallbackResponse(stage, 'identity')
            };
        }

        return { isValid: true };
    }

    /**
     * Gera resposta segura de fallback caso a validação falhe
     */
    getFallbackResponse(stage, violationType) {
        const fallbacks = {
            'price': [
                "a gente já fala de valores, mas antes queria entender melhor teu cenário pra não te passar nada errado",
                "o investimento depende do que vc precisa exato, me conta mais um pouco?",
                "cara, varia dependendo do volume, vamos ver se faz sentido pra vc antes?"
            ],
            'tech_jargon': [
                "na prática a ferramenta resolve isso automático pra vc",
                "o sistema faz essa parte chata sozinho",
                "é bem simples de usar, não precisa entender a parte técnica"
            ],
            'identity': [
                "opa, sou o saraiva aqui da equipe",
                "eu mesmo, pode falar",
                "trabalho aqui no comercial"
            ],
            'robotic': [
                "entendi",
                "show, faz sentido",
                "beleza"
            ],
            'default': [
                "pode me explicar melhor?",
                "entendi, e como é isso hj?",
                "faz sentido"
            ]
        };

        const options = fallbacks[violationType] || fallbacks.default;
        return options[Math.floor(Math.random() * options.length)];
    }
}

export default new AIGuard();
