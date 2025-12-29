# Quick Reference - Multimedia Features

## Quick Start

### Enable/Disable Audio
```bash
# .env file
AUDIO_ENABLED=false  # Set to true when TTS is implemented
AUDIO_CHANCE=30      # 0-100 probability
```

### Send Test Messages
1. Voice message → Bot transcribes and responds
2. Image → Bot analyzes and responds
3. "adorei!" → Gets 👍 reaction
4. "quero comprar" → Gets 🔥 reaction

---

## API Methods

### LLM Service (`src/services/llm.js`)

```javascript
import llm from './services/llm.js';

// Transcribe audio
const text = await llm.transcribeAudio(audioBuffer, 'audio/ogg');

// Analyze image
const description = await llm.analyzeImage(imageBuffer, 'image/jpeg', 'Lead asked about pricing');

// Decide audio response
const useAudio = llm.shouldRespondWithAudio(analysis, conversationData);

// Generate audio (stub - returns null)
const audioBuffer = await llm.generateAudio("Hello world");
```

### WhatsApp Service (`src/services/whatsapp.js`)

```javascript
import whatsapp from './services/whatsapp.js';

// Send reaction
await whatsapp.sendReaction(phone, messageId, '👍');

// Send audio (text → TTS or buffer)
await whatsapp.sendAudio(phone, "Olá, tudo bem?");
await whatsapp.sendAudio(phone, audioBuffer);

// Download media
const buffer = await whatsapp.downloadMedia(message);
```

---

## Message Data Structure

```javascript
{
    phone: '5511999999999',
    name: 'João Silva',
    content: 'Texto da mensagem',
    type: 'text|audio|image|video|document|sticker',
    messageId: 'unique_id',
    timestamp: Date,

    // For audio
    audioBuffer: Buffer,
    mimeType: 'audio/ogg',

    // For images
    imageBuffer: Buffer,
    mimeType: 'image/jpeg',
    caption: 'Legenda da imagem',

    // Raw WhatsApp message
    raw: {...}
}
```

---

## Processing Pipeline

```
Message → Detect Type → Process Media → Analyze → React → Respond
```

### Stage 1: Type Detection
- Automatic (WhatsApp service)
- Sets `type` field

### Stage 2: Media Processing
- Audio: Downloads + transcribes
- Image: Downloads + analyzes

### Stage 3: Behavior Analysis
- Existing behavior engine
- Enhanced with media context

### Stage 4: Auto Reactions
- Positive → 👍
- Buying signal → 🔥

### Stage 5: Response Format
- Algorithm decides audio vs text
- Falls back to text if needed

### Stage 6: Send Response
- Text: Fragmented if needed
- Audio: TTS + simulate recording

---

## Configuration

### Environment Variables
```bash
GEMINI_API_KEY=xxx           # Required for transcription/analysis
AUDIO_ENABLED=false          # Enable audio responses
AUDIO_CHANCE=30              # Base probability (0-100)
LLM_MODEL=gemini-2.0-flash-exp
```

### Audio Decision Factors
- Base: `AUDIO_CHANCE` (30%)
- +20% if lead is "hot"
- +15% if objection detected
- +25% if LLM recommends
- +10% if high engagement

---

## Logs Reference

```
📩 New message
📥 Media downloaded
🎤 Transcribing audio
📝 Transcription result
🖼️ Analyzing image
👁️ Analysis result
👍 Reaction sent
🔥 Buying signal reaction
🎙️ Generating audio
📤 Message sent
⚠️ Warning/fallback
❌ Error
```

---

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "TTS não disponível" | `AUDIO_ENABLED=true` but no TTS | Set `AUDIO_ENABLED=false` or implement TTS |
| "Erro ao baixar mídia" | Large file/timeout | Check file size, network |
| "Não foi possível transcrever" | API error | Check `GEMINI_API_KEY` |
| "WhatsApp não conectado" | Socket disconnected | Reconnects automatically |

---

## Testing Checklist

- [ ] Send voice message → Transcribed correctly
- [ ] Send image → Analyzed correctly
- [ ] Send positive message → Gets 👍
- [ ] Send buying signal → Gets 🔥
- [ ] Check logs are informative
- [ ] Verify fallbacks work
- [ ] Test with large files
- [ ] Test with corrupted media

---

## File Locations

```
src/
├── index.js              # Main handler (6-stage pipeline)
├── services/
│   ├── whatsapp.js       # Media handling + reactions
│   └── llm.js            # Transcription + analysis
docs/
├── FEATURES_MULTIMIDIA.md      # Complete documentation
├── IMPLEMENTATION_SUMMARY.md   # Technical summary
└── QUICK_REFERENCE.md          # This file

test_multimedia.js        # Manual tests
```

---

## Common Tasks

### Add New Reaction Trigger
```javascript
// src/index.js
if (result.analysis.customTrigger) {
    reaction = '🎯';
}
```

### Change Audio Probability
```bash
# .env
AUDIO_CHANCE=50  # 0-100
```

### Implement TTS
```javascript
// src/services/llm.js
async generateAudio(text) {
    // Add your TTS implementation
    return audioBuffer;
}
```

### Add New Media Type
```javascript
// src/services/whatsapp.js - extractMessageContent()
if (message.newMediaType) {
    return {
        text: '[NEW_MEDIA]',
        type: 'new_media',
        hasMedia: true,
        message: msg
    };
}
```

---

## Performance Tips

1. **Cache transcriptions** - Store in DB
2. **Limit file sizes** - Reject >5MB
3. **Rate limit** - Max 10 media/minute per user
4. **Queue processing** - Don't block on media
5. **Monitor costs** - Track API usage

---

## Troubleshooting

### Audio not transcribing
1. Check `GEMINI_API_KEY`
2. Verify audio format (should be OGG)
3. Check audio file size
4. Look for errors in logs

### Images not analyzing
1. Check `GEMINI_API_KEY`
2. Verify image format (JPEG/PNG)
3. Check image file size
4. Look for errors in logs

### Reactions not appearing
1. Verify `messageId` exists
2. Check WhatsApp connection
3. Some chats disable reactions
4. Look for errors in logs

### Audio responses not working
1. Check `AUDIO_ENABLED=true`
2. Implement TTS first
3. Verify fallback to text works
4. Check `shouldRespondWithAudio()` logic

---

## Support

**Documentation**:
- FEATURES_MULTIMIDIA.md (features)
- IMPLEMENTATION_SUMMARY.md (technical)

**Testing**:
```bash
node test_multimedia.js
```

**Validation**:
```bash
node --check src/index.js
node --check src/services/whatsapp.js
node --check src/services/llm.js
```

---

## Version History

- **1.1.0** (2025-12-29): Multimedia features added
  - Audio transcription
  - Image analysis
  - Auto reactions
  - Audio response logic
  - TTS infrastructure (stub)

- **1.0.0**: Base system
  - Text messaging
  - Behavior engine
  - Follow-up scheduler
