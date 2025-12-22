// ============================================
// REPORTE PRODUCTOS FARMACÉUTICOS - MINSA
// Genera Excel con todos los productos que
// requieren permiso del Ministerio de Salud
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ManifestRow } from '@/types/manifest';
import { Liquidacion } from '@/types/aduanas';

export interface ProductoFarmaceutico {
  numeroFila: number;
  guiaAerea: string;
  guiaAmazon?: string;
  guiaLocal?: string;
  
  // Datos del consignatario
  consignatario: string;
  identificacion: string;
  telefono: string;
  email: string;
  
  // Ubicación
  provincia: string;
  ciudad: string;
  distrito: string;
  direccion: string;
  codigoPostal: string;
  
  // Datos del paquete
  descripcionCompleta: string;
  descripcionArancel: string;
  codigoArancelario: string;
  cantidad: number;
  peso: number;
  valorUSD: number;
  flete: number;
  valorCIF: number;
  
  // Clasificación
  categoriaAduanera: string;
  tipoProducto: string;
  palabrasClave: string[];
  
  // Tributos
  totalTributos: number;
  totalAPagar: number;
  
  // Control
  requierePermisoMINSA: boolean;
  autoridad: string;
  observaciones: string;
}

// Palabras clave para detectar productos farmacéuticos
const PALABRAS_FARMACEUTICAS = [
  // Medicamentos generales
  'medicine', 'medication', 'medicamento', 'medicamentos', 'drug', 'drugs',
  'pharmaceutical', 'pharma', 'farmaceutico', 'farmacia', 'rx',
  
  // Formas farmacéuticas
  'tablet', 'tablets', 'tableta', 'tabletas', 'pastilla', 'pastillas',
  'pill', 'pills', 'capsule', 'capsules', 'capsula', 'capsulas',
  'syrup', 'jarabe', 'injection', 'inyeccion', 'inyectable',
  'cream', 'crema', 'ointment', 'unguento', 'pomada',
  'drops', 'gotas', 'spray', 'suspension', 'solucion', 'solution',
  'suppository', 'supositorio', 'patch', 'parche', 'gel', 'lotion',
  'inhaler', 'inhalador', 'nebulizer', 'nebulizador', 'ampolla', 'ampoule',
  
  // Antibióticos
  'antibiotic', 'antibiotico', 'amoxicillin', 'amoxicilina',
  'azithromycin', 'azitromicina', 'ciprofloxacin', 'ciprofloxacino',
  'penicillin', 'penicilina', 'cephalexin', 'cefalexina',
  'doxycycline', 'doxiciclina', 'metronidazole', 'metronidazol',
  'clindamycin', 'clindamicina', 'levofloxacin', 'levofloxacino',
  'erythromycin', 'eritromicina', 'tetracycline', 'tetraciclina',
  
  // Analgésicos y antiinflamatorios
  'painkiller', 'analgesic', 'analgesico', 'pain relief',
  'ibuprofen', 'ibuprofeno', 'acetaminophen', 'acetaminofen',
  'paracetamol', 'aspirin', 'aspirina', 'naproxen', 'naproxeno',
  'diclofenac', 'diclofenaco', 'meloxicam', 'celecoxib',
  'tramadol', 'codeine', 'codeina', 'morphine', 'morfina',
  'oxycodone', 'oxicodona', 'hydrocodone', 'fentanyl', 'fentanilo',
  
  // Cardiovasculares
  'cardiovascular', 'blood pressure', 'presion arterial',
  'lisinopril', 'losartan', 'amlodipine', 'amlodipino',
  'metoprolol', 'atenolol', 'carvedilol', 'valsartan',
  'enalapril', 'ramipril', 'nifedipine', 'nifedipino',
  'diltiazem', 'verapamil', 'furosemide', 'furosemida',
  'hydrochlorothiazide', 'hidroclorotiazida', 'spironolactone',
  'warfarin', 'warfarina', 'clopidogrel', 'aspirin cardio',
  
  // Diabetes
  'diabetes', 'diabetic', 'diabetico', 'insulin', 'insulina',
  'metformin', 'metformina', 'glibenclamide', 'glibenclamida',
  'glimepiride', 'glimepirida', 'sitagliptin', 'sitagliptina',
  'pioglitazone', 'pioglitazona', 'gliclazide', 'gliclazida',
  'glipizide', 'glipizida', 'glucometer', 'glucometro',
  
  // Psicotrópicos y neurológicos
  'antidepressant', 'antidepresivo', 'anxiety', 'ansiedad',
  'sertraline', 'sertralina', 'fluoxetine', 'fluoxetina',
  'escitalopram', 'paroxetine', 'paroxetina', 'venlafaxine',
  'alprazolam', 'clonazepam', 'lorazepam', 'diazepam',
  'zolpidem', 'pregabalin', 'pregabalina', 'gabapentin', 'gabapentina',
  'carbamazepine', 'carbamazepina', 'valproic', 'valproato',
  'lamotrigine', 'lamotrigina', 'lithium', 'litio',
  'olanzapine', 'olanzapina', 'risperidone', 'risperidona',
  'quetiapine', 'quetiapina', 'aripiprazole', 'aripiprazol',
  
  // Hormonales
  'hormone', 'hormona', 'thyroid', 'tiroides', 'levothyroxine', 'levotiroxina',
  'testosterone', 'testosterona', 'estrogen', 'estrogeno',
  'progesterone', 'progesterona', 'prednisone', 'prednisona',
  'dexamethasone', 'dexametasona', 'hydrocortisone', 'hidrocortisona',
  'birth control', 'anticonceptivo', 'contraceptive',
  
  // Gastro
  'omeprazole', 'omeprazol', 'pantoprazole', 'pantoprazol',
  'esomeprazole', 'esomeprazol', 'ranitidine', 'ranitidina',
  'antacid', 'antiacido', 'laxative', 'laxante',
  
  // Alergias y respiratorio
  'antihistamine', 'antihistaminico', 'loratadine', 'loratadina',
  'cetirizine', 'cetirizina', 'fexofenadine', 'fexofenadina',
  'montelukast', 'salbutamol', 'albuterol', 'budesonide',
  'fluticasone', 'fluticasona', 'beclomethasone',
  
  // Oftálmicos y óticos
  'eye drops', 'gotas oftalmicas', 'ophthalmic', 'oftalmico',
  'ear drops', 'gotas oticas', 'otic', 'otico',
  
  // Dermatológicos médicos
  'tretinoin', 'tretinoina', 'adapalene', 'clotrimazole', 'clotrimazol',
  'ketoconazole', 'ketoconazol', 'fluconazole', 'fluconazol',
  'terbinafine', 'terbinafina', 'antifungal', 'antifungico',
  
  // Suplementos controlados
  'controlled substance', 'sustancia controlada', 'narcotic', 'narcotico',
  'opioid', 'opioide', 'benzodiazepine', 'benzodiazepina',
  'stimulant', 'estimulante', 'sedative', 'sedante',
  
  // Equipos médicos que requieren registro
  'syringe', 'jeringa', 'needle', 'aguja', 'catheter', 'cateter',
  'lancet', 'lanceta', 'test strip', 'tira reactiva',
  
  // Genéricos y marcas comunes
  'vitamina', 'vitamin', 'supplement', 'suplemento',
  'health supplement', 'dietary supplement'
];

/**
 * Detecta si un producto es farmacéutico basado en su descripción
 */
export function detectarProductoFarmaceutico(descripcion: string): {
  esFarmaceutico: boolean;
  palabrasDetectadas: string[];
  tipoProducto: string;
} {
  if (!descripcion) {
    return { esFarmaceutico: false, palabrasDetectadas: [], tipoProducto: 'general' };
  }
  
  const descLower = descripcion.toLowerCase();
  const palabrasDetectadas: string[] = [];
  let tipoProducto = 'medicamento_general';
  
  // Buscar cada palabra farmacéutica
  for (const palabra of PALABRAS_FARMACEUTICAS) {
    if (descLower.includes(palabra.toLowerCase())) {
      palabrasDetectadas.push(palabra);
    }
  }
  
  // Determinar tipo específico
  if (palabrasDetectadas.some(p => ['antibiotic', 'antibiotico', 'amoxicillin', 'azithromycin', 'ciprofloxacin', 'penicillin'].includes(p.toLowerCase()))) {
    tipoProducto = 'antibiotico';
  } else if (palabrasDetectadas.some(p => ['alprazolam', 'clonazepam', 'diazepam', 'lorazepam', 'zolpidem'].includes(p.toLowerCase()))) {
    tipoProducto = 'psicotropico_controlado';
  } else if (palabrasDetectadas.some(p => ['tramadol', 'codeine', 'morphine', 'oxycodone', 'fentanyl'].includes(p.toLowerCase()))) {
    tipoProducto = 'opioide_controlado';
  } else if (palabrasDetectadas.some(p => ['insulin', 'insulina', 'metformin', 'diabetes'].includes(p.toLowerCase()))) {
    tipoProducto = 'antidiabetico';
  } else if (palabrasDetectadas.some(p => ['blood pressure', 'cardiovascular', 'lisinopril', 'losartan'].includes(p.toLowerCase()))) {
    tipoProducto = 'cardiovascular';
  } else if (palabrasDetectadas.some(p => ['hormone', 'hormona', 'thyroid', 'testosterone'].includes(p.toLowerCase()))) {
    tipoProducto = 'hormonal';
  } else if (palabrasDetectadas.some(p => ['syringe', 'jeringa', 'needle', 'catheter'].includes(p.toLowerCase()))) {
    tipoProducto = 'dispositivo_medico';
  }
  
  return {
    esFarmaceutico: palabrasDetectadas.length > 0,
    palabrasDetectadas: [...new Set(palabrasDetectadas)],
    tipoProducto
  };
}

/**
 * Extrae productos farmacéuticos de un manifiesto
 */
export function extraerProductosFarmaceuticos(
  paquetes: ManifestRow[],
  liquidaciones: Liquidacion[]
): ProductoFarmaceutico[] {
  
  const liquidacionesMap = new Map<string, Liquidacion>();
  liquidaciones.forEach(liq => {
    liquidacionesMap.set(liq.numeroGuia, liq);
  });
  
  const productosFarma: ProductoFarmaceutico[] = [];
  
  paquetes.forEach((paq, idx) => {
    const deteccion = detectarProductoFarmaceutico(paq.description || '');
    
    if (deteccion.esFarmaceutico) {
      const liq = liquidacionesMap.get(paq.trackingNumber);
      
      productosFarma.push({
        numeroFila: idx + 1,
        guiaAerea: paq.trackingNumber || '',
        guiaAmazon: (paq as any).guiaAmazon || (paq as any).amazonTracking || '',
        guiaLocal: (paq as any).guiaLocal || (paq as any).localTracking || '',
        
        // Consignatario
        consignatario: paq.recipient || '',
        identificacion: paq.identification || '',
        telefono: paq.phone || '',
        email: (paq as any).email || '',
        
        // Ubicación
        provincia: paq.province || paq.detectedProvince || '',
        ciudad: paq.city || paq.detectedCity || '',
        distrito: paq.district || paq.detectedDistrict || '',
        direccion: paq.address || '',
        codigoPostal: (paq as any).codigoPostal || '',
        
        // Paquete
        descripcionCompleta: paq.description || '',
        descripcionArancel: (paq as any).descripcionArancel || '',
        codigoArancelario: (paq as any).codigoArancelario || liq?.hsCode || '',
        cantidad: (paq as any).cantidad || 1,
        peso: paq.weight || 0,
        valorUSD: paq.valueUSD || 0,
        flete: (paq as any).flete || 0,
        valorCIF: liq?.valorCIF || paq.valueUSD || 0,
        
        // Clasificación
        categoriaAduanera: liq?.categoriaAduanera || 'N/A',
        tipoProducto: deteccion.tipoProducto,
        palabrasClave: deteccion.palabrasDetectadas,
        
        // Tributos
        totalTributos: liq?.totalTributos || 0,
        totalAPagar: liq?.totalAPagar || 0,
        
        // Control
        requierePermisoMINSA: true,
        autoridad: 'MINSA - Ministerio de Salud',
        observaciones: generarObservacion(deteccion.tipoProducto)
      });
    }
  });
  
  return productosFarma;
}

function generarObservacion(tipoProducto: string): string {
  const observaciones: Record<string, string> = {
    'psicotropico_controlado': '⚠️ SUSTANCIA CONTROLADA - Requiere receta médica y permiso especial MINSA',
    'opioide_controlado': '🔴 OPIOIDE CONTROLADO - Requiere autorización especial y documentación estricta',
    'antibiotico': 'Requiere verificación de registro sanitario vigente',
    'antidiabetico': 'Verificar si requiere cadena de frío (insulinas)',
    'cardiovascular': 'Medicamento de uso continuo - verificar cantidad autorizada',
    'hormonal': 'Requiere prescripción médica',
    'dispositivo_medico': 'Requiere registro sanitario de dispositivo médico',
    'medicamento_general': 'Verificar registro sanitario en Panamá'
  };
  
  return observaciones[tipoProducto] || 'Requiere verificación MINSA';
}

/**
 * Genera reporte Excel de productos farmacéuticos
 */
export async function generarReporteFarmaceuticos(
  paquetes: ManifestRow[],
  liquidaciones: Liquidacion[],
  mawb: string = 'SIN_MAWB'
): Promise<Blob> {
  
  const productosFarma = extraerProductosFarmaceuticos(paquetes, liquidaciones);
  const wb = XLSX.utils.book_new();
  
  // ═══════════════════════════════════════════════════════
  // HOJA 1: RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════
  
  const totalValor = productosFarma.reduce((s, p) => s + p.valorUSD, 0);
  const totalPeso = productosFarma.reduce((s, p) => s + p.peso, 0);
  const totalTributos = productosFarma.reduce((s, p) => s + p.totalTributos, 0);
  
  // Contar por tipo
  const porTipo: Record<string, number> = {};
  productosFarma.forEach(p => {
    porTipo[p.tipoProducto] = (porTipo[p.tipoProducto] || 0) + 1;
  });
  
  const resumen = [
    ['═══════════════════════════════════════════════════════'],
    ['REPORTE DE PRODUCTOS FARMACÉUTICOS - PERMISO MINSA'],
    ['═══════════════════════════════════════════════════════'],
    [''],
    ['INFORMACIÓN DEL MANIFIESTO'],
    ['MAWB:', mawb],
    ['Fecha de generación:', new Date().toLocaleString('es-PA')],
    ['Total de paquetes analizados:', paquetes.length],
    [''],
    ['═══════════════════════════════════════════════════════'],
    ['RESUMEN DE PRODUCTOS FARMACÉUTICOS'],
    ['═══════════════════════════════════════════════════════'],
    [''],
    ['Total productos farmacéuticos detectados:', productosFarma.length],
    ['Porcentaje del manifiesto:', `${((productosFarma.length / paquetes.length) * 100).toFixed(1)}%`],
    [''],
    ['Valor total USD:', `$${totalValor.toFixed(2)}`],
    ['Peso total (LB):', totalPeso.toFixed(2)],
    ['Total tributos estimados:', `$${totalTributos.toFixed(2)}`],
    [''],
    ['═══════════════════════════════════════════════════════'],
    ['DISTRIBUCIÓN POR TIPO DE PRODUCTO'],
    ['═══════════════════════════════════════════════════════'],
    ['']
  ];
  
  Object.entries(porTipo).forEach(([tipo, cantidad]) => {
    resumen.push([formatearTipoProducto(tipo) + ':', String(cantidad)]);
  });
  
  resumen.push(['']);
  resumen.push(['═══════════════════════════════════════════════════════']);
  resumen.push(['REQUISITOS REGULATORIOS - AUTORIDAD NACIONAL DE ADUANAS']);
  resumen.push(['═══════════════════════════════════════════════════════']);
  resumen.push(['']);
  resumen.push(['1. Todos los medicamentos requieren Registro Sanitario vigente']);
  resumen.push(['2. Sustancias controladas requieren permiso especial MINSA']);
  resumen.push(['3. Cantidad máxima para uso personal: 3 meses de tratamiento']);
  resumen.push(['4. Documentación requerida: Receta médica (si aplica)']);
  resumen.push(['5. Insulinas y biológicos pueden requerir cadena de frío']);
  
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 50 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen MINSA');
  
  // ═══════════════════════════════════════════════════════
  // HOJA 2: DETALLE COMPLETO
  // ═══════════════════════════════════════════════════════
  
  const headers = [
    '#',
    'Guía Aérea (AWB)',
    'Guía Amazon',
    'Guía Local',
    'Consignatario',
    'Identificación (DNI)',
    'Teléfono',
    'Email',
    'Provincia',
    'Ciudad',
    'Distrito',
    'Dirección Completa',
    'Código Postal',
    'Descripción del Paquete',
    'Descripción Arancelaria',
    'Código Arancelario (HTS)',
    'Cantidad',
    'Peso (LB)',
    'Valor USD',
    'Flete',
    'Valor CIF',
    'Categoría Aduanera',
    'Tipo de Producto',
    'Palabras Clave Detectadas',
    'Total Tributos',
    'Total a Pagar',
    'Autoridad',
    'Observaciones'
  ];
  
  const wsData: any[][] = [headers];
  
  productosFarma.forEach(p => {
    wsData.push([
      p.numeroFila,
      p.guiaAerea,
      p.guiaAmazon,
      p.guiaLocal,
      p.consignatario,
      p.identificacion,
      p.telefono,
      p.email,
      p.provincia,
      p.ciudad,
      p.distrito,
      p.direccion,
      p.codigoPostal,
      p.descripcionCompleta,
      p.descripcionArancel,
      p.codigoArancelario,
      p.cantidad,
      p.peso.toFixed(2),
      `$${p.valorUSD.toFixed(2)}`,
      `$${p.flete.toFixed(2)}`,
      `$${p.valorCIF.toFixed(2)}`,
      p.categoriaAduanera,
      formatearTipoProducto(p.tipoProducto),
      p.palabrasClave.join(', '),
      `$${p.totalTributos.toFixed(2)}`,
      `$${p.totalAPagar.toFixed(2)}`,
      p.autoridad,
      p.observaciones
    ]);
  });
  
  // Fila de totales
  wsData.push([]);
  wsData.push([
    'TOTALES', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    productosFarma.reduce((s, p) => s + p.cantidad, 0),
    totalPeso.toFixed(2),
    `$${totalValor.toFixed(2)}`,
    `$${productosFarma.reduce((s, p) => s + p.flete, 0).toFixed(2)}`,
    `$${productosFarma.reduce((s, p) => s + p.valorCIF, 0).toFixed(2)}`,
    '', '', '',
    `$${totalTributos.toFixed(2)}`,
    `$${productosFarma.reduce((s, p) => s + p.totalAPagar, 0).toFixed(2)}`,
    '', ''
  ]);
  
  const wsDetalle = XLSX.utils.aoa_to_sheet(wsData);
  
  // Ajustar anchos de columna
  wsDetalle['!cols'] = [
    { wch: 5 },   // #
    { wch: 18 },  // AWB
    { wch: 18 },  // Amazon
    { wch: 15 },  // Local
    { wch: 25 },  // Consignatario
    { wch: 15 },  // DNI
    { wch: 15 },  // Teléfono
    { wch: 25 },  // Email
    { wch: 15 },  // Provincia
    { wch: 15 },  // Ciudad
    { wch: 15 },  // Distrito
    { wch: 40 },  // Dirección
    { wch: 10 },  // CP
    { wch: 50 },  // Descripción
    { wch: 30 },  // Desc. Arancel
    { wch: 15 },  // HTS
    { wch: 8 },   // Cantidad
    { wch: 10 },  // Peso
    { wch: 12 },  // Valor
    { wch: 10 },  // Flete
    { wch: 12 },  // CIF
    { wch: 12 },  // Cat. Aduanera
    { wch: 20 },  // Tipo
    { wch: 30 },  // Keywords
    { wch: 12 },  // Tributos
    { wch: 12 },  // Total
    { wch: 25 },  // Autoridad
    { wch: 50 }   // Observaciones
  ];
  
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Farmacéuticos');
  
  // ═══════════════════════════════════════════════════════
  // HOJA 3: SUSTANCIAS CONTROLADAS
  // ═══════════════════════════════════════════════════════
  
  const controlados = productosFarma.filter(p => 
    p.tipoProducto === 'psicotropico_controlado' || 
    p.tipoProducto === 'opioide_controlado'
  );
  
  if (controlados.length > 0) {
    const wsControlados = [
      ['⚠️ ALERTA: SUSTANCIAS CONTROLADAS DETECTADAS'],
      [''],
      ['Estos productos requieren documentación especial y aprobación MINSA'],
      [''],
      ['#', 'Guía', 'Consignatario', 'DNI', 'Teléfono', 'Descripción', 'Tipo', 'Valor', 'Observaciones']
    ];
    
    controlados.forEach((p, idx) => {
      wsControlados.push([
        idx + 1,
        p.guiaAerea,
        p.consignatario,
        p.identificacion,
        p.telefono,
        p.descripcionCompleta,
        formatearTipoProducto(p.tipoProducto),
        `$${p.valorUSD.toFixed(2)}`,
        p.observaciones
      ]);
    });
    
    const wsCtrl = XLSX.utils.aoa_to_sheet(wsControlados);
    XLSX.utils.book_append_sheet(wb, wsCtrl, '⚠️ Controlados');
  }
  
  // ═══════════════════════════════════════════════════════
  // HOJA 4: POR CONSIGNATARIO
  // ═══════════════════════════════════════════════════════
  
  const porConsignatario = new Map<string, ProductoFarmaceutico[]>();
  productosFarma.forEach(p => {
    const key = p.consignatario || 'SIN_NOMBRE';
    if (!porConsignatario.has(key)) {
      porConsignatario.set(key, []);
    }
    porConsignatario.get(key)!.push(p);
  });
  
  const wsConsignatarios = [
    ['PRODUCTOS FARMACÉUTICOS POR CONSIGNATARIO'],
    [''],
    ['Consignatario', 'DNI', 'Teléfono', 'Email', 'Dirección', 'Cantidad Paquetes', 'Valor Total', 'Productos']
  ];
  
  porConsignatario.forEach((productos, consignatario) => {
    const primerProducto = productos[0];
    const valorTotal = productos.reduce((s, p) => s + p.valorUSD, 0);
    const descripciones = productos.map(p => p.descripcionCompleta.substring(0, 30)).join(' | ');
    
    wsConsignatarios.push([
      consignatario,
      primerProducto.identificacion,
      primerProducto.telefono,
      primerProducto.email,
      `${primerProducto.ciudad}, ${primerProducto.direccion}`,
      String(productos.length),
      `$${valorTotal.toFixed(2)}`,
      descripciones
    ]);
  });
  
  const wsCons = XLSX.utils.aoa_to_sheet(wsConsignatarios);
  wsCons['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
    { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCons, 'Por Consignatario');
  
  // ═══════════════════════════════════════════════════════
  // GENERAR ARCHIVO
  // ═══════════════════════════════════════════════════════
  
  const buffer = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true
  });
  
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function formatearTipoProducto(tipo: string): string {
  const nombres: Record<string, string> = {
    'medicamento_general': 'Medicamento General',
    'antibiotico': 'Antibiótico',
    'psicotropico_controlado': '⚠️ Psicotrópico Controlado',
    'opioide_controlado': '🔴 Opioide Controlado',
    'antidiabetico': 'Antidiabético',
    'cardiovascular': 'Cardiovascular',
    'hormonal': 'Hormonal',
    'dispositivo_medico': 'Dispositivo Médico'
  };
  return nombres[tipo] || tipo;
}

/**
 * Descarga el reporte de farmacéuticos
 */
export async function descargarReporteFarmaceuticos(
  paquetes: ManifestRow[],
  liquidaciones: Liquidacion[],
  mawb: string = 'SIN_MAWB'
): Promise<void> {
  
  const blob = await generarReporteFarmaceuticos(paquetes, liquidaciones, mawb);
  const fechaHoy = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Reporte_Farmaceuticos_MINSA_${mawb}_${fechaHoy}.xlsx`;
  
  saveAs(blob, nombreArchivo);
}

export default {
  detectarProductoFarmaceutico,
  extraerProductosFarmaceuticos,
  generarReporteFarmaceuticos,
  descargarReporteFarmaceuticos
};
      primerProducto.email,
      `${primerProducto.ciudad}, ${primerProducto.direccion}`,
      productos.length,
      `$${valorTotal.toFixed(2)}`,
      descripciones
    ]);
  });
  
  const wsCons = XLSX.utils.aoa_to_sheet(wsConsignatarios);
  wsCons['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
    { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCons, 'Por Consignatario');
  
  // ═══════════════════════════════════════════════════════
  // GENERAR ARCHIVO
  // ═══════════════════════════════════════════════════════
  
  const buffer = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true
  });
  
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function formatearTipoProducto(tipo: string): string {
  const nombres: Record<string, string> = {
    'medicamento_general': 'Medicamento General',
    'antibiotico': 'Antibiótico',
    'psicotropico_controlado': '⚠️ Psicotrópico Controlado',
    'opioide_controlado': '🔴 Opioide Controlado',
    'antidiabetico': 'Antidiabético',
    'cardiovascular': 'Cardiovascular',
    'hormonal': 'Hormonal',
    'dispositivo_medico': 'Dispositivo Médico'
  };
  return nombres[tipo] || tipo;
}

/**
 * Descarga el reporte de farmacéuticos
 */
export async function descargarReporteFarmaceuticos(
  paquetes: ManifestRow[],
  liquidaciones: Liquidacion[],
  mawb: string = 'SIN_MAWB'
): Promise<void> {
  
  const blob = await generarReporteFarmaceuticos(paquetes, liquidaciones, mawb);
  const fechaHoy = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Reporte_Farmaceuticos_MINSA_${mawb}_${fechaHoy}.xlsx`;
  
  saveAs(blob, nombreArchivo);
}

export default {
  detectarProductoFarmaceutico,
  extraerProductosFarmaceuticos,
  generarReporteFarmaceuticos,
  descargarReporteFarmaceuticos
};
