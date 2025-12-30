// ============================================
// FORMATO OFICIAL DECLARACIÓN ADUANERA PANAMÁ
// Compatible con Sistema SIGA - ANA
// Basado en documentos reales ANA 2025
// ============================================

// ============================================
// CABECERA DE DECLARACIÓN
// ============================================
export interface CabeceraDeclaracion {
  declaracion_numero: string;          // Formato: DE{año}{mes}{día}{secuencial}-{digito_control} ej: DE2025122444677-9
  fecha_registro: string;              // Formato: DD/MM/YYYY
  tipo_operacion: TipoOperacion;
  tipo_despacho: TipoDespacho;
  aduana_entrada: AduanaEntrada;
  via_transporte: ViaTransporte;
  procedencia_destino: string;         // ESTADOS UNIDOS DE NORTEAMERICA
}

export type TipoOperacion = 
  | 'Importación Directa del Exterior'
  | 'Importación por Courier'
  | 'Importación Temporal'
  | 'Reimportación';

export type TipoDespacho = 
  | 'Normal'
  | 'Anticipado'
  | 'Urgente'
  | 'Diferido';

export type AduanaEntrada = 
  | 'AEROPUERTO CARGA TOCUMEN, PANAMA'
  | 'ZONA LIBRE DE COLON'
  | 'MUELLE FISCAL BALBOA'
  | 'MUELLE FISCAL CRISTOBAL'
  | 'PASO CANOAS'
  | 'GUABITO';

export type ViaTransporte = 
  | 'Aereo'
  | 'Maritimo'
  | 'Terrestre'
  | 'Multimodal';

// ============================================
// DATOS DE TRANSPORTE Y CONOCIMIENTO
// ============================================
export interface DatosTransporte {
  tipo_conocimiento: 'CAH' | 'BL' | 'AWB';  // CAH = Courier Air House
  fecha_conocimiento: string;               // Fecha del conocimiento de embarque
  mawb_madre: string;                       // Conocimiento madre: 90613352043
  hawb_hijo: string;                        // Conocimiento hijo: 202501018
  utilizacion_conocimiento: 'Total' | 'Parcial';
  peso_bruto_total_kgs: number;
  bultos_declarados: number;
  zona_recinto: string;                     // GIRAG PANAMA, S.A.
  consignante: string;                      // AMAZON
}

// ============================================
// SUJETOS INTERVINIENTES
// ============================================
export interface SujetosIntervinientes {
  importador: Importador;
  corredor_aduana?: CorredorAduana;
  agente_carga?: AgenteCarga;
}

export interface Importador {
  nombre: string;
  identificacion: string;           // RUC: 4-801-179 o E-8-142863
  tipo_persona: TipoPersona;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export type TipoPersona = 
  | 'Persona Natural'
  | 'Persona Jurídica';

export interface CorredorAduana {
  codigo: string;                   // Código del corredor: 190
  nombre: string;                   // XIOMARA ROSA CANO
  nombre_completo: string;          // 190 - XIOMARA ROSA CANO
  licencia?: string;
  firma_digital?: string;
  fecha_firma?: string;
}

export interface AgenteCarga {
  codigo: string;
  nombre: string;
  mawb: string;
}

// ============================================
// DETALLE DE ARTÍCULO (MERCANCÍA)
// ============================================
export interface ArticuloDeclaracion {
  numero_articulo: number;              // Secuencia: 1, 2, 3...
  fraccion_arancelaria: string;         // 12 dígitos: 330499900000
  descripcion_arancelaria: string;      // "Los demás"
  especificacion_mercancia: string;     // "MASCARILLA FACIAL PARA LA CARA"
  codigo_referencia?: string;           // AMZPSR019170328
  
  // Condición y origen
  condicion_mercancia: 'NUEVO' | 'USADO' | 'REACONDICIONADO';
  regimen_fundamento: string;           // 01-00
  pais_origen: string;                  // US, CN, etc.
  
  // Valores (USD)
  valor_fob: number;
  valor_flete: number;
  valor_seguro: number;
  valor_cif: number;
  
  // Pesos
  peso_bruto_kgs: number;
  peso_neto_kgs: number;
  
  // Comercialización
  cantidad: number;
  unidad_medida: string;                // u, kg, l
  litros?: number;                      // Para líquidos
  
  // Impuestos calculados
  impuestos: ImpuestosArticulo;
  
  // Acuerdos comerciales
  acuerdos?: AcuerdosComerciales;
  
  // Artículos seriados (vehículos, maquinaria)
  datos_seriados?: DatosSeriados;
}

export interface ImpuestosArticulo {
  // Impuesto de Importación (DAI) - En documentos aparece como "IMPORT /"
  dai_tarifa_percent: number;           // % Tarifa (ej: 6.5000, 15.0000)
  dai_calculado: number;                // Imp Calculado
  dai_a_pagar: number;                  // Imp a Pagar
  
  // Impuesto Selectivo al Consumo (ISC)
  isc_tarifa_percent: number;           // % Tarifa (usualmente 0.0000)
  isc_calculado: number;
  isc_a_pagar: number;
  
  // ITBM (Impuesto de Transferencia de Bienes Muebles) - 7%
  itbm_tarifa_percent: number;          // 7.0000
  itbm_calculado: number;
  itbm_a_pagar: number;
  
  // ICCDP (Impuesto por Control de Combustible y Derivados del Petróleo)
  iccdp_tarifa_percent: number;         // Usualmente 0.0000
  iccdp_calculado: number;
  iccdp_a_pagar: number;
}

export interface AcuerdosComerciales {
  pais?: string;
  tarifa_preferencial?: string;
  tipo?: string;                        // N.A.
  año?: string;
}

export interface DatosSeriados {
  serie_chasis_vin?: string;
  marca?: string;
  modelo?: string;
  motor?: string;
}

// ============================================
// TOTALES DE DECLARACIÓN
// ============================================
export interface TotalesDeclaracion {
  valor_fob_total: number;
  valor_flete_total: number;
  valor_seguro_total: number;
  valor_cif_total: number;
  
  // Tributos desglosados
  impuesto_importacion_total: number;   // DAI
  itbm_total: number;
  isc_total: number;
  iccdp_total: number;
  
  // Tasas
  tasa_uso_sistema: number;             // B/.3.00
  
  // Total a pagar
  total_a_pagar: number;
  
  // Recargos (si aplica)
  recargo_5_percent?: number;           // 5% después del vencimiento
  recargo_50_percent?: number;          // 50% después de 10 días
  total_con_recargo?: number;
  
  // Fianza (si aplica)
  pago_garantizado_fianza?: number;
  numero_documento_fianza?: string;
  fecha_fianza?: string;
}

// ============================================
// BOLETA DE PAGO
// ============================================
export interface BoletaPago {
  numero_control: string;               // 25127664537D
  fecha_impresion: string;              // DD/MM/YYYY
  
  empresa_importador: string;
  ruc: string;
  agente_corredor: string;
  
  // Líneas de formularios
  lineas: LineaBoletaPago[];
  
  // Escenarios de pago
  escenarios_pago: EscenariosPagoANA;
  
  // Nota al pie
  fecha_anulacion?: string;             // Fecha después de la cual se anula
}

export interface LineaBoletaPago {
  numero: number;
  fecha_registro: string;               // DD/MM/YYYY
  formulario: string;                   // DE2025122444677-9
  año: number;
  sector_rectificacion: number;         // 0
  monto_escenario_1: number;            // Monto a pagar hasta fecha 1
  monto_escenario_2: number;            // Monto a pagar hasta fecha 2
}

export interface EscenariosPagoANA {
  // Escenario 1: Pago puntual (5 días)
  normal: {
    monto: number;
    hasta_fecha: string;                // DD/MM/YYYY
  };
  // Escenario 2: Recargo 10% (después de 5 días, hasta 10 días)
  recargo_10_percent: {
    monto: number;
    hasta_fecha: string;
  };
  // Escenario 3: Recargo 20% (después de 10 días)
  recargo_20_percent: {
    monto: number;
    desde_fecha: string;
  };
}

// ============================================
// DECLARACIÓN OFICIAL COMPLETA
// ============================================
export interface DeclaracionOficial {
  cabecera: CabeceraDeclaracion;
  transporte: DatosTransporte;
  sujetos: SujetosIntervinientes;
  articulos: ArticuloDeclaracion[];
  totales: TotalesDeclaracion;
  
  // Pre-declaración
  numero_predeclaracion?: string;
  cantidad_articulos: number;
  observacion?: string;
  documentos_apoyo?: string;            // Código de documentos
  
  // Firma electrónica SIGA
  firma_electronica_siga?: string;
  
  // Metadatos del sistema
  metadata?: DeclaracionMetadata;
}

export interface DeclaracionMetadata {
  version: string;
  generado_por: string;
  fecha_generacion: string;
  hash_integridad?: string;
  pagina_actual?: number;
  total_paginas?: number;
}

// ============================================
// CONSTANTES OFICIALES ANA
// ============================================
export const CONSTANTES_ANA = {
  // Tasas fijas
  TASA_USO_SISTEMA: 3.00,               // B/.3.00 - Tasa SIGA
  
  // Impuestos estándar
  ITBM_STANDARD: 7.0000,                // 7%
  
  // Seguro teórico si no se declara
  SEGURO_TEORICO_PERCENT: 1.00,
  
  // Umbrales según normativa
  UMBRAL_DE_MINIMIS: 100.00,
  UMBRAL_CORREDOR_OBLIGATORIO: 2000.00,
  
  // Días para recargos (desde fecha de registro)
  DIAS_PAGO_PUNTUAL: 5,                 // 5 días hábiles para pago sin recargo
  DIAS_RECARGO_10: 10,                  // Hasta 10 días = 10% recargo
  
  // Porcentajes de recargo
  RECARGO_1_PERCENT: 10,                // 10% después de 5 días
  RECARGO_2_PERCENT: 20,                // 20% después de 10 días
  
  // Formato de números
  DECIMALES_MONETARIOS: 2,
  DECIMALES_PESO: 3,
  DECIMALES_TARIFA: 4,
  
  // Aduanas de entrada
  ADUANAS: {
    TOCUMEN: 'AEROPUERTO CARGA TOCUMEN, PANAMA',
    ZLC: 'ZONA LIBRE DE COLON',
    BALBOA: 'MUELLE FISCAL BALBOA',
    CRISTOBAL: 'MUELLE FISCAL CRISTOBAL',
    PASO_CANOAS: 'PASO CANOAS',
    GUABITO: 'GUABITO'
  } as const,
  
  // Zonas/Recintos comunes
  RECINTOS: {
    GIRAG: 'GIRAG PANAMA, S.A.',
    MANZANILLO: 'MANZANILLO INTERNATIONAL TERMINAL',
    PSA: 'PSA PANAMA'
  } as const,
  
  // Países de origen comunes
  PAISES: {
    US: 'ESTADOS UNIDOS DE NORTEAMERICA',
    CN: 'CHINA',
    MX: 'MEXICO',
    DE: 'ALEMANIA',
    JP: 'JAPON'
  } as const,
  
  // Autoridades reguladoras por capítulo SA
  AUTORIDADES_POR_CAPITULO: {
    // MINSA - Productos de salud
    '30': { autoridad: 'MINSA', descripcion: 'Productos farmacéuticos' },
    '33': { autoridad: 'MINSA', descripcion: 'Aceites esenciales y cosméticos' },
    '90': { autoridad: 'MINSA', descripcion: 'Instrumentos médicos y ópticos' },
    
    // APA/MIDA - Alimentos y Agro
    '01': { autoridad: 'APA', descripcion: 'Animales vivos' },
    '02': { autoridad: 'APA', descripcion: 'Carne y despojos' },
    '03': { autoridad: 'APA', descripcion: 'Pescados y mariscos' },
    '04': { autoridad: 'APA', descripcion: 'Leche y productos lácteos' },
    '05': { autoridad: 'APA', descripcion: 'Productos de origen animal' },
    '06': { autoridad: 'MIDA', descripcion: 'Plantas vivas' },
    '07': { autoridad: 'MIDA', descripcion: 'Hortalizas' },
    '08': { autoridad: 'MIDA', descripcion: 'Frutas' },
    '09': { autoridad: 'MIDA', descripcion: 'Café, té y especias' },
    '10': { autoridad: 'MIDA', descripcion: 'Cereales' },
    '11': { autoridad: 'MIDA', descripcion: 'Molinería' },
    '12': { autoridad: 'MIDA', descripcion: 'Semillas oleaginosas' },
    '15': { autoridad: 'APA', descripcion: 'Grasas y aceites' },
    '16': { autoridad: 'APA', descripcion: 'Preparaciones de carne' },
    '17': { autoridad: 'APA', descripcion: 'Azúcares' },
    '18': { autoridad: 'APA', descripcion: 'Cacao' },
    '19': { autoridad: 'APA', descripcion: 'Cereales preparados' },
    '20': { autoridad: 'APA', descripcion: 'Preparaciones de legumbres' },
    '21': { autoridad: 'APA', descripcion: 'Preparaciones alimenticias' },
    '22': { autoridad: 'APA', descripcion: 'Bebidas' },
    '23': { autoridad: 'APA', descripcion: 'Residuos industria alimentaria' },
    '24': { autoridad: 'APA', descripcion: 'Tabaco' },
    
    // ANA-DPFA - Químicos y precursores
    '28': { autoridad: 'ANA-DPFA', descripcion: 'Productos químicos inorgánicos' },
    '29': { autoridad: 'ANA-DPFA', descripcion: 'Productos químicos orgánicos' },
    
    // ACODECO - Normas técnicas
    '84': { autoridad: 'ACODECO', descripcion: 'Maquinaria y aparatos mecánicos' },
    '85': { autoridad: 'ACODECO', descripcion: 'Aparatos eléctricos' }
  } as const
};

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

/**
 * Genera número de declaración en formato oficial ANA
 * Formato: DE{año}{mes}{día}{secuencial}-{digito_control} {rectificacion}
 * Ejemplo: DE2025122444677-9 0
 */
export function generarNumeroDeclaracion(secuencial: number, rectificacion: number = 0): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(secuencial).padStart(5, '0');
  
  // Calcular dígito de control (módulo 11)
  const base = `${year}${month}${day}${seq}`;
  let sum = 0;
  const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2];
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[base.length - 1 - i]) * weights[i % weights.length];
  }
  const control = 11 - (sum % 11);
  const digitoControl = control === 11 ? 0 : control === 10 ? 1 : control;
  
  return `DE${year}${month}${day}${seq}-${digitoControl}`;
}

/**
 * Genera número de control de boleta
 * Formato: {año}{julianDay}{secuencial}{letra}
 * Ejemplo: 25127664537D
 */
export function generarNumeroControlBoleta(secuencial: number): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  
  // Día juliano (1-366)
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const seq = String(secuencial).padStart(6, '0');
  
  // Letra de control (A-Z basado en secuencial)
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O
  const letterIndex = secuencial % letters.length;
  const letter = letters[letterIndex];
  
  return `${year}${String(dayOfYear).padStart(3, '0')}${seq}${letter}`;
}

/**
 * Formatea fecha en formato ANA: DD/MM/YYYY
 */
export function formatearFechaANA(fecha: Date): string {
  const day = String(fecha.getDate()).padStart(2, '0');
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const year = fecha.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calcula fechas de vencimiento según normativa ANA
 * @param fechaRegistro Fecha de registro de la declaración
 */
export function calcularVencimientosANA(fechaRegistro: Date): EscenariosPagoANA {
  // Fecha límite pago puntual (5 días hábiles)
  const fechaPuntual = agregarDiasHabiles(fechaRegistro, CONSTANTES_ANA.DIAS_PAGO_PUNTUAL);
  
  // Fecha límite recargo 10% (10 días desde registro)
  const fechaRecargo10 = agregarDiasHabiles(fechaRegistro, CONSTANTES_ANA.DIAS_RECARGO_10);
  
  // Después de 10 días = 20%
  const fechaRecargo20 = new Date(fechaRecargo10);
  fechaRecargo20.setDate(fechaRecargo20.getDate() + 1);
  
  return {
    normal: {
      monto: 0, // Se calcula después
      hasta_fecha: formatearFechaANA(fechaPuntual)
    },
    recargo_10_percent: {
      monto: 0,
      hasta_fecha: formatearFechaANA(fechaRecargo10)
    },
    recargo_20_percent: {
      monto: 0,
      desde_fecha: formatearFechaANA(fechaRecargo20)
    }
  };
}

/**
 * Agrega días hábiles a una fecha (excluye sábados y domingos)
 */
function agregarDiasHabiles(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  let diasAgregados = 0;
  
  while (diasAgregados < dias) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    // Si no es sábado (6) ni domingo (0)
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }
  
  return resultado;
}

/**
 * Formatea fracción arancelaria a 12 dígitos
 */
export function formatearFraccionArancelaria(hsCode: string): string {
  const clean = hsCode.replace(/\D/g, '');
  return clean.padEnd(12, '0');
}

/**
 * Formatea RUC/Cédula panameña
 */
export function formatearIdentificacion(id: string): string {
  if (!id) return '';
  
  // Limpiar caracteres no válidos
  const clean = id.replace(/[^0-9E-]/gi, '').toUpperCase();
  
  // Si ya tiene formato correcto
  if (/^E?-?\d{1,2}-\d{1,4}-\d{1,6}$/.test(clean)) {
    return clean;
  }
  
  // Detectar si es extranjero (E-)
  if (clean.startsWith('E')) {
    const digits = clean.replace(/[^0-9]/g, '');
    if (digits.length >= 5) {
      const tomo = digits.substring(0, 1);
      const asiento = digits.substring(1);
      return `E-${tomo}-${asiento}`;
    }
  }
  
  // Cédula nacional
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length >= 7) {
    const provincia = digits.substring(0, 1);
    const tomo = digits.substring(1, 4);
    const asiento = digits.substring(4);
    return `${provincia}-${tomo}-${asiento}`;
  }
  
  return id;
}

/**
 * Formatea monto en formato panameño
 */
export function formatearMontoANA(monto: number): string {
  return `$${monto.toFixed(CONSTANTES_ANA.DECIMALES_MONETARIOS)}`;
}

/**
 * Formatea peso en formato ANA (3 decimales)
 */
export function formatearPesoANA(pesoKgs: number): string {
  return pesoKgs.toFixed(CONSTANTES_ANA.DECIMALES_PESO);
}

/**
 * Formatea tarifa en formato ANA (4 decimales)
 */
export function formatearTarifaANA(tarifa: number): string {
  return tarifa.toFixed(CONSTANTES_ANA.DECIMALES_TARIFA);
}

/**
 * Detecta autoridad reguladora por código SA
 */
export function detectarAutoridadPorCapitulo(hsCode: string): {
  autoridad: string;
  descripcion: string;
} | null {
  if (!hsCode || hsCode.length < 2) return null;
  
  const capitulo = hsCode.substring(0, 2);
  const info = CONSTANTES_ANA.AUTORIDADES_POR_CAPITULO[capitulo as keyof typeof CONSTANTES_ANA.AUTORIDADES_POR_CAPITULO];
  
  if (!info) return null;
  
  return {
    autoridad: info.autoridad,
    descripcion: info.descripcion
  };
}

// Tipos legacy para compatibilidad
export type {
  ArticuloDeclaracion as DetalleMercancia,
  ImpuestosArticulo as ImpuestosMercancia,
  EscenariosPagoANA as EscenariosPago
};

export interface RestriccionMercancia {
  autoridad: 'MINSA' | 'APA' | 'MIDA' | 'ACODECO' | 'ANA-DPFA' | 'ANAM';
  tipo: string;
  descripcion: string;
  requiere_permiso: boolean;
  capitulo_sa?: string;
}

// Alias para compatibilidad con código existente
export const CONSTANTES_DECLARACION = CONSTANTES_ANA;

export interface EscenarioPago {
  monto: number;
  hasta?: string;
  desde?: string;
}

export interface BoletaPagoResumen {
  total_liquidado: number;
  total_impuestos: number;
  tasa_siga: number;
  tasa_formulario: number;
  otros_cargos?: number;
  vencimiento_escenarios: {
    normal: EscenarioPago;
    recargo_1: EscenarioPago;
    recargo_2: EscenarioPago;
  };
}
