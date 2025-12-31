/**
 * WhatsApp Advanced Features - Humanização Avançada
 *
 * Features extras do Baileys para tornar o bot ainda mais humano:
 * - Read receipts estratégicos
 * - Presence status dinâmico
 * - Edit messages (corrigir "typos")
 * - Delete messages (simular arrependimento)
 * - Video notes (círculos)
 * - Polls
 * - Forward messages
 * - Stickers
 * - Rejeitar chamadas automático
 */

import { delay } from '@whiskeysockets/baileys';

class WhatsAppAdvanced {
    constructor() {
        this.sock = null;
        this.lastSentMessages = new Map(); // Para editar/deletar depois
    }

    /**
     * Inicializa com socket do WhatsApp
     */
    init(sock) {
        this.sock = sock;
        this.setupCallRejection();
        console.log('🚀 WhatsApp Advanced Features initialized');
    }

    // ==================== READ RECEIPTS ESTRATÉGICOS ====================

    /**
     * Marca mensagem como lida com delay humano
     * Humanos não leem instantaneamente - demoram alguns segundos
     * @param {object} messageKey - Key da mensagem
     * @param {number} delayMs - Delay antes de marcar (default: random 1-4s)
     */
    async markAsReadWithDelay(messageKey, delayMs = null) {
        if (!this.sock) return;

        // Delay aleatório entre 1-4 segundos (humano lendo)
        const readDelay = delayMs || Math.floor(Math.random() * 3000) + 1000;

        await delay(readDelay);
        await this.sock.readMessages([messageKey]);

        console.log(`👁️ Mensagem lida após ${readDelay}ms`);
    }

    /**
     * Estratégia de leitura baseada no contexto
     * - Mensagem curta: lê rápido
     * - Mensagem longa: lê devagar
     * - Áudio/vídeo: delay proporcional à duração
     */
    async smartRead(messageKey, messageContent, messageType = 'text') {
        if (!this.sock) return;

        let readDelay;

        switch (messageType) {
            case 'audio':
                // Simula ouvir áudio (assume ~10s médio)
                readDelay = 8000 + Math.random() * 4000;
                break;
            case 'video':
                // Simula assistir vídeo
                readDelay = 5000 + Math.random() * 5000;
                break;
            case 'image':
                // Olha a imagem por alguns segundos
                readDelay = 2000 + Math.random() * 2000;
                break;
            default:
                // Texto: ~200ms por palavra + variação
                const wordCount = messageContent?.split(' ').length || 5;
                readDelay = Math.min(wordCount * 200 + Math.random() * 1000, 5000);
        }

        await delay(readDelay);
        await this.sock.readMessages([messageKey]);

        console.log(`👁️ Smart read: ${messageType} lido após ${readDelay}ms`);
    }

    /**
     * NÃO marca como lido imediatamente (cria suspense)
     * Útil em estágios avançados para criar urgência
     * @param {number} delayMinutes - Minutos para esperar
     */
    async delayedRead(messageKey, delayMinutes = 5) {
        if (!this.sock) return;

        setTimeout(async () => {
            await this.sock.readMessages([messageKey]);
            console.log(`👁️ Delayed read: lido após ${delayMinutes} minutos`);
        }, delayMinutes * 60 * 1000);
    }

    // ==================== PRESENCE STATUS ====================

    /**
     * Define status de presença
     * @param {string} status - 'available', 'unavailable', 'composing', 'recording', 'paused'
     * @param {string} jid - JID do chat (opcional para composing/recording)
     */
    async setPresence(status, jid = null) {
        if (!this.sock) return;

        await this.sock.sendPresenceUpdate(status, jid);
        console.log(`📡 Presence: ${status}`);
    }

    /**
     * Simula "saiu e voltou" - muito humano
     * Parece que a pessoa foi fazer outra coisa
     */
    async simulateAwayAndBack(awaySeconds = 30) {
        if (!this.sock) return;

        await this.sock.sendPresenceUpdate('unavailable');
        console.log(`🚶 Saindo por ${awaySeconds}s...`);

        await delay(awaySeconds * 1000);

        await this.sock.sendPresenceUpdate('available');
        console.log(`🏃 Voltou!`);
    }

    /**
     * Ciclo natural de presença durante horário comercial
     * Alterna entre available e unavailable de forma realista
     */
    startNaturalPresenceCycle() {
        if (!this.sock) return;

        const cycle = async () => {
            // 70% do tempo available, 30% unavailable
            const isAvailable = Math.random() > 0.3;
            await this.sock.sendPresenceUpdate(isAvailable ? 'available' : 'unavailable');

            // Próxima mudança em 5-15 minutos
            const nextChange = (5 + Math.random() * 10) * 60 * 1000;
            setTimeout(cycle, nextChange);
        };

        cycle();
        console.log('📡 Natural presence cycle started');
    }

    // ==================== EDIT MESSAGES ====================

    /**
     * Envia mensagem e depois "corrige" com edit
     * Simula humano cometendo typo e corrigindo
     * @param {string} jid - Destinatário
     * @param {string} originalText - Texto com "erro"
     * @param {string} correctedText - Texto corrigido
     * @param {number} editDelayMs - Delay antes de corrigir
     */
    async sendWithTypoCorrection(jid, originalText, correctedText, editDelayMs = 3000) {
        if (!this.sock) return;

        // Envia mensagem com "typo"
        const sentMessage = await this.sock.sendMessage(jid, { text: originalText });

        // Guarda referência
        this.lastSentMessages.set(jid, sentMessage);

        console.log(`📝 Enviado com typo: "${originalText}"`);

        // Espera e corrige
        await delay(editDelayMs);

        await this.sock.sendMessage(jid, {
            text: correctedText,
            edit: sentMessage.key
        });

        console.log(`✏️ Corrigido para: "${correctedText}"`);
    }

    /**
     * Edita última mensagem enviada
     * @param {string} jid - Destinatário
     * @param {string} newText - Novo texto
     */
    async editLastMessage(jid, newText) {
        if (!this.sock) return;

        const lastMessage = this.lastSentMessages.get(jid);
        if (!lastMessage) {
            console.warn('⚠️ Nenhuma mensagem anterior para editar');
            return;
        }

        await this.sock.sendMessage(jid, {
            text: newText,
            edit: lastMessage.key
        });

        console.log(`✏️ Última mensagem editada`);
    }

    // ==================== DELETE MESSAGES ====================

    /**
     * Deleta mensagem para todos (simula arrependimento)
     * @param {string} jid - Destinatário
     * @param {object} messageKey - Key da mensagem (ou usa última)
     */
    async deleteMessage(jid, messageKey = null) {
        if (!this.sock) return;

        const key = messageKey || this.lastSentMessages.get(jid)?.key;
        if (!key) {
            console.warn('⚠️ Nenhuma mensagem para deletar');
            return;
        }

        await this.sock.sendMessage(jid, { delete: key });
        console.log(`🗑️ Mensagem deletada para todos`);
    }

    /**
     * Envia e deleta rapidamente (simula "mandei no chat errado")
     * @param {string} jid - Destinatário
     * @param {string} text - Texto a enviar e deletar
     * @param {number} deleteDelayMs - Delay antes de deletar
     */
    async sendAndDelete(jid, text, deleteDelayMs = 2000) {
        if (!this.sock) return;

        const sentMessage = await this.sock.sendMessage(jid, { text });
        console.log(`📤 Enviado: "${text}"`);

        await delay(deleteDelayMs);

        await this.sock.sendMessage(jid, { delete: sentMessage.key });
        console.log(`🗑️ Deletado após ${deleteDelayMs}ms`);
    }

    // ==================== VIDEO NOTES (CÍRCULOS) ====================

    /**
     * Envia video note (círculo) - muito mais pessoal que texto
     * @param {string} jid - Destinatário
     * @param {Buffer|string} video - Buffer do vídeo ou caminho
     */
    async sendVideoNote(jid, video) {
        if (!this.sock) return;

        // Simula gravação
        await this.sock.sendPresenceUpdate('recording', jid);
        await delay(2000);

        await this.sock.sendMessage(jid, {
            video: typeof video === 'string' ? { url: video } : video,
            ptv: true, // Video note (círculo)
            caption: ''
        });

        await this.sock.sendPresenceUpdate('paused', jid);
        console.log(`📹 Video note enviado`);
    }

    // ==================== POLLS ====================

    /**
     * Envia enquete (poll)
     * Ótimo para engajamento e qualificação
     * @param {string} jid - Destinatário
     * @param {string} question - Pergunta da enquete
     * @param {string[]} options - Opções de resposta
     * @param {number} maxSelections - Máximo de seleções
     */
    async sendPoll(jid, question, options, maxSelections = 1) {
        if (!this.sock) return;

        await this.sock.sendMessage(jid, {
            poll: {
                name: question,
                values: options,
                selectableCount: maxSelections
            }
        });

        console.log(`📊 Poll enviada: "${question}"`);
    }

    /**
     * Polls pré-definidas para vendas
     */
    async sendQualificationPoll(jid) {
        await this.sendPoll(jid,
            'oq mais te incomoda hoje?',
            [
                'leads que somem',
                'demora pra responder',
                'não sei quando insistir',
                'nenhum desses'
            ]
        );
    }

    async sendInterestPoll(jid) {
        await this.sendPoll(jid,
            'quer saber mais sobre isso?',
            [
                'sim, me explica',
                'talvez, depende',
                'não, obrigado'
            ]
        );
    }

    // ==================== FORWARD MESSAGES ====================

    /**
     * Encaminha mensagem (forward)
     * Útil para compartilhar prints, cases, etc.
     * @param {string} jid - Destinatário
     * @param {object} message - Mensagem a encaminhar
     */
    async forwardMessage(jid, message) {
        if (!this.sock) return;

        await this.sock.sendMessage(jid, { forward: message });
        console.log(`↪️ Mensagem encaminhada`);
    }

    // ==================== STICKERS ====================

    /**
     * Envia sticker
     * @param {string} jid - Destinatário
     * @param {Buffer} stickerBuffer - Buffer do sticker (webp)
     * @param {boolean} isAnimated - Se é animado
     */
    async sendSticker(jid, stickerBuffer, isAnimated = false) {
        if (!this.sock) return;

        await this.sock.sendMessage(jid, {
            sticker: stickerBuffer,
            isAnimated
        });

        console.log(`🎨 Sticker enviado`);
    }

    // ==================== LOCATION ====================

    /**
     * Envia localização
     * Útil para mostrar escritório, eventos, etc.
     * @param {string} jid - Destinatário
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {string} name - Nome do local (opcional)
     */
    async sendLocation(jid, latitude, longitude, name = null) {
        if (!this.sock) return;

        const locationPayload = {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude
            }
        };

        if (name) {
            locationPayload.location.name = name;
        }

        await this.sock.sendMessage(jid, locationPayload);
        console.log(`📍 Localização enviada`);
    }

    // ==================== CONTACT CARD ====================

    /**
     * Envia cartão de contato (vCard)
     * @param {string} jid - Destinatário
     * @param {string} contactName - Nome do contato
     * @param {string} contactPhone - Telefone do contato
     * @param {string} organization - Empresa (opcional)
     */
    async sendContactCard(jid, contactName, contactPhone, organization = '') {
        if (!this.sock) return;

        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
${organization ? `ORG:${organization};` : ''}
TEL;type=CELL;type=VOICE;waid=${contactPhone.replace(/\D/g, '')}:${contactPhone}
END:VCARD`;

        await this.sock.sendMessage(jid, {
            contacts: {
                displayName: contactName,
                contacts: [{ vcard }]
            }
        });

        console.log(`📇 Contato enviado: ${contactName}`);
    }

    // ==================== AUTO CALL REJECTION ====================

    /**
     * Configura rejeição automática de chamadas
     * Bots não podem atender chamadas, então rejeitamos
     */
    setupCallRejection() {
        if (!this.sock) return;

        this.sock.ev.on('call', async (calls) => {
            for (const call of calls) {
                if (call.status === 'offer') {
                    console.log(`📞 Chamada recebida de ${call.from} - rejeitando...`);

                    await this.sock.rejectCall(call.id, call.from);

                    // Envia mensagem explicando
                    await delay(2000);
                    await this.sock.sendMessage(call.from, {
                        text: 'opa, to em reunião agr\n\npode mandar msg q respondo'
                    });

                    console.log(`📞 Chamada rejeitada e mensagem enviada`);
                }
            }
        });

        console.log('📞 Auto call rejection configured');
    }

    // ==================== MENTIONS ====================

    /**
     * Envia mensagem com menção
     * @param {string} jid - Destinatário (grupo)
     * @param {string} text - Texto com @numero
     * @param {string[]} mentionedJids - JIDs mencionados
     */
    async sendWithMentions(jid, text, mentionedJids) {
        if (!this.sock) return;

        await this.sock.sendMessage(jid, {
            text,
            mentions: mentionedJids
        });

        console.log(`📢 Mensagem com ${mentionedJids.length} menções`);
    }

    // ==================== DISAPPEARING MESSAGES ====================

    /**
     * Ativa mensagens temporárias no chat
     * @param {string} jid - Chat
     * @param {number} duration - Duração em segundos (7 dias = 604800)
     */
    async enableDisappearingMessages(jid, duration = 604800) {
        if (!this.sock) return;

        await this.sock.sendMessage(jid, {
            disappearingMessagesInChat: duration
        });

        console.log(`⏱️ Mensagens temporárias ativadas (${duration}s)`);
    }

    /**
     * Desativa mensagens temporárias
     * @param {string} jid - Chat
     */
    async disableDisappearingMessages(jid) {
        if (!this.sock) return;

        await this.sock.sendMessage(jid, {
            disappearingMessagesInChat: false
        });

        console.log(`⏱️ Mensagens temporárias desativadas`);
    }

    // ==================== CHAT MANAGEMENT ====================

    /**
     * Arquiva chat
     * @param {string} jid - Chat
     * @param {object} lastMessage - Última mensagem do chat
     */
    async archiveChat(jid, lastMessage) {
        if (!this.sock) return;

        await this.sock.chatModify(
            { archive: true, lastMessages: [lastMessage] },
            jid
        );

        console.log(`📦 Chat arquivado`);
    }

    /**
     * Fixa chat no topo
     * @param {string} jid - Chat
     */
    async pinChat(jid) {
        if (!this.sock) return;

        await this.sock.chatModify({ pin: true }, jid);
        console.log(`📌 Chat fixado`);
    }

    /**
     * Silencia chat
     * @param {string} jid - Chat
     * @param {number} hours - Horas para silenciar (0 = desmutar)
     */
    async muteChat(jid, hours = 8) {
        if (!this.sock) return;

        const muteMs = hours === 0 ? null : hours * 60 * 60 * 1000;
        await this.sock.chatModify({ mute: muteMs }, jid);

        console.log(hours ? `🔇 Chat silenciado por ${hours}h` : `🔊 Chat desmutado`);
    }

    // ==================== PROFILE ====================

    /**
     * Atualiza status do perfil
     * @param {string} status - Novo status
     */
    async updateProfileStatus(status) {
        if (!this.sock) return;

        await this.sock.updateProfileStatus(status);
        console.log(`📝 Status atualizado: "${status}"`);
    }

    /**
     * Obtém informações de um contato
     * @param {string} jid - JID do contato
     */
    async getContactInfo(jid) {
        if (!this.sock) return null;

        try {
            const [profilePic, status] = await Promise.all([
                this.sock.profilePictureUrl(jid, 'image').catch(() => null),
                this.sock.fetchStatus(jid).catch(() => null)
            ]);

            return { profilePic, status: status?.status };
        } catch {
            return null;
        }
    }
}

export default new WhatsAppAdvanced();
