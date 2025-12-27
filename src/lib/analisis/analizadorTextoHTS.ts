// ============================================
// ANALIZADOR DE TEXTO PROFUNDO PARA HTS
// Analiza descripciones de manifiesto y line items de facturas
// Detecta discrepancias entre HTS sugerido y palabras técnicas
// ============================================

import { ManifestRow } from '@/types/manifest';
import { FacturaComercial } from '@/types/aduanas';
import { devLog, devWarn } from '@/lib/logger';

// Palabras técnicas que requieren revisión HTS
export const PALABRAS_TECNICAS_HTS: Record<string, { 
  capitulos: string[]; 
  autoridad?: string;
  descripcion: string;
  requiereRevision: boolean;
}> = {
  // Químicos - Requieren capítulos 28-29
  'chemical': { capitulos: ['28', '29'], autoridad: 'MINSA', descripcion: 'Producto químico', requiereRevision: true },
  'quimico': { capitulos: ['28', '29'], autoridad: 'MINSA', descripcion: 'Producto químico', requiereRevision: true },
  'químico': { capitulos: ['28', '29'], autoridad: 'MINSA', descripcion: 'Producto químico', requiereRevision: true },
  'acid': { capitulos: ['28', '29'], autoridad: 'MINSA', descripcion: 'Ácido', requiereRevision: true },
  'acido': { capitulos: ['28', '29'], autoridad: 'MINSA', descripcion: 'Ácido', requiereRevision: true },
  'solvent': { capitulos: ['29', '38'], autoridad: 'MINSA', descripcion: 'Solvente', requiereRevision: true },
  'reagent': { capitulos: ['38'], autoridad: 'MINSA', descripcion: 'Reactivo', requiereRevision: true },
  'reactivo': { capitulos: ['38'], autoridad: 'MINSA', descripcion: 'Reactivo', requiereRevision: true },
  
  // Médico/Farmacéutico - Requieren capítulos 30, 90
  'medical': { capitulos: ['30', '90'], autoridad: 'MINSA', descripcion: 'Dispositivo médico', requiereRevision: true },
  'medico': { capitulos: ['30', '90'], autoridad: 'MINSA', descripcion: 'Dispositivo médico', requiereRevision: true },
  'médico': { capitulos: ['30', '90'], autoridad: 'MINSA', descripcion: 'Dispositivo médico', requiereRevision: true },
  'pharmaceutical': { capitulos: ['30'], autoridad: 'MINSA', descripcion: 'Farmacéutico', requiereRevision: true },
  'farmaceutico': { capitulos: ['30'], autoridad: 'MINSA', descripcion: 'Farmacéutico', requiereRevision: true },
  'surgical': { capitulos: ['90'], autoridad: 'MINSA', descripcion: 'Quirúrgico', requiereRevision: true },
  'quirurgico': { capitulos: ['90'], autoridad: 'MINSA', descripcion: 'Quirúrgico', requiereRevision: true },
  'diagnostic': { capitulos: ['90', '38'], autoridad: 'MINSA', descripcion: 'Diagnóstico', requiereRevision: true },
  'diagnostico': { capitulos: ['90', '38'], autoridad: 'MINSA', descripcion: 'Diagnóstico', requiereRevision: true },
  'therapy': { capitulos: ['90'], autoridad: 'MINSA', descripcion: 'Terapéutico', requiereRevision: true },
  'terapia': { capitulos: ['90'], autoridad: 'MINSA', descripcion: 'Terapéutico', requiereRevision: true },
  
  // Radio/Electrónica especializada - Capítulos 85, 90
  'radio': { capitulos: ['85', '90'], autoridad: 'ASEP', descripcion: 'Equipo de radio', requiereRevision: true },
  'radioactive': { capitulos: ['28'], autoridad: 'MINSA', descripcion: 'Material radioactivo', requiereRevision: true },
  'radioactivo': { capitulos: ['28'], autoridad: 'MINSA', descripcion: 'Material radioactivo', requiereRevision: true },
  'transmitter': { capitulos: ['85'], autoridad: 'ASEP', descripcion: 'Transmisor', requiereRevision: true },
  'transmisor': { capitulos: ['85'], autoridad: 'ASEP', descripcion: 'Transmisor', requiereRevision: true },
  'frequency': { capitulos: ['85'], descripcion: 'Equipo de frecuencia', requiereRevision: true },
  'frecuencia': { capitulos: ['85'], descripcion: 'Equipo de frecuencia', requiereRevision: true },
  
  // Armas y seguridad - Capítulos 93
  'weapon': { capitulos: ['93'], autoridad: 'MINGOB', descripcion: 'Arma', requiereRevision: true },
  'arma': { capitulos: ['93'], autoridad: 'MINGOB', descripcion: 'Arma', requiereRevision: true },
  'ammunition': { capitulos: ['93'], autoridad: 'MINGOB', descripcion: 'Munición', requiereRevision: true },
  'municion': { capitulos: ['93'], autoridad: 'MINGOB', descripcion: 'Munición', requiereRevision: true },
  
  // Explosivos - Capítulo 36
  'explosive': { capitulos: ['36'], autoridad: 'MINGOB', descripcion: 'Explosivo', requiereRevision: true },
  'explosivo': { capitulos: ['36'], autoridad: 'MINGOB', descripcion: 'Explosivo', requiereRevision: true },
  'pyrotechnic': { capitulos: ['36'], autoridad: 'MINGOB', descripcion: 'Pirotécnico', requiereRevision: true },
  'pirotecnico': { capitulos: ['36'], autoridad: 'MINGOB', descripcion: 'Pirotécnico', requiereRevision: true },
  
  // Precursores y controlados
  'precursor': { capitulos: ['28', '29'], autoridad: 'MINGOB', descripcion: 'Precursor químico', requiereRevision: true },
  'controlled substance': { capitulos: ['30'], autoridad: 'MINSA', descripcion: 'Sustancia controlada', requiereRevision: true },
  'narcotic': { capitulos: ['30'], autoridad: 'MINSA', descripcion: 'Narcótico', requiereRevision: true },
  'narcotico': { capitulos: ['30'], autoridad: 'MINSA', descripcion: 'Narcótico', requiereRevision: true },
  
  // Alimentos especiales
  'organic': { capitulos: ['20', '21', '22'], autoridad: 'AUPSA', descripcion: 'Orgánico (verificar certificación)', requiereRevision: true },
  'organico': { capitulos: ['20', '21', '22'], autoridad: 'AUPSA', descripcion: 'Orgánico (verificar certificación)', requiereRevision: true },
  'infant formula': { capitulos: ['19'], autoridad: 'MINSA', descripcion: 'Fórmula infantil', requiereRevision: true },
  'formula infantil': { capitulos: ['19'], autoridad: 'MINSA', descripcion: 'Fórmula infantil', requiereRevision: true },
  
  // Textiles especiales
  'bulletproof': { capitulos: ['63'], autoridad: 'MINGOB', descripcion: 'Antibalas', requiereRevision: true },
  'antibalas': { capitulos: ['63'], autoridad: 'MINGOB', descripcion: 'Antibalas', requiereRevision: true },
  'kevlar': { capitulos: ['63'], autoridad: 'MINGOB', descripcion: 'Kevlar (protección)', requiereRevision: true },
};

export interface LineItemFactura {
  descripcion: string;
  cantidad?: number;
  valorUnitario?: number;
  valorTotal?: number;
  hsCodeSugerido?: string;
}

export interface DiscrepanciaHTS {
  palabraClave: string;
  capitulosEsperados: string[];
  hsCodeActual: string;
  capituloActual: string;
  descripcion: string;
  autoridad?: string;
  severidad: 'baja' | 'media' | 'alta';
  fuenteDeteccion: 'manifiesto' | 'factura' | 'ambos';
}

export interface ResultadoAnalisisHTS {
  guiaNumero: string;
  requiereRevisionHTS: boolean;
  discrepancias: DiscrepanciaHTS[];
  palabrasTecnicasEncontradas: string[];
  hsCodeSugerido?: string;
  fuentesAnalizadas: ('manifiesto' | 'factura')[];
  confianzaClasificacion: number; // 0-100
  observaciones: string[];
}

/**
 * Analiza descripción del manifiesto y line items de factura
 * Detecta discrepancias entre HTS sugerido y palabras técnicas
 */
export function analizarTextoParaHTS(
  paquete: ManifestRow,
  hsCodeActual: string,
  factura?: FacturaComercial,
  lineItems?: LineItemFactura[]
): ResultadoAnalisisHTS {
  const resultado: ResultadoAnalisisHTS = {
    guiaNumero: paquete.trackingNumber,
    requiereRevisionHTS: false,
    discrepancias: [],
    palabrasTecnicasEncontradas: [],
    hsCodeSugerido: hsCodeActual,
    fuentesAnalizadas: ['manifiesto'],
    confianzaClasificacion: 100,
    observaciones: []
  };

  // Obtener capítulo actual del HTS
  const capituloActual = hsCodeActual?.substring(0, 2) || '99';
  
  // 1. Analizar descripción del manifiesto
  const discrepanciasManifiesto = detectarDiscrepancias(
    paquete.description,
    hsCodeActual,
    capituloActual,
    'manifiesto'
  );
  
  resultado.discrepancias.push(...discrepanciasManifiesto.discrepancias);
  resultado.palabrasTecnicasEncontradas.push(...discrepanciasManifiesto.palabrasEncontradas);
  
  // 2. Analizar line items de factura si existen
  if (lineItems && lineItems.length > 0) {
    resultado.fuentesAnalizadas.push('factura');
    
    for (const item of lineItems) {
      const discrepanciasItem = detectarDiscrepancias(
        item.descripcion,
        item.hsCodeSugerido || hsCodeActual,
        capituloActual,
        'factura'
      );
      
      resultado.discrepancias.push(...discrepanciasItem.discrepancias);
      resultado.palabrasTecnicasEncontradas.push(...discrepanciasItem.palabrasEncontradas);
    }
  }
  
  // 3. Analizar factura completa si existe
  if (factura && (factura as any).descripcion) {
    const discrepanciasFactura = detectarDiscrepancias(
      (factura as any).descripcion,
      hsCodeActual,
      capituloActual,
      'factura'
    );
    
    resultado.discrepancias.push(...discrepanciasFactura.discrepancias);
    resultado.palabrasTecnicasEncontradas.push(...discrepanciasFactura.palabrasEncontradas);
  }
  
  // Eliminar duplicados
  resultado.palabrasTecnicasEncontradas = [...new Set(resultado.palabrasTecnicasEncontradas)];
  
  // 4. Determinar si requiere revisión HTS
  if (resultado.discrepancias.length > 0) {
    resultado.requiereRevisionHTS = true;
    
    // Calcular confianza basada en severidad de discrepancias
    const discrepanciasAltas = resultado.discrepancias.filter(d => d.severidad === 'alta').length;
    const discrepanciasMedias = resultado.discrepancias.filter(d => d.severidad === 'media').length;
    
    resultado.confianzaClasificacion = Math.max(
      0,
      100 - (discrepanciasAltas * 30) - (discrepanciasMedias * 15)
    );
    
    // Generar observaciones
    const autoridadesInvolucradas = [...new Set(
      resultado.discrepancias
        .filter(d => d.autoridad)
        .map(d => d.autoridad!)
    )];
    
    if (autoridadesInvolucradas.length > 0) {
      resultado.observaciones.push(
        `Autoridades involucradas: ${autoridadesInvolucradas.join(', ')}`
      );
    }
    
    resultado.observaciones.push(
      `${resultado.discrepancias.length} discrepancia(s) detectada(s) entre descripción y código HTS`
    );
    
    devWarn(`[HTS] Guía ${paquete.trackingNumber}: ${resultado.discrepancias.length} discrepancias detectadas`);
  }
  
  return resultado;
}

/**
 * Detecta discrepancias entre palabras técnicas y capítulos HTS
 */
function detectarDiscrepancias(
  texto: string,
  hsCode: string,
  capituloActual: string,
  fuente: 'manifiesto' | 'factura'
): { discrepancias: DiscrepanciaHTS[]; palabrasEncontradas: string[] } {
  const textoLower = texto.toLowerCase();
  const discrepancias: DiscrepanciaHTS[] = [];
  const palabrasEncontradas: string[] = [];
  
  for (const [palabra, config] of Object.entries(PALABRAS_TECNICAS_HTS)) {
    if (textoLower.includes(palabra.toLowerCase())) {
      palabrasEncontradas.push(palabra);
      
      // Verificar si el capítulo actual coincide con los esperados
      const capituloCoincide = config.capitulos.includes(capituloActual);
      
      if (!capituloCoincide && config.requiereRevision) {
        // Determinar severidad
        let severidad: 'baja' | 'media' | 'alta' = 'media';
        
        if (config.autoridad === 'MINGOB' || config.autoridad === 'MINSA') {
          severidad = 'alta';
        } else if (!config.autoridad) {
          severidad = 'baja';
        }
        
        discrepancias.push({
          palabraClave: palabra,
          capitulosEsperados: config.capitulos,
          hsCodeActual: hsCode,
          capituloActual,
          descripcion: config.descripcion,
          autoridad: config.autoridad,
          severidad,
          fuenteDeteccion: fuente
        });
      }
    }
  }
  
  return { discrepancias, palabrasEncontradas };
}

/**
 * Procesa un lote de paquetes y retorna los que requieren revisión HTS
 */
export function procesarLoteParaRevisionHTS(
  paquetes: ManifestRow[],
  hsCodes: Record<string, string>,
  facturas?: Map<string, { factura: FacturaComercial; lineItems: LineItemFactura[] }>
): {
  requierenRevision: ManifestRow[];
  resultados: Map<string, ResultadoAnalisisHTS>;
  estadisticas: {
    totalAnalizados: number;
    requierenRevision: number;
    discrepanciasAltas: number;
    discrepanciasMedias: number;
    autoridadesInvolucradas: string[];
  };
} {
  const resultados = new Map<string, ResultadoAnalisisHTS>();
  const requierenRevision: ManifestRow[] = [];
  let discrepanciasAltas = 0;
  let discrepanciasMedias = 0;
  const autoridadesSet = new Set<string>();
  
  for (const paquete of paquetes) {
    const hsCode = hsCodes[paquete.trackingNumber] || '9999.99.99';
    const datosFactura = facturas?.get(paquete.trackingNumber);
    
    const resultado = analizarTextoParaHTS(
      paquete,
      hsCode,
      datosFactura?.factura,
      datosFactura?.lineItems
    );
    
    resultados.set(paquete.trackingNumber, resultado);
    
    if (resultado.requiereRevisionHTS) {
      requierenRevision.push(paquete);
      
      for (const disc of resultado.discrepancias) {
        if (disc.severidad === 'alta') discrepanciasAltas++;
        if (disc.severidad === 'media') discrepanciasMedias++;
        if (disc.autoridad) autoridadesSet.add(disc.autoridad);
      }
    }
  }
  
  devLog(`[HTS] Análisis completado: ${requierenRevision.length}/${paquetes.length} requieren revisión`);
  
  return {
    requierenRevision,
    resultados,
    estadisticas: {
      totalAnalizados: paquetes.length,
      requierenRevision: requierenRevision.length,
      discrepanciasAltas,
      discrepanciasMedias,
      autoridadesInvolucradas: Array.from(autoridadesSet)
    }
  };
}
