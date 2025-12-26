// ============================================
// MOTOR DE VALIDACIÓN QA - AUDITORÍA ADUANERA
// Dashboard de Alertas de Discrepancia ANA Panamá
// ============================================

import { DeclaracionOficial, DetalleMercancia, CONSTANTES_DECLARACION } from '@/types/declaracionOficial';

// ============================================
// TIPOS DE ALERTAS
// ============================================

export type NivelAlerta = 'rojo' | 'naranja' | 'amarillo' | 'verde';
export type CategoriaAlerta = 'calculo' | 'peso' | 'vencimiento' | 'permiso' | 'integridad';

export interface AlertaDiscrepancia {
  id: string;
  nivel: NivelAlerta;
  categoria: CategoriaAlerta;
  titulo: string;
  descripcion: string;
  valorEsperado?: number | string;
  valorActual?: number | string;
  diferencia?: number;
  item?: number;
  accionRequerida: string;
  autoridad?: string;
  fechaDeteccion: string;
}

export interface ResultadoValidacion {
  esValido: boolean;
  listoParaFirma: boolean;
  alertas: AlertaDiscrepancia[];
  resumen: ResumenValidacion;
}

export interface ResumenValidacion {
  totalAlertas: number;
  alertasRojas: number;
  alertasNaranjas: number;
  alertasAmarillas: number;
  porcentajeCumplimiento: number;
  proximoVencimiento?: {
    fecha: string;
    monto: number;
    diasRestantes: number;
  };
}

// ============================================
// VALIDADOR DE CÁLCULOS (CERO ERROR)
// ============================================

/**
 * Valida que el DAI se aplique correctamente según la fracción arancelaria
 */
function validarCruceAranceles(item: DetalleMercancia): AlertaDiscrepancia | null {
  const { fraccion_arancelaria, valor_cif, impuestos } = item;
  
  // Mapeo de fracciones conocidas a tasas DAI
  const tasasConocidas: Record<string, number> = {
    '950300990090': 10.00,  // Juguetes
    '8471300000': 0.00,     // Laptops - exentos
    '6109100000': 15.00,    // Camisetas
    '8517120000': 0.00,     // Celulares - exentos
    // Agregar más según catálogo
  };
  
  const tasaEsperada = tasasConocidas[fraccion_arancelaria];
  
  if (tasaEsperada !== undefined) {
    if (Math.abs(impuestos.dai_tasa - tasaEsperada) > 0.01) {
      return {
        id: `alerta_dai_${item.item}_${Date.now()}`,
        nivel: 'rojo',
        categoria: 'calculo',
        titulo: 'Tasa DAI Incorrecta',
        descripcion: `La fracción ${fraccion_arancelaria} debe aplicar ${tasaEsperada}% DAI, no ${impuestos.dai_tasa}%`,
        valorEsperado: tasaEsperada,
        valorActual: impuestos.dai_tasa,
        item: item.item,
        accionRequerida: 'Corregir tasa DAI antes de firma',
        fechaDeteccion: new Date().toISOString()
      };
    }
  }
  
  return null;
}

/**
 * Verifica la aritmética de impuestos: ITBMS = 7% de (CIF + DAI)
 */
function validarAritmeticaITBMS(item: DetalleMercancia): AlertaDiscrepancia | null {
  const { valor_cif, impuestos } = item;
  const TOLERANCIA = 0.01; // B/. 0.01
  
  // Base ITBMS = CIF + DAI (+ ISC si aplica)
  const baseITBMS = valor_cif + impuestos.dai_monto + (impuestos.isc_monto || 0);
  const itbmsEsperado = Math.round(baseITBMS * (impuestos.itbms_tasa / 100) * 100) / 100;
  
  const diferencia = Math.abs(itbmsEsperado - impuestos.itbms_monto);
  
  if (diferencia > TOLERANCIA) {
    return {
      id: `alerta_itbms_${item.item}_${Date.now()}`,
      nivel: 'rojo',
      categoria: 'calculo',
      titulo: 'Error Aritmético ITBMS',
      descripcion: `ITBMS calculado: B/.${itbmsEsperado.toFixed(2)} | Sistema: B/.${impuestos.itbms_monto.toFixed(2)} | Diferencia: B/.${diferencia.toFixed(2)}`,
      valorEsperado: itbmsEsperado,
      valorActual: impuestos.itbms_monto,
      diferencia,
      item: item.item,
      accionRequerida: 'Recalcular ITBMS. Base = CIF + DAI + ISC',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

/**
 * Valida que la Tasa SIGA ($3.00) esté incluida
 */
function validarTasaSIGA(declaracion: DeclaracionOficial): AlertaDiscrepancia | null {
  const { boleta_pago_resumen } = declaracion;
  const TASA_SIGA_ESPERADA = CONSTANTES_DECLARACION.TASA_SIGA;
  
  if (!boleta_pago_resumen.tasa_siga || boleta_pago_resumen.tasa_siga !== TASA_SIGA_ESPERADA) {
    return {
      id: `alerta_siga_${Date.now()}`,
      nivel: 'naranja',
      categoria: 'calculo',
      titulo: 'Tasa SIGA Faltante o Incorrecta',
      descripcion: `La tasa de Uso del Sistema debe ser B/.${TASA_SIGA_ESPERADA.toFixed(2)}`,
      valorEsperado: TASA_SIGA_ESPERADA,
      valorActual: boleta_pago_resumen.tasa_siga || 0,
      accionRequerida: 'Agregar tasa SIGA de B/. 3.00',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

/**
 * Valida que la Tasa de Formulario ($5.00) esté incluida
 */
function validarTasaFormulario(declaracion: DeclaracionOficial): AlertaDiscrepancia | null {
  const { boleta_pago_resumen } = declaracion;
  const TASA_FORMULARIO_ESPERADA = CONSTANTES_DECLARACION.TASA_FORMULARIO;
  
  if (!boleta_pago_resumen.tasa_formulario || boleta_pago_resumen.tasa_formulario !== TASA_FORMULARIO_ESPERADA) {
    return {
      id: `alerta_formulario_${Date.now()}`,
      nivel: 'naranja',
      categoria: 'calculo',
      titulo: 'Tasa de Formulario Faltante',
      descripcion: `La tasa de formulario debe ser B/.${TASA_FORMULARIO_ESPERADA.toFixed(2)}`,
      valorEsperado: TASA_FORMULARIO_ESPERADA,
      valorActual: boleta_pago_resumen.tasa_formulario || 0,
      accionRequerida: 'Agregar tasa de formulario de B/. 5.00',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

// ============================================
// AUDITORÍA DE PESOS Y BULTOS
// ============================================

/**
 * Valida integridad de pesos: suma de netos vs bruto declarado
 * Tolerancia: 5%
 */
function validarIntegridadPesos(
  declaracion: DeclaracionOficial, 
  pesoBrutoDeclarado: number
): AlertaDiscrepancia | null {
  const TOLERANCIA_PESO = 0.05; // 5%
  
  const items = declaracion.detalle_mercancia;
  const sumaPesoNeto = items.reduce((sum, item) => sum + (item.peso_neto_kgs || item.peso_bruto_kgs), 0);
  
  const diferenciaPorcentaje = Math.abs(sumaPesoNeto - pesoBrutoDeclarado) / pesoBrutoDeclarado;
  
  if (diferenciaPorcentaje > TOLERANCIA_PESO) {
    const diferencia = Math.abs(sumaPesoNeto - pesoBrutoDeclarado);
    return {
      id: `alerta_peso_${Date.now()}`,
      nivel: 'naranja',
      categoria: 'peso',
      titulo: 'Discrepancia de Peso',
      descripcion: `Suma peso neto: ${sumaPesoNeto.toFixed(3)} Kg | Bruto declarado: ${pesoBrutoDeclarado.toFixed(3)} Kg | Diferencia: ${(diferenciaPorcentaje * 100).toFixed(1)}%`,
      valorEsperado: pesoBrutoDeclarado,
      valorActual: sumaPesoNeto,
      diferencia,
      accionRequerida: 'Revisar pesos declarados. Diferencia superior al 5%',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

// ============================================
// CONTROL DE VENCIMIENTOS
// ============================================

export interface EstadoVencimiento {
  estado: 'normal' | 'proximo' | 'vencido_1' | 'vencido_2';
  montoActual: number;
  proximaFecha: string;
  diasRestantes: number;
  recargo?: number;
}

/**
 * Calcula el estado actual de vencimiento basado en fechas de boleta
 */
export function calcularEstadoVencimiento(
  vencimientos: DeclaracionOficial['boleta_pago_resumen']['vencimiento_escenarios'],
  montoBase: number
): EstadoVencimiento {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const fechaNormal = new Date(vencimientos.normal.hasta!);
  const fechaRecargo1 = new Date(vencimientos.recargo_1.hasta!);
  const fechaRecargo2 = new Date(vencimientos.recargo_2.desde!);
  
  // Calcular días hasta vencimiento normal
  const diasHastaNormal = Math.ceil((fechaNormal.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  
  if (hoy <= fechaNormal) {
    return {
      estado: diasHastaNormal <= 2 ? 'proximo' : 'normal',
      montoActual: montoBase,
      proximaFecha: vencimientos.normal.hasta!,
      diasRestantes: diasHastaNormal
    };
  }
  
  if (hoy <= fechaRecargo1) {
    const recargo = montoBase * (CONSTANTES_DECLARACION.RECARGO_1_PERCENT / 100);
    return {
      estado: 'vencido_1',
      montoActual: montoBase + recargo,
      proximaFecha: vencimientos.recargo_1.hasta!,
      diasRestantes: Math.ceil((fechaRecargo1.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
      recargo
    };
  }
  
  // Después de recargo 1
  const recargo = montoBase * (CONSTANTES_DECLARACION.RECARGO_2_PERCENT / 100);
  return {
    estado: 'vencido_2',
    montoActual: montoBase + recargo,
    proximaFecha: vencimientos.recargo_2.desde!,
    diasRestantes: 0,
    recargo
  };
}

/**
 * Genera alerta de vencimiento según estado
 */
function validarVencimientos(declaracion: DeclaracionOficial): AlertaDiscrepancia | null {
  const { boleta_pago_resumen } = declaracion;
  const estado = calcularEstadoVencimiento(
    boleta_pago_resumen.vencimiento_escenarios,
    boleta_pago_resumen.total_liquidado
  );
  
  if (estado.estado === 'proximo') {
    return {
      id: `alerta_vencimiento_${Date.now()}`,
      nivel: 'amarillo',
      categoria: 'vencimiento',
      titulo: 'Vencimiento Próximo',
      descripcion: `Quedan ${estado.diasRestantes} día(s) para pagar B/.${estado.montoActual.toFixed(2)} sin recargos`,
      valorEsperado: estado.montoActual,
      valorActual: estado.montoActual,
      accionRequerida: `Pagar antes del ${estado.proximaFecha}`,
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  if (estado.estado === 'vencido_1') {
    return {
      id: `alerta_recargo1_${Date.now()}`,
      nivel: 'naranja',
      categoria: 'vencimiento',
      titulo: 'Recargo del 10% Aplicado',
      descripcion: `Monto actualizado: B/.${estado.montoActual.toFixed(2)} (recargo: B/.${estado.recargo?.toFixed(2)})`,
      valorEsperado: boleta_pago_resumen.total_liquidado,
      valorActual: estado.montoActual,
      diferencia: estado.recargo,
      accionRequerida: `Pagar antes del ${estado.proximaFecha} para evitar recargo adicional`,
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  if (estado.estado === 'vencido_2') {
    return {
      id: `alerta_recargo2_${Date.now()}`,
      nivel: 'rojo',
      categoria: 'vencimiento',
      titulo: 'Recargo del 20% Aplicado',
      descripcion: `Monto actualizado: B/.${estado.montoActual.toFixed(2)} (recargo máximo aplicado)`,
      valorEsperado: boleta_pago_resumen.total_liquidado,
      valorActual: estado.montoActual,
      diferencia: estado.recargo,
      accionRequerida: 'Pago urgente requerido - Recargo máximo aplicado',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

// ============================================
// VALIDACIÓN DE PERMISOS (RESTRICCIONES)
// ============================================

/**
 * Valida permisos regulatorios por autoridad
 */
function validarPermisosRegulatorios(declaracion: DeclaracionOficial): AlertaDiscrepancia[] {
  const alertas: AlertaDiscrepancia[] = [];
  
  for (const item of declaracion.detalle_mercancia) {
    if (item.restricciones && item.restricciones.length > 0) {
      for (const restriccion of item.restricciones) {
        if (restriccion.requiere_permiso) {
          alertas.push({
            id: `alerta_permiso_${item.item}_${restriccion.autoridad}_${Date.now()}`,
            nivel: 'rojo',
            categoria: 'permiso',
            titulo: `Permiso ${restriccion.autoridad} Requerido`,
            descripcion: `${restriccion.descripcion} - Capítulo SA: ${restriccion.capitulo_sa || 'N/A'}`,
            item: item.item,
            autoridad: restriccion.autoridad,
            accionRequerida: `Obtener autorización de ${restriccion.autoridad} antes de despacho`,
            fechaDeteccion: new Date().toISOString()
          });
        }
      }
    }
  }
  
  return alertas;
}

// ============================================
// MOTOR PRINCIPAL DE VALIDACIÓN
// ============================================

/**
 * Ejecuta validación completa de la declaración
 */
export function validarDeclaracionCompleta(
  declaracion: DeclaracionOficial,
  pesoBrutoManifiesto?: number
): ResultadoValidacion {
  const alertas: AlertaDiscrepancia[] = [];
  
  // 1. Validar cálculos por cada ítem
  for (const item of declaracion.detalle_mercancia) {
    const alertaDAI = validarCruceAranceles(item);
    if (alertaDAI) alertas.push(alertaDAI);
    
    const alertaITBMS = validarAritmeticaITBMS(item);
    if (alertaITBMS) alertas.push(alertaITBMS);
  }
  
  // 2. Validar tasas fijas
  const alertaSIGA = validarTasaSIGA(declaracion);
  if (alertaSIGA) alertas.push(alertaSIGA);
  
  const alertaFormulario = validarTasaFormulario(declaracion);
  if (alertaFormulario) alertas.push(alertaFormulario);
  
  // 3. Validar integridad de pesos (si se proporciona peso bruto)
  if (pesoBrutoManifiesto) {
    const alertaPeso = validarIntegridadPesos(declaracion, pesoBrutoManifiesto);
    if (alertaPeso) alertas.push(alertaPeso);
  }
  
  // 4. Validar vencimientos
  const alertaVencimiento = validarVencimientos(declaracion);
  if (alertaVencimiento) alertas.push(alertaVencimiento);
  
  // 5. Validar permisos regulatorios
  const alertasPermisos = validarPermisosRegulatorios(declaracion);
  alertas.push(...alertasPermisos);
  
  // Calcular resumen
  const alertasRojas = alertas.filter(a => a.nivel === 'rojo').length;
  const alertasNaranjas = alertas.filter(a => a.nivel === 'naranja').length;
  const alertasAmarillas = alertas.filter(a => a.nivel === 'amarillo').length;
  
  const totalPuntos = alertasRojas * 10 + alertasNaranjas * 5 + alertasAmarillas * 2;
  const porcentajeCumplimiento = Math.max(0, 100 - totalPuntos);
  
  // Calcular próximo vencimiento
  const estadoVenc = calcularEstadoVencimiento(
    declaracion.boleta_pago_resumen.vencimiento_escenarios,
    declaracion.boleta_pago_resumen.total_liquidado
  );
  
  return {
    esValido: alertasRojas === 0,
    listoParaFirma: alertasRojas === 0 && alertasNaranjas === 0,
    alertas,
    resumen: {
      totalAlertas: alertas.length,
      alertasRojas,
      alertasNaranjas,
      alertasAmarillas,
      porcentajeCumplimiento,
      proximoVencimiento: {
        fecha: estadoVenc.proximaFecha,
        monto: estadoVenc.montoActual,
        diasRestantes: estadoVenc.diasRestantes
      }
    }
  };
}

/**
 * Obtiene el color CSS según nivel de alerta
 */
export function getColorAlerta(nivel: NivelAlerta): string {
  switch (nivel) {
    case 'rojo': return 'text-red-600 bg-red-50 border-red-200';
    case 'naranja': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'amarillo': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'verde': return 'text-green-600 bg-green-50 border-green-200';
  }
}

/**
 * Obtiene ícono según categoría de alerta
 */
export function getIconoAlerta(categoria: CategoriaAlerta): string {
  switch (categoria) {
    case 'calculo': return 'Calculator';
    case 'peso': return 'Scale';
    case 'vencimiento': return 'Clock';
    case 'permiso': return 'Shield';
    case 'integridad': return 'FileWarning';
  }
}
