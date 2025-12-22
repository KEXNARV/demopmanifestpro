// ============================================
// DETECTOR DE SUBVALUACIÓN ADUANAL
// Sistema de validación de valores declarados
// ============================================

import { ManifestRow } from '@/types/manifest';

export type NivelAlerta = 'info' | 'warning' | 'critical';
export type EstadoValoracion = 'OK' | 'SOSPECHOSO' | 'SUBVALUADO' | 'REVISION_MANUAL';

export interface ProductoReferencia {
  keywords: string[];
  nombreProducto: string;
  precioMinimo: number;
  precioMaximo: number;
  categoria: string;
}

export interface ResultadoSubvaluacion {
  paqueteId: string;
  trackingNumber: string;
  descripcion: string;
  valorDeclarado: number;
  estado: EstadoValoracion;
  productoDetectado?: string;
  precioReferenciaMin?: number;
  precioReferenciaMax?: number;
  diferenciaPorcentaje?: number;
  nivelAlerta: NivelAlerta;
  mensaje: string;
  accionRequerida: string;
  bloqueado: boolean;
}

// ============================================
// BASE DE DATOS DE PRECIOS DE REFERENCIA
// Actualizar periódicamente según mercado
// ============================================
export const PRODUCTOS_REFERENCIA: ProductoReferencia[] = [
  // === APPLE - iPhones ===
  { keywords: ['iphone 16 pro max', 'iphone16 pro max'], nombreProducto: 'iPhone 16 Pro Max', precioMinimo: 1099, precioMaximo: 1599, categoria: 'Electrónica' },
  { keywords: ['iphone 16 pro', 'iphone16 pro'], nombreProducto: 'iPhone 16 Pro', precioMinimo: 999, precioMaximo: 1399, categoria: 'Electrónica' },
  { keywords: ['iphone 16'], nombreProducto: 'iPhone 16', precioMinimo: 799, precioMaximo: 1099, categoria: 'Electrónica' },
  { keywords: ['iphone 15 pro max', 'iphone15 pro max'], nombreProducto: 'iPhone 15 Pro Max', precioMinimo: 999, precioMaximo: 1399, categoria: 'Electrónica' },
  { keywords: ['iphone 15 pro', 'iphone15 pro'], nombreProducto: 'iPhone 15 Pro', precioMinimo: 899, precioMaximo: 1299, categoria: 'Electrónica' },
  { keywords: ['iphone 15 plus', 'iphone15 plus'], nombreProducto: 'iPhone 15 Plus', precioMinimo: 799, precioMaximo: 1099, categoria: 'Electrónica' },
  { keywords: ['iphone 15', 'iphone15'], nombreProducto: 'iPhone 15', precioMinimo: 699, precioMaximo: 999, categoria: 'Electrónica' },
  { keywords: ['iphone 14 pro max', 'iphone14 pro max'], nombreProducto: 'iPhone 14 Pro Max', precioMinimo: 800, precioMaximo: 1199, categoria: 'Electrónica' },
  { keywords: ['iphone 14 pro', 'iphone14 pro'], nombreProducto: 'iPhone 14 Pro', precioMinimo: 700, precioMaximo: 1099, categoria: 'Electrónica' },
  { keywords: ['iphone 14', 'iphone14'], nombreProducto: 'iPhone 14', precioMinimo: 550, precioMaximo: 799, categoria: 'Electrónica' },
  { keywords: ['iphone 13', 'iphone13'], nombreProducto: 'iPhone 13', precioMinimo: 450, precioMaximo: 699, categoria: 'Electrónica' },
  
  // === APPLE - MacBooks ===
  { keywords: ['macbook pro 16', 'macbook pro m3 max', 'macbook pro m4'], nombreProducto: 'MacBook Pro 16"', precioMinimo: 2499, precioMaximo: 4499, categoria: 'Electrónica' },
  { keywords: ['macbook pro 14', 'macbook pro m3', 'macbook pro m4'], nombreProducto: 'MacBook Pro 14"', precioMinimo: 1599, precioMaximo: 3499, categoria: 'Electrónica' },
  { keywords: ['macbook air m3', 'macbook air m2', 'macbook air 15'], nombreProducto: 'MacBook Air', precioMinimo: 999, precioMaximo: 1799, categoria: 'Electrónica' },
  
  // === APPLE - iPads ===
  { keywords: ['ipad pro 13', 'ipad pro m4'], nombreProducto: 'iPad Pro 13"', precioMinimo: 1099, precioMaximo: 2199, categoria: 'Electrónica' },
  { keywords: ['ipad pro 11', 'ipad pro m2'], nombreProducto: 'iPad Pro 11"', precioMinimo: 799, precioMaximo: 1599, categoria: 'Electrónica' },
  { keywords: ['ipad air'], nombreProducto: 'iPad Air', precioMinimo: 599, precioMaximo: 999, categoria: 'Electrónica' },
  
  // === APPLE - Otros ===
  { keywords: ['airpods pro', 'airpods 2nd', 'airpods max'], nombreProducto: 'AirPods Pro/Max', precioMinimo: 179, precioMaximo: 549, categoria: 'Electrónica' },
  { keywords: ['apple watch ultra', 'watch ultra'], nombreProducto: 'Apple Watch Ultra', precioMinimo: 699, precioMaximo: 999, categoria: 'Electrónica' },
  { keywords: ['apple watch series 9', 'apple watch series 10', 'apple watch se'], nombreProducto: 'Apple Watch', precioMinimo: 249, precioMaximo: 799, categoria: 'Electrónica' },
  
  // === SAMSUNG ===
  { keywords: ['samsung galaxy s24 ultra', 'galaxy s24 ultra'], nombreProducto: 'Samsung Galaxy S24 Ultra', precioMinimo: 1099, precioMaximo: 1419, categoria: 'Electrónica' },
  { keywords: ['samsung galaxy s24', 'galaxy s24+', 'galaxy s24 plus'], nombreProducto: 'Samsung Galaxy S24/S24+', precioMinimo: 799, precioMaximo: 1099, categoria: 'Electrónica' },
  { keywords: ['samsung galaxy z fold', 'galaxy fold', 'z fold'], nombreProducto: 'Samsung Galaxy Z Fold', precioMinimo: 1499, precioMaximo: 1899, categoria: 'Electrónica' },
  { keywords: ['samsung galaxy z flip', 'galaxy flip', 'z flip'], nombreProducto: 'Samsung Galaxy Z Flip', precioMinimo: 899, precioMaximo: 1179, categoria: 'Electrónica' },
  
  // === CONSOLAS ===
  { keywords: ['playstation 5', 'ps5', 'play station 5'], nombreProducto: 'PlayStation 5', precioMinimo: 399, precioMaximo: 549, categoria: 'Electrónica' },
  { keywords: ['xbox series x', 'xbox x'], nombreProducto: 'Xbox Series X', precioMinimo: 449, precioMaximo: 549, categoria: 'Electrónica' },
  { keywords: ['nintendo switch oled', 'switch oled'], nombreProducto: 'Nintendo Switch OLED', precioMinimo: 299, precioMaximo: 399, categoria: 'Electrónica' },
  { keywords: ['nintendo switch', 'switch lite'], nombreProducto: 'Nintendo Switch', precioMinimo: 199, precioMaximo: 349, categoria: 'Electrónica' },
  { keywords: ['steam deck'], nombreProducto: 'Steam Deck', precioMinimo: 349, precioMaximo: 649, categoria: 'Electrónica' },
  
  // === LAPTOPS ===
  { keywords: ['dell xps 15', 'xps 15'], nombreProducto: 'Dell XPS 15', precioMinimo: 1199, precioMaximo: 2499, categoria: 'Electrónica' },
  { keywords: ['dell xps 13', 'xps 13'], nombreProducto: 'Dell XPS 13', precioMinimo: 899, precioMaximo: 1799, categoria: 'Electrónica' },
  { keywords: ['thinkpad x1 carbon', 'x1 carbon'], nombreProducto: 'Lenovo ThinkPad X1', precioMinimo: 1299, precioMaximo: 2499, categoria: 'Electrónica' },
  { keywords: ['razer blade', 'razer laptop'], nombreProducto: 'Razer Blade', precioMinimo: 1499, precioMaximo: 3499, categoria: 'Electrónica' },
  { keywords: ['asus rog', 'rog laptop', 'rog zephyrus'], nombreProducto: 'ASUS ROG Gaming', precioMinimo: 999, precioMaximo: 2999, categoria: 'Electrónica' },
  
  // === GPUs ===
  { keywords: ['rtx 4090', 'geforce 4090', 'nvidia 4090'], nombreProducto: 'NVIDIA RTX 4090', precioMinimo: 1499, precioMaximo: 2199, categoria: 'Electrónica' },
  { keywords: ['rtx 4080', 'geforce 4080', 'nvidia 4080'], nombreProducto: 'NVIDIA RTX 4080', precioMinimo: 999, precioMaximo: 1399, categoria: 'Electrónica' },
  { keywords: ['rtx 4070', 'geforce 4070'], nombreProducto: 'NVIDIA RTX 4070', precioMinimo: 549, precioMaximo: 799, categoria: 'Electrónica' },
  
  // === CÁMARAS ===
  { keywords: ['sony a7', 'sony alpha 7', 'a7 iv', 'a7iv'], nombreProducto: 'Sony Alpha 7', precioMinimo: 1998, precioMaximo: 3498, categoria: 'Electrónica' },
  { keywords: ['canon eos r5', 'eos r5', 'canon r5'], nombreProducto: 'Canon EOS R5', precioMinimo: 3299, precioMaximo: 4299, categoria: 'Electrónica' },
  { keywords: ['canon eos r6', 'eos r6', 'canon r6'], nombreProducto: 'Canon EOS R6', precioMinimo: 1999, precioMaximo: 2799, categoria: 'Electrónica' },
  { keywords: ['gopro hero', 'gopro 12', 'gopro 11'], nombreProducto: 'GoPro Hero', precioMinimo: 299, precioMaximo: 449, categoria: 'Electrónica' },
  { keywords: ['dji mavic', 'mavic 3', 'mavic pro'], nombreProducto: 'DJI Mavic Drone', precioMinimo: 899, precioMaximo: 2199, categoria: 'Electrónica' },
  
  // === AUDIO ===
  { keywords: ['bose quietcomfort', 'bose qc', 'quietcomfort ultra'], nombreProducto: 'Bose QuietComfort', precioMinimo: 249, precioMaximo: 429, categoria: 'Electrónica' },
  { keywords: ['sony wh-1000xm5', 'sony wh1000', 'xm5 headphones'], nombreProducto: 'Sony WH-1000XM5', precioMinimo: 299, precioMaximo: 399, categoria: 'Electrónica' },
  
  // === RELOJES DE LUJO ===
  { keywords: ['rolex submariner', 'rolex datejust', 'rolex oyster'], nombreProducto: 'Rolex', precioMinimo: 5000, precioMaximo: 50000, categoria: 'Joyería' },
  { keywords: ['omega seamaster', 'omega speedmaster'], nombreProducto: 'Omega', precioMinimo: 3000, precioMaximo: 15000, categoria: 'Joyería' },
  { keywords: ['tag heuer', 'tagheuer'], nombreProducto: 'TAG Heuer', precioMinimo: 1500, precioMaximo: 8000, categoria: 'Joyería' },
  
  // === BOLSOS DE LUJO ===
  { keywords: ['louis vuitton', 'lv bag', 'lv handbag'], nombreProducto: 'Louis Vuitton', precioMinimo: 1000, precioMaximo: 5000, categoria: 'Moda' },
  { keywords: ['gucci bag', 'gucci handbag', 'gucci purse'], nombreProducto: 'Gucci', precioMinimo: 800, precioMaximo: 4000, categoria: 'Moda' },
  { keywords: ['chanel bag', 'chanel handbag', 'chanel purse'], nombreProducto: 'Chanel', precioMinimo: 2000, precioMaximo: 8000, categoria: 'Moda' },
  { keywords: ['hermes bag', 'hermes birkin', 'hermes kelly'], nombreProducto: 'Hermès', precioMinimo: 5000, precioMaximo: 30000, categoria: 'Moda' },
  
  // === ZAPATILLAS ===
  { keywords: ['jordan 1', 'air jordan 1', 'jordan retro'], nombreProducto: 'Air Jordan 1', precioMinimo: 150, precioMaximo: 500, categoria: 'Calzado' },
  { keywords: ['yeezy boost', 'adidas yeezy', 'yeezy 350'], nombreProducto: 'Yeezy', precioMinimo: 200, precioMaximo: 600, categoria: 'Calzado' },
  { keywords: ['nike dunk', 'dunk low', 'dunk high'], nombreProducto: 'Nike Dunk', precioMinimo: 100, precioMaximo: 300, categoria: 'Calzado' },
];

// Marketplaces/Fuentes confiables donde el valor NO es manipulado por el consignatario
export const FUENTES_CONFIABLES: string[] = [
  'amazon.com', 'amazon', 'amzn', 'amz',
  'ebay.com', 'ebay',
  'walmart.com', 'walmart',
  'bestbuy.com', 'best buy', 'bestbuy',
  'target.com', 'target',
  'newegg.com', 'newegg',
  'costco.com', 'costco',
  'apple.com', 'apple store',
  'b&h photo', 'bhphoto', 'b&h',
  'aliexpress', 'alibaba',
  'shein', 'temu',
  'mercadolibre', 'mercado libre',
  'wish.com', 'wish'
];

/**
 * Detecta si el producto proviene de una fuente confiable (marketplace)
 * donde el valor viene directamente del vendedor/plataforma
 */
function esFuenteConfiable(descripcion: string): { esConfiable: boolean; fuente: string | null } {
  const descripcionLower = descripcion.toLowerCase();
  
  for (const fuente of FUENTES_CONFIABLES) {
    if (descripcionLower.includes(fuente.toLowerCase())) {
      return { esConfiable: true, fuente };
    }
  }
  
  return { esConfiable: false, fuente: null };
}

// Umbral de alerta: si el valor declarado es menor a este % del mínimo
const UMBRAL_SUBVALUACION_CRITICA = 0.5; // 50%
const UMBRAL_SUBVALUACION_SOSPECHOSA = 0.7; // 70%

/**
 * Analiza un paquete para detectar subvaluación
 */
export function analizarSubvaluacion(paquete: ManifestRow): ResultadoSubvaluacion {
  const descripcionLower = paquete.description?.toLowerCase() || '';
  const valorDeclarado = paquete.valueUSD || 0;
  
  // PRIMERO: Verificar si viene de fuente confiable (Amazon, eBay, etc.)
  // El valor de estos marketplaces NO es manipulado por el consignatario
  const { esConfiable, fuente } = esFuenteConfiable(descripcionLower);
  
  if (esConfiable) {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      valorDeclarado,
      estado: 'OK',
      nivelAlerta: 'info',
      mensaje: `✅ Valor verificado - Fuente confiable: ${fuente?.toUpperCase()}. El precio viene directamente del marketplace.`,
      accionRequerida: 'Ninguna - valor de marketplace confiable',
      bloqueado: false
    };
  }
  
  // Buscar producto en la base de referencia
  let productoEncontrado: ProductoReferencia | null = null;
  
  for (const producto of PRODUCTOS_REFERENCIA) {
    for (const keyword of producto.keywords) {
      if (descripcionLower.includes(keyword.toLowerCase())) {
        // Preferir el match más específico (más largo)
        if (!productoEncontrado || keyword.length > productoEncontrado.keywords[0].length) {
          productoEncontrado = producto;
        }
        break;
      }
    }
  }
  
  // Si no se encontró producto de referencia, aprobar
  if (!productoEncontrado) {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      valorDeclarado,
      estado: 'OK',
      nivelAlerta: 'info',
      mensaje: 'Producto sin precio de referencia en base de datos.',
      accionRequerida: 'Ninguna',
      bloqueado: false
    };
  }
  
  // Calcular ratio de valoración
  const ratio = valorDeclarado / productoEncontrado.precioMinimo;
  const diferenciaPorcentaje = ((productoEncontrado.precioMinimo - valorDeclarado) / productoEncontrado.precioMinimo) * 100;
  
  // Evaluar nivel de subvaluación
  if (ratio < UMBRAL_SUBVALUACION_CRITICA) {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      valorDeclarado,
      estado: 'SUBVALUADO',
      productoDetectado: productoEncontrado.nombreProducto,
      precioReferenciaMin: productoEncontrado.precioMinimo,
      precioReferenciaMax: productoEncontrado.precioMaximo,
      diferenciaPorcentaje,
      nivelAlerta: 'critical',
      mensaje: `⚠️ SOSPECHA DE SUBVALUACIÓN: ${productoEncontrado.nombreProducto} declarado a $${valorDeclarado.toFixed(2)} (referencia: $${productoEncontrado.precioMinimo} - $${productoEncontrado.precioMaximo})`,
      accionRequerida: 'Revisar valor declarado - posible subvaluación',
      bloqueado: false
    };
  }
  
  if (ratio < UMBRAL_SUBVALUACION_SOSPECHOSA) {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      valorDeclarado,
      estado: 'SOSPECHOSO',
      productoDetectado: productoEncontrado.nombreProducto,
      precioReferenciaMin: productoEncontrado.precioMinimo,
      precioReferenciaMax: productoEncontrado.precioMaximo,
      diferenciaPorcentaje,
      nivelAlerta: 'warning',
      mensaje: `⚡ Valor potencialmente bajo para ${productoEncontrado.nombreProducto}. Rango de mercado: $${productoEncontrado.precioMinimo} - $${productoEncontrado.precioMaximo}`,
      accionRequerida: 'Verificar que el valor declarado corresponda al producto. Se recomienda adjuntar factura o comprobante.',
      bloqueado: false
    };
  }
  
  if (valorDeclarado < productoEncontrado.precioMinimo) {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      valorDeclarado,
      estado: 'REVISION_MANUAL',
      productoDetectado: productoEncontrado.nombreProducto,
      precioReferenciaMin: productoEncontrado.precioMinimo,
      precioReferenciaMax: productoEncontrado.precioMaximo,
      diferenciaPorcentaje,
      nivelAlerta: 'warning',
      mensaje: `Valor ligeramente por debajo del rango de mercado para ${productoEncontrado.nombreProducto}.`,
      accionRequerida: 'Revisión sugerida. Puede ser producto usado o con descuento legítimo.',
      bloqueado: false
    };
  }
  
  // Valor dentro del rango aceptable
  return {
    paqueteId: paquete.id,
    trackingNumber: paquete.trackingNumber,
    descripcion: paquete.description,
    valorDeclarado,
    estado: 'OK',
    productoDetectado: productoEncontrado.nombreProducto,
    precioReferenciaMin: productoEncontrado.precioMinimo,
    precioReferenciaMax: productoEncontrado.precioMaximo,
    diferenciaPorcentaje: 0,
    nivelAlerta: 'info',
    mensaje: `Valor declarado dentro del rango de mercado para ${productoEncontrado.nombreProducto}.`,
    accionRequerida: 'Ninguna',
    bloqueado: false
  };
}

/**
 * Analiza múltiples paquetes
 */
export function analizarManifiestoSubvaluacion(paquetes: ManifestRow[]): ResultadoSubvaluacion[] {
  return paquetes.map(p => analizarSubvaluacion(p));
}

/**
 * Obtiene resumen del análisis de subvaluación
 */
export interface ResumenSubvaluacion {
  total: number;
  aprobados: number;
  sospechosos: number;
  subvaluados: number;
  revisionManual: number;
  bloqueados: number;
  valorTotalDeclarado: number;
  valorTotalEstimado: number;
  diferenciaTotal: number;
  topProductosSubvaluados: { producto: string; cantidad: number; diferencia: number }[];
}

export function obtenerResumenSubvaluacion(resultados: ResultadoSubvaluacion[]): ResumenSubvaluacion {
  const aprobados = resultados.filter(r => r.estado === 'OK').length;
  const sospechosos = resultados.filter(r => r.estado === 'SOSPECHOSO').length;
  const subvaluados = resultados.filter(r => r.estado === 'SUBVALUADO').length;
  const revisionManual = resultados.filter(r => r.estado === 'REVISION_MANUAL').length;
  const bloqueados = resultados.filter(r => r.bloqueado).length;
  
  const valorTotalDeclarado = resultados.reduce((sum, r) => sum + r.valorDeclarado, 0);
  
  // Calcular valor estimado real
  let valorTotalEstimado = 0;
  resultados.forEach(r => {
    if (r.precioReferenciaMin) {
      valorTotalEstimado += Math.max(r.valorDeclarado, r.precioReferenciaMin);
    } else {
      valorTotalEstimado += r.valorDeclarado;
    }
  });
  
  // Agrupar productos subvaluados
  const productosMap = new Map<string, { cantidad: number; diferencia: number }>();
  resultados.filter(r => r.estado === 'SUBVALUADO' || r.estado === 'SOSPECHOSO').forEach(r => {
    if (r.productoDetectado && r.precioReferenciaMin) {
      const key = r.productoDetectado;
      const current = productosMap.get(key) || { cantidad: 0, diferencia: 0 };
      productosMap.set(key, {
        cantidad: current.cantidad + 1,
        diferencia: current.diferencia + (r.precioReferenciaMin - r.valorDeclarado)
      });
    }
  });
  
  const topProductosSubvaluados = Array.from(productosMap.entries())
    .map(([producto, data]) => ({ producto, ...data }))
    .sort((a, b) => b.diferencia - a.diferencia)
    .slice(0, 5);
  
  return {
    total: resultados.length,
    aprobados,
    sospechosos,
    subvaluados,
    revisionManual,
    bloqueados,
    valorTotalDeclarado,
    valorTotalEstimado,
    diferenciaTotal: valorTotalEstimado - valorTotalDeclarado,
    topProductosSubvaluados
  };
}
