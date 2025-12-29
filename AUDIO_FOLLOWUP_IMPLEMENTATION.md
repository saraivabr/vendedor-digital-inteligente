# Audio Follow-Up Implementation

## Summary

Successfully added audio follow-up capability to the follow-up scheduler system. The system now intelligently decides when to send follow-ups as voice messages instead of text, creating a more human and engaging experience.

## Changes Made

### 1. Updated `/src/engine/followUpScheduler.js`

#### Added Imports
- Imported `media` service for TTS generation

#### Updated `sendFollowUp()` Method
- Added logic to decide if follow-up should be sent as audio or text
- Integrated TTS generation using `media.generateTTS()`
- Added fallback to text if TTS fails
- Records message format (audio/text) in database

#### Added `shouldSendAudioFollowUp()` Method
```javascript
shouldSendAudioFollowUp(conversation, followUpNumber, history)
```

**Decision Logic:**
- Base chance: 30%
- +20% if follow-up #3 or #4 (critical moment to break pattern)
- +30% if lead sent audio messages before (reciprocity)
- Maximum chance: 80% (when all conditions met)

**Examples:**
- Follow-up #1, no audio history: 30% chance
- Follow-up #3, no audio history: 50% chance (30 + 20)
- Follow-up #1, lead sent audio: 60% chance (30 + 30)
- Follow-up #3, lead sent audio: 80% chance (30 + 20 + 30)

#### Added `hasLeadSentAudio()` Method
```javascript
hasLeadSentAudio(history)
```

Detects if lead has sent audio messages by checking for:
- `[ÁUDIO]` tag
- `[AUDIO]` tag
- "áudio recebido" or "audio recebido" text

### 2. WhatsApp Service Integration

The existing `whatsapp.sendAudio()` method is already available and supports:
- Sending audio buffers directly
- Converting text to audio via TTS
- Simulating "recording" presence
- Push-to-talk (PTT) format for voice messages

### 3. Media Service Integration

The existing `media.generateTTS()` method provides:
- Google Cloud Text-to-Speech integration
- Fallback handling when TTS unavailable
- Portuguese BR voice support
- Audio format conversion

## Testing

Created comprehensive unit tests in `/tests/unit/test_followUpScheduler_audio.js`

### Test Results
```
✓ 10 tests passed (0 failures)
✓ All audio detection logic working correctly
✓ All probability calculations accurate
```

### Test Coverage
- Empty history handling
- Audio message detection with different formats
- Base probability calculation (30%)
- Critical follow-up bonus (+20% for #3 and #4)
- Audio reciprocity bonus (+30% when lead sent audio)
- Combined probabilities (up to 80%)

## How It Works

### Flow Diagram
```
Follow-Up Scheduled
        ↓
Generate Message Text
        ↓
Calculate Audio Probability
  ├─ Base: 30%
  ├─ +20% if follow-up #3 or #4
  └─ +30% if lead sent audio
        ↓
Random Decision (0-100)
        ↓
    Audio? ──Yes──→ Generate TTS ──Success?──Yes──→ Send Audio
        |                             |
        No                           No (fallback)
        |                             |
        └──────────→ Send Text ←──────┘
```

### Example Scenarios

**Scenario 1: First Follow-Up, No Audio History**
- Follow-up #1
- Lead never sent audio
- Probability: 30%
- Decision: 70% chance of text, 30% chance of audio

**Scenario 2: Critical Follow-Up**
- Follow-up #3
- Lead never sent audio
- Probability: 50% (30 base + 20 critical)
- Decision: 50% chance of text, 50% chance of audio

**Scenario 3: Audio Reciprocity**
- Follow-up #2
- Lead sent audio message before
- Probability: 60% (30 base + 30 audio)
- Decision: 40% chance of text, 60% chance of audio

**Scenario 4: Maximum Engagement**
- Follow-up #4
- Lead sent audio message before
- Probability: 80% (30 base + 20 critical + 30 audio)
- Decision: 20% chance of text, 80% chance of audio

## Configuration

### Environment Variables

To enable TTS, configure one of:

**Google Cloud TTS:**
```env
GOOGLE_TTS_API_KEY=your_api_key
GOOGLE_CLOUD_PROJECT_ID=your_project_id
```

**Fallback Behavior:**
If TTS is not configured, the system automatically falls back to text messages without errors.

## Benefits

1. **Pattern Breaking**: Audio messages at critical follow-ups (#3, #4) break the text pattern and re-engage leads
2. **Reciprocity**: Responding with audio when lead sent audio feels more personal and human
3. **Variety**: Probabilistic approach ensures natural variety in communication style
4. **Graceful Degradation**: Falls back to text if TTS unavailable
5. **Tracked Performance**: Format is recorded in database for future analytics

## Future Enhancements

Possible improvements:
- Track audio vs text response rates
- Adjust probabilities based on performance data
- Add time-of-day audio probability adjustments
- Support for different voice profiles
- Audio length optimization

## Files Modified

1. `/src/engine/followUpScheduler.js` - Core implementation
2. `/src/services/whatsapp.js` - Already had sendAudio support
3. `/src/services/media.js` - Already had TTS support

## Files Created

1. `/tests/unit/test_followUpScheduler_audio.js` - Unit tests (10 tests, all passing)

## Deployment Notes

- No breaking changes
- Backward compatible (works without TTS configured)
- No database migrations required (uses existing message storage)
- Safe to deploy immediately

## Success Metrics

Monitor these metrics after deployment:
- Audio follow-up send rate
- Response rate: audio follow-ups vs text follow-ups
- Conversion rate by format
- TTS generation success rate
- Fallback frequency

---

**Implementation Date**: December 29, 2024
**Status**: Complete and Tested
**Tests Passing**: 10/10 (100%)
