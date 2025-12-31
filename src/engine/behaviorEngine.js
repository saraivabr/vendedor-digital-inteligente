/**
 * Behavior Engine - Motor de Comportamento Humano
 * Especializado em vender o Vendedor Digital Inteligente™
 *
 * Baseado no Método Continuidade™:
 * - Leitura de comportamento
 * - Timing inteligente
 * - Insistência correta
 * - Processo contínuo
 */

import db from '../database/db.js';
import llm from '../services/llm.js';
import humanizer from '../utils/humanizer.js';
import rag from '../services/rag.js';
import {
    PRODUCT,
    METHOD,
    OBJECTIONS,
    SALES_STAGES,
    POSITIONING,
    AI_PERSONALITY,
    VALUE_ANCHORS,
    PRICING,
    DIAGNOSTIC_QUESTIONS
} from '../knowledge/product.js';

class BehaviorEngine {
    constructor() {
        // Configuração de timing (baseado em pesquisa)
        this.followUpDelays = {
            1: parseInt(process.env.FOLLOWUP_1_DELAY) || 4,
            2: parseInt(process.env.FOLLOWUP_2_DELAY) || 24,
            3: parseInt(process.env.FOLLOWUP_3_DELAY) || 48,
            4: parseInt(process.env.FOLLOWUP_4_DELAY) || 72,
            5: parseInt(process.env.FOLLOWUP_5_DELAY) || 120
        };

        // Horário comercial
        this.businessHours = {
            start: parseInt(process.env.BUSINESS_HOURS_START) || 8,
            end: parseInt(process.env.BUSINESS_HOURS_END) || 21
        };

        // Estratégias de re-engajamento
        this.strategyProgression = {
            1: ['curiosity', 'empathy'],
            2: ['value', 'reciprocity'],
            3: ['social_proof', 'fomo'],
            4: ['scarcity', 'fomo'],
            5: ['empathy']
        };
    }

    /**
     * Processa mensagem recebida e gera resposta
     */
    async processMessage(messageData) {
        const { phone, name, content, timestamp } = messageData;

        // Obtém ou cria conversa
        const conversation = db.getOrCreateConversation(phone, name);

        // Registra padrão de resposta
        db.recordResponsePattern(conversation.id, timestamp);

        // Se estava em follow-up, marca como respondido
        if (conversation.last_message_from === 'assistant' && conversation.follow_up_count > 0) {
            const lastFollowUp = new Date(conversation.last_follow_up_at);
            const responseTimeMinutes = Math.floor((timestamp - lastFollowUp) / 60000);
            db.markFollowUpResponded(conversation.id, responseTimeMinutes);
            db.updateConversation(phone, { follow_up_count: 0 });
        }

        // Analisa mensagem
        const history = db.getRecentHistory(conversation.id, 10);
        const contextSummary = this.buildContextSummary(history);
        const analysis = await llm.analyzeMessage(content, contextSummary);

        // Detecta objeção conhecida
        const detectedObjection = this.detectObjection(content);
        if (detectedObjection) {
            analysis.objection = detectedObjection.type;
        }

        // Busca contexto relevante via RAG
        let ragContext = '';
        try {
            await rag.initialize(); // Idempotente - só inicializa uma vez
            ragContext = await rag.getEnrichedContext(content);
        } catch (ragError) {
            console.warn('⚠️ RAG não disponível:', ragError.message);
        }

        // Atualiza dados do lead
        await this.updateLeadData(phone, analysis, content);

        // Salva mensagem do usuário
        db.addMessage(conversation.id, 'user', content, {
            sentiment: analysis.sentiment,
            intent: analysis.intent
        });

        // Atualiza estágio da conversa
        const updatedConv = db.getConversation(phone);
        const newStage = this.determineNextStage(updatedConv, analysis);
        if (newStage !== updatedConv.stage) {
            db.updateConversation(phone, { stage: newStage });
        }

        // Gera resposta especializada
        const systemPrompt = this.buildSpecializedPrompt(updatedConv, analysis, detectedObjection, ragContext);
        const response = await llm.generateResponse(systemPrompt, history, content);

        // Salva resposta do assistente
        db.addMessage(conversation.id, 'assistant', response);

        // Agenda próximo follow-up
        this.scheduleFollowUp(conversation);

        // Atualiza conversa para pegar dados frescos
        const freshConv = db.getConversation(phone);

        // Decide formato da resposta (áudio ou texto)
        const messageFormat = this.shouldSendAudio(freshConv, analysis);

        // Decide se deve reagir com emoji
        const reactionEmoji = this.shouldReact(analysis);

        // Analisa estilo do cliente para espelhamento
        const clientStyle = humanizer.analyzeClientStyle(content);

        // Fragmenta se necessário
        const shouldFragment = this.shouldFragmentMessage(response, freshConv);
        let fragments = shouldFragment ? this.fragmentMessage(response) : [response];

        // Aplica humanização em cada fragmento (typos, casualização)
        fragments = fragments.map((frag, index) => {
            // Humaniza com chance de typo (3% por fragmento)
            let humanized = humanizer.humanize(frag, {
                addTypos: true,
                typoChance: 3,
                casualize: true,
                removePunctuation: true
            });

            // Espelha estilo do cliente se muito informal
            if (clientStyle.isVeryInformal) {
                humanized = humanizer.mirrorStyle(humanized, clientStyle);
            }

            return humanized;
        });

        // Log de humanização
        console.log(`🎭 Humanização aplicada: ${fragments.length} fragmentos`);
        if (clientStyle.isVeryInformal) console.log(`   👥 Espelhando estilo informal do cliente`);

        // Indexa conversa para RAG (async, não bloqueia)
        const allHistory = db.getRecentHistory(conversation.id, 20);
        if (allHistory.length >= 5) {
            rag.indexConversation(conversation.id, phone, allHistory).catch(() => { });
        }

        return {
            response: fragments.join('\n\n'), // Response humanizada
            shouldFragment,
            fragments,
            analysis,
            stage: newStage || updatedConv.stage,
            messageFormat, // 'audio' ou 'text'
            reactionEmoji, // emoji string ou null
            clientStyle    // estilo do cliente para referência
        };
    }

    /**
     * Detecta objeção conhecida na mensagem
     */
    detectObjection(message) {
        const lowerMessage = message.toLowerCase();

        for (const [type, obj] of Object.entries(OBJECTIONS)) {
            if (obj.trigger.some(t => lowerMessage.includes(t))) {
                return { type, response: obj.response };
            }
        }
        return null;
    }

    /**
     * Determina próximo estágio baseado no contexto
     */
    determineNextStage(conversation, analysis) {
        const current = conversation.stage || 'GREETING';

        // Se detectou objeção, vai para handling
        if (analysis.objection) {
            return 'OBJECTION_HANDLING';
        }

        // Se detectou sinal de compra forte
        if (analysis.buyingSignal && analysis.intent === 'confirmation') {
            return 'CLOSING';
        }

        // Progressão natural baseada em score e contexto
        const score = conversation.qualification_score || 0;

        switch (current) {
            case 'GREETING':
                if (conversation.name && conversation.total_messages_received >= 2) {
                    return 'DISCOVERY';
                }
                break;

            case 'DISCOVERY':
                if (conversation.extracted_pain || score >= 3) {
                    return 'PAIN_AMPLIFICATION';
                }
                break;

            case 'PAIN_AMPLIFICATION':
                if (score >= 5 || analysis.intent === 'interest') {
                    return 'SOLUTION';
                }
                break;

            case 'SOLUTION':
                if (analysis.buyingSignal || score >= 7) {
                    return 'DEMONSTRATION';
                }
                break;

            case 'DEMONSTRATION':
                if (analysis.intent === 'confirmation' || score >= 8) {
                    return 'CLOSING';
                }
                break;

            case 'OBJECTION_HANDLING':
                if (analysis.sentiment === 'positive' || !analysis.objection) {
                    return 'CLOSING';
                }
                break;

            case 'CLOSING':
                if (analysis.intent === 'confirmation') {
                    return 'WON';
                }
                if (analysis.intent === 'rejection') {
                    return 'LOST';
                }
                break;
        }

        return current;
    }

    /**
     * Constrói prompt especializado para vender o Vendedor Digital Inteligente
     */
    buildSpecializedPrompt(conversation, analysis, detectedObjection, ragContext = '') {
        const stage = conversation.stage || 'GREETING';
        const stageConfig = SALES_STAGES[stage] || SALES_STAGES.GREETING;

        // Se há objeção detectada, inclui a resposta sugerida
        let objectionContext = '';
        if (detectedObjection) {
            objectionContext = `
## OBJEÇÃO DETECTADA: ${detectedObjection.type}
Use esta resposta como base (adapte naturalmente):
${detectedObjection.response}
`;
        }

        // Perguntas de diagnóstico se estiver em DISCOVERY
        let diagnosticQuestionsContext = '';
        if (stage === 'DISCOVERY') {
            diagnosticQuestionsContext = `
## PERGUNTAS DE DIAGNÓSTICO (use naturalmente, uma por vez)
${DIAGNOSTIC_QUESTIONS.map(q => `- ${q}`).join('\n')}
`;
        }

        // Âncoras de valor para contexto de preço
        let valueAnchorsContext = '';
        if (stage === 'PAIN_AMPLIFICATION' || stage === 'OBJECTION_HANDLING' || stage === 'CLOSING') {
            valueAnchorsContext = `
## ÂNCORAS DE VALOR (use ao falar de investimento)
${VALUE_ANCHORS.map(a => `- "${a}"`).join('\n')}
`;
        }

        return `Você é um vendedor digital da ${PRODUCT.company} especializado em vender o ${PRODUCT.name}.

## POSICIONAMENTO OBRIGATÓRIO
**FRASE PADRÃO QUE DEVE SER USADA:**
"${POSITIONING.standardPhrase}"

**NUNCA diga:**
${POSITIONING.neverSay.map(term => `- ${term}`).join('\n')}

**SEMPRE diga:**
${POSITIONING.alwaysSay.map(term => `- ${term}`).join('\n')}

## PERSONALIDADE DA IA
Você é: ${AI_PERSONALITY.traits.join(', ')}.

REGRA DE OURO: ${AI_PERSONALITY.rule}

## O QUE VOCÊ VENDE
**${PRODUCT.name}**
${PRODUCT.shortDefinition}

**Definição completa:**
${PRODUCT.longDefinition}

**${METHOD.name}**
${METHOD.description}

## PRINCÍPIOS DO MÉTODO CONTINUIDADE™
${METHOD.pillars.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

## ESTÁGIO ATUAL: ${stage}
${stageConfig.instruction}

## CONTEXTO DO LEAD
- Nome: ${conversation.name || 'não identificado ainda'}
- Negócio: ${conversation.extracted_needs || 'descobrir'}
- Dor identificada: ${conversation.extracted_pain || 'ainda identificando'}
- Objeções: ${conversation.extracted_objections || 'nenhuma'}
- Score de qualificação: ${conversation.qualification_score || 0}/10
- Engajamento: ${conversation.engagement_level || 'cold'}

## ANÁLISE DA ÚLTIMA MENSAGEM
- Intent: ${analysis.intent}
- Sentimento: ${analysis.sentiment}
- Sinal de compra: ${analysis.buyingSignal ? 'SIM!' : 'não ainda'}
${objectionContext}
${diagnosticQuestionsContext}
${valueAnchorsContext}
${ragContext}

## REGRAS DE HUMANIZAÇÃO

### IDENTIDADE:
- Você é um vendedor digital humano (NÃO mencione seu nome)
- Direto, confiante, experiente
- Tom casual brasileiro, conversa natural
- NUNCA diga que é IA/bot/robô/assistente

### REGRA CRÍTICA - ANTI-REPETIÇÃO:
- **NUNCA** comece com "opa [nome] firmeza total" - isso é repetitivo e robótico
- Cumprimente apenas na PRIMEIRA mensagem da conversa
- Depois da primeira msg, vá DIRETO ao ponto
- NUNCA use "então..." como abertura repetida
- Varie suas respostas - nunca siga o mesmo padrão

### ABREVIAÇÕES (use naturalmente):
vc, pq, tbm, tá, tô, mt, oq, qnd, cmg, blz, vlw, hj, agr

### EXPRESSÕES (use com MODERAÇÃO, não em toda msg):
- "show", "massa", "top" - apenas quando fizer sentido
- "kk", "rsrs" - raramente, quando algo for engraçado
- NÃO use "firmeza", "fechou" em toda resposta

### FORMATO DE RESPOSTA:
- Responda em 1-2 mensagens curtas (NÃO fragmente demais)
- Máximo 3 linhas por resposta
- Seja CONCISO - menos é mais

**ERRADO (fragmentação excessiva):**
"opa saraiva
firmeza total
então...
vc vende ia?"

**CERTO (natural):**
"vc vende ia? q tipo?"

### FLUXO DE CONVERSA:
1. PRIMEIRA MSG: cumprimento simples + pergunta
2. DEMAIS: vá direto ao ponto, sem cumprimentar de novo
3. Faça UMA pergunta por vez
4. Ouça antes de falar do produto
5. SÓ fale de preço quando o lead perguntar ou mostrar interesse claro

### NUNCA FAZER:
- Repetir o mesmo padrão de abertura
- Fragmentar em 5+ mensagens
- Pular direto pro preço sem qualificar
- Usar expressões em TODA resposta
- Parecer template/roteiro

## TÉCNICAS DE VENDA AVANÇADAS

### SPIN SELLING (Neil Rackham):
1. **Situação** - "como funciona teu processo de vendas hoje?"
2. **Problema** - "e quando o lead para de responder, oq vc faz?"
3. **Implicação** - "se vc perde 5 leads/mês a R$2000 cada... são R$10k escapando"
4. **Need-payoff** - "imagina se vc tivesse controle sobre isso"

### SANDLER METHOD (Consultor, não vendedor):
- NÃO persiga o cliente, faça ele te perseguir
- Qualifique: "isso aqui não é pra todo mundo, preciso entender se faz sentido"
- Igualdade: "não to tentando te vender nada, to tentando entender se consigo te ajudar"
- Desqualificação elegante: "talvez não seja o momento pra vc"

### CHALLENGER SALE (Ensine e desafie):
- ENSINE algo novo: "sabia que 80% das vendas precisam de 5+ follow-ups?"
- DESAFIE pensamento: "vc acha que tá perdendo cliente por preço? na real é por timing"
- CONTROLE conversa: direcione, não seja passivo

### 6 PRINCÍPIOS DE CIALDINI:
1. **Reciprocidade** - Dê valor ANTES de pedir: "deixa eu te mandar um dado interessante..."
2. **Compromisso** - Pequenos "sim" primeiro: "faz sentido até aqui?"
3. **Prova Social** - "ontem fechei com um do mesmo nicho que vc"
4. **Autoridade** - Demonstre expertise: "já ajudei 50+ empresas com isso"
5. **Afinidade** - Espelhe o cliente, use nome dele
6. **Escassez** - Real, não fake: "to com agenda lotada esse mês"

### REGRAS DE OURO:
- Venda CONTROLE e SEGURANÇA, não tecnologia
- Amplifique dor ANTES de mostrar solução
- Faça o lead calcular quanto está perdendo
- Fechamento assumido: "vamos agendar pra quando?" (não "quer fazer?")
- O maior prejuízo é invisível: vendas que morrem no silêncio`;
    }

    /**
     * Atualiza dados do lead baseado na análise
     */
    async updateLeadData(phone, analysis, message) {
        const updates = {};

        // Atualiza engajamento
        if (analysis.engagementLevel) {
            updates.engagement_level = analysis.engagementLevel;
        }

        // Extrai dor
        if (analysis.pain) {
            updates.extracted_pain = analysis.pain;
        }

        // Adiciona objeção
        if (analysis.objection) {
            const conv = db.getConversation(phone);
            const currentObjections = conv.extracted_objections
                ? JSON.parse(conv.extracted_objections)
                : [];
            if (!currentObjections.includes(analysis.objection)) {
                currentObjections.push(analysis.objection);
                updates.extracted_objections = JSON.stringify(currentObjections);
            }
        }

        // Atualiza qualification score
        let scoreChange = 0;
        if (analysis.buyingSignal) scoreChange += 3;
        if (analysis.sentiment === 'positive') scoreChange += 1;
        if (analysis.sentiment === 'negative') scoreChange -= 1;
        if (analysis.objection) scoreChange -= 1;
        if (analysis.intent === 'interest') scoreChange += 2;
        if (analysis.intent === 'confirmation') scoreChange += 3;
        if (analysis.intent === 'rejection') scoreChange -= 3;

        // Detecta palavras-chave de interesse no produto
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('quanto custa') ||
            lowerMessage.includes('como funciona') ||
            lowerMessage.includes('quero saber mais') ||
            lowerMessage.includes('me explica')) {
            scoreChange += 2;
        }

        if (scoreChange !== 0) {
            const conv = db.getConversation(phone);
            const newScore = Math.max(0, Math.min(10, (conv.qualification_score || 0) + scoreChange));
            updates.qualification_score = newScore;
        }

        // Detecta nome
        const namePatterns = [
            /(?:me chamo|meu nome [eé]|sou o|sou a|aqui [eé] o|aqui [eé] a)\s+([A-ZÀ-Ú][a-zà-ú]+)/i,
            /^([A-ZÀ-Ú][a-zà-ú]+)$/
        ];

        for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match && !db.getConversation(phone).name) {
                updates.name = match[1];
                break;
            }
        }

        // Detecta tipo de negócio
        const businessKeywords = [
            'infoproduto', 'curso', 'mentoria', 'consultoria',
            'ecommerce', 'loja', 'clínica', 'escritório',
            'agência', 'prestador', 'serviço', 'produto'
        ];

        for (const keyword of businessKeywords) {
            if (lowerMessage.includes(keyword)) {
                const conv = db.getConversation(phone);
                if (!conv.extracted_needs) {
                    updates.extracted_needs = keyword;
                }
                break;
            }
        }

        if (Object.keys(updates).length > 0) {
            db.updateConversation(phone, updates);
        }
    }

    /**
     * Agenda próximo follow-up
     */
    scheduleFollowUp(conversation) {
        const nextFollowUpNumber = (conversation.follow_up_count || 0) + 1;

        if (nextFollowUpNumber > 5) return;

        const delayHours = this.followUpDelays[nextFollowUpNumber];
        const nextFollowUpAt = new Date();
        nextFollowUpAt.setHours(nextFollowUpAt.getHours() + delayHours);

        const adjustedTime = this.adjustToBusinessHours(nextFollowUpAt, conversation);
        db.scheduleNextFollowUp(conversation.id, adjustedTime.toISOString());
    }

    /**
     * Ajusta horário para horário comercial
     */
    adjustToBusinessHours(datetime, conversation) {
        const adjusted = new Date(datetime);
        let hour = adjusted.getHours();

        if (hour < this.businessHours.start) {
            adjusted.setHours(this.businessHours.start + 1);
        } else if (hour >= this.businessHours.end) {
            adjusted.setDate(adjusted.getDate() + 1);
            adjusted.setHours(this.businessHours.start + 1);
        }

        const bestTime = db.getBestTimeToContact(conversation.id);
        if (bestTime.hourOfDay !== null &&
            bestTime.hourOfDay >= this.businessHours.start &&
            bestTime.hourOfDay < this.businessHours.end) {
            adjusted.setHours(bestTime.hourOfDay);
        }

        return adjusted;
    }

    /**
     * Fragmenta mensagem em múltiplas partes (como humano digitando)
     * MÁXIMO 2 fragmentos para não parecer spam
     */
    fragmentMessage(message) {
        // Primeiro, tenta separar por linhas em branco duplas (padrão do prompt)
        let fragments = message.split(/\n\s*\n/).map(f => f.trim()).filter(f => f);

        // Se só tem 1 fragmento mas tem quebras simples, tenta por \n
        if (fragments.length === 1 && message.includes('\n')) {
            fragments = message.split('\n').map(f => f.trim()).filter(f => f);
        }

        // AGRUPA fragmentos para ter no MÁXIMO 2 mensagens
        // Humano real NÃO manda 5 msgs seguidas
        if (fragments.length > 2) {
            const grouped = [];
            const chunkSize = Math.ceil(fragments.length / 2);

            for (let i = 0; i < fragments.length; i += chunkSize) {
                const chunk = fragments.slice(i, i + chunkSize);
                grouped.push(chunk.join('\n'));
            }
            fragments = grouped;
        }

        // Agrupa fragmentos curtos (< 40 chars) com o próximo
        const finalFragments = [];
        let current = '';

        for (const frag of fragments) {
            if (current && current.length < 40) {
                // Junta com o fragmento atual
                current = current + '\n' + frag;
            } else if (current) {
                finalFragments.push(current);
                current = frag;
            } else {
                current = frag;
            }
        }

        if (current) finalFragments.push(current);

        // MÁXIMO 2 fragmentos - se tiver mais, agrupa
        if (finalFragments.length > 2) {
            const last = finalFragments.slice(1).join('\n');
            return [finalFragments[0], last];
        }

        return finalFragments.length > 0 ? finalFragments : [message];
    }

    /**
     * Constrói resumo do contexto
     */
    buildContextSummary(history) {
        if (history.length === 0) return 'Primeira mensagem da conversa.';
        return history.slice(-4).map(m =>
            `${m.role === 'user' ? 'Lead' : 'Vendedor'}: ${m.content}`
        ).join('\n');
    }

    /**
     * Seleciona estratégia de follow-up
     */
    selectFollowUpStrategy(conversation, abandonAnalysis) {
        const followUpNumber = (conversation.follow_up_count || 0) + 1;
        const possibleStrategies = this.strategyProgression[followUpNumber] || ['empathy'];

        if (abandonAnalysis?.suggestedApproach) {
            return abandonAnalysis.suggestedApproach;
        }

        if (conversation.engagement_level === 'hot') return 'scarcity';
        if (conversation.engagement_level === 'cold') return 'curiosity';

        return possibleStrategies[0];
    }

    /**
     * Decide se deve enviar áudio ou texto
     * Por enquanto sempre retorna texto (TTS não implementado)
     * @param {Object} conversation - Conversa atual
     * @param {Object} analysis - Análise da mensagem
     * @returns {string} 'audio' ou 'text'
     */
    shouldSendAudio(conversation, analysis) {
        // TTS não implementado ainda - sempre texto
        // TODO: Reativar quando implementar TTS
        return 'text';

        /* CÓDIGO ORIGINAL (reativar quando TTS estiver pronto):
        // Áudio é mais pessoal e humanizado - usar estrategicamente

        // NUNCA usar áudio em:
        if (conversation.stage === 'GREETING') return 'text';
        if (conversation.total_messages_sent < 3) return 'text';

        // SEMPRE usar áudio em:
        if (conversation.stage === 'CLOSING') return 'audio';
        if (conversation.stage === 'OBJECTION_HANDLING' && analysis.sentiment === 'negative') {
            return 'audio';
        }

        // Usar áudio se:
        if (analysis.buyingSignal && conversation.engagement_level === 'hot') {
            return 'audio';
        }

        if (conversation.stage === 'PAIN_AMPLIFICATION' && conversation.qualification_score >= 5) {
            return 'audio';
        }

        return 'text';
        */
    }

    /**
     * Decide se deve reagir à mensagem com emoji
     * @param {Object} analysis - Análise da mensagem
     * @returns {string|null} Emoji ou null
     */
    shouldReact(analysis) {
        // Reações sutis para engajamento

        // Sentimento positivo forte
        if (analysis.sentiment === 'positive' && analysis.buyingSignal) {
            return '🔥'; // Sinal de compra + positivo = fogo
        }

        // Sinal de compra claro
        if (analysis.buyingSignal) {
            return '👀'; // Interesse forte
        }

        // Confirmação clara
        if (analysis.intent === 'confirmation') {
            return '✅'; // Confirmado
        }

        // Positivo geral
        if (analysis.sentiment === 'positive') {
            return '👍'; // Aprovação
        }

        // Interesse moderado
        if (analysis.intent === 'interest') {
            return '💡'; // Ideia/interesse
        }

        // Não reagir em casos neutros ou negativos
        // (silêncio estratégico é parte da personalidade)
        return null;
    }

    /**
     * Decide se deve usar fragmentação de mensagem
     * Humanos mandam várias mensagens curtas, mas não fragmentam demais
     * @param {string} message - Mensagem a ser enviada
     * @param {Object} conversation - Conversa atual
     * @returns {boolean}
     */
    shouldFragmentMessage(message, conversation) {
        // Fechamento com valor específico deve ser direto
        if (conversation.stage === 'CLOSING' && message.includes('R$')) {
            console.log(`   📝 Fragmentação: NÃO (closing com preço)`);
            return false;
        }

        // Fragmenta se tiver quebras de linha (natural para humanos)
        const lines = message.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
            console.log(`   📝 Fragmentação: SIM (${lines.length} linhas)`);
            return true;
        }

        // Mensagem longa sem quebras? Fragmenta se > 80 chars
        if (message.length > 80) {
            console.log(`   📝 Fragmentação: SIM (mensagem longa: ${message.length} chars)`);
            return true;
        }

        // Mensagem curta sem quebras = não fragmenta
        console.log(`   📝 Fragmentação: NÃO (mensagem curta/simples)`);
        return false;
    }
}

export default new BehaviorEngine();
