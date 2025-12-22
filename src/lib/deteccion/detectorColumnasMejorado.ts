/**
 * DETECTOR AUTOMÁTICO DE COLUMNAS CON FUZZY MATCHING
 * Detecta columnas de Excel sin intervención manual
 * Usa 300+ variaciones de nombres de columnas
 */

import { ColumnMapping } from '@/types/manifest';

// ══════════════════════════════════════════════════════════════
// VARIACIONES DE NOMBRES DE COLUMNAS (300+)
// ══════════════════════════════════════════════════════════════

interface VariacionesColumna {
  campo: keyof ColumnMapping;
  variaciones: string[];
  peso: number; // Prioridad de la columna
}

const VARIACIONES_COLUMNAS: VariacionesColumna[] = [
  // ────────────────────────────────────────────────────────────
  // TRACKING / GUÍA AÉREA (Campo crítico)
  // ────────────────────────────────────────────────────────────
  {
    campo: 'trackingNumber',
    peso: 100,
    variaciones: [
      // Inglés
      'tracking', 'tracking number', 'tracking_number', 'trackingnumber',
      'tracking no', 'tracking#', 'track', 'track no', 'track number',
      'awb', 'air waybill', 'airwaybill', 'air_waybill',
      'hawb', 'house awb', 'house_awb', 'houseawb',
      'waybill', 'way bill', 'way_bill', 'waybill number',
      'shipment', 'shipment number', 'shipment_number', 'shipment no',
      'package id', 'package_id', 'packageid', 'pkg id',
      'parcel', 'parcel number', 'parcel_number', 'parcel no',
      'reference', 'ref', 'ref no', 'reference number', 'ref_no',
      'courier tracking', 'courier_tracking',
      'label', 'label number', 'label_number',
      'barcode', 'bar code', 'bar_code',
      
      // Amazon/E-commerce
      'amazon tracking', 'amazon_tracking', 'amazon id', 'amazon_id',
      'amazon order', 'amazon_order', 'amazon shipment', 'order id',
      'order number', 'order_number', 'orderno', 'order_id',
      'fulfillment id', 'fulfillment_id', 'shipment id', 'shipment_id',
      
      // Couriers internacionales
      'usps tracking', 'usps_tracking', 'usps', 'usps no',
      'fedex tracking', 'fedex_tracking', 'fedex', 'fedex no',
      'ups tracking', 'ups_tracking', 'ups', 'ups no',
      'dhl tracking', 'dhl_tracking', 'dhl', 'dhl no',
      'tnt tracking', 'tnt_tracking', 'tnt', 'aramex',
      
      // Couriers locales Panamá
      'mailbox', 'mail box', 'casillero', 'numero casillero',
      'box number', 'box_number', 'boxnumber', 'locker',
      'apartado', 'apartado postal', 'po box',
      'factura courier', 'numero factura', 'invoice number',
      
      // Español
      'guia', 'guía', 'numero guia', 'número guía', 'numero_guia',
      'guia aerea', 'guía aérea', 'guia_aerea',
      'num guia', 'nro guia', 'no guia', 'n° guia',
      'rastreo', 'numero rastreo', 'número rastreo',
      'seguimiento', 'numero seguimiento', 'número seguimiento',
      'envio', 'envío', 'numero envio', 'número envío',
      'paquete', 'numero paquete', 'número paquete',
      'referencia', 'ref', 'nro ref',
      'etiqueta', 'numero etiqueta', 'número etiqueta',
      'codigo barras', 'código barras', 'codigo_barras'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // NOMBRE DEL CONSIGNATARIO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'recipient',
    peso: 95,
    variaciones: [
      // Inglés
      'consignee', 'consignee name', 'consignee_name', 'consigneename',
      'receiver', 'receiver name', 'receiver_name', 'receivername',
      'recipient', 'recipient name', 'recipient_name', 'recipientname',
      'ship to', 'ship_to', 'shipto', 'ship to name',
      'deliver to', 'deliver_to', 'deliverto', 'deliver name',
      'customer', 'customer name', 'customer_name', 'customername',
      'name', 'full name', 'full_name', 'fullname',
      'buyer', 'buyer name', 'buyer_name', 'buyername',
      'addressee', 'addressee name',
      'contact', 'contact name', 'contact_name',
      'person', 'person name',
      'attn', 'attention', 'care of', 'c/o', 'a la atencion',
      'recipient full name', 'shipping name',
      
      // Español
      'consignatario', 'nombre consignatario', 'nombre_consignatario',
      'destinatario', 'nombre destinatario', 'nombre_destinatario',
      'receptor', 'nombre receptor', 'nombre_receptor',
      'cliente', 'nombre cliente', 'nombre_cliente',
      'nombre', 'nombre completo', 'nombre_completo',
      'comprador', 'nombre comprador',
      'persona', 'nombre persona',
      'contacto', 'nombre contacto',
      'entregar a', 'entregar_a', 'para',
      'a nombre de', 'beneficiario', 'titular'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // IDENTIFICACIÓN (Cédula/Pasaporte/RUC)
  // ────────────────────────────────────────────────────────────
  {
    campo: 'identification',
    peso: 90,
    variaciones: [
      // Inglés
      'id', 'identification', 'id number', 'id_number', 'idnumber',
      'identity', 'identity number', 'identity_number',
      'passport', 'passport number', 'passport_number', 'passportno',
      'national id', 'national_id', 'nationalid',
      'tax id', 'tax_id', 'taxid', 'tax number',
      'ssn', 'social security', 'social_security',
      'document', 'document number', 'document_number', 'doc no',
      'personal id', 'personal_id',
      
      // Español
      'cedula', 'cédula', 'cedula identidad', 'cédula identidad',
      'numero cedula', 'número cédula', 'numero_cedula', 'nro cedula',
      'identificacion', 'identificación', 'numero identificacion',
      'documento', 'numero documento', 'número documento', 'nro doc',
      'pasaporte', 'numero pasaporte', 'número pasaporte',
      'ruc', 'numero ruc', 'número ruc', 'nro ruc',
      'nit', 'numero nit', 'nro nit',
      'dni', 'numero dni', 'nro dni',
      'ci', 'c.i.', 'c.i', 'carnet identidad'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // TELÉFONO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'phone',
    peso: 85,
    variaciones: [
      // Inglés
      'phone', 'phone number', 'phone_number', 'phonenumber',
      'telephone', 'telephone number', 'telephone_number', 'tel',
      'mobile', 'mobile number', 'mobile_number', 'mobilenumber',
      'cell', 'cell phone', 'cell_phone', 'cellphone', 'cellular',
      'contact phone', 'contact_phone', 'contact number',
      'primary phone', 'main phone',
      'whatsapp', 'whatsapp number',
      
      // Español
      'telefono', 'teléfono', 'numero telefono', 'número teléfono',
      'numero_telefono', 'nro telefono', 'nro tel', 'tel',
      'celular', 'numero celular', 'número celular', 'cel',
      'movil', 'móvil', 'numero movil', 'número móvil',
      'contacto', 'numero contacto', 'número contacto',
      'fono', 'numero fono'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // DIRECCIÓN
  // ────────────────────────────────────────────────────────────
  {
    campo: 'address',
    peso: 80,
    variaciones: [
      // Inglés
      'address', 'street address', 'street_address', 'streetaddress',
      'delivery address', 'delivery_address', 'deliveryaddress',
      'shipping address', 'shipping_address', 'shippingaddress',
      'ship to address', 'ship_to_address',
      'mailing address', 'mailing_address',
      'street', 'street name', 'street_name',
      'address line', 'address_line', 'addressline',
      'address 1', 'address_1', 'address1',
      'full address', 'full_address', 'fulladdress',
      'location', 'destination',
      
      // Español
      'direccion', 'dirección', 'direccion entrega', 'dirección entrega',
      'direccion_entrega', 'dir', 'dir entrega',
      'domicilio', 'domicilio entrega',
      'calle', 'nombre calle',
      'ubicacion', 'ubicación',
      'destino', 'lugar entrega',
      'residencia', 'lugar residencia',
      'barrio', 'sector', 'zona'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // DESCRIPCIÓN DEL PRODUCTO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'description',
    peso: 75,
    variaciones: [
      // Inglés
      'description', 'product description', 'product_description',
      'item description', 'item_description', 'itemdescription',
      'goods description', 'goods_description',
      'content', 'contents', 'package content', 'package_content',
      'item', 'items', 'item name', 'item_name',
      'product', 'products', 'product name', 'product_name',
      'goods', 'merchandise', 'commodity',
      'detail', 'details', 'item detail', 'item_detail',
      'what', 'whats inside',
      
      // Español
      'descripcion', 'descripción', 'desc', 'descrip',
      'descripcion producto', 'descripción producto',
      'contenido', 'contenido paquete',
      'producto', 'productos', 'nombre producto',
      'articulo', 'artículo', 'articulos', 'artículos',
      'mercancia', 'mercancía', 'mercancias', 'mercancías',
      'bienes', 'items', 'detalle', 'detalles'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // VALOR DECLARADO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'valueUSD',
    peso: 85,
    variaciones: [
      // Inglés
      'value', 'declared value', 'declared_value', 'declaredvalue',
      'item value', 'item_value', 'itemvalue',
      'goods value', 'goods_value', 'goodsvalue',
      'total value', 'total_value', 'totalvalue',
      'amount', 'total amount', 'total_amount',
      'price', 'unit price', 'unit_price', 'unitprice',
      'cost', 'total cost', 'total_cost',
      'customs value', 'customs_value',
      'invoice value', 'invoice_value',
      'fob', 'fob value', 'fob_value',
      'cif', 'cif value', 'cif_value',
      'usd', 'usd value', 'value usd', 'value_usd',
      'dollar', 'dollars', 'dollar value',
      // Campos adicionales de valor
      'merchandise value', 'merchandise_value', 'merch value',
      'item cost', 'item_cost', 'itemcost',
      'declared amount', 'declared_amount',
      'commercial value', 'commercial_value',
      'insured value', 'insured_value', 'insurance value',
      'purchase price', 'purchase_price',
      'retail value', 'retail price', 'msrp',
      'extended price', 'extended_price', 'line total',
      
      // Español
      'valor', 'valor declarado', 'valor_declarado',
      'valor producto', 'valor_producto',
      'valor total', 'valor_total',
      'monto', 'monto total', 'monto_total',
      'precio', 'precio unitario', 'precio_unitario',
      'importe', 'importe total',
      'valor aduana', 'valor aduanero',
      'valor factura', 'valor_factura',
      'valor fob', 'valor_fob',
      'valor cif', 'valor_cif',
      'dolares', 'dólares', 'valor dolares', 'valor dólares',
      'costo', 'costo unitario', 'precio mercancia',
      'valor mercancia', 'valor_mercancia'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // PESO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'weight',
    peso: 70,
    variaciones: [
      // Inglés
      'weight', 'gross weight', 'gross_weight', 'grossweight',
      'net weight', 'net_weight', 'netweight',
      'actual weight', 'actual_weight',
      'chargeable weight', 'chargeable_weight',
      'weight kg', 'weight_kg', 'weightkg',
      'weight lb', 'weight_lb', 'weightlb',
      'kg', 'kgs', 'kilogram', 'kilograms',
      'lb', 'lbs', 'pound', 'pounds',
      'mass', 'package weight', 'package_weight',
      // Campos adicionales de peso
      'dimensional weight', 'dimensional_weight', 'dim weight',
      'volumetric weight', 'volumetric_weight', 'vol weight',
      'billable weight', 'billable_weight',
      'charged weight', 'charged_weight',
      'billed weight', 'billed_weight',
      'shipping weight', 'shipping_weight',
      'item weight', 'item_weight',
      'unit weight', 'unit_weight',
      'cube', 'cubed weight',
      
      // Español
      'peso', 'peso bruto', 'peso_bruto',
      'peso neto', 'peso_neto',
      'peso real', 'peso_real',
      'peso cobrable', 'peso_cobrable',
      'peso kg', 'peso_kg',
      'peso lb', 'peso_lb', 'peso libras',
      'kilogramos', 'kilos', 'kgs',
      'libras', 'lbs',
      'peso dimensional', 'peso_dimensional',
      'peso volumetrico', 'peso_volumetrico',
      'peso facturado', 'peso_facturado'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // PROVINCIA/ESTADO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'province',
    peso: 55,
    variaciones: [
      // Inglés
      'province', 'state', 'region', 'district',
      'state province', 'state_province',
      'delivery state', 'delivery_state',
      'shipping state', 'shipping_state',
      
      // Español
      'provincia', 'estado', 'region', 'región',
      'departamento', 'depto', 'distrito'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // CIUDAD
  // ────────────────────────────────────────────────────────────
  {
    campo: 'city',
    peso: 55,
    variaciones: [
      // Inglés
      'city', 'town', 'municipality',
      'delivery city', 'delivery_city',
      'shipping city', 'shipping_city',
      'destination city', 'destination_city',
      
      // Español
      'ciudad', 'municipio', 'localidad',
      'ciudad destino', 'ciudad_destino',
      'poblacion', 'población'
    ]
  },
  
  // ────────────────────────────────────────────────────────────
  // DISTRITO
  // ────────────────────────────────────────────────────────────
  {
    campo: 'district',
    peso: 50,
    variaciones: [
      // Inglés
      'district', 'neighborhood', 'area', 'zone',
      'sub district', 'sub_district',
      
      // Español
      'distrito', 'corregimiento', 'barrio', 'sector',
      'zona', 'area', 'área'
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// ALGORITMO DE FUZZY MATCHING
// ══════════════════════════════════════════════════════════════

/**
 * Calcula la distancia de Levenshtein entre dos strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // Eliminación
        dp[i][j - 1] + 1,      // Inserción
        dp[i - 1][j - 1] + cost // Sustitución
      );
    }
  }
  
  return dp[m][n];
}

/**
 * Calcula similitud entre 0 y 1 (1 = idénticos)
 */
function calcularSimilitud(str1: string, str2: string): number {
  const s1 = normalizar(str1);
  const s2 = normalizar(str2);
  
  if (s1 === s2) return 1;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 0;
  
  const distancia = levenshteinDistance(s1, s2);
  return 1 - (distancia / maxLen);
}

/**
 * Normaliza texto para comparación
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
    .trim();
}

/**
 * Verifica si el header contiene la variación
 */
function contieneVariacion(header: string, variacion: string): boolean {
  const headerNorm = normalizar(header);
  const variacionNorm = normalizar(variacion);
  
  return headerNorm.includes(variacionNorm) || variacionNorm.includes(headerNorm);
}

// ══════════════════════════════════════════════════════════════
// DETECTOR PRINCIPAL
// ══════════════════════════════════════════════════════════════

export interface ResultadoDeteccion {
  mapping: Partial<ColumnMapping>;
  confianza: Record<string, number>;
  noDetectados: string[];
  sugerencias: Record<string, string[]>;
}

/**
 * DETECTOR AUTOMÁTICO DE COLUMNAS
 * Analiza headers y retorna mapeo con nivel de confianza
 */
export class DetectorColumnasMejorado {
  
  private static readonly UMBRAL_EXACTO = 1.0;
  private static readonly UMBRAL_ALTO = 0.85;
  private static readonly UMBRAL_MEDIO = 0.70;
  private static readonly UMBRAL_BAJO = 0.55;
  
  /**
   * Detecta automáticamente el mapeo de columnas
   */
  static detectar(headers: string[]): ResultadoDeteccion {
    const mapping: Partial<ColumnMapping> = {};
    const confianza: Record<string, number> = {};
    const sugerencias: Record<string, string[]> = {};
    const headersUsados = new Set<string>();
    
    // Ordenar variaciones por peso (prioridad)
    const variacionesOrdenadas = [...VARIACIONES_COLUMNAS]
      .sort((a, b) => b.peso - a.peso);
    
    // Procesar cada campo en orden de prioridad
    for (const config of variacionesOrdenadas) {
      let mejorHeader: string | null = null;
      let mejorScore = 0;
      const candidatos: Array<{ header: string; score: number }> = [];
      
      for (const header of headers) {
        if (headersUsados.has(header)) continue;
        
        const score = this.calcularScoreColumna(header, config.variaciones);
        
        if (score > this.UMBRAL_BAJO) {
          candidatos.push({ header, score });
        }
        
        if (score > mejorScore) {
          mejorScore = score;
          mejorHeader = header;
        }
      }
      
      // Si encontramos una coincidencia aceptable
      if (mejorHeader && mejorScore >= this.UMBRAL_BAJO) {
        mapping[config.campo] = mejorHeader;
        confianza[config.campo] = Math.round(mejorScore * 100);
        headersUsados.add(mejorHeader);
        
        // Guardar otras sugerencias
        const otrasSugerencias = candidatos
          .filter(c => c.header !== mejorHeader && c.score >= this.UMBRAL_BAJO)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(c => c.header);
        
        if (otrasSugerencias.length > 0) {
          sugerencias[config.campo] = otrasSugerencias;
        }
      }
    }
    
    // Campos no detectados
    const noDetectados = VARIACIONES_COLUMNAS
      .filter(v => !mapping[v.campo])
      .map(v => v.campo);
    
    return {
      mapping,
      confianza,
      noDetectados,
      sugerencias
    };
  }
  
  /**
   * Calcula score de coincidencia para un header
   */
  private static calcularScoreColumna(header: string, variaciones: string[]): number {
    let mejorScore = 0;
    
    for (const variacion of variaciones) {
      // 1. Coincidencia exacta (normalizada)
      if (normalizar(header) === normalizar(variacion)) {
        return this.UMBRAL_EXACTO;
      }
      
      // 2. Header contiene variación o viceversa
      if (contieneVariacion(header, variacion)) {
        const score = 0.90;
        mejorScore = Math.max(mejorScore, score);
        continue;
      }
      
      // 3. Similitud fuzzy
      const similitud = calcularSimilitud(header, variacion);
      mejorScore = Math.max(mejorScore, similitud);
    }
    
    return mejorScore;
  }
  
  /**
   * Valida si un mapeo es suficiente para procesar
   */
  static validarMapeo(mapping: Partial<ColumnMapping>): {
    valido: boolean;
    faltantes: string[];
    advertencias: string[];
  } {
    const camposRequeridos: (keyof ColumnMapping)[] = ['trackingNumber', 'recipient', 'valueUSD'];
    const camposRecomendados: (keyof ColumnMapping)[] = ['description', 'address', 'phone'];
    
    const faltantes = camposRequeridos.filter(campo => !mapping[campo]);
    const advertencias: string[] = [];
    
    for (const campo of camposRecomendados) {
      if (!mapping[campo]) {
        advertencias.push(`Campo recomendado "${campo}" no detectado`);
      }
    }
    
    return {
      valido: faltantes.length === 0,
      faltantes,
      advertencias
    };
  }
  
  /**
   * Obtiene descripción legible de un campo
   */
  static obtenerDescripcionCampo(campo: keyof ColumnMapping): string {
    const descripciones: Record<string, string> = {
      trackingNumber: 'Número de Guía/Tracking',
      recipient: 'Nombre del Consignatario',
      identification: 'Cédula/Identificación',
      phone: 'Teléfono',
      address: 'Dirección',
      description: 'Descripción del Producto',
      valueUSD: 'Valor Declarado (USD)',
      weight: 'Peso',
      province: 'Provincia',
      city: 'Ciudad',
      district: 'Distrito'
    };
    
    return descripciones[campo] || campo;
  }
  
  /**
   * Obtiene nivel de confianza como texto
   */
  static obtenerNivelConfianza(porcentaje: number): {
    nivel: 'alto' | 'medio' | 'bajo';
    color: string;
    icono: string;
  } {
    if (porcentaje >= 85) {
      return { nivel: 'alto', color: 'text-green-600', icono: '✓' };
    }
    if (porcentaje >= 70) {
      return { nivel: 'medio', color: 'text-yellow-600', icono: '~' };
    }
    return { nivel: 'bajo', color: 'text-red-600', icono: '!' };
  }
}

/**
 * Función de conveniencia para detección rápida
 */
export function detectarColumnasAutomaticamente(headers: string[]): ResultadoDeteccion {
  return DetectorColumnasMejorado.detectar(headers);
}

/**
 * Valida mapeo y retorna resultado
 */
export function validarMapeoColumnas(mapping: Partial<ColumnMapping>) {
  return DetectorColumnasMejorado.validarMapeo(mapping);
}
