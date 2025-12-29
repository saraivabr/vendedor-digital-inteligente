-- ===== SEED DATA FOR VENDEDOR DIGITAL INTELIGENTE CRM =====
-- Seed File: pipeline_stages.sql
-- Description: Default pipeline stages, permissions, and tags
-- Created: 2025-12-29

-- ===== DEFAULT PIPELINE STAGES =====
INSERT OR IGNORE INTO pipeline_stages (id, pipeline, name, order_index, color, probability, is_won, is_lost) VALUES
    ('stage_lead', 'default', 'Lead', 1, '#94A3B8', 10, 0, 0),
    ('stage_qualified', 'default', 'Qualificado', 2, '#3B82F6', 25, 0, 0),
    ('stage_proposal', 'default', 'Proposta', 3, '#8B5CF6', 50, 0, 0),
    ('stage_negotiation', 'default', 'Negociação', 4, '#F59E0B', 75, 0, 0),
    ('stage_won', 'default', 'Ganho', 5, '#10B981', 100, 1, 0),
    ('stage_lost', 'default', 'Perdido', 6, '#EF4444', 0, 0, 1);

-- ===== DEFAULT PERMISSIONS =====
-- Admin has full access
INSERT OR IGNORE INTO permissions (id, role, resource, action) VALUES
    ('perm_admin_contacts_read', 'admin', 'contacts', 'read'),
    ('perm_admin_contacts_write', 'admin', 'contacts', 'write'),
    ('perm_admin_contacts_delete', 'admin', 'contacts', 'delete'),
    ('perm_admin_deals_read', 'admin', 'deals', 'read'),
    ('perm_admin_deals_write', 'admin', 'deals', 'write'),
    ('perm_admin_deals_delete', 'admin', 'deals', 'delete'),
    ('perm_admin_tasks_read', 'admin', 'tasks', 'read'),
    ('perm_admin_tasks_write', 'admin', 'tasks', 'write'),
    ('perm_admin_tasks_delete', 'admin', 'tasks', 'delete'),
    ('perm_admin_reports_read', 'admin', 'reports', 'read'),
    ('perm_admin_settings_read', 'admin', 'settings', 'read'),
    ('perm_admin_settings_write', 'admin', 'settings', 'write'),
    ('perm_admin_users_read', 'admin', 'users', 'read'),
    ('perm_admin_users_write', 'admin', 'users', 'write'),
    ('perm_admin_users_delete', 'admin', 'users', 'delete');

-- Manager has most access except user management
INSERT OR IGNORE INTO permissions (id, role, resource, action) VALUES
    ('perm_manager_contacts_read', 'manager', 'contacts', 'read'),
    ('perm_manager_contacts_write', 'manager', 'contacts', 'write'),
    ('perm_manager_deals_read', 'manager', 'deals', 'read'),
    ('perm_manager_deals_write', 'manager', 'deals', 'write'),
    ('perm_manager_tasks_read', 'manager', 'tasks', 'read'),
    ('perm_manager_tasks_write', 'manager', 'tasks', 'write'),
    ('perm_manager_reports_read', 'manager', 'reports', 'read'),
    ('perm_manager_settings_read', 'manager', 'settings', 'read');

-- Agent has basic access
INSERT OR IGNORE INTO permissions (id, role, resource, action) VALUES
    ('perm_agent_contacts_read', 'agent', 'contacts', 'read'),
    ('perm_agent_contacts_write', 'agent', 'contacts', 'write'),
    ('perm_agent_deals_read', 'agent', 'deals', 'read'),
    ('perm_agent_deals_write', 'agent', 'deals', 'write'),
    ('perm_agent_tasks_read', 'agent', 'tasks', 'read'),
    ('perm_agent_tasks_write', 'agent', 'tasks', 'write');

-- ===== DEFAULT TAGS =====
INSERT OR IGNORE INTO tags (id, name, color, category) VALUES
    ('tag_hot', 'Hot', '#EF4444', 'contact'),
    ('tag_warm', 'Warm', '#F59E0B', 'contact'),
    ('tag_cold', 'Cold', '#3B82F6', 'contact'),
    ('tag_vip', 'VIP', '#8B5CF6', 'contact'),
    ('tag_priority', 'Prioridade', '#EC4899', 'deal'),
    ('tag_followup', 'Follow-up', '#10B981', 'deal'),
    ('tag_urgent', 'Urgente', '#EF4444', 'task');
