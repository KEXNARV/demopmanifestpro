// ============================================
// CLASIFICADOR HTS CON LOVABLE AI
// NLP real para clasificación arancelaria
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { devLog, devError } from '@/lib/logger';

export interface ClasificacionAIRequest {
  descripcion: string;
  lineItemsFactura?: string[];
  peso?: number;
  valor?: number;
}

export interface TerminoSensibleAI {
  termino: string;
  categoria: 'salud' | 'seguridad' | 'electronico' | 'quimico' | 'regulado';
  riesgo: 'alto' | 'medio' | 'bajo';
  autoridad?: string;
}

export interface ClasificacionAIResponse {
  hsCode: string;
  descripcionArancelaria: string;
  confianza: number;
  razonamiento: string;
  terminosSensibles: TerminoSensibleAI[];
  requiereRevision: boolean;
  motivoRevision?: string;
  sugerenciasAlternativas?: Array<{
    hsCode: string;
    descripcion: string;
    confianza: number;
  }>;
  error?: string;
}

/**
 * Clasificador HTS usando Lovable AI (Gemini 2.5 Flash)
 */
export class ClasificadorHTSAI {
  private static cache = new Map<string, ClasificacionAIResponse>();
  private static readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutos
  
  /**
   * Clasifica una descripción usando AI
   */
  static async clasificar(request: ClasificacionAIRequest): Promise<ClasificacionAIResponse> {
    const cacheKey = this.generarCacheKey(request);
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      devLog('[ClasificadorAI] Usando cache para:', request.descripcion.substring(0, 30));
      return cached;
    }
    
    try {
      devLog('[ClasificadorAI] Clasificando:', request.descripcion.substring(0, 50));
      
      const { data, error } = await supabase.functions.invoke('clasificar-hts-ai', {
        body: request
      });
      
      if (error) {
        devError('[ClasificadorAI] Error edge function:', error);
        return this.respuestaFallback(request.descripcion, error.message);
      }
      
      const response = data as ClasificacionAIResponse;
      
      // Guardar en cache
      this.cache.set(cacheKey, response);
      setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL);
      
      devLog('[ClasificadorAI] Clasificado:', response.hsCode, 'confianza:', response.confianza);
      
      return response;
      
    } catch (error) {
      devError('[ClasificadorAI] Error:', error);
      return this.respuestaFallback(
        request.descripcion,
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }
  }
  
  /**
   * Clasifica un lote de descripciones
   */
  static async clasificarLote(
    requests: ClasificacionAIRequest[],
    onProgress?: (procesados: number, total: number) => void
  ): Promise<Map<string, ClasificacionAIResponse>> {
    const resultados = new Map<string, ClasificacionAIResponse>();
    
    // Procesar en paralelo con límite de concurrencia
    const CONCURRENCIA = 3;
    const chunks = this.dividirEnChunks(requests, CONCURRENCIA);
    
    let procesados = 0;
    
    for (const chunk of chunks) {
      const promesas = chunk.map(async (req) => {
        const resultado = await this.clasificar(req);
        procesados++;
        onProgress?.(procesados, requests.length);
        return { key: req.descripcion, resultado };
      });
      
      const resultadosChunk = await Promise.all(promesas);
      
      for (const { key, resultado } of resultadosChunk) {
        resultados.set(key, resultado);
      }
      
      // Pequeña pausa entre chunks para no saturar
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    return resultados;
  }
  
  /**
   * Genera clave de cache
   */
  private static generarCacheKey(request: ClasificacionAIRequest): string {
    const partes = [
      request.descripcion.toLowerCase().trim(),
      request.lineItemsFactura?.join('|') || '',
      request.peso?.toString() || '',
      request.valor?.toString() || ''
    ];
    return partes.join('::');
  }
  
  /**
   * Respuesta de fallback cuando AI falla
   */
  private static respuestaFallback(descripcion: string, error: string): ClasificacionAIResponse {
    return {
      hsCode: '9999.99.99',
      descripcionArancelaria: 'CLASIFICACIÓN PENDIENTE - REVISAR MANUALMENTE',
      confianza: 0,
      razonamiento: `Error en clasificación AI: ${error}. Requiere revisión manual por experto.`,
      terminosSensibles: [],
      requiereRevision: true,
      motivoRevision: `Error AI: ${error}`,
      error
    };
  }
  
  /**
   * Divide array en chunks
   */
  private static dividirEnChunks<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Limpia el cache
   */
  static limpiarCache(): void {
    this.cache.clear();
    devLog('[ClasificadorAI] Cache limpiado');
  }
}

export default ClasificadorHTSAI;
