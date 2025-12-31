// ============================================
// REGLAS ZONAS ADUANERAS - PANAMÁ
// Autoridad Nacional de Aduanas (ANA)
// 7 Administraciones Regionales Completas
// ============================================

import { ZonaAduanera, ModoTransporte } from '@/types/transporte';
import { devLog } from '@/lib/logger';

// ============================================
// DEFINICIÓN DE TIPOS
// ============================================

export type TipoPuntoControl = 
  | 'aeropuerto'
  | 'puerto'
  | 'frontera_terrestre'
  | 'zona_libre'
  | 'zona_especial'
  | 'deposito_fiscal'
  | 'terminal_carga'
  | 'encomiendas'
  | 'cruceros';

export type AdministracionRegional =
  | 'zona_oriental'          // Panamá y Darién
  | 'zona_aeroportuaria'     // Tocumen
  | 'zona_norte'             // Colón
  | 'zona_occidental'        // Chiriquí
  | 'zona_noroccidental'     // Bocas del Toro
  | 'zona_central_azuero'    // Coclé, Herrera, Los Santos, Veraguas
  | 'zona_panama_pacifico';  // Howard / Panamá Pacífico

export interface PuntoControlAduanero {
  id: string;
  nombre: string;
  codigo: string;
  tipo: TipoPuntoControl;
  administracionRegional: AdministracionRegional;
  provincia: string;
  zonaAduanera: ZonaAduanera;
  modosTransporte: ModoTransporte[];
  paisFrontera?: string;
  horarioOperacion: string;
  tieneControlFitosanitario: boolean;
  tieneControlZoosanitario: boolean;
  tieneControlMINSA: boolean;
  tieneCONAPRED: boolean;
  tieneRayosX: boolean;
  tieneBascula: boolean;
  capacidadContenedores?: number;
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
// BASE DE DATOS COMPLETA - 7 ADMINISTRACIONES
// Fuente: Autoridad Nacional de Aduanas (ANA)
// ============================================

export const PUNTOS_CONTROL_PANAMA: PuntoControlAduanero[] = [
  
  // ═══════════════════════════════════════════════════════════════════
  // ZONA ORIENTAL (Provincia de Panamá y Darién)
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'BALBOA',
    nombre: 'Recinto Puerto de Balboa',
    codigo: 'PABLB',
    tipo: 'puerto',
    administracionRegional: 'zona_oriental',
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
      { concepto: 'Tasa Portuaria', monto: 25, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga']
  },
  {
    id: 'PSA_RODMAN',
    nombre: 'Recinto Puerto de PSA (Rodman)',
    codigo: 'PARODM',
    tipo: 'puerto',
    administracionRegional: 'zona_oriental',
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
    capacidadContenedores: 1500,
    tasasEspeciales: [
      { concepto: 'THC (Terminal Handling)', monto: 185, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga']
  },
  {
    id: 'VACAMONTE',
    nombre: 'Recinto Puerto de Vacamonte',
    codigo: 'PAVAC',
    tipo: 'puerto',
    administracionRegional: 'zona_oriental',
    provincia: 'Panamá Oeste',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Especializado en productos pesqueros' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Certificado Sanitario ARAP']
  },
  {
    id: 'COQUIRA',
    nombre: 'Recinto Puerto Coquira (Chepo)',
    codigo: 'PACOQ',
    tipo: 'puerto',
    administracionRegional: 'zona_oriental',
    provincia: 'Panamá',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '08:00-16:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: false,
    tieneControlMINSA: false,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto menor - operaciones limitadas' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial']
  },
  {
    id: 'ALBROOK',
    nombre: 'Recinto Aduanero de Albrook (Sede Principal/Carga)',
    codigo: 'PAALB',
    tipo: 'terminal_carga',
    administracionRegional: 'zona_oriental',
    provincia: 'Panamá',
    zonaAduanera: 'aeropuerto_tocumen',
    modosTransporte: ['aereo', 'terrestre'],
    horarioOperacion: '07:00-17:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['Declaración de Aduana', 'Factura Comercial', 'Lista de Empaque']
  },
  {
    id: 'JAQUE',
    nombre: 'Recinto de Jaqué (Darién)',
    codigo: 'PAJAQ',
    tipo: 'frontera_terrestre',
    administracionRegional: 'zona_oriental',
    provincia: 'Darién',
    zonaAduanera: 'panama_pacifico',
    modosTransporte: ['maritimo', 'terrestre'],
    paisFrontera: 'Colombia',
    horarioOperacion: '08:00-16:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: false,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'ZONA ALTA VIGILANCIA - Control exhaustivo' },
      { tipo: 'pais_origen', descripcion: 'Control reforzado para origen Colombia', valor: 'CO' }
    ],
    documentosRequeridos: ['Carta de Porte', 'Factura Comercial', 'Certificado de Origen', 'Permisos CONAPRED']
  },
  {
    id: 'PUERTO_OBALDIA',
    nombre: 'Recinto de Puerto Obaldía',
    codigo: 'PAOBL',
    tipo: 'frontera_terrestre',
    administracionRegional: 'zona_oriental',
    provincia: 'Guna Yala',
    zonaAduanera: 'panama_pacifico',
    modosTransporte: ['maritimo'],
    paisFrontera: 'Colombia',
    horarioOperacion: '08:00-16:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: false,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'ZONA ALTA VIGILANCIA - Control exhaustivo' },
      { tipo: 'pais_origen', descripcion: 'Control reforzado para origen Colombia', valor: 'CO' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Declaración Jurada', 'Permisos CONAPRED']
  },

  // ═══════════════════════════════════════════════════════════════════
  // ZONA AEROPORTUARIA (Tocumen)
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'PTY_CARGA',
    nombre: 'Recinto de Carga - Aeropuerto Internacional de Tocumen',
    codigo: 'PTYCG',
    tipo: 'terminal_carga',
    administracionRegional: 'zona_aeroportuaria',
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
    documentosRequeridos: ['AWB/MAWB', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga']
  },
  {
    id: 'PTY_PAX',
    nombre: 'Terminal de Pasajeros - Aeropuerto Internacional de Tocumen',
    codigo: 'PTYPX',
    tipo: 'aeropuerto',
    administracionRegional: 'zona_aeroportuaria',
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
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Equipaje acompañado - límites de franquicia' }
    ],
    documentosRequeridos: ['Pasaporte', 'Declaración de Aduanas', 'Factura de compras']
  },
  {
    id: 'CORREOS',
    nombre: 'Recinto de Encomiendas Postales (Correos y Telégrafos)',
    codigo: 'PTYCOR',
    tipo: 'encomiendas',
    administracionRegional: 'zona_aeroportuaria',
    provincia: 'Panamá',
    zonaAduanera: 'aeropuerto_tocumen',
    modosTransporte: ['aereo'],
    horarioOperacion: '08:00-17:00',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Encomiendas postales - régimen simplificado' }
    ],
    documentosRequeridos: ['Aviso de llegada', 'Identificación personal', 'Factura de compra']
  },
  {
    id: 'COURIERS',
    nombre: 'Recintos de Couriers (Empresas de mensajería rápida)',
    codigo: 'PTYCOU',
    tipo: 'encomiendas',
    administracionRegional: 'zona_aeroportuaria',
    provincia: 'Panamá',
    zonaAduanera: 'aeropuerto_tocumen',
    modosTransporte: ['aereo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Procesamiento Express', monto: 15.00, moneda: 'USD', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Fast Track disponible para paquetes < $100 USD' }
    ],
    documentosRequeridos: ['HAWB', 'Factura Comercial', 'Manifiesto Courier']
  },

  // ═══════════════════════════════════════════════════════════════════
  // ZONA NORTE (Provincia de Colón)
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'CRISTOBAL',
    nombre: 'Recinto Puerto de Cristóbal (Panama Ports Co.)',
    codigo: 'CLNCR',
    tipo: 'puerto',
    administracionRegional: 'zona_norte',
    provincia: 'Colón',
    zonaAduanera: 'puerto_cristobal',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    capacidadContenedores: 2000,
    tasasEspeciales: [
      { concepto: 'THC (Terminal Handling)', monto: 185, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa Portuaria', monto: 25, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Inspección ANA', monto: 50, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'peso', descripcion: 'Límite peso contenedor 20ft', valor: 21000 },
      { tipo: 'peso', descripcion: 'Límite peso contenedor 40ft', valor: 26000 }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga', 'Certificado de Origen']
  },
  {
    id: 'MIT',
    nombre: 'Recinto Manzanillo International Terminal (MIT)',
    codigo: 'CLNMT',
    tipo: 'puerto',
    administracionRegional: 'zona_norte',
    provincia: 'Colón',
    zonaAduanera: 'puerto_manzanillo',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    capacidadContenedores: 3500,
    tasasEspeciales: [
      { concepto: 'THC (Terminal Handling)', monto: 185, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa Portuaria', monto: 25, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Inspección ANA', monto: 50, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Almacenaje día 1-5', monto: 0, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Almacenaje día 6+', monto: 35, moneda: 'USD', aplicaA: 'contenedor' },
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga', 'Póliza de Seguro']
  },
  {
    id: 'CCT',
    nombre: 'Recinto Colón Container Terminal (CCT)',
    codigo: 'CLNCT',
    tipo: 'puerto',
    administracionRegional: 'zona_norte',
    provincia: 'Colón',
    zonaAduanera: 'puerto_colon_container',
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
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Lista de Empaque', 'Manifiesto de Carga']
  },
  {
    id: 'ZLC',
    nombre: 'Recinto de Zona Libre de Colón (Entradas y Salidas)',
    codigo: 'ZLCOL',
    tipo: 'zona_libre',
    administracionRegional: 'zona_norte',
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
    documentosRequeridos: ['Declaración de Zona Libre', 'Factura Comercial', 'Lista de Empaque', 'B/L o AWB', 'Certificado de Origen']
  },
  {
    id: 'COLON_2000',
    nombre: 'Recinto Puerto de Colón 2000 (Cruceros)',
    codigo: 'CLN2K',
    tipo: 'cruceros',
    administracionRegional: 'zona_norte',
    provincia: 'Colón',
    zonaAduanera: 'puerto_cristobal',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: true,
    tieneBascula: false,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Terminal de cruceros y pasajeros' }
    ],
    documentosRequeridos: ['Pasaporte', 'Declaración de Aduanas']
  },
  {
    id: 'BAHIA_MINAS',
    nombre: 'Recinto Terminal Granelera Bahía Las Minas',
    codigo: 'CLNBM',
    tipo: 'puerto',
    administracionRegional: 'zona_norte',
    provincia: 'Colón',
    zonaAduanera: 'puerto_cristobal',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: false,
    tieneControlMINSA: false,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Manipulación Granel', monto: 2.50, moneda: 'USD', aplicaA: 'todos' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Especializado en carga a granel y combustibles' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Certificados de calidad']
  },
  {
    id: 'DAVIS',
    nombre: 'Recinto de Zona Procesadora de Davis',
    codigo: 'CLNDV',
    tipo: 'zona_especial',
    administracionRegional: 'zona_norte',
    provincia: 'Colón',
    zonaAduanera: 'zona_libre_colon',
    modosTransporte: ['maritimo', 'terrestre'],
    horarioOperacion: '07:00-17:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Zona procesadora para exportación' }
    ],
    documentosRequeridos: ['Declaración de Zona Procesadora', 'Factura Comercial', 'Lista de Empaque']
  },

  // ═══════════════════════════════════════════════════════════════════
  // ZONA OCCIDENTAL (Provincia de Chiriquí)
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'PASO_CANOAS',
    nombre: 'Recinto Fronterizo de Paso Canoas (Frontera con Costa Rica)',
    codigo: 'PCAN',
    tipo: 'frontera_terrestre',
    administracionRegional: 'zona_occidental',
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
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
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
    documentosRequeridos: ['Carta de Porte Internacional', 'Factura Comercial', 'Lista de Empaque', 'Certificado Fitosanitario', 'Certificado Zoosanitario', 'Licencia de Conducir Internacional', 'Permisos MIDA/AUPSA']
  },
  {
    id: 'DAVID',
    nombre: 'Recinto de Aduana de David (Central)',
    codigo: 'DAVAD',
    tipo: 'deposito_fiscal',
    administracionRegional: 'zona_occidental',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas',
    modosTransporte: ['terrestre', 'aereo'],
    horarioOperacion: '07:00-17:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: true,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['Declaración de Aduana', 'Factura Comercial', 'Lista de Empaque']
  },
  {
    id: 'ENRIQUE_MALEK',
    nombre: 'Recinto Aeropuerto Enrique Malek',
    codigo: 'DAV',
    tipo: 'aeropuerto',
    administracionRegional: 'zona_occidental',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas',
    modosTransporte: ['aereo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [],
    documentosRequeridos: ['AWB', 'Factura Comercial', 'Certificado Fitosanitario']
  },
  {
    id: 'RIO_SERENO',
    nombre: 'Recinto de Río Sereno (Frontera)',
    codigo: 'RSER',
    tipo: 'frontera_terrestre',
    administracionRegional: 'zona_occidental',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas',
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
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'peso', descripcion: 'Solo vehículos livianos', valor: 3500 },
      { tipo: 'producto', descripcion: 'Sin capacidad para carga comercial pesada' }
    ],
    documentosRequeridos: ['Carta de Porte', 'Factura Comercial', 'Certificado Fitosanitario']
  },
  {
    id: 'PEDREGAL',
    nombre: 'Recinto Puerto de Pedregal',
    codigo: 'CHPED',
    tipo: 'puerto',
    administracionRegional: 'zona_occidental',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto comercial regional' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Lista de Empaque']
  },
  {
    id: 'CHARCO_AZUL',
    nombre: 'Recinto de Petroterminal de Panamá (Charco Azul)',
    codigo: 'CHCAZ',
    tipo: 'puerto',
    administracionRegional: 'zona_occidental',
    provincia: 'Chiriquí',
    zonaAduanera: 'paso_canoas',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: false,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Operaciones Petroleras', monto: 100, moneda: 'USD', aplicaA: 'todos' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Terminal petrolera especializada' },
      { tipo: 'producto', descripcion: 'Solo productos derivados del petróleo' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Permisos ASEP', 'Certificados de Hidrocarburos']
  },

  // ═══════════════════════════════════════════════════════════════════
  // ZONA NOR-OCCIDENTAL (Bocas del Toro)
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'GUABITO',
    nombre: 'Recinto Fronterizo de Guabito',
    codigo: 'GUAB',
    tipo: 'frontera_terrestre',
    administracionRegional: 'zona_noroccidental',
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
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Fumigación', monto: 15, moneda: 'USD', aplicaA: 'vehiculo' },
      { concepto: 'Inspección MIDA (banano/plátano)', monto: 35, moneda: 'USD', aplicaA: 'vehiculo' }
    ],
    restriccionesEspeciales: [
      { tipo: 'horario', descripcion: 'Horario limitado' },
      { tipo: 'peso', descripcion: 'Puente con límite de peso', valor: 15000 },
      { tipo: 'producto', descripcion: 'Especializado en banano y productos agrícolas' },
      { tipo: 'producto', descripcion: 'Productos químicos requieren ruta alterna por Paso Canoas' }
    ],
    documentosRequeridos: ['Carta de Porte', 'Factura Comercial', 'Certificado Fitosanitario MIDA', 'Certificado OIRSA']
  },
  {
    id: 'ALMIRANTE',
    nombre: 'Recinto Puerto de Almirante',
    codigo: 'BDALM',
    tipo: 'puerto',
    administracionRegional: 'zona_noroccidental',
    provincia: 'Bocas del Toro',
    zonaAduanera: 'guabito',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto bananero y de carga general' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Certificado Fitosanitario']
  },
  {
    id: 'CHIRIQUI_GRANDE',
    nombre: 'Recinto Puerto de Chiriquí Grande',
    codigo: 'BDCHG',
    tipo: 'puerto',
    administracionRegional: 'zona_noroccidental',
    provincia: 'Bocas del Toro',
    zonaAduanera: 'guabito',
    modosTransporte: ['maritimo'],
    horarioOperacion: '24/7',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: false,
    tieneCONAPRED: true,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'Operaciones Petroleras', monto: 75, moneda: 'USD', aplicaA: 'todos' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Terminal petrolera del oleoducto transístmico' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Permisos de Hidrocarburos']
  },
  {
    id: 'BOCAS_AEROPUERTO',
    nombre: 'Recinto Aeropuerto de Bocas del Toro (Isla Colón)',
    codigo: 'BOC',
    tipo: 'aeropuerto',
    administracionRegional: 'zona_noroccidental',
    provincia: 'Bocas del Toro',
    zonaAduanera: 'guabito',
    modosTransporte: ['aereo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Aeropuerto regional - operaciones limitadas' }
    ],
    documentosRequeridos: ['AWB', 'Factura Comercial']
  },

  // ═══════════════════════════════════════════════════════════════════
  // ZONA CENTRAL Y AZUERO (Coclé, Herrera, Los Santos y Veraguas)
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'AGUADULCE',
    nombre: 'Recinto Puerto de Aguadulce',
    codigo: 'COAGU',
    tipo: 'puerto',
    administracionRegional: 'zona_central_azuero',
    provincia: 'Coclé',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto azucarero y agrícola' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial', 'Certificado Fitosanitario']
  },
  {
    id: 'RIO_HATO',
    nombre: 'Recinto Aeropuerto Scarlett Martínez (Río Hato)',
    codigo: 'RIH',
    tipo: 'aeropuerto',
    administracionRegional: 'zona_central_azuero',
    provincia: 'Coclé',
    zonaAduanera: 'aeropuerto_tocumen',
    modosTransporte: ['aereo'],
    horarioOperacion: '07:00-19:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Aeropuerto internacional - operaciones limitadas' }
    ],
    documentosRequeridos: ['AWB', 'Factura Comercial']
  },
  {
    id: 'MENSABE',
    nombre: 'Recinto Puerto de Mensabé (Los Santos)',
    codigo: 'LSMEN',
    tipo: 'puerto',
    administracionRegional: 'zona_central_azuero',
    provincia: 'Los Santos',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: false,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto pesquero y de cabotaje' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial']
  },
  {
    id: 'MUTIS',
    nombre: 'Recinto Puerto Mutis (Veraguas)',
    codigo: 'VEMUT',
    tipo: 'puerto',
    administracionRegional: 'zona_central_azuero',
    provincia: 'Veraguas',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: false,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto de cabotaje y pesca artesanal' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial']
  },
  {
    id: 'BOCA_PARITA',
    nombre: 'Recinto Puerto Boca Parita (Herrera)',
    codigo: 'HEBOP',
    tipo: 'puerto',
    administracionRegional: 'zona_central_azuero',
    provincia: 'Herrera',
    zonaAduanera: 'puerto_balboa',
    modosTransporte: ['maritimo'],
    horarioOperacion: '06:00-18:00',
    tieneControlFitosanitario: true,
    tieneControlZoosanitario: true,
    tieneControlMINSA: false,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Puerto pesquero artesanal' }
    ],
    documentosRequeridos: ['B/L', 'Factura Comercial']
  },
  {
    id: 'SANTIAGO',
    nombre: 'Recinto Aeropuerto Rubén Cantú (Santiago)',
    codigo: 'SYP',
    tipo: 'aeropuerto',
    administracionRegional: 'zona_central_azuero',
    provincia: 'Veraguas',
    zonaAduanera: 'aeropuerto_tocumen',
    modosTransporte: ['aereo'],
    horarioOperacion: '07:00-17:00',
    tieneControlFitosanitario: false,
    tieneControlZoosanitario: false,
    tieneControlMINSA: true,
    tieneCONAPRED: false,
    tieneRayosX: false,
    tieneBascula: true,
    tasasEspeciales: [
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Aeropuerto regional - vuelos domésticos' }
    ],
    documentosRequeridos: ['AWB', 'Factura Comercial']
  },

  // ═══════════════════════════════════════════════════════════════════
  // ZONA ESPECIAL PANAMÁ PACÍFICO
  // ═══════════════════════════════════════════════════════════════════
  
  {
    id: 'PPAC',
    nombre: 'Recinto de Área Económica Especial Panamá Pacífico (Howard)',
    codigo: 'PPAC',
    tipo: 'zona_especial',
    administracionRegional: 'zona_panama_pacifico',
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
      { concepto: 'Tasa de Sistema SIGA', monto: 3.00, moneda: 'PAB', aplicaA: 'bulto' },
      { concepto: 'ITBMS Reducido (5%)', monto: 0, moneda: 'USD', aplicaA: 'todos' }
    ],
    restriccionesEspeciales: [
      { tipo: 'producto', descripcion: 'Beneficios fiscales especiales para empresas registradas' },
      { tipo: 'producto', descripcion: 'Requiere Contrato de Establecimiento vigente' }
    ],
    documentosRequeridos: ['Declaración de Importación', 'Factura Comercial', 'Contrato de Establecimiento']
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
 * Obtiene puntos de control por administración regional
 */
export function obtenerPuntosPorAdministracion(admin: AdministracionRegional): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => p.administracionRegional === admin);
}

/**
 * Obtiene fronteras terrestres
 */
export function obtenerFronterasTerrestres(): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => p.tipo === 'frontera_terrestre');
}

/**
 * Obtiene puertos marítimos
 */
export function obtenerPuertos(): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => p.tipo === 'puerto');
}

/**
 * Obtiene aeropuertos
 */
export function obtenerAeropuertos(): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => 
    p.tipo === 'aeropuerto' || p.tipo === 'terminal_carga'
  );
}

/**
 * Obtiene zonas libres y especiales
 */
export function obtenerZonasEspeciales(): PuntoControlAduanero[] {
  return PUNTOS_CONTROL_PANAMA.filter(p => 
    p.tipo === 'zona_libre' || p.tipo === 'zona_especial'
  );
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
        const keywords = ['lácteo', 'lacteo', 'carne', 'meat', 'fruta', 'vegetal', 
                         'quimico', 'chemical', 'banano', 'platano', 'petroleo', 
                         'combustible', 'granel', 'pesquero'];
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
  
  if (descripcionProducto) {
    const descLower = descripcionProducto.toLowerCase();
    
    if (['fruta', 'vegetal', 'planta', 'semilla', 'banano'].some(k => descLower.includes(k))) {
      if (!documentos.includes('Certificado Fitosanitario MIDA')) {
        documentos.push('Certificado Fitosanitario MIDA');
      }
    }
    
    if (['carne', 'lacteo', 'animal', 'huevo', 'pollo', 'res'].some(k => descLower.includes(k))) {
      if (!documentos.includes('Certificado Zoosanitario AUPSA')) {
        documentos.push('Certificado Zoosanitario AUPSA');
      }
    }
    
    if (['medicamento', 'farmaceutico', 'medicine', 'pharma'].some(k => descLower.includes(k))) {
      documentos.push('Registro Sanitario MINSA');
      documentos.push('Licencia de Importación Farmacéutica');
    }
    
    if (['petroleo', 'combustible', 'gas', 'hidrocarburo'].some(k => descLower.includes(k))) {
      documentos.push('Permisos ASEP');
      documentos.push('Certificado de Hidrocarburos');
    }
  }
  
  return documentos;
}

/**
 * Resumen estadístico de recintos por administración
 */
export function obtenerResumenAdministraciones(): Record<AdministracionRegional, { total: number; tipos: string[] }> {
  const resumen: Record<AdministracionRegional, { total: number; tipos: Set<string> }> = {
    zona_oriental: { total: 0, tipos: new Set() },
    zona_aeroportuaria: { total: 0, tipos: new Set() },
    zona_norte: { total: 0, tipos: new Set() },
    zona_occidental: { total: 0, tipos: new Set() },
    zona_noroccidental: { total: 0, tipos: new Set() },
    zona_central_azuero: { total: 0, tipos: new Set() },
    zona_panama_pacifico: { total: 0, tipos: new Set() }
  };
  
  for (const punto of PUNTOS_CONTROL_PANAMA) {
    resumen[punto.administracionRegional].total++;
    resumen[punto.administracionRegional].tipos.add(punto.tipo);
  }
  
  const resultado: Record<AdministracionRegional, { total: number; tipos: string[] }> = {} as any;
  for (const [key, value] of Object.entries(resumen)) {
    resultado[key as AdministracionRegional] = {
      total: value.total,
      tipos: Array.from(value.tipos)
    };
  }
  
  return resultado;
}

export default {
  PUNTOS_CONTROL_PANAMA,
  obtenerPuntoControl,
  obtenerPuntosPorZona,
  obtenerPuntosPorModo,
  obtenerPuntosPorAdministracion,
  obtenerFronterasTerrestres,
  obtenerPuertos,
  obtenerAeropuertos,
  obtenerZonasEspeciales,
  calcularTasasPuntoControl,
  verificarRestriccionesPunto,
  obtenerDocumentosRequeridos,
  obtenerResumenAdministraciones
};
