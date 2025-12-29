/**
 * Vendedor Digital Inteligente
 *
 * IA Conversacional com Follow-up Comportamental para WhatsApp
 *
 * O X da questão: Todo mundo responde rápido mas abandona quando o cliente
 * para de responder. Este sistema resolve isso com:
 *
 * 1. Timing Inteligente: Sabe QUANDO enviar baseado no padrão do cliente
 * 2. Conteúdo Adaptativo: Muda TOM e ABORDAGEM a cada tentativa
 * 3. Detecção de Motivo: Entende POR QUE parou de responder
 *
 * Baseado em pesquisa:
 * - 80% das vendas requerem 5+ follow-ups
 * - 44% dos vendedores desistem após 1 tentativa
 * - 60% dos clientes dizem "não" 4x antes de dizer "sim"
 */

import 'dotenv/config';
import { mkdirSync, existsSync } from 'fs';
import whatsapp from './services/whatsapp.js';
import behaviorEngine from './engine/behaviorEngine.js';
import followUpScheduler from './engine/followUpScheduler.js';
import db from './database/db.js';
import crmSync from './crm/sync.js';

// Garante que diretório de dados existe
if (!existsSync('./data')) {
    mkdirSync('./data', { recursive: true });
}

// Debounce para evitar processar mesma mensagem múltiplas vezes
const processedMessages = new Map();
const MESSAGE_DEBOUNCE_MS = 5000; // 5 segundos

// NOVO: Buffer de mensagens por telefone para agrupar msgs consecutivas
const messageBuffer = new Map(); // phone -> { messages: [], timeout: null }
const MESSAGE_BUFFER_DELAY_MS = 3000; // Espera 3s para agrupar msgs

function isMessageDuplicate(messageId) {
    if (!messageId) return false;

    const now = Date.now();
    const lastProcessed = processedMessages.get(messageId);

    // Limpa mensagens antigas (mais de 1 minuto)
    for (const [id, timestamp] of processedMessages.entries()) {
        if (now - timestamp > 60000) {
            processedMessages.delete(id);
        }
    }

    if (lastProcessed && now - lastProcessed < MESSAGE_DEBOUNCE_MS) {
        return true; // Duplicada
    }

    processedMessages.set(messageId, now);
    return false;
}

/**
 * Adiciona mensagem ao buffer e retorna se deve processar agora
 * Agrupa mensagens consecutivas do mesmo usuário em uma só
 */
function bufferMessage(phone, messageData) {
    return new Promise((resolve) => {
        let buffer = messageBuffer.get(phone);

        if (!buffer) {
            buffer = { messages: [], timeout: null, resolve: null };
            messageBuffer.set(phone, buffer);
        }

        // Adiciona msg ao buffer
        buffer.messages.push(messageData);

        // Cancela timeout anterior
        if (buffer.timeout) {
            clearTimeout(buffer.timeout);
        }

        // Aguarda 3s para ver se vem mais msgs
        buffer.timeout = setTimeout(() => {
            const messages = buffer.messages;
            messageBuffer.delete(phone);

            // Combina todas as mensagens em uma só
            if (messages.length > 1) {
                const combinedContent = messages.map(m => m.content).join('\n');
                const lastMsg = messages[messages.length - 1];
                console.log(`📦 ${messages.length} msgs agrupadas de ${phone}`);
                resolve({
                    ...lastMsg,
                    content: combinedContent,
                    originalMessages: messages
                });
            } else {
                resolve(messages[0]);
            }
        }, MESSAGE_BUFFER_DELAY_MS);
    });
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🤖 VENDEDOR DIGITAL INTELIGENTE                       ║
║                                                           ║
║     IA Conversacional com Follow-up Comportamental        ║
║                                                           ║
║     "80% das vendas acontecem após o 5º follow-up"        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// Verifica variáveis de ambiente
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não configurada!');
    console.log('   Configure no arquivo .env');
    process.exit(1);
}

console.log(`🔧 Modelo LLM: ${process.env.LLM_MODEL || 'gemini-2.0-flash-exp'}`);
console.log(`⏰ Horário comercial: ${process.env.BUSINESS_HOURS_START || 8}h - ${process.env.BUSINESS_HOURS_END || 21}h`);
console.log(`📊 Máximo de follow-ups: ${process.env.MAX_FOLLOWUPS || 5}`);
console.log('');

// Handler de mensagens
whatsapp.on('message', async (messageData) => {
    // Verifica duplicidade (evita processar mesma msg 2x)
    if (isMessageDuplicate(messageData.messageId)) {
        console.log(`⚠️ Mensagem duplicada ignorada: ${messageData.messageId}`);
        return;
    }

    console.log(`\n📩 Mensagem de ${messageData.name || messageData.phone}:`);
    console.log(`   "${messageData.content}"`);
    console.log(`   Tipo: ${messageData.type || 'text'}`);

    // BUFFER: Espera 3s para agrupar msgs consecutivas
    const bufferedData = await bufferMessage(messageData.phone, messageData);

    // Se há mais msgs no buffer ainda, não processa agora
    if (!bufferedData) {
        console.log(`   ⏳ Aguardando mais mensagens...`);
        return;
    }

    // Usa dados bufferizados (pode ter msgs combinadas)
    const processData = bufferedData;

    try {
        let processedContent = processData.content;
        let additionalContext = '';

        // 1. PROCESSAMENTO DE ÁUDIO
        if (processData.type === 'audio' && processData.audioBuffer) {
            console.log('🎤 Transcrevendo áudio...');

            const llm = (await import('./services/llm.js')).default;
            const transcription = await llm.transcribeAudio(
                processData.audioBuffer,
                processData.mimeType || 'audio/ogg'
            );

            if (transcription) {
                console.log(`📝 Transcrição: "${transcription}"`);
                processedContent = transcription;
                additionalContext = '\n[Cliente enviou áudio]';
            } else {
                console.log('⚠️ Não foi possível transcrever o áudio');
                processedContent = '[ÁUDIO RECEBIDO - não transcrito]';
            }
        }

        // 2. PROCESSAMENTO DE IMAGENS
        if (processData.type === 'image' && processData.imageBuffer) {
            console.log('🖼️ Analisando imagem...');

            const llm = (await import('./services/llm.js')).default;
            const conversationContext = processData.caption || 'Lead enviou uma imagem';
            const imageAnalysis = await llm.analyzeImage(
                processData.imageBuffer,
                processData.mimeType || 'image/jpeg',
                conversationContext
            );

            if (imageAnalysis) {
                console.log(`👁️ Análise: ${imageAnalysis}`);
                additionalContext = `\n[Imagem analisada: ${imageAnalysis}]`;
                processedContent = processData.caption
                    ? `${processData.caption}\n[sobre a imagem: ${imageAnalysis}]`
                    : `[Cliente enviou imagem: ${imageAnalysis}]`;
            } else {
                console.log('⚠️ Não foi possível analisar a imagem');
                processedContent = processData.caption || '[IMAGEM RECEBIDA - não analisada]';
            }
        }

        // 3. SYNC TO CRM - Log incoming message
        await crmSync.processIncomingMessage({
            phone: processData.phone,
            name: processData.name,
            content: processedContent,
            type: processData.type,
            messageId: processData.messageId
        });

        // 4. PROCESSA COM BEHAVIOR ENGINE
        const enrichedMessage = {
            ...processData,
            content: processedContent,
            context: additionalContext
        };

        const result = await behaviorEngine.processMessage(enrichedMessage);

        console.log(`\n🤖 Resposta:`);
        console.log(`   "${result.response}"`);
        console.log(`   [Intent: ${result.analysis.intent}, Sentiment: ${result.analysis.sentiment}]`);

        // 5. SYNC TO CRM - Update deal stage based on analysis
        await crmSync.updateDealStage(processData.phone, result.analysis, {
            content: processedContent,
            type: processData.type
        });

        // 6. REAÇÕES COM EMOJI (ocasional - 30% de chance)
        const shouldReact = Math.random() < 0.3; // 30% de chance
        if (processData.messageId && shouldReact) {
            let reaction = null;

            // Escolhe emoji baseado no contexto
            if (result.analysis.buyingSignal) {
                reaction = '🔥';
            } else if (result.analysis.sentiment === 'positive') {
                reaction = ['👍', '😊', '💪'][Math.floor(Math.random() * 3)];
            } else if (result.analysis.intent === 'greeting') {
                reaction = ['👋', '😄'][Math.floor(Math.random() * 2)];
            } else if (result.analysis.intent === 'question') {
                reaction = '👀';
            }

            if (reaction) {
                try {
                    console.log(`${reaction} Reagindo à mensagem`);
                    await whatsapp.sendReaction(
                        processData.phone,
                        processData.messageId,
                        reaction
                    );
                } catch (error) {
                    console.error('⚠️ Erro ao enviar reação:', error.message);
                }
            }
        }

        // 7. DECIDE FORMATO DA RESPOSTA (TEXTO OU ÁUDIO)
        const llm = (await import('./services/llm.js')).default;
        const conversationData = db.getConversation(processData.phone) || {
            engagement_level: 'warm'
        };

        const shouldUseAudio = llm.shouldRespondWithAudio(
            result.analysis,
            conversationData
        );

        // 8. ENVIA RESPOSTA
        if (shouldUseAudio) {
            console.log('🎙️ Gerando resposta em áudio...');
            try {
                await whatsapp.sendAudio(processData.phone, result.response);
            } catch (audioError) {
                console.error('⚠️ Erro ao enviar áudio, enviando texto:', audioError.message);
                // Fallback para texto se áudio falhar
                if (result.shouldFragment && result.fragments.length > 1) {
                    await whatsapp.sendFragmentedMessages(processData.phone, result.fragments);
                } else {
                    await whatsapp.sendMessage(processData.phone, result.response);
                }
            }
        } else {
            // Envia como texto
            const hasMultipleFragments = result.fragments && result.fragments.length > 1;

            if (hasMultipleFragments) {
                console.log(`📨 Enviando ${result.fragments.length} fragmentos`);

                // PRIMEIRA mensagem como REPLY (citando a msg do usuário)
                if (processData.messageId) {
                    await whatsapp.sendReply(
                        processData.phone,
                        result.fragments[0],
                        processData.messageId
                    );

                    // Restante como mensagens normais
                    if (result.fragments.length > 1) {
                        const restFragments = result.fragments.slice(1);
                        await whatsapp.sendFragmentedMessages(processData.phone, restFragments);
                    }
                } else {
                    await whatsapp.sendFragmentedMessages(processData.phone, result.fragments);
                }
            } else {
                // Mensagem única - envia como reply
                if (processData.messageId) {
                    await whatsapp.sendReply(
                        processData.phone,
                        result.response,
                        processData.messageId
                    );
                } else {
                    await whatsapp.sendMessage(processData.phone, result.response);
                }
            }
        }

        // 9. SYNC TO CRM - Log outgoing message
        await crmSync.processOutgoingMessage(processData.phone, result.response, {
            type: shouldUseAudio ? 'audio' : 'text',
            fragmented: result.shouldFragment
        });

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error.message);

        // Resposta de fallback
        const fallback = 'opa, tive um problema aqui\nme manda de novo?';
        await whatsapp.sendMessage(processData.phone, fallback);
    }
});

// Inicia quando WhatsApp conectar
whatsapp.on('ready', () => {
    console.log('\n🚀 Sistema pronto!');
    console.log('');

    // Inicia scheduler de follow-ups
    followUpScheduler.start();

    // Mostra estatísticas
    const stats = db.getConversationStats();
    console.log('📊 Estatísticas:');
    console.log(`   Total de conversas: ${stats.total || 0}`);
    console.log(`   Ativas: ${stats.active || 0}`);
    console.log(`   Convertidas: ${stats.converted || 0}`);
    console.log(`   Média de follow-ups: ${(stats.avg_followups || 0).toFixed(1)}`);
    console.log('');
});

// Conecta ao WhatsApp
console.log('📱 Conectando ao WhatsApp...\n');
whatsapp.connect().catch(err => {
    console.error('❌ Erro ao conectar:', err.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Encerrando...');
    process.exit(0);
});
