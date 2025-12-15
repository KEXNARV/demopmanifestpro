export interface ManifestRow {
  id: string;
  trackingNumber: string;
  description: string;
  valueUSD: number;
  weight: number;
  recipient: string;
  address: string;
  category?: string;
  originalRowIndex: number;
  [key: string]: string | number | undefined;
}

export interface ProductCategory {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  icon: string;
  priority: number;
}

export interface ProcessingConfig {
  batchSize: number;
  valueTresholds: ValueThreshold[];
  categories: ProductCategory[];
  sortOrder: 'asc' | 'desc';
}

export interface ValueThreshold {
  id: string;
  name: string;
  minValue: number;
  maxValue: number;
}

export interface ProcessedBatch {
  id: string;
  name: string;
  valueCategory: string;
  productCategory: string;
  rows: ManifestRow[];
  stats: BatchStats;
}

export interface BatchStats {
  totalRows: number;
  totalValue: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
}

export interface ProcessingResult {
  batches: ProcessedBatch[];
  summary: ProcessingSummary;
  duplicates: ManifestRow[];
  warnings: ProcessingWarning[];
}

export interface ProcessingSummary {
  totalRows: number;
  totalBatches: number;
  totalValue: number;
  byValueCategory: Record<string, number>;
  byProductCategory: Record<string, number>;
  processedAt: Date;
}

export interface ProcessingWarning {
  type: 'duplicate' | 'missing_value' | 'invalid_format';
  message: string;
  rowIndex?: number;
  trackingNumber?: string;
}

export interface ColumnMapping {
  trackingNumber: string;
  description: string;
  valueUSD: string;
  weight: string;
  recipient: string;
  address: string;
}

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  {
    id: 'medication',
    name: 'Medicamentos',
    keywords: ['medicine', 'medication', 'drug', 'pharmaceutical', 'pill', 'tablet', 'capsule', 'medicamento', 'medicina', 'farmaco'],
    color: 'category-medication',
    icon: 'Pill',
    priority: 1,
  },
  {
    id: 'supplements',
    name: 'Suplementos Alimenticios',
    keywords: ['supplement', 'vitamin', 'protein', 'amino', 'omega', 'suplemento', 'vitamina', 'proteina', 'dietary'],
    color: 'category-supplements',
    icon: 'Leaf',
    priority: 2,
  },
  {
    id: 'medical',
    name: 'Productos Médicos',
    keywords: ['medical', 'healthcare', 'surgical', 'diagnostic', 'bandage', 'syringe', 'médico', 'sanitario', 'quirurgico'],
    color: 'category-medical',
    icon: 'Stethoscope',
    priority: 3,
  },
  {
    id: 'veterinary',
    name: 'Productos Veterinarios',
    keywords: ['veterinary', 'pet', 'animal', 'dog', 'cat', 'veterinario', 'mascota', 'perro', 'gato'],
    color: 'category-veterinary',
    icon: 'PawPrint',
    priority: 4,
  },
  {
    id: 'general',
    name: 'General/Otros',
    keywords: [],
    color: 'category-general',
    icon: 'Package',
    priority: 99,
  },
];

export const DEFAULT_VALUE_THRESHOLDS: ValueThreshold[] = [
  { id: 'low', name: 'Menor a $99.99', minValue: 0, maxValue: 99.99 },
  { id: 'high', name: '$100 o más', minValue: 100, maxValue: Infinity },
];

export const DEFAULT_CONFIG: ProcessingConfig = {
  batchSize: 5000,
  valueTresholds: DEFAULT_VALUE_THRESHOLDS,
  categories: DEFAULT_CATEGORIES,
  sortOrder: 'asc',
};
