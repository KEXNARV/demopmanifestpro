// ============================================
// DETECTOR DE RIESGOS SEMÁNTICOS
// Auditoría profunda de descripciones
// Detecta inconsistencias y subvaluación
// ============================================

import { ManifestRow } from '@/types/manifest';
import { devLog, devWarn } from '@/lib/logger';

export interface RiesgoDetectado {
  tipo: 'hts_incorrecto' | 'subvaluacion' | 'peso_inconsistente' | 
        'descripcion_generica' | 'terminos_sensibles' | 'factura_discrepante';
  severidad: 'alta' | 'media' | 'baja';
  mensaje: string;
  detalles: string;
  guia: string;
  accionRecomendada: string;
  datosAdicionales?: Record<string, any>;
}

export interface ResultadoAuditoriaRiesgos {
  guia: string;
  riesgosDetectados: RiesgoDetectado[];
  puntuacionRiesgo: number; // 0-100 (0 = sin riesgo, 100 = máximo riesgo)
  requiereRevision: boolean;
  categoriaRiesgo: 'bajo' | 'medio' | 'alto' | 'critico';
}

export interface AuditoriaLote {
  paquetesAnalizados: number;
  riesgosTotales: number;
  distribucion: {
    bajo: number;
    medio: number;
    alto: number;
    critico: number;
  };
  riesgosMasComunes: { tipo: string; cantidad: number }[];
  paquetesProblematicos: ResultadoAuditoriaRiesgos[];
}

/**
 * Detector de Riesgos Semánticos
 * Analiza descripciones, valores y pesos para detectar anomalías
 */
export class DetectorRiesgos {
  
  /**
   * Audita un paquete individual
   */
  static auditarPaquete(
    paquete: ManifestRow,
    opciones: {
      hsCodeAsignado?: string;
      pesoDeclaradoTotal?: number;
      lineItemsFactura?: string[];
      valoresFactura?: number[];
    } = {}
  ): ResultadoAuditoriaRiesgos {
    const riesgos: RiesgoDetectado[] = [];
    
    // 1. Detectar descripción genérica
    const riesgoDescripcion = this.detectarDescripcionGenerica(paquete);
    if (riesgoDescripcion) riesgos.push(riesgoDescripcion);
    
    // 2. Detectar posible subvaluación
    const riesgoSubvaluacion = this.detectarSubvaluacion(paquete);
    if (riesgoSubvaluacion) riesgos.push(riesgoSubvaluacion);
    
    // 3. Detectar inconsistencia de peso
    if (opciones.pesoDeclaradoTotal !== undefined) {
      const riesgoPeso = this.detectarInconsistenciaPeso(
        paquete, 
        opciones.pesoDeclaradoTotal
      );
      if (riesgoPeso) riesgos.push(riesgoPeso);
    }
    
    // 4. Detectar discrepancia con factura
    if (opciones.lineItemsFactura && opciones.lineItemsFactura.length > 0) {
      const riesgoFactura = this.detectarDiscrepanciaFactura(
        paquete,
        opciones.lineItemsFactura,
        opciones.valoresFactura
      );
      if (riesgoFactura) riesgos.push(riesgoFactura);
    }
    
    // 5. Detectar HTS potencialmente incorrecto
    if (opciones.hsCodeAsignado) {
      const riesgoHTS = this.detectarHTSIncorrecto(
        paquete,
        opciones.hsCodeAsignado,
        opciones.lineItemsFactura
      );
      if (riesgoHTS) riesgos.push(riesgoHTS);
    }
    
    // Calcular puntuación de riesgo
    const puntuacion = this.calcularPuntuacionRiesgo(riesgos);
    const categoria = this.categorizarRiesgo(puntuacion);
    
    return {
      guia: paquete.trackingNumber,
      riesgosDetectados: riesgos,
      puntuacionRiesgo: puntuacion,
      requiereRevision: puntuacion >= 40,
      categoriaRiesgo: categoria
    };
  }
  
  /**
   * Detecta descripción genérica
   */
  private static detectarDescripcionGenerica(paquete: ManifestRow): RiesgoDetectado | null {
    const descripcion = paquete.description.toLowerCase().trim();
    
    const palabrasGenericas = [
      'gift', 'regalo', 'sample', 'muestra', 'merchandise', 'mercancia',
      'goods', 'items', 'parts', 'misc', 'varios', 'personal effects',
      'household goods', 'general cargo'
    ];
    
    // Descripción muy corta
    if (descripcion.length < 8) {
      return {
        tipo: 'descripcion_generica',
        severidad: 'alta',
        mensaje: 'Descripción demasiado corta',
        detalles: `La descripción "${paquete.description}" tiene menos de 8 caracteres`,
        guia: paquete.trackingNumber,
        accionRecomendada: 'Solicitar descripción detallada del contenido',
        datosAdicionales: { longitudDescripcion: descripcion.length }
      };
    }
    
    // Solo palabras genéricas
    for (const generica of palabrasGenericas) {
      if (descripcion === generica || descripcion.startsWith(generica + ' ')) {
        return {
          tipo: 'descripcion_generica',
          severidad: 'media',
          mensaje: 'Descripción genérica detectada',
          detalles: `La descripción "${paquete.description}" es muy vaga para clasificación correcta`,
          guia: paquete.trackingNumber,
          accionRecomendada: 'Revisar factura comercial para descripción exacta',
          datosAdicionales: { palabraGenerica: generica }
        };
      }
    }
    
    return null;
  }
  
  /**
   * Detecta posible subvaluación
   */
  private static detectarSubvaluacion(paquete: ManifestRow): RiesgoDetectado | null {
    const valor = paquete.valueUSD;
    const peso = paquete.weight;
    const descripcion = paquete.description.toLowerCase();
    
    // Productos típicamente costosos
    const productosCaros: { keyword: string; valorMinimo: number }[] = [
      { keyword: 'iphone', valorMinimo: 300 },
      { keyword: 'macbook', valorMinimo: 800 },
      { keyword: 'laptop', valorMinimo: 200 },
      { keyword: 'samsung galaxy', valorMinimo: 200 },
      { keyword: 'airpods', valorMinimo: 100 },
      { keyword: 'playstation', valorMinimo: 300 },
      { keyword: 'xbox', valorMinimo: 300 },
      { keyword: 'nintendo switch', valorMinimo: 200 },
      { keyword: 'gopro', valorMinimo: 150 },
      { keyword: 'drone', valorMinimo: 100 },
      { keyword: 'watch', valorMinimo: 50 },
      { keyword: 'perfume', valorMinimo: 30 },
      { keyword: 'gold', valorMinimo: 100 },
      { keyword: 'diamond', valorMinimo: 200 }
    ];
    
    for (const producto of productosCaros) {
      if (descripcion.includes(producto.keyword) && valor < producto.valorMinimo) {
        return {
          tipo: 'subvaluacion',
          severidad: 'alta',
          mensaje: 'Posible subvaluación detectada',
          detalles: `"${paquete.description}" declarado a $${valor} - Valor típico mínimo: $${producto.valorMinimo}`,
          guia: paquete.trackingNumber,
          accionRecomendada: 'Verificar factura comercial y comparar con precios de mercado',
          datosAdicionales: {
            valorDeclarado: valor,
            valorMinimoEsperado: producto.valorMinimo,
            productoDetectado: producto.keyword
          }
        };
      }
    }
    
    // Valor sospechosamente bajo para el peso (menos de $1/lb)
    if (peso > 0 && valor / peso < 1 && valor > 10) {
      return {
        tipo: 'subvaluacion',
        severidad: 'media',
        mensaje: 'Relación valor/peso inusualmente baja',
        detalles: `$${valor} para ${peso} lb = $${(valor/peso).toFixed(2)}/lb`,
        guia: paquete.trackingNumber,
        accionRecomendada: 'Revisar si el valor declarado es correcto',
        datosAdicionales: {
          valorPorLibra: valor / peso,
          valor,
          peso
        }
      };
    }
    
    return null;
  }
  
  /**
   * Detecta inconsistencia de peso
   */
  private static detectarInconsistenciaPeso(
    paquete: ManifestRow,
    pesoTotalDeclarado: number
  ): RiesgoDetectado | null {
    const pesoItem = paquete.weight;
    
    // Si el peso del ítem es mayor que el total declarado
    if (pesoItem > pesoTotalDeclarado * 1.1) { // 10% tolerancia
      return {
        tipo: 'peso_inconsistente',
        severidad: 'media',
        mensaje: 'Peso de ítem excede peso total declarado',
        detalles: `Peso ítem: ${pesoItem} lb, Peso total manifiesto: ${pesoTotalDeclarado} lb`,
        guia: paquete.trackingNumber,
        accionRecomendada: 'Verificar pesos declarados en manifiesto',
        datosAdicionales: {
          pesoItem,
          pesoTotal: pesoTotalDeclarado,
          diferencia: pesoItem - pesoTotalDeclarado
        }
      };
    }
    
    return null;
  }
  
  /**
   * Detecta discrepancia entre manifiesto y factura
   */
  private static detectarDiscrepanciaFactura(
    paquete: ManifestRow,
    lineItemsFactura: string[],
    valoresFactura?: number[]
  ): RiesgoDetectado | null {
    const descripcionManifiesto = paquete.description.toLowerCase();
    
    // Buscar términos en factura que no están en manifiesto
    const terminosNoDeclarados: string[] = [];
    const terminosSensibles = ['battery', 'lithium', 'chemical', 'medical', 'wireless', 'radio'];
    
    for (const item of lineItemsFactura) {
      const itemLower = item.toLowerCase();
      
      for (const sensible of terminosSensibles) {
        if (itemLower.includes(sensible) && !descripcionManifiesto.includes(sensible)) {
          terminosNoDeclarados.push(sensible);
        }
      }
    }
    
    if (terminosNoDeclarados.length > 0) {
      return {
        tipo: 'factura_discrepante',
        severidad: 'alta',
        mensaje: 'Términos en factura no declarados en manifiesto',
        detalles: `Factura menciona: ${terminosNoDeclarados.join(', ')} - No aparecen en descripción del manifiesto`,
        guia: paquete.trackingNumber,
        accionRecomendada: 'Actualizar descripción del manifiesto con contenido real',
        datosAdicionales: {
          terminosEncontrados: terminosNoDeclarados,
          descripcionManifiesto: paquete.description
        }
      };
    }
    
    // Verificar discrepancia de valores
    if (valoresFactura && valoresFactura.length > 0) {
      const totalFactura = valoresFactura.reduce((a, b) => a + b, 0);
      const diferenciaPorcentaje = Math.abs(totalFactura - paquete.valueUSD) / paquete.valueUSD * 100;
      
      if (diferenciaPorcentaje > 20) { // Más de 20% diferencia
        return {
          tipo: 'factura_discrepante',
          severidad: 'media',
          mensaje: 'Valor en factura difiere significativamente',
          detalles: `Manifiesto: $${paquete.valueUSD}, Factura: $${totalFactura} (${diferenciaPorcentaje.toFixed(1)}% diferencia)`,
          guia: paquete.trackingNumber,
          accionRecomendada: 'Reconciliar valores entre factura y manifiesto',
          datosAdicionales: {
            valorManifiesto: paquete.valueUSD,
            valorFactura: totalFactura,
            diferenciaPorcentaje
          }
        };
      }
    }
    
    return null;
  }
  
  /**
   * Detecta HTS potencialmente incorrecto
   */
  private static detectarHTSIncorrecto(
    paquete: ManifestRow,
    hsCode: string,
    lineItemsFactura?: string[]
  ): RiesgoDetectado | null {
    // Mapeo de capítulos HTS a palabras clave esperadas
    const capituloKeywords: Record<string, string[]> = {
      '84': ['machine', 'motor', 'pump', 'engine', 'machinery'],
      '85': ['electric', 'electronic', 'phone', 'computer', 'battery'],
      '30': ['medicine', 'pharmaceutical', 'drug', 'capsule', 'tablet'],
      '95': ['toy', 'game', 'puzzle', 'doll', 'videogame']
    };
    
    const capitulo = hsCode.substring(0, 2);
    const keywordsEsperadas = capituloKeywords[capitulo];
    
    if (!keywordsEsperadas) return null;
    
    const textoCompleto = [
      paquete.description,
      ...(lineItemsFactura || [])
    ].join(' ').toLowerCase();
    
    const coincide = keywordsEsperadas.some(kw => textoCompleto.includes(kw));
    
    if (!coincide && hsCode !== '9999.99.99') {
      return {
        tipo: 'hts_incorrecto',
        severidad: 'media',
        mensaje: 'Posible clasificación HTS incorrecta',
        detalles: `HTS ${hsCode} (Cap. ${capitulo}) no coincide con descripción "${paquete.description}"`,
        guia: paquete.trackingNumber,
        accionRecomendada: 'Revisar clasificación arancelaria',
        datosAdicionales: {
          hsCodeAsignado: hsCode,
          capitulo,
          keywordsEsperadas
        }
      };
    }
    
    return null;
  }
  
  /**
   * Calcula puntuación de riesgo
   */
  private static calcularPuntuacionRiesgo(riesgos: RiesgoDetectado[]): number {
    if (riesgos.length === 0) return 0;
    
    const pesos = { alta: 35, media: 20, baja: 10 };
    
    const puntos = riesgos.reduce((total, riesgo) => {
      return total + pesos[riesgo.severidad];
    }, 0);
    
    return Math.min(100, puntos);
  }
  
  /**
   * Categoriza el nivel de riesgo
   */
  private static categorizarRiesgo(puntuacion: number): 'bajo' | 'medio' | 'alto' | 'critico' {
    if (puntuacion < 20) return 'bajo';
    if (puntuacion < 40) return 'medio';
    if (puntuacion < 70) return 'alto';
    return 'critico';
  }
  
  /**
   * Audita lote completo
   */
  static auditarLote(
    paquetes: ManifestRow[],
    opciones: {
      hsCodes?: Map<string, string>;
      pesoTotalManifiesto?: number;
      facturas?: Map<string, { lineItems: string[]; valores: number[] }>;
    } = {}
  ): AuditoriaLote {
    const resultados: ResultadoAuditoriaRiesgos[] = [];
    const distribucion = { bajo: 0, medio: 0, alto: 0, critico: 0 };
    const conteoTipos = new Map<string, number>();
    
    for (const paquete of paquetes) {
      const datosFactura = opciones.facturas?.get(paquete.trackingNumber);
      
      const resultado = this.auditarPaquete(paquete, {
        hsCodeAsignado: opciones.hsCodes?.get(paquete.trackingNumber),
        pesoDeclaradoTotal: opciones.pesoTotalManifiesto,
        lineItemsFactura: datosFactura?.lineItems,
        valoresFactura: datosFactura?.valores
      });
      
      resultados.push(resultado);
      distribucion[resultado.categoriaRiesgo]++;
      
      for (const riesgo of resultado.riesgosDetectados) {
        conteoTipos.set(riesgo.tipo, (conteoTipos.get(riesgo.tipo) || 0) + 1);
      }
    }
    
    // Ordenar por riesgo
    const paquetesProblematicos = resultados
      .filter(r => r.requiereRevision)
      .sort((a, b) => b.puntuacionRiesgo - a.puntuacionRiesgo);
    
    // Top tipos de riesgo
    const riesgosMasComunes = Array.from(conteoTipos.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
    
    devLog(`[Riesgos] ${paquetesProblematicos.length}/${paquetes.length} paquetes con riesgos detectados`);
    
    return {
      paquetesAnalizados: paquetes.length,
      riesgosTotales: resultados.reduce((t, r) => t + r.riesgosDetectados.length, 0),
      distribucion,
      riesgosMasComunes,
      paquetesProblematicos
    };
  }
}

export default DetectorRiesgos;
