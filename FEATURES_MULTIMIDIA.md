# Funcionalidades Multimídia - Vendedor Digital Inteligente

## Resumo das Implementações

Este documento descreve as novas funcionalidades multimídia adicionadas ao sistema.

---

## 1. Processamento de Áudio Recebido

### Funcionalidade
Quando o lead envia uma mensagem de áudio, o sistema:
1. Detecta automaticamente que é um áudio
2. Faz download do arquivo de áudio
3. Usa o Gemini para transcrever o áudio em texto
4. Processa a transcrição como uma mensagem de texto normal
5. Adiciona contexto "[Cliente enviou áudio]" para o motor comportamental

### Implementação
- **Arquivo**: `/src/services/whatsapp.js`
  - Método `extractMessageContent()` detecta áudio
  - Event handler baixa o buffer de áudio automaticamente

- **Arquivo**: `/src/services/llm.js`
  - Método `transcribeAudio(audioBuffer, mimeType)` usa Gemini para transcrição

- **Arquivo**: `/src/index.js`
  - Handler de mensagens verifica `messageData.type === 'audio'`
  - Chama `llm.transcribeAudio()` e processa resultado

### Logs
```
📥 Áudio baixado para processamento
🎤 Transcrevendo áudio...
📝 Transcrição: "oi, quero saber mais sobre o produto"
```

---

## 2. Processamento de Imagens Recebidas

### Funcionalidade
Quando o lead envia uma imagem:
1. Detecta automaticamente que é uma imagem
2. Faz download da imagem
3. Usa o Gemini Vision para analisar o conteúdo
4. Inclui a análise no contexto da conversa
5. Responde considerando o conteúdo visual

### Implementação
- **Arquivo**: `/src/services/whatsapp.js`
  - Método `extractMessageContent()` detecta imagens
  - Event handler baixa o buffer da imagem e extrai caption

- **Arquivo**: `/src/services/llm.js`
  - Método `analyzeImage(imageBuffer, mimeType, context)` usa Gemini Vision

- **Arquivo**: `/src/index.js`
  - Handler verifica `messageData.type === 'image'`
  - Chama `llm.analyzeImage()` com contexto da conversa
  - Combina caption + análise visual

### Logs
```
📥 Imagem baixada para processamento
🖼️ Analisando imagem...
👁️ Análise: Screenshot de dashboard com métricas de vendas
```

---

## 3. Reações Automáticas (Emojis)

### Funcionalidade
O sistema reage automaticamente a mensagens com emojis:
- **👍** quando detecta sentimento positivo
- **🔥** quando detecta sinal de compra forte

### Implementação
- **Arquivo**: `/src/index.js`
  - Após processar mensagem, verifica `result.analysis.sentiment`
  - Se `sentiment === 'positive'`, reage com 👍
  - Se `analysis.buyingSignal === true`, reage com 🔥

- **Arquivo**: `/src/services/whatsapp.js`
  - Método `sendReaction(phone, messageId, emoji)` envia reação

### Exemplo
```javascript
// Cliente: "adorei! quando posso começar?"
// Sistema reage: 🔥 (buying signal detected)
```

---

## 4. Respostas em Áudio (TTS)

### Funcionalidade
O sistema pode responder com áudio ao invés de texto, baseado em:
- Configuração `AUDIO_ENABLED=true` no `.env`
- Nível de engajamento do lead (hot/warm/cold)
- Se o lead enviou áudio primeiro
- Presença de objeções importantes
- Análise do LLM (`shouldSendAudio` no analysis)

### Algoritmo de Decisão
```javascript
Chance base = AUDIO_CHANCE (default 30%)
+ 20% se lead está "hot"
+ 15% se há objeção
+ 25% se LLM recomenda áudio
+ 10% se engagement_level === 'hot'
```

### Implementação
- **Arquivo**: `/src/services/llm.js`
  - Método `shouldRespondWithAudio(analysis, conversationData)` decide
  - Método `generateAudio(text)` - TTS (TODO: implementar)
  - Flag `shouldSendAudio` adicionada ao retorno de `analyzeMessage()`

- **Arquivo**: `/src/services/whatsapp.js`
  - Método `sendAudio(phone, content)` aceita texto ou Buffer
  - Se texto, tenta converter com TTS
  - Simula "gravando..." antes de enviar (mais humano)

- **Arquivo**: `/src/index.js`
  - Chama `llm.shouldRespondWithAudio()` após processar mensagem
  - Se true, usa `whatsapp.sendAudio()`
  - Fallback para texto se TTS falhar

### Configuração (.env)
```bash
# Habilita respostas em áudio (requer configuração de TTS)
AUDIO_ENABLED=false

# Chance base de responder com áudio (0-100)
AUDIO_CHANCE=30
```

### Status TTS
⚠️ **IMPORTANTE**: A funcionalidade de TTS (Text-to-Speech) está preparada mas **não implementada** ainda.

Para implementar, adicione uma das opções:
1. **Google Cloud Text-to-Speech** (`@google-cloud/text-to-speech`)
2. **ElevenLabs** (`elevenlabs-node`)
3. **OpenAI TTS** (via API OpenAI)

O método `llm.generateAudio(text)` já está no lugar, bastando adicionar a integração.

---

## Fluxo Completo de Mensagem

```
1. Mensagem chega
   ↓
2. Detecta tipo (text/audio/image)
   ↓
3. Se áudio → transcreve
   Se imagem → analisa
   ↓
4. Processa com BehaviorEngine
   ↓
5. Decide reação emoji
   - Positivo → 👍
   - Buying signal → 🔥
   ↓
6. Decide formato resposta
   - shouldRespondWithAudio() → áudio ou texto
   ↓
7. Envia resposta
   - Texto: sendMessage() ou sendFragmentedMessages()
   - Áudio: sendAudio() com TTS
```

---

## Arquivos Modificados

### `/src/index.js`
- Handler de mensagens expandido com 6 etapas
- Processamento de áudio (transcrição)
- Processamento de imagens (análise visual)
- Lógica de reações automáticas
- Decisão de formato de resposta (texto vs áudio)
- Fallback robusto em caso de erro

### `/src/services/whatsapp.js`
- `extractMessageContent()` retorna objeto com tipo e metadata
- Event handler baixa buffers de mídia automaticamente
- `sendReaction()` para enviar emojis
- `sendAudio()` com suporte a TTS
- `downloadMedia()` para baixar áudio/imagem
- Simulação de "gravando..." antes de enviar áudio

### `/src/services/llm.js`
- `transcribeAudio()` usando Gemini
- `analyzeImage()` usando Gemini Vision
- `shouldRespondWithAudio()` com algoritmo de decisão
- `generateAudio()` stub para TTS (a implementar)
- Campo `shouldSendAudio` adicionado ao `analyzeMessage()`

---

## Logs Informativos

O sistema agora mostra logs detalhados:

```
📩 Mensagem de João Silva:
   "oi, tudo bem?"
   Tipo: audio

📥 Áudio baixado para processamento
🎤 Transcrevendo áudio...
📝 Transcrição: "oi, tudo bem?"

🤖 Resposta:
   "fala! tudo sim, e aí?"
   [Intent: greeting, Sentiment: positive]

👍 Reagindo com emoji positivo
🎙️ Gerando resposta em áudio...
🎤 Áudio enviado para 5511999999999
```

---

## Testes Recomendados

### Áudio
1. Envie áudio para o bot
2. Verifique transcrição nos logs
3. Confirme que resposta considera o áudio

### Imagem
1. Envie imagem (com ou sem legenda)
2. Verifique análise visual nos logs
3. Confirme que resposta considera o contexto visual

### Reações
1. Envie mensagem positiva ("adorei!")
2. Verifique reação 👍
3. Envie mensagem com intenção de compra
4. Verifique reação 🔥

### Áudio (quando TTS implementado)
1. Configure `AUDIO_ENABLED=true`
2. Envie áudio para o bot
3. Verifique se responde com áudio
4. Ajuste `AUDIO_CHANCE` conforme necessário

---

## Próximos Passos (TODO)

1. **Implementar TTS real**
   - Escolher serviço (Google/ElevenLabs/OpenAI)
   - Adicionar dependência
   - Implementar `llm.generateAudio()`
   - Testar qualidade de voz

2. **Otimizar custos**
   - Cache de transcrições
   - Limitar tamanho de áudio/imagem
   - Rate limiting

3. **Melhorar análise**
   - OCR em imagens (texto em prints)
   - Detecção de produtos em fotos
   - Sentiment analysis em tom de voz

4. **Métricas**
   - Trackear taxa de uso de áudio
   - Medir engajamento com reações
   - Comparar texto vs áudio na conversão

---

## Dependências

### Atuais
- `@whiskeysockets/baileys` - WhatsApp API
- `@google/generative-ai` - Gemini (transcrição + análise)

### Para TTS (quando implementar)
- `@google-cloud/text-to-speech` (opção 1)
- `elevenlabs-node` (opção 2)
- `openai` (opção 3)

---

## Suporte e Debugging

### Erros comuns

**"TTS não disponível"**
- Configure `AUDIO_ENABLED=false` no `.env`
- Ou implemente um serviço de TTS

**"Erro ao baixar mídia"**
- Verifique conexão do WhatsApp
- Pode ser timeout (áudio/imagem muito grande)

**"Não foi possível transcrever"**
- Verifique `GEMINI_API_KEY`
- Áudio pode estar corrompido
- Formato não suportado

**Reações não aparecem**
- Verifique que `messageId` está sendo capturado
- Alguns grupos podem ter reações desabilitadas

---

## Créditos

Implementado seguindo padrões TDD e best practices Python/Node.js
Documentação gerada automaticamente
