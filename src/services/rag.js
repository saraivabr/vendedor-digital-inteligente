/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Sistema de busca semântica para enriquecer respostas da IA com
 * conhecimento relevante do produto, FAQs, objeções e conversas passadas.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import embeddings from './embeddings.js';
import productKnowledge from '../knowledge/product.js';

class RAGService {
    constructor() {
        this.initialized = false;
        this.minSimilarity = 0.65; // Threshold mínimo de similaridade
    }

    /**
     * Inicializa o RAG indexando toda a base de conhecimento
     */
    async initialize() {
        if (this.initialized) return;

        console.log('📚 Inicializando RAG...');

        try {
            // Indexa conhecimento do produto
            await this.indexProductKnowledge();

            this.initialized = true;
            console.log('✅ RAG inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar RAG:', error.message);
        }
    }

    /**
     * Indexa todo o conhecimento do produto
     */
    async indexProductKnowledge() {
        const chunks = [];

        // 1. FAQs
        for (const faq of productKnowledge.faqs) {
            chunks.push({
                id: uuidv4(),
                content: `Pergunta: ${faq.question}\nResposta: ${faq.answer}`,
                content_type: 'faq',
                source: 'product.js',
                source_id: faq.id || null,
                title: faq.question,
                tags: JSON.stringify(faq.tags || [])
            });
        }

        // 2. Objeções
        for (const objection of productKnowledge.objections) {
            chunks.push({
                id: uuidv4(),
                content: `Objeção: ${objection.objection}\nGatilhos: ${objection.triggers.join(', ')}\nResposta: ${objection.response}`,
                content_type: 'objection',
                source: 'product.js',
                source_id: objection.id || null,
                title: objection.objection,
                tags: JSON.stringify(objection.triggers || [])
            });
        }

        // 3. Descrição do produto
        chunks.push({
            id: uuidv4(),
            content: `Produto: ${productKnowledge.productName}\n${productKnowledge.description}\n\nBenefícios:\n${productKnowledge.benefits.join('\n')}`,
            content_type: 'product',
            source: 'product.js',
            source_id: 'main',
            title: productKnowledge.productName,
            tags: '["produto", "descrição", "benefícios"]'
        });

        // 4. Método Continuidade
        if (productKnowledge.method) {
            chunks.push({
                id: uuidv4(),
                content: `Método: ${productKnowledge.method.name}\n${productKnowledge.method.description}\n\nPilares:\n${productKnowledge.method.pillars?.join('\n') || ''}`,
                content_type: 'method',
                source: 'product.js',
                source_id: 'method',
                title: productKnowledge.method.name,
                tags: '["método", "continuidade", "pilares"]'
            });
        }

        // 5. Scripts de vendas
        if (productKnowledge.scripts) {
            for (const [key, script] of Object.entries(productKnowledge.scripts)) {
                chunks.push({
                    id: uuidv4(),
                    content: `Script ${key}: ${script}`,
                    content_type: 'script',
                    source: 'product.js',
                    source_id: key,
                    title: `Script: ${key}`,
                    tags: JSON.stringify(['script', key])
                });
            }
        }

        // 6. Estatísticas
        if (productKnowledge.stats) {
            chunks.push({
                id: uuidv4(),
                content: `Estatísticas de vendas:\n${productKnowledge.stats.map(s => `- ${s}`).join('\n')}`,
                content_type: 'stats',
                source: 'product.js',
                source_id: 'stats',
                title: 'Estatísticas de Vendas',
                tags: '["estatísticas", "dados", "pesquisa"]'
            });
        }

        console.log(`📝 Indexando ${chunks.length} chunks de conhecimento...`);

        // Gera embeddings e salva
        for (const chunk of chunks) {
            const embedding = await embeddings.generateEmbedding(chunk.content);
            if (embedding) {
                this.saveChunk({
                    ...chunk,
                    embedding: JSON.stringify(embedding)
                });
            }
        }

        console.log(`✅ ${chunks.length} chunks indexados`);
    }

    /**
     * Salva um chunk no banco de dados
     */
    saveChunk(chunk) {
        try {
            const stmt = db.db.prepare(`
                INSERT OR REPLACE INTO knowledge_chunks
                (id, content, content_type, source, source_id, title, tags, embedding, embedding_model)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                chunk.id,
                chunk.content,
                chunk.content_type,
                chunk.source,
                chunk.source_id,
                chunk.title,
                chunk.tags,
                chunk.embedding,
                'text-embedding-004'
            );
        } catch (error) {
            console.error('❌ Erro ao salvar chunk:', error.message);
        }
    }

    /**
     * Busca conhecimento relevante para uma query
     * @param {string} query - Texto da busca
     * @param {Object} options - Opções de busca
     * @returns {Promise<Array>} - Resultados ordenados por relevância
     */
    async search(query, options = {}) {
        const {
            topK = 5,
            contentTypes = null, // null = todos, ou array ['faq', 'objection', ...]
            minSimilarity = this.minSimilarity
        } = options;

        const startTime = Date.now();

        try {
            // Gera embedding da query
            const queryEmbedding = await embeddings.generateEmbedding(query);
            if (!queryEmbedding) {
                console.warn('⚠️ Não foi possível gerar embedding da query');
                return [];
            }

            // Busca chunks no banco
            let chunks = this.getAllChunks(contentTypes);

            // Calcula similaridade
            const results = chunks
                .filter(chunk => chunk.embedding)
                .map(chunk => {
                    const chunkEmbedding = JSON.parse(chunk.embedding);
                    const similarity = embeddings.cosineSimilarity(queryEmbedding, chunkEmbedding);
                    return { ...chunk, similarity };
                })
                .filter(r => r.similarity >= minSimilarity)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK);

            const searchTime = Date.now() - startTime;

            // Log da query (para análise futura)
            this.logQuery(query, queryEmbedding, results, searchTime);

            return results;
        } catch (error) {
            console.error('❌ Erro na busca RAG:', error.message);
            return [];
        }
    }

    /**
     * Busca conhecimento relevante para objeções
     * @param {string} message - Mensagem do cliente
     * @returns {Promise<Object|null>} - Objeção mais relevante
     */
    async findRelevantObjection(message) {
        const results = await this.search(message, {
            contentTypes: ['objection'],
            topK: 1,
            minSimilarity: 0.70
        });

        return results.length > 0 ? results[0] : null;
    }

    /**
     * Busca conhecimento relevante para FAQs
     * @param {string} message - Mensagem do cliente
     * @returns {Promise<Array>} - FAQs relevantes
     */
    async findRelevantFAQs(message) {
        return await this.search(message, {
            contentTypes: ['faq'],
            topK: 3,
            minSimilarity: 0.65
        });
    }

    /**
     * Gera contexto enriquecido para a IA
     * @param {string} message - Mensagem do cliente
     * @returns {Promise<string>} - Contexto formatado
     */
    async getEnrichedContext(message) {
        const results = await this.search(message, {
            topK: 3,
            minSimilarity: 0.60
        });

        if (results.length === 0) {
            return '';
        }

        const contextParts = results.map(r => {
            return `[${r.content_type.toUpperCase()} - Relevância: ${(r.similarity * 100).toFixed(0)}%]\n${r.content}`;
        });

        return `\n--- CONTEXTO RELEVANTE (RAG) ---\n${contextParts.join('\n\n')}\n--- FIM DO CONTEXTO ---\n`;
    }

    /**
     * Indexa uma conversa para aprendizado futuro
     * @param {string} conversationId - ID da conversa
     * @param {string} phone - Telefone do cliente
     * @param {Array} messages - Mensagens da conversa
     */
    async indexConversation(conversationId, phone, messages) {
        if (!messages || messages.length < 3) return; // Só indexa conversas significativas

        try {
            // Cria resumo da conversa
            const conversationText = messages
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            const summary = this.summarizeConversation(messages);

            // Gera embedding do resumo
            const embeddingVector = await embeddings.generateEmbedding(summary);

            if (embeddingVector) {
                const stmt = db.db.prepare(`
                    INSERT OR REPLACE INTO conversation_summaries
                    (id, conversation_id, phone, summary, messages_count, embedding, last_message_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `);

                stmt.run(
                    uuidv4(),
                    conversationId,
                    phone,
                    summary,
                    messages.length,
                    JSON.stringify(embeddingVector)
                );

                console.log(`📝 Conversa ${conversationId} indexada para RAG`);
            }
        } catch (error) {
            console.error('❌ Erro ao indexar conversa:', error.message);
        }
    }

    /**
     * Gera resumo simples de uma conversa
     * @param {Array} messages - Mensagens
     * @returns {string} - Resumo
     */
    summarizeConversation(messages) {
        const clientMessages = messages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' ');

        // Extrai pontos-chave
        const keywords = [];

        if (clientMessages.match(/preço|valor|caro|barato|investimento/i)) {
            keywords.push('discussão de preço');
        }
        if (clientMessages.match(/funciona|como|resultado/i)) {
            keywords.push('dúvidas sobre funcionamento');
        }
        if (clientMessages.match(/concorrente|outro|já tenho/i)) {
            keywords.push('comparação com concorrentes');
        }
        if (clientMessages.match(/pensar|depois|agora não/i)) {
            keywords.push('objeção de timing');
        }

        return `Conversa com cliente. Temas: ${keywords.join(', ') || 'geral'}. Resumo: ${clientMessages.slice(0, 500)}`;
    }

    /**
     * Busca conversas similares passadas
     * @param {string} currentMessage - Mensagem atual
     * @returns {Promise<Array>} - Conversas similares
     */
    async findSimilarConversations(currentMessage) {
        const queryEmbedding = await embeddings.generateEmbedding(currentMessage);
        if (!queryEmbedding) return [];

        try {
            const summaries = db.db.prepare(`
                SELECT * FROM conversation_summaries
                WHERE embedding IS NOT NULL
                ORDER BY updated_at DESC
                LIMIT 100
            `).all();

            const results = summaries
                .map(s => {
                    const embeddingVector = JSON.parse(s.embedding);
                    const similarity = embeddings.cosineSimilarity(queryEmbedding, embeddingVector);
                    return { ...s, similarity };
                })
                .filter(r => r.similarity >= 0.70)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3);

            return results;
        } catch (error) {
            console.error('❌ Erro ao buscar conversas similares:', error.message);
            return [];
        }
    }

    /**
     * Retorna todos os chunks do banco
     */
    getAllChunks(contentTypes = null) {
        try {
            let query = 'SELECT * FROM knowledge_chunks WHERE embedding IS NOT NULL';

            if (contentTypes && contentTypes.length > 0) {
                const placeholders = contentTypes.map(() => '?').join(',');
                query += ` AND content_type IN (${placeholders})`;
                return db.db.prepare(query).all(...contentTypes);
            }

            return db.db.prepare(query).all();
        } catch (error) {
            console.error('❌ Erro ao buscar chunks:', error.message);
            return [];
        }
    }

    /**
     * Loga query para análise futura
     */
    logQuery(query, embedding, results, searchTime) {
        try {
            const stmt = db.db.prepare(`
                INSERT INTO rag_queries
                (id, query, query_embedding, results_count, top_results, search_time_ms)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                uuidv4(),
                query,
                JSON.stringify(embedding),
                results.length,
                JSON.stringify(results.slice(0, 5).map(r => ({
                    title: r.title,
                    similarity: r.similarity,
                    type: r.content_type
                }))),
                searchTime
            );
        } catch (error) {
            // Silently fail - logging não deve quebrar o fluxo
        }
    }

    /**
     * Retorna estatísticas do RAG
     */
    getStats() {
        try {
            const chunksCount = db.db.prepare('SELECT COUNT(*) as count FROM knowledge_chunks').get();
            const summariesCount = db.db.prepare('SELECT COUNT(*) as count FROM conversation_summaries').get();
            const queriesCount = db.db.prepare('SELECT COUNT(*) as count FROM rag_queries').get();

            const avgSearchTime = db.db.prepare(`
                SELECT AVG(search_time_ms) as avg FROM rag_queries
                WHERE created_at > datetime('now', '-1 day')
            `).get();

            return {
                chunks: chunksCount?.count || 0,
                summaries: summariesCount?.count || 0,
                queries: queriesCount?.count || 0,
                avgSearchTime: avgSearchTime?.avg?.toFixed(2) || 0
            };
        } catch (error) {
            return { chunks: 0, summaries: 0, queries: 0, avgSearchTime: 0 };
        }
    }
}

export default new RAGService();
