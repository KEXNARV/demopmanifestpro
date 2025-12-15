import { ProcessingConfig, DEFAULT_CONFIG } from '@/types/manifest';

const CONFIG_KEY = 'manifest_processor_config';

export function saveConfig(config: ProcessingConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

export function loadConfig(): ProcessingConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        categories: parsed.categories || DEFAULT_CONFIG.categories,
        valueTresholds: parsed.valueTresholds || DEFAULT_CONFIG.valueTresholds,
      };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

export function resetConfig(): ProcessingConfig {
  localStorage.removeItem(CONFIG_KEY);
  return DEFAULT_CONFIG;
}
