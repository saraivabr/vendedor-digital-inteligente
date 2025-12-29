# CRM Modules - Vendedor Digital Inteligente

Complete CRM functionality for the Intelligent Digital Seller project.

## Overview

The CRM system provides comprehensive customer relationship management features including:

- **Pipeline Management** - Customizable sales pipeline stages
- **Metrics & Analytics** - Business intelligence and forecasting
- **Tag Management** - Organize and categorize data
- **Contact Management** - Full contact database
- **Deal Tracking** - Sales opportunity management
- **Activity Timeline** - Track all interactions
- **Task Management** - Actionable reminders and follow-ups
- **User Management** - Role-based access control

## Module Structure

```
src/crm/
├── pipeline.js      # Pipeline stages and configuration
├── metrics.js       # Analytics, metrics, and forecasting
├── tags.js          # Tag creation and management
├── contacts.js      # Contact database management
├── deals.js         # Sales opportunity tracking
├── activities.js    # Activity timeline and logging
├── tasks.js         # Task and reminder management
└── users.js         # User authentication and permissions
```

## Quick Start

### 1. Pipeline Management

```javascript
import pipeline from './src/crm/pipeline.js';

// Get all pipeline stages
const stages = pipeline.getStages('default');

// Create new pipeline
const customPipeline = pipeline.createPipeline('sales-pipeline', [
    { name: 'Prospect', probability: 20, color: '#64748b' },
    { name: 'Qualified', probability: 40, color: '#3b82f6' },
    { name: 'Proposal', probability: 60, color: '#8b5cf6' },
    { name: 'Closed', probability: 100, color: '#10b981', is_won: true }
]);

// Get pipeline summary with deal counts
const summary = pipeline.getPipelineSummary('default');
```

### 2. Metrics & Analytics

```javascript
import metrics from './src/crm/metrics.js';

// Get dashboard overview
const dashboard = metrics.getDashboard();
console.log(`Active Deals: ${dashboard.active_deals}`);
console.log(`Pipeline Value: R$ ${dashboard.pipeline_value}`);
console.log(`Conversion Rate: ${dashboard.conversion_rate}%`);

// Get sales funnel
const funnel = metrics.getFunnel('default');

// Revenue forecast
const forecast = metrics.getRevenueForecast('default');
console.log(`Weighted Revenue: R$ ${forecast.totals.weighted_value}`);

// Update daily metrics
const dailyMetrics = metrics.updateDailyMetrics();
```

### 3. Tag Management

```javascript
import tags from './src/crm/tags.js';

// Create tags
const hotTag = tags.create({
    name: 'Hot',
    color: '#EF4444',
    category: 'contact'
});

// Get or create tag
const vipTag = tags.getOrCreate('VIP', 'contact');

// List all tags
const allTags = tags.list();

// Get usage statistics
const stats = tags.getUsageStats();

// Suggest tags from content
const suggestions = tags.suggestTags('Cliente urgente e quente');
```

## Database Schema

The CRM uses SQLite with the following main tables:

- **contacts** - Contact information with company details
- **deals** - Sales opportunities linked to contacts
- **pipeline_stages** - Configurable pipeline stages
- **activities** - Timeline of all interactions
- **tasks** - Actionable items and reminders
- **tags** - Tags for categorization
- **daily_metrics** - Daily performance metrics
- **users** - User accounts with role-based access
- **permissions** - Access control rules

## Features

### Pipeline Management

- Create custom pipelines for different sales processes
- Configure stage probabilities and colors
- Reorder stages with drag-and-drop support
- Track deal counts and values per stage
- Prevent deletion of stages with active deals

### Metrics & Analytics

- Real-time dashboard with key metrics
- Sales funnel visualization
- Revenue forecasting with weighted values
- Activity metrics and trends
- Daily metrics tracking
- Performance by user
- Lost reasons analysis
- Average deal cycle time
- Data export to CSV

### Tag Management

- Create colored tags for organization
- Tag usage statistics
- Auto-suggest tags based on content
- Category-based filtering
- Tag contacts, deals, activities, and tasks

## Testing

Two test files are provided:

```bash
# Basic CRM module test
node test-crm.js

# Comprehensive test with sample data
node test-crm-comprehensive.js
```

## API Examples

### Creating Contacts

```javascript
import contacts from './src/crm/contacts.js';

const contact = contacts.create({
    phone: '+5511999998888',
    name: 'João Silva',
    email: 'joao@example.com',
    company_name: 'TechCorp',
    position: 'CEO',
    tags: ['Hot', 'VIP']
});
```

### Creating Deals

```javascript
import deals from './src/crm/deals.js';

const deal = deals.create({
    contact_id: contact.id,
    title: 'Enterprise Plan',
    value: 5000,
    stage: 'proposal',
    expected_close_date: '2025-01-15'
});
```

### Logging Activities

```javascript
import activities from './src/crm/activities.js';

activities.log({
    contact_id: contact.id,
    deal_id: deal.id,
    type: 'call',
    title: 'Presentation call',
    description: 'Presented product and identified interest'
});
```

### Creating Tasks

```javascript
import tasks from './src/crm/tasks.js';

const task = tasks.create({
    contact_id: contact.id,
    deal_id: deal.id,
    title: 'Send proposal',
    priority: 'high',
    due_date: '2025-01-05'
});
```

## Integration

The CRM modules integrate seamlessly with the WhatsApp automation:

1. **Auto-create contacts** from WhatsApp conversations
2. **Log messages** as activities in the timeline
3. **Create follow-up tasks** based on conversation flow
4. **Update deal stages** based on customer responses
5. **Track metrics** for messaging performance

## Performance

- Indexed queries for fast lookups
- Pagination support for large datasets
- Transaction support for batch operations
- WAL mode for better concurrency

## Security

- Role-based access control (Admin, Manager, Agent)
- JWT token authentication
- Session management
- Permission-based resource access

## Next Steps

1. Integrate with WhatsApp webhook
2. Add real-time notifications
3. Build web dashboard UI
4. Add email integration
5. Implement automation rules
6. Add reporting templates

## License

MIT
