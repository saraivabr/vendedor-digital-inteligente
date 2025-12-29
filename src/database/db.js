/**
 * Database Service - SQLite com better-sqlite3
 * Persistência de conversas, mensagens e padrões comportamentais
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class DatabaseService {
    constructor() {
        this.db = new Database(join(__dirname, '../../data/vendedor.db'));
        this.db.pragma('journal_mode = WAL');
        this.initSchema();
    }

    initSchema() {
        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
        this.db.exec(schema);

        // Load CRM schema extension
        const crmSchema = readFileSync(join(__dirname, 'crm-schema.sql'), 'utf-8');
        this.db.exec(crmSchema);

        // Load RAG schema extension
        const ragSchema = readFileSync(join(__dirname, 'rag-schema.sql'), 'utf-8');
        this.db.exec(ragSchema);

        console.log('✅ Database initialized (core + CRM + RAG)');
    }

    // ==================== CONVERSATIONS ====================

    getConversation(phone) {
        return this.db.prepare(`
            SELECT * FROM conversations WHERE phone = ?
        `).get(phone);
    }

    createConversation(phone, name = null) {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.db.prepare(`
            INSERT INTO conversations (id, phone, name, first_contact_at)
            VALUES (?, ?, ?, datetime('now'))
        `).run(id, phone, name);

        return this.getConversation(phone);
    }

    getOrCreateConversation(phone, name = null) {
        let conv = this.getConversation(phone);
        if (!conv) {
            conv = this.createConversation(phone, name);
        }
        return conv;
    }

    updateConversation(phone, updates) {
        const fields = Object.keys(updates);
        const values = Object.values(updates);

        const setClause = fields.map(f => `${f} = ?`).join(', ');

        this.db.prepare(`
            UPDATE conversations SET ${setClause} WHERE phone = ?
        `).run(...values, phone);
    }

    // ==================== MESSAGES ====================

    addMessage(conversationId, role, content, analysis = {}) {
        this.db.prepare(`
            INSERT INTO messages (conversation_id, role, content, sentiment, intent, response_time_seconds)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            conversationId,
            role,
            content,
            analysis.sentiment || null,
            analysis.intent || null,
            analysis.responseTime || null
        );

        // Atualiza contadores na conversa
        const counterField = role === 'user' ? 'total_messages_received' : 'total_messages_sent';
        this.db.prepare(`
            UPDATE conversations
            SET ${counterField} = ${counterField} + 1,
                last_message_at = datetime('now'),
                last_message_from = ?
            WHERE id = ?
        `).run(role, conversationId);
    }

    getMessages(conversationId, limit = 20) {
        return this.db.prepare(`
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(conversationId, limit).reverse();
    }

    getRecentHistory(conversationId, limit = 10) {
        const messages = this.getMessages(conversationId, limit);
        return messages.map(m => ({
            role: m.role,
            content: m.content
        }));
    }

    // ==================== RESPONSE PATTERNS ====================

    recordResponsePattern(conversationId, timestamp = new Date()) {
        const dayOfWeek = timestamp.getDay();
        const hourOfDay = timestamp.getHours();

        this.db.prepare(`
            INSERT INTO response_patterns (conversation_id, day_of_week, hour_of_day, response_count)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(conversation_id, day_of_week, hour_of_day)
            DO UPDATE SET response_count = response_count + 1
        `).run(conversationId, dayOfWeek, hourOfDay);
    }

    getBestTimeToContact(conversationId) {
        // Retorna os horários com mais respostas
        const patterns = this.db.prepare(`
            SELECT day_of_week, hour_of_day, response_count
            FROM response_patterns
            WHERE conversation_id = ?
            ORDER BY response_count DESC
            LIMIT 5
        `).all(conversationId);

        if (patterns.length === 0) {
            // Default: horário comercial padrão
            return { dayOfWeek: null, hourOfDay: 13 }; // 13h é o melhor horário segundo pesquisa
        }

        return patterns[0];
    }

    // ==================== FOLLOW-UPS ====================

    recordFollowUp(conversationId, followUpNumber, strategy, message) {
        this.db.prepare(`
            INSERT INTO follow_ups (conversation_id, follow_up_number, strategy, message)
            VALUES (?, ?, ?, ?)
        `).run(conversationId, followUpNumber, strategy, message);

        this.db.prepare(`
            UPDATE conversations
            SET follow_up_count = ?,
                last_follow_up_at = datetime('now')
            WHERE id = ?
        `).run(followUpNumber, conversationId);
    }

    markFollowUpResponded(conversationId, responseTimeMinutes) {
        this.db.prepare(`
            UPDATE follow_ups
            SET response_received = 1, response_time_minutes = ?
            WHERE conversation_id = ?
            AND id = (SELECT MAX(id) FROM follow_ups WHERE conversation_id = ?)
        `).run(responseTimeMinutes, conversationId, conversationId);
    }

    getFollowUpHistory(conversationId) {
        return this.db.prepare(`
            SELECT * FROM follow_ups
            WHERE conversation_id = ?
            ORDER BY sent_at DESC
        `).all(conversationId);
    }

    // ==================== QUERIES PARA FOLLOW-UP SCHEDULER ====================

    getConversationsNeedingFollowUp() {
        return this.db.prepare(`
            SELECT * FROM conversations
            WHERE is_active = 1
            AND opted_out = 0
            AND converted = 0
            AND last_message_from = 'assistant'
            AND follow_up_count < ?
            AND (
                next_follow_up_at IS NULL
                OR datetime(next_follow_up_at) <= datetime('now')
            )
        `).all(parseInt(process.env.MAX_FOLLOWUPS) || 5);
    }

    scheduleNextFollowUp(conversationId, nextFollowUpAt) {
        this.db.prepare(`
            UPDATE conversations
            SET next_follow_up_at = ?
            WHERE id = ?
        `).run(nextFollowUpAt, conversationId);
    }

    // ==================== ANALYTICS ====================

    getConversationStats() {
        return this.db.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as converted,
                SUM(CASE WHEN opted_out = 1 THEN 1 ELSE 0 END) as opted_out,
                AVG(follow_up_count) as avg_followups,
                AVG(qualification_score) as avg_qualification
            FROM conversations
        `).get();
    }

    getFollowUpEffectiveness() {
        return this.db.prepare(`
            SELECT
                strategy,
                COUNT(*) as total_sent,
                SUM(response_received) as total_responses,
                ROUND(AVG(response_time_minutes), 2) as avg_response_time,
                ROUND(SUM(response_received) * 100.0 / COUNT(*), 2) as response_rate
            FROM follow_ups
            GROUP BY strategy
            ORDER BY response_rate DESC
        `).all();
    }

    // ==================== MEDIA INTERACTIONS ====================

    /**
     * Registra uma interação de mídia (áudio, imagem, etc.)
     * @param {string} conversationId - ID da conversa
     * @param {string} type - Tipo de mídia: 'audio_received', 'audio_sent', 'image_received', 'reaction_sent'
     * @param {object} data - Dados adicionais (duration, transcription)
     */
    recordMediaInteraction(conversationId, type, data = {}) {
        this.db.prepare(`
            INSERT INTO media_interactions (conversation_id, type, duration_seconds, transcription)
            VALUES (?, ?, ?, ?)
        `).run(conversationId, type, data.duration || null, data.transcription || null);
    }

    /**
     * Verifica se o lead prefere comunicação por áudio
     * Critério: mais de 2 áudios OU mais de 50% das mídias são áudios
     * @param {string} conversationId - ID da conversa
     * @returns {boolean} - true se prefere áudio
     */
    prefersAudio(conversationId) {
        const result = this.db.prepare(`
            SELECT
                COUNT(*) FILTER (WHERE type = 'audio_received') as audio_count,
                COUNT(*) FILTER (WHERE type IN ('audio_received', 'image_received')) as total_media
            FROM media_interactions
            WHERE conversation_id = ?
        `).get(conversationId);

        return result.audio_count > 2 || (result.total_media > 0 && result.audio_count / result.total_media >= 0.5);
    }

    /**
     * Atualiza a preferência de mídia do lead
     * @param {string} phone - Número de telefone do lead
     * @param {string} mediaType - Tipo de mídia: 'audio', 'image', 'text'
     */
    updateMediaPreference(phone, mediaType) {
        this.db.prepare(`
            UPDATE conversations
            SET last_media_type = ?,
                has_sent_audio = CASE WHEN ? = 'audio' THEN 1 ELSE has_sent_audio END
            WHERE phone = ?
        `).run(mediaType, mediaType, phone);
    }

    /**
     * Obtém estatísticas de interações de mídia por tipo
     * @param {string} conversationId - ID da conversa
     * @returns {Array} - Array com objetos {type, count}
     */
    getMediaStats(conversationId) {
        return this.db.prepare(`
            SELECT type, COUNT(*) as count
            FROM media_interactions
            WHERE conversation_id = ?
            GROUP BY type
        `).all(conversationId);
    }
}

export default new DatabaseService();
