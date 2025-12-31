// ============================================
// DETECTOR CONAPRED - PRECURSORES QUÍMICOS
// Comisión Nacional de Prevención de la Droga
// Regulación de sustancias controladas Panamá
// ============================================

import { devLog, devWarn } from '@/lib/logger';

// ============================================
// LISTAS CONAPRED - SUSTANCIAS CONTROLADAS
// Según Ley 48 de 2003 y Decreto 171 de 2014
// ============================================

export type CategoriaSustancia = 
  | 'precursor_clase_1'    // Alta peligrosidad, requiere licencia especial
  | 'precursor_clase_2'    // Peligrosidad media, requiere notificación
  | 'quimico_esencial'     // Usado en síntesis ilícita
  | 'controlado'           // Requiere seguimiento
  | 'prohibido'            // Prohibición total
  | 'farmaceutico_controlado'; // Bajo supervisión MINSA

export interface SustanciaControlada {
  id: string;
  nombre: string;
  nombreQuimico?: string;
  casNumber?: string;
  sinonimos: string[];
  categoria: CategoriaSustancia;
  umbralKg?: number;           // Cantidad que dispara alerta máxima
  requiereLicencia: boolean;
  requiereNotificacion: boolean;
  autoridadCompetente: 'CONAPRED' | 'MINSA' | 'MINGOB';
  descripcionLegal: string;
  sancionAplicable: string;
}

// Base de datos CONAPRED de sustancias controladas
export const SUSTANCIAS_CONTROLADAS: SustanciaControlada[] = [
  // ═══════════════════════════════════════════════════════
  // CLASE 1 - PRECURSORES DE ALTA PELIGROSIDAD
  // ═══════════════════════════════════════════════════════
  {
    id: 'CON001',
    nombre: 'Efedrina',
    nombreQuimico: '(1R,2S)-2-(Methylamino)-1-phenylpropan-1-ol',
    casNumber: '299-42-3',
    sinonimos: ['ephedrine', 'l-ephedrine', 'efedrin'],
    categoria: 'precursor_clase_1',
    umbralKg: 0.1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Precursor de metanfetamina - Control Clase 1',
    sancionAplicable: 'Decomiso + multa B/.50,000-100,000 + proceso penal'
  },
  {
    id: 'CON002',
    nombre: 'Pseudoefedrina',
    nombreQuimico: '(1S,2S)-2-(Methylamino)-1-phenylpropan-1-ol',
    casNumber: '90-82-4',
    sinonimos: ['pseudoephedrine', 'sudafed', 'pseudoefedrin'],
    categoria: 'precursor_clase_1',
    umbralKg: 0.1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Precursor de metanfetamina - Control Clase 1',
    sancionAplicable: 'Decomiso + multa B/.50,000-100,000 + proceso penal'
  },
  {
    id: 'CON003',
    nombre: 'Fenilpropanolamina',
    casNumber: '14838-15-4',
    sinonimos: ['phenylpropanolamine', 'ppa', 'norefedrina'],
    categoria: 'precursor_clase_1',
    umbralKg: 0.1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Precursor controlado - Uso restringido',
    sancionAplicable: 'Decomiso + multa B/.50,000-100,000 + proceso penal'
  },
  {
    id: 'CON004',
    nombre: 'Ácido Lisérgico',
    casNumber: '82-58-6',
    sinonimos: ['lysergic acid', 'lsd precursor'],
    categoria: 'prohibido',
    requiereLicencia: false, // No se permite
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'PROHIBIDO - Precursor de LSD',
    sancionAplicable: 'Proceso penal inmediato'
  },
  {
    id: 'CON005',
    nombre: 'Ergotamina',
    casNumber: '113-15-5',
    sinonimos: ['ergotamine', 'cafergot'],
    categoria: 'precursor_clase_1',
    umbralKg: 0.01,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Precursor de LSD - Medicamento controlado',
    sancionAplicable: 'Decomiso + investigación penal'
  },
  
  // ═══════════════════════════════════════════════════════
  // CLASE 2 - QUÍMICOS ESENCIALES
  // ═══════════════════════════════════════════════════════
  {
    id: 'CON010',
    nombre: 'Ácido Sulfúrico',
    casNumber: '7664-93-9',
    sinonimos: ['sulfuric acid', 'acido sulfurico', 'h2so4', 'battery acid'],
    categoria: 'quimico_esencial',
    umbralKg: 10,
    requiereLicencia: false,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Químico esencial en síntesis - Notificación obligatoria',
    sancionAplicable: 'Multa B/.5,000-20,000 por no notificar'
  },
  {
    id: 'CON011',
    nombre: 'Ácido Clorhídrico',
    casNumber: '7647-01-0',
    sinonimos: ['hydrochloric acid', 'acido clorhidrico', 'muriatic acid', 'hcl'],
    categoria: 'quimico_esencial',
    umbralKg: 10,
    requiereLicencia: false,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Químico esencial en síntesis - Notificación obligatoria',
    sancionAplicable: 'Multa B/.5,000-20,000 por no notificar'
  },
  {
    id: 'CON012',
    nombre: 'Acetona',
    casNumber: '67-64-1',
    sinonimos: ['acetone', 'propanone', 'dimethyl ketone'],
    categoria: 'quimico_esencial',
    umbralKg: 50,
    requiereLicencia: false,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Solvente controlado - Grandes cantidades requieren notificación',
    sancionAplicable: 'Multa B/.5,000-20,000 por no notificar'
  },
  {
    id: 'CON013',
    nombre: 'Tolueno',
    casNumber: '108-88-3',
    sinonimos: ['toluene', 'methylbenzene', 'phenylmethane'],
    categoria: 'quimico_esencial',
    umbralKg: 50,
    requiereLicencia: false,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Solvente controlado - Grandes cantidades requieren notificación',
    sancionAplicable: 'Multa B/.5,000-20,000 por no notificar'
  },
  {
    id: 'CON014',
    nombre: 'Éter Etílico',
    casNumber: '60-29-7',
    sinonimos: ['diethyl ether', 'eter etilico', 'ethyl ether', 'ether'],
    categoria: 'quimico_esencial',
    umbralKg: 5,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Solvente crítico en síntesis de cocaína',
    sancionAplicable: 'Decomiso + multa B/.20,000-50,000'
  },
  {
    id: 'CON015',
    nombre: 'Permanganato de Potasio',
    casNumber: '7722-64-7',
    sinonimos: ['potassium permanganate', 'kmno4', 'chameleon mineral'],
    categoria: 'quimico_esencial',
    umbralKg: 1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'Oxidante crítico en procesamiento de cocaína',
    sancionAplicable: 'Decomiso + multa B/.20,000-50,000'
  },
  
  // ═══════════════════════════════════════════════════════
  // FARMACÉUTICOS CONTROLADOS
  // ═══════════════════════════════════════════════════════
  {
    id: 'CON020',
    nombre: 'Fentanilo',
    casNumber: '437-38-7',
    sinonimos: ['fentanyl', 'sublimaze', 'duragesic'],
    categoria: 'farmaceutico_controlado',
    umbralKg: 0.001, // Extremadamente bajo - muy potente
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'MINSA',
    descripcionLegal: 'Opioide sintético controlado - Uso médico restringido',
    sancionAplicable: 'Decomiso + proceso penal por tráfico'
  },
  {
    id: 'CON021',
    nombre: 'Morfina',
    casNumber: '57-27-2',
    sinonimos: ['morphine', 'ms contin', 'morfin'],
    categoria: 'farmaceutico_controlado',
    umbralKg: 0.1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'MINSA',
    descripcionLegal: 'Opioide natural controlado - Uso médico',
    sancionAplicable: 'Decomiso + proceso penal'
  },
  {
    id: 'CON022',
    nombre: 'Codeína',
    casNumber: '76-57-3',
    sinonimos: ['codeine', 'methylmorphine', 'codeina'],
    categoria: 'farmaceutico_controlado',
    umbralKg: 1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'MINSA',
    descripcionLegal: 'Opioide controlado - Receta especial requerida',
    sancionAplicable: 'Decomiso + multa'
  },
  {
    id: 'CON023',
    nombre: 'Anfetamina',
    casNumber: '300-62-9',
    sinonimos: ['amphetamine', 'speed', 'adderall', 'anfetamina'],
    categoria: 'farmaceutico_controlado',
    umbralKg: 0.1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'MINSA',
    descripcionLegal: 'Estimulante controlado - Uso médico restringido',
    sancionAplicable: 'Decomiso + proceso penal'
  },
  {
    id: 'CON024',
    nombre: 'Metilfenidato',
    casNumber: '113-45-1',
    sinonimos: ['methylphenidate', 'ritalin', 'concerta'],
    categoria: 'farmaceutico_controlado',
    umbralKg: 0.5,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'MINSA',
    descripcionLegal: 'Estimulante controlado - Receta especial',
    sancionAplicable: 'Decomiso + multa'
  },
  {
    id: 'CON025',
    nombre: 'Ketamina',
    casNumber: '6740-88-1',
    sinonimos: ['ketamine', 'ketalar', 'special k'],
    categoria: 'farmaceutico_controlado',
    umbralKg: 0.1,
    requiereLicencia: true,
    requiereNotificacion: true,
    autoridadCompetente: 'MINSA',
    descripcionLegal: 'Anestésico controlado - Uso veterinario/médico',
    sancionAplicable: 'Decomiso + proceso penal'
  },
  
  // ═══════════════════════════════════════════════════════
  // SUSTANCIAS PROHIBIDAS
  // ═══════════════════════════════════════════════════════
  {
    id: 'CON030',
    nombre: 'GHB',
    casNumber: '591-81-1',
    sinonimos: ['gamma-hydroxybutyrate', 'liquid ecstasy', 'ghb'],
    categoria: 'prohibido',
    requiereLicencia: false,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'PROHIBIDO - Droga de violación',
    sancionAplicable: 'Proceso penal inmediato'
  },
  {
    id: 'CON031',
    nombre: 'MDMA',
    casNumber: '42542-10-9',
    sinonimos: ['ecstasy', 'molly', '3,4-methylenedioxy-methamphetamine'],
    categoria: 'prohibido',
    requiereLicencia: false,
    requiereNotificacion: true,
    autoridadCompetente: 'CONAPRED',
    descripcionLegal: 'PROHIBIDO - Droga sintética',
    sancionAplicable: 'Proceso penal inmediato'
  }
];

// ============================================
// INTERFACES DE RESULTADO
// ============================================

export interface AlertaCONAPRED {
  id: string;
  nivel: 'critico' | 'alto' | 'medio' | 'bajo';
  sustanciaId: string;
  sustanciaNombre: string;
  categoria: CategoriaSustancia;
  keywordDetectada: string;
  cantidadEstimada?: number;
  unidad?: string;
  excedioUmbral: boolean;
  requiereNotificacionInmediata: boolean;
  autoridadCompetente: string;
  mensaje: string;
  accionRequerida: string;
  fundamentoLegal: string;
}

export interface ResultadoDeteccionCONAPRED {
  guia: string;
  descripcion: string;
  tieneAlerta: boolean;
  nivelRiesgo: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico';
  alertas: AlertaCONAPRED[];
  requiereDetencion: boolean;
  requiereNotificacionCONAPRED: boolean;
  requiereNotificacionMINSA: boolean;
  puedeProcesoLiquidacion: boolean;
}

// ============================================
// DETECTOR PRINCIPAL
// ============================================

export class DetectorCONAPRED {
  
  /**
   * Analiza descripción buscando sustancias controladas
   */
  static analizarDescripcion(
    descripcion: string,
    opciones: {
      pesoKg?: number;
      guia?: string;
      cantidad?: number;
    } = {}
  ): ResultadoDeteccionCONAPRED {
    const alertas: AlertaCONAPRED[] = [];
    const descLower = descripcion.toLowerCase();
    const guia = opciones.guia || 'N/A';
    
    for (const sustancia of SUSTANCIAS_CONTROLADAS) {
      // Buscar nombre principal
      const todosNombres = [
        sustancia.nombre.toLowerCase(),
        ...(sustancia.nombreQuimico?.toLowerCase() ? [sustancia.nombreQuimico.toLowerCase()] : []),
        ...sustancia.sinonimos.map(s => s.toLowerCase())
      ];
      
      for (const nombre of todosNombres) {
        if (this.matchPalabraCompleta(descLower, nombre)) {
          const excedioUmbral = sustancia.umbralKg && opciones.pesoKg 
            ? opciones.pesoKg >= sustancia.umbralKg
            : false;
          
          const alerta: AlertaCONAPRED = {
            id: `ALERT-${sustancia.id}-${Date.now()}`,
            nivel: this.determinarNivelAlerta(sustancia, excedioUmbral),
            sustanciaId: sustancia.id,
            sustanciaNombre: sustancia.nombre,
            categoria: sustancia.categoria,
            keywordDetectada: nombre,
            cantidadEstimada: opciones.pesoKg,
            unidad: 'kg',
            excedioUmbral,
            requiereNotificacionInmediata: sustancia.categoria === 'prohibido' || 
                                           sustancia.categoria === 'precursor_clase_1',
            autoridadCompetente: sustancia.autoridadCompetente,
            mensaje: this.generarMensajeAlerta(sustancia, excedioUmbral),
            accionRequerida: this.determinarAccion(sustancia, excedioUmbral),
            fundamentoLegal: sustancia.descripcionLegal
          };
          
          alertas.push(alerta);
          devWarn(`[CONAPRED] ⚠️ Sustancia detectada: ${sustancia.nombre} en guía ${guia}`);
          break; // Solo una alerta por sustancia
        }
      }
    }
    
    // Determinar resultado global
    const tieneAlerta = alertas.length > 0;
    const nivelMasAlto = this.obtenerNivelMasAlto(alertas);
    const requiereDetencion = alertas.some(a => 
      a.nivel === 'critico' || a.categoria === 'prohibido'
    );
    const requiereCONAPRED = alertas.some(a => 
      a.autoridadCompetente === 'CONAPRED' && a.requiereNotificacionInmediata
    );
    const requiereMINSA = alertas.some(a => 
      a.autoridadCompetente === 'MINSA' && a.requiereNotificacionInmediata
    );
    
    return {
      guia,
      descripcion,
      tieneAlerta,
      nivelRiesgo: nivelMasAlto,
      alertas,
      requiereDetencion,
      requiereNotificacionCONAPRED: requiereCONAPRED,
      requiereNotificacionMINSA: requiereMINSA,
      puedeProcesoLiquidacion: !requiereDetencion
    };
  }
  
  /**
   * Verifica palabra completa (word boundary)
   */
  private static matchPalabraCompleta(texto: string, palabra: string): boolean {
    const escaped = palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i');
    return regex.test(texto);
  }
  
  /**
   * Determina nivel de alerta
   */
  private static determinarNivelAlerta(
    sustancia: SustanciaControlada,
    excedioUmbral: boolean
  ): 'critico' | 'alto' | 'medio' | 'bajo' {
    if (sustancia.categoria === 'prohibido') return 'critico';
    if (sustancia.categoria === 'precursor_clase_1') return excedioUmbral ? 'critico' : 'alto';
    if (sustancia.categoria === 'farmaceutico_controlado') return excedioUmbral ? 'alto' : 'medio';
    if (sustancia.categoria === 'quimico_esencial') return excedioUmbral ? 'medio' : 'bajo';
    return 'bajo';
  }
  
  /**
   * Genera mensaje de alerta
   */
  private static generarMensajeAlerta(
    sustancia: SustanciaControlada,
    excedioUmbral: boolean
  ): string {
    if (sustancia.categoria === 'prohibido') {
      return `🚫 PROHIBIDO: ${sustancia.nombre} - Detener inmediatamente y notificar autoridades`;
    }
    if (sustancia.categoria === 'precursor_clase_1') {
      return `⛔ PRECURSOR CLASE 1: ${sustancia.nombre} - Licencia CONAPRED obligatoria`;
    }
    if (excedioUmbral) {
      return `⚠️ UMBRAL EXCEDIDO: ${sustancia.nombre} supera ${sustancia.umbralKg}kg - Notificación requerida`;
    }
    return `📋 CONTROLADO: ${sustancia.nombre} detectado - Verificar documentación`;
  }
  
  /**
   * Determina acción requerida
   */
  private static determinarAccion(
    sustancia: SustanciaControlada,
    excedioUmbral: boolean
  ): string {
    if (sustancia.categoria === 'prohibido') {
      return 'DETENER DESPACHO. Notificar CONAPRED y Ministerio Público inmediatamente.';
    }
    if (sustancia.categoria === 'precursor_clase_1') {
      return 'Solicitar Licencia CONAPRED vigente. Sin licencia = decomiso.';
    }
    if (sustancia.requiereLicencia) {
      return `Verificar licencia ${sustancia.autoridadCompetente}. Retener hasta presentación.`;
    }
    if (sustancia.requiereNotificacion && excedioUmbral) {
      return `Notificar a ${sustancia.autoridadCompetente} cantidad importada.`;
    }
    return 'Proceder con verificación estándar de documentos.';
  }
  
  /**
   * Obtiene nivel más alto de alertas
   */
  private static obtenerNivelMasAlto(
    alertas: AlertaCONAPRED[]
  ): 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico' {
    if (alertas.length === 0) return 'ninguno';
    
    const niveles = { critico: 4, alto: 3, medio: 2, bajo: 1 };
    let maxNivel = 0;
    let maxNombre: 'bajo' | 'medio' | 'alto' | 'critico' = 'bajo';
    
    for (const alerta of alertas) {
      if (niveles[alerta.nivel] > maxNivel) {
        maxNivel = niveles[alerta.nivel];
        maxNombre = alerta.nivel;
      }
    }
    
    return maxNombre;
  }
  
  /**
   * Analiza lote completo
   */
  static analizarManifiesto(
    items: Array<{ descripcion: string; pesoKg?: number; guia: string }>
  ): {
    totalItems: number;
    itemsConAlerta: number;
    alertasCriticas: number;
    alertasAltas: number;
    requiereNotificacionCONAPRED: boolean;
    resultados: ResultadoDeteccionCONAPRED[];
    resumenSustancias: Map<string, number>;
  } {
    const resultados: ResultadoDeteccionCONAPRED[] = [];
    const resumenSustancias = new Map<string, number>();
    let alertasCriticas = 0;
    let alertasAltas = 0;
    let requiereCONAPRED = false;
    
    for (const item of items) {
      const resultado = this.analizarDescripcion(item.descripcion, {
        pesoKg: item.pesoKg,
        guia: item.guia
      });
      
      resultados.push(resultado);
      
      if (resultado.requiereNotificacionCONAPRED) requiereCONAPRED = true;
      
      for (const alerta of resultado.alertas) {
        resumenSustancias.set(
          alerta.sustanciaNombre,
          (resumenSustancias.get(alerta.sustanciaNombre) || 0) + 1
        );
        
        if (alerta.nivel === 'critico') alertasCriticas++;
        if (alerta.nivel === 'alto') alertasAltas++;
      }
    }
    
    devLog(`[CONAPRED] Análisis completado: ${resultados.filter(r => r.tieneAlerta).length}/${items.length} con alertas`);
    
    return {
      totalItems: items.length,
      itemsConAlerta: resultados.filter(r => r.tieneAlerta).length,
      alertasCriticas,
      alertasAltas,
      requiereNotificacionCONAPRED: requiereCONAPRED,
      resultados,
      resumenSustancias
    };
  }
}

export default DetectorCONAPRED;
