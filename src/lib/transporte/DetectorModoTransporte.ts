/**
 * DETECTOR INTELIGENTE DE MODO DE TRANSPORTE
 * Detecta automáticamente si el manifiesto es aéreo, marítimo o terrestre
 */

import { 
  ModoTransporte, 
  ZonaAduanera,
  CONFIGURACIONES_MODO 
} from '@/types/transporte';

interface ResultadoDeteccion {
  modo: ModoTransporte;
  confianza: number;
  indicadores: IndicadorDeteccion[];
  zonaAduaneraSugerida: ZonaAduanera;
}

interface IndicadorDeteccion {
  tipo: string;
  valor: string;
  peso: number;
  modo: ModoTransporte;
}

// ============================================
// PATRONES DE DETECCIÓN POR MODO
// ============================================

const PATRONES_AEREO = {
  columnas: [
    'mawb', 'hawb', 'awb', 'air waybill', 'airway', 'vuelo', 'flight',
    'aerolinea', 'airline', 'aeropuerto', 'airport', 'iata'
  ],
  documentos: [
    /^\d{3}-\d{8}$/,           // MAWB estándar: 230-12345678
    /^\d{11}$/,                // MAWB sin guión: 23012345678
    /^[A-Z]{2}\d{8,12}$/       // HAWB courier: AA123456789
  ],
  palabrasClave: [
    'air cargo', 'carga aerea', 'carga aérea', 'express', 'courier',
    'amazon prime air', 'fedex', 'dhl express', 'ups air'
  ]
};

const PATRONES_MARITIMO = {
  columnas: [
    'b/l', 'bl', 'bill of lading', 'conocimiento embarque', 'mbl', 'hbl',
    'contenedor', 'container', 'naviera', 'shipping line', 'buque', 'vessel',
    'puerto', 'port', 'teu', 'fcl', 'lcl', 'zarpe', 'eta'
  ],
  documentos: [
    /^[A-Z]{4}\d{7}$/,         // Número de contenedor: MSCU1234567
    /^[A-Z]{4}\d{6,10}$/,      // B/L estándar
    /^[A-Z]{2,4}[A-Z0-9]{6,12}$/ // B/L variaciones
  ],
  palabrasClave: [
    'ocean freight', 'sea freight', 'maritimo', 'marítimo', 'contenedor',
    'container', 'fob', 'cif incoterms', 'puerto', 'naviera', 'buque',
    'maersk', 'msc', 'cma cgm', 'evergreen', 'hapag'
  ]
};

const PATRONES_TERRESTRE = {
  columnas: [
    'carta porte', 'carta de porte', 'guia terrestre', 'guía terrestre',
    'placa', 'license plate', 'conductor', 'driver', 'camion', 'camión',
    'trailer', 'remolque', 'ruta', 'route', 'frontera', 'border'
  ],
  documentos: [
    /^CP-\d{6,10}$/,           // Carta de Porte: CP-123456
    /^GT-\d{6,10}$/,           // Guía Terrestre: GT-123456
    /^[A-Z]{2,3}-\d{4,6}$/     // Placa vehicular
  ],
  palabrasClave: [
    'transporte terrestre', 'land freight', 'ground shipping',
    'paso canoas', 'darien', 'frontera', 'border crossing',
    'camion', 'camión', 'truck', 'trailer', 'costa rica', 'colombia'
  ]
};

export class DetectorModoTransporte {
  
  /**
   * Detecta el modo de transporte basado en columnas y datos
   */
  static detectar(
    columnasOriginales: string[], 
    datosMuestra: Record<string, unknown>[]
  ): ResultadoDeteccion {
    
    console.log('🔍 Detectando modo de transporte...');
    
    const indicadores: IndicadorDeteccion[] = [];
    
    // 1. Analizar nombres de columnas
    const indicadoresColumnas = this.analizarColumnas(columnasOriginales);
    indicadores.push(...indicadoresColumnas);
    
    // 2. Analizar patrones en datos
    const indicadoresDatos = this.analizarDatos(datosMuestra, columnasOriginales);
    indicadores.push(...indicadoresDatos);
    
    // 3. Calcular puntuación por modo
    const puntuaciones = this.calcularPuntuaciones(indicadores);
    
    // 4. Determinar modo ganador
    const modoDetectado = this.determinarModo(puntuaciones);
    
    // 5. Sugerir zona aduanera
    const zonaAduanera = this.sugerirZonaAduanera(modoDetectado, datosMuestra);
    
    console.log(`✅ Modo detectado: ${CONFIGURACIONES_MODO[modoDetectado].nombre}`);
    console.log(`📊 Confianza: ${puntuaciones[modoDetectado].toFixed(1)}%`);
    
    return {
      modo: modoDetectado,
      confianza: puntuaciones[modoDetectado],
      indicadores,
      zonaAduaneraSugerida: zonaAduanera
    };
  }
  
  /**
   * Analiza columnas para detectar indicadores de modo
   */
  private static analizarColumnas(columnas: string[]): IndicadorDeteccion[] {
    const indicadores: IndicadorDeteccion[] = [];
    const columnasLower = columnas.map(c => c.toLowerCase().trim());
    
    // Buscar patrones aéreos
    for (const patron of PATRONES_AEREO.columnas) {
      const encontrado = columnasLower.find(c => c.includes(patron));
      if (encontrado) {
        indicadores.push({
          tipo: 'columna',
          valor: encontrado,
          peso: 15,
          modo: 'aereo'
        });
      }
    }
    
    // Buscar patrones marítimos
    for (const patron of PATRONES_MARITIMO.columnas) {
      const encontrado = columnasLower.find(c => c.includes(patron));
      if (encontrado) {
        indicadores.push({
          tipo: 'columna',
          valor: encontrado,
          peso: 15,
          modo: 'maritimo'
        });
      }
    }
    
    // Buscar patrones terrestres
    for (const patron of PATRONES_TERRESTRE.columnas) {
      const encontrado = columnasLower.find(c => c.includes(patron));
      if (encontrado) {
        indicadores.push({
          tipo: 'columna',
          valor: encontrado,
          peso: 15,
          modo: 'terrestre'
        });
      }
    }
    
    return indicadores;
  }
  
  /**
   * Analiza datos para detectar patrones de documentos
   */
  private static analizarDatos(
    datos: Record<string, unknown>[], 
    columnas: string[]
  ): IndicadorDeteccion[] {
    const indicadores: IndicadorDeteccion[] = [];
    const muestra = datos.slice(0, 50); // Analizar primeras 50 filas
    
    for (const fila of muestra) {
      for (const columna of columnas) {
        const valor = String(fila[columna] || '').trim();
        if (!valor) continue;
        
        // Verificar patrones de documentos aéreos
        for (const regex of PATRONES_AEREO.documentos) {
          if (regex.test(valor)) {
            indicadores.push({
              tipo: 'documento',
              valor: valor.substring(0, 20),
              peso: 25,
              modo: 'aereo'
            });
            break;
          }
        }
        
        // Verificar patrones de documentos marítimos
        for (const regex of PATRONES_MARITIMO.documentos) {
          if (regex.test(valor) && /^[A-Z]{4}/.test(valor)) {
            indicadores.push({
              tipo: 'documento',
              valor: valor.substring(0, 20),
              peso: 25,
              modo: 'maritimo'
            });
            break;
          }
        }
        
        // Verificar patrones de documentos terrestres
        for (const regex of PATRONES_TERRESTRE.documentos) {
          if (regex.test(valor)) {
            indicadores.push({
              tipo: 'documento',
              valor: valor.substring(0, 20),
              peso: 25,
              modo: 'terrestre'
            });
            break;
          }
        }
        
        // Buscar palabras clave en descripciones
        const valorLower = valor.toLowerCase();
        
        for (const palabra of PATRONES_AEREO.palabrasClave) {
          if (valorLower.includes(palabra)) {
            indicadores.push({
              tipo: 'palabra_clave',
              valor: palabra,
              peso: 10,
              modo: 'aereo'
            });
          }
        }
        
        for (const palabra of PATRONES_MARITIMO.palabrasClave) {
          if (valorLower.includes(palabra)) {
            indicadores.push({
              tipo: 'palabra_clave',
              valor: palabra,
              peso: 10,
              modo: 'maritimo'
            });
          }
        }
        
        for (const palabra of PATRONES_TERRESTRE.palabrasClave) {
          if (valorLower.includes(palabra)) {
            indicadores.push({
              tipo: 'palabra_clave',
              valor: palabra,
              peso: 10,
              modo: 'terrestre'
            });
          }
        }
      }
    }
    
    return indicadores;
  }
  
  /**
   * Calcula puntuación total por modo
   */
  private static calcularPuntuaciones(
    indicadores: IndicadorDeteccion[]
  ): Record<ModoTransporte, number> {
    
    const pesos: Record<ModoTransporte, number> = {
      aereo: 0,
      maritimo: 0,
      terrestre: 0
    };
    
    for (const indicador of indicadores) {
      pesos[indicador.modo] += indicador.peso;
    }
    
    // Normalizar a porcentaje
    const total = pesos.aereo + pesos.maritimo + pesos.terrestre;
    if (total === 0) {
      // Default a aéreo si no hay indicadores
      return { aereo: 60, maritimo: 20, terrestre: 20 };
    }
    
    return {
      aereo: (pesos.aereo / total) * 100,
      maritimo: (pesos.maritimo / total) * 100,
      terrestre: (pesos.terrestre / total) * 100
    };
  }
  
  /**
   * Determina el modo con mayor puntuación
   */
  private static determinarModo(
    puntuaciones: Record<ModoTransporte, number>
  ): ModoTransporte {
    
    if (puntuaciones.maritimo > puntuaciones.aereo && 
        puntuaciones.maritimo > puntuaciones.terrestre) {
      return 'maritimo';
    }
    
    if (puntuaciones.terrestre > puntuaciones.aereo && 
        puntuaciones.terrestre > puntuaciones.maritimo) {
      return 'terrestre';
    }
    
    return 'aereo'; // Default
  }
  
  /**
   * Sugiere zona aduanera basada en modo y datos
   */
  private static sugerirZonaAduanera(
    modo: ModoTransporte, 
    datos: Record<string, unknown>[]
  ): ZonaAduanera {
    
    // Buscar menciones de zonas específicas en los datos
    const textoCompleto = JSON.stringify(datos).toLowerCase();
    
    if (modo === 'aereo') {
      if (textoCompleto.includes('howard')) return 'aeropuerto_howard';
      return 'aeropuerto_tocumen';
    }
    
    if (modo === 'maritimo') {
      if (textoCompleto.includes('balboa') || textoCompleto.includes('pacifico')) {
        return 'puerto_balboa';
      }
      if (textoCompleto.includes('cristobal')) return 'puerto_cristobal';
      if (textoCompleto.includes('manzanillo') || textoCompleto.includes('mit')) return 'puerto_manzanillo';
      if (textoCompleto.includes('cct') || textoCompleto.includes('container terminal')) return 'puerto_colon_container';
      if (textoCompleto.includes('rodman') || textoCompleto.includes('psa')) return 'puerto_psa_rodman';
      if (textoCompleto.includes('zona libre') || textoCompleto.includes('zlc')) {
        return 'zona_libre_colon';
      }
      return 'puerto_cristobal';
    }
    
    if (modo === 'terrestre') {
      if (textoCompleto.includes('guabito') || textoCompleto.includes('sixaola') || textoCompleto.includes('bocas')) {
        return 'frontera_guabito';
      }
      return 'frontera_paso_canoas';
    }
    
    return 'zona_libre_colon';
  }
  
  /**
   * Valida formato de documento según modo
   */
  static validarDocumento(numero: string, modo: ModoTransporte): boolean {
    const patrones = modo === 'aereo' 
      ? PATRONES_AEREO.documentos 
      : modo === 'maritimo'
        ? PATRONES_MARITIMO.documentos
        : PATRONES_TERRESTRE.documentos;
    
    return patrones.some(regex => regex.test(numero));
  }
}
