/**
 * Permission management utility for AI providers
 * Handles optional host permissions for provider domains
 */

import { getProviderDomains, getProvider } from '../config/providers';

/**
 * Extract domain pattern from custom base URL
 */
function extractDomainPattern(baseURL: string): string {
  try {
    const url = new URL(baseURL);
    return `${url.protocol}//${url.hostname}/*`;
  } catch (e) {
    throw new Error(`Invalid base URL: ${baseURL}`);
  }
}

/**
 * Request permissions for a specific provider
 */
export async function requestProviderPermissions(providerKey: string, customBaseURL?: string): Promise<boolean> {
  let origins: string[] = [];

  if (providerKey === 'custom' && customBaseURL) {
    origins = [extractDomainPattern(customBaseURL)];
  } else {
    origins = getProviderDomains(providerKey);
    if (origins.length === 0) {
      throw new Error(`Unknown provider: ${providerKey}`);
    }
  }

  try {
    const granted = await chrome.permissions.request({
      origins: origins
    });
    
    if (granted) {
      console.log(`Permissions granted for ${providerKey}:`, origins);
    } else {
      console.warn(`Permissions denied for ${providerKey}:`, origins);
    }
    
    return granted;
  } catch (error) {
    console.error('Failed to request permissions:', error);
    return false;
  }
}

/**
 * Check if permissions are already granted for a provider
 */
export async function hasProviderPermissions(providerKey: string, customBaseURL?: string): Promise<boolean> {
  let origins: string[] = [];

  if (providerKey === 'custom' && customBaseURL) {
    origins = [extractDomainPattern(customBaseURL)];
  } else {
    origins = getProviderDomains(providerKey);
    if (origins.length === 0) {
      return false;
    }
  }

  try {
    const hasPermissions = await chrome.permissions.contains({
      origins: origins
    });
    
    return hasPermissions;
  } catch (error) {
    console.error('Failed to check permissions:', error);
    return false;
  }
}

/**
 * Remove permissions for a provider (when user switches or removes provider)
 */
export async function revokeProviderPermissions(providerKey: string, customBaseURL?: string): Promise<boolean> {
  let origins: string[] = [];

  if (providerKey === 'custom' && customBaseURL) {
    origins = [extractDomainPattern(customBaseURL)];
  } else {
    origins = getProviderDomains(providerKey);
    if (origins.length === 0) {
      return false;
    }
  }

  try {
    const removed = await chrome.permissions.remove({
      origins: origins
    });
    
    if (removed) {
      console.log(`Permissions revoked for ${providerKey}:`, origins);
    }
    
    return removed;
  } catch (error) {
    console.error('Failed to revoke permissions:', error);
    return false;
  }
}

/**
 * Get all currently granted provider permissions
 */
export async function getGrantedProviderPermissions(): Promise<string[]> {
  try {
    const permissions = await chrome.permissions.getAll();
    const grantedOrigins = permissions.origins || [];
    
    const grantedProviders: string[] = [];
    
    const { PROVIDERS } = await import('../config/providers');
    
    for (const [providerKey, provider] of Object.entries(PROVIDERS)) {
      if (provider.id === 'custom') continue;
      
      const hasAllDomains = provider.domains.every(domain => 
        grantedOrigins.some(origin => origin === domain)
      );
      
      if (hasAllDomains) {
        grantedProviders.push(providerKey);
      }
    }
    
    return grantedProviders;
  } catch (error) {
    console.error('Failed to get granted permissions:', error);
    return [];
  }
}
