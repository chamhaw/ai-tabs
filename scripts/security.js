// security.js - Secure API key storage module

/**
 * Simple string encryption/decryption utility
 * Note: This is not military-grade encryption, but much safer than plain text storage
 */
class SimpleEncryption {
  constructor() {
    // Generate or get device-specific key
    this.deviceKey = this.getDeviceKey();
  }

  /**
   * Generate device-specific encryption key
   */
  getDeviceKey() {
    // Use browser fingerprint and timestamp to generate device-specific key
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Simple hash function
    let hash = 0;
    const input = userAgent + language + timezone + 'ai-tabs-salt';
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Improved XOR encryption with better character handling
   */
  encrypt(text) {
    if (!text) return '';
    
    const key = this.deviceKey;
    const resultBytes = [];
    
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      resultBytes.push(textChar ^ keyChar);
    }
    
    // Convert to Base64 using byte array to avoid character encoding issues
    const binaryString = String.fromCharCode.apply(null, resultBytes);
    return btoa(binaryString);
  }

  /**
   * Improved decrypt function with better error handling
   */
  decrypt(encryptedText) {
    if (!encryptedText) return '';
    
    try {
      // Base64 decode
      const encrypted = atob(encryptedText);
      const key = this.deviceKey;
      const resultBytes = [];
      
      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        resultBytes.push(encryptedChar ^ keyChar);
      }
      
      // Convert byte array back to string
      const result = String.fromCharCode.apply(null, resultBytes);
      
      // Validate the decrypted result
      if (result && typeof result === 'string' && result.length > 0) {
        // Check if the result contains control characters (which indicate corruption)
        if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(result)) {
          console.warn('Decrypted API key contains control characters, likely corrupted');
          return '';
        }
        
        // Additional validation: API keys should be reasonable length
        if (result.length < 5 || result.length > 200) {
          console.warn('Decrypted API key has unreasonable length, may be corrupted');
          return '';
        }
        
        return result;
      }
      
      return result;
    } catch (e) {
      console.error('Decryption failed:', e);
      return '';
    }
  }
}

/**
 * Secure storage manager
 */
class SecureStorage {
  constructor() {
    this.encryption = new SimpleEncryption();
  }

  /**
   * Securely store API key
   */
  async setApiKey(apiKey) {
    if (!apiKey) {
      // Remove key
      await chrome.storage.local.remove(['encryptedApiKey']);
      return;
    }

    const encrypted = this.encryption.encrypt(apiKey);
    await chrome.storage.local.set({ encryptedApiKey: encrypted });
  }

  /**
   * Securely get API key
   */
  async getApiKey() {
    const result = await chrome.storage.local.get(['encryptedApiKey']);
    if (!result.encryptedApiKey) {
      return '';
    }

    return this.encryption.decrypt(result.encryptedApiKey);
  }


  /**
   * Check if key is valid
   */
  async isApiKeyValid() {
    const apiKey = await this.getApiKey();
    return apiKey && apiKey.length > 0;
  }
}

// Create global secure storage instance
const secureStorage = new SecureStorage();

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureStorage, secureStorage };
} 