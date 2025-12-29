/**
 * Follow-Up Scheduler - Sistema de Re-engajamento Comportamental
 *
 * NÃO É AUTOMAÇÃO. É leitura de comportamento humano.
 *
 * Analisa:
 * - QUANDO o lead responde (horário, dia da semana)
 * - QUANTO tempo demora pra responder
 * - COMO responde (longo, curto, emoji, áudio)
 * - O QUE responde (positivo, negativo, objeção)
 *
 * Decide:
 * - Melhor momento pra follow-up
 * - Tom da mensagem
 * - Canal (texto ou áudio)
 * - Se vale a pena insistir ou desistir
 */

import cron from 'node-cron';
import db from '../database/db.js';
import llm from '../services/llm.js';
import whatsapp from '../services/whatsapp.js';
import crmSync from '../crm/sync.js';
import { ATTENTION_HOOKS, getRandomHook, getRandomStat } from '../knowledge/attentionHooks.js';

class FollowUpScheduler {
    constructor() {
        this.isRunning = false;

        // Configurações comportamentais
        this.config = {
            minDelayHours: 2,        // Mínimo 2h após último contato
            maxFollowUps: 5,         // Máximo de tentativas
            businessHoursStart: 8,
            businessHoursEnd: 21
        };
    }

    /**
     * Inicia o scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Follow-up scheduler já está rodando');
            return;
        }

        // Verifica a cada 15 minutos
        cron.schedule('*/15 * * * *', async () => {
            await this.checkAndSendFollowUps();
        });

        this.isRunning = true;
        console.log('🕐 Follow-up scheduler iniciado');

        // Roda imediatamente
        this.checkAndSendFollowUps();
    }

    /**
     * Verifica e envia follow-ups pendentes
     */
    async checkAndSendFollowUps() {
        console.log('\n🔍 Verificando follow-ups pendentes...');

        try {
            const conversations = db.getConversationsNeedingFollowUp();

            if (conversations.length === 0) {
                console.log('✅ Nenhum follow-up pendente');
                return;
            }

            console.log(`📋 ${conversations.length} conversa(s) precisam de follow-up`);

            for (const conv of conversations) {
                // Verifica horário comercial
                if (!this.isWithinBusinessHours()) {
                    console.log('⏰ Fora do horário comercial');
                    return;
                }

                // Verifica se é hora de enviar
                if (conv.next_follow_up_at && new Date(conv.next_follow_up_at) > new Date()) {
                    continue;
                }

                // Analisa comportamento antes de enviar
                const behavior = await this.analyzeLeadBehavior(conv);

                // Decide se vale a pena enviar
                if (!this.shouldSendFollowUp(conv, behavior)) {
                    console.log(`   ⏭️ Pulando ${conv.phone} - comportamento indica não enviar agora`);
                    continue;
                }

                await this.sendSmartFollowUp(conv, behavior);

                // Delay entre follow-ups
                await new Promise(r => setTimeout(r, 5000));
            }
        } catch (error) {
            console.error('❌ Erro no scheduler:', error.message);
        }
    }

    /**
     * Analisa comportamento do lead baseado no histórico
     */
    async analyzeLeadBehavior(conversation) {
        const history = db.getMessages(conversation.id, 50);
        const patterns = db.db.prepare(`
            SELECT * FROM response_patterns
            WHERE conversation_id = ?
            ORDER BY response_count DESC
        `).all(conversation.id);

        // Análise de tempo de resposta
        const userMessages = history.filter(m => m.role === 'user');
        const responseTimes = [];
        let previousAssistant = null;

        for (const msg of history) {
            if (msg.role === 'assistant') {
                previousAssistant = new Date(msg.created_at);
            } else if (msg.role === 'user' && previousAssistant) {
                const userTime = new Date(msg.created_at);
                const diffMinutes = (userTime - previousAssistant) / 60000;
                responseTimes.push(diffMinutes);
                previousAssistant = null;
            }
        }

        // Média de tempo de resposta
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : null;

        // Padrão de horário preferido
        const preferredHour = patterns.length > 0 ? patterns[0].hour_of_day : 13;
        const preferredDay = patterns.length > 0 ? patterns[0].day_of_week : null;

        // Análise de conteúdo
        const lastUserMessages = userMessages.slice(-5);
        const messageAnalysis = {
            avgLength: lastUserMessages.reduce((acc, m) => acc + m.content.length, 0) / (lastUserMessages.length || 1),
            usesEmoji: lastUserMessages.some(m => /[\u{1F600}-\u{1F6FF}]/u.test(m.content)),
            usesAudio: lastUserMessages.some(m => m.content.includes('[ÁUDIO]') || m.content.includes('[AUDIO]')),
            isShortResponder: lastUserMessages.every(m => m.content.length < 50),
            lastSentiment: conversation.last_sentiment || 'neutral'
        };

        // Engajamento
        const engagementScore = this.calculateEngagementScore(history, conversation);

        // Tempo desde última mensagem
        const lastMessageAt = new Date(conversation.last_message_at);
        const hoursSinceLastMessage = (Date.now() - lastMessageAt) / (1000 * 60 * 60);

        return {
            avgResponseTime,
            preferredHour,
            preferredDay,
            messageAnalysis,
            engagementScore,
            hoursSinceLastMessage,
            totalMessages: history.length,
            followUpCount: conversation.follow_up_count || 0,
            stage: conversation.stage || 'GREETING',
            lastTopic: this.extractLastTopic(history),
            abandonReason: conversation.abandon_reason
        };
    }

    /**
     * Calcula score de engajamento (0-10)
     */
    calculateEngagementScore(history, conversation) {
        let score = 5; // Base

        const userMessages = history.filter(m => m.role === 'user');

        // +1 por cada resposta do usuário (max +3)
        score += Math.min(userMessages.length * 0.5, 3);

        // +1 se mensagens longas
        const avgLength = userMessages.reduce((acc, m) => acc + m.content.length, 0) / (userMessages.length || 1);
        if (avgLength > 100) score += 1;

        // -1 por cada follow-up não respondido
        score -= (conversation.follow_up_count || 0) * 0.5;

        // +2 se tem sinal de compra
        if (conversation.extracted_buying_signals) score += 2;

        // -2 se objeção não resolvida
        if (conversation.extracted_objections && !conversation.objection_resolved) score -= 2;

        return Math.max(0, Math.min(10, score));
    }

    /**
     * Decide se deve enviar follow-up
     */
    shouldSendFollowUp(conversation, behavior) {
        // Não enviar se:

        // 1. Muito cedo (menos de 2h desde último contato)
        if (behavior.hoursSinceLastMessage < this.config.minDelayHours) {
            return false;
        }

        // 2. Lead muito frio (engajamento < 2 e já tentou 2+ vezes)
        if (behavior.engagementScore < 2 && behavior.followUpCount >= 2) {
            return false;
        }

        // 3. Já atingiu máximo de follow-ups
        if (behavior.followUpCount >= this.config.maxFollowUps) {
            return false;
        }

        // 4. Não está no horário preferido do lead (se sabemos)
        if (behavior.preferredHour && !this.isNearPreferredTime(behavior.preferredHour)) {
            // Mas se já passou muito tempo (48h+), ignora preferência
            if (behavior.hoursSinceLastMessage < 48) {
                return false;
            }
        }

        return true;
    }

    /**
     * Verifica se está perto do horário preferido
     */
    isNearPreferredTime(preferredHour) {
        const currentHour = new Date().getHours();
        return Math.abs(currentHour - preferredHour) <= 2;
    }

    /**
     * Envia follow-up inteligente baseado no comportamento
     */
    async sendSmartFollowUp(conversation, behavior) {
        const followUpNumber = behavior.followUpCount + 1;

        console.log(`\n📤 Follow-up #${followUpNumber} para ${conversation.phone}`);
        console.log(`   📊 Engajamento: ${behavior.engagementScore.toFixed(1)}/10`);
        console.log(`   ⏱️ Tempo médio resposta: ${behavior.avgResponseTime?.toFixed(0) || '?'} min`);
        console.log(`   📅 Horário preferido: ${behavior.preferredHour}h`);

        try {
            // 1. Gera mensagem adaptada ao comportamento
            const message = await this.generateBehavioralFollowUp(conversation, behavior, followUpNumber);

            // 2. Decide canal (texto ou áudio)
            const useAudio = this.shouldUseAudio(behavior, followUpNumber);

            // 3. Envia
            if (useAudio) {
                console.log('   🎤 Enviando como áudio...');
                try {
                    await whatsapp.sendAudio(conversation.phone, message);
                } catch (audioError) {
                    console.log('   ⚠️ Fallback para texto');
                    await whatsapp.sendMessage(conversation.phone, message);
                }
            } else {
                await whatsapp.sendMessage(conversation.phone, message);
            }

            // 4. Registra
            db.recordFollowUp(conversation.id, followUpNumber, behavior.strategy || 'adaptive', message);
            db.addMessage(conversation.id, 'assistant', message, { intent: 'follow_up' });

            // 5. Sync CRM
            await crmSync.processFollowUp(conversation.phone, message, followUpNumber);

            // 6. Agenda próximo
            this.scheduleNextFollowUp(conversation, behavior, followUpNumber);

            console.log(`✅ Follow-up #${followUpNumber} enviado`);

        } catch (error) {
            console.error(`❌ Erro no follow-up:`, error.message);
        }
    }

    /**
     * Gera follow-up baseado no comportamento específico do lead
     */
    async generateBehavioralFollowUp(conversation, behavior, followUpNumber) {
        // Escolhe abordagem baseada no comportamento
        let approach = 'curiosity';
        let tone = 'casual';
        let hook = '';

        // Baseado no número do follow-up
        if (followUpNumber === 1) {
            approach = behavior.engagementScore > 5 ? 'value' : 'curiosity';
            tone = 'leve';
        } else if (followUpNumber === 2) {
            approach = 'reciprocity'; // Dá valor primeiro
            tone = 'útil';
        } else if (followUpNumber === 3) {
            approach = behavior.engagementScore > 3 ? 'fomo' : 'empathy';
            tone = 'urgência suave';
        } else if (followUpNumber === 4) {
            approach = 'scarcity';
            tone = 'direto';
        } else {
            approach = 'empathy';
            tone = 'despedida elegante';
        }

        // Ajusta baseado no motivo de abandono
        if (behavior.abandonReason === 'price') {
            hook = getRandomHook('reengagement', 'priceObjection');
            approach = 'value';
        } else if (behavior.abandonReason === 'busy') {
            hook = getRandomHook('reengagement', 'busy');
            approach = 'empathy';
        } else if (behavior.abandonReason === 'timing') {
            hook = getRandomHook('reengagement', 'thinkingAbout');
        }

        // Ajusta pro estilo do lead
        let styleNote = '';
        if (behavior.messageAnalysis.isShortResponder) {
            styleNote = 'Lead responde CURTO. Seja MUITO breve (1-2 linhas max).';
        }
        if (behavior.messageAnalysis.usesEmoji) {
            styleNote += ' Lead usa emoji. Pode usar 1-2 emojis.';
        }

        // Gera com LLM
        const prompt = `Gere uma mensagem de follow-up #${followUpNumber} (de 5 máximo).

CONTEXTO DO LEAD:
- Nome: ${conversation.name || 'não sabe'}
- Negócio: ${conversation.extracted_needs || 'não sabe ainda'}
- Dor: ${conversation.extracted_pain || 'leads morrendo'}
- Último assunto: ${behavior.lastTopic || 'geral'}
- Engajamento: ${behavior.engagementScore.toFixed(1)}/10
- Tempo desde última msg: ${behavior.hoursSinceLastMessage.toFixed(0)}h

COMPORTAMENTO DO LEAD:
- Responde em média em: ${behavior.avgResponseTime?.toFixed(0) || '?'} minutos
- Prefere horário: ${behavior.preferredHour}h
- Mensagens ${behavior.messageAnalysis.isShortResponder ? 'CURTAS' : 'longas'}
- ${behavior.messageAnalysis.usesAudio ? 'Usa áudio' : 'Só texto'}
${styleNote}

ABORDAGEM: ${approach}
TOM: ${tone}
${hook ? `HOOK SUGERIDO: "${hook}"` : ''}

REGRAS ABSOLUTAS:
1. PAREÇA 100% HUMANO digitando no WhatsApp
2. Use: vc, pq, tbm, tá, oq, mt, kk (moderado)
3. Minúsculas
4. MÁXIMO 3 linhas curtas
5. Termine com pergunta que force resposta
6. NUNCA use: "software", "bot", "automação", "sistema"
7. NUNCA seja vendedor desesperado

${followUpNumber === 5 ? 'ÚLTIMA TENTATIVA. Seja elegante na despedida mas deixe porta aberta.' : ''}

Responda APENAS com a mensagem:`;

        try {
            const response = await llm.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.85, maxOutputTokens: 150 }
            });

            return response.response.text().trim();
        } catch (error) {
            console.error('❌ Erro ao gerar follow-up:', error.message);

            // Fallbacks humanizados
            const fallbacks = {
                1: `e ai, sumiu? kk\nto por aqui se quiser continuar\nfaz sentido ainda?`,
                2: `ei ${conversation.name || ''}\nlembrei de vc\n\noq aconteceu?`,
                3: `${conversation.name || 'ei'}, cada dia que passa mais leads esfriam\n\nvale a pena resolver isso?`,
                4: `olha, consigo encaixar mais um projeto essa semana\numa venda perdida por mês já paga\n\noq acha?`,
                5: `beleza, vou parar de encher 😅\nse precisar é só chamar\nboa sorte ai!`
            };

            return fallbacks[followUpNumber] || fallbacks[1];
        }
    }

    /**
     * Decide se deve usar áudio
     */
    shouldUseAudio(behavior, followUpNumber) {
        // Base: 20% de chance
        let chance = 20;

        // +30% se lead usa áudio
        if (behavior.messageAnalysis.usesAudio) chance += 30;

        // +20% se follow-up 3 ou 4 (momento crítico)
        if (followUpNumber === 3 || followUpNumber === 4) chance += 20;

        // -20% se lead responde muito curto (prefere texto)
        if (behavior.messageAnalysis.isShortResponder) chance -= 20;

        return Math.random() * 100 < chance;
    }

    /**
     * Agenda próximo follow-up baseado no comportamento
     */
    scheduleNextFollowUp(conversation, behavior, currentNumber) {
        const nextNumber = currentNumber + 1;

        if (nextNumber > this.config.maxFollowUps) {
            console.log(`   Lead atingiu máximo de follow-ups`);
            db.updateConversation(conversation.phone, { is_active: 0 });
            return;
        }

        // Delays progressivos (em horas)
        const baseDelays = {
            1: 4,
            2: 24,
            3: 48,
            4: 72,
            5: 120
        };

        let delayHours = baseDelays[nextNumber] || 48;

        // Ajusta baseado no engajamento
        if (behavior.engagementScore > 7) {
            delayHours *= 0.7; // Lead quente, mais rápido
        } else if (behavior.engagementScore < 3) {
            delayHours *= 1.5; // Lead frio, mais espaçado
        }

        const nextTime = new Date();
        nextTime.setHours(nextTime.getHours() + Math.round(delayHours));

        // Ajusta pro horário preferido do lead
        if (behavior.preferredHour) {
            nextTime.setHours(behavior.preferredHour);
            nextTime.setMinutes(Math.floor(Math.random() * 30) + 5);
        }

        // Garante horário comercial
        const adjusted = this.adjustToBusinessHours(nextTime);

        db.updateConversation(conversation.phone, {
            follow_up_count: currentNumber,
            last_follow_up_at: new Date().toISOString()
        });

        db.scheduleNextFollowUp(conversation.id, adjusted.toISOString());

        console.log(`   📅 Próximo: ${adjusted.toLocaleString('pt-BR')}`);
    }

    /**
     * Ajusta para horário comercial
     */
    adjustToBusinessHours(datetime) {
        const adjusted = new Date(datetime);
        const hour = adjusted.getHours();

        if (hour < this.config.businessHoursStart) {
            adjusted.setHours(this.config.businessHoursStart + 1);
        } else if (hour >= this.config.businessHoursEnd) {
            adjusted.setDate(adjusted.getDate() + 1);
            adjusted.setHours(this.config.businessHoursStart + 1);
        }

        // Evita domingo de manhã
        if (adjusted.getDay() === 0 && adjusted.getHours() < 12) {
            adjusted.setHours(14);
        }

        return adjusted;
    }

    /**
     * Verifica horário comercial
     */
    isWithinBusinessHours() {
        const hour = new Date().getHours();
        return hour >= this.config.businessHoursStart && hour < this.config.businessHoursEnd;
    }

    /**
     * Extrai último tópico da conversa
     */
    extractLastTopic(history) {
        const lastUser = [...history].reverse().find(m => m.role === 'user');
        if (!lastUser) return null;

        const words = lastUser.content.split(' ').slice(0, 5).join(' ');
        return words.length > 30 ? words.substring(0, 30) + '...' : words;
    }

    /**
     * Força follow-up manual
     */
    async forceFollowUp(phone) {
        const conversation = db.getConversation(phone);
        if (!conversation) {
            console.error('Conversa não encontrada');
            return;
        }

        const behavior = await this.analyzeLeadBehavior(conversation);
        await this.sendSmartFollowUp(conversation, behavior);
    }
}

export default new FollowUpScheduler();
