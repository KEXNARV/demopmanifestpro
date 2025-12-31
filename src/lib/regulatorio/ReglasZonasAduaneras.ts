// ============================================
// REGLAS ZONAS ADUANERAS - PANAMÁ
// Fronteras Terrestres, Marítimas y Aéreas
// ZLC, Panamá Pacífico, Zonas Especiales
// ============================================

import { ZonaAduanera, ModoTransporte } from '@/types/transporte';
import { devLog } from '@/lib/logger';

// ============================================
// DEFINICIÓN DE PUNTOS DE CONTROL
// ============================================

export type TipoPuntoControl = 
  | 'aeropuerto'
  | 'puerto'
  | 'frontera_terrestre'
  | 'zona_libre'
  | 'zona_especial'
  | 'deposito_fiscal';

export interface PuntoControlAduanero {
  id: string;
  nombre: string;
  codigo: string;
  tipo: TipoPuntoControl;
  provincia: string;
  zonaAduanera: ZonaAduanera;
  modosTransporte: ModoTransporte[];
  paisFrontera?: string;          // Solo para fronteras terrestres
  horarioOperacion: string;
  tieneControlFitosanitario: boolean;
  tieneControlZoosanitario: boolean;
  tieneControlMINSA: boolean;
  tieneCONAPRED: boolean;
  tieneRayosX: boolean;
  tieneBascula: boolean;
  capacidadContenedores?: number; // TEUs por día
  tasasEspeciales: TasaPuntoControl[];
  restriccionesEspeciales: RestriccionPuntoControl[];
  documentosRequeridos: string[];
}

export interface TasaPuntoControl {
  concepto: string;
  monto: number;
  moneda: 'USD' | 'PAB';
  aplicaA: 'todos' | 'contenedor' | 'bulto' | 'vehiculo';
  modo?: ModoTransporte;
}

export interface RestriccionPuntoControl {
  tipo: 'horario' | 'producto' | 'peso' | 'dimension' | 'pais_origen';
  descripcion: string;
  valor?: string | number;
  excepcion?: string;
}

// ============================================
// BASE DE DATOS DE PUNTOS DE CONTROL
// ============================================

export const PUNTOS_CONTROL_PANAMA: PuntoControlAduanero[] = [
  // ═══════════════════════════════════════════════════════
  // AEROPUERTOS
  // ═══════════════════════════════════════════════════════
  {
    id: 'PTY',
    nombre: 'Aeropuerto Internacional de Tocumen',
    codigo: 'PTY',
    tipo: 'aeropuerto',
    provincia: 'Panamá',
    zonaAduanera: 'aeropuerto_tocumen',
    modosTransporte: ['aereo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    capacidadContenedores: 500,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Handling Cargo', monto: 0.08, moneda: 'USD', aplicaA: 'bulto' },
      { concepto: 'Almacenaje día 1-3', monto: 0.00, moneda: 'USD', aplicaA: 'bulto' },
      { concepto: 'Almacenaje día 4+', monto: 5.00, moneda: 'USD', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Animales vivos requieren cuarentena MIDA' },
      { tipo: 'peso', descripcion: 'Carga sobredimensionada requiere permiso especial', valor: 1000 }
    ],
    documentosRequeridos: [
      'AWB/MAWB', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga'
    ]
  },
  {
    id: 'PAC',
    nombre: 'Aeropuerto Marcos A. Gelabert (Albrook)',
    codigo: 'PAC',
    tipo: 'aeropuerto',
    provincia: 'Panamá',
    zonaAduanera: 'aeropuerto_tocumen', // Usa misma zona para procesamiento
    modosTransporte: ['aereo'],
    horarioOperacion: '06:00-22:00',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['AWB', 'Factura Comercial']
  },
  {
    id: 'DAV',
    nombre: 'Aeropuerto Enrique Malek (David)',
    codigo: 'DAV',
    tipo: 'aeropuerto',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas', // Procesamiento conjunto
    modosTransporte: ['aereo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['AWB', 'Factura Comercial', 'Certificado Fitosanitario']
  },
  
  // ═══════════════════════════════════════════════════════
  // PUERTOS MARÍTIMOS
  // ═══════════════════════════════════════════════════════
  {
    id: 'PACLP',
    nombre: 'Puerto de Cristóbal / Colón Container Terminal',
    codigo: 'PACLP',
    tipo: 'puerto',
    provincia: 'Colón',
    zonaAduanera: 'puerto_colon',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    capacidadContenedores: 3000,
    tasasEspeciales: [
      { concepto: 'THC (Terminal Handling)', monto: 185, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa Portuaria', monto: 25, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Inspección ANA', monto: 50, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Almacenaje día 1-5', monto: 0, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Almacenaje día 6+', monto: 35, moneda: 'USD', aplicaA: 'contenedor' }
    ],
    restriccionesEspeciales: [
      { tipo: 'peso', descripcion: 'Límite peso contenedor 20ft', valor: 21000 },
      { tipo: 'peso', descripcion: 'Límite peso contenedor 40ft', valor: 26000 }
    ],
    documentosRequeridos: [
      'B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga',
      'Certificado de Origen', 'Póliza de Seguro'
    ]
  },
  {
    id: 'PABLB',
    nombre: 'Puerto de Balboa (Pacífico)',
    codigo: 'PABLB',
    tipo: 'puerto',
    provincia: 'Panamá',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    capacidadContenedores: 2500,
    tasasEspeciales: [
      { concepto: 'THC (Terminal Handling)', monto: 195, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa Portuaria', monto: 25, moneda: 'USD', aplicaA: 'contenedor' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: [
      'B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga'
    ]
  },
  
  // ═══════════════════════════════════════════════════════
  // FRONTERAS TERRESTRES - CHIRIQUÍ
  // ═══════════════════════════════════════════════════════
  {
    id: 'PASO_CANOAS',
    nombre: 'Paso Canoas',
    codigo: 'PCAN',
    tipo: 'frontera_terrestre',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas',
    modosTransporte: ['terrestre'],
    paisFrontera: 'Costa Rica',
    horarioOperacion: '06:00-22:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Fumigación vehicular', monto: 15, moneda: 'USD', aplicaA: 'vehiculo' },
      { concepto: 'Inspección MIDA', monto: 25, moneda: 'USD', aplicaA: 'vehiculo', modo: 'terrestre' },
      { concepto: 'Pesaje obligatorio', monto: 5, moneda: 'USD', aplicaA: 'vehiculo' }
    ],
    restriccionesEspeciales: [
      { tipo: 'horario', descripcion: 'Carga pesada solo 06:00-18:00' },
      { tipo: 'peso', descripcion: 'Límite peso por eje', valor: 9000 },
      { tipo: 'producto', descripcion: 'Productos lácteos requieren certificado MIDA' },
      { tipo: 'producto', descripcion: 'Carne y derivados requieren permiso especial AUPSA' },
      { tipo: 'producto', descripcion: 'Frutas y vegetales requieren certificado fitosanitario' }
    ],
    documentosRequeridos: [
      'Carta de Porte Internacional', 'Factura Comercial', 'Lista de Empaque',
      'Certificado Fitosanitario (productos agrícolas)', 'Certificado Zoosanitario (animales/cárnicos)',
      'Licencia de Conducir Internacional', 'Permisos MIDA/AUPSA según producto'
    ]
  },
  {
    id: 'RIO_SERENO',
    nombre: 'Río Sereno',
    codigo: 'RSER',
    tipo: 'frontera_terrestre',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas', // Procesamiento conjunto
    modosTransporte: ['terrestre'],
    paisFrontera: 'Costa Rica',
    horarioOperacion: '08:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: false,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: false,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'peso', descripcion: 'Solo vehículos livianos', valor: 3500 },
      { tipo: 'producto', descripcion: 'Sin capacidad para carga comercial pesada' }
    ],
    documentosRequeridos: [
      'Carta de Porte', 'Factura Comercial', 'Certificado Fitosanitario'
    ]
  },
  
  // ═══════════════════════════════════════════════════════
  // FRONTERAS TERRESTRES - BOCAS DEL TORO
  // ═══════════════════════════════════════════════════════
  {
    id: 'GUABITO',
    nombre: 'Guabito / Sixaola',
    codigo: 'GUAB',
    tipo: 'frontera_terrestre',
    provincia: 'Bocas del Toro',
    zonaAduanera: 'guabito',
    modosTransporte: ['terrestre'],
    paisFrontera: 'Costa Rica',
    horarioOperacion: '07:00-17:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Fumigación', monto: 15, moneda: 'USD', aplicaA: 'vehiculo' },
      { concepto: 'Inspección MIDA (banano/plátano)', monto: 35, moneda: 'USD', aplicaA: 'vehiculo' }
    ],
    restriccionesEspeciales: [
      { tipo: 'horario', descripcion: 'Horario limitado' },
      { tipo: 'peso', descripcion: 'Puente con límite de peso', valor: 15000 },
      { tipo: 'producto', descripcion: 'Especializado en banano y productos agrícolas' },
      { tipo: 'producto', descripcion: 'Productos químicos requieren ruta alterna por Paso Canoas' }
    ],
    documentosRequeridos: [
      'Carta de Porte', 'Factura Comercial', 'Certificado Fitosanitario MIDA',
      'Certificado OIRSA (productos vegetales)'
    ]
  },
  
  // ═══════════════════════════════════════════════════════
  // FRONTERAS TERRESTRES - DARIÉN
  // ═══════════════════════════════════════════════════════
  {
    id: 'YAVIZA',
    nombre: 'Yaviza (Tapón del Darién)',
    codigo: 'YAVI',
    tipo: 'frontera_terrestre',
    provincia: 'Darién',
    zonaAduanera: 'darien',
    modosTransporte: ['terrestre'],
    paisFrontera: 'Colombia',
    horarioOperacion: '08:00-16:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: false,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'ZONA ALTA VIGILANCIA - Control exhaustivo' },
      { tipo: 'producto', descripcion: 'Todo cargamento requiere inspección física obligatoria' },
      { tipo: 'pais_origen', descripcion: 'Control reforzado para origen Colombia', valor: 'CO' }
    ],
    documentosRequeridos: [
      'Carta de Porte', 'Factura Comercial', 'Certificado de Origen',
      'Declaración Jurada', 'Permisos CONAPRED (si aplica)'
    ]
  },
  
  // ═══════════════════════════════════════════════════════
  // ZONAS LIBRES Y ESPECIALES
  // ═══════════════════════════════════════════════════════
  {
    id: 'ZLC',
    nombre: 'Zona Libre de Colón',
    codigo: 'ZLC',
    tipo: 'zona_libre',
    provincia: 'Colón',
    zonaAduanera: 'zona_libre_colon',
    modosTransporte: ['aereo', 'maritimo', 'terrestre'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    capacidadContenedores: 5000,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema ZLC', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Licencia de Operación Anual', monto: 850, moneda: 'USD', aplicaA: 'todos' },
      { concepto: 'Impuesto Municipal (1%)', monto: 0, moneda: 'USD', aplicaA: 'todos' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Régimen de Zona Libre - Exento de aranceles para reexportación' },
      { tipo: 'producto', descripcion: 'Nacionalización paga aranceles completos' }
    ],
    documentosRequeridos: [
      'Declaración de Zona Libre', 'Factura Comercial', 'Lista de Empaque',
      'B/L o AWB', 'Certificado de Origen'
    ]
  },
  {
    id: 'PPAC',
    nombre: 'Panamá Pacífico (Área Económica Especial)',
    codigo: 'PPAC',
    tipo: 'zona_especial',
    provincia: 'Panamá Oeste',
    zonaAduanera: 'panama_pacifico',
    modosTransporte: ['aereo', 'maritimo', 'terrestre'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Impuesto ITBMS Reducido (5%)', monto: 0, moneda: 'USD', aplicaA: 'todos' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Beneficios fiscales especiales para empresas registradas' },
      { tipo: 'producto', descripcion: 'Requiere Contrato de Establecimiento vigente' }
    ],
    documentosRequeridos: [
      'Declaración de Importación', 'Factura Comercial', 'Contrato de Establecimiento'
    ]
  }
];

// ============================================
// FUNCIONES DE CONSULTA
// ============================================

/**
 * Obtiene punto de control por código
 */
export function obtenerPuntoControl(codigo: string): PuntoControlAduanero | null {
  return PUNTOS_CONTROL_PANAMA.find(p => 
    p.codigo === codigo || p.id === codigo
  ) || null;
}

/**
 * Obtiene puntos de control por zona aduanera
 */
export function obtenerPuntosPorZona(zona: ZonaAduanera): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => p.zonaAduanera === zona);
}

/**
 * Obtiene puntos de control por modo de transporte
 */
export function obtenerPuntosPorModo(modo: ModoTransporte): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => p.modosTransporte.includes(modo));
}

/**
 * Obtiene fronteras terrestres
 */
export function obtenerFronterasTerrestres(): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => p.tipo === 'frontera_terrestre');
}

/**
 * Calcula tasas aplicables para un punto de control
 */
export function calcularTasasPuntoControl(
  codigoPunto: string,
  opciones: {
    modo: ModoTransporte;
    cantidadBultos?: number;
    cantidadContenedores?: number;
    cantidadVehiculos?: number;
  }
): { concepto: string; monto: number; subtotal: number }[] {
  const punto = obtenerPuntoControl(codigoPunto);
  if (!punto) return [];
  
  const tasasAplicables: { concepto: string; monto: number; subtotal: number }[] = [];
  
  for (const tasa of punto.tasasEspeciales) {
    // Filtrar por modo si aplica
    if (tasa.modo && tasa.modo !== opciones.modo) continue;
    
    let cantidad = 1;
    switch (tasa.aplicaA) {
      case 'bulto':
        cantidad = opciones.cantidadBultos || 1;
        break;
      case 'contenedor':
        cantidad = opciones.cantidadContenedores || 1;
        break;
      case 'vehiculo':
        cantidad = opciones.cantidadVehiculos || 1;
        break;
    }
    
    if (tasa.monto > 0) {
      tasasAplicables.push({
        concepto: tasa.concepto,
        monto: tasa.monto,
        subtotal: tasa.monto * cantidad
      });
    }
  }
  
  return tasasAplicables;
}

/**
 * Verifica restricciones de un producto en un punto de control
 */
export function verificarRestriccionesPunto(
  codigoPunto: string,
  descripcionProducto: string,
  opciones: {
    pesoKg?: number;
    paisOrigen?: string;
  } = {}
): { tieneRestriccion: boolean; restricciones: string[] } {
  const punto = obtenerPuntoControl(codigoPunto);
  if (!punto) return { tieneRestriccion: false, restricciones: [] };
  
  const restriccionesAplicables: string[] = [];
  const descLower = descripcionProducto.toLowerCase();
  
  for (const restriccion of punto.restriccionesEspeciales) {
    switch (restriccion.tipo) {
      case 'producto':
        // Verificar si la descripción del producto coincide con palabras clave
        const keywords = ['lácteo', 'lacteo', 'carne', 'meat', 'fruta', 'vegetal', 
                         'quimico', 'chemical', 'banano', 'platano'];
        if (keywords.some(kw => descLower.includes(kw))) {
          restriccionesAplicables.push(restriccion.descripcion);
        }
        break;
        
      case 'peso':
        if (opciones.pesoKg && typeof restriccion.valor === 'number' && 
            opciones.pesoKg > restriccion.valor) {
          restriccionesAplicables.push(`${restriccion.descripcion}: Excede ${restriccion.valor}kg`);
        }
        break;
        
      case 'pais_origen':
        if (opciones.paisOrigen && restriccion.valor === opciones.paisOrigen) {
          restriccionesAplicables.push(restriccion.descripcion);
        }
        break;
    }
  }
  
  return {
    tieneRestriccion: restriccionesAplicables.length > 0,
    restricciones: restriccionesAplicables
  };
}

/**
 * Obtiene documentos requeridos para un punto de control
 */
export function obtenerDocumentosRequeridos(
  codigoPunto: string,
  descripcionProducto?: string
): string[] {
  const punto = obtenerPuntoControl(codigoPunto);
  if (!punto) return [];
  
  const documentos = [...punto.documentosRequeridos];
  
  // Agregar documentos adicionales según producto
  if (descripcionProducto) {
    const descLower = descripcionProducto.toLowerCase();
    
    if (['fruta', 'vegetal', 'planta', 'semilla'].some(k => descLower.includes(k))) {
      if (!documentos.includes('Certificado Fitosanitario')) {
        documentos.push('Certificado Fitosanitario MIDA');
      }
    }
    
    if (['carne', 'lacteo', 'animal', 'huevo'].some(k => descLower.includes(k))) {
      if (!documentos.includes('Certificado Zoosanitario')) {
        documentos.push('Certificado Zoosanitario AUPSA');
      }
    }
    
    if (['medicamento', 'farmaceutico', 'medicine'].some(k => descLower.includes(k))) {
      documentos.push('Registro Sanitario MINSA');
      documentos.push('Licencia de Importación Farmacéutica');
    }
  }
  
  return documentos;
}

export default {
  PUNTOS_CONTROL_PANAMA,
  obtenerPuntoControl,
  obtenerPuntosPorZona,
  obtenerPuntosPorModo,
  obtenerFronterasTerrestres,
  calcularTasasPuntoControl,
  verificarRestriccionesPunto,
  obtenerDocumentosRequeridos
};
