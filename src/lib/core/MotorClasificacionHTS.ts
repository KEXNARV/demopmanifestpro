// ============================================
// MOTOR DE CLASIFICACIÓN HTS AI-FIRST
// Clasificación jerárquica con validación NLP
// Integración con Lovable AI para NLP real
// ============================================

import { ManifestRow } from '@/types/manifest';
import { Arancel } from '@/types/aduanas';
import { ARANCELES_PANAMA, KEYWORDS_ARANCEL, buscarArancelPorDescripcion, ARANCEL_GENERICO } from '@/lib/aduanas/arancelesData';
import { devLog, devWarn } from '@/lib/logger';
import { ClasificadorHTSAI, ClasificacionAIResponse } from './ClasificadorHTSAI';

// ============================================
// TÉRMINOS SENSIBLES PARA AUDITORÍA
// ============================================
export const TERMINOS_SENSIBLES: Record<string, {
  categoria: 'seguridad' | 'salud' | 'regulado' | 'quimico' | 'electronico';
  riesgo: 'alto' | 'medio' | 'bajo';
  autoridad?: string;
  descripcion: string;
}> = {
  // Electrónica con radio/frecuencia
  'wireless': { categoria: 'electronico', riesgo: 'medio', autoridad: 'ASEP', descripcion: 'Dispositivo inalámbrico' },
  'bluetooth': { categoria: 'electronico', riesgo: 'bajo', descripcion: 'Tecnología Bluetooth' },
  'wifi': { categoria: 'electronico', riesgo: 'bajo', descripcion: 'Dispositivo WiFi' },
  'radio': { categoria: 'electronico', riesgo: 'medio', autoridad: 'ASEP', descripcion: 'Equipo de radio' },
  'transmitter': { categoria: 'electronico', riesgo: 'alto', autoridad: 'ASEP', descripcion: 'Transmisor' },
  'frequency': { categoria: 'electronico', riesgo: 'medio', descripcion: 'Equipo de frecuencia' },
  
  // Baterías
  'battery': { categoria: 'seguridad', riesgo: 'medio', descripcion: 'Contiene batería' },
  'lithium': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'AAC', descripcion: 'Batería de litio' },
  'li-ion': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'AAC', descripcion: 'Batería Li-Ion' },
  'lipo': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'AAC', descripcion: 'Batería LiPo' },
  
  // Químicos
  'chemical': { categoria: 'quimico', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Producto químico' },
  'acid': { categoria: 'quimico', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Ácido' },
  'solvent': { categoria: 'quimico', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Solvente' },
  'flammable': { categoria: 'quimico', riesgo: 'alto', autoridad: 'MINGOB', descripcion: 'Inflamable' },
  'toxic': { categoria: 'quimico', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Tóxico' },
  'hazardous': { categoria: 'quimico', riesgo: 'alto', descripcion: 'Material peligroso' },
  'oxidizer': { categoria: 'quimico', riesgo: 'alto', descripcion: 'Oxidante' },
  
  // Salud/Médico
  'medical': { categoria: 'salud', riesgo: 'medio', autoridad: 'MINSA', descripcion: 'Producto médico' },
  'pharmaceutical': { categoria: 'salud', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Farmacéutico' },
  'drug': { categoria: 'salud', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Medicamento' },
  'medicine': { categoria: 'salud', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Medicina' },
  'diagnostic': { categoria: 'salud', riesgo: 'medio', autoridad: 'MINSA', descripcion: 'Diagnóstico' },
  'surgical': { categoria: 'salud', riesgo: 'medio', autoridad: 'MINSA', descripcion: 'Quirúrgico' },
  'insulin': { categoria: 'salud', riesgo: 'alto', autoridad: 'MINSA', descripcion: 'Insulina' },
  
  // Seguridad
  'weapon': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'MINGOB', descripcion: 'Arma' },
  'gun': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'MINGOB', descripcion: 'Arma de fuego' },
  'ammunition': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'MINGOB', descripcion: 'Munición' },
  'explosive': { categoria: 'seguridad', riesgo: 'alto', autoridad: 'MINGOB', descripcion: 'Explosivo' },
  'knife': { categoria: 'seguridad', riesgo: 'medio', descripcion: 'Cuchillo' },
  'blade': { categoria: 'seguridad', riesgo: 'medio', descripcion: 'Hoja cortante' },
  
  // Regulados
  'drone': { categoria: 'regulado', riesgo: 'medio', autoridad: 'AAC', descripcion: 'Dron' },
  'gps': { categoria: 'regulado', riesgo: 'bajo', descripcion: 'Dispositivo GPS' },
  'scanner': { categoria: 'regulado', riesgo: 'bajo', descripcion: 'Escáner' },
  'laser': { categoria: 'regulado', riesgo: 'medio', descripcion: 'Láser' }
};

// Descripciones genéricas que requieren auditoría profunda
const DESCRIPCIONES_GENERICAS = [
  'toy', 'toys', 'juguete', 'juguetes',
  'gift', 'regalo', 'present',
  'sample', 'samples', 'muestra', 'muestras',
  'parts', 'partes', 'pieces', 'piezas',
  'accessories', 'accesorios',
  'goods', 'merchandise', 'mercancia', 'mercadería',
  'item', 'items', 'articulo', 'artículos',
  'product', 'products', 'producto', 'productos',
  'material', 'materiales',
  'equipment', 'equipo',
  'supplies', 'suministros',
  'misc', 'miscellaneous', 'varios',
  'personal effects', 'efectos personales',
  'household', 'hogar'
];

export interface ResultadoClasificacionHTS {
  guia: string;
  hsCode: string;
  hsCodeOriginal?: string;
  descripcionArancelaria: string;
  arancel: Arancel;
  
  // Validación NLP
  validacionNLP: {
    coincidenciaDescripcion: number; // 0-100
    palabrasClaveEncontradas: string[];
    terminosSensiblesDetectados: TerminoSensibleDetectado[];
    descripcionGenerica: boolean;
  };
  
  // Flags de estado
  requiereRevisionManual: boolean;
  motivoRevision?: string;
  confianzaClasificacion: number; // 0-100
  
  // Autoridades detectadas
  autoridadesInvolucradas: string[];
  
  // Auditoría
  auditoria: {
    fechaClasificacion: string;
    metodo: 'automatico' | 'nlp' | 'manual';
    reglas: string[];
  };
}

export interface TerminoSensibleDetectado {
  termino: string;
  categoria: string;
  riesgo: 'alto' | 'medio' | 'bajo';
  autoridad?: string;
  descripcion: string;
  posicionEnTexto: number;
}

/**
 * Motor de Clasificación HTS con validación NLP
 */
export class MotorClasificacionHTS {
  
  /**
   * Clasifica un paquete con jerarquía HTS-Priority
   * 1. Busca HTS por descripción
   * 2. Valida semánticamente que coincida
   * 3. Escanea términos sensibles
   */
  static clasificar(
    paquete: ManifestRow,
    lineItemsFactura?: string[]
  ): ResultadoClasificacionHTS {
    const descripcionCompleta = this.construirDescripcionCompleta(
      paquete.description,
      lineItemsFactura
    );
    
    const reglas: string[] = [];
    
    // PASO 1: Clasificación por HTS
    let arancel = buscarArancelPorDescripcion(paquete.description);
    let metodo: 'automatico' | 'nlp' | 'manual' = 'automatico';
    
    if (!arancel || arancel.hsCode === '9999.99.99') {
      arancel = ARANCEL_GENERICO;
      reglas.push('HTS genérico asignado - clasificación pendiente');
    } else {
      reglas.push(`HTS ${arancel.hsCode} encontrado por keywords`);
    }
    
    // PASO 2: Detectar si descripción es genérica
    const esDescripcionGenerica = this.esDescripcionGenerica(paquete.description);
    if (esDescripcionGenerica) {
      reglas.push('Descripción genérica detectada - requiere auditoría');
    }
    
    // PASO 3: Escanear términos sensibles en descripción y factura
    const terminosSensibles = this.escanearTerminosSensibles(descripcionCompleta);
    
    if (terminosSensibles.length > 0) {
      reglas.push(`${terminosSensibles.length} término(s) sensible(s) detectado(s)`);
    }
    
    // PASO 4: Validación NLP - ¿La descripción coincide con el HTS asignado?
    const coincidenciaNLP = this.calcularCoincidenciaNLP(
      paquete.description,
      arancel
    );
    
    // PASO 5: Determinar si requiere revisión manual
    const { requiereRevision, motivo, confianza } = this.evaluarRevisionManual(
      arancel,
      esDescripcionGenerica,
      terminosSensibles,
      coincidenciaNLP
    );
    
    if (requiereRevision) {
      reglas.push(`Marcado para REVISIÓN MANUAL: ${motivo}`);
      metodo = 'nlp';
    }
    
    // PASO 6: Recopilar autoridades involucradas
    const autoridades = new Set<string>();
    if (arancel.autoridad) {
      autoridades.add(arancel.autoridad);
    }
    terminosSensibles
      .filter(t => t.autoridad)
      .forEach(t => autoridades.add(t.autoridad!));
    
    devLog(`[HTS] ${paquete.trackingNumber}: ${arancel.hsCode} (confianza: ${confianza}%)`);
    
    return {
      guia: paquete.trackingNumber,
      hsCode: arancel.hsCode,
      descripcionArancelaria: arancel.descripcion,
      arancel,
      validacionNLP: {
        coincidenciaDescripcion: coincidenciaNLP,
        palabrasClaveEncontradas: this.extraerPalabrasClave(paquete.description),
        terminosSensiblesDetectados: terminosSensibles,
        descripcionGenerica: esDescripcionGenerica
      },
      requiereRevisionManual: requiereRevision,
      motivoRevision: motivo,
      confianzaClasificacion: confianza,
      autoridadesInvolucradas: Array.from(autoridades),
      auditoria: {
        fechaClasificacion: new Date().toISOString(),
        metodo,
        reglas
      }
    };
  }
  
  /**
   * Construye descripción completa combinando manifiesto + factura
   */
  private static construirDescripcionCompleta(
    descripcionManifiesto: string,
    lineItemsFactura?: string[]
  ): string {
    let completa = descripcionManifiesto;
    
    if (lineItemsFactura && lineItemsFactura.length > 0) {
      completa += ' ' + lineItemsFactura.join(' ');
    }
    
    return completa.toLowerCase();
  }
  
  /**
   * Detecta si la descripción es genérica
   */
  private static esDescripcionGenerica(descripcion: string): boolean {
    const descLower = descripcion.toLowerCase().trim();
    
    // Descripción muy corta
    if (descLower.length < 10) return true;
    
    // Solo contiene palabras genéricas
    for (const generica of DESCRIPCIONES_GENERICAS) {
      if (descLower === generica || descLower === generica + 's') {
        return true;
      }
    }
    
    // Contiene mayoritariamente palabras genéricas
    const palabras = descLower.split(/\s+/);
    const palabrasGenericas = palabras.filter(p => 
      DESCRIPCIONES_GENERICAS.includes(p)
    );
    
    if (palabras.length > 0 && palabrasGenericas.length / palabras.length >= 0.6) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Escanea términos sensibles en la descripción
   */
  private static escanearTerminosSensibles(texto: string): TerminoSensibleDetectado[] {
    const detectados: TerminoSensibleDetectado[] = [];
    const textoLower = texto.toLowerCase();
    
    for (const [termino, config] of Object.entries(TERMINOS_SENSIBLES)) {
      const posicion = textoLower.indexOf(termino.toLowerCase());
      if (posicion !== -1) {
        detectados.push({
          termino,
          categoria: config.categoria,
          riesgo: config.riesgo,
          autoridad: config.autoridad,
          descripcion: config.descripcion,
          posicionEnTexto: posicion
        });
      }
    }
    
    // Ordenar por riesgo (alto primero)
    return detectados.sort((a, b) => {
      const prioridad = { alto: 0, medio: 1, bajo: 2 };
      return prioridad[a.riesgo] - prioridad[b.riesgo];
    });
  }
  
  /**
   * Calcula coincidencia NLP entre descripción y HTS
   */
  private static calcularCoincidenciaNLP(
    descripcion: string,
    arancel: Arancel
  ): number {
    const descLower = descripcion.toLowerCase();
    const arancelLower = arancel.descripcion.toLowerCase();
    
    // Obtener keywords del HTS
    const keywords = KEYWORDS_ARANCEL[arancel.hsCode] || [];
    
    if (keywords.length === 0) {
      // Sin keywords, comparar directo
      const palabrasArancel = arancelLower.split(/\s+/);
      const coincidencias = palabrasArancel.filter(p => 
        p.length > 3 && descLower.includes(p)
      );
      return Math.min(100, (coincidencias.length / palabrasArancel.length) * 100);
    }
    
    // Contar keywords que aparecen en descripción
    const keywordsEncontrados = keywords.filter(kw => 
      descLower.includes(kw.toLowerCase())
    );
    
    return Math.round((keywordsEncontrados.length / keywords.length) * 100);
  }
  
  /**
   * Evalúa si se requiere revisión manual
   */
  private static evaluarRevisionManual(
    arancel: Arancel,
    esGenerica: boolean,
    terminosSensibles: TerminoSensibleDetectado[],
    coincidenciaNLP: number
  ): { requiereRevision: boolean; motivo?: string; confianza: number } {
    let confianza = 100;
    const motivos: string[] = [];
    
    // HTS genérico
    if (arancel.hsCode === '9999.99.99') {
      confianza -= 40;
      motivos.push('HTS pendiente de clasificación');
    }
    
    // Descripción genérica
    if (esGenerica) {
      confianza -= 25;
      motivos.push('Descripción genérica');
    }
    
    // Términos sensibles de alto riesgo
    const terminosAltoRiesgo = terminosSensibles.filter(t => t.riesgo === 'alto');
    if (terminosAltoRiesgo.length > 0) {
      confianza -= 30;
      motivos.push(`Términos de alto riesgo: ${terminosAltoRiesgo.map(t => t.termino).join(', ')}`);
    }
    
    // Términos sensibles de medio riesgo
    const terminosMedioRiesgo = terminosSensibles.filter(t => t.riesgo === 'medio');
    if (terminosMedioRiesgo.length > 0) {
      confianza -= 15;
    }
    
    // Baja coincidencia NLP
    if (coincidenciaNLP < 30 && arancel.hsCode !== '9999.99.99') {
      confianza -= 20;
      motivos.push('Baja coincidencia descripción-HTS');
    }
    
    confianza = Math.max(0, confianza);
    
    return {
      requiereRevision: confianza < 60 || terminosAltoRiesgo.length > 0,
      motivo: motivos.length > 0 ? motivos.join('; ') : undefined,
      confianza
    };
  }
  
  /**
   * Extrae palabras clave de la descripción
   */
  private static extraerPalabrasClave(descripcion: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                       'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
                       'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'con', 'para', 'por'];
    
    return descripcion
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü\s]/g, '')
      .split(/\s+/)
      .filter(p => p.length > 2 && !stopWords.includes(p))
      .slice(0, 10);
  }
  
  /**
   * Procesa lote de paquetes (síncrono - reglas locales)
   */
  static procesarLote(
    paquetes: ManifestRow[],
    facturasLineItems?: Map<string, string[]>
  ): {
    clasificaciones: Map<string, ResultadoClasificacionHTS>;
    requierenRevision: ManifestRow[];
    estadisticas: {
      total: number;
      clasificadosAuto: number;
      requierenRevision: number;
      htsGenerico: number;
      conTerminosSensibles: number;
    };
  } {
    const clasificaciones = new Map<string, ResultadoClasificacionHTS>();
    const requierenRevision: ManifestRow[] = [];
    
    let clasificadosAuto = 0;
    let htsGenerico = 0;
    let conTerminosSensibles = 0;
    
    for (const paquete of paquetes) {
      const lineItems = facturasLineItems?.get(paquete.trackingNumber);
      const resultado = this.clasificar(paquete, lineItems);
      
      clasificaciones.set(paquete.trackingNumber, resultado);
      
      if (resultado.requiereRevisionManual) {
        requierenRevision.push(paquete);
      } else {
        clasificadosAuto++;
      }
      
      if (resultado.hsCode === '9999.99.99') {
        htsGenerico++;
      }
      
      if (resultado.validacionNLP.terminosSensiblesDetectados.length > 0) {
        conTerminosSensibles++;
      }
    }
    
    return {
      clasificaciones,
      requierenRevision,
      estadisticas: {
        total: paquetes.length,
        clasificadosAuto,
        requierenRevision: requierenRevision.length,
        htsGenerico,
        conTerminosSensibles
      }
    };
  }
  
  /**
   * Procesa lote con AI (asíncrono - Lovable AI)
   * Usa NLP real para clasificaciones más precisas
   */
  static async procesarLoteConAI(
    paquetes: ManifestRow[],
    facturasLineItems?: Map<string, string[]>,
    onProgress?: (procesados: number, total: number) => void
  ): Promise<{
    clasificaciones: Map<string, ResultadoClasificacionHTS>;
    requierenRevision: ManifestRow[];
    estadisticas: {
      total: number;
      clasificadosAuto: number;
      requierenRevision: number;
      htsGenerico: number;
      conTerminosSensibles: number;
      clasificadosConAI: number;
    };
  }> {
    const clasificaciones = new Map<string, ResultadoClasificacionHTS>();
    const requierenRevision: ManifestRow[] = [];
    
    let clasificadosAuto = 0;
    let htsGenerico = 0;
    let conTerminosSensibles = 0;
    let clasificadosConAI = 0;
    
    // Primero: clasificación local rápida
    const clasificacionesLocales = this.procesarLote(paquetes, facturasLineItems);
    
    // Identificar cuáles necesitan AI (baja confianza o revisión)
    const necesitanAI = paquetes.filter(p => {
      const local = clasificacionesLocales.clasificaciones.get(p.trackingNumber);
      return local && (local.confianzaClasificacion < 70 || local.requiereRevisionManual);
    });
    
    devLog(`[MotorHTS] ${necesitanAI.length}/${paquetes.length} paquetes requieren clasificación AI`);
    
    // Procesar con AI los que lo necesitan
    let procesados = 0;
    
    for (const paquete of paquetes) {
      const local = clasificacionesLocales.clasificaciones.get(paquete.trackingNumber)!;
      const lineItems = facturasLineItems?.get(paquete.trackingNumber);
      
      // Si la clasificación local es buena, usarla
      if (local.confianzaClasificacion >= 70 && !local.requiereRevisionManual) {
        clasificaciones.set(paquete.trackingNumber, local);
        clasificadosAuto++;
      } else {
        // Usar AI para clasificación más precisa
        try {
          const respuestaAI = await ClasificadorHTSAI.clasificar({
            descripcion: paquete.description,
            lineItemsFactura: lineItems,
            peso: paquete.weight,
            valor: paquete.valueUSD
          });
          
          // Combinar resultado AI con estructura local
          const resultadoMejorado = this.combinarConAI(paquete, local, respuestaAI);
          clasificaciones.set(paquete.trackingNumber, resultadoMejorado);
          clasificadosConAI++;
          
          if (resultadoMejorado.requiereRevisionManual) {
            requierenRevision.push(paquete);
          } else {
            clasificadosAuto++;
          }
          
        } catch (error) {
          devWarn(`[MotorHTS] Error AI para ${paquete.trackingNumber}, usando local`);
          clasificaciones.set(paquete.trackingNumber, local);
          if (local.requiereRevisionManual) {
            requierenRevision.push(paquete);
          }
        }
      }
      
      procesados++;
      onProgress?.(procesados, paquetes.length);
      
      if (clasificaciones.get(paquete.trackingNumber)?.hsCode === '9999.99.99') {
        htsGenerico++;
      }
      
      if ((clasificaciones.get(paquete.trackingNumber)?.validacionNLP.terminosSensiblesDetectados.length || 0) > 0) {
        conTerminosSensibles++;
      }
    }
    
    return {
      clasificaciones,
      requierenRevision,
      estadisticas: {
        total: paquetes.length,
        clasificadosAuto,
        requierenRevision: requierenRevision.length,
        htsGenerico,
        conTerminosSensibles,
        clasificadosConAI
      }
    };
  }
  
  /**
   * Combina resultado local con respuesta AI
   */
  private static combinarConAI(
    paquete: ManifestRow,
    local: ResultadoClasificacionHTS,
    ai: ClasificacionAIResponse
  ): ResultadoClasificacionHTS {
    // Si AI no dio error y tiene confianza alta, usar su clasificación
    const usarAI = !ai.error && ai.confianza > 50;
    
    const terminosSensiblesAI: TerminoSensibleDetectado[] = ai.terminosSensibles.map((t, i) => ({
      termino: t.termino,
      categoria: t.categoria,
      riesgo: t.riesgo,
      autoridad: t.autoridad,
      descripcion: `Detectado por AI: ${t.termino}`,
      posicionEnTexto: i
    }));
    
    // Combinar términos sensibles (locales + AI)
    const terminosCombinados = [
      ...local.validacionNLP.terminosSensiblesDetectados,
      ...terminosSensiblesAI.filter(tai => 
        !local.validacionNLP.terminosSensiblesDetectados.some(tl => 
          tl.termino.toLowerCase() === tai.termino.toLowerCase()
        )
      )
    ];
    
    // Combinar autoridades
    const autoridadesCombinadas = new Set([
      ...local.autoridadesInvolucradas,
      ...ai.terminosSensibles.filter(t => t.autoridad).map(t => t.autoridad!)
    ]);
    
    return {
      guia: paquete.trackingNumber,
      hsCode: usarAI ? ai.hsCode : local.hsCode,
      hsCodeOriginal: local.hsCode !== ai.hsCode ? local.hsCode : undefined,
      descripcionArancelaria: usarAI ? ai.descripcionArancelaria : local.descripcionArancelaria,
      arancel: usarAI 
        ? { 
            hsCode: ai.hsCode, 
            descripcion: ai.descripcionArancelaria, 
            daiPercent: local.arancel.daiPercent,
            iscPercent: local.arancel.iscPercent,
            itbmsPercent: local.arancel.itbmsPercent,
            requiresPermiso: ai.terminosSensibles.length > 0,
            categoria: local.arancel.categoria
          } 
        : local.arancel,
      validacionNLP: {
        coincidenciaDescripcion: usarAI ? ai.confianza : local.validacionNLP.coincidenciaDescripcion,
        palabrasClaveEncontradas: local.validacionNLP.palabrasClaveEncontradas,
        terminosSensiblesDetectados: terminosCombinados,
        descripcionGenerica: local.validacionNLP.descripcionGenerica
      },
      requiereRevisionManual: ai.requiereRevision || (ai.confianza < 60),
      motivoRevision: ai.motivoRevision || ai.razonamiento,
      confianzaClasificacion: usarAI ? ai.confianza : local.confianzaClasificacion,
      autoridadesInvolucradas: Array.from(autoridadesCombinadas),
      auditoria: {
        fechaClasificacion: new Date().toISOString(),
        metodo: usarAI ? 'nlp' : local.auditoria.metodo,
        reglas: [
          ...local.auditoria.reglas,
          usarAI ? `Clasificación AI: ${ai.hsCode} (${ai.confianza}%)` : 'AI no aplicado',
          ai.razonamiento ? `Razonamiento: ${ai.razonamiento.substring(0, 100)}` : ''
        ].filter(Boolean)
      }
    };
  }
}

export default MotorClasificacionHTS;
