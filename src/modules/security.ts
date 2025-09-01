/**
 * Security module for API key encryption and device fingerprinting
 * ES Module version with TypeScript support
 */

interface SecurityEncryption {
  encrypt(data: string): string;
  decrypt(data: string): string;
}

interface SecurityStorage {
  encryption: SecurityEncryption;
  deviceFingerprint: string;
}

class SimpleEncryption implements SecurityEncryption {
  private key: string;

  constructor(deviceFingerprint: string) {
    this.key = this.generateKey(deviceFingerprint);
  }

  private generateKey(fingerprint: string): string {
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  encrypt(data: string): string {
    if (!data) return '';
    
    // Convert to UTF-8 bytes then encrypt
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    const encrypted = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      const keyByte = this.key.charCodeAt(i % this.key.length) & 0xFF;
      encrypted[i] = bytes[i] ^ keyByte;
    }
    
    // Convert to base64 directly from bytes
    const binaryString = String.fromCharCode.apply(null, encrypted);
    return btoa(binaryString);
  }

  decrypt(data: string): string {
    if (!data) return '';
    
    try {
      // Decode base64 to binary
      const binaryString = atob(data);
      const bytes = new Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decrypt bytes
      const decrypted = new Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        const keyByte = this.key.charCodeAt(i % this.key.length) & 0xFF;
        decrypted[i] = bytes[i] ^ keyByte;
      }
      
      // Convert back to UTF-8 string
      const decoder = new TextDecoder();
      return decoder.decode(new Uint8Array(decrypted));
    } catch (e) {
      console.error('Decryption failed:', e);
      return '';
    }
  }
}

function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent || 'unknown-ua',
    navigator.language || 'en',
    (typeof screen !== 'undefined' ? screen.width : 1920),
    (typeof screen !== 'undefined' ? screen.height : 1080),
    new Date().getTimezoneOffset() || 0
  ];
  
  let fingerprint = '';
  for (const component of components) {
    fingerprint += String(component);
  }
  
  // Generate a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

// Initialize and export security storage
const deviceFingerprint = generateDeviceFingerprint();
const encryption = new SimpleEncryption(deviceFingerprint);

export const secureStorage: SecurityStorage = {
  encryption,
  deviceFingerprint
};

// Extension-specific secure storage
export class ExtensionSecureStorage {
  private static instance: ExtensionSecureStorage;
  private encryptionKey: string;
  
  private constructor() {
    // Generate a more stable encryption key for this extension
    this.encryptionKey = this.generateExtensionKey();
  }
  
  static getInstance(): ExtensionSecureStorage {
    if (!ExtensionSecureStorage.instance) {
      ExtensionSecureStorage.instance = new ExtensionSecureStorage();
    }
    return ExtensionSecureStorage.instance;
  }
  
  private generateExtensionKey(): string {
    // Use extension ID + device fingerprint for a stable key
    const extensionId = chrome.runtime.id;
    const deviceInfo = generateDeviceFingerprint();
    
    // Combine extension ID and device fingerprint
    const combined = extensionId + '|' + deviceInfo + '|ai-tabs-secure';
    
    // Generate hash
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
  
  async storeApiKey(providerId: string, apiKey: string): Promise<void> {
    if (!apiKey) return;
    
    const encrypted = this.encrypt(apiKey);
    const storageKey = `secure_api_${providerId}`;
    
    await chrome.storage.local.set({ [storageKey]: encrypted });
  }
  
  async getApiKey(providerId: string): Promise<string | null> {
    const storageKey = `secure_api_${providerId}`;
    const result = await chrome.storage.local.get([storageKey]);
    
    if (!result[storageKey]) return null;
    
    try {
      return this.decrypt(result[storageKey]);
    } catch (e) {
      console.error('Failed to decrypt API key:', e);
      return null;
    }
  }
  
  async removeApiKey(providerId: string): Promise<void> {
    const storageKey = `secure_api_${providerId}`;
    await chrome.storage.local.remove([storageKey]);
  }
  
  private encrypt(data: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    const encrypted = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      const keyByte = this.encryptionKey.charCodeAt(i % this.encryptionKey.length) & 0xFF;
      encrypted[i] = bytes[i] ^ keyByte;
    }
    
    const binaryString = String.fromCharCode.apply(null, encrypted);
    return btoa(binaryString);
  }
  
  private decrypt(data: string): string {
    const binaryString = atob(data);
    const bytes = new Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decrypted = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      const keyByte = this.encryptionKey.charCodeAt(i % this.encryptionKey.length) & 0xFF;
      decrypted[i] = bytes[i] ^ keyByte;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(decrypted));
  }
}

export const extensionStorage = ExtensionSecureStorage.getInstance();

// For backward compatibility in Service Worker context
if (typeof globalThis !== 'undefined') {
  (globalThis as any).secureStorage = secureStorage;
}


