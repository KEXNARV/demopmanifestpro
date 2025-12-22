// ============================================
// MOTOR DE FILTRO SANITARIO MINSA
// Dirección Nacional de Farmacia y Drogas
// ============================================

import { ManifestRow } from '@/types/manifest';
import {
  EstadoMINSA,
  TipoImportacion,
  ResultadoFiltroSanitario,
  DocumentoRequerido,
  AlertaSanitaria,
  ConfiguracionFiltro,
  KEYWORDS_MINSA,
  KEYWORDS_RECETA_OBLIGATORIA,
  KEYWORDS_PROHIBIDOS,
  INDICADORES_CANTIDAD_COMERCIAL,
  CONFIG_DEFAULT
} from './tiposFiltro';

/**
 * Motor principal del filtro sanitario
 * Analiza paquetes y determina requisitos MINSA
 */
export class MotorFiltroSanitario {
  private config: ConfiguracionFiltro;

  constructor(config: Partial<ConfiguracionFiltro> = {}) {
    this.config = { ...CONFIG_DEFAULT, ...config };
  }

  /**
   * Analiza un paquete individual
   */
  analizarPaquete(
    paquete: ManifestRow,
    tipoImportacion: TipoImportacion = 'B2C'
  ): ResultadoFiltroSanitario {
    const descripcion = paquete.description?.toLowerCase() || '';
    
    // 1. Detectar keywords MINSA
    const keywordsDetectadas = this.detectarKeywords(descripcion);
    const requiresMinsaCheck = keywordsDetectadas.length > 0;

    // 2. Verificar lista negra (AUTO-REJECT)
    const esProhibido = this.verificarListaNegra(descripcion);
    
    if (esProhibido) {
      return this.crearResultadoProhibido(paquete, keywordsDetectadas);
    }

    // 3. Si no requiere verificación MINSA, aprobar
    if (!requiresMinsaCheck) {
      return this.crearResultadoAprobado(paquete);
    }

    // 4. Evaluar intención (personal vs comercial)
    const cantidadSospechosa = this.detectarCantidadComercial(descripcion);
    
    if (tipoImportacion === 'B2B' || cantidadSospechosa) {
      return this.crearResultadoComercial(paquete, keywordsDetectadas, cantidadSospechosa);
    }

    // 5. Importación personal - determinar documentos requeridos
    return this.crearResultadoPersonal(paquete, keywordsDetectadas, descripcion);
  }

  /**
   * Analiza múltiples paquetes
   */
  analizarManifiesto(
    paquetes: ManifestRow[],
    tipoImportacion: TipoImportacion = 'B2C'
  ): ResultadoFiltroSanitario[] {
    return paquetes.map(p => this.analizarPaquete(p, tipoImportacion));
  }

  /**
   * Obtiene resumen del análisis
   */
  obtenerResumen(resultados: ResultadoFiltroSanitario[]): ResumenFiltroSanitario {
    const total = resultados.length;
    const aprobados = resultados.filter(r => r.estado === 'CLEARED').length;
    const requierenDocumentos = resultados.filter(r => 
      r.estado === 'DOCUMENTS_REQUIRED' || r.estado === 'PERSONAL_USE'
    ).length;
    const detenidosComercial = resultados.filter(r => r.estado === 'COMMERCIAL_HOLD').length;
    const prohibidos = resultados.filter(r => r.estado === 'PROHIBITED_GOODS').length;
    const requierenAccion = resultados.filter(r => r.requiereAccion).length;

    // Agrupar keywords detectadas
    const keywordsConteo: Record<string, number> = {};
    resultados.forEach(r => {
      r.keywordsDetectadas.forEach(k => {
        keywordsConteo[k] = (keywordsConteo[k] || 0) + 1;
      });
    });

    const topKeywords = Object.entries(keywordsConteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total,
      aprobados,
      requierenDocumentos,
      detenidosComercial,
      prohibidos,
      requierenAccion,
      topKeywords,
      porcentajeAprobado: total > 0 ? (aprobados / total) * 100 : 0,
      porcentajeProhibido: total > 0 ? (prohibidos / total) * 100 : 0
    };
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private detectarKeywords(descripcion: string): string[] {
    const encontradas: string[] = [];
    
    for (const keyword of KEYWORDS_MINSA) {
      if (descripcion.includes(keyword.toLowerCase())) {
        encontradas.push(keyword);
      }
    }
    
    return [...new Set(encontradas)];
  }

  private verificarListaNegra(descripcion: string): boolean {
    for (const keyword of KEYWORDS_PROHIBIDOS) {
      if (descripcion.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private detectarCantidadComercial(descripcion: string): boolean {
    for (const patron of INDICADORES_CANTIDAD_COMERCIAL) {
      const match = descripcion.match(patron);
      if (match) {
        // Verificar si la cantidad excede límites personales
        const cantidad = parseInt(match[1] || '0');
        if (cantidad >= this.config.limiteUnidadesPersonal) {
          return true;
        }
      }
    }
    return false;
  }

  private requiereRecetaMedica(descripcion: string): boolean {
    for (const keyword of KEYWORDS_RECETA_OBLIGATORIA) {
      if (descripcion.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private crearDocumentosRequeridos(descripcion: string, esComercial: boolean): DocumentoRequerido[] {
    const documentos: DocumentoRequerido[] = [];

    if (esComercial) {
      // B2B - Requiere registro sanitario y licencia
      documentos.push({
        id: 'registro_sanitario',
        tipo: 'registro_sanitario',
        nombre: 'Registro Sanitario',
        descripcion: 'Documento de Registro Sanitario emitido por MINSA',
        obligatorio: true,
        subido: false
      });
      documentos.push({
        id: 'licencia_importacion',
        tipo: 'licencia_importacion',
        nombre: 'Licencia de Importación Farmacia y Drogas',
        descripcion: 'Licencia vigente para importación de productos farmacéuticos',
        obligatorio: true,
        subido: false
      });
    } else {
      // B2C - Uso personal
      if (this.requiereRecetaMedica(descripcion)) {
        documentos.push({
          id: 'receta_medica',
          tipo: 'receta_medica',
          nombre: 'Receta Médica',
          descripcion: 'Receta médica válida que justifique el uso del medicamento',
          obligatorio: true,
          subido: false
        });
      }

      documentos.push({
        id: 'carta_relevo',
        tipo: 'carta_relevo',
        nombre: 'Carta de Relevo',
        descripcion: 'Declaración de uso personal (generar automáticamente)',
        obligatorio: true,
        subido: false
      });

      documentos.push({
        id: 'identificacion',
        tipo: 'identificacion',
        nombre: 'Documento de Identidad',
        descripcion: 'Cédula de identidad o pasaporte del consignatario',
        obligatorio: true,
        subido: false
      });
    }

    return documentos;
  }

  private crearAlertas(estado: EstadoMINSA, keywordsDetectadas: string[], descripcion: string): AlertaSanitaria[] {
    const alertas: AlertaSanitaria[] = [];

    if (estado === 'PROHIBITED_GOODS') {
      const keywordProhibida = KEYWORDS_PROHIBIDOS.find(k => descripcion.includes(k.toLowerCase()));
      alertas.push({
        id: 'alert_prohibited',
        tipo: 'critical',
        titulo: '⛔ PRODUCTO PROHIBIDO',
        mensaje: `Se detectó sustancia prohibida: "${keywordProhibida}". Este producto NO puede ingresar al país.`,
        accionRequerida: 'Rechazar entrada. No permitir liquidación.'
      });
    }

    if (estado === 'COMMERCIAL_HOLD') {
      alertas.push({
        id: 'alert_commercial',
        tipo: 'error',
        titulo: '🚨 POSIBLE CARGA COMERCIAL',
        mensaje: 'La cantidad detectada sugiere uso comercial. Se requiere Registro Sanitario para proceder.',
        accionRequerida: 'Solicitar Registro Sanitario y Licencia de Importación.'
      });
    }

    if (this.requiereRecetaMedica(descripcion)) {
      alertas.push({
        id: 'alert_prescription',
        tipo: 'warning',
        titulo: '💊 MEDICAMENTO CONTROLADO',
        mensaje: 'Este producto requiere receta médica obligatoria para su importación.',
        accionRequerida: 'Solicitar receta médica válida.'
      });
    }

    if (keywordsDetectadas.length > 0 && estado === 'PERSONAL_USE') {
      alertas.push({
        id: 'alert_documents',
        tipo: 'info',
        titulo: '📋 DOCUMENTOS REQUERIDOS',
        mensaje: `Productos detectados: ${keywordsDetectadas.slice(0, 3).join(', ')}. Se requieren documentos habilitantes.`,
        accionRequerida: 'Subir documentos antes de proceder con la liquidación.'
      });
    }

    return alertas;
  }

  private crearResultadoAprobado(paquete: ManifestRow): ResultadoFiltroSanitario {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'CLEARED',
      tipoImportacion: 'B2C',
      keywordsDetectadas: [],
      cantidadSospechosa: false,
      esProhibido: false,
      documentosRequeridos: [],
      alertas: [],
      fechaAnalisis: new Date(),
      requiereAccion: false,
      puedeProcesoLiquidacion: true
    };
  }

  private crearResultadoProhibido(paquete: ManifestRow, keywords: string[]): ResultadoFiltroSanitario {
    const descripcion = paquete.description?.toLowerCase() || '';
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'PROHIBITED_GOODS',
      tipoImportacion: 'B2C',
      keywordsDetectadas: keywords,
      cantidadSospechosa: false,
      esProhibido: true,
      documentosRequeridos: [],
      alertas: this.crearAlertas('PROHIBITED_GOODS', keywords, descripcion),
      fechaAnalisis: new Date(),
      requiereAccion: true,
      puedeProcesoLiquidacion: false
    };
  }

  private crearResultadoComercial(
    paquete: ManifestRow, 
    keywords: string[], 
    cantidadSospechosa: boolean
  ): ResultadoFiltroSanitario {
    const descripcion = paquete.description?.toLowerCase() || '';
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'COMMERCIAL_HOLD',
      tipoImportacion: 'B2B',
      keywordsDetectadas: keywords,
      cantidadSospechosa,
      esProhibido: false,
      documentosRequeridos: this.crearDocumentosRequeridos(descripcion, true),
      alertas: this.crearAlertas('COMMERCIAL_HOLD', keywords, descripcion),
      fechaAnalisis: new Date(),
      requiereAccion: true,
      puedeProcesoLiquidacion: false
    };
  }

  private crearResultadoPersonal(
    paquete: ManifestRow, 
    keywords: string[],
    descripcion: string
  ): ResultadoFiltroSanitario {
    const documentos = this.crearDocumentosRequeridos(descripcion, false);
    
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'DOCUMENTS_REQUIRED',
      tipoImportacion: 'B2C',
      keywordsDetectadas: keywords,
      cantidadSospechosa: false,
      esProhibido: false,
      documentosRequeridos: documentos,
      alertas: this.crearAlertas('PERSONAL_USE', keywords, descripcion),
      fechaAnalisis: new Date(),
      requiereAccion: true,
      puedeProcesoLiquidacion: false
    };
  }
}

export interface ResumenFiltroSanitario {
  total: number;
  aprobados: number;
  requierenDocumentos: number;
  detenidosComercial: number;
  prohibidos: number;
  requierenAccion: number;
  topKeywords: [string, number][];
  porcentajeAprobado: number;
  porcentajeProhibido: number;
}

// Singleton para uso global
let instanciaMotor: MotorFiltroSanitario | null = null;

export function getMotorFiltroSanitario(config?: Partial<ConfiguracionFiltro>): MotorFiltroSanitario {
  if (!instanciaMotor || config) {
    instanciaMotor = new MotorFiltroSanitario(config);
  }
  return instanciaMotor;
}
