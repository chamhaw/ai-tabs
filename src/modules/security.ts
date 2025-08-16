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
    
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      const keyChar = this.key.charCodeAt(i % this.key.length);
      const encrypted = charCode ^ keyChar;
      result += String.fromCharCode(encrypted);
    }
    return btoa(result);
  }

  decrypt(data: string): string {
    if (!data) return '';
    
    try {
      const decoded = atob(data);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const decrypted = charCode ^ keyChar;
        result += String.fromCharCode(decrypted);
      }
      return result;
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
    screen.width || 1920,
    screen.height || 1080,
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

// For backward compatibility in Service Worker context
if (typeof globalThis !== 'undefined') {
  (globalThis as any).secureStorage = secureStorage;
}


