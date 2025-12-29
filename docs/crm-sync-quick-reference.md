# CRM Sync Quick Reference

## API Reference

### crmSync.processIncomingMessage(messageData)

Processes incoming WhatsApp messages and syncs with CRM.

**Parameters:**
```javascript
{
  phone: string,        // Contact phone number
  name: string,         // Contact name (optional)
  content: string,      // Message content
  type: string,         // Message type ('text', 'audio', 'image')
  messageId: string     // WhatsApp message ID
}
```

**Returns:**
```javascript
{
  contact: Object,      // Contact record
  deal: Object          // Active deal record
}
```

**What it does:**
1. Gets or creates contact by phone
2. Updates contact name if provided
3. Gets or creates deal for contact
4. Logs "message_received" activity
5. Increments metrics

---

### crmSync.processOutgoingMessage(phone, content, metadata)

Processes outgoing bot responses and syncs with CRM.

**Parameters:**
```javascript
phone: string,          // Contact phone number
content: string,        // Response content
metadata: {             // Optional metadata
  type: string,         // 'text' or 'audio'
  fragmented: boolean   // Whether message was fragmented
}
```

**Returns:**
```javascript
{
  contact: Object,      // Contact record
  deal: Object          // Active deal record
}
```

**What it does:**
1. Finds contact by phone
2. Gets active deal
3. Logs "message_sent" activity
4. Increments metrics

---

### crmSync.processFollowUp(phone, message, followUpNumber)

Processes follow-up messages and syncs with CRM.

**Parameters:**
```javascript
phone: string,          // Contact phone number
message: string,        // Follow-up message content
followUpNumber: number  // Follow-up sequence number (1, 2, 3...)
```

**What it does:**
1. Finds contact by phone
2. Gets active deal
3. Logs "followup" activity with number
4. Increments metrics

---

### crmSync.updateDealStage(phone, analysis, conversationData)

Updates deal stage based on conversation analysis.

**Parameters:**
```javascript
phone: string,          // Contact phone number
analysis: {             // AI analysis result
  intent: string,       // 'inquiry', 'confirmation', 'rejection', etc.
  sentiment: string,    // 'positive', 'neutral', 'negative'
  engagementLevel: string, // 'hot', 'warm', 'cold'
  buyingSignal: boolean,   // true if buying signals detected
  objection: string     // Detected objection (optional)
},
conversationData: {     // Current conversation data
  content: string,      // Message content
  type: string          // Message type
}
```

**Stage Transition Rules:**

| From | Condition | To |
|------|-----------|-----|
| negotiation | `intent='confirmation'` AND `sentiment='positive'` AND message contains confirmation word | won |
| any | `intent='rejection'` OR (`sentiment='negative'` AND message contains rejection word) | lost |
| lead or qualified | `buyingSignal=true` AND `engagementLevel='hot'` | negotiation |
| lead | `engagementLevel='warm'` | qualified |

**Confirmation Words:** sim, fechado, vamos, quero, aceito, fechar

**Rejection Words:** não quero, desisto, muito caro, outro momento

**What it does:**
1. Finds contact and active deal
2. Determines new stage based on priority rules
3. Updates deal stage if changed
4. Updates contact tags (Hot/Warm/Cold)
5. Logs stage change activity

---

### crmSync.extractLeadInfo(phone, conversationData)

Extracts and saves lead information from conversation.

**Parameters:**
```javascript
phone: string,          // Contact phone number
conversationData: {
  extracted_pain: string,        // Pain point detected
  extracted_objections: Array    // Objections detected
}
```

**What it does:**
1. Finds contact by phone
2. Appends pain points to notes
3. Saves objections to custom_fields
4. Updates contact record

---

### crmSync.getContactSummary(phone)

Gets contact summary for conversation context.

**Parameters:**
```javascript
phone: string          // Contact phone number
```

**Returns:**
```javascript
{
  id: string,          // Contact ID
  name: string,        // Contact name
  company: string,     // Company name
  tags: Array,         // Contact tags
  notes: string,       // Contact notes
  customFields: Object,// Custom fields
  currentStage: string,// Current deal stage
  dealValue: number,   // Current deal value
  totalDeals: number,  // Total number of deals
  wonDeals: number     // Number of won deals
}
```

---

## Integration Points

### index.js

```javascript
// After receiving message
await crmSync.processIncomingMessage({
  phone: messageData.phone,
  name: messageData.name,
  content: processedContent,
  type: messageData.type,
  messageId: messageData.messageId
});

// After analyzing message
await crmSync.updateDealStage(messageData.phone, result.analysis, {
  content: processedContent,
  type: messageData.type
});

// After sending response
await crmSync.processOutgoingMessage(messageData.phone, result.response, {
  type: shouldUseAudio ? 'audio' : 'text',
  fragmented: result.shouldFragment
});
```

### followUpScheduler.js

```javascript
// After sending follow-up
await crmSync.processFollowUp(conversation.phone, message, followUpNumber);
```

---

## Testing

Run comprehensive test suite:
```bash
node test-crm-sync.js
```

Test coverage:
- 37 tests
- 100% pass rate
- Covers all sync methods
- Tests all deal stage transitions
- Tests tag management
- Tests lead info extraction

---

## Database Schema

### Contacts Table
```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  company_name TEXT,
  source TEXT,
  tags TEXT,           -- JSON array
  custom_fields TEXT,  -- JSON object
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### Deals Table
```sql
CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  title TEXT,
  stage TEXT,          -- 'lead', 'qualified', 'negotiation', 'won', 'lost'
  value REAL,
  won_reason TEXT,
  lost_reason TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### Activities Table
```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  contact_id TEXT,
  deal_id TEXT,
  type TEXT,           -- 'message_sent', 'message_received', 'followup', etc.
  title TEXT,
  description TEXT,
  metadata TEXT,       -- JSON object
  created_at TEXT
);
```

---

## Error Handling

All CRM sync methods handle errors gracefully:

```javascript
try {
  await crmSync.processIncomingMessage(messageData);
} catch (error) {
  console.error('CRM Sync Error:', error.message);
  // System continues operating even if sync fails
}
```

Errors are logged but don't crash the main application.

---

## Performance Considerations

1. **Async Operations** - All sync operations are async and non-blocking
2. **Efficient Queries** - Uses indexed queries for phone lookups
3. **Minimal Database Writes** - Only writes when data changes
4. **Error Tolerance** - Continues operating even if CRM sync fails

---

## Monitoring

Check sync operations in logs:
```bash
# Look for these messages:
📥 CRM Sync: Mensagem recebida de [name/phone]
🔄 CRM Sync: Follow-up #N para [name/phone]
📊 CRM Sync: Deal movido para [stage]
📈 Metric: [metric_name] +1
```

---

## Common Use Cases

### Use Case 1: New Lead Arrives
```
1. Message received → Contact created (stage: lead)
2. Bot responds → Activity logged
3. Lead shows interest → Stage: qualified
4. Lead asks to buy → Stage: negotiation
5. Lead confirms → Stage: won
```

### Use Case 2: Follow-Up Sequence
```
1. Lead stops responding
2. Follow-up #1 sent after 3 days → Activity logged
3. No response → Follow-up #2 sent after 7 days
4. No response → Follow-up #3 sent after 14 days
5. Lead responds → Conversation reactivated
```

### Use Case 3: Deal Lost
```
1. Lead in negotiation
2. Lead says "muito caro" → Stage: lost
3. Lost reason recorded
4. Can be re-engaged later
```

---

## Tips and Best Practices

1. **Check Contact Summary** - Use `getContactSummary()` to get context before responding
2. **Monitor Deal Stages** - Watch stage transitions in dashboard
3. **Review Activities** - Check activity timeline to understand conversation flow
4. **Tag Management** - Tags automatically update based on engagement
5. **Lead Info** - Pain points and objections automatically extracted and saved

---

## Troubleshooting

**Issue:** Contact not being created
- **Solution:** Check that phone number is valid and formatted correctly

**Issue:** Deal stage not updating
- **Solution:** Verify analysis object has correct intent/sentiment values

**Issue:** Activities not logging
- **Solution:** Check that contact_id and deal_id are valid

**Issue:** Tags not updating
- **Solution:** Ensure engagementLevel is one of: 'hot', 'warm', 'cold'

---

## File Locations

**Source Code:**
- `/Users/saraiva/vendedordigitalinteligente/src/crm/sync.js`

**Tests:**
- `/Users/saraiva/vendedordigitalinteligente/test-crm-sync.js`

**Documentation:**
- `/Users/saraiva/vendedordigitalinteligente/INTEGRATION-SUMMARY.md`
- `/Users/saraiva/vendedordigitalinteligente/docs/crm-sync-flow.md`
- `/Users/saraiva/vendedordigitalinteligente/docs/crm-sync-quick-reference.md` (this file)

**Integration Points:**
- `/Users/saraiva/vendedordigitalinteligente/src/index.js`
- `/Users/saraiva/vendedordigitalinteligente/src/engine/followUpScheduler.js`
