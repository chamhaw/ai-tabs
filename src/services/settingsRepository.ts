/**
 * Settings Repository - Unified storage layer with version control
 */

export interface ProviderConfig {
  name: string;
  baseURL: string;
  endpoint?: string;
  apiKey?: string;
  selectedModel?: string;
  models?: string[];
  configured: boolean;
  version?: number;
}

export interface AppSettings {
  schemaVersion: number;
  selectedProvider?: string;
  providers: { [key: string]: ProviderConfig };
  customProviders?: { [key: string]: ProviderConfig };
  userLanguage?: string;
  groupingStrategy?: string;
  enableAutoGroup?: boolean;
  autoGroupThreshold?: number;
  reuseExistingGroups?: boolean;
  minTabsInGroup?: number;
}

export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(settings: Partial<AppSettings>): Promise<void>;
  saveProvider(providerId: string, config: ProviderConfig): Promise<void>;
  removeProvider(providerId: string): Promise<void>;
  migrate(oldVersion: number, newVersion: number): Promise<void>;
}

const CURRENT_SCHEMA_VERSION = 1;

class ChromeSettingsRepository implements SettingsRepository {
  private defaultSettings: AppSettings = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    providers: {},
    enableAutoGroup: false,
    autoGroupThreshold: 5,
    reuseExistingGroups: true,
    minTabsInGroup: 2
  };

  async load(): Promise<AppSettings> {
    try {
      const result = await chrome.storage.local.get(null);
      
      // Check if migration is needed
      const currentVersion = result.schemaVersion || 0;
      if (currentVersion < CURRENT_SCHEMA_VERSION) {
        await this.migrate(currentVersion, CURRENT_SCHEMA_VERSION);
        // Reload after migration
        return this.load();
      }

      return {
        ...this.defaultSettings,
        ...result,
        schemaVersion: CURRENT_SCHEMA_VERSION
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.defaultSettings;
    }
  }

  async save(settings: Partial<AppSettings>): Promise<void> {
    try {
      const settingsToSave = {
        ...settings,
        schemaVersion: CURRENT_SCHEMA_VERSION
      };
      
      await chrome.storage.local.set(settingsToSave);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  async saveProvider(providerId: string, config: ProviderConfig): Promise<void> {
    try {
      const settings = await this.load();
      settings.providers[providerId] = {
        ...config,
        version: Date.now() // Version for conflict resolution
      };
      
      await this.save({ providers: settings.providers });
    } catch (error) {
      console.error('Failed to save provider config:', error);
      throw new Error('Failed to save provider configuration');
    }
  }

  async removeProvider(providerId: string): Promise<void> {
    try {
      const settings = await this.load();
      delete settings.providers[providerId];
      delete settings.customProviders?.[providerId];
      
      await this.save({ 
        providers: settings.providers,
        customProviders: settings.customProviders 
      });
    } catch (error) {
      console.error('Failed to remove provider:', error);
      throw new Error('Failed to remove provider');
    }
  }

  async migrate(oldVersion: number, newVersion: number): Promise<void> {
    console.log(`Migrating settings from version ${oldVersion} to ${newVersion}`);
    
    try {
      const currentData = await chrome.storage.local.get(null);
      
      // Version 0 -> 1: Basic structure validation
      if (oldVersion === 0) {
        // Ensure providers object exists
        if (!currentData.providers || typeof currentData.providers !== 'object') {
          currentData.providers = {};
        }
        
        // Migrate any legacy provider configs
        for (const [key, value] of Object.entries(currentData)) {
          if (key.endsWith('Config') && typeof value === 'object') {
            const providerKey = key.replace('Config', '');
            if (!currentData.providers[providerKey]) {
              currentData.providers[providerKey] = value;
            }
            delete currentData[key]; // Remove legacy key
          }
        }
      }
      
      // Set new schema version
      currentData.schemaVersion = newVersion;
      
      // Save migrated data
      await chrome.storage.local.clear();
      await chrome.storage.local.set(currentData);
      
      console.log('Settings migration completed successfully');
    } catch (error) {
      console.error('Settings migration failed:', error);
      throw new Error(`Migration from version ${oldVersion} to ${newVersion} failed`);
    }
  }
}

// Export singleton instance
export const settingsRepository: SettingsRepository = new ChromeSettingsRepository();


