/**
 * Validador de Guías - Detecta uso incorrecto de MAWB vs Guía Individual
 * 
 * REGLA CRÍTICA: El análisis de consignatarios, impuestos, valores y descripción
 * debe realizarse por GUÍA INDIVIDUAL del paquete (Amazon, courier local),
 * NO por la guía aérea master (MAWB).
 */

import { z } from 'zod';

// ============================================
// PATRONES DE DETECCIÓN
// ============================================

/**
 * Patrón MAWB (Master Air Waybill) - Formato IATA
 * Formato: XXX-XXXXXXXX (3 dígitos prefijo aerolínea - 8 dígitos número)
 * Ejemplos: 057-12345678, 729-87654321
 */
const MAWB_PATTERN = /^\d{3}-\d{8}$/;

/**
 * Patrón MAWB alternativo sin guión
 * Formato: 11 dígitos consecutivos que empiezan con prefijo de aerolínea conocido
 */
const MAWB_PATTERN_NO_DASH = /^(057|074|105|129|139|172|180|205|220|230|232|235|238|239|244|245|257|279|293|297|315|316|369|403|412|509|537|540|555|566|589|607|618|632|695|729|738|744|755|784|826|831|880|906|932|988)\d{8}$/;

/**
 * Prefijos IATA de aerolíneas comunes en carga
 */
const AIRLINE_PREFIXES: Record<string, string> = {
  '057': 'Air France',
  '074': 'KLM',
  '105': 'Avianca',
  '129': 'Copa Airlines',
  '139': 'Iberia',
  '172': 'Lufthansa',
  '180': 'Korean Air',
  '205': 'Emirates',
  '220': 'Qatar Airways',
  '230': 'DHL Aviation',
  '232': 'FedEx',
  '235': 'Turkish Airlines',
  '238': 'Singapore Airlines',
  '239': 'UPS Airlines',
  '244': 'Ethiopian Airlines',
  '245': 'Cathay Pacific',
  '257': 'LATAM',
  '279': 'American Airlines Cargo',
  '729': 'Copa Airlines',
  '880': 'Amazon Air',
  '906': 'Skynet Worldwide Express',
};

/**
 * Patrones de guías individuales válidas (Amazon, couriers, etc.)
 */
const VALID_TRACKING_PATTERNS = [
  // Amazon - TBA seguido de números
  /^TBA\d{12,}$/i,
  // Amazon - 1Z seguido de código UPS
  /^1Z[A-Z0-9]{16}$/i,
  // FedEx - 12-22 dígitos
  /^\d{12,22}$/,
  // UPS - 1Z + 16 caracteres alfanuméricos
  /^1Z[A-Z0-9]{16}$/i,
  // DHL - 10-11 dígitos
  /^\d{10,11}$/,
  // USPS - 20-22 dígitos o letras + números
  /^[A-Z]{2}\d{9}[A-Z]{2}$/i,
  /^\d{20,22}$/,
  // Courier local - alfanumérico general
  /^[A-Z0-9]{8,30}$/i,
];

// ============================================
// TIPOS Y ESQUEMAS
// ============================================

export interface ValidacionGuia {
  esValida: boolean;
  esMAWB: boolean;
  esPosibleMAWB: boolean;
  advertencias: string[];
  errores: string[];
  sugerencias: string[];
  aerolineaDetectada?: string;
  tipoGuia: 'individual' | 'mawb' | 'desconocido';
  confianza: number;
}

export interface ResultadoValidacionLote {
  totalGuias: number;
  guiasValidas: number;
  guiasInvalidas: number;
  mawbsDetectados: number;
  duplicados: string[];
  advertencias: string[];
  errores: string[];
  detalles: Map<string, ValidacionGuia>;
}

// Esquema Zod para validación de guía individual
export const guiaIndividualSchema = z.string()
  .trim()
  .min(5, { message: 'La guía debe tener al menos 5 caracteres' })
  .max(50, { message: 'La guía no debe exceder 50 caracteres' })
  .refine(
    (val) => !esMAWB(val),
    { message: 'Esta guía parece ser un MAWB. Use la guía individual del paquete, no la guía aérea master.' }
  );

// ============================================
// FUNCIONES DE DETECCIÓN
// ============================================

/**
 * Detecta si una guía es un MAWB (Master Air Waybill)
 */
export function esMAWB(guia: string): boolean {
  const guiaNormalizada = guia.trim().toUpperCase();
  
  // Patrón exacto MAWB con guión
  if (MAWB_PATTERN.test(guiaNormalizada)) {
    return true;
  }
  
  // Patrón MAWB sin guión pero con prefijo de aerolínea conocido
  if (MAWB_PATTERN_NO_DASH.test(guiaNormalizada)) {
    return true;
  }
  
  return false;
}

/**
 * Detecta si una guía podría ser un MAWB (detección heurística)
 */
export function posibleMAWB(guia: string): { esPosible: boolean; razon: string; confianza: number } {
  const guiaNormalizada = guia.trim();
  
  // Si es exactamente 11 dígitos, podría ser MAWB sin guión
  if (/^\d{11}$/.test(guiaNormalizada)) {
    const prefijo = guiaNormalizada.substring(0, 3);
    if (AIRLINE_PREFIXES[prefijo]) {
      return {
        esPosible: true,
        razon: `Parece un MAWB de ${AIRLINE_PREFIXES[prefijo]} (prefijo ${prefijo})`,
        confianza: 95
      };
    }
    return {
      esPosible: true,
      razon: 'Formato de 11 dígitos coincide con estructura MAWB',
      confianza: 70
    };
  }
  
  // Si contiene guión en posición típica de MAWB
  if (/^\d{3}-\d+$/.test(guiaNormalizada) && guiaNormalizada.length >= 10) {
    return {
      esPosible: true,
      razon: 'Formato XXX-XXXXXXXX típico de MAWB',
      confianza: 90
    };
  }
  
  return { esPosible: false, razon: '', confianza: 0 };
}

/**
 * Obtiene información de la aerolínea desde un MAWB
 */
export function obtenerAerolineaDeMAWB(mawb: string): string | undefined {
  const prefijo = mawb.replace('-', '').substring(0, 3);
  return AIRLINE_PREFIXES[prefijo];
}

/**
 * Valida una guía individual de paquete
 */
export function validarGuiaIndividual(guia: string): ValidacionGuia {
  const guiaNormalizada = guia.trim();
  const resultado: ValidacionGuia = {
    esValida: true,
    esMAWB: false,
    esPosibleMAWB: false,
    advertencias: [],
    errores: [],
    sugerencias: [],
    tipoGuia: 'desconocido',
    confianza: 0
  };
  
  // Validación básica
  if (!guiaNormalizada || guiaNormalizada.length < 5) {
    resultado.esValida = false;
    resultado.errores.push('La guía está vacía o es muy corta');
    return resultado;
  }
  
  if (guiaNormalizada.length > 50) {
    resultado.esValida = false;
    resultado.errores.push('La guía excede el largo máximo permitido (50 caracteres)');
    return resultado;
  }
  
  // Detectar si es MAWB
  if (esMAWB(guiaNormalizada)) {
    resultado.esValida = false;
    resultado.esMAWB = true;
    resultado.tipoGuia = 'mawb';
    resultado.aerolineaDetectada = obtenerAerolineaDeMAWB(guiaNormalizada);
    resultado.errores.push(
      `❌ MAWB DETECTADO: "${guiaNormalizada}" es una guía aérea master` +
      (resultado.aerolineaDetectada ? ` de ${resultado.aerolineaDetectada}` : '') +
      '. Use la guía individual del paquete (Amazon, courier local).'
    );
    resultado.sugerencias.push(
      'Busque la columna con guías individuales como: TBA..., 1Z..., o números de tracking del courier'
    );
    resultado.confianza = 95;
    return resultado;
  }
  
  // Detectar posible MAWB
  const posible = posibleMAWB(guiaNormalizada);
  if (posible.esPosible) {
    resultado.esPosibleMAWB = true;
    resultado.advertencias.push(
      `⚠️ POSIBLE MAWB: ${posible.razon}. Verifique que está usando la guía individual del paquete.`
    );
    resultado.confianza = posible.confianza;
  }
  
  // Validar formato de guía individual
  const esFormatoValido = VALID_TRACKING_PATTERNS.some(pattern => pattern.test(guiaNormalizada));
  
  if (esFormatoValido) {
    resultado.tipoGuia = 'individual';
    resultado.confianza = Math.max(resultado.confianza, 85);
  } else if (!resultado.esPosibleMAWB) {
    resultado.advertencias.push(
      'Formato de guía no reconocido. Verifique que sea una guía individual válida.'
    );
    resultado.confianza = 50;
  }
  
  return resultado;
}

/**
 * Valida un lote de guías y detecta problemas
 */
export function validarLoteGuias(guias: string[]): ResultadoValidacionLote {
  const resultado: ResultadoValidacionLote = {
    totalGuias: guias.length,
    guiasValidas: 0,
    guiasInvalidas: 0,
    mawbsDetectados: 0,
    duplicados: [],
    advertencias: [],
    errores: [],
    detalles: new Map()
  };
  
  const guiasVistas = new Map<string, number>();
  const mawbsUnicos = new Set<string>();
  
  guias.forEach((guia, index) => {
    const guiaNormalizada = guia.trim().toUpperCase();
    
    // Detectar duplicados
    if (guiasVistas.has(guiaNormalizada)) {
      resultado.duplicados.push(guiaNormalizada);
    } else {
      guiasVistas.set(guiaNormalizada, index);
    }
    
    // Validar guía
    const validacion = validarGuiaIndividual(guia);
    resultado.detalles.set(guia, validacion);
    
    if (validacion.esValida) {
      resultado.guiasValidas++;
    } else {
      resultado.guiasInvalidas++;
      validacion.errores.forEach(err => {
        if (!resultado.errores.includes(err)) {
          resultado.errores.push(err);
        }
      });
    }
    
    if (validacion.esMAWB) {
      mawbsUnicos.add(guiaNormalizada);
    }
    
    validacion.advertencias.forEach(adv => {
      if (!resultado.advertencias.includes(adv)) {
        resultado.advertencias.push(adv);
      }
    });
  });
  
  resultado.mawbsDetectados = mawbsUnicos.size;
  
  // Advertencias especiales
  if (resultado.mawbsDetectados > 0) {
    resultado.errores.unshift(
      `🚨 ALERTA CRÍTICA: Se detectaron ${resultado.mawbsDetectados} MAWB(s) siendo usados como guías individuales. ` +
      'El análisis debe realizarse por guía individual del paquete, NO por MAWB.'
    );
  }
  
  if (resultado.duplicados.length > 0) {
    resultado.advertencias.push(
      `Se encontraron ${resultado.duplicados.length} guías duplicadas. ` +
      'Cada paquete debe tener una guía individual única.'
    );
  }
  
  // Detectar si todas las guías son iguales (probable error de columna)
  if (guias.length > 1 && mawbsUnicos.size === 1 && resultado.mawbsDetectados === guias.length) {
    resultado.errores.push(
      '🔴 ERROR DE COLUMNA: Todas las filas tienen el mismo MAWB. ' +
      'Probablemente seleccionó la columna de guía aérea master en lugar de la columna de guías individuales.'
    );
  }
  
  return resultado;
}

/**
 * Genera un reporte de validación para mostrar al usuario
 */
export function generarReporteValidacion(resultado: ResultadoValidacionLote): string {
  const lineas: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    REPORTE DE VALIDACIÓN DE GUÍAS',
    '═══════════════════════════════════════════════════════════════',
    '',
    `📊 Total de guías analizadas: ${resultado.totalGuias}`,
    `✅ Guías válidas: ${resultado.guiasValidas}`,
    `❌ Guías inválidas: ${resultado.guiasInvalidas}`,
    `⚠️ MAWBs detectados como guía: ${resultado.mawbsDetectados}`,
    `🔄 Duplicados encontrados: ${resultado.duplicados.length}`,
    ''
  ];
  
  if (resultado.errores.length > 0) {
    lineas.push('═══════════════════════════════════════════════════════════════');
    lineas.push('                         ERRORES');
    lineas.push('═══════════════════════════════════════════════════════════════');
    resultado.errores.forEach(err => lineas.push(`  ${err}`));
    lineas.push('');
  }
  
  if (resultado.advertencias.length > 0) {
    lineas.push('═══════════════════════════════════════════════════════════════');
    lineas.push('                       ADVERTENCIAS');
    lineas.push('═══════════════════════════════════════════════════════════════');
    resultado.advertencias.forEach(adv => lineas.push(`  ${adv}`));
    lineas.push('');
  }
  
  lineas.push('═══════════════════════════════════════════════════════════════');
  lineas.push('RECORDATORIO: El análisis de consignatarios, impuestos y valores');
  lineas.push('debe realizarse por GUÍA INDIVIDUAL del paquete (Amazon, courier),');
  lineas.push('NO por la guía aérea master (MAWB).');
  lineas.push('═══════════════════════════════════════════════════════════════');
  
  return lineas.join('\n');
}
