// ============================================
// HOOK: USE AGENTE ADUANAL
// Interfaz React para el Agente Aduanal AI-First
// ============================================

import { useState, useCallback } from 'react';
import { ManifestRow } from '@/types/manifest';
import { AgenteAduanalAI, ResultadoProcesamientoCompleto } from '@/lib/core/AgenteAduanalAI';
import { FirmaDigital } from '@/lib/core/SistemaFirmaDigital';
import { toast } from '@/hooks/use-toast';

export interface EstadoProcesamiento {
  procesando: boolean;
  progreso: number;
  fase: 'idle' | 'clasificando' | 'liquidando' | 'auditando' | 'completado' | 'error';
  mensaje: string;
}

export interface UseAgenteAduanalResult {
  estado: EstadoProcesamiento;
  resultado: ResultadoProcesamientoCompleto | null;
  procesarManifiesto: (
    paquetes: ManifestRow[],
    manifiestoId: string,
    opciones?: { fechaRegistro?: Date; facturasLineItems?: Map<string, string[]> }
  ) => Promise<ResultadoProcesamientoCompleto | null>;
  descargarConFirma: (
    corredor: { id: string; nombre: string },
    mawb?: string
  ) => Promise<{ firma: FirmaDigital; archivoDescargado: boolean } | null>;
  registrarAprendizaje: (
    guia: string,
    palabraClave: string,
    autoridad: string,
    descripcion: string
  ) => void;
  resetear: () => void;
  CLAUSULA_RESPONSABILIDAD: string;
}

const ESTADO_INICIAL: EstadoProcesamiento = {
  procesando: false,
  progreso: 0,
  fase: 'idle',
  mensaje: ''
};

export function useAgenteAduanal(): UseAgenteAduanalResult {
  const [estado, setEstado] = useState<EstadoProcesamiento>(ESTADO_INICIAL);
  const [resultado, setResultado] = useState<ResultadoProcesamientoCompleto | null>(null);
  const [paquetesActuales, setPaquetesActuales] = useState<ManifestRow[]>([]);

  const procesarManifiesto = useCallback(async (
    paquetes: ManifestRow[],
    manifiestoId: string,
    opciones?: { fechaRegistro?: Date; facturasLineItems?: Map<string, string[]> }
  ): Promise<ResultadoProcesamientoCompleto | null> => {
    try {
      setEstado({
        procesando: true,
        progreso: 0,
        fase: 'clasificando',
        mensaje: 'Clasificando productos con NLP...'
      });

      setPaquetesActuales(paquetes);

      // Simular progreso durante el procesamiento
      const intervalId = setInterval(() => {
        setEstado(prev => {
          if (prev.progreso < 90) {
            const nuevaFase = prev.progreso < 30 ? 'clasificando' :
                             prev.progreso < 60 ? 'liquidando' : 'auditando';
            const nuevoMensaje = prev.progreso < 30 ? 'Clasificando productos con NLP...' :
                                prev.progreso < 60 ? 'Calculando liquidación SIGA...' : 
                                'Auditando riesgos...';
            return {
              ...prev,
              progreso: prev.progreso + 5,
              fase: nuevaFase,
              mensaje: nuevoMensaje
            };
          }
          return prev;
        });
      }, 100);

      const resultadoProcesamiento = await AgenteAduanalAI.procesarManifiesto(
        paquetes,
        manifiestoId,
        opciones
      );

      clearInterval(intervalId);

      setResultado(resultadoProcesamiento);
      setEstado({
        procesando: false,
        progreso: 100,
        fase: 'completado',
        mensaje: `Procesados ${paquetes.length} paquetes`
      });

      toast({
        title: '✅ Procesamiento completo',
        description: `${resultadoProcesamiento.resumen.total} paquetes procesados. ${resultadoProcesamiento.resumen.requierenRevision} requieren revisión.`
      });

      return resultadoProcesamiento;
    } catch (error) {
      console.error('[useAgenteAduanal] Error:', error);
      setEstado({
        procesando: false,
        progreso: 0,
        fase: 'error',
        mensaje: error instanceof Error ? error.message : 'Error desconocido'
      });

      toast({
        variant: 'destructive',
        title: 'Error en procesamiento',
        description: error instanceof Error ? error.message : 'Error desconocido'
      });

      return null;
    }
  }, []);

  const descargarConFirma = useCallback(async (
    corredor: { id: string; nombre: string },
    mawb?: string
  ): Promise<{ firma: FirmaDigital; archivoDescargado: boolean } | null> => {
    if (!resultado || paquetesActuales.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No hay datos para descargar. Procese un manifiesto primero.'
      });
      return null;
    }

    try {
      const descarga = await AgenteAduanalAI.descargarConFirma(
        resultado,
        paquetesActuales,
        corredor,
        mawb
      );

      toast({
        title: '✅ Archivo descargado',
        description: `Firmado digitalmente: ${descarga.firma.hash.substring(0, 16)}...`
      });

      return descarga;
    } catch (error) {
      console.error('[useAgenteAduanal] Error descarga:', error);
      toast({
        variant: 'destructive',
        title: 'Error al descargar',
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
      return null;
    }
  }, [resultado, paquetesActuales]);

  const registrarAprendizaje = useCallback((
    guia: string,
    palabraClave: string,
    autoridad: string,
    descripcion: string
  ) => {
    AgenteAduanalAI.registrarAprendizaje(guia, palabraClave, autoridad, descripcion);
    toast({
      title: '🧠 Aprendizaje registrado',
      description: `La IA aprendió que "${palabraClave}" requiere ${autoridad}`
    });
  }, []);

  const resetear = useCallback(() => {
    setEstado(ESTADO_INICIAL);
    setResultado(null);
    setPaquetesActuales([]);
  }, []);

  return {
    estado,
    resultado,
    procesarManifiesto,
    descargarConFirma,
    registrarAprendizaje,
    resetear,
    CLAUSULA_RESPONSABILIDAD: AgenteAduanalAI.CLAUSULA_RESPONSABILIDAD
  };
}

export default useAgenteAduanal;
