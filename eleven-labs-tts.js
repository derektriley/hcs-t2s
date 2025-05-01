const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ElevenLabsTTS {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.voiceId = 'NFG5qt843uXKj4pFvR7C'; // Default voice - Rachel (you can change this)
    
    // Create a directory for caching audio files
    this.cacheDir = path.join(app.getPath('userData'), 'tts-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // Generate a cache key for a message
  getCacheKey(text, voiceId = this.voiceId) {
    return Buffer.from(`${voiceId}-${text}`).toString('base64').replace(/[/+=]/g, '_');
  }

  // Check if we have a cached audio file for this text
  getCachedAudioPath(text, voiceId = this.voiceId) {
    const cacheKey = this.getCacheKey(text, voiceId);
    const filePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
    
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    
    return null;
  }

  // Generate speech and save to cache
  async generateSpeech(text, voiceId = this.voiceId) {
    // Check cache first
    const cachedPath = this.getCachedAudioPath(text, voiceId);
    if (cachedPath) {
      console.log('Using cached audio');
      return cachedPath;
    }
    
    console.log('Generating new audio with ElevenLabs API');
    
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/text-to-speech/${voiceId}`,
        data: {
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
      
      // Save to cache
      const cacheKey = this.getCacheKey(text, voiceId);
      const filePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
      fs.writeFileSync(filePath, Buffer.from(response.data));
      
      return filePath;
    } catch (error) {
      console.error('ElevenLabs API error:', error.response?.data || error.message);
      throw error;
    }
  }
  
  // List available voices
  async getVoices() {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/voices`,
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }
}

module.exports = ElevenLabsTTS; 