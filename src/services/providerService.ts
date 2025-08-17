/**
 * Provider Service - AI provider management and API operations
 */

import { ProviderConfig } from './settingsRepository';
import { secureStorage } from '../modules/security';
import { requestProviderPermissions, hasProviderPermissions } from '../utils/permissions';
import { getProvider } from '../config/providers';
import { createComponentErrorHandler } from '../utils/errorHandler';

export interface ModelListResponse {
  data: Array<{
    id: string;
    object: string;
    created?: number;
    owned_by?: string;
  }>;
}

export interface ProviderService {
  fetchModels(config: ProviderConfig): Promise<string[]>;
  validateConfig(config: ProviderConfig): Promise<boolean>;
  encryptApiKey(apiKey: string): string;
  decryptApiKey(encryptedKey: string): string;
  ensurePermissions(providerId: string, config: ProviderConfig): Promise<boolean>;
  classifyError(error: Error): 'network' | 'auth' | 'config' | 'unknown';
}

class AIProviderService implements ProviderService {
  private errorHandler = createComponentErrorHandler('ProviderService');
  async fetchModels(config: ProviderConfig): Promise<string[]> {
    if (!config.apiKey || !config.baseURL) {
      throw new Error('API key and base URL are required');
    }

    // Ensure permissions first
    const hasPermissions = await this.ensurePermissions('custom', config);
    if (!hasPermissions) {
      throw new Error('Network permissions not granted');
    }

    try {
      const modelsUrl = this.buildModelsUrl(config.baseURL);
      
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ModelListResponse = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from models API');
      }

      return data.data.map(model => model.id).filter(Boolean);
    } catch (error) {
      const appError = this.errorHandler.handle(error, 'fetchModels', {
        baseURL: config.baseURL,
        hasApiKey: !!config.apiKey
      });
      throw new Error(appError.userMessage);
    }
  }

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    if (!config.apiKey || !config.baseURL) {
      return false;
    }

    try {
      // Try to fetch models as a validation method
      const models = await this.fetchModels(config);
      return models.length > 0;
    } catch (error) {
      console.warn('Config validation failed:', error);
      return false;
    }
  }

  encryptApiKey(apiKey: string): string {
    if (!apiKey || !apiKey.trim()) {
      return '';
    }
    
    try {
      return secureStorage.encryption.encrypt(apiKey.trim());
    } catch (error) {
      console.error('API key encryption failed:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  decryptApiKey(encryptedKey: string): string {
    if (!encryptedKey) {
      return '';
    }
    
    try {
      const decrypted = secureStorage.encryption.decrypt(encryptedKey);
      if (!decrypted) {
        throw new Error('Decryption returned empty result');
      }
      return decrypted;
    } catch (error) {
      console.error('API key decryption failed:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  async ensurePermissions(providerId: string, config: ProviderConfig): Promise<boolean> {
    try {
      const customBaseURL = providerId === 'custom' || providerId.startsWith('custom-') 
        ? config.baseURL 
        : undefined;
        
      const hasPermissions = await hasProviderPermissions(providerId, customBaseURL);
      
      if (!hasPermissions) {
        return await requestProviderPermissions(providerId, customBaseURL);
      }
      
      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  classifyError(error: Error): 'network' | 'auth' | 'config' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'auth';
    }
    
    if (message.includes('400') || message.includes('invalid') || message.includes('required')) {
      return 'config';
    }
    
    return 'unknown';
  }

  private buildModelsUrl(baseURL: string): string {
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    
    // Handle different API patterns
    if (baseURL.includes('/v1')) {
      return `${cleanBaseURL}/models`;
    } else if (baseURL.includes('/api/')) {
      return `${cleanBaseURL}/models`;
    } else {
      return `${cleanBaseURL}/v1/models`;
    }
  }
}

// Export singleton instance
export const providerService: ProviderService = new AIProviderService();
