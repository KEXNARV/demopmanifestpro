// ============================================
// MOTOR DE VALIDACIÓN QA - AUDITORÍA ADUANERA
// Dashboard de Alertas de Discrepancia ANA Panamá
// Actualizado para tipos ANA 2025
// ============================================

import { 
  DeclaracionOficial, 
  ArticuloDeclaracion, 
  CONSTANTES_ANA,
  EscenariosPagoANA
} from '@/types/declaracionOficial';

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
function validarCruceAranceles(item: ArticuloDeclaracion): AlertaDiscrepancia | null {
  const { fraccion_arancelaria, valor_cif, impuestos, numero_articulo } = item;
  
  // Mapeo de fracciones conocidas a tasas DAI
  const tasasConocidas: Record<string, number> = {
    '950300990090': 10.00,
    '847130000000': 0.00,
    '610910000000': 15.00,
    '851712000000': 0.00,
    '330499900000': 6.50,
    '420239000000': 15.00,
    '960330100000': 3.00,
  };
  
  const tasaEsperada = tasasConocidas[fraccion_arancelaria];
  
  if (tasaEsperada !== undefined) {
    if (Math.abs(impuestos.dai_tarifa_percent - tasaEsperada) > 0.01) {
      return {
        id: `alerta_dai_${numero_articulo}_${Date.now()}`,
        nivel: 'rojo',
        categoria: 'calculo',
        titulo: 'Tasa DAI Incorrecta',
        descripcion: `La fracción ${fraccion_arancelaria} debe aplicar ${tasaEsperada}% DAI, no ${impuestos.dai_tarifa_percent}%`,
        valorEsperado: tasaEsperada,
        valorActual: impuestos.dai_tarifa_percent,
        item: numero_articulo,
        accionRequerida: 'Corregir tasa DAI antes de firma',
        fechaDeteccion: new Date().toISOString()
      };
    }
  }
  
  return null;
}

/**
 * Verifica la aritmética de impuestos: ITBM = 7% de (CIF + DAI)
 */
function validarAritmeticaITBM(item: ArticuloDeclaracion): AlertaDiscrepancia | null {
  const { valor_cif, impuestos, numero_articulo } = item;
  const TOLERANCIA = 0.02; // B/. 0.02
  
  // Base ITBM = CIF + DAI (+ ISC si aplica)
  const baseITBM = valor_cif + impuestos.dai_a_pagar + impuestos.isc_a_pagar;
  const itbmEsperado = Math.round(baseITBM * (impuestos.itbm_tarifa_percent / 100) * 100) / 100;
  
  const diferencia = Math.abs(itbmEsperado - impuestos.itbm_a_pagar);
  
  if (diferencia > TOLERANCIA) {
    return {
      id: `alerta_itbm_${numero_articulo}_${Date.now()}`,
      nivel: 'rojo',
      categoria: 'calculo',
      titulo: 'Error Aritmético ITBM',
      descripcion: `ITBM calculado: B/.${itbmEsperado.toFixed(2)} | Sistema: B/.${impuestos.itbm_a_pagar.toFixed(2)} | Diferencia: B/.${diferencia.toFixed(2)}`,
      valorEsperado: itbmEsperado,
      valorActual: impuestos.itbm_a_pagar,
      diferencia,
      item: numero_articulo,
      accionRequerida: 'Recalcular ITBM. Base = CIF + DAI + ISC',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

/**
 * Valida que la Tasa de Sistema ($3.00) esté incluida
 */
function validarTasaSistema(declaracion: DeclaracionOficial): AlertaDiscrepancia | null {
  const { totales } = declaracion;
  const TASA_ESPERADA = CONSTANTES_ANA.TASA_USO_SISTEMA;
  
  if (!totales.tasa_uso_sistema || totales.tasa_uso_sistema !== TASA_ESPERADA) {
    return {
      id: `alerta_tasa_sistema_${Date.now()}`,
      nivel: 'naranja',
      categoria: 'calculo',
      titulo: 'Tasa de Sistema Faltante o Incorrecta',
      descripcion: `La tasa de Uso del Sistema debe ser B/.${TASA_ESPERADA.toFixed(2)}`,
      valorEsperado: TASA_ESPERADA,
      valorActual: totales.tasa_uso_sistema || 0,
      accionRequerida: 'Agregar tasa de sistema de B/. 3.00',
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
  
  const items = declaracion.articulos;
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
 * Calcula el estado actual de vencimiento basado en fechas
 */
export function calcularEstadoVencimiento(
  vencimientos: EscenariosPagoANA,
  montoBase: number
): EstadoVencimiento {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  // Parsear fechas en formato DD/MM/YYYY
  const parsearFecha = (fechaStr: string): Date => {
    const partes = fechaStr.split('/');
    return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
  };
  
  const fechaNormal = parsearFecha(vencimientos.normal.hasta_fecha);
  const fechaRecargo10 = parsearFecha(vencimientos.recargo_10_percent.hasta_fecha);
  
  // Calcular días hasta vencimiento normal
  const diasHastaNormal = Math.ceil((fechaNormal.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  
  if (hoy <= fechaNormal) {
    return {
      estado: diasHastaNormal <= 2 ? 'proximo' : 'normal',
      montoActual: montoBase,
      proximaFecha: vencimientos.normal.hasta_fecha,
      diasRestantes: diasHastaNormal
    };
  }
  
  if (hoy <= fechaRecargo10) {
    const recargo = montoBase * (CONSTANTES_ANA.RECARGO_1_PERCENT / 100);
    return {
      estado: 'vencido_1',
      montoActual: montoBase + recargo,
      proximaFecha: vencimientos.recargo_10_percent.hasta_fecha,
      diasRestantes: Math.ceil((fechaRecargo10.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
      recargo
    };
  }
  
  // Después de recargo 10%
  const recargo = montoBase * (CONSTANTES_ANA.RECARGO_2_PERCENT / 100);
  return {
    estado: 'vencido_2',
    montoActual: montoBase + recargo,
    proximaFecha: vencimientos.recargo_20_percent.desde_fecha,
    diasRestantes: 0,
    recargo
  };
}

/**
 * Genera alerta de vencimiento según estado
 */
function validarVencimientos(declaracion: DeclaracionOficial): AlertaDiscrepancia | null {
  // Crear escenarios de pago desde totales
  const vencimientos: EscenariosPagoANA = {
    normal: {
      monto: declaracion.totales.total_a_pagar,
      hasta_fecha: calcularFechaVencimiento(5)
    },
    recargo_10_percent: {
      monto: declaracion.totales.total_a_pagar * 1.10,
      hasta_fecha: calcularFechaVencimiento(10)
    },
    recargo_20_percent: {
      monto: declaracion.totales.total_a_pagar * 1.20,
      desde_fecha: calcularFechaVencimiento(11)
    }
  };
  
  const estado = calcularEstadoVencimiento(vencimientos, declaracion.totales.total_a_pagar);
  
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
      valorEsperado: declaracion.totales.total_a_pagar,
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
      valorEsperado: declaracion.totales.total_a_pagar,
      valorActual: estado.montoActual,
      diferencia: estado.recargo,
      accionRequerida: 'Pago urgente requerido - Recargo máximo aplicado',
      fechaDeteccion: new Date().toISOString()
    };
  }
  
  return null;
}

function calcularFechaVencimiento(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const day = String(fecha.getDate()).padStart(2, '0');
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const year = fecha.getFullYear();
  return `${day}/${month}/${year}`;
}

// ============================================
// VALIDACIÓN DE PERMISOS (RESTRICCIONES)
// ============================================

interface RestriccionArticulo {
  autoridad: string;
  tipo: string;
  descripcion: string;
  requiere_permiso: boolean;
  capitulo_sa?: string;
}

/**
 * Valida permisos regulatorios por autoridad
 */
function validarPermisosRegulatorios(declaracion: DeclaracionOficial): AlertaDiscrepancia[] {
  const alertas: AlertaDiscrepancia[] = [];
  
  for (const item of declaracion.articulos) {
    // Detectar restricciones basadas en capítulo SA
    const capitulo = item.fraccion_arancelaria.substring(0, 2);
    const autoridad = CONSTANTES_ANA.AUTORIDADES_POR_CAPITULO[capitulo as keyof typeof CONSTANTES_ANA.AUTORIDADES_POR_CAPITULO];
    
    if (autoridad) {
      alertas.push({
        id: `alerta_permiso_${item.numero_articulo}_${autoridad.autoridad}_${Date.now()}`,
        nivel: 'rojo',
        categoria: 'permiso',
        titulo: `Permiso ${autoridad.autoridad} Requerido`,
        descripcion: `${autoridad.descripcion} - Capítulo SA: ${capitulo}`,
        item: item.numero_articulo,
        autoridad: autoridad.autoridad,
        accionRequerida: `Obtener autorización de ${autoridad.autoridad} antes de despacho`,
        fechaDeteccion: new Date().toISOString()
      });
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
  for (const item of declaracion.articulos) {
    const alertaDAI = validarCruceAranceles(item);
    if (alertaDAI) alertas.push(alertaDAI);
    
    const alertaITBM = validarAritmeticaITBM(item);
    if (alertaITBM) alertas.push(alertaITBM);
  }
  
  // 2. Validar tasa de sistema
  const alertaTasa = validarTasaSistema(declaracion);
  if (alertaTasa) alertas.push(alertaTasa);
  
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
        fecha: calcularFechaVencimiento(5),
        monto: declaracion.totales.total_a_pagar,
        diasRestantes: 5
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
