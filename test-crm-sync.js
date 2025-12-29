/**
 * CRM Sync Service Test
 * Tests the WhatsApp <-> CRM integration
 */

import crmSync from './src/crm/sync.js';
import contacts from './src/crm/contacts.js';
import deals from './src/crm/deals.js';
import activities from './src/crm/activities.js';
import dbService from './src/database/db.js';

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`${GREEN}✓${RESET} ${message}`);
        testsPassed++;
    } else {
        console.log(`${RED}✗${RESET} ${message}`);
        testsFailed++;
    }
}

function testSection(title) {
    console.log(`\n${BLUE}${title}${RESET}`);
    console.log('='.repeat(title.length));
}

// Clean test data
function cleanupTestData() {
    const testPhone = '+5511999999999';
    const contact = contacts.getByPhone(testPhone);
    if (contact) {
        const contactDeals = contacts.getDeals(contact.id);
        contactDeals.forEach(deal => {
            dbService.db.prepare('DELETE FROM deals WHERE id = ?').run(deal.id);
        });
        dbService.db.prepare('DELETE FROM activities WHERE contact_id = ?').run(contact.id);
        dbService.db.prepare('DELETE FROM contacts WHERE id = ?').run(contact.id);
    }
}

async function runTests() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     CRM SYNC SERVICE TEST                                 ║
║                                                           ║
║     Testing WhatsApp <-> CRM Integration                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

    // Cleanup before tests
    cleanupTestData();

    // Test 1: Process Incoming Message
    testSection('Test 1: Process Incoming Message');

    const messageData = {
        phone: '+5511999999999',
        name: 'João Test',
        content: 'Olá, gostaria de saber mais sobre o produto',
        type: 'text',
        messageId: 'msg_test_001'
    };

    const result1 = await crmSync.processIncomingMessage(messageData);

    assert(result1 !== null, 'processIncomingMessage returned result');
    assert(result1.contact !== undefined, 'Contact was created/retrieved');
    assert(result1.deal !== undefined, 'Deal was created/retrieved');
    assert(result1.contact.phone === messageData.phone, 'Contact phone matches');
    assert(result1.contact.name === messageData.name, 'Contact name matches');

    // Verify contact was created
    const contact = contacts.getByPhone(messageData.phone);
    assert(contact !== null, 'Contact exists in database');
    assert(contact.source === 'whatsapp', 'Contact source is whatsapp');

    // Verify deal was created
    const contactDeals = contacts.getDeals(contact.id);
    assert(contactDeals.length > 0, 'Deal was created for contact');
    assert(contactDeals[0].stage === 'lead', 'Deal starts in lead stage');

    // Verify activity was logged
    const timeline = contacts.getTimeline(contact.id);
    assert(timeline.length > 0, 'Activity was logged');
    const receivedMsg = timeline.find(a => a.type === 'message_received');
    assert(receivedMsg !== undefined, 'Activity type is message_received');

    // Test 2: Process Outgoing Message
    testSection('Test 2: Process Outgoing Message');

    const response = 'Olá João! Vou te explicar tudo sobre nosso produto...';
    const result2 = await crmSync.processOutgoingMessage(messageData.phone, response, {
        type: 'text'
    });

    assert(result2 !== null, 'processOutgoingMessage returned result');
    assert(result2.contact !== undefined, 'Contact was found');
    assert(result2.deal !== undefined, 'Deal was found');

    // Verify outgoing activity was logged
    const timeline2 = contacts.getTimeline(contact.id);
    const sentMessages = timeline2.filter(a => a.type === 'message_sent');
    assert(sentMessages.length > 0, 'Outgoing message was logged');

    // Test 3: Process Follow-Up
    testSection('Test 3: Process Follow-Up');

    const followUpMessage = 'João, você ainda tem interesse? Tenho uma oferta especial pra você!';
    await crmSync.processFollowUp(messageData.phone, followUpMessage, 1);

    const timeline3 = contacts.getTimeline(contact.id);
    const followUps = timeline3.filter(a => a.type === 'followup');
    assert(followUps.length > 0, 'Follow-up was logged');
    assert(followUps[0].title === 'Follow-up #1', 'Follow-up number is correct');

    // Test 4: Update Deal Stage - Warm Engagement
    testSection('Test 4: Update Deal Stage - Warm Engagement');

    const analysis1 = {
        intent: 'inquiry',
        sentiment: 'neutral',
        engagementLevel: 'warm',
        buyingSignal: false
    };

    await crmSync.updateDealStage(messageData.phone, analysis1, {
        content: 'Entendi, interessante. Quanto custa?'
    });

    const contactDeals2 = contacts.getDeals(contact.id);
    const activeDeal = contactDeals2.find(d => !['won', 'lost'].includes(d.stage));
    assert(activeDeal.stage === 'qualified', 'Deal moved to qualified stage');

    // Verify warm tag was added
    const contact2 = contacts.getByPhone(messageData.phone);
    assert(contact2.tags.includes('Warm'), 'Warm tag was added');

    // Test 5: Update Deal Stage - Hot Engagement
    testSection('Test 5: Update Deal Stage - Hot Engagement');

    const analysis2 = {
        intent: 'purchase',
        sentiment: 'positive',
        engagementLevel: 'hot',
        buyingSignal: true
    };

    await crmSync.updateDealStage(messageData.phone, analysis2, {
        content: 'Perfeito! Quero comprar. Como faço?'
    });

    const contactDeals3 = contacts.getDeals(contact.id);
    const activeDeal2 = contactDeals3.find(d => !['won', 'lost'].includes(d.stage));
    assert(activeDeal2.stage === 'negotiation', 'Deal moved to negotiation stage');

    // Verify hot tag was added
    const contact3 = contacts.getByPhone(messageData.phone);
    assert(contact3.tags.includes('Hot'), 'Hot tag was added');
    assert(!contact3.tags.includes('Warm'), 'Warm tag was removed');

    // Test 6: Update Deal Stage - Won
    testSection('Test 6: Update Deal Stage - Won');

    const analysis3 = {
        intent: 'confirmation',
        sentiment: 'positive',
        engagementLevel: 'hot',
        buyingSignal: true
    };

    await crmSync.updateDealStage(messageData.phone, analysis3, {
        content: 'Sim, quero fechar! Vamos em frente!'
    });

    const contactDeals4 = contacts.getDeals(contact.id);
    const wonDeal = contactDeals4.find(d => d.stage === 'won');
    assert(wonDeal !== undefined, 'Deal was marked as won');
    if (wonDeal) {
        assert(wonDeal.won_reason === 'Fechado via WhatsApp', 'Won reason is correct');
    }

    // Test 7: Update Deal Stage - Lost
    testSection('Test 7: Update Deal Stage - Lost');

    // Create a new deal for lost test
    const newDeal = deals.getOrCreateForContact(contact.id, {
        title: 'Test Deal - Lost',
        stage: 'negotiation'
    });

    const analysis4 = {
        intent: 'rejection',
        sentiment: 'negative',
        engagementLevel: 'cold',
        buyingSignal: false,
        objection: 'Muito caro'
    };

    await crmSync.updateDealStage(messageData.phone, analysis4, {
        content: 'Não quero, está muito caro'
    });

    const contactDeals5 = contacts.getDeals(contact.id);
    const lostDeal = contactDeals5.find(d => d.id === newDeal.id);
    assert(lostDeal.stage === 'lost', 'Deal was marked as lost');
    assert(lostDeal.lost_reason !== null, 'Lost reason was recorded');

    // Test 8: Get Contact Summary
    testSection('Test 8: Get Contact Summary');

    const summary = crmSync.getContactSummary(messageData.phone);

    assert(summary !== null, 'Contact summary was generated');
    assert(summary.id === contact.id, 'Summary ID matches contact');
    assert(summary.name === 'João Test', 'Summary name matches');
    assert(summary.tags.length > 0, 'Summary includes tags');
    assert(summary.totalDeals > 0, 'Summary includes deal count');
    assert(summary.wonDeals > 0, 'Summary includes won deals count');

    // Test 9: Extract Lead Info
    testSection('Test 9: Extract Lead Info');

    const conversationData = {
        extracted_pain: 'Dificuldade em gerar leads',
        extracted_objections: ['Preço alto', 'Falta de tempo']
    };

    await crmSync.extractLeadInfo(messageData.phone, conversationData);

    const contact4 = contacts.getByPhone(messageData.phone);
    assert(contact4.notes !== null, 'Notes were updated');
    assert(contact4.notes.includes('Dificuldade em gerar leads'), 'Pain point was saved in notes');
    assert(contact4.custom_fields.objections !== undefined, 'Objections were saved');

    // Test 10: Second Incoming Message (Update Name)
    testSection('Test 10: Second Incoming Message (Update Name)');

    // Create a contact without name
    cleanupTestData();
    const messageData2 = {
        phone: '+5511999999999',
        name: null,
        content: 'Oi',
        type: 'text',
        messageId: 'msg_test_002'
    };

    await crmSync.processIncomingMessage(messageData2);
    const contact5 = contacts.getByPhone(messageData2.phone);
    assert(contact5.name === null, 'Contact created without name');

    // Send second message with name
    const messageData3 = {
        phone: '+5511999999999',
        name: 'Maria Silva',
        content: 'Meu nome é Maria',
        type: 'text',
        messageId: 'msg_test_003'
    };

    await crmSync.processIncomingMessage(messageData3);
    const contact6 = contacts.getByPhone(messageData3.phone);
    assert(contact6.name === 'Maria Silva', 'Contact name was updated');

    // Cleanup after tests
    cleanupTestData();

    // Summary
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     TEST SUMMARY                                          ║
║                                                           ║
║     Passed: ${GREEN}${testsPassed}${RESET}                                              ║
║     Failed: ${testsFailed > 0 ? RED : GREEN}${testsFailed}${RESET}                                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

    if (testsFailed === 0) {
        console.log(`${GREEN}All tests passed!${RESET}\n`);
        process.exit(0);
    } else {
        console.log(`${RED}Some tests failed!${RESET}\n`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error(`${RED}Test suite error:${RESET}`, err);
    process.exit(1);
});
