import * as XLSX from 'xlsx';

/**
 * ANALIZADOR MAESTRO DE MANIFIESTOS
 * Procesa cualquier formato de manifiesto aéreo automáticamente
 */

interface ColumnaDetectada {
  nombreOriginal: string;
  tipo: TipoColumna;
  confianza: number;
  indice: number;
}

export type TipoColumna = 
  | 'mawb'                    // Master Air Waybill
  | 'awb'                     // Air Waybill (AWB)
  | 'localTracking'           // LOCAL TRACKING PROVIDER
  | 'consignatario'           // MERCHANT CS NAME
  | 'direccion'               // CONSIGNEE ADDRESS
  | 'ciudad'                  // CITY
  | 'descripcion'             // DESCRIPTION
  | 'descripcionArancel'      // DESCRIPCION CODIGO ARANCEL
  | 'peso'                    // WEIGHT
  | 'valor'                   // VALUE
  | 'cantidad'                // QUANTITY
  | 'flete'                   // FREIGHT
  | 'tipoDoc'                 // Tipo DOC
  | 'dni'                     // DNI
  | 'email'                   // EMAIL
  | 'telefono'                // PHONE
  | 'numeroInterno'           // INTERNAL NUMBER
  | 'codigoArancelario'       // CODIGO ARANCELARIO
  | 'consolidado'             // CONSOLIDADO
  | 'codigoPostal'            // CODIGO POSTAL DESTINATARIO
  | 'desconocido';

export interface ResultadoAnalisis {
  mawb: string | null;
  aerolinea: string | null;
  prefijoIATA: string | null;
  columnas: Map<TipoColumna, ColumnaDetectada>;
  totalFilas: number;
  formatoValido: boolean;
  advertencias: string[];
  confianzaGeneral: number;
  datos: Record<string, unknown>[];
  columnasOriginales: string[];
}

/**
 * PATRONES IATA DE AEROLÍNEAS
 * Base de datos de prefijos IATA oficiales
 */
const PREFIJOS_IATA: Record<string, { nombre: string; codigo: string }> = {
  '001': { nombre: 'American Airlines', codigo: 'AA' },
  '016': { nombre: 'United Airlines', codigo: 'UA' },
  '020': { nombre: 'Lufthansa', codigo: 'LH' },
  '074': { nombre: 'KLM', codigo: 'KL' },
  '125': { nombre: 'British Airways', codigo: 'BA' },
  '172': { nombre: 'Copa Airlines', codigo: 'CM' },
  '180': { nombre: 'Korean Air', codigo: 'KE' },
  '205': { nombre: 'Avianca', codigo: 'AV' },
  '230': { nombre: 'Avianca Cargo', codigo: 'AV' },
  '406': { nombre: 'FedEx', codigo: 'FX' },
  '410': { nombre: 'UPS', codigo: '5X' },
  '427': { nombre: 'DHL', codigo: 'DH' },
  '876': { nombre: 'Amazon Prime Air', codigo: '3A' },
  '157': { nombre: 'Qatar Airways', codigo: 'QR' },
  '618': { nombre: 'Emirates', codigo: 'EK' }
  // NOTA: 906 (Skynet) usa AWB como guía individual, no requiere detección MAWB
};

/**
 * DICCIONARIO DE DETECCIÓN DE COLUMNAS
 * Más de 500 variaciones posibles
 */
const PATRONES_DETECCION: Record<TipoColumna, string[]> = {
  mawb: [
    // EXACTO primero
    'mawb', 'master', 'master awb', 'master air waybill', 'master airway bill',
    'awb master', 'air waybill master', 'guia master', 'guía master',
    'numero master', 'número master', 'master number', 'master no', 'master#', 'mawb#',
    'mstr', 'mastr', 'm.a.w.b', 'maw',
    // Variaciones adicionales
    'master waybill', 'main awb', 'principal awb', 'awb principal',
    'guia maestra', 'guía maestra', 'no. master', 'numero mawb', 'número mawb',
    'master bill', 'bill master', 'm awb', 'm-awb', 'mawb no', 'mawb number'
  ],
  
  awb: [
    // EXACTO primero
    'awb', 'air waybill', 'airway bill', 'awb number',
    'house awb', 'house air waybill', 'hawb',
    'guia aerea', 'guía aérea', 'numero guia', 'número guía',
    'guide', 'guide number', 'awb#', 'hawb#',
    // Variaciones adicionales
    'house', 'house bill', 'h-awb', 'hawb no', 'hawb number',
    'guia hija', 'guía hija', 'waybill', 'air bill', 'conocimiento aereo',
    'conocimiento aéreo', 'guia de carga', 'guía de carga', 'numero hawb',
    'número hawb', 'awb no', 'bill no', 'bill number', 'no. guia', 'no. guía'
  ],
  
  localTracking: [
    // EXACTO primero
    'local tracking provider', 'local_tracking_provider', 'localtrackingprovider',
    'local tracking', 'local_tracking',
    'amazon tracking', 'amazon shipment', 'amazon id', 'shipment id',
    'tracking', 'tracking number', 'track', 'track#',
    'guia', 'guía', 'numero guia', 'número guía', 'tracking id', 'package id', 'tracking#',
    // Variaciones adicionales
    'amz', 'amz tracking', 'amazon', 'amazon number', 'amazon order',
    'package tracking', 'shipment tracking', 'carrier tracking', 'carrier id',
    'local id', 'local number', 'domestic tracking', 'paquete', 'numero paquete',
    'número paquete', 'id paquete', 'order id', 'order number', 'pedido',
    'numero pedido', 'número pedido', 'tracking local', 'rastreo', 'numero rastreo',
    'tba', 'sp', 'ups tracking', 'fedex tracking', 'dhl tracking', 'usps tracking',
    '1z', 'tracking no', 'seguimiento', 'numero seguimiento', 'número seguimiento'
  ],
  
  consignatario: [
    // EXACTO primero
    'merchant cs name', 'merchant_cs_name', 'merchantcsname',
    'merchant name', 'merchant', 'consignee', 'consignee name',
    'consignatario', 'destinatario', 'recipient', 'receiver', 'recipient name',
    'customer', 'customer name', 'nombre', 'name', 'full name', 'nombre completo',
    'addressee', 'ship to', 'shipto', 'deliver to', 'deliverto',
    // Variaciones adicionales
    'buyer', 'comprador', 'cliente', 'client', 'receiver name', 'beneficiary',
    'beneficiario', 'ship to name', 'deliver to name', 'importador', 'importer',
    'final recipient', 'destinatario final', 'nombre destinatario', 'nombre cliente',
    'nombre consignatario', 'contact name', 'nombre contacto', 'cuenta', 'account name',
    'consign', 'cnee', 'cnee name', 'consignee full name', 'persona', 'person'
  ],
  
  direccion: [
    // EXACTO primero
    'consignee address', 'consignee_address', 'consigneeaddress',
    'address', 'direccion', 'dirección', 'delivery address', 'shipping address',
    'recipient address', 'street', 'calle', 'domicilio', 'ubicacion', 'ubicación',
    'location', 'ship to address', 'deliver to address', 'destination address',
    // Variaciones adicionales
    'address line', 'address1', 'address 1', 'linea direccion', 'línea dirección',
    'street address', 'direccion entrega', 'dirección entrega', 'direccion envio',
    'dirección envío', 'direccion completa', 'dirección completa', 'full address',
    'addr', 'residential address', 'home address', 'delivery addr', 'ship addr',
    'destino', 'destination', 'lugar entrega', 'punto entrega', 'address2', 'address 2',
    'direccion 1', 'direccion 2', 'dir', 'dir.', 'direccion destino', 'dirección destino'
  ],
  
  ciudad: [
    // EXACTO primero
    'city', 'ciudad', 'town', 'municipality', 'municipio',
    'delivery city', 'ship to city',
    // Variaciones adicionales
    'localidad', 'locality', 'poblacion', 'población', 'villa', 'distrito', 'district',
    'city name', 'nombre ciudad', 'destination city', 'ciudad destino', 'ciudad entrega',
    'canton', 'cantón', 'corregimiento', 'provincia', 'province', 'state', 'estado',
    'region', 'región', 'departamento', 'dept', 'zona', 'zone', 'area', 'área'
  ],
  
  descripcion: [
    // EXACTO primero
    'description', 'descripcion', 'descripción', 'desc',
    'product', 'producto', 'item', 'articulo', 'artículo',
    'merchandise', 'mercancia', 'mercancía', 'goods', 'commodity',
    'content', 'contenido', 'product description', 'item description',
    'cargo description', 'nature of goods', 'commodity description',
    // Variaciones adicionales
    'product name', 'nombre producto', 'item name', 'nombre articulo', 'nombre artículo',
    'goods description', 'descripcion mercancia', 'descripción mercancía',
    'what', 'que contiene', 'qué contiene', 'detalle', 'detail', 'details',
    'descripcion producto', 'descripción producto', 'cargo', 'load', 'carga',
    'shipment contents', 'contenido envio', 'contenido envío', 'package contents',
    'contenido paquete', 'material', 'item desc', 'prod desc', 'mercaderia', 'mercadería'
  ],
  
  descripcionArancel: [
    // EXACTO primero
    'descripcion codigo arancel', 'descripcion_codigo_arancel',
    'descripcioncodigoarancel', 'descripción código arancel',
    'descripcion arancel', 'arancel descripcion',
    'tariff description', 'hs description', 'hts description',
    // Variaciones adicionales
    'hts desc', 'hs desc', 'tariff desc', 'descripcion hs', 'descripción hs',
    'descripcion hts', 'descripción hts', 'codigo arancel desc', 'código arancel desc',
    'arancel desc', 'customs description', 'descripcion aduanera', 'descripción aduanera'
  ],
  
  peso: [
    // EXACTO primero
    'weight', 'peso', 'gross weight', 'peso bruto', 'net weight', 'peso neto',
    'wt', 'kg', 'kilogramos', 'lb', 'lbs', 'libras', 'pounds',
    'weight kg', 'weight lb', 'peso kg', 'peso lb',
    // Variaciones adicionales
    'gross wt', 'net wt', 'gw', 'nw', 'weight in kg', 'weight in lbs',
    'peso en kg', 'peso en libras', 'kilos', 'kilogrammes', 'chargeable weight',
    'peso cobrable', 'actual weight', 'peso real', 'peso actual', 'dimensional weight',
    'peso dimensional', 'vol weight', 'peso volumetrico', 'peso volumétrico',
    'total weight', 'peso total', 'package weight', 'peso paquete', 'item weight'
  ],
  
  valor: [
    // EXACTO primero
    'value', 'valor', 'declared value', 'valor declarado',
    'customs value', 'valor aduanero', 'cif', 'cif value',
    'price', 'precio', 'amount', 'monto', 'total',
    'invoice value', 'valor factura', 'usd', 'value usd',
    // Variaciones adicionales
    'fob', 'fob value', 'valor fob', 'item value', 'valor item', 'valor artículo',
    'unit price', 'precio unitario', 'total value', 'valor total', 'package value',
    'valor paquete', 'goods value', 'valor mercancia', 'valor mercancía',
    'commercial value', 'valor comercial', 'insured value', 'valor asegurado',
    'assessed value', 'declared amount', 'monto declarado', 'cost', 'costo',
    'value$', 'valor$', 'usd value', 'valor usd', 'dollar value', 'valor dolares',
    'valor dólares', 'importvalue', 'import value', 'valor importacion', 'valor importación'
  ],
  
  cantidad: [
    // EXACTO primero
    'quantity', 'cantidad', 'qty', 'pieces', 'piezas', 'pcs',
    'units', 'unidades', 'count', 'number of pieces',
    // Variaciones adicionales
    'no of pieces', 'num pieces', 'cantidad piezas', 'total pieces', 'total piezas',
    'items', 'items count', 'item count', 'numero unidades', 'número unidades',
    'no. pcs', 'no pcs', 'pcs count', 'piece count', 'cantidades', 'quantities',
    'pkg qty', 'package quantity', 'cantidad paquetes', 'bultos', 'packages'
  ],
  
  flete: [
    // EXACTO primero
    'freight', 'flete', 'shipping cost', 'costo envio', 'costo envío',
    'shipping', 'envio', 'envío', 'freight cost', 'freight charge',
    // Variaciones adicionales
    'shipping fee', 'tarifa envio', 'tarifa envío', 'delivery cost', 'costo entrega',
    'transport cost', 'costo transporte', 'freight amount', 'monto flete',
    'shipping amount', 'monto envio', 'monto envío', 'carrier charge', 'cargo transporte',
    'freight$', 'flete$', 'delivery fee', 'handling', 'handling fee', 'manejo'
  ],
  
  tipoDoc: [
    // EXACTO primero
    'tipo doc', 'tipo_doc', 'tipodoc', 'tipo documento',
    'document type', 'doc type', 'doctype',
    // Variaciones adicionales
    'tipo id', 'tipo identificacion', 'tipo identificación', 'id type',
    'identification type', 'type of id', 'tipo de documento', 'document kind',
    'clase documento', 'tipo cedula', 'tipo cédula'
  ],
  
  dni: [
    // EXACTO primero
    'dni', 'cedula', 'cédula', 'id', 'identification',
    'numero documento', 'número documento', 'documento',
    'passport', 'pasaporte', 'ruc', 'nit', 'ci', 'c.i.',
    // Variaciones adicionales
    'documento identidad', 'id number', 'numero id', 'número id', 'tax id',
    'identificacion fiscal', 'identificación fiscal', 'personal id', 'id personal',
    'cedula identidad', 'cédula identidad', 'national id', 'id nacional',
    'ssn', 'social security', 'cpf', 'curp', 'rfc', 'cuil', 'cuit',
    'numero identificacion', 'número identificación', 'id#', 'cedula#', 'cédula#'
  ],
  
  email: [
    // EXACTO primero
    'email', 'e-mail', 'correo', 'correo electronico', 'correo electrónico',
    'mail', 'electronic mail', 'email address',
    // Variaciones adicionales
    'e mail', 'emailaddress', 'email_address', 'direccion email', 'dirección email',
    'contact email', 'customer email', 'correo cliente', 'correo contacto',
    'electronic address', 'direccion electronica', 'dirección electrónica',
    'mail address', 'direccion correo', 'dirección correo'
  ],
  
  telefono: [
    // EXACTO primero
    'phone', 'telefono', 'teléfono', 'tel', 'telephone',
    'mobile', 'movil', 'móvil', 'celular', 'cell',
    'contact phone', 'phone number',
    // Variaciones adicionales
    'phone no', 'phone#', 'tel#', 'numero telefono', 'número teléfono',
    'numero celular', 'número celular', 'numero movil', 'número móvil',
    'cell phone', 'mobile phone', 'contact number', 'numero contacto', 'número contacto',
    'telephone number', 'fono', 'tel no', 'tel.', 'ph', 'ph#', 'ph no',
    'customer phone', 'telefono cliente', 'teléfono cliente', 'whatsapp'
  ],
  
  numeroInterno: [
    // EXACTO primero
    'internal number', 'internal_number', 'internalnumber',
    'numero interno', 'número interno', 'numero_interno',
    'ref', 'reference', 'referencia', 'internal ref',
    // Variaciones adicionales
    'ref no', 'ref#', 'reference number', 'numero referencia', 'número referencia',
    'internal id', 'id interno', 'interno', 'internal', 'ref number',
    'our ref', 'nuestra ref', 'your ref', 'su ref', 'order ref', 'ref orden'
  ],
  
  codigoArancelario: [
    // EXACTO primero
    'codigo arancelario', 'código arancelario', 'codigo_arancelario',
    'codigoarancelario', 'hs code', 'hts code', 'tariff code',
    'arancel', 'codigo aduanero', 'código aduanero',
    'harmonized code', 'customs code',
    // Variaciones adicionales
    'hs', 'hts', 'tariff', 'tarifa arancelaria', 'partida arancelaria',
    'partida', 'fraccion arancelaria', 'fracción arancelaria', 'fraccion', 'fracción',
    'commodity code', 'schedule b', 'schedule b code', 'taric', 'taric code',
    'ncm', 'ncm code', 'codigo ncm', 'código ncm', 'hs number', 'hts number',
    'arancel codigo', 'arancel código', 'cod arancel', 'cód arancel'
  ],
  
  consolidado: [
    // EXACTO primero
    'consolidado', 'consolidated', 'consol', 'consolidation',
    'master consolidado', 'consolidation number',
    // Variaciones adicionales
    'consol no', 'consol#', 'consolidation no', 'consolidation#',
    'numero consolidado', 'número consolidado', 'consol id', 'consolidation id',
    'master consol', 'consolidacion', 'consolidación'
  ],
  
  codigoPostal: [
    // EXACTO primero
    'codigo postal destinatario', 'código postal destinatario',
    'codigo_postal_destinatario', 'codigopostaldestinatario',
    'codigo postal', 'código postal', 'postal code', 'zip code',
    'zip', 'postcode', 'cp',
    // Variaciones adicionales
    'zipcode', 'zip_code', 'postal', 'codigo_postal', 'cod postal', 'cód postal',
    'post code', 'postal number', 'numero postal', 'número postal',
    'destination zip', 'zip destino', 'delivery zip', 'shipping zip',
    'postal code destinatario', 'c.p.', 'c.p', 'cod. postal', 'cód. postal'
  ],
  
  desconocido: []
};

export class AnalizadorManifiesto {
  
  /**
   * ═══════════════════════════════════════════════════════════
   * FUNCIÓN PRINCIPAL: Analiza archivo Excel completo
   * ═══════════════════════════════════════════════════════════
   */
  static async analizarArchivo(arrayBuffer: ArrayBuffer): Promise<ResultadoAnalisis> {
    
    console.log('🔍 INICIANDO ANÁLISIS INTELIGENTE DEL MANIFIESTO');
    console.log('═'.repeat(70));
    
    // 1. Leer Excel
    const workbook = XLSX.read(arrayBuffer, { cellFormula: false });
    const primeraHoja = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeraHoja];
    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    if (jsonData.length === 0) {
      throw new Error('❌ El archivo Excel está vacío');
    }
    
    console.log(`📊 Total de filas: ${jsonData.length}`);
    
    // 2. Obtener nombres de columnas
    const columnasOriginales = Object.keys(jsonData[0]);
    console.log(`📋 Columnas encontradas: ${columnasOriginales.length}`);
    console.log('Columnas:', columnasOriginales);
    
    // 3. Detectar tipo de cada columna
    const columnasDetectadas = this.detectarTiposColumnas(columnasOriginales, jsonData);
    
    // 4. Buscar y validar MAWB
    const mawbInfo = this.buscarMAWB(jsonData, columnasDetectadas);
    
    // 5. Calcular confianza general
    const confianzaGeneral = this.calcularConfianzaGeneral(columnasDetectadas);
    
    // 6. Generar advertencias
    const advertencias = this.generarAdvertencias(columnasDetectadas, mawbInfo);
    
    const resultado: ResultadoAnalisis = {
      mawb: mawbInfo.mawb,
      aerolinea: mawbInfo.aerolinea,
      prefijoIATA: mawbInfo.prefijoIATA,
      columnas: columnasDetectadas,
      totalFilas: jsonData.length,
      formatoValido: mawbInfo.mawb !== null,
      advertencias,
      confianzaGeneral,
      datos: jsonData,
      columnasOriginales
    };
    
    console.log('═'.repeat(70));
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('MAWB:', resultado.mawb);
    console.log('Aerolínea:', resultado.aerolinea);
    console.log('Confianza general:', (confianzaGeneral * 100).toFixed(0) + '%');
    console.log('═'.repeat(70));
    
    return resultado;
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * ANALIZA ARCHIVO DESDE FILE OBJECT
   * ═══════════════════════════════════════════════════════════
   */
  static async analizarDesdeFile(file: File): Promise<ResultadoAnalisis> {
    const arrayBuffer = await file.arrayBuffer();
    return this.analizarArchivo(arrayBuffer);
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * DETECTAR TIPOS DE COLUMNAS
   * ═══════════════════════════════════════════════════════════
   */
  private static detectarTiposColumnas(
    columnasOriginales: string[],
    datos: Record<string, unknown>[]
  ): Map<TipoColumna, ColumnaDetectada> {
    
    console.log('\n🔍 DETECTANDO TIPOS DE COLUMNAS...');
    
    const resultados = new Map<TipoColumna, ColumnaDetectada>();
    const columnasUsadas = new Set<number>();
    
    // Prioridad de detección (críticas primero) - según columnas del usuario
    const tiposPrioritarios: TipoColumna[] = [
      'mawb', 'awb', 'localTracking', 'consignatario', 'direccion', 'ciudad',
      'descripcion', 'cantidad', 'peso', 'flete', 'valor', 'tipoDoc', 'dni',
      'email', 'telefono', 'numeroInterno', 'codigoArancelario', 
      'descripcionArancel', 'consolidado', 'codigoPostal'
    ];
    
    for (const tipo of tiposPrioritarios) {
      let mejorCoincidencia: ColumnaDetectada | null = null;
      let mejorScore = 0;
      
      for (let i = 0; i < columnasOriginales.length; i++) {
        if (columnasUsadas.has(i)) continue;
        
        const nombreCol = columnasOriginales[i];
        const score = this.calcularSimilitudColumna(nombreCol, tipo, datos.slice(0, 10), i);
        
        if (score > mejorScore && score >= 0.6) {
          mejorScore = score;
          mejorCoincidencia = {
            nombreOriginal: nombreCol,
            tipo,
            confianza: score,
            indice: i
          };
        }
      }
      
      if (mejorCoincidencia) {
        resultados.set(tipo, mejorCoincidencia);
        columnasUsadas.add(mejorCoincidencia.indice);
        
        console.log(`  ✓ ${tipo.toUpperCase()}: "${mejorCoincidencia.nombreOriginal}" (${(mejorCoincidencia.confianza * 100).toFixed(0)}%)`);
      } else {
        console.log(`  ⚠ ${tipo.toUpperCase()}: No detectado`);
      }
    }
    
    return resultados;
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * CALCULAR SIMILITUD DE COLUMNA
   * ═══════════════════════════════════════════════════════════
   */
  private static calcularSimilitudColumna(
    nombreColumna: string,
    tipoEsperado: TipoColumna,
    muestraDatos: Record<string, unknown>[],
    indiceCol: number
  ): number {
    
    const nombreNorm = this.normalizarTexto(nombreColumna);
    const patrones = PATRONES_DETECCION[tipoEsperado];
    
    let scorePorNombre = 0;
    
    // 1. Coincidencia por nombre de columna
    for (const patron of patrones) {
      const patronNorm = this.normalizarTexto(patron);
      
      if (nombreNorm === patronNorm) {
        scorePorNombre = 1.0;
        break;
      }
      
      if (nombreNorm.includes(patronNorm) || patronNorm.includes(nombreNorm)) {
        scorePorNombre = Math.max(scorePorNombre, 0.9);
      }
      
      const similitud = this.similitudLevenshtein(nombreNorm, patronNorm);
      scorePorNombre = Math.max(scorePorNombre, similitud * 0.8);
    }
    
    // 2. Análisis de contenido (si hay muestra de datos)
    let scorePorContenido = 0;
    if (muestraDatos.length > 0) {
      const columnas = Object.keys(muestraDatos[0]);
      const nombreColumnaActual = columnas[indiceCol];
      scorePorContenido = this.analizarContenidoColumna(
        muestraDatos.map(fila => fila[nombreColumnaActual]),
        tipoEsperado
      );
    }
    
    // Score final (70% nombre, 30% contenido)
    return (scorePorNombre * 0.7) + (scorePorContenido * 0.3);
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * ANALIZAR CONTENIDO DE COLUMNA
   * ═══════════════════════════════════════════════════════════
   */
  private static analizarContenidoColumna(valores: unknown[], tipo: TipoColumna): number {
    
    if (valores.length === 0) return 0;
    
    let coincidencias = 0;
    
    for (const valor of valores) {
      const valorStr = String(valor ?? '').trim();
      if (!valorStr) continue;
      
      switch (tipo) {
        case 'mawb':
          // Formato: XXX-XXXXXXXX (3 dígitos, guion, 8 dígitos)
          if (/^\d{3}-\d{8}$/.test(valorStr)) coincidencias++;
          break;
          
        case 'awb':
        case 'localTracking':
          // Tracking: letras y números, longitud 8-30
          if (/^[A-Z0-9]{8,30}$/i.test(valorStr)) coincidencias++;
          break;
          
        case 'peso':
          // Número con decimales opcional
          if (/^\d+\.?\d*$/.test(valorStr.replace(/[^0-9.]/g, ''))) coincidencias++;
          break;
          
        case 'valor':
          // Número que puede tener símbolos de moneda
          if (/\d/.test(valorStr)) coincidencias++;
          break;
          
        case 'descripcion':
          // Texto largo (>10 caracteres)
          if (valorStr.length > 10) coincidencias++;
          break;
          
        case 'consignatario':
          // Texto que parece nombre (tiene espacios o al menos 5 caracteres)
          if (valorStr.length >= 5 && /[a-zA-Z]/.test(valorStr)) coincidencias++;
          break;
      }
    }
    
    return coincidencias / valores.length;
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * BUSCAR Y VALIDAR MAWB
   * ═══════════════════════════════════════════════════════════
   */
  private static buscarMAWB(
    datos: Record<string, unknown>[],
    columnasDetectadas: Map<TipoColumna, ColumnaDetectada>
  ): { mawb: string | null; aerolinea: string | null; prefijoIATA: string | null } {
    
    console.log('\n✈️ BUSCANDO MASTER AIR WAYBILL (MAWB)...');
    
    // Estrategia 1: Buscar en columna detectada como MAWB
    const colMawb = columnasDetectadas.get('mawb');
    if (colMawb) {
      const valorMawb = String(datos[0][colMawb.nombreOriginal] || '').trim();
      const validacion = this.validarMAWB(valorMawb);
      
      if (validacion.valido) {
        console.log(`  ✓ MAWB encontrado en columna: ${valorMawb}`);
        return validacion;
      }
    }
    
    // Estrategia 2: Buscar en TODAS las columnas (por si el mapeo falló)
    for (const fila of datos.slice(0, 5)) {
      for (const [key, value] of Object.entries(fila)) {
        const valorStr = String(value).trim();
        const validacion = this.validarMAWB(valorStr);
        
        if (validacion.valido) {
          console.log(`  ✓ MAWB encontrado en columna "${key}": ${valorStr}`);
          return validacion;
        }
      }
    }
    
    console.log('  ⚠ No se encontró MAWB válido');
    return { mawb: null, aerolinea: null, prefijoIATA: null };
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * VALIDAR FORMATO MAWB IATA
   * ═══════════════════════════════════════════════════════════
   */
  private static validarMAWB(valor: string): {
    valido: boolean;
    mawb: string | null;
    aerolinea: string | null;
    prefijoIATA: string | null;
  } {
    
    // Formato IATA estándar: XXX-XXXXXXXX
    const regex = /^(\d{3})-(\d{8})$/;
    const match = valor.match(regex);
    
    if (!match) {
      return { valido: false, mawb: null, aerolinea: null, prefijoIATA: null };
    }
    
    const prefijo = match[1];
    const aerolineaInfo = PREFIJOS_IATA[prefijo];
    
    return {
      valido: true,
      mawb: valor,
      aerolinea: aerolineaInfo?.nombre || 'Aerolínea Desconocida',
      prefijoIATA: prefijo
    };
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * OBTENER MAPEO DE COLUMNAS PARA PROCESAMIENTO
   * ═══════════════════════════════════════════════════════════
   */
  static obtenerMapeoColumnas(resultado: ResultadoAnalisis): Record<string, string> {
    const mapeo: Record<string, string> = {};
    
    resultado.columnas.forEach((col, tipo) => {
      mapeo[tipo] = col.nombreOriginal;
    });
    
    return mapeo;
  }
  
  /**
   * ═══════════════════════════════════════════════════════════
   * UTILIDADES
   * ═══════════════════════════════════════════════════════════
   */
  
  private static normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private static similitudLevenshtein(a: string, b: string): number {
    const matriz: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) matriz[i] = [i];
    for (let j = 0; j <= a.length; j++) matriz[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const costo = a[j - 1] === b[i - 1] ? 0 : 1;
        matriz[i][j] = Math.min(
          matriz[i - 1][j] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j - 1] + costo
        );
      }
    }
    
    const distancia = matriz[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return 1 - (distancia / maxLen);
  }
  
  private static calcularConfianzaGeneral(
    columnas: Map<TipoColumna, ColumnaDetectada>
  ): number {
    
    const columnasCriticas: TipoColumna[] = ['awb', 'localTracking', 'descripcion'];
    const columnasImportantes: TipoColumna[] = ['consignatario', 'direccion', 'valor', 'codigoArancelario'];
    
    let puntaje = 0;
    let total = 0;
    
    for (const tipo of columnasCriticas) {
      total += 2;
      const col = columnas.get(tipo);
      if (col) puntaje += col.confianza * 2;
    }
    
    for (const tipo of columnasImportantes) {
      total += 1;
      const col = columnas.get(tipo);
      if (col) puntaje += col.confianza * 1;
    }
    
    return total > 0 ? puntaje / total : 0;
  }
  
  private static generarAdvertencias(
    columnas: Map<TipoColumna, ColumnaDetectada>,
    mawbInfo: { mawb: string | null }
  ): string[] {
    
    const advertencias: string[] = [];
    
    if (!mawbInfo.mawb) {
      advertencias.push('⚠️ No se detectó MAWB en formato IATA estándar');
    }
    
    if (!columnas.has('awb') && !columnas.has('localTracking')) {
      advertencias.push('⚠️ No se detectó columna de AWB o LOCAL TRACKING PROVIDER');
    }
    
    if (!columnas.has('descripcion')) {
      advertencias.push('⚠️ No se detectó columna de descripción de productos');
    }
    
    return advertencias;
  }
}

export { PREFIJOS_IATA };
