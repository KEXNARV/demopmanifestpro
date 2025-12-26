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

// ============================================
// CÓDIGOS HTS FARMACÉUTICOS (Capítulo 30)
// Referencia primaria para clasificación
// ============================================
export const HTS_FARMACEUTICOS: string[] = [
  '3001', '3002', '3003', '3004', '3005', '3006' // Capítulo 30 completo
];

// Códigos HTS que NO son farmacéuticos pero pueden confundirse
export const HTS_EXCLUIDOS: string[] = [
  '3303', '3304', '3305', '3306', '3307', // Cosméticos y perfumería
  '2106', // Suplementos alimenticios
  '1806', // Chocolate
  '2105', // Helados
  '0901', '0902', // Café y té
  '6109', '6110', // Ropa
];

// ============================================
// KEYWORDS FARMACÉUTICAS DE ALTA CONFIANZA
// Solo términos que claramente indican medicamentos
// ============================================
export const KEYWORDS_MINSA_ALTA_CONFIANZA: string[] = [
  // Términos inequívocos
  'medicine', 'medication', 'pharmaceutical', 'prescription drug',
  'medicamento', 'medicamentos', 'farmaco', 'fármaco',
  
  // Antibióticos específicos
  'amoxicillin', 'amoxicilina', 'azithromycin', 'azitromicina',
  'ciprofloxacin', 'ciprofloxacino', 'metronidazole', 'metronidazol',
  'penicillin', 'penicilina', 'cephalexin', 'cefalexina',
  
  // Analgésicos con receta
  'tramadol', 'morphine', 'morfina', 'codeine', 'codeina',
  'oxycodone', 'oxicodona', 'hydrocodone', 'hidrocodona',
  
  // Cardiovasculares
  'losartan', 'enalapril', 'lisinopril', 'amlodipine', 'amlodipino',
  'metoprolol', 'atenolol', 'carvedilol', 'furosemide', 'furosemida',
  
  // Diabetes
  'metformin', 'metformina', 'insulin', 'insulina', 'glibenclamide',
  'sitagliptin', 'sitagliptina',
  
  // Gastrointestinales
  'omeprazole', 'omeprazol', 'pantoprazole', 'pantoprazol',
  'ranitidine', 'ranitidina',
  
  // Psicotrópicos
  'alprazolam', 'diazepam', 'clonazepam', 'lorazepam',
  'sertraline', 'sertralina', 'fluoxetine', 'fluoxetina',
  
  // Hormonales
  'levothyroxine', 'levotiroxina', 'prednisone', 'prednisona',
  'dexamethasone', 'dexametasona',
  
  // Formas farmacéuticas + contexto médico
  'rx only', 'prescription only', 'with prescription',
  'receta medica', 'venta bajo receta'
];

// Keywords que requieren contexto adicional
export const KEYWORDS_MINSA_CONTEXTO: string[] = [
  'vitamin', 'vitamins', 'vitamina', 'vitaminas',
  'supplement', 'supplements', 'suplemento', 'suplementos',
  'protein powder', 'proteina en polvo',
  'pills', 'capsules', 'pastillas', 'capsulas',
  'tablet', 'tablets', 'tableta', 'tabletas',
  'syrup', 'jarabe', 'drops', 'gotas'
];

// ============================================
// EXCLUSIONES - NO son farmacéuticos
// ============================================
export const EXCLUSIONES_FARMA: string[] = [
  // Alimentos con palabras confusas
  'ice cream', 'helado', 'cream cheese', 'queso crema',
  'sour cream', 'crema agria', 'whipped cream', 'crema batida',
  'cream puff', 'cream filling', 'coffee cream',
  'chocolate cream', 'crema de chocolate',
  
  // Cosméticos y cuidado personal (no MINSA)
  'face cream', 'crema facial', 'hand cream', 'crema de manos',
  'body cream', 'crema corporal', 'night cream', 'day cream',
  'eye cream', 'crema de ojos', 'anti aging cream',
  'moisturizing cream', 'crema hidratante', 'sunscreen',
  'protector solar', 'makeup', 'maquillaje', 'lipstick',
  'nail polish', 'esmalte', 'mascara', 'foundation',
  'concealer', 'eyeshadow', 'blush', 'bronzer',
  
  // Productos de limpieza
  'cleaning gel', 'gel limpiador', 'shower gel', 'gel de baño',
  'hair gel', 'gel para cabello', 'styling gel',
  'shaving cream', 'crema de afeitar',
  
  // Alimentos / suplementos deportivos
  'protein bar', 'barra de proteina', 'whey protein',
  'mass gainer', 'pre workout', 'bcaa', 'creatine', 'creatina',
  
  // Electrónica con palabras confusas
  'tablet computer', 'tablet pc', 'graphics tablet',
  'digital tablet', 'android tablet', 'ipad',
  
  // Otros no farmacéuticos
  'vitamin water', 'agua vitaminada', 'energy drink',
  'coloring', 'colorante', 'flavoring', 'saborizante',
  'gummy bear', 'gummy candy', 'gomitas', 'gummies candy',
  'candy vitamins', 'vitaminas de gomita',
  'pet food', 'comida mascota', 'dog food', 'cat food',
  'shampoo', 'champu', 'conditioner', 'acondicionador',
  'perfume', 'cologne', 'fragrance', 'fragancia',
  'deodorant', 'desodorante', 'toothpaste', 'pasta dental',
  'mouthwash', 'enjuague bucal', 'dental floss', 'hilo dental',
  'contact lens solution', 'solucion lentes contacto',
  
  // Ropa y accesorios
  'cream color', 'color crema', 'cream colored',
  'cream white', 'blanco crema', 'off white'
];

// Keywords que requieren receta médica obligatoria
export const KEYWORDS_RECETA_OBLIGATORIA: string[] = [
  'antibiotic', 'antibiotico', 'controlled substance',
  'injectable', 'inyectable', 'opioid', 'opioide',
  'morphine', 'morfina', 'codeine', 'codeina', 'tramadol',
  'fentanyl', 'fentanilo', 'testosterone', 'testosterona',
  'insulin', 'insulina', 'psychotropic', 'psicotropico',
  'sedative', 'sedante', 'benzodiazepine', 'benzodiazepina',
  'amphetamine', 'anfetamina', 'oxycodone', 'oxicodona',
  'hydrocodone', 'hidrocodona', 'alprazolam', 'diazepam',
  'clonazepam', 'lorazepam', 'zolpidem'
];

// Lista negra - productos prohibidos (AUTO-REJECT)
export const KEYWORDS_PROHIBIDOS: string[] = [
  'cannabis', 'thc', 'hemp extract', 'marijuana', 'marihuana',
  'pseudoephedrine', 'pseudoefedrina', 'poppers',
  'ephedrine', 'efedrina', 'ketamine', 'ketamina',
  'ghb', 'mdma', 'ecstasy', 'extasis', 'lsd',
  'cocaine', 'cocaina', 'heroin', 'heroina',
  'methamphetamine', 'metanfetamina', 'fentanyl precursor',
  'synthetic cannabinoid', 'cannabinoide sintetico',
  'bath salts drug', 'spice drug'
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

// Para compatibilidad con código existente
export const KEYWORDS_MINSA = KEYWORDS_MINSA_ALTA_CONFIANZA;
