import { ProcessingConfig, DEFAULT_CONFIG, ProcessingSummary, ProcessedBatch } from '@/types/manifest';
import { devError } from '@/lib/logger';

const CONFIG_KEY = 'manifest_processor_config';
const MANIFESTS_KEY = 'processed_manifests';

// ============================================
// MANIFEST STORAGE INTERFACE
// ============================================

export interface ManifestStorage {
  id: string;
  mawb?: string;
  fileName: string;
  totalRows: number;
  totalBatches: number;
  totalValue: number;
  processedAt: string;
  summary?: ProcessingSummary;
}

// ============================================
// CONFIG FUNCTIONS
// ============================================

export function saveConfig(config: ProcessingConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    devError('Error saving config');
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
    devError('Error loading config');
  }
  return DEFAULT_CONFIG;
}

export function resetConfig(): ProcessingConfig {
  localStorage.removeItem(CONFIG_KEY);
  return DEFAULT_CONFIG;
}

// ============================================
// MANIFEST STORAGE FUNCTIONS
// ============================================

export function getStoredManifests(): ManifestStorage[] {
  try {
    const stored = localStorage.getItem(MANIFESTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    devError('Error loading manifests');
  }
  return [];
}

export function saveManifest(manifest: ManifestStorage): void {
  try {
    const manifests = getStoredManifests();
    // Avoid duplicates
    const existingIndex = manifests.findIndex(m => m.id === manifest.id);
    if (existingIndex >= 0) {
      manifests[existingIndex] = manifest;
    } else {
      manifests.push(manifest);
    }
    localStorage.setItem(MANIFESTS_KEY, JSON.stringify(manifests));
  } catch (error) {
    devError('Error saving manifest');
  }
}

export function deleteManifest(id: string): void {
  try {
    const manifests = getStoredManifests();
    const filtered = manifests.filter(m => m.id !== id);
    localStorage.setItem(MANIFESTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    devError('Error deleting manifest');
  }
}

export function getManifestById(id: string): ManifestStorage | undefined {
  return getStoredManifests().find(m => m.id === id);
}

export function getManifestByMawb(mawb: string): ManifestStorage | undefined {
  return getStoredManifests().find(m => m.mawb === mawb);
}
