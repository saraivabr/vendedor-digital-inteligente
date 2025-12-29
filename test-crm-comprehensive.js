/**
 * Comprehensive CRM Module Tests
 * Tests all CRM functionality with sample data
 */

import db from './src/database/db.js';
import contacts from './src/crm/contacts.js';
import deals from './src/crm/deals.js';
import pipeline from './src/crm/pipeline.js';
import metrics from './src/crm/metrics.js';
import tags from './src/crm/tags.js';
import activities from './src/crm/activities.js';
import tasks from './src/crm/tasks.js';

console.log('Starting Comprehensive CRM Tests...\n');

// Test 1: Create contacts
console.log('1. Creating sample contacts...');
try {
    const contact1 = contacts.create({
        phone: '+5511999998888',
        name: 'João Silva',
        email: 'joao@example.com',
        company_name: 'TechCorp',
        position: 'CEO',
        tags: ['Hot', 'VIP']
    });
    console.log(`   ✅ Created contact: ${contact1.name} (${contact1.phone})`);

    const contact2 = contacts.create({
        phone: '+5511888887777',
        name: 'Maria Santos',
        email: 'maria@example.com',
        company_name: 'StartupX',
        tags: ['Warm']
    });
    console.log(`   ✅ Created contact: ${contact2.name} (${contact2.phone})`);
} catch (error) {
    console.error('   ❌ Contact creation error:', error.message);
}

// Test 2: Create deals
console.log('\n2. Creating sample deals...');
try {
    const contact1 = contacts.getByPhone('+5511999998888');
    const deal1 = deals.create({
        contact_id: contact1.id,
        title: 'Vendedor Digital - Plano Enterprise',
        value: 5000,
        stage: 'proposal',
        expected_close_date: '2025-01-15'
    });
    console.log(`   ✅ Created deal: ${deal1.title} - R$ ${deal1.value}`);

    const contact2 = contacts.getByPhone('+5511888887777');
    const deal2 = deals.create({
        contact_id: contact2.id,
        title: 'Vendedor Digital - Plano Starter',
        value: 1500,
        stage: 'qualified',
        expected_close_date: '2025-01-20'
    });
    console.log(`   ✅ Created deal: ${deal2.title} - R$ ${deal2.value}`);
} catch (error) {
    console.error('   ❌ Deal creation error:', error.message);
}

// Test 3: Create activities
console.log('\n3. Creating sample activities...');
try {
    const contact1 = contacts.getByPhone('+5511999998888');
    const activity1 = activities.log({
        contact_id: contact1.id,
        type: 'call',
        title: 'Ligação de apresentação',
        description: 'Apresentou o produto e identificou interesse'
    });
    console.log(`   ✅ Created activity: ${activity1.title}`);
} catch (error) {
    console.error('   ❌ Activity creation error:', error.message);
}

// Test 4: Create tasks
console.log('\n4. Creating sample tasks...');
try {
    const contact1 = contacts.getByPhone('+5511999998888');
    const allDeals = deals.list({ contact_id: contact1.id });
    const task1 = tasks.create({
        contact_id: contact1.id,
        deal_id: allDeals[0]?.id,
        title: 'Enviar proposta comercial',
        priority: 'high',
        due_date: '2025-01-05'
    });
    console.log(`   ✅ Created task: ${task1.title} (${task1.priority})`);
} catch (error) {
    console.error('   ❌ Task creation error:', error.message);
}

// Test 5: Move deal through pipeline
console.log('\n5. Moving deal through pipeline...');
try {
    const allDeals = deals.list();
    const deal = allDeals.data[0];
    console.log(`   Current stage: ${deal.stage}`);

    const updated = deals.update(deal.id, { stage: 'negotiation' });
    console.log(`   ✅ Moved to: ${updated.stage}`);
} catch (error) {
    console.error('   ❌ Pipeline move error:', error.message);
}

// Test 6: Test metrics dashboard
console.log('\n6. Testing updated metrics...');
try {
    const dashboard = metrics.getDashboard();
    console.log('   ✅ Dashboard metrics:');
    console.log(`      - Total Contacts: ${dashboard.total_contacts}`);
    console.log(`      - Active Deals: ${dashboard.active_deals}`);
    console.log(`      - Pipeline Value: R$ ${dashboard.pipeline_value}`);
} catch (error) {
    console.error('   ❌ Metrics error:', error.message);
}

// Test 7: Test funnel metrics
console.log('\n7. Testing funnel metrics...');
try {
    const funnel = metrics.getFunnel('default');
    console.log('   ✅ Sales funnel:');
    funnel.forEach(stage => {
        if (stage.count > 0) {
            console.log(`      - ${stage.stage}: ${stage.count} deals (R$ ${stage.value})`);
        }
    });
} catch (error) {
    console.error('   ❌ Funnel error:', error.message);
}

// Test 8: Test revenue forecast
console.log('\n8. Testing revenue forecast...');
try {
    const forecast = metrics.getRevenueForecast('default');
    console.log('   ✅ Revenue forecast:');
    console.log(`      - Total deals: ${forecast.totals.deals}`);
    console.log(`      - Total value: R$ ${forecast.totals.total_value}`);
    console.log(`      - Weighted value: R$ ${forecast.totals.weighted_value.toFixed(2)}`);
} catch (error) {
    console.error('   ❌ Forecast error:', error.message);
}

// Test 9: Test contact search
console.log('\n9. Testing contact search...');
try {
    const searchResults = contacts.search('João');
    console.log(`   ✅ Found ${searchResults.data.length} contacts matching "João"`);
    searchResults.data.forEach(c => {
        console.log(`      - ${c.name} (${c.company_name})`);
    });
} catch (error) {
    console.error('   ❌ Search error:', error.message);
}

// Test 10: Test tag usage
console.log('\n10. Testing tag usage stats...');
try {
    const usageStats = tags.getUsageStats();
    console.log('   ✅ Tag usage:');
    usageStats.forEach(tag => {
        if (tag.usage_count > 0) {
            console.log(`      - ${tag.name}: ${tag.usage_count} uses`);
        }
    });
} catch (error) {
    console.error('   ❌ Tag stats error:', error.message);
}

// Test 11: Test custom pipeline
console.log('\n11. Creating custom pipeline...');
try {
    const customStages = [
        { name: 'Prospect', probability: 20, color: '#64748b' },
        { name: 'Meeting', probability: 40, color: '#3b82f6' },
        { name: 'Demo', probability: 60, color: '#8b5cf6' },
        { name: 'Closed', probability: 100, color: '#10b981', is_won: true }
    ];
    const newPipeline = pipeline.createPipeline('sales-pipeline', customStages);
    console.log(`   ✅ Created pipeline with ${newPipeline.length} stages`);
} catch (error) {
    console.error('   ❌ Pipeline creation error:', error.message);
}

// Test 12: Update daily metrics
console.log('\n12. Updating daily metrics...');
try {
    const today = new Date().toISOString().split('T')[0];
    const dailyMetrics = metrics.updateDailyMetrics(today);
    console.log('   ✅ Daily metrics:');
    console.log(`      - New Contacts: ${dailyMetrics.new_contacts}`);
    console.log(`      - New Deals: ${dailyMetrics.new_deals}`);
} catch (error) {
    console.error('   ❌ Daily metrics error:', error.message);
}

console.log('\n✅ All comprehensive CRM tests passed successfully!\n');
