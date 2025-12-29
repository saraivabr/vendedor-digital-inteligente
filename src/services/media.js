import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

/**
 * MediaService
 *
 * Handles media operations for WhatsApp integration:
 * - Download media from WhatsApp messages
 * - Temporary file management
 * - TTS audio generation (Google Cloud Text-to-Speech with fallback)
 */
class MediaService {
    constructor() {
        this.tempDir = tmpdir();
        this.supportedMediaTypes = ['audio', 'image', 'video', 'document'];
    }

    /**
     * Saves buffer to temporary file with unique name
     *
     * @param {Buffer} buffer - File content as buffer
     * @param {string} extension - File extension (e.g., 'mp3', 'jpg')
     * @returns {Promise<string>} - Absolute path to saved file
     */
    async saveTemp(buffer, extension) {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Invalid buffer provided');
        }

        if (!extension || typeof extension !== 'string') {
            throw new Error('Invalid extension provided');
        }

        // Generate unique filename using crypto
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const filename = `whatsapp_media_${timestamp}_${uniqueId}.${extension.replace(/^\./, '')}`;
        const filePath = join(this.tempDir, filename);

        try {
            await writeFile(filePath, buffer);
            return filePath;
        } catch (error) {
            throw new Error(`Failed to save temporary file: ${error.message}`);
        }
    }

    /**
     * Removes temporary file from filesystem
     *
     * @param {string} path - Absolute path to file
     * @returns {Promise<boolean>} - True if deleted, false if file doesn't exist
     */
    async cleanTemp(path) {
        if (!path || typeof path !== 'string') {
            throw new Error('Invalid path provided');
        }

        try {
            await unlink(path);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, consider it cleaned
                return false;
            }
            throw new Error(`Failed to clean temporary file: ${error.message}`);
        }
    }

    /**
     * Downloads media from WhatsApp message
     *
     * @param {Object} message - WhatsApp message object
     * @returns {Promise<Object>} - { buffer: Buffer, mimeType: string, extension: string }
     */
    async downloadMedia(message) {
        if (!message) {
            throw new Error('Message object is required');
        }

        // Check if message has media
        if (!message.hasMedia) {
            throw new Error('Message does not contain media');
        }

        try {
            // Download media using the message's downloadMedia method
            const media = await message.downloadMedia();

            if (!media) {
                throw new Error('Failed to download media from message');
            }

            // Convert base64 data to buffer
            const buffer = Buffer.from(media.data, 'base64');

            // Determine file extension from mimetype
            const extension = this._getExtensionFromMimeType(media.mimetype);

            return {
                buffer,
                mimeType: media.mimetype,
                extension,
                filename: media.filename || `media.${extension}`
            };
        } catch (error) {
            throw new Error(`Failed to download WhatsApp media: ${error.message}`);
        }
    }

    /**
     * Generates TTS audio from text
     *
     * Uses Google Cloud Text-to-Speech API if configured,
     * otherwise returns a fallback response
     *
     * @param {string} text - Text to convert to speech
     * @param {string} voice - Voice identifier (e.g., 'pt-BR-Standard-A')
     * @returns {Promise<Object>} - { buffer: Buffer, mimeType: string, extension: string }
     */
    async generateTTS(text, voice = 'pt-BR-Standard-A') {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Valid text is required for TTS generation');
        }

        // Check if Google Cloud TTS is configured
        const apiKey = process.env.GOOGLE_TTS_API_KEY;
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        if (apiKey && projectId) {
            try {
                return await this._generateGoogleTTS(text, voice, apiKey, projectId);
            } catch (error) {
                console.warn('Google TTS failed, using fallback:', error.message);
                return this._generateFallbackTTS(text);
            }
        } else {
            console.info('Google Cloud TTS not configured, using fallback');
            return this._generateFallbackTTS(text);
        }
    }

    /**
     * Generates TTS using Google Cloud Text-to-Speech API
     *
     * @private
     * @param {string} text - Text to convert
     * @param {string} voice - Voice identifier
     * @param {string} apiKey - Google Cloud API key
     * @param {string} projectId - Google Cloud project ID
     * @returns {Promise<Object>} - TTS audio object
     */
    async _generateGoogleTTS(text, voice, apiKey, projectId) {
        const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

        // Parse voice to extract language code
        const languageCode = voice.split('-').slice(0, 2).join('-'); // e.g., 'pt-BR'

        const requestBody = {
            input: { text },
            voice: {
                languageCode,
                name: voice,
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0.0,
            },
        };

        try {
            const response = await this._makeHttpsRequest(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = JSON.parse(response);

            if (!result.audioContent) {
                throw new Error('No audio content in Google TTS response');
            }

            // Convert base64 audio to buffer
            const buffer = Buffer.from(result.audioContent, 'base64');

            return {
                buffer,
                mimeType: 'audio/mpeg',
                extension: 'mp3',
            };
        } catch (error) {
            throw new Error(`Google TTS API error: ${error.message}`);
        }
    }

    /**
     * Generates fallback TTS response
     *
     * Returns a minimal audio buffer or instructions for client-side TTS
     *
     * @private
     * @param {string} text - Text to convert
     * @returns {Object} - Fallback TTS object
     */
    _generateFallbackTTS(text) {
        // Return metadata indicating client should use browser/device TTS
        // In a real implementation, this could generate a simple beep or
        // return instructions for the client to synthesize audio

        return {
            buffer: null,
            mimeType: 'text/plain',
            extension: 'txt',
            fallback: true,
            text: text,
            message: 'TTS not available - use client-side synthesis',
        };
    }

    /**
     * Makes HTTPS request and returns response body
     *
     * @private
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<string>} - Response body
     */
    _makeHttpsRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
            };

            const req = protocol.request(requestOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    /**
     * Extracts file extension from MIME type
     *
     * @private
     * @param {string} mimeType - MIME type string
     * @returns {string} - File extension
     */
    _getExtensionFromMimeType(mimeType) {
        const mimeToExtension = {
            // Audio
            'audio/ogg': 'ogg',
            'audio/opus': 'opus',
            'audio/mpeg': 'mp3',
            'audio/mp4': 'm4a',
            'audio/aac': 'aac',
            'audio/wav': 'wav',
            'audio/webm': 'webm',

            // Image
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/bmp': 'bmp',

            // Video
            'video/mp4': 'mp4',
            'video/3gpp': '3gp',
            'video/quicktime': 'mov',
            'video/webm': 'webm',

            // Document
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'text/plain': 'txt',
        };

        return mimeToExtension[mimeType] || 'bin';
    }
}

export default new MediaService();
