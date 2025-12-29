/**
 * Test CRM Modules
 * Simple test to verify pipeline, metrics, and tags modules work correctly
 */

import db from './src/database/db.js';
import pipeline from './src/crm/pipeline.js';
import metrics from './src/crm/metrics.js';
import tags from './src/crm/tags.js';

console.log('Starting CRM Module Tests...\n');

// Test 1: Apply CRM migration
console.log('1. Applying CRM migration...');
try {
    const migration = db.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('pipeline_stages', 'tags', 'daily_metrics')
    `).all();

    if (migration.length < 3) {
        console.log('   Running migration...');
        const { readFileSync } = await import('fs');
        const { fileURLToPath } = await import('url');
        const { dirname, join } = await import('path');
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const migrationSQL = readFileSync(join(__dirname, 'src/database/migrations/001_add_crm.sql'), 'utf-8');
        db.db.exec(migrationSQL);
        console.log('   ✅ Migration applied successfully');
    } else {
        console.log('   ✅ Tables already exist');
    }
} catch (error) {
    console.error('   ❌ Migration error:', error.message);
    process.exit(1);
}

// Test 2: Create default pipeline
console.log('\n2. Creating default pipeline...');
try {
    const existingStages = pipeline.getStages('default');
    if (existingStages.length === 0) {
        const stages = pipeline.createPipeline('default');
        console.log(`   ✅ Created ${stages.length} pipeline stages`);
        stages.forEach(stage => {
            console.log(`      - ${stage.name} (${stage.probability}%)`);
        });
    } else {
        console.log(`   ✅ Pipeline already exists with ${existingStages.length} stages`);
    }
} catch (error) {
    console.error('   ❌ Pipeline error:', error.message);
    process.exit(1);
}

// Test 3: Create sample tags
console.log('\n3. Creating sample tags...');
try {
    const sampleTags = [
        { name: 'Hot', category: 'contact', color: '#EF4444' },
        { name: 'VIP', category: 'contact', color: '#8B5CF6' },
        { name: 'Urgente', category: 'deal', color: '#F59E0B' }
    ];

    for (const tagData of sampleTags) {
        const existing = tags.getByName(tagData.name);
        if (!existing) {
            tags.create(tagData);
            console.log(`   ✅ Created tag: ${tagData.name}`);
        } else {
            console.log(`   ✅ Tag already exists: ${tagData.name}`);
        }
    }

    const allTags = tags.list();
    console.log(`   Total tags: ${allTags.length}`);
} catch (error) {
    console.error('   ❌ Tags error:', error.message);
    process.exit(1);
}

// Test 4: Test metrics dashboard
console.log('\n4. Testing metrics dashboard...');
try {
    const dashboard = metrics.getDashboard();
    console.log('   ✅ Dashboard metrics:');
    console.log(`      - Total Contacts: ${dashboard.total_contacts}`);
    console.log(`      - Active Deals: ${dashboard.active_deals}`);
    console.log(`      - Pipeline Value: R$ ${dashboard.pipeline_value}`);
    console.log(`      - Conversion Rate: ${dashboard.conversion_rate.toFixed(2)}%`);
} catch (error) {
    console.error('   ❌ Metrics error:', error.message);
    process.exit(1);
}

// Test 5: Test pipeline summary
console.log('\n5. Testing pipeline summary...');
try {
    const summary = pipeline.getPipelineSummary('default');
    console.log('   ✅ Pipeline summary:');
    summary.forEach(stage => {
        console.log(`      - ${stage.name}: ${stage.deal_count} deals (R$ ${stage.total_value})`);
    });
} catch (error) {
    console.error('   ❌ Pipeline summary error:', error.message);
    process.exit(1);
}

// Test 6: Test tag usage stats
console.log('\n6. Testing tag usage statistics...');
try {
    const usageStats = tags.getUsageStats();
    console.log('   ✅ Tag usage stats:');
    usageStats.slice(0, 5).forEach(tag => {
        console.log(`      - ${tag.name}: ${tag.usage_count} uses`);
    });
} catch (error) {
    console.error('   ❌ Tag stats error:', error.message);
    process.exit(1);
}

// Test 7: Test daily metrics update
console.log('\n7. Testing daily metrics update...');
try {
    const today = new Date().toISOString().split('T')[0];
    const dailyMetrics = metrics.updateDailyMetrics(today);
    console.log('   ✅ Daily metrics updated:');
    console.log(`      - Date: ${dailyMetrics.date}`);
    console.log(`      - New Contacts: ${dailyMetrics.new_contacts}`);
    console.log(`      - New Deals: ${dailyMetrics.new_deals}`);
    console.log(`      - Deals Won: ${dailyMetrics.deals_won}`);
} catch (error) {
    console.error('   ❌ Daily metrics error:', error.message);
    process.exit(1);
}

console.log('\n✅ All CRM module tests passed successfully!\n');
