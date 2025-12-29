# CRM Sync Flow Diagram

## Message Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WhatsApp Message Received                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. MEDIA PROCESSING (Audio/Image)                                  │
│     - Transcribe audio if needed                                    │
│     - Analyze image if needed                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. CRM SYNC - INCOMING MESSAGE                                     │
│     ┌─────────────────────────────────────────────────┐             │
│     │ crmSync.processIncomingMessage()                │             │
│     ├─────────────────────────────────────────────────┤             │
│     │ • Get or create contact by phone                │             │
│     │ • Update contact name if provided               │             │
│     │ • Get or create deal for contact                │             │
│     │ • Log "message_received" activity               │             │
│     │ • Increment messages_received metric            │             │
│     └─────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. BEHAVIOR ENGINE ANALYSIS                                        │
│     - Analyze intent, sentiment, engagement                         │
│     - Detect buying signals                                         │
│     - Generate response                                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. CRM SYNC - UPDATE DEAL STAGE                                    │
│     ┌─────────────────────────────────────────────────┐             │
│     │ crmSync.updateDealStage()                       │             │
│     ├─────────────────────────────────────────────────┤             │
│     │ Priority order:                                 │             │
│     │ 1. Confirmation → won                           │             │
│     │ 2. Rejection → lost                             │             │
│     │ 3. Buying signal → negotiation                  │             │
│     │ 4. Warm engagement → qualified                  │             │
│     ├─────────────────────────────────────────────────┤             │
│     │ • Update contact tags (Hot/Warm/Cold)           │             │
│     │ • Log stage_change activity                     │             │
│     └─────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. SEND RESPONSE                                                   │
│     - React with emoji if appropriate                               │
│     - Decide audio vs text format                                  │
│     - Send message via WhatsApp                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. CRM SYNC - OUTGOING MESSAGE                                     │
│     ┌─────────────────────────────────────────────────┐             │
│     │ crmSync.processOutgoingMessage()                │             │
│     ├─────────────────────────────────────────────────┤             │
│     │ • Find contact by phone                         │             │
│     │ • Get active deal                               │             │
│     │ • Log "message_sent" activity                   │             │
│     │ • Increment messages_sent metric                │             │
│     └─────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## Follow-Up Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│               Follow-Up Scheduler (Every 15 minutes)                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. DETECT INACTIVE CONVERSATIONS                                   │
│     - Find conversations needing follow-up                          │
│     - Check business hours                                          │
│     - Verify timing is right                                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. ANALYZE ABANDON REASON                                          │
│     - Review conversation history                                   │
│     - Detect why they stopped responding                            │
│     - Select re-engagement strategy                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. GENERATE FOLLOW-UP MESSAGE                                      │
│     - Personalize based on context                                  │
│     - Adapt tone for follow-up number                               │
│     - Decide audio vs text format                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SEND FOLLOW-UP                                                  │
│     - Send via WhatsApp                                             │
│     - Record in database                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. CRM SYNC - FOLLOW-UP                                            │
│     ┌─────────────────────────────────────────────────┐             │
│     │ crmSync.processFollowUp()                       │             │
│     ├─────────────────────────────────────────────────┤             │
│     │ • Find contact by phone                         │             │
│     │ • Get active deal                               │             │
│     │ • Log "followup" activity with number           │             │
│     │ • Increment followups_sent metric               │             │
│     └─────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. SCHEDULE NEXT FOLLOW-UP                                         │
│     - Calculate next timing based on pattern                        │
│     - Update conversation record                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Deal Stage Transition Logic

```
                    ┌─────────┐
                    │  LEAD   │ (Initial stage)
                    └────┬────┘
                         │
                         │ Warm engagement detected
                         │ (engagementLevel = 'warm')
                         │
                         ▼
                  ┌──────────────┐
                  │  QUALIFIED   │
                  └──────┬───────┘
                         │
                         │ Buying signal detected
                         │ (buyingSignal = true,
                         │  engagementLevel = 'hot')
                         │
                         ▼
               ┌─────────────────┐
               │  NEGOTIATION    │
               └────┬────────┬───┘
                    │        │
       Confirmation │        │ Rejection
       with positive│        │ or negative
       sentiment    │        │ sentiment
                    │        │
                    ▼        ▼
              ┌─────┐    ┌──────┐
              │ WON │    │ LOST │
              └─────┘    └──────┘
```

## Contact Tag Management

```
Message Analysis
      ▼
┌─────────────────────────────────────┐
│  Engagement Level Detection         │
├─────────────────────────────────────┤
│  • Hot  - Strong buying signals     │
│  • Warm - Moderate interest         │
│  • Cold - Low engagement            │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Tag Update (Mutually Exclusive)    │
├─────────────────────────────────────┤
│  1. Remove old tags                 │
│     (Hot, Warm, Cold)               │
│  2. Add new tag based on            │
│     engagement level                │
└─────────────────────────────────────┘
               ▼
         Contact Tagged
```

## Data Flow Between Components

```
┌──────────────┐
│  WhatsApp    │
│  Service     │
└──────┬───────┘
       │
       │ Message Event
       │
       ▼
┌──────────────┐    Sync     ┌──────────────┐
│   index.js   │◄───────────►│  CRM Sync    │
│  (Main App)  │             │  Service     │
└──────┬───────┘             └──────┬───────┘
       │                            │
       │ Analysis                   │ CRUD Operations
       │                            │
       ▼                            ▼
┌──────────────┐             ┌──────────────┐
│  Behavior    │             │   CRM        │
│  Engine      │             │   Modules    │
└──────────────┘             └──────┬───────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│  Contacts    │             │    Deals     │            │  Activities  │
└──────────────┘             └──────────────┘            └──────────────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
                             ┌──────────────┐
                             │  SQLite DB   │
                             └──────────────┘
```

## Activity Timeline Example

```
Contact: João Test (+5511999999999)

Timeline:
├─ 2024-01-15 10:30 - Message Received
│  "Olá, gostaria de saber mais sobre o produto"
│
├─ 2024-01-15 10:30 - Deal Created
│  Stage: lead
│
├─ 2024-01-15 10:31 - Message Sent
│  "Olá João! Vou te explicar tudo sobre nosso produto..."
│
├─ 2024-01-15 10:35 - Message Received
│  "Entendi, interessante. Quanto custa?"
│
├─ 2024-01-15 10:35 - Stage Change
│  lead → qualified
│
├─ 2024-01-15 10:36 - Message Sent
│  "O investimento é R$ 997..."
│
├─ 2024-01-15 10:40 - Message Received
│  "Perfeito! Quero comprar. Como faço?"
│
├─ 2024-01-15 10:40 - Stage Change
│  qualified → negotiation
│
├─ 2024-01-15 10:41 - Message Sent
│  "Excelente! Vou te enviar o link de pagamento..."
│
├─ 2024-01-15 10:45 - Message Received
│  "Sim, quero fechar! Vamos em frente!"
│
├─ 2024-01-15 10:45 - Stage Change
│  negotiation → won
│
└─ 2024-01-15 10:45 - Deal Won
   Reason: Fechado via WhatsApp
   Value: R$ 997
```

## Summary

The CRM sync service acts as a bridge between WhatsApp conversations and the CRM system, ensuring:

1. **Complete Visibility** - Every interaction is tracked
2. **Automatic Updates** - Deal stages move based on conversation analysis
3. **Zero Manual Work** - Everything syncs automatically
4. **Rich Context** - Full timeline available for each contact
5. **Smart Tagging** - Contacts automatically categorized by engagement

The integration is seamless, performant, and fully tested with 37 passing tests.
