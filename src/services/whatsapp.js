/**
 * WhatsApp Service - Integração com Baileys
 * Socket-based WhatsApp Web API
 */

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    downloadMediaMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';
import humanizer from '../utils/humanizer.js';

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.sock = null;
        this.isConnected = false;
        // Note: makeInMemoryStore was removed in Baileys 6.x
        // The bot works fine without it - store was only for caching chats/messages
    }

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '131.0.0'],
            version: [2, 3000, 1027934701],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 500
        });

        // Eventos de conexão
        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n📱 Escaneie o QR Code abaixo:\n');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log('❌ Conexão fechada:', lastDisconnect?.error?.message);
                console.log('   Status code:', statusCode);
                console.log('   Erro completo:', JSON.stringify(lastDisconnect?.error, null, 2));

                if (shouldReconnect) {
                    console.log('🔄 Reconectando em 5s...');
                    setTimeout(() => this.connect(), 5000);
                } else {
                    console.log('⚠️ Deslogado. Delete a pasta auth_info e reinicie.');
                }
            }

            if (connection === 'open') {
                this.isConnected = true;
                console.log('✅ WhatsApp conectado!');
                this.emit('ready');
            }
        });

        // Salva credenciais quando atualizadas
        this.sock.ev.on('creds.update', saveCreds);

        // Processa mensagens recebidas
        this.sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];

            // Ignora mensagens que não são de chat ou são do próprio bot
            if (!msg.message || msg.key.fromMe) return;

            // Ignora status/broadcasts
            if (msg.key.remoteJid === 'status@broadcast') return;

            // Extrai dados da mensagem
            const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
            const pushName = msg.pushName || null;
            const messageContent = this.extractMessageContent(msg);

            if (!messageContent) return;

            // Prepara dados da mensagem
            const messageData = {
                phone,
                name: pushName,
                content: messageContent.text || messageContent,
                type: messageContent.type || 'text',
                hasMedia: messageContent.hasMedia || false,
                timestamp: new Date(msg.messageTimestamp * 1000),
                raw: msg,
                messageId: msg.key.id
            };

            // Baixa mídia se necessário
            if (messageContent.hasMedia && messageContent.message) {
                try {
                    // Áudio
                    if (messageContent.type === 'audio') {
                        const audioBuffer = await this.downloadMedia(messageContent.message);
                        messageData.audioBuffer = audioBuffer;
                        messageData.mimeType = msg.message.audioMessage?.mimetype || 'audio/ogg';
                        console.log('📥 Áudio baixado para processamento');
                    }

                    // Imagem
                    if (messageContent.type === 'image') {
                        const imageBuffer = await this.downloadMedia(messageContent.message);
                        messageData.imageBuffer = imageBuffer;
                        messageData.mimeType = msg.message.imageMessage?.mimetype || 'image/jpeg';
                        messageData.caption = msg.message.imageMessage?.caption || null;
                        console.log('📥 Imagem baixada para processamento');
                    }
                } catch (error) {
                    console.error('⚠️ Erro ao baixar mídia:', error.message);
                }
            }

            // Emite evento para processamento
            this.emit('message', messageData);
        });

        return this.sock;
    }

    /**
     * Extrai conteúdo da mensagem (texto, caption de mídia, etc)
     */
    extractMessageContent(msg) {
        const message = msg.message;

        // Texto simples
        if (message.conversation) {
            return { text: message.conversation, type: 'text' };
        }

        // Texto estendido
        if (message.extendedTextMessage?.text) {
            return { text: message.extendedTextMessage.text, type: 'text' };
        }

        // Imagem
        if (message.imageMessage) {
            const caption = message.imageMessage.caption || '';
            return {
                text: caption ? `[IMAGEM] ${caption}` : '[IMAGEM]',
                type: 'image',
                hasMedia: true,
                message: msg
            };
        }

        // Vídeo
        if (message.videoMessage) {
            const caption = message.videoMessage.caption || '';
            return {
                text: caption ? `[VÍDEO] ${caption}` : '[VÍDEO]',
                type: 'video',
                hasMedia: true,
                message: msg
            };
        }

        // Documento
        if (message.documentMessage) {
            const caption = message.documentMessage.caption || '';
            return {
                text: caption ? `[DOCUMENTO] ${caption}` : '[DOCUMENTO]',
                type: 'document',
                hasMedia: true,
                message: msg
            };
        }

        // Áudio
        if (message.audioMessage) {
            return {
                text: '[ÁUDIO]',
                type: 'audio',
                hasMedia: true,
                message: msg
            };
        }

        // Sticker
        if (message.stickerMessage) {
            return { text: '[STICKER]', type: 'sticker' };
        }

        return null;
    }

    /**
     * Envia mensagem de texto com timing humanizado
     * @param {string} phone - Número (apenas dígitos, sem @s.whatsapp.net)
     * @param {string} text - Texto da mensagem
     * @param {string} complexity - 'low', 'medium', 'high' - afeta tempo de "pensamento"
     */
    async sendMessage(phone, text, complexity = 'medium') {
        if (!this.isConnected) {
            throw new Error('WhatsApp não conectado');
        }

        const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

        // Simula digitação humana com timing do humanizer
        await this.sock.presenceSubscribe(jid);
        await this.sock.sendPresenceUpdate('composing', jid);

        // Delay calculado pelo humanizer (mais realista)
        const typingDelay = humanizer.calculateTypingDelay(text, complexity);
        await delay(typingDelay);

        // Envia mensagem
        await this.sock.sendMessage(jid, { text });

        // Para de digitar
        await this.sock.sendPresenceUpdate('paused', jid);

        console.log(`📤 [${typingDelay}ms] Mensagem enviada para ${phone}`);
    }

    /**
     * Envia múltiplas mensagens com delay humano entre elas
     * Simula pausas naturais de digitação como um humano real faria
     * @param {string} phone - Número
     * @param {string[]} messages - Array de mensagens
     */
    async sendFragmentedMessages(phone, messages) {
        console.log(`📨 Enviando ${messages.length} fragmentos para ${phone}`);

        for (let i = 0; i < messages.length; i++) {
            // Primeira mensagem tem complexidade 'medium', outras 'low'
            const complexity = i === 0 ? 'medium' : 'low';
            await this.sendMessage(phone, messages[i], complexity);

            if (i < messages.length - 1) {
                // Delay entre fragmentos calculado pelo humanizer
                const fragmentDelay = humanizer.calculateFragmentDelay(messages[i + 1]);
                console.log(`   ⏳ Aguardando ${fragmentDelay}ms antes do próximo fragmento`);
                await delay(fragmentDelay);
            }
        }

        console.log(`✅ Todos os ${messages.length} fragmentos enviados`);
    }

    /**
     * Envia reação a uma mensagem
     * @param {string} phone - Número
     * @param {string} messageId - ID da mensagem
     * @param {string} emoji - Emoji da reação
     */
    async sendReaction(phone, messageId, emoji) {
        if (!this.isConnected) {
            throw new Error('WhatsApp não conectado');
        }

        const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

        await this.sock.sendMessage(jid, {
            react: {
                text: emoji,
                key: {
                    remoteJid: jid,
                    id: messageId
                }
            }
        });

        console.log(`👍 Reação "${emoji}" enviada para ${phone}`);
    }

    /**
     * Envia mensagem como REPLY (citando a mensagem original)
     * @param {string} phone - Número
     * @param {string} text - Texto da resposta
     * @param {string} quotedMessageId - ID da mensagem a ser citada
     * @param {string} complexity - Complexidade para timing
     */
    async sendReply(phone, text, quotedMessageId, complexity = 'medium') {
        if (!this.isConnected) {
            throw new Error('WhatsApp não conectado');
        }

        const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

        // Simula digitação humana
        await this.sock.presenceSubscribe(jid);
        await this.sock.sendPresenceUpdate('composing', jid);

        const typingDelay = humanizer.calculateTypingDelay(text, complexity);
        await delay(typingDelay);

        // Envia com quote (citação)
        await this.sock.sendMessage(jid, {
            text,
            quoted: {
                key: {
                    remoteJid: jid,
                    id: quotedMessageId
                }
            }
        });

        await this.sock.sendPresenceUpdate('paused', jid);

        console.log(`💬 [${typingDelay}ms] Reply enviado para ${phone}`);
    }

    /**
     * Envia áudio (Push to Talk - PTT)
     * @param {string} phone - Número
     * @param {string|Buffer} content - Texto para TTS ou Buffer de áudio pronto
     */
    async sendAudio(phone, content) {
        if (!this.isConnected) {
            throw new Error('WhatsApp não conectado');
        }

        const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

        let audioBuffer;

        // Se for texto, converte para áudio (TTS)
        if (typeof content === 'string') {
            const llm = (await import('./llm.js')).default;
            audioBuffer = await llm.generateAudio(content);

            if (!audioBuffer) {
                throw new Error('TTS não disponível. Configure um serviço de TTS ou desabilite AUDIO_ENABLED');
            }
        } else {
            audioBuffer = content;
        }

        // Simula gravação (mais humano)
        await this.sock.presenceSubscribe(jid);
        await this.sock.sendPresenceUpdate('recording', jid);

        // Delay proporcional ao tamanho (simula gravação)
        if (typeof content === 'string') {
            const recordingDelay = Math.min(Math.max(content.length * 40, 1000), 3000);
            await delay(recordingDelay);
        } else {
            await delay(1500);
        }

        await this.sock.sendMessage(jid, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true  // Push to talk (nota de voz)
        });

        // Para de gravar
        await this.sock.sendPresenceUpdate('paused', jid);

        console.log(`🎤 Áudio enviado para ${phone}`);
    }

    /**
     * Faz download de mídia de uma mensagem
     * @param {object} message - Objeto de mensagem do Baileys
     * @returns {Buffer} Buffer da mídia
     */
    async downloadMedia(message) {
        if (!this.isConnected) {
            throw new Error('WhatsApp não conectado');
        }

        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {});
            console.log('📥 Mídia baixada com sucesso');
            return buffer;
        } catch (error) {
            console.error('❌ Erro ao baixar mídia:', error.message);
            throw new Error(`Falha ao baixar mídia: ${error.message}`);
        }
    }

    /**
     * Verifica se número existe no WhatsApp
     * @param {string} phone - Número
     * @returns {boolean}
     */
    async isOnWhatsApp(phone) {
        try {
            const [result] = await this.sock.onWhatsApp(phone);
            return result?.exists || false;
        } catch {
            return false;
        }
    }

    /**
     * Obtém foto de perfil
     * @param {string} phone - Número
     * @returns {string|null} URL da foto
     */
    async getProfilePicture(phone) {
        try {
            const jid = `${phone}@s.whatsapp.net`;
            return await this.sock.profilePictureUrl(jid, 'image');
        } catch {
            return null;
        }
    }
}

export default new WhatsAppService();
