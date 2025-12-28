// ============================================
// SERVICIO DE VALIDACIÓN FISCAL - PANAMÁ
// Gestión de RUC/Cédula para consignatarios
// Enriquecimiento automático desde base de datos histórica
// ============================================

import { supabase } from '@/integrations/supabase/client';

// ============================================
// INTERFACES
// ============================================

export interface ConsignatarioFiscal {
  id: string;
  nombre_consignatario: string;
  nombre_normalizado: string;
  ruc_cedula: string;
  tipo_documento: 'cedula' | 'ruc' | 'pasaporte';
  telefono?: string;
  email?: string;
  direccion_principal?: string;
  ciudad_principal?: string;
  provincia_principal?: string;
  usos_exitosos: number;
}

export interface ResultadoValidacionFiscal {
  nombreOriginal: string;
  nombreNormalizado: string;
  rucCedula: string | null;
  tipoDocumento: string | null;
  encontrado: boolean;
  confianza: number; // 0-100
  sugerencias: ConsignatarioFiscal[];
  requiereRevision: boolean;
  mensaje: string;
}

export interface EnriquecimientoFiscal {
  consignatario: string;
  rucCedula: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  validado: boolean;
  fuenteDatos: 'historico' | 'manual' | 'pendiente';
}

// ============================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================

/**
 * Normaliza un nombre de consignatario para búsqueda
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, '') // Solo alfanuméricos
    .replace(/\s+/g, ' ') // Espacios múltiples
    .trim();
}

/**
 * Valida formato de cédula panameña (X-XXX-XXXX o X-XX-XXXX)
 */
export function validarCedulaPanama(cedula: string): boolean {
  const patronCedula = /^\d{1,2}-\d{2,4}-\d{1,6}$/;
  return patronCedula.test(cedula);
}

/**
 * Valida formato de RUC panameño
 */
export function validarRUCPanama(ruc: string): boolean {
  // Formato RUC: XXXXXXX-X-XXXXXX (persona jurídica) o X-XX-XXX DV XX
  const patronRUC = /^\d{5,10}-\d{1}-\d{3,6}$/;
  const patronRUCAlternativo = /^\d{1,2}-\d{2,4}-\d{1,6}\s*DV\s*\d{1,2}$/i;
  return patronRUC.test(ruc) || patronRUCAlternativo.test(ruc);
}

/**
 * Detecta tipo de documento según formato
 */
export function detectarTipoDocumento(documento: string): 'cedula' | 'ruc' | 'pasaporte' | 'desconocido' {
  if (validarCedulaPanama(documento)) return 'cedula';
  if (validarRUCPanama(documento)) return 'ruc';
  if (/^[A-Z]{1,2}\d{6,9}$/i.test(documento)) return 'pasaporte';
  return 'desconocido';
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export class ServicioValidacionFiscal {
  private cacheConsignatarios: Map<string, ConsignatarioFiscal> = new Map();
  private cacheInicializado = false;

  /**
   * Inicializa caché de consignatarios desde base de datos
   */
  async inicializarCache(): Promise<void> {
    if (this.cacheInicializado) return;

    try {
      const { data, error } = await supabase
        .from('consignatarios_fiscales')
        .select('*')
        .eq('activo', true)
        .order('usos_exitosos', { ascending: false });

      if (error) {
        console.warn('Error cargando consignatarios fiscales:', error);
        return;
      }

      if (data) {
        data.forEach(c => {
          this.cacheConsignatarios.set(c.nombre_normalizado, c as ConsignatarioFiscal);
        });
        this.cacheInicializado = true;
        console.log(`[Fiscal] Cache inicializado con ${data.length} consignatarios`);
      }
    } catch (e) {
      console.warn('No se pudo inicializar cache fiscal:', e);
    }
  }

  /**
   * Busca RUC/Cédula por nombre de consignatario
   * Primero busca en caché, luego en base de datos
   */
  async buscarPorNombre(nombre: string): Promise<ResultadoValidacionFiscal> {
    const nombreNormalizado = normalizarNombre(nombre);
    
    // Búsqueda exacta en caché
    const cacheHit = this.cacheConsignatarios.get(nombreNormalizado);
    if (cacheHit) {
      return {
        nombreOriginal: nombre,
        nombreNormalizado,
        rucCedula: cacheHit.ruc_cedula,
        tipoDocumento: cacheHit.tipo_documento,
        encontrado: true,
        confianza: 100,
        sugerencias: [cacheHit],
        requiereRevision: false,
        mensaje: `RUC/Cédula encontrado: ${cacheHit.ruc_cedula}`
      };
    }

    // Búsqueda en base de datos con coincidencia parcial
    try {
      const { data, error } = await supabase
        .from('consignatarios_fiscales')
        .select('*')
        .eq('activo', true)
        .ilike('nombre_normalizado', `%${nombreNormalizado}%`)
        .order('usos_exitosos', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error buscando consignatario:', error);
      }

      if (data && data.length > 0) {
        // Verificar si hay coincidencia exacta
        const exacto = data.find(c => c.nombre_normalizado === nombreNormalizado);
        
        if (exacto) {
          // Actualizar caché
          this.cacheConsignatarios.set(nombreNormalizado, exacto as ConsignatarioFiscal);
          
          return {
            nombreOriginal: nombre,
            nombreNormalizado,
            rucCedula: exacto.ruc_cedula,
            tipoDocumento: exacto.tipo_documento,
            encontrado: true,
            confianza: 100,
            sugerencias: [exacto as ConsignatarioFiscal],
            requiereRevision: false,
            mensaje: `RUC/Cédula encontrado: ${exacto.ruc_cedula}`
          };
        }

        // Hay coincidencias parciales
        const mejorCoincidencia = data[0];
        const confianza = this.calcularSimilitud(nombreNormalizado, mejorCoincidencia.nombre_normalizado);

        if (confianza >= 85) {
          return {
            nombreOriginal: nombre,
            nombreNormalizado,
            rucCedula: mejorCoincidencia.ruc_cedula,
            tipoDocumento: mejorCoincidencia.tipo_documento,
            encontrado: true,
            confianza,
            sugerencias: data as ConsignatarioFiscal[],
            requiereRevision: confianza < 95,
            mensaje: `Posible coincidencia: ${mejorCoincidencia.nombre_consignatario} (${confianza}% similitud)`
          };
        }

        // Sugerencias disponibles pero sin coincidencia clara
        return {
          nombreOriginal: nombre,
          nombreNormalizado,
          rucCedula: null,
          tipoDocumento: null,
          encontrado: false,
          confianza: confianza,
          sugerencias: data as ConsignatarioFiscal[],
          requiereRevision: true,
          mensaje: `Sin RUC/Cédula. ${data.length} sugerencias disponibles.`
        };
      }
    } catch (e) {
      console.warn('Error en búsqueda fiscal:', e);
    }

    // No encontrado
    return {
      nombreOriginal: nombre,
      nombreNormalizado,
      rucCedula: null,
      tipoDocumento: null,
      encontrado: false,
      confianza: 0,
      sugerencias: [],
      requiereRevision: true,
      mensaje: '⚠️ SIN RUC/CÉDULA - Requiere registro manual'
    };
  }

  /**
   * Enriquece una lista de paquetes con datos fiscales
   */
  async enriquecerDatosFiscales(
    paquetes: Array<{ recipient: string; address?: string; city?: string; phone?: string }>
  ): Promise<Map<string, EnriquecimientoFiscal>> {
    await this.inicializarCache();
    
    const resultado = new Map<string, EnriquecimientoFiscal>();
    const nombresUnicos = new Set(paquetes.map(p => p.recipient));

    for (const nombre of nombresUnicos) {
      const validacion = await this.buscarPorNombre(nombre);
      
      if (validacion.encontrado && validacion.sugerencias.length > 0) {
        const mejor = validacion.sugerencias[0];
        resultado.set(nombre, {
          consignatario: nombre,
          rucCedula: validacion.rucCedula,
          direccion: mejor.direccion_principal || null,
          ciudad: mejor.ciudad_principal || null,
          telefono: mejor.telefono || null,
          validado: validacion.confianza >= 95,
          fuenteDatos: 'historico'
        });
      } else {
        resultado.set(nombre, {
          consignatario: nombre,
          rucCedula: null,
          direccion: null,
          ciudad: null,
          telefono: null,
          validado: false,
          fuenteDatos: 'pendiente'
        });
      }
    }

    return resultado;
  }

  /**
   * Registra nuevo consignatario con datos fiscales
   */
  async registrarConsignatario(
    nombre: string,
    rucCedula: string,
    datos?: Partial<ConsignatarioFiscal>
  ): Promise<boolean> {
    const nombreNormalizado = normalizarNombre(nombre);
    const tipoDocumento = detectarTipoDocumento(rucCedula);

    try {
      const { error } = await supabase
        .from('consignatarios_fiscales')
        .upsert({
          nombre_consignatario: nombre.toUpperCase(),
          nombre_normalizado: nombreNormalizado,
          ruc_cedula: rucCedula,
          tipo_documento: tipoDocumento === 'desconocido' ? 'cedula' : tipoDocumento,
          telefono: datos?.telefono,
          direccion_principal: datos?.direccion_principal,
          ciudad_principal: datos?.ciudad_principal,
          provincia_principal: datos?.provincia_principal,
          ultimo_uso: new Date().toISOString()
        }, {
          onConflict: 'nombre_normalizado'
        });

      if (error) {
        console.error('Error registrando consignatario:', error);
        return false;
      }

      // Actualizar caché
      this.cacheConsignatarios.set(nombreNormalizado, {
        id: '',
        nombre_consignatario: nombre.toUpperCase(),
        nombre_normalizado: nombreNormalizado,
        ruc_cedula: rucCedula,
        tipo_documento: tipoDocumento === 'desconocido' ? 'cedula' : tipoDocumento,
        usos_exitosos: 1,
        ...datos
      });

      return true;
    } catch (e) {
      console.error('Error registrando consignatario:', e);
      return false;
    }
  }

  /**
   * Incrementa contador de usos exitosos
   */
  async registrarUsoExitoso(rucCedula: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('consignatarios_fiscales')
        .select('id, usos_exitosos')
        .eq('ruc_cedula', rucCedula)
        .single();

      if (data && !error) {
        await supabase
          .from('consignatarios_fiscales')
          .update({
            usos_exitosos: (data.usos_exitosos || 0) + 1,
            ultimo_uso: new Date().toISOString()
          })
          .eq('id', data.id);
      }
    } catch (e) {
      console.warn('Error actualizando uso:', e);
    }
  }

  /**
   * Calcula similitud entre dos strings (algoritmo Levenshtein simplificado)
   */
  private calcularSimilitud(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - editDistance) / longer.length) * 100);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }
}

// Instancia singleton
export const servicioFiscal = new ServicioValidacionFiscal();

export default servicioFiscal;
