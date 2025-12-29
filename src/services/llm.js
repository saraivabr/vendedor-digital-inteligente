/**
 * LLM Service - Integração com Google Gemini
 * Especializado em vender o Vendedor Digital Inteligente™
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PRODUCT, METHOD, OBJECTIONS, POSITIONING } from '../knowledge/product.js';

class LLMService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: process.env.LLM_MODEL || 'gemini-2.0-flash-exp'
        });
        this.fastModel = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp'
        });

        console.log(`🤖 LLM Service initialized with Gemini: ${process.env.LLM_MODEL || 'gemini-2.0-flash-exp'}`);
    }

    /**
     * Gera resposta conversacional
     */
    async generateResponse(systemPrompt, history, userMessage) {
        try {
            // Constrói o contexto - Gemini exige que comece com 'user'
            let chatHistory = history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // CORREÇÃO: Garante que histórico comece com 'user'
            // Remove mensagens do início até encontrar uma do 'user'
            while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
                chatHistory.shift();
            }

            // CORREÇÃO: Remove mensagens consecutivas do mesmo role (Gemini não permite)
            chatHistory = chatHistory.filter((msg, index, arr) => {
                if (index === 0) return true;
                return msg.role !== arr[index - 1].role;
            });

            const chat = this.model.startChat({
                history: chatHistory,
                generationConfig: {
                    temperature: 0.75,
                    maxOutputTokens: 500,
                    topP: 0.9,
                    topK: 40
                }
            });

            // Adiciona system prompt ao contexto
            const fullMessage = `${systemPrompt}\n\n---\nMensagem do lead: ${userMessage}`;

            const result = await chat.sendMessage(fullMessage);
            const response = result.response.text();

            return response.trim();
        } catch (error) {
            console.error('❌ LLM Error:', error.message);
            throw error;
        }
    }

    /**
     * Analisa mensagem do usuário
     */
    async analyzeMessage(message, context = '') {
        const prompt = `Analise esta mensagem de um lead interessado no ${PRODUCT.name}.

CONTEXTO DA CONVERSA:
${context}

MENSAGEM DO LEAD:
"${message}"

Responda APENAS com JSON válido (sem markdown):
{
    "intent": "greeting|question|objection|buying_signal|farewell|frustration|interest|confirmation|rejection|other",
    "sentiment": "positive|neutral|negative",
    "buyingSignal": true ou false,
    "objection": "string ou null",
    "pain": "string ou null - dor de vendas/leads identificada",
    "urgency": "high|medium|low",
    "engagementLevel": "hot|warm|cold",
    "shouldSendAudio": true ou false (se a resposta ficaria melhor em áudio)
}`;

        try {
            const result = await this.fastModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
            });

            const text = result.response.text();
            const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('❌ Analysis Error:', error.message);
            return {
                intent: 'other',
                sentiment: 'neutral',
                buyingSignal: false,
                objection: null,
                pain: null,
                urgency: 'medium',
                engagementLevel: 'warm',
                shouldSendAudio: false
            };
        }
    }

    /**
     * Detecta motivo de abandono
     */
    async detectAbandonReason(history, conversationData) {
        const lastMessages = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `Analise por que este lead do ${PRODUCT.name} parou de responder.

ÚLTIMAS MENSAGENS:
${lastMessages}

DADOS DO LEAD:
- Follow-ups já enviados: ${conversationData.follow_up_count}
- Nível de engajamento: ${conversationData.engagement_level}
- Score: ${conversationData.qualification_score}
- Objeções: ${conversationData.extracted_objections || 'nenhuma'}
- Dor: ${conversationData.extracted_pain || 'não identificada'}

Responda APENAS com JSON válido:
{
    "reason": "busy|objection|lost_interest|price|timing|forgot|competitor|not_qualified",
    "confidence": 0.0 a 1.0,
    "explanation": "breve explicação",
    "suggestedApproach": "curiosity|reciprocity|fomo|scarcity|value|social_proof|empathy",
    "suggestedTone": "casual|professional|urgent|empathetic",
    "shouldCallInstead": true ou false
}`;

        try {
            const result = await this.fastModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
            });

            const text = result.response.text();
            const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('❌ Abandon Detection Error:', error.message);
            return {
                reason: 'busy',
                confidence: 0.5,
                explanation: 'Não foi possível determinar',
                suggestedApproach: 'value',
                suggestedTone: 'casual',
                shouldCallInstead: false
            };
        }
    }

    /**
     * Gera mensagem de follow-up personalizada
     */
    async generateFollowUp(context, strategy, followUpNumber) {
        const strategies = {
            curiosity: `Despertar curiosidade sobre o ${PRODUCT.name}.
Ex: "ei, lembrei de vc quando vi um lead morrendo no whats de um cliente..."`,
            reciprocity: `Oferecer valor primeiro.
Ex: "achei esse dado que pode te ajudar: 80% das vendas precisam de 5+ follow-ups..."`,
            fomo: `Fear of missing out.
Ex: "a galera que implementou tá vendo os leads que iam morrer voltando..."`,
            scarcity: `Escassez e urgência real.
Ex: "to com a agenda quase lotada esse mês..."`,
            value: `Reforçar o valor e benefício.
Ex: "uma venda perdida por mês já paga o investimento..."`,
            social_proof: `Prova social.
Ex: "ontem fechei com mais um do mesmo nicho que o seu..."`,
            empathy: `Demonstrar compreensão.
Ex: "sei que deve estar corrido, sem problemas..."`
        };

        const escalation = {
            1: 'Leve e casual. Só verificando.',
            2: 'Adicione valor. Mostre um dado útil.',
            3: 'Introduza FOMO suave.',
            4: 'Mais urgente. Use escassez real.',
            5: 'Despedida elegante. Último contato.'
        };

        const prompt = `Gere uma mensagem de follow-up para vender o ${PRODUCT.name}.

POSICIONAMENTO OBRIGATÓRIO:
${POSITIONING.neverSay.map(s => `- NUNCA diga: "${s}"`).join('\n')}
${POSITIONING.alwaysSay.map(s => `- SEMPRE use: "${s}"`).join('\n')}

ESTRATÉGIA: ${strategy}
${strategies[strategy]}

NÍVEL (${followUpNumber}/5): ${escalation[followUpNumber]}

CONTEXTO DO LEAD:
- Nome: ${context.name || 'não identificado'}
- Dor: ${context.pain || 'leads morrendo no WhatsApp'}

REGRAS:
1. MÁXIMO 3 linhas curtas
2. Minúsculas (casual brasileiro)
3. Máximo 1 emoji
4. Termine forçando resposta
5. Use: vc, pq, tbm, tá, mt

Responda APENAS com a mensagem:`;

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 150 }
            });

            return result.response.text().trim();
        } catch (error) {
            console.error('❌ Follow-up Generation Error:', error.message);
            const fallbacks = {
                1: `e ai, sumiu? kk\nto aqui se quiser entender melhor\nfaz sentido conversar?`,
                2: `ei, sabia que 80% das vendas precisam de 5+ follow-ups?\na maioria desiste no primeiro`,
                3: `olha, cada dia que passa\nmais conversas morrem no whats`,
                4: `última vez: consigo encaixar mais um projeto essa semana\numa venda perdida por mês já paga o investimento`,
                5: `beleza, vou parar de encher 😅\nse mudar de ideia é só chamar`
            };
            return fallbacks[followUpNumber] || fallbacks[1];
        }
    }

    /**
     * Transcreve áudio usando Gemini
     */
    async transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
        try {
            const base64Audio = audioBuffer.toString('base64');

            const result = await this.model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType, data: base64Audio } },
                        { text: 'Transcreva este áudio em português brasileiro. Responda APENAS com a transcrição, sem comentários.' }
                    ]
                }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
            });

            return result.response.text().trim();
        } catch (error) {
            console.error('❌ Transcription Error:', error.message);
            return null;
        }
    }

    /**
     * Analisa imagem
     */
    async analyzeImage(imageBuffer, mimeType = 'image/jpeg', context = '') {
        try {
            const base64Image = imageBuffer.toString('base64');

            const prompt = `Analise esta imagem no contexto de uma conversa de vendas.
${context ? `Contexto: ${context}` : ''}

Descreva brevemente o que vê e se há algo relevante para a conversa de vendas.
Responda em português brasileiro, de forma casual e curta.`;

            const result = await this.model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType, data: base64Image } },
                        { text: prompt }
                    ]
                }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
            });

            return result.response.text().trim();
        } catch (error) {
            console.error('❌ Image Analysis Error:', error.message);
            return null;
        }
    }

    /**
     * Decide se deve responder com áudio
     * DESABILITADO - TTS não implementado
     */
    shouldRespondWithAudio(analysis, conversationData) {
        // TTS não implementado - sempre retorna false
        // TODO: Reativar quando implementar TTS
        return false;
    }

    /**
     * Gera áudio a partir de texto (TTS)
     * NOTA: Por enquanto retorna null. Implementar quando adicionar Google Cloud TTS
     * ou outro serviço de TTS.
     *
     * @param {string} text - Texto para converter em áudio
     * @returns {Promise<Buffer|null>} Buffer do áudio ou null se não disponível
     */
    async generateAudio(text) {
        // TODO: Implementar TTS quando adicionar biblioteca
        // Opções:
        // 1. Google Cloud Text-to-Speech (@google-cloud/text-to-speech)
        // 2. ElevenLabs (elevenlabs-node)
        // 3. OpenAI TTS (openai)

        console.warn('⚠️ TTS não implementado ainda. Use AUDIO_ENABLED=false no .env');
        return null;
    }
}

export default new LLMService();
