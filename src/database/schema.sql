-- Schema do Vendedor Digital Inteligente
-- Banco: SQLite (leve e portátil)

-- Tabela principal de leads/conversas
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT,

    -- Estado da conversa
    stage TEXT DEFAULT 'GREETING',
    engagement_level TEXT DEFAULT 'cold', -- cold, warm, hot
    qualification_score INTEGER DEFAULT 0,

    -- Dados comportamentais
    typical_response_hours TEXT, -- JSON array de horários que costuma responder
    avg_response_time_minutes INTEGER,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,

    -- Preferências de mídia
    has_sent_audio INTEGER DEFAULT 0, -- Se o lead já mandou áudio
    prefers_audio INTEGER DEFAULT 0, -- Se prefere comunicação por áudio
    last_media_type TEXT, -- 'audio', 'image', 'text'

    -- Follow-up
    follow_up_count INTEGER DEFAULT 0,
    last_follow_up_at TEXT,
    next_follow_up_at TEXT,
    abandon_reason TEXT, -- busy, objection, lost_interest, price, timing

    -- Dor e objeções identificadas
    extracted_pain TEXT,
    extracted_needs TEXT, -- JSON array
    extracted_objections TEXT, -- JSON array

    -- Timestamps
    first_contact_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT,
    last_message_from TEXT, -- 'user' ou 'assistant'

    -- Status
    is_active INTEGER DEFAULT 1,
    opted_out INTEGER DEFAULT 0,
    converted INTEGER DEFAULT 0
);

-- Histórico de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,

    -- Análise comportamental
    sentiment TEXT, -- positive, neutral, negative
    intent TEXT, -- greeting, question, objection, buying_signal, farewell
    response_time_seconds INTEGER, -- quanto tempo demorou pra responder

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Padrões de resposta do usuário (para timing inteligente)
CREATE TABLE IF NOT EXISTS response_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    day_of_week INTEGER, -- 0=domingo, 6=sábado
    hour_of_day INTEGER, -- 0-23
    response_count INTEGER DEFAULT 1,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    UNIQUE(conversation_id, day_of_week, hour_of_day)
);

-- Follow-ups enviados (histórico)
CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    follow_up_number INTEGER NOT NULL,
    strategy TEXT NOT NULL, -- curiosity, reciprocity, fomo, scarcity, value
    message TEXT NOT NULL,

    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    response_received INTEGER DEFAULT 0,
    response_time_minutes INTEGER,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Rastreamento de interações de mídia
CREATE TABLE IF NOT EXISTS media_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'audio_received', 'audio_sent', 'image_received', 'reaction_sent'
    duration_seconds INTEGER, -- Para áudios
    transcription TEXT, -- Transcrição do áudio
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_next_followup ON conversations(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_patterns_conversation ON response_patterns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_media_conversation ON media_interactions(conversation_id);
