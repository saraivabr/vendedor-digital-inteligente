# CRM Database Schema - Vendedor Digital Inteligente

## Overview
Complete CRM database schema with 13 tables, 13 indexes, and comprehensive seed data.

## Files Created

### Migration Files
- **Location**: /Users/saraiva/vendedordigitalinteligente/src/database/migrations/
- **File**: 001_add_crm.sql (214 lines)
  - 13 tables with complete definitions
  - 13 optimized indexes
  - Foreign key relationships
  - Default values and constraints

### Seed Files
- **Location**: /Users/saraiva/vendedordigitalinteligente/src/database/seeds/
- **File**: pipeline_stages.sql (62 lines)
  - 6 default pipeline stages
  - 24 permission records (admin, manager, agent roles)
  - 7 default tags

## Database Tables

### 1. contacts
Extended contact management with company info and custom fields.
- **Fields**: id, phone, name, email, company_name, company_size, industry, position, city, state, timezone, source, tags, custom_fields, avatar_url, notes
- **Indexes**: phone, email, created_at

### 2. deals
Sales opportunities with pipeline tracking.
- **Fields**: id, contact_id, title, stage, value, currency, probability, expected_close_date, actual_close_date, lost_reason, won_reason, assigned_to, pipeline, priority, tags, custom_fields
- **Indexes**: contact_id, stage, expected_close_date
- **Foreign Key**: contact_id -> contacts(id)

### 3. activities
Activity tracking for contacts and deals.
- **Fields**: id, contact_id, deal_id, type, title, description, metadata, is_completed, due_date, completed_at, created_by
- **Indexes**: contact_id, deal_id, type, created_at
- **Foreign Keys**: contact_id, deal_id

### 4. tasks
Task management with reminders.
- **Fields**: id, contact_id, deal_id, title, description, type, priority, status, due_date, due_time, reminder_at, completed_at, assigned_to
- **Indexes**: due_date, status
- **Foreign Keys**: contact_id, deal_id

### 5. notes
Notes for contacts and deals with pinning.
- **Fields**: id, contact_id, deal_id, content, is_pinned, created_by, created_at, updated_at
- **Foreign Keys**: contact_id, deal_id

### 6. pipeline_stages
Customizable pipeline stages.
- **Fields**: id, pipeline, name, order_index, color, probability, is_won, is_lost
- **Default Stages**: Lead (10%), Qualificado (25%), Proposta (50%), Negociação (75%), Ganho (100%), Perdido (0%)

### 7. tags
Flexible tagging system.
- **Fields**: id, name, color, category
- **Default Tags**: Hot, Warm, Cold, VIP, Prioridade, Follow-up, Urgente

### 8. users
User management with roles.
- **Fields**: id, email, password_hash, name, role, avatar_url, is_active, last_login_at
- **Roles**: admin, manager, agent

### 9. sessions
User session management.
- **Fields**: id, user_id, token, expires_at
- **Foreign Key**: user_id -> users(id)

### 10. permissions
Role-based access control.
- **Fields**: id, role, resource, action
- **Unique**: (role, resource, action)
- **Resources**: contacts, deals, tasks, reports, settings, users
- **Actions**: read, write, delete

### 11. webhooks
Webhook integration.
- **Fields**: id, url, events, secret, is_active, last_triggered_at, failure_count

### 12. webhook_logs
Webhook execution history.
- **Fields**: id, webhook_id, event, payload, response_status, response_body, error
- **Foreign Key**: webhook_id -> webhooks(id)

### 13. daily_metrics
Daily performance metrics.
- **Fields**: id, date, new_contacts, new_deals, deals_won, deals_lost, revenue_won, messages_sent, messages_received, followups_sent, response_rate, avg_response_time
- **Index**: date
- **Unique**: date

## Indexes Summary

Performance-optimized indexes for common queries:

1. idx_contacts_phone - Fast phone lookup
2. idx_contacts_email - Fast email lookup
3. idx_contacts_created - Time-based queries
4. idx_deals_contact - Contact-to-deals lookup
5. idx_deals_stage - Pipeline filtering
6. idx_deals_close_date - Close date queries
7. idx_activities_contact - Contact activity history
8. idx_activities_deal - Deal activity history
9. idx_activities_type - Activity type filtering
10. idx_activities_created - Time-based queries
11. idx_tasks_due - Due date queries
12. idx_tasks_status - Status filtering
13. idx_daily_metrics_date - Date-based metrics

## Seed Data

### Pipeline Stages (6 records)
- Lead (10% probability)
- Qualificado (25%)
- Proposta (50%)
- Negociação (75%)
- Ganho (100%, is_won)
- Perdido (0%, is_lost)

### Permissions (24 records)
- **Admin**: Full access to all resources
- **Manager**: Read/write contacts, deals, tasks, reports; read settings
- **Agent**: Read/write contacts, deals, tasks

### Tags (7 records)
- Contact tags: Hot, Warm, Cold, VIP
- Deal tags: Prioridade, Follow-up
- Task tags: Urgente

## Usage

### Run Migration
Execute the migration SQL file against your SQLite database to create all tables and indexes.

### Load Seed Data
Execute the seed SQL file to populate default pipeline stages, permissions, and tags.

## Schema Validation

All tables created with:
- Primary keys (TEXT format for UUID compatibility)
- Foreign key constraints
- Default values
- Appropriate indexes
- Unique constraints where needed

## Next Steps

1. Create database initialization script
2. Add TypeScript types for schema
3. Create repository classes for each table
4. Add data validation layer
5. Implement migration runner

---
Generated: 2025-12-29
