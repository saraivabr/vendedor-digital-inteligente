/**
 * Audio Service - Gerenciamento de TTS (Text-to-Speech)
 * Integração com ElevenLabs para voz humana ultra-realista.
 */

import ElevenLabs from 'elevenlabs-node';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AudioService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV'; // Ex: Antoni (padrão)

        // Cache local para economizar (hash do texto -> caminho do arquivo)
        this.cacheDir = path.join(__dirname, '../../data/audio_cache');

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }

        if (this.apiKey) {
            this.client = new ElevenLabs({
                apiKey: this.apiKey,
                voiceId: this.voiceId
            });
            console.log('🎙️ Audio Service initialized with ElevenLabs');
        } else {
            console.warn('⚠️ Audio Service: ELEVENLABS_API_KEY not found in .env');
        }
    }

    /**
     * Gera áudio a partir de texto
     * @param {string} text - Texto para falar
     * @returns {Promise<string>} Caminho do arquivo de áudio gerado
     */
    async generateAudio(text) {
        if (!this.client) {
            console.warn('⚠️ TTS ignorado: API Key não configurada');
            return null;
        }

        try {
            // Limpa o texto para garantir que não fale caracteres estranhos
            const cleanText = text.replace(/[*_#`]/g, ''); // Remove markdown simples

            // Verifica cache
            const hash = crypto.createHash('md5').update(cleanText + this.voiceId).digest('hex');
            const cachePath = path.join(this.cacheDir, `${hash}.mp3`);

            if (fs.existsSync(cachePath)) {
                console.log('💾 Audio hit cache!');
                return cachePath;
            }

            console.log(`🎙️ Gerando áudio ElevenLabs (${cleanText.length} chars)...`);

            // Gera áudio (a biblioteca elevenlabs-node salva em arquivo)
            const response = await this.client.textToSpeech({
                fileName: path.join(this.cacheDir, `${hash}.mp3`),
                textInput: cleanText,
                stability: 0.5,
                similarityBoost: 0.75,
                modelId: 'eleven_multilingual_v2', // Melhor para português
            });

            if (response.status === 'ok') {
                console.log('✅ Áudio gerado com sucesso');
                return cachePath;
            } else {
                throw new Error('Falha na geração do áudio');
            }

        } catch (error) {
            console.error('❌ Erro no AudioService:', error.message);
            return null;
        }
    }

    /**
     * Limpa cache antigo (opcional, maintenance)
     */
    cleanCache(maxAgeDays = 7) {
        // Implementar limpeza de arquivos antigos se necessário
    }
}

export default new AudioService();
