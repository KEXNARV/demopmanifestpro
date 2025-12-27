// ============================================
// AGENTE ADUANAL AI-FIRST
// Orquestador principal - Cumplimiento total Panamá 2025
// ============================================

import { ManifestRow } from '@/types/manifest';
import { Arancel } from '@/types/aduanas';
import { MotorClasificacionHTS, ResultadoClasificacionHTS } from './MotorClasificacionHTS';
import { MotorLiquidacionSIGA, ResultadoLiquidacionSIGA } from './MotorLiquidacionSIGA';
import { DetectorRiesgos, AuditoriaLote } from './DetectorRiesgos';
import { generarExcelConsolidado, DatosExcelConsolidado, descargarExcelConsolidado } from './GeneradorExcelConsolidado';
import { generarFirmaDigital, FirmaDigital, CLAUSULA_RESPONSABILIDAD } from './SistemaFirmaDigital';
import { GestorRestriccionesAprendidas } from '@/lib/aprendizaje/gestorRestriccionesAprendidas';
import { devLog } from '@/lib/logger';

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
    
    // 2. Construir mapa de aranceles
    const aranceles = new Map<string, Arancel>();
    clasificaciones.forEach((c, guia) => aranceles.set(guia, c.arancel));
    
    // 3. Liquidación SIGA
    const { liquidaciones, resumen } = MotorLiquidacionSIGA.procesarLote(
      paquetes, aranceles, manifiestoId, { fechaRegistro: opciones.fechaRegistro }
    );
    
    // 4. Auditoría de riesgos
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
    
    const datos: DatosExcelConsolidado = {
      paquetes,
      liquidaciones: resultado.liquidaciones,
      clasificaciones: resultado.clasificaciones,
      auditorias: resultado.auditoria.paquetesProblematicos,
      metadatos: { mawb, fechaManifiesto: new Date(), pesoTotal: paquetes.reduce((s, p) => s + (p.weight || 0), 0), firmaDigital: firma.hash }
    };
    
    await descargarExcelConsolidado(datos, `Liquidacion_${mawb || 'MAWB'}`);
    return { firma, archivoDescargado: true };
  }
  
  static registrarAprendizaje(guia: string, palabraClave: string, autoridad: string, descripcion: string): void {
    GestorRestriccionesAprendidas.aprenderRestriccion(palabraClave, 'farmaceutico', autoridad, descripcion, { guiaOrigen: guia });
  }
  
  static get CLAUSULA_RESPONSABILIDAD() { return CLAUSULA_RESPONSABILIDAD; }
}

export default AgenteAduanalAI;
