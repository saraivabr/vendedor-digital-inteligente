/**
 * Embeddings Service
 *
 * Gera embeddings (vetores) para busca semântica usando Google Gemini.
 * Embeddings são representações numéricas de texto que capturam significado.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

class EmbeddingsService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
        this.cache = new Map(); // Cache de embeddings para evitar chamadas repetidas
        console.log('🔢 Embeddings Service initialized');
    }

    /**
     * Gera embedding para um texto
     * @param {string} text - Texto para gerar embedding
     * @returns {Promise<number[]>} - Vetor de embedding
     */
    async generateEmbedding(text) {
        if (!text || typeof text !== 'string') {
            console.warn('⚠️ Texto inválido para embedding');
            return null;
        }

        // Limpa e normaliza texto
        const cleanText = text.trim().toLowerCase().slice(0, 2000); // Limite de 2000 chars

        // Verifica cache
        const cacheKey = this.hashText(cleanText);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const result = await this.model.embedContent(cleanText);
            const embedding = result.embedding.values;

            // Salva no cache (limite de 1000 itens)
            if (this.cache.size > 1000) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(cacheKey, embedding);

            return embedding;
        } catch (error) {
            console.error('❌ Erro ao gerar embedding:', error.message);
            return null;
        }
    }

    /**
     * Gera embeddings em batch para múltiplos textos
     * @param {string[]} texts - Array de textos
     * @returns {Promise<number[][]>} - Array de embeddings
     */
    async generateBatchEmbeddings(texts) {
        const embeddings = [];

        // Processa em chunks de 10 para evitar rate limiting
        const chunkSize = 10;
        for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, i + chunkSize);
            const chunkEmbeddings = await Promise.all(
                chunk.map(text => this.generateEmbedding(text))
            );
            embeddings.push(...chunkEmbeddings);

            // Pequeno delay entre chunks
            if (i + chunkSize < texts.length) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        return embeddings;
    }

    /**
     * Calcula similaridade de cosseno entre dois vetores
     * Retorna valor entre -1 e 1, onde 1 = idênticos
     * @param {number[]} a - Primeiro vetor
     * @param {number[]} b - Segundo vetor
     * @returns {number} - Similaridade
     */
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Encontra os N itens mais similares a uma query
     * @param {number[]} queryEmbedding - Embedding da query
     * @param {Array<{embedding: number[], ...}>} items - Itens para comparar
     * @param {number} topK - Quantidade de resultados
     * @returns {Array<{item: any, similarity: number}>}
     */
    findMostSimilar(queryEmbedding, items, topK = 5) {
        if (!queryEmbedding || !items || items.length === 0) {
            return [];
        }

        const scored = items
            .filter(item => item.embedding)
            .map(item => ({
                item,
                similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);

        return scored;
    }

    /**
     * Gera hash simples de texto para cache
     * @param {string} text
     * @returns {string}
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
}

export default new EmbeddingsService();
