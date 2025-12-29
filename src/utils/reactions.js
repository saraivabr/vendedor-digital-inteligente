/**
 * Reactions Utility - Gerencia reações inteligentes
 */

// Mapeamento de emoções para emojis
const REACTION_MAP = {
    // Sentimentos positivos
    positive: ['👍', '😊', '🔥', '💪'],

    // Sinais de compra
    buying_signal: ['🔥', '✨', '💰'],

    // Confirmação
    confirmation: ['✅', '👍', '🙏'],

    // Saudação
    greeting: ['👋', '😊'],

    // Frustração (empatia)
    frustration: ['🤝', '💪'],

    // Interesse
    interest: ['👀', '🎯', '✨'],

    // Despedida
    farewell: ['👋', '🙏'],
};

// Chance de reagir baseado no contexto
const REACTION_CHANCE = {
    positive: 60,
    buying_signal: 80,
    confirmation: 70,
    greeting: 40,
    frustration: 50,
    interest: 50,
    farewell: 30,
    default: 20
};

class ReactionsUtil {
    /**
     * Decide se deve reagir e qual emoji usar
     * @param {Object} analysis - Análise da mensagem contendo sentiment, intent, buyingSignal
     * @returns {string|null} Emoji selecionado ou null se não deve reagir
     */
    shouldReact(analysis) {
        const { sentiment, intent, buyingSignal } = analysis;

        // Determina categoria
        let category = 'default';
        if (buyingSignal) category = 'buying_signal';
        else if (intent === 'confirmation') category = 'confirmation';
        else if (intent === 'greeting') category = 'greeting';
        else if (intent === 'interest') category = 'interest';
        else if (intent === 'frustration') category = 'frustration';
        else if (intent === 'farewell') category = 'farewell';
        else if (sentiment === 'positive') category = 'positive';

        // Verifica chance
        const chance = REACTION_CHANCE[category] || REACTION_CHANCE.default;
        if (Math.random() * 100 > chance) return null;

        // Escolhe emoji aleatório da categoria
        const emojis = REACTION_MAP[category] || REACTION_MAP.positive;
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    /**
     * Retorna emoji específico para situação
     * @param {string} situation - Situação específica
     * @returns {string} Emoji correspondente
     */
    getEmoji(situation) {
        const map = {
            'deal_closed': '🎉',
            'objection_handled': '💪',
            'pain_identified': '🎯',
            'high_engagement': '🔥',
            'audio_received': '🎧',
            'image_received': '👀'
        };
        return map[situation] || '👍';
    }
}

export default new ReactionsUtil();
