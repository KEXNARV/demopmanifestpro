/**
 * ManifestRow - Representa un paquete individual en el manifiesto
 * 
 * IMPORTANTE: El análisis se realiza por GUÍA INDIVIDUAL (trackingNumber),
 * NO por la guía aérea master (MAWB). El MAWB solo es referencia del envío consolidado.
 * 
 * - trackingNumber: Guía individual del paquete (Amazon, courier local, etc.)
 * - mawb: (opcional) Guía aérea master - solo referencia del manifiesto
 */
export interface ManifestRow {
  id: string;
  /** Guía individual del paquete (Amazon tracking, courier local) - IDENTIFICADOR ÚNICO para análisis */
  trackingNumber: string;
  /** Guía aérea master - SOLO REFERENCIA del manifiesto, NO se usa para análisis individual */
  mawb?: string;
  description: string;
  valueUSD: number;
  weight: number;
  recipient: string;
  address: string;
  category?: string;
  originalRowIndex: number;
  // Geographic fields (original from Excel)
  province?: string;
  city?: string;
  district?: string;
  // Detected geographic fields (auto-detected)
  detectedProvince?: string;
  detectedCity?: string;
  detectedRegion?: string;
  geoConfidence?: number;
  // Consignee fields
  consigneeId?: string;
  normalizedRecipient?: string;
  phone?: string;
  identification?: string;
  // GTIN validation fields
  gtinCodigos?: string[];
  gtinValido?: boolean;
  gtinErrores?: string[];
  gtinPaisOrigen?: string;
  requiereRevisionGTIN?: boolean;
  [key: string]: string | number | boolean | string[] | undefined;
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
  type: 'duplicate' | 'missing_value' | 'invalid_format' | 'invalid_gtin';
  message: string;
  rowIndex?: number;
  trackingNumber?: string;
  gtinCodigo?: string;
}

export interface ColumnMapping {
  trackingNumber: string;
  description: string;
  valueUSD: string;
  weight: string;
  recipient: string;
  address: string;
  // Optional geographic columns
  province?: string;
  city?: string;
  district?: string;
  // Optional consignee columns
  phone?: string;
  identification?: string;
}

// Consignee types
export interface Consignee {
  id: string;
  name: string;
  normalizedName: string;
  phone?: string;
  identification?: string;
  addresses: string[];
  packages: ManifestRow[];
  totalPackages: number;
  totalWeight: number;
  totalValue: number;
  isConsolidatable: boolean;
  provinces: string[];
  cities: string[];
}

export interface ConsigneeStats {
  totalConsignees: number;
  consolidatableConsignees: number;
  consolidatablePackages: number;
  avgPackagesPerConsignee: number;
  topConsignees: Consignee[];
  consolidationSavings: number;
}

export interface ConsolidatedDelivery {
  consignee: Consignee;
  packages: ManifestRow[];
  deliveryAddress: string;
  province: string;
  city: string;
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
