// ============================================
// VALIDADOR DE CUMPLIMIENTO AI
// Compliance Check pre-liquidación con Gemini
// Precisión First - Zero Alucinaciones
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { ManifestRow } from '@/types/manifest';
import { devLog, devWarn, devError } from '@/lib/logger';

// ============================================
// INTERFACES
// ============================================

export interface ValidacionCompliance {
  esValido: boolean;
  confianza: number;           // 0-100
  requiereRevisionManual: boolean;
  erroresValidacion: ErrorValidacion[];
  advertencias: string[];
  sugerenciasHTS: SugerenciaHTS[];
  verificacionDocumental: VerificacionDocumental;
  timestamp: string;
}

export interface ErrorValidacion {
  codigo: string;
  tipo: 'critico' | 'alto' | 'medio' | 'bajo';
  campo: string;
  mensaje: string;
  valorActual?: string;
  valorEsperado?: string;
  accionRequerida: string;
}

export interface SugerenciaHTS {
  hsCode: string;
  descripcion: string;
  confianza: number;
  fundamentoClasificacion: string;
  daiPercent: number;
  itbmsPercent: number;
  requierePermiso: boolean;
  autoridadAnuente?: string;
}

export interface VerificacionDocumental {
  facturaComercialCompleta: boolean;
  descripcionSuficiente: boolean;
  valorCoherente: boolean;
  pesoCoherente: boolean;
  paisOrigenIdentificado: boolean;
  clasificacionArancelariaValida: boolean;
  documentosFaltantes: string[];
}

export interface DatosParaValidacion {
  guia: string;
  descripcion: string;
  valorUSD: number;
  pesoKg?: number;
  paisOrigen?: string;
  hsCodePropuesto?: string;
  datosFactura?: {
    lineItems: string[];
    valores: number[];
    proveedor?: string;
    fechaFactura?: string;
  };
  mawb?: string;
}

// ============================================
// VALIDADOR PRINCIPAL
// ============================================

export class ValidadorComplianceAI {
  
  /**
   * Ejecuta validación completa de cumplimiento
   */
  static async validar(datos: DatosParaValidacion): Promise<ValidacionCompliance> {
    devLog(`[Compliance] Validando guía ${datos.guia}`);
    
    const errores: ErrorValidacion[] = [];
    const advertencias: string[] = [];
    const documentosFaltantes: string[] = [];
    
    // ═══════════════════════════════════════════════════════
    // PASO 1: VALIDACIONES SÍNCRONAS (REGLAS LOCALES)
    // ═══════════════════════════════════════════════════════
    
    // 1.1 Validar descripción
    const validacionDescripcion = this.validarDescripcion(datos.descripcion);
    if (!validacionDescripcion.valida) {
      errores.push(...validacionDescripcion.errores);
    }
    advertencias.push(...validacionDescripcion.advertencias);
    
    // 1.2 Validar valor
    const validacionValor = this.validarValor(datos.valorUSD, datos.descripcion);
    if (!validacionValor.valida) {
      errores.push(...validacionValor.errores);
    }
    advertencias.push(...validacionValor.advertencias);
    
    // 1.3 Validar peso si existe
    if (datos.pesoKg !== undefined) {
      const validacionPeso = this.validarPeso(datos.pesoKg, datos.valorUSD, datos.descripcion);
      if (!validacionPeso.valida) {
        errores.push(...validacionPeso.errores);
      }
      advertencias.push(...validacionPeso.advertencias);
    }
    
    // 1.4 Validar datos de factura
    if (!datos.datosFactura || datos.datosFactura.lineItems.length === 0) {
      documentosFaltantes.push('Factura Comercial');
      advertencias.push('Sin factura comercial - Valores no verificables');
    }
    
    // ═══════════════════════════════════════════════════════
    // PASO 2: VALIDACIÓN AI (GEMINI)
    // ═══════════════════════════════════════════════════════
    
    let sugerenciasHTS: SugerenciaHTS[] = [];
    let confianzaAI = 0;
    
    try {
      const resultadoAI = await this.consultarClasificacionAI(datos);
      if (resultadoAI.exito) {
        sugerenciasHTS = resultadoAI.sugerencias;
        confianzaAI = resultadoAI.confianza;
        
        // Validar HTS propuesto contra AI
        if (datos.hsCodePropuesto && sugerenciasHTS.length > 0) {
          const htsAI = sugerenciasHTS[0].hsCode;
          if (!this.htsCoincide(datos.hsCodePropuesto, htsAI)) {
            errores.push({
              codigo: 'HTS_DISCREPANCIA',
              tipo: 'alto',
              campo: 'hsCode',
              mensaje: 'Clasificación HTS propuesta difiere de la sugerida por AI',
              valorActual: datos.hsCodePropuesto,
              valorEsperado: htsAI,
              accionRequerida: 'Revisar clasificación arancelaria - Posible error de clasificación'
            });
          }
        }
      }
    } catch (error) {
      devWarn('[Compliance] AI no disponible, continuando con validación local');
      advertencias.push('Validación AI no disponible - Clasificación pendiente de verificación');
    }
    
    // ═══════════════════════════════════════════════════════
    // PASO 3: CONSTRUIR RESULTADO
    // ═══════════════════════════════════════════════════════
    
    const tieneErroresCriticos = errores.some(e => e.tipo === 'critico');
    const tieneErroresAltos = errores.some(e => e.tipo === 'alto');
    
    const verificacionDocumental: VerificacionDocumental = {
      facturaComercialCompleta: datos.datosFactura !== undefined && datos.datosFactura.lineItems.length > 0,
      descripcionSuficiente: datos.descripcion.length >= 10,
      valorCoherente: !errores.some(e => e.campo === 'valorUSD'),
      pesoCoherente: !errores.some(e => e.campo === 'pesoKg'),
      paisOrigenIdentificado: !!datos.paisOrigen,
      clasificacionArancelariaValida: sugerenciasHTS.length > 0 || !!datos.hsCodePropuesto,
      documentosFaltantes
    };
    
    // Calcular confianza global
    const factoresConfianza = [
      verificacionDocumental.facturaComercialCompleta ? 20 : 0,
      verificacionDocumental.descripcionSuficiente ? 15 : 0,
      verificacionDocumental.valorCoherente ? 15 : 0,
      verificacionDocumental.pesoCoherente ? 10 : 0,
      verificacionDocumental.paisOrigenIdentificado ? 10 : 0,
      verificacionDocumental.clasificacionArancelariaValida ? 15 : 0,
      confianzaAI > 0 ? Math.min(15, confianzaAI * 0.15) : 0
    ];
    
    const confianzaGlobal = factoresConfianza.reduce((a, b) => a + b, 0);
    
    return {
      esValido: !tieneErroresCriticos && !tieneErroresAltos,
      confianza: Math.round(confianzaGlobal),
      requiereRevisionManual: tieneErroresCriticos || tieneErroresAltos || confianzaGlobal < 60,
      erroresValidacion: errores,
      advertencias,
      sugerenciasHTS,
      verificacionDocumental,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Valida descripción de producto
   */
  private static validarDescripcion(descripcion: string): {
    valida: boolean;
    errores: ErrorValidacion[];
    advertencias: string[];
  } {
    const errores: ErrorValidacion[] = [];
    const advertencias: string[] = [];
    
    // Descripción vacía o muy corta
    if (!descripcion || descripcion.trim().length < 3) {
      errores.push({
        codigo: 'DESC_VACIA',
        tipo: 'critico',
        campo: 'descripcion',
        mensaje: 'Descripción de producto vacía o insuficiente',
        valorActual: descripcion || '(vacío)',
        accionRequerida: 'Proporcionar descripción detallada del producto'
      });
      return { valida: false, errores, advertencias };
    }
    
    // Descripciones genéricas
    const genericas = ['gift', 'sample', 'goods', 'items', 'parts', 'misc', 'varios', 'merchandise'];
    const descLower = descripcion.toLowerCase();
    
    for (const gen of genericas) {
      if (descLower === gen || descLower.startsWith(gen + ' ') || descLower.endsWith(' ' + gen)) {
        errores.push({
          codigo: 'DESC_GENERICA',
          tipo: 'alto',
          campo: 'descripcion',
          mensaje: `Descripción genérica "${descripcion}" no permite clasificación correcta`,
          valorActual: descripcion,
          accionRequerida: 'Especificar descripción detallada: material, uso, características'
        });
        break;
      }
    }
    
    // Solo números
    if (/^\d+$/.test(descripcion.trim())) {
      errores.push({
        codigo: 'DESC_INVALIDA',
        tipo: 'critico',
        campo: 'descripcion',
        mensaje: 'Descripción contiene solo números',
        valorActual: descripcion,
        accionRequerida: 'Proporcionar descripción textual del producto'
      });
    }
    
    // Advertencia si es muy corta
    if (descripcion.length < 15) {
      advertencias.push(`Descripción corta (${descripcion.length} caracteres) - Clasificación puede ser imprecisa`);
    }
    
    return { valida: errores.length === 0, errores, advertencias };
  }
  
  /**
   * Valida valor declarado
   */
  private static validarValor(valor: number, descripcion: string): {
    valida: boolean;
    errores: ErrorValidacion[];
    advertencias: string[];
  } {
    const errores: ErrorValidacion[] = [];
    const advertencias: string[] = [];
    
    // Valor cero o negativo
    if (valor <= 0) {
      errores.push({
        codigo: 'VALOR_INVALIDO',
        tipo: 'critico',
        campo: 'valorUSD',
        mensaje: 'Valor declarado es cero o negativo',
        valorActual: `$${valor}`,
        accionRequerida: 'Declarar valor comercial real del producto'
      });
      return { valida: false, errores, advertencias };
    }
    
    // Detección de subvaluación por keywords
    const productosCaros: { keyword: string; minimo: number }[] = [
      { keyword: 'iphone', minimo: 300 },
      { keyword: 'macbook', minimo: 800 },
      { keyword: 'laptop', minimo: 200 },
      { keyword: 'playstation', minimo: 300 },
      { keyword: 'xbox', minimo: 300 },
      { keyword: 'rolex', minimo: 1000 },
      { keyword: 'louis vuitton', minimo: 200 },
      { keyword: 'gucci', minimo: 150 }
    ];
    
    const descLower = descripcion.toLowerCase();
    for (const prod of productosCaros) {
      if (descLower.includes(prod.keyword) && valor < prod.minimo) {
        errores.push({
          codigo: 'SUBVALUACION',
          tipo: 'alto',
          campo: 'valorUSD',
          mensaje: `Posible subvaluación: "${prod.keyword}" declarado a $${valor}`,
          valorActual: `$${valor}`,
          valorEsperado: `>$${prod.minimo}`,
          accionRequerida: 'Verificar factura comercial - Declarar valor real'
        });
        break;
      }
    }
    
    // Valor extremadamente bajo
    if (valor < 1 && valor > 0) {
      advertencias.push(`Valor muy bajo ($${valor}) - Verificar si es correcto`);
    }
    
    return { valida: errores.filter(e => e.tipo === 'critico').length === 0, errores, advertencias };
  }
  
  /**
   * Valida coherencia de peso
   */
  private static validarPeso(peso: number, valor: number, descripcion: string): {
    valida: boolean;
    errores: ErrorValidacion[];
    advertencias: string[];
  } {
    const errores: ErrorValidacion[] = [];
    const advertencias: string[] = [];
    
    // Peso negativo
    if (peso < 0) {
      errores.push({
        codigo: 'PESO_INVALIDO',
        tipo: 'critico',
        campo: 'pesoKg',
        mensaje: 'Peso declarado es negativo',
        valorActual: `${peso} kg`,
        accionRequerida: 'Corregir peso declarado'
      });
      return { valida: false, errores, advertencias };
    }
    
    // Relación valor/peso sospechosa (menos de $0.50 por kg para items no a granel)
    if (peso > 0 && valor > 10) {
      const valorPorKg = valor / peso;
      if (valorPorKg < 0.5) {
        advertencias.push(`Relación valor/peso baja ($${valorPorKg.toFixed(2)}/kg) - Verificar si es correcto`);
      }
    }
    
    // Electrónicos muy pesados
    const electronicosLivianos = ['phone', 'tablet', 'watch', 'airpods'];
    const descLower = descripcion.toLowerCase();
    if (electronicosLivianos.some(e => descLower.includes(e)) && peso > 5) {
      advertencias.push(`Peso elevado (${peso}kg) para electrónico liviano - Verificar`);
    }
    
    return { valida: errores.length === 0, errores, advertencias };
  }
  
  /**
   * Consulta clasificación AI vía edge function
   */
  private static async consultarClasificacionAI(datos: DatosParaValidacion): Promise<{
    exito: boolean;
    sugerencias: SugerenciaHTS[];
    confianza: number;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('clasificar-hts-ai', {
        body: {
          descripcion: datos.descripcion,
          valorUSD: datos.valorUSD,
          pesoKg: datos.pesoKg,
          paisOrigen: datos.paisOrigen,
          lineItemsFactura: datos.datosFactura?.lineItems
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.clasificacion) {
        const sugerencias: SugerenciaHTS[] = [{
          hsCode: data.clasificacion.hsCode,
          descripcion: data.clasificacion.descripcionArancelaria,
          confianza: data.clasificacion.confianza || 80,
          fundamentoClasificacion: 'Clasificación AI basada en descripción y características',
          daiPercent: data.clasificacion.daiPercent || 0,
          itbmsPercent: data.clasificacion.itbmsPercent || 7,
          requierePermiso: data.clasificacion.requierePermiso || false,
          autoridadAnuente: data.clasificacion.autoridadAnuente
        }];
        
        return {
          exito: true,
          sugerencias,
          confianza: data.clasificacion.confianza || 80
        };
      }
      
      return { exito: false, sugerencias: [], confianza: 0 };
    } catch (error) {
      devError('[Compliance] Error consultando AI:', error);
      return { exito: false, sugerencias: [], confianza: 0 };
    }
  }
  
  /**
   * Compara dos códigos HTS (primeros 6 dígitos)
   */
  private static htsCoincide(hts1: string, hts2: string): boolean {
    const normalizar = (hts: string) => hts.replace(/\./g, '').substring(0, 6);
    return normalizar(hts1) === normalizar(hts2);
  }
  
  /**
   * Valida lote completo de paquetes
   */
  static async validarLote(
    paquetes: ManifestRow[],
    opciones: {
      facturas?: Map<string, { lineItems: string[]; valores: number[] }>;
      onProgress?: (progress: number, mensaje: string) => void;
    } = {}
  ): Promise<{
    totalValidados: number;
    aprobados: number;
    requierenRevision: number;
    erroresCriticos: number;
    resultados: Map<string, ValidacionCompliance>;
  }> {
    const resultados = new Map<string, ValidacionCompliance>();
    let aprobados = 0;
    let requierenRevision = 0;
    let erroresCriticos = 0;
    
    for (let i = 0; i < paquetes.length; i++) {
      const paquete = paquetes[i];
      
      if (opciones.onProgress) {
        opciones.onProgress(
          Math.round((i / paquetes.length) * 100),
          `Validando ${paquete.trackingNumber}...`
        );
      }
      
      const datosFactura = opciones.facturas?.get(paquete.trackingNumber);
      
      const resultado = await this.validar({
        guia: paquete.trackingNumber,
        descripcion: paquete.description,
        valorUSD: paquete.valueUSD,
        pesoKg: paquete.weight * 0.453592, // lb a kg
        datosFactura
      });
      
      resultados.set(paquete.trackingNumber, resultado);
      
      if (resultado.esValido) {
        aprobados++;
      }
      if (resultado.requiereRevisionManual) {
        requierenRevision++;
      }
      if (resultado.erroresValidacion.some(e => e.tipo === 'critico')) {
        erroresCriticos++;
      }
    }
    
    devLog(`[Compliance] Lote validado: ${aprobados}/${paquetes.length} aprobados`);
    
    return {
      totalValidados: paquetes.length,
      aprobados,
      requierenRevision,
      erroresCriticos,
      resultados
    };
  }
}

export default ValidadorComplianceAI;
