-- RAG (Retrieval-Augmented Generation) Schema
-- Sistema de embeddings para busca semântica

-- ==================== KNOWLEDGE CHUNKS ====================
-- Pedaços de conhecimento indexados para RAG
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,

    -- Conteúdo
    content TEXT NOT NULL,
    content_type TEXT NOT NULL, -- 'faq', 'objection', 'product', 'method', 'script', 'conversation'

    -- Metadados
    source TEXT, -- 'product.js', 'conversation:123', etc.
    source_id TEXT, -- ID do item original
    title TEXT,
    tags TEXT DEFAULT '[]', -- JSON array

    -- Embedding (vetor como JSON array)
    embedding TEXT, -- JSON array de floats
    embedding_model TEXT DEFAULT 'text-embedding-004',

    -- Para conversas
    conversation_id TEXT,
    phone TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CONVERSATION SUMMARIES ====================
-- Resumos de conversas para contexto rápido
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,

    -- Resumo
    summary TEXT NOT NULL,
    key_points TEXT DEFAULT '[]', -- JSON array
    pain_points TEXT DEFAULT '[]', -- JSON array
    objections TEXT DEFAULT '[]', -- JSON array
    buying_signals TEXT DEFAULT '[]', -- JSON array

    -- Embedding do resumo
    embedding TEXT,

    -- Status
    messages_count INTEGER DEFAULT 0,
    last_message_at TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- ==================== RAG QUERIES LOG ====================
-- Log de queries RAG para análise e melhoria
CREATE TABLE IF NOT EXISTS rag_queries (
    id TEXT PRIMARY KEY,

    -- Query
    query TEXT NOT NULL,
    query_embedding TEXT,

    -- Resultados
    results_count INTEGER DEFAULT 0,
    top_results TEXT DEFAULT '[]', -- JSON array com top 5 resultados

    -- Contexto
    conversation_id TEXT,
    phone TEXT,

    -- Performance
    search_time_ms INTEGER,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_chunks_type ON knowledge_chunks(content_type);
CREATE INDEX IF NOT EXISTS idx_chunks_source ON knowledge_chunks(source);
CREATE INDEX IF NOT EXISTS idx_chunks_conversation ON knowledge_chunks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chunks_phone ON knowledge_chunks(phone);
CREATE INDEX IF NOT EXISTS idx_chunks_created ON knowledge_chunks(created_at);

CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_summaries_phone ON conversation_summaries(phone);
CREATE INDEX IF NOT EXISTS idx_summaries_updated ON conversation_summaries(updated_at);

CREATE INDEX IF NOT EXISTS idx_rag_queries_conversation ON rag_queries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created ON rag_queries(created_at);
