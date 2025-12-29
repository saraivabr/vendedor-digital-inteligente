/**
 * CRM Example - Demonstrates contacts and deals management
 */

import contacts from '../src/crm/contacts.js';
import deals from '../src/crm/deals.js';

console.log('=== CRM Example ===\n');

// 1. Create a contact
console.log('1. Creating contact...');
const contact = contacts.create({
    phone: '+5511987654321',
    name: 'João Silva',
    email: 'joao@example.com',
    company_name: 'Tech Corp',
    position: 'CEO',
    tags: ['hot-lead', 'enterprise'],
    custom_fields: {
        budget: 100000,
        employees: 50
    }
});
console.log('Contact created:', contact.id, '-', contact.name);

// 2. Create a deal for the contact
console.log('\n2. Creating deal...');
const deal = deals.create({
    contact_id: contact.id,
    title: 'Enterprise Plan - Q1 2025',
    value: 50000,
    stage: 'lead',
    priority: 'high'
});
console.log('Deal created:', deal.id, '-', deal.title);

// 3. Move deal through pipeline
console.log('\n3. Moving deal through pipeline...');
deals.moveToStage(deal.id, 'qualified');
console.log('  - Moved to qualified');

deals.moveToStage(deal.id, 'proposal');
console.log('  - Moved to proposal');

deals.moveToStage(deal.id, 'negotiation');
console.log('  - Moved to negotiation');

// 4. Win the deal
console.log('\n4. Winning deal...');
deals.markAsWon(deal.id, 'Customer signed contract');
console.log('  - Deal won!');

// 5. Get contact timeline
console.log('\n5. Contact timeline:');
const timeline = contacts.getTimeline(contact.id);
timeline.forEach(activity => {
    console.log(`  - [${activity.type}] ${activity.title}`);
});

// 6. Get pipeline stats
console.log('\n6. Pipeline statistics:');
const stats = deals.getPipelineStats('default');
console.log('  - Total deals:', stats.totals.total_deals);
console.log('  - Won deals:', stats.totals.won_count);
console.log('  - Won revenue: R$', stats.totals.won_value);

// 7. Get contact stats
console.log('\n7. Contact statistics:');
const contactStats = contacts.getStats();
console.log('  - Total contacts:', contactStats.total);
console.log('  - Sources:', contactStats.bySource.map(s => `${s.source}(${s.count})`).join(', '));

console.log('\n=== Example completed successfully! ===');
