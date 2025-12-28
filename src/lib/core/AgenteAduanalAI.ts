// ============================================
// AGENTE ADUANAL AI-FIRST
// Orquestador principal - Cumplimiento total Panamá 2025
// ============================================

import { ManifestRow } from '@/types/manifest';
import { Arancel } from '@/types/aduanas';
import { MotorClasificacionHTS, ResultadoClasificacionHTS } from './MotorClasificacionHTS';
import { MotorLiquidacionSIGA, ResultadoLiquidacionSIGA } from './MotorLiquidacionSIGA';
import { DetectorRiesgos, AuditoriaLote } from './DetectorRiesgos';
import { descargarExcelInteligente, DatosExcelInteligente } from './GeneradorExcelInteligente';
import { generarFirmaDigital, FirmaDigital, CLAUSULA_RESPONSABILIDAD } from './SistemaFirmaDigital';
import { GestorRestriccionesAprendidas } from '@/lib/aprendizaje/gestorRestriccionesAprendidas';
import { devLog } from '@/lib/logger';
import { Liquidacion } from '@/types/aduanas';

export interface ResultadoProcesamientoCompleto {
  clasificaciones: Map<string, ResultadoClasificacionHTS>;
  liquidaciones: ResultadoLiquidacionSIGA[];
  auditoria: AuditoriaLote;
  resumen: {
    total: number;
    deMinimis: number;
    liquidacion: number;
    conPermisos: number;
    requierenRevision: number;
    totalTributos: number;
    totalAPagar: number;
  };
}

export class AgenteAduanalAI {
  
  static async procesarManifiesto(
    paquetes: ManifestRow[],
    manifiestoId: string,
    opciones: { fechaRegistro?: Date; facturasLineItems?: Map<string, string[]> } = {}
  ): Promise<ResultadoProcesamientoCompleto> {
    devLog(`[Agente] Procesando ${paquetes.length} paquetes`);
    
    // 1. Clasificación HTS con NLP
    const { clasificaciones, requierenRevision } = MotorClasificacionHTS.procesarLote(
      paquetes, opciones.facturasLineItems
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
    
    // 2. Construir mapa de aranceles
    const aranceles = new Map<string, Arancel>();
    clasificaciones.forEach((c, guia) => aranceles.set(guia, c.arancel));
    
    // 3. Liquidación SIGA
    const { liquidaciones, resumen } = MotorLiquidacionSIGA.procesarLote(
      paquetes, aranceles, manifiestoId, { fechaRegistro: opciones.fechaRegistro }
    );
    
    // 4. Auditoría de riesgos (ahora con HTS asignados a paquetes)
    const hsCodes = new Map<string, string>();
    clasificaciones.forEach((c, guia) => hsCodes.set(guia, c.hsCode));
    const auditoria = DetectorRiesgos.auditarLote(paquetes, { hsCodes });
    
    return {
      clasificaciones,
      liquidaciones,
      auditoria,
      resumen: {
        total: paquetes.length,
        deMinimis: resumen.porCategoria.B.cantidad,
        liquidacion: resumen.porCategoria.C.cantidad + resumen.porCategoria.D.cantidad,
        conPermisos: liquidaciones.filter(l => l.tieneRestricciones).length,
        requierenRevision: requierenRevision.length,
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
  
  static get CLAUSULA_RESPONSABILIDAD() { return CLAUSULA_RESPONSABILIDAD; }
}

export default AgenteAduanalAI;
