-- Migration 002: CRM Tables
-- Adds contacts, deals, pipeline stages, activities, metrics tables
-- Also adds user management, authentication, and permissions

-- ==================== CONTACTS TABLE ====================
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,

    -- Company info
    company_name TEXT,
    company_size TEXT,
    industry TEXT,
    position TEXT,

    -- Location
    city TEXT,
    state TEXT,
    timezone TEXT DEFAULT 'America/Sao_Paulo',

    -- Metadata
    source TEXT DEFAULT 'whatsapp',
    tags TEXT DEFAULT '[]', -- JSON array
    custom_fields TEXT DEFAULT '{}', -- JSON object
    avatar_url TEXT,
    notes TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==================== DEALS TABLE ====================
CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    title TEXT NOT NULL,

    -- Pipeline & Stage
    stage TEXT DEFAULT 'lead',
    pipeline TEXT DEFAULT 'default',

    -- Value
    value REAL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    probability INTEGER DEFAULT 50,

    -- Dates
    expected_close_date TEXT,
    actual_close_date TEXT,

    -- Close reasons
    lost_reason TEXT,
    won_reason TEXT,

    -- Assignment & Priority
    assigned_to TEXT,
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent

    -- Metadata
    tags TEXT DEFAULT '[]', -- JSON array
    custom_fields TEXT DEFAULT '{}', -- JSON object

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- ==================== PIPELINE STAGES ====================
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    pipeline TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    probability INTEGER DEFAULT 50,
    color TEXT DEFAULT '#3B82F6',
    is_won INTEGER DEFAULT 0,
    is_lost INTEGER DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(pipeline, name)
);

-- ==================== ACTIVITIES TABLE ====================
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    deal_id TEXT,

    type TEXT NOT NULL, -- call, email, meeting, note, deal_created, stage_change, deal_won, deal_lost
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT DEFAULT '{}', -- JSON object

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- ==================== DAILY METRICS ====================
CREATE TABLE IF NOT EXISTS daily_metrics (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,

    -- Contact metrics
    new_contacts INTEGER DEFAULT 0,

    -- Deal metrics
    new_deals INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    revenue_won REAL DEFAULT 0,

    -- Activity metrics
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    followups_sent INTEGER DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TAGS ====================
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    category TEXT DEFAULT 'contact',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    contact_id TEXT,
    deal_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'task',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date TEXT,
    due_time TEXT,
    reminder_at TEXT,
    completed_at TEXT,
    assigned_to TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- ==================== DEFAULT PIPELINE STAGES ====================
INSERT OR IGNORE INTO pipeline_stages (id, pipeline, name, order_index, probability, color, is_won, is_lost) VALUES
    ('stage_lead', 'default', 'lead', 1, 10, '#94A3B8', 0, 0),
    ('stage_qualified', 'default', 'qualified', 2, 30, '#3B82F6', 0, 0),
    ('stage_proposal', 'default', 'proposal', 3, 50, '#8B5CF6', 0, 0),
    ('stage_negotiation', 'default', 'negotiation', 4, 70, '#F59E0B', 0, 0),
    ('stage_won', 'default', 'won', 5, 100, '#10B981', 1, 0),
    ('stage_lost', 'default', 'lost', 6, 0, '#EF4444', 0, 1);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);

CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at);

CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON daily_metrics(date);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

-- ==================== USER MANAGEMENT ====================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent', -- 'admin', 'manager', 'agent'
    avatar_url TEXT,

    is_active INTEGER DEFAULT 1,
    last_login_at TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (JWT token management)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Permissions table (role-based access control)
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    resource TEXT NOT NULL, -- 'contacts', 'deals', 'tasks', 'reports', 'settings', 'users'
    action TEXT NOT NULL, -- 'read', 'write', 'delete', 'assign'

    UNIQUE(role, resource, action)
);

-- Notes table (for contacts and deals)
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,

    contact_id TEXT,
    deal_id TEXT,

    is_pinned INTEGER DEFAULT 0,

    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ==================== USER MANAGEMENT INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_deal ON notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);

-- ==================== DEFAULT PERMISSIONS ====================
-- Insert default permissions for roles
INSERT OR IGNORE INTO permissions (id, role, resource, action) VALUES
-- Admin: full access
('perm_admin_contacts_read', 'admin', 'contacts', 'read'),
('perm_admin_contacts_write', 'admin', 'contacts', 'write'),
('perm_admin_contacts_delete', 'admin', 'contacts', 'delete'),
('perm_admin_contacts_assign', 'admin', 'contacts', 'assign'),

('perm_admin_deals_read', 'admin', 'deals', 'read'),
('perm_admin_deals_write', 'admin', 'deals', 'write'),
('perm_admin_deals_delete', 'admin', 'deals', 'delete'),
('perm_admin_deals_assign', 'admin', 'deals', 'assign'),

('perm_admin_tasks_read', 'admin', 'tasks', 'read'),
('perm_admin_tasks_write', 'admin', 'tasks', 'write'),
('perm_admin_tasks_delete', 'admin', 'tasks', 'delete'),
('perm_admin_tasks_assign', 'admin', 'tasks', 'assign'),

('perm_admin_reports_read', 'admin', 'reports', 'read'),

('perm_admin_settings_read', 'admin', 'settings', 'read'),
('perm_admin_settings_write', 'admin', 'settings', 'write'),

('perm_admin_users_read', 'admin', 'users', 'read'),
('perm_admin_users_write', 'admin', 'users', 'write'),
('perm_admin_users_delete', 'admin', 'users', 'delete'),

-- Manager: can read everything, write most things
('perm_manager_contacts_read', 'manager', 'contacts', 'read'),
('perm_manager_contacts_write', 'manager', 'contacts', 'write'),
('perm_manager_contacts_assign', 'manager', 'contacts', 'assign'),

('perm_manager_deals_read', 'manager', 'deals', 'read'),
('perm_manager_deals_write', 'manager', 'deals', 'write'),
('perm_manager_deals_assign', 'manager', 'deals', 'assign'),

('perm_manager_tasks_read', 'manager', 'tasks', 'read'),
('perm_manager_tasks_write', 'manager', 'tasks', 'write'),
('perm_manager_tasks_assign', 'manager', 'tasks', 'assign'),

('perm_manager_reports_read', 'manager', 'reports', 'read'),

('perm_manager_settings_read', 'manager', 'settings', 'read'),

('perm_manager_users_read', 'manager', 'users', 'read'),

-- Agent: can read assigned items, write their own
('perm_agent_contacts_read', 'agent', 'contacts', 'read'),
('perm_agent_contacts_write', 'agent', 'contacts', 'write'),

('perm_agent_deals_read', 'agent', 'deals', 'read'),
('perm_agent_deals_write', 'agent', 'deals', 'write'),

('perm_agent_tasks_read', 'agent', 'tasks', 'read'),
('perm_agent_tasks_write', 'agent', 'tasks', 'write');
