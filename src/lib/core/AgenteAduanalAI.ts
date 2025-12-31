// ============================================
// AGENTE ADUANAL AI-FIRST
// Orquestador principal - Cumplimiento total Panamá 2025
// ============================================

import { ManifestRow } from '@/types/manifest';
import { Arancel } from '@/types/aduanas';
import { ZonaAduanera } from '@/types/transporte';
import { MotorClasificacionHTS, ResultadoClasificacionHTS } from './MotorClasificacionHTS';
import { MotorLiquidacionSIGA, ResultadoLiquidacionSIGA } from './MotorLiquidacionSIGA';
import { DetectorRiesgos, AuditoriaLote } from './DetectorRiesgos';
import { descargarExcelInteligente, DatosExcelInteligente } from './GeneradorExcelInteligente';
import { generarFirmaDigital, FirmaDigital, CLAUSULA_RESPONSABILIDAD } from './SistemaFirmaDigital';
import { GestorRestriccionesAprendidas } from '@/lib/aprendizaje/gestorRestriccionesAprendidas';
import { devLog } from '@/lib/logger';
import { Liquidacion } from '@/types/aduanas';
import { DetectorCONAPRED, ResultadoDeteccionCONAPRED } from '@/lib/regulatorio/DetectorCONAPRED';
import { 
  obtenerPuntosPorZona,
  verificarRestriccionesPunto, 
  obtenerDocumentosRequeridos,
  calcularTasasPuntoControl 
} from '@/lib/regulatorio/ReglasZonasAduaneras';
import { ValidadorComplianceAI, ValidacionCompliance } from './ValidadorComplianceAI';

// Tipo para resultado de análisis CONAPRED de manifiesto
export interface ResultadoAnalisisCONAPREDManifiesto {
  totalItems: number;
  itemsConAlerta: number;
  alertasCriticas: number;
  alertasAltas: number;
  requiereNotificacionCONAPRED: boolean;
  resultados: ResultadoDeteccionCONAPRED[];
  resumenSustancias: Map<string, number>;
}

export interface ResultadoProcesamientoCompleto {
  clasificaciones: Map<string, ResultadoClasificacionHTS>;
  liquidaciones: ResultadoLiquidacionSIGA[];
  auditoria: AuditoriaLote;
  // Nuevos campos de compliance
  analisisCONAPRED: ResultadoAnalisisCONAPREDManifiesto;
  validacionCompliance: Map<string, ValidacionCompliance>;
  tasasZonaAduanera: { concepto: string; monto: number; subtotal: number }[];
  documentosRequeridos: string[];
  resumen: {
    total: number;
    deMinimis: number;
    liquidacion: number;
    conPermisos: number;
    requierenRevision: number;
    alertasCONAPRED: number;
    totalTributos: number;
    totalAPagar: number;
  };
}

export interface OpcionesProcesamientoAgente {
  fechaRegistro?: Date;
  facturasLineItems?: Map<string, string[]>;
  zonaAduanera?: ZonaAduanera;
  validarComplianceAI?: boolean;
}

export class AgenteAduanalAI {
  
  static async procesarManifiesto(
    paquetes: ManifestRow[],
    manifiestoId: string,
    opciones: OpcionesProcesamientoAgente = {}
  ): Promise<ResultadoProcesamientoCompleto> {
    devLog(`[Agente] Procesando ${paquetes.length} paquetes`);
    
    const zonaAduanera = opciones.zonaAduanera || 'aeropuerto_tocumen';
    
    // 0. Análisis CONAPRED - Precursores químicos y sustancias controladas
    const itemsCONAPRED = paquetes.map(p => ({
      descripcion: p.description || '',
      pesoKg: (p.weight || 0) * 0.453592, // lb a kg
      guia: p.trackingNumber
    }));
    const analisisCONAPRED = DetectorCONAPRED.analizarManifiesto(itemsCONAPRED);
    
    if (analisisCONAPRED.alertasCriticas > 0) {
      devLog(`[Agente][CONAPRED] ⚠️ ALERTA CRÍTICA: ${analisisCONAPRED.alertasCriticas} alertas críticas detectadas`);
    }
    
    // 1. Clasificación HTS con NLP + Lovable AI (cuando sea necesario)
    const { clasificaciones, requierenRevision } = await MotorClasificacionHTS.procesarLoteConAI(
      paquetes,
      opciones.facturasLineItems
    );
    
    // 1.5. Enriquecer paquetes con código HTS para análisis de subvaluación
    paquetes.forEach(paquete => {
      const clasificacion = clasificaciones.get(paquete.trackingNumber);
      if (clasificacion) {
        paquete.hsCode = clasificacion.hsCode;
        paquete.descripcionArancelaria = clasificacion.descripcionArancelaria;
        paquete.confianzaHTS = clasificacion.confianzaClasificacion;
        if (clasificacion.autoridadesInvolucradas.length > 0) {
          paquete.autoridadAnuente = clasificacion.autoridadesInvolucradas[0];
        }
      }
    });
    
    devLog(`[Agente] HTS asignados a ${clasificaciones.size} paquetes`);
    
    // 2. Validación Compliance AI (opcional pero recomendado)
    let validacionCompliance = new Map<string, ValidacionCompliance>();
    if (opciones.validarComplianceAI !== false) {
      const resultadoCompliance = await ValidadorComplianceAI.validarLote(paquetes);
      validacionCompliance = resultadoCompliance.resultados;
      
      if (resultadoCompliance.erroresCriticos > 0) {
        devLog(`[Agente][Compliance] ${resultadoCompliance.erroresCriticos} items con errores críticos`);
      }
    }
    
    // 3. Construir mapa de aranceles
    const aranceles = new Map<string, Arancel>();
    clasificaciones.forEach((c, guia) => aranceles.set(guia, c.arancel));
    
    // 4. Liquidación SIGA
    const { liquidaciones, resumen } = MotorLiquidacionSIGA.procesarLote(
      paquetes, aranceles, manifiestoId, { fechaRegistro: opciones.fechaRegistro }
    );
    
    // 5. Obtener tasas y documentos según zona aduanera
    const puntos = obtenerPuntosPorZona(zonaAduanera);
    const codigoPunto = puntos.length > 0 ? puntos[0].codigo : zonaAduanera;
    const tasasZonaAduanera = calcularTasasPuntoControl(codigoPunto, {
      modo: 'aereo', // Default, podría inferirse
      cantidadBultos: paquetes.length
    });
    const documentosRequeridos = obtenerDocumentosRequeridos(codigoPunto);
    
    // 6. Verificar restricciones por zona
    const restriccionesZona = verificarRestriccionesPunto(codigoPunto, paquetes[0]?.description || '');
    
    if (restriccionesZona.tieneRestriccion) {
      devLog(`[Agente][Zona] Restricciones en ${zonaAduanera}: ${restriccionesZona.restricciones.join(', ')}`);
    }
    
    // 7. Auditoría de riesgos (ahora con HTS asignados a paquetes)
    const hsCodes = new Map<string, string>();
    clasificaciones.forEach((c, guia) => hsCodes.set(guia, c.hsCode));
    const auditoria = DetectorRiesgos.auditarLote(paquetes, { hsCodes });
    
    // Calcular items que requieren revisión
    let itemsRequierenRevision = requierenRevision.length;
    validacionCompliance.forEach((v) => {
      if (v.requiereRevisionManual) itemsRequierenRevision++;
    });
    
    return {
      clasificaciones,
      liquidaciones,
      auditoria,
      analisisCONAPRED,
      validacionCompliance,
      tasasZonaAduanera,
      documentosRequeridos,
      resumen: {
        total: paquetes.length,
        deMinimis: resumen.porCategoria.B.cantidad,
        liquidacion: resumen.porCategoria.C.cantidad + resumen.porCategoria.D.cantidad,
        conPermisos: liquidaciones.filter(l => l.tieneRestricciones).length,
        requierenRevision: itemsRequierenRevision,
        alertasCONAPRED: analisisCONAPRED.itemsConAlerta,
        totalTributos: resumen.totalTributos,
        totalAPagar: resumen.totalAPagar
      }
    };
  }
  
  static async descargarConFirma(
    resultado: ResultadoProcesamientoCompleto,
    paquetes: ManifestRow[],
    corredor: { id: string; nombre: string },
    mawb?: string
  ): Promise<{ firma: FirmaDigital; archivoDescargado: boolean }> {
    const documentoId = `DOC_${Date.now()}`;
    const contenido = JSON.stringify({ total: paquetes.length, mawb });
    
    const firma = await generarFirmaDigital(contenido, corredor.id, corredor.nombre, documentoId);
    
    // Convertir ResultadoLiquidacionSIGA[] a Liquidacion[]
    const liquidaciones: Liquidacion[] = resultado.liquidaciones.map(l => ({
      id: l.id || `LIQ_${l.numeroGuia}`,
      numeroGuia: l.numeroGuia,
      manifiestoId: mawb || 'SIN_MAWB',
      categoriaAduanera: l.categoriaAduanera,
      categoriaDescripcion: l.categoriaDescripcion || '',
      valorFOB: l.valorFOB,
      valorFlete: l.valorFlete,
      valorSeguro: l.valorSeguro,
      valorCIF: l.valorCIF,
      monedaOriginal: 'USD',
      tipoCambio: 1,
      hsCode: l.hsCode,
      descripcionArancelaria: l.descripcionArancelaria,
      percentDAI: l.percentDAI,
      percentISC: l.percentISC,
      percentITBMS: l.percentITBMS,
      montoDAI: l.montoDAI,
      baseISC: l.valorCIF + l.montoDAI,
      montoISC: l.montoISC,
      baseITBMS: l.valorCIF + l.montoDAI + l.montoISC,
      montoITBMS: l.montoITBMS,
      tasaAduanera: l.tasaAduanera,
      tasasAdicionales: 0,
      totalTributos: l.boletaPago.montoActual - l.valorCIF,
      totalAPagar: l.boletaPago.montoActual,
      estado: l.estado as any || 'calculada',
      tieneRestricciones: l.tieneRestricciones,
      restricciones: l.restricciones,
      observaciones: l.observaciones,
      requiereRevisionManual: l.requiereRevisionManual,
      calculadaPor: 'SISTEMA_AI',
      fechaCalculo: new Date().toISOString(),
      version: 1
    }));

    const datos: DatosExcelInteligente = {
      paquetes,
      liquidaciones,
      mawb: mawb || 'SIN_MAWB',
      fechaProceso: new Date()
    };
    
    await descargarExcelInteligente(datos);
    return { firma, archivoDescargado: true };
  }
  
  static registrarAprendizaje(guia: string, palabraClave: string, autoridad: string, descripcion: string): void {
    GestorRestriccionesAprendidas.aprenderRestriccion(palabraClave, 'farmaceutico', autoridad, descripcion, { guiaOrigen: guia });
  }
  
  // Acceso directo a módulos regulatorios
  static get DetectorCONAPRED() { return DetectorCONAPRED; }
  static get ValidadorComplianceAI() { return ValidadorComplianceAI; }
  
  static get CLAUSULA_RESPONSABILIDAD() { return CLAUSULA_RESPONSABILIDAD; }
}

export default AgenteAduanalAI;
