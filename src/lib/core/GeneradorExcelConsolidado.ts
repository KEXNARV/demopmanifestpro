// ============================================
// GENERADOR EXCEL CONSOLIDADO (DEPRECADO)
// Usar GeneradorExcelInteligente.ts en su lugar
// ============================================

// Re-exportar desde el nuevo generador inteligente
export {
  generarExcelInteligente as generarExcelConsolidado,
  descargarExcelInteligente as descargarExcelConsolidado,
  type DatosExcelInteligente as DatosExcelConsolidado
} from './GeneradorExcelInteligente';

// Mantener compatibilidad con imports existentes
import { 
  generarExcelInteligente, 
  descargarExcelInteligente,
  type DatosExcelInteligente 
} from './GeneradorExcelInteligente';

export default {
  generarExcelConsolidado: generarExcelInteligente,
  descargarExcelConsolidado: descargarExcelInteligente
};
