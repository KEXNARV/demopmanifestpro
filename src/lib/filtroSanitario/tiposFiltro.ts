// ============================================
// TIPOS PARA EL FILTRO SANITARIO MINSA
// Dirección Nacional de Farmacia y Drogas
// ============================================

export type EstadoMINSA = 
  | 'CLEARED'           // No requiere revisión MINSA
  | 'REQUIRES_MINSA_CHECK' // Requiere verificación
  | 'PERSONAL_USE'      // Uso personal aprobado
  | 'COMMERCIAL_HOLD'   // Posible carga comercial - detenido
  | 'DOCUMENTS_REQUIRED' // Requiere documentos
  | 'PROHIBITED_GOODS'  // Productos prohibidos - rechazado
  | 'PENDING_DOCUMENTS'; // Esperando documentación

export type TipoImportacion = 'B2C' | 'B2B';

export interface DocumentoRequerido {
  id: string;
  tipo: 'receta_medica' | 'carta_relevo' | 'identificacion' | 'registro_sanitario' | 'licencia_importacion';
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  subido: boolean;
  archivoUrl?: string;
}

export interface ResultadoFiltroSanitario {
  paqueteId: string;
  trackingNumber: string;
  descripcion: string;
  estado: EstadoMINSA;
  tipoImportacion: TipoImportacion;
  keywordsDetectadas: string[];
  cantidadSospechosa: boolean;
  esProhibido: boolean;
  documentosRequeridos: DocumentoRequerido[];
  alertas: AlertaSanitaria[];
  fechaAnalisis: Date;
  requiereAccion: boolean;
  puedeProcesoLiquidacion: boolean;
}

export interface AlertaSanitaria {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'critical';
  titulo: string;
  mensaje: string;
  accionRequerida?: string;
}

export interface ConfiguracionFiltro {
  limiteUnidadesPersonal: number; // Máx unidades para uso personal (default: 6)
  limitePastillasPersonal: number; // Máx pastillas para uso personal (default: 500)
  modoEstricto: boolean;
  bloquearSinDocumentos: boolean;
}

// Keywords que activan el filtro MINSA
export const KEYWORDS_MINSA: string[] = [
  // Inglés
  'medicine', 'drug', 'pharmacy', 'vitamin', 'supplement', 'protein',
  'cosmetic', 'cream', 'lotion', 'shampoo', 'makeup', 'botox', 'filler',
  'dental', 'serum', 'pills', 'capsules', 'injectable', 'medication',
  'pharmaceutical', 'prescription', 'antibiotic', 'controlled',
  'tablet', 'syrup', 'ointment', 'gel', 'spray', 'drops', 'inhaler',
  'insulin', 'hormone', 'steroid', 'syringe', 'needle',
  // Español
  'medicamento', 'farmacia', 'vitamina', 'suplemento', 'proteina',
  'cosmetico', 'crema', 'locion', 'champu', 'maquillaje', 'dental',
  'pastillas', 'capsulas', 'inyectable', 'antibiotico', 'controlado',
  'tableta', 'jarabe', 'ungüento', 'pomada', 'gotas', 'inhalador',
  'insulina', 'hormona', 'esteroide', 'jeringa', 'aguja'
];

// Keywords que requieren receta médica obligatoria
export const KEYWORDS_RECETA_OBLIGATORIA: string[] = [
  'antibiotic', 'antibiotico', 'controlled', 'controlado',
  'injectable', 'inyectable', 'opioid', 'opioide', 'morphine', 'morfina',
  'codeine', 'codeina', 'tramadol', 'fentanyl', 'fentanilo',
  'testosterone', 'testosterona', 'insulin', 'insulina',
  'psychotropic', 'psicotropico', 'sedative', 'sedante',
  'benzodiazepine', 'benzodiazepina', 'amphetamine', 'anfetamina'
];

// Lista negra - productos prohibidos (AUTO-REJECT)
export const KEYWORDS_PROHIBIDOS: string[] = [
  'cannabis', 'thc', 'hemp', 'marijuana', 'marihuana',
  'pseudoephedrine', 'pseudoefedrina', 'poppers',
  'ephedrine', 'efedrina', 'ketamine', 'ketamina',
  'ghb', 'mdma', 'ecstasy', 'extasis', 'lsd',
  'cocaine', 'cocaina', 'heroin', 'heroina',
  'methamphetamine', 'metanfetamina', 'fentanyl precursor'
];

// Indicadores de cantidad comercial
export const INDICADORES_CANTIDAD_COMERCIAL: RegExp[] = [
  /(\d{2,})\s*(bottles?|botellas?)/i,
  /(\d{2,})\s*(boxes?|cajas?)/i,
  /(\d{3,})\s*(pills?|tablets?|pastillas?|tabletas?)/i,
  /(\d{2,})\s*(packs?|paquetes?)/i,
  /bulk|wholesale|mayoreo|granel/i,
  /(\d{2,})\s*(units?|unidades?)/i,
  /case\s+of|caja\s+de/i
];

export const CONFIG_DEFAULT: ConfiguracionFiltro = {
  limiteUnidadesPersonal: 6,
  limitePastillasPersonal: 500,
  modoEstricto: true,
  bloquearSinDocumentos: true
};
