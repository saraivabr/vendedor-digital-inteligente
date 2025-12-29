/**
 * Humanizer - Módulo de humanização de mensagens
 * Faz a IA parecer um humano brasileiro real digitando no WhatsApp
 */

class Humanizer {
    constructor() {
        // Variações de risada brasileira
        this.laughs = ['kkk', 'kk', 'kkkkk', 'rsrs', 'rsrsrs', 'haha', 'hahaha'];

        // Expressões de confirmação
        this.confirmations = ['beleza', 'blz', 'firmeza', 'show', 'massa', 'top', 'fechou', 'bora', 'isso'];

        // Expressões de cumprimento casual
        this.greetings = ['e ai', 'eai', 'opa', 'fala', 'oi', 'oii', 'oie'];

        // Interjeições brasileiras
        this.interjections = ['pô', 'poxa', 'caraca', 'eita', 'nossa', 'vish', 'xiii', 'uai'];

        // Fillers (palavras de preenchimento)
        this.fillers = ['tipo', 'sabe', 'então', 'assim', 'né', 'tlgd', 'mano', 'cara'];

        // Expressões de empatia
        this.empathy = ['entendo', 'faz sentido', 'saquei', 'compreendo', 'imagino'];

        // Expressões de transição
        this.transitions = ['olha', 'veja', 'então', 'pois é', 'é que', 'tipo assim'];

        // Abreviações comuns brasileiras
        this.abbreviations = {
            'você': ['vc', 'voce', 'vc'],
            'porque': ['pq', 'pq'],
            'também': ['tb', 'tbm', 'tmb'],
            'está': ['tá', 'ta'],
            'estou': ['to', 'tô'],
            'para': ['pra', 'p/'],
            'não': ['n', 'nao', 'ñ'],
            'sim': ['sim', 's', 'ss'],
            'muito': ['mt', 'mto', 'muito'],
            'que': ['q', 'oq', 'que'],
            'quando': ['qnd', 'qdo'],
            'comigo': ['cmg'],
            'hoje': ['hj'],
            'agora': ['agr'],
            'aqui': ['aki', 'aq'],
            'obrigado': ['vlw', 'valeu', 'obg'],
            'tchau': ['flw', 'falou', 'tmj'],
            'verdade': ['vdd'],
            'problema': ['prob', 'problema'],
            'beleza': ['blz', 'beleza'],
            'bom dia': ['bom dia', 'bd'],
            'boa tarde': ['boa tarde', 'bt'],
            'boa noite': ['boa noite', 'bn']
        };

        // Typos comuns (erros de digitação propositais)
        this.commonTypos = {
            'que': ['qeu', 'que'],
            'você': ['voce', 'vc', 'voc'],
            'isso': ['isso', 'issi', 'iss'],
            'para': ['pra', 'par', 'pra'],
            'está': ['ta', 'tá', 'esta'],
            'uma': ['uma', 'uman', 'um'],
            'com': ['com', 'con', 'cm'],
            'mais': ['mais', 'masi', 'mas'],
            'bem': ['bem', 'bem', 'ben'],
            'ser': ['ser', 'se', 'ser']
        };

        // Autocorreções (quando "percebe" o erro)
        this.autocorrectFormats = [
            '{corrected}*',
            '*{corrected}',
            '{corrected}*',
            'ops, {corrected}*'
        ];

        // Expressões de interrupção
        this.interruptions = [
            'pera',
            'perai',
            'um seg',
            '1 min',
            'ja volto',
            'só um momento'
        ];

        // Expressões de retorno
        this.returns = [
            'voltei',
            'pronto',
            'continuando',
            'então',
            'bom'
        ];
    }

    /**
     * Escolhe item aleatório de um array
     */
    random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Retorna true com a probabilidade especificada (0-100)
     */
    chance(percent) {
        return Math.random() * 100 < percent;
    }

    /**
     * Gera uma risada aleatória
     */
    getLaugh() {
        return this.random(this.laughs);
    }

    /**
     * Gera uma confirmação aleatória
     */
    getConfirmation() {
        return this.random(this.confirmations);
    }

    /**
     * Gera uma interjeição aleatória
     */
    getInterjection() {
        return this.random(this.interjections);
    }

    /**
     * Adiciona typo intencional a uma palavra (5% de chance por palavra)
     * @param {string} text - Texto para adicionar typos
     * @param {number} typoChance - Chance de typo (0-100), default 3
     */
    addTypos(text, typoChance = 3) {
        if (!this.chance(typoChance * 3)) return text; // 3x a chance para decidir se adiciona algum typo

        const words = text.split(' ');
        let typoAdded = false;

        const result = words.map(word => {
            // Só adiciona 1 typo por mensagem e com chance baixa
            if (typoAdded || !this.chance(typoChance)) return word;

            const lowerWord = word.toLowerCase().replace(/[.,!?]/g, '');

            // Verifica se temos typo mapeado para essa palavra
            if (this.commonTypos[lowerWord]) {
                const typos = this.commonTypos[lowerWord];
                const typo = this.random(typos);
                if (typo !== lowerWord) {
                    typoAdded = true;
                    // Preserva pontuação
                    const punct = word.match(/[.,!?]+$/)?.[0] || '';
                    return typo + punct;
                }
            }

            // Typo genérico: trocar letras adjacentes (5% das palavras longas)
            if (word.length > 4 && this.chance(2)) {
                const pos = Math.floor(Math.random() * (word.length - 2)) + 1;
                const chars = word.split('');
                [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
                typoAdded = true;
                return chars.join('');
            }

            return word;
        });

        return result.join(' ');
    }

    /**
     * Simula autocorreção (quando "percebe" o erro depois)
     * @param {string} wrong - Palavra errada
     * @param {string} correct - Palavra correta
     */
    autocorrect(wrong, correct) {
        const format = this.random(this.autocorrectFormats);
        return format.replace('{corrected}', correct);
    }

    /**
     * Converte texto para estilo casual brasileiro
     * @param {string} text - Texto para converter
     */
    casualize(text) {
        let result = text.toLowerCase();

        // Aplica algumas abreviações (não todas, para parecer natural)
        Object.entries(this.abbreviations).forEach(([formal, casuals]) => {
            if (this.chance(60)) { // 60% de chance de abreviar
                const casual = this.random(casuals);
                const regex = new RegExp(`\\b${formal}\\b`, 'gi');
                result = result.replace(regex, casual);
            }
        });

        return result;
    }

    /**
     * Remove pontuação excessiva (muito formal)
     */
    removeExcessPunctuation(text) {
        // Remove ponto final de frases curtas (humanos não usam)
        if (text.length < 50 && text.endsWith('.') && !text.endsWith('...')) {
            text = text.slice(0, -1);
        }

        // Reduz múltiplas exclamações
        text = text.replace(/!{2,}/g, '!');

        // Reduz múltiplas interrogações
        text = text.replace(/\?{2,}/g, '?');

        return text;
    }

    /**
     * Adiciona variação natural ao texto
     * @param {string} text - Texto base
     * @param {object} options - Opções de humanização
     */
    humanize(text, options = {}) {
        const {
            addTypos = true,
            typoChance = 3,
            casualize = true,
            removePunctuation = true
        } = options;

        let result = text;

        // 1. Converte para casual
        if (casualize) {
            result = this.casualize(result);
        }

        // 2. Remove pontuação excessiva
        if (removePunctuation) {
            result = this.removeExcessPunctuation(result);
        }

        // 3. Adiciona typos ocasionais
        if (addTypos) {
            result = this.addTypos(result, typoChance);
        }

        return result;
    }

    /**
     * Gera delay humanizado baseado no tamanho da mensagem
     * @param {string} text - Texto da mensagem
     * @param {string} complexity - 'low', 'medium', 'high'
     * @returns {number} Delay em ms
     */
    calculateTypingDelay(text, complexity = 'medium') {
        const length = text.length;

        // Base: 40-70ms por caractere (humano digita ~200-400 chars/min)
        const msPerChar = 40 + Math.random() * 30;
        const baseTyping = length * msPerChar;

        // Pausa de "pensamento" baseada na complexidade
        const thinkingDelays = {
            low: () => Math.random() * 500,
            medium: () => 300 + Math.random() * 800,
            high: () => 800 + Math.random() * 1500
        };
        const thinking = thinkingDelays[complexity]();

        // Variação humana aleatória (-300ms a +500ms)
        const humanVariation = -300 + Math.random() * 800;

        // Total com limites
        const total = baseTyping + thinking + humanVariation;

        // Mínimo 800ms (ninguém responde instantâneo), máximo 6s
        return Math.min(Math.max(total, 800), 6000);
    }

    /**
     * Calcula delay entre mensagens fragmentadas
     * @param {string} nextMessage - Próxima mensagem a ser enviada
     * @returns {number} Delay em ms
     */
    calculateFragmentDelay(nextMessage) {
        const length = nextMessage.length;

        // Base: 600ms a 1500ms
        const base = 600 + Math.random() * 900;

        // Adicional baseado no tamanho (máx 1500ms extra)
        const lengthDelay = Math.min(length * 30, 1500);

        // Variação aleatória
        const variation = Math.random() * 600;

        // Total: 600ms a ~4100ms
        return Math.min(base + lengthDelay + variation, 4100);
    }

    /**
     * Decide se deve simular "interrupção" (ocupado, voltando, etc)
     * @returns {object|null} {type: 'interrupt'|'return', message: string} ou null
     */
    shouldInterrupt() {
        // 2% de chance de interrupção em cada resposta
        if (this.chance(2)) {
            return {
                type: 'interrupt',
                message: this.random(this.interruptions)
            };
        }
        return null;
    }

    /**
     * Gera mensagem de retorno após interrupção
     */
    getReturnMessage() {
        return this.random(this.returns);
    }

    /**
     * Analisa estilo do cliente e retorna preferências
     * @param {string} message - Mensagem do cliente
     */
    analyzeClientStyle(message) {
        return {
            usesEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(message),
            usesAbbreviations: /\b(vc|pq|tb|tbm|blz|flw)\b/i.test(message),
            isShort: message.length < 20,
            isVeryInformal: /\b(kk|rs|haha|mano|cara|pô)\b/i.test(message),
            usesUppercase: message === message.toUpperCase() && message.length > 3,
            hasQuestion: message.includes('?'),
            hasExclamation: message.includes('!')
        };
    }

    /**
     * Espelha estilo do cliente (adapta resposta)
     * @param {string} response - Resposta original
     * @param {object} clientStyle - Estilo analisado do cliente
     */
    mirrorStyle(response, clientStyle) {
        let result = response;

        // Se cliente é muito informal, aumenta informalidade
        if (clientStyle.isVeryInformal) {
            // Adiciona mais gírias
            if (this.chance(30)) {
                result = this.random(this.fillers) + ', ' + result;
            }
        }

        // Se cliente usa abreviações, garante que usamos também
        if (clientStyle.usesAbbreviations) {
            result = this.casualize(result);
        }

        // Se cliente é curto, encurta resposta
        if (clientStyle.isShort && result.length > 100) {
            // Tenta encurtar (isso seria melhor feito no prompt)
            // Por enquanto, apenas um flag
        }

        return result;
    }
}

// Exporta instância única
export default new Humanizer();
