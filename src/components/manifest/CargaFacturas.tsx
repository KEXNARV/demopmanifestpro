// ============================================
// COMPONENTE DE CARGA DE FACTURAS COMERCIALES
// Asocia facturas PDF a paquetes que requieren liquidación
// Extrae datos del contenido del PDF con IA (AWB, valores, descripciones)
// ============================================

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Package,
  Eye,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { Liquidacion } from '@/types/aduanas';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Estructura mejorada para items de factura Amazon
interface AmazonInvoiceItem {
  asin: string;
  descripcion: string;
  productGroup: string;
  paHsCode: string;
  countryOfOrigin: string;
  cantidad: number;
  pesoNeto: number;
  valorUnitario: number;
  valorTotal: number;
}

// Estructura de factura Amazon individual
interface AmazonInvoice {
  invoiceNo: string;
  invoiceDate: string;
  transportationReference: string;
  numberOfPackages: number;
  exporter: string;
  consignee: string;
  grossWeight: number;
  phone: string;
  email: string;
  incoterms: string;
  items: AmazonInvoiceItem[];
  totalItemValue: number;
  freightCharge: number;
  totalInvoiceValue: number;
}

interface DatosFacturaIA {
  awbs: string[];
  valores: { valor: number; moneda: string; concepto?: string }[];
  descripciones: string[];
  proveedores: string[];
  fechas: string[];
  destinatarios: string[];
  paises: { origen?: string; destino?: string };
  items: { descripcion: string; cantidad?: number; valorUnitario?: number; valorTotal?: number; hsCode?: string }[];
  // Campos específicos Amazon
  amazonInvoices?: AmazonInvoice[];
  transportationReferences?: string[];
  hsCodesPanama?: { codigo: string; descripcion: string }[];
  desglose?: {
    totalItemValue: number;
    totalFreight: number;
    totalInvoiceValue: number;
  };
}

// Resumen de procesamiento multi-página
interface ResumenProcesamiento {
  totalPaginas: number;
  facturasExtraidas: number;
  facturasCoincidentes: number;
  facturasNoRequeridas: number;
  awbsEncontrados: string[];
  facturasOmitidas: { transportationReference: string; page: number }[];
}

interface FacturaAsociada {
  id: string;
  nombreArchivo: string;
  awbExtraidos: string[];
  archivo: File;
  fechaCarga: Date;
  estado: 'pendiente' | 'procesando' | 'validada' | 'error';
  errores: string[];
  awbsCoincidentes: string[];
  awbsFaltantes: string[];
  datosExtraidos: DatosFacturaIA | null;
  extraidoConIA: boolean;
  // Datos Amazon específicos
  transportationReferences?: string[];
  hsCodesPanama?: { codigo: string; descripcion: string }[];
  desglose?: { totalItemValue: number; totalFreight: number; totalInvoiceValue: number };
  // Procesamiento multi-página
  resumenProcesamiento?: ResumenProcesamiento;
  amazonInvoices?: AmazonInvoice[];
}

interface ValidacionResultado {
  totalFacturas: number;
  facturasValidas: number;
  facturasConErrores: number;
  awbsEncontrados: number;
  awbsFaltantes: string[];
  awbsSinFactura: string[];
}

interface CargaFacturasProps {
  liquidacionesPendientes: Liquidacion[];
  onFacturasAsociadas?: (facturas: FacturaAsociada[]) => void;
}

export function CargaFacturas({ 
  liquidacionesPendientes,
  onFacturasAsociadas 
}: CargaFacturasProps) {
  const [facturas, setFacturas] = useState<FacturaAsociada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [validacion, setValidacion] = useState<ValidacionResultado | null>(null);
  const [facturaDetalle, setFacturaDetalle] = useState<FacturaAsociada | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AWBs que requieren factura (categoría D - alto valor)
  const awbsRequeridosSet = new Set(
    liquidacionesPendientes
      .filter(l => l.categoriaAduanera === 'D' || l.valorCIF > 100)
      .map(l => l.numeroGuia.toUpperCase().trim().replace(/[-\s]/g, ''))
  );
  const awbsRequeridos = Array.from(awbsRequeridosSet);

  // Extraer texto de cada página del PDF por separado
  const extraerTextosPorPagina = async (file: File): Promise<string[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textosPorPagina: string[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const contenido = await pagina.getTextContent();
        const textoPagina = contenido.items
          .map((item: any) => item.str)
          .join(' ');
        textosPorPagina.push(textoPagina);
      }
      
      return textosPorPagina;
    } catch (error) {
      console.error('Error al extraer texto del PDF:', error);
      return [];
    }
  };

  // Extraer datos usando IA con procesamiento multi-página
  const extraerDatosConIA = async (
    textosPorPagina: string[], 
    nombreArchivo: string
  ): Promise<{ datos: DatosFacturaIA | null; resumen: ResumenProcesamiento | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('extract-invoice-data', {
        body: { 
          textosPorPagina, 
          nombreArchivo,
          awbsRequeridos // Enviar lista de AWBs requeridos para filtrar
        }
      });

      if (error) {
        console.error('Error al invocar función:', error);
        return { datos: null, resumen: null };
      }

      if (data?.success && data?.data) {
        return { 
          datos: data.data as DatosFacturaIA,
          resumen: data.resumen as ResumenProcesamiento || null
        };
      }

      return { datos: null, resumen: null };
    } catch (error) {
      console.error('Error en extracción IA:', error);
      return { datos: null, resumen: null };
    }
  };

  // Extraer datos con patrones regex (fallback)
  const extraerDatosConPatrones = (texto: string): DatosFacturaIA => {
    const patronesAWB = [
      /\b\d{3}[-\s]?\d{8}\b/g,
      /\bAWB\s*[:#]?\s*\d{9,12}\b/gi,
      /\b[A-Z]{2,3}\d{8,12}\b/g,
      /\bGU[IÍ]A\s*[:#]?\s*\d{9,14}\b/gi,
      /\b\d{10,14}\b/g
    ];
    
    const awbs: string[] = [];
    for (const patron of patronesAWB) {
      const matches = texto.match(patron);
      if (matches) {
        awbs.push(...matches.map(m => 
          m.replace(/[-\s:#]/g, '')
           .replace(/^(AWB|GUIA|GUÍA|TRACKING)/i, '')
           .toUpperCase()
           .trim()
        ).filter(m => m.length >= 9 && m.length <= 14));
      }
    }
    
    const patronesValor = [
      /\$\s*([\d,]+\.?\d{0,2})\s*(USD|US)?/gi,
      /USD\s*([\d,]+\.?\d{0,2})/gi,
      /TOTAL\s*[:#]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi
    ];
    
    const valores: { valor: number; moneda: string }[] = [];
    for (const patron of patronesValor) {
      let match;
      while ((match = patron.exec(texto)) !== null) {
        const valorStr = match[1].replace(/,/g, '');
        const valor = parseFloat(valorStr);
        if (!isNaN(valor) && valor > 0 && valor < 1000000) {
          valores.push({ valor, moneda: 'USD' });
        }
      }
    }
    
    const descripciones: string[] = [];
    const patronesDescripcion = [
      /DESCRIPTION\s*[:#]?\s*([^\n]+)/gi,
      /DESCRIPCI[OÓ]N\s*[:#]?\s*([^\n]+)/gi,
      /CONTENIDO\s*[:#]?\s*([^\n]+)/gi
    ];
    
    for (const patron of patronesDescripcion) {
      let match;
      while ((match = patron.exec(texto)) !== null) {
        const desc = match[1].trim();
        if (desc.length > 3 && desc.length < 200) {
          descripciones.push(desc);
        }
      }
    }
    
    return {
      awbs: [...new Set(awbs)],
      valores: valores.slice(0, 10),
      descripciones: [...new Set(descripciones)].slice(0, 10),
      proveedores: [],
      fechas: [],
      destinatarios: [],
      paises: {},
      items: []
    };
  };

  // Validar facturas contra liquidaciones
  const validarFacturas = useCallback((facturasActuales: FacturaAsociada[]) => {
    const awbsEnFacturas = new Set<string>();
    
    const facturasValidadas = facturasActuales.map(factura => {
      if (factura.estado === 'procesando') return factura;
      
      const awbsCoincidentes: string[] = [];
      const errores: string[] = [];
      
      for (const awb of factura.awbExtraidos) {
        const normalizado = awb.toUpperCase().trim();
        for (const awbRequerido of awbsRequeridos) {
          if (awbRequerido.includes(normalizado) || normalizado.includes(awbRequerido)) {
            awbsCoincidentes.push(awbRequerido);
            awbsEnFacturas.add(awbRequerido);
          }
        }
      }
      
      if (awbsCoincidentes.length === 0) {
        errores.push('No se encontró ningún AWB que coincida con los paquetes pendientes');
      }
      
      if (!factura.datosExtraidos?.valores?.length) {
        errores.push('No se detectaron valores monetarios en la factura');
      }
      
      return {
        ...factura,
        awbsCoincidentes: [...new Set(awbsCoincidentes)],
        errores,
        estado: errores.length === 0 ? 'validada' as const : 'error' as const
      };
    });
    
    const awbsSinFactura = awbsRequeridos.filter(awb => !awbsEnFacturas.has(awb));
    
    const resultado: ValidacionResultado = {
      totalFacturas: facturasValidadas.length,
      facturasValidas: facturasValidadas.filter(f => f.estado === 'validada').length,
      facturasConErrores: facturasValidadas.filter(f => f.estado === 'error').length,
      awbsEncontrados: awbsEnFacturas.size,
      awbsFaltantes: [],
      awbsSinFactura
    };
    
    setFacturas(facturasValidadas);
    setValidacion(resultado);
    onFacturasAsociadas?.(facturasValidadas.filter(f => f.estado === 'validada'));
    
    return resultado;
  }, [awbsRequeridos, onFacturasAsociadas]);

  // Manejar carga de archivos con procesamiento multi-página
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setCargando(true);
    setProgreso(0);
    
    try {
      const nuevasFacturas: FacturaAsociada[] = [];
      const totalArchivos = files.length;
      
      for (let i = 0; i < totalArchivos; i++) {
        const file = files[i];
        setProgreso(Math.round(((i) / totalArchivos) * 100));
        
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} no es un archivo PDF válido`);
          continue;
        }
        
        // Extraer texto de cada página por separado
        const textosPorPagina = await extraerTextosPorPagina(file);
        
        if (!textosPorPagina.length || !textosPorPagina.some(t => t.trim().length > 20)) {
          toast.warning(`${file.name}: No se pudo extraer texto del PDF`);
          continue;
        }

        // Primero agregar con estado procesando
        const facturaId = `factura-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const facturaInicial: FacturaAsociada = {
          id: facturaId,
          nombreArchivo: file.name,
          awbExtraidos: [],
          archivo: file,
          fechaCarga: new Date(),
          estado: 'procesando',
          errores: [],
          awbsCoincidentes: [],
          awbsFaltantes: [],
          datosExtraidos: null,
          extraidoConIA: false
        };
        
        nuevasFacturas.push(facturaInicial);
        setFacturas(prev => [...prev, facturaInicial]);

        // Intentar extracción con IA (multi-página)
        const { datos: datosExtraidos, resumen } = await extraerDatosConIA(textosPorPagina, file.name);
        const extraidoConIA = !!datosExtraidos;
        
        // Si IA falla, fallback a patrones con texto concatenado
        let datosFinal = datosExtraidos;
        if (!datosFinal) {
          const textoCompleto = textosPorPagina.join('\n');
          datosFinal = extraerDatosConPatrones(textoCompleto);
        }
        
        // Combinar AWBs del nombre + transportationReferences de Amazon
        const awbsDelNombre = extraerAWBsDeNombre(file.name);
        const transportRefs = datosFinal?.transportationReferences || [];
        const todosAWBs = [...new Set([
          ...awbsDelNombre, 
          ...(datosFinal?.awbs || []),
          ...transportRefs.map(r => r.replace(/[-\s]/g, '').toUpperCase())
        ])];

        // Actualizar factura con datos extraídos incluyendo datos Amazon
        const facturaActualizada: FacturaAsociada = {
          ...facturaInicial,
          awbExtraidos: todosAWBs,
          estado: 'pendiente',
          datosExtraidos: datosFinal,
          extraidoConIA,
          // Campos específicos Amazon
          transportationReferences: transportRefs,
          hsCodesPanama: datosFinal?.hsCodesPanama || [],
          desglose: datosFinal?.desglose,
          // Nuevo: procesamiento multi-página
          resumenProcesamiento: resumen || undefined,
          amazonInvoices: datosFinal?.amazonInvoices || []
        };
        
        // Actualizar en el array
        const idx = nuevasFacturas.findIndex(f => f.id === facturaId);
        if (idx !== -1) {
          nuevasFacturas[idx] = facturaActualizada;
        }
        
        setFacturas(prev => prev.map(f => f.id === facturaId ? facturaActualizada : f));
        
        // Mostrar resumen de procesamiento multi-página
        if (resumen) {
          const msg = `${file.name}: ${resumen.facturasCoincidentes}/${resumen.facturasExtraidas} facturas relevantes (${resumen.totalPaginas} páginas)`;
          if (resumen.facturasCoincidentes > 0) {
            toast.success(msg);
          } else if (resumen.facturasExtraidas > 0) {
            toast.info(msg + ' - Ninguna coincide con AWBs pendientes');
          }
        }
        
        setProgreso(Math.round(((i + 1) / totalArchivos) * 100));
      }
      
      // Validar todas las facturas
      setTimeout(() => {
        const todasFacturas = [...facturas.filter(f => !nuevasFacturas.find(n => n.id === f.id)), ...nuevasFacturas];
        const resultado = validarFacturas(todasFacturas);
        
        if (resultado.facturasValidas > 0) {
          toast.success(`${resultado.facturasValidas} factura(s) validada(s) correctamente`);
        }
        if (resultado.facturasConErrores > 0) {
          toast.warning(`${resultado.facturasConErrores} factura(s) con problemas de validación`);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error al procesar facturas:', error);
      toast.error('Error al procesar las facturas');
    } finally {
      setCargando(false);
      setProgreso(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const extraerAWBsDeNombre = (nombreArchivo: string): string[] => {
    const nombre = nombreArchivo.toUpperCase();
    const patrones = [
      /\b\d{3}[-\s]?\d{8}\b/g,
      /\bAWB\s*\d{9,12}\b/gi,
      /\b[A-Z]{2,3}\d{8,12}\b/g,
      /\b\d{10,14}\b/g
    ];
    
    const encontrados: string[] = [];
    for (const patron of patrones) {
      const matches = nombre.match(patron);
      if (matches) {
        encontrados.push(...matches.map(m => m.replace(/[-\s]/g, '').toUpperCase()));
      }
    }
    return [...new Set(encontrados)];
  };

  const eliminarFactura = (id: string) => {
    const nuevasFacturas = facturas.filter(f => f.id !== id);
    setFacturas(nuevasFacturas);
    if (nuevasFacturas.length > 0) {
      validarFacturas(nuevasFacturas);
    } else {
      setValidacion(null);
    }
  };

  // Siempre mostrar el componente, pero con mensaje si no hay paquetes que requieran factura
  const sinPaquetesRequeridos = awbsRequeridos.length === 0;

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <FileText className="w-5 h-5" />
            Carga de Facturas Comerciales (PDF)
            {!sinPaquetesRequeridos && (
              <Badge variant="secondary" className="ml-2">
                {awbsRequeridos.length} paquetes requieren factura
              </Badge>
            )}
            <Badge variant="outline" className="ml-1 gap-1">
              <Sparkles className="w-3 h-3" />
              IA
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sinPaquetesRequeridos ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertTitle className="text-green-800">Sin facturas requeridas</AlertTitle>
              <AlertDescription className="text-green-700">
                Todos los paquetes en este manifiesto tienen valor menor a $100 y no requieren factura comercial.
                Puede cargar facturas opcionalmente para documentación adicional.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Package className="w-4 h-4" />
              <AlertTitle>Extracción inteligente con IA</AlertTitle>
              <AlertDescription>
                El sistema usa IA para extraer automáticamente AWBs, valores y descripciones 
                de facturas con cualquier formato. Cargue los PDFs para procesarlos.
              </AlertDescription>
            </Alert>
          )}


          <div className="flex items-center gap-4">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="factura-upload"
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={cargando}
              className="gap-2"
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Cargar Facturas en PDF
            </Button>
            
            {cargando && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{progreso}%</span>
              </div>
            )}
            
            {!cargando && facturas.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {facturas.length} archivo(s) cargado(s)
              </span>
            )}
          </div>

          {validacion && validacion.awbsSinFactura.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Facturas faltantes</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {validacion.awbsSinFactura.length} AWB(s) sin factura asociada:
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {validacion.awbsSinFactura.slice(0, 10).map(awb => (
                    <Badge key={awb} variant="outline" className="font-mono text-xs">
                      {awb}
                    </Badge>
                  ))}
                  {validacion.awbsSinFactura.length > 10 && (
                    <Badge variant="secondary">
                      +{validacion.awbsSinFactura.length - 10} más
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {facturas.length > 0 && (
            <ScrollArea className="h-[350px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Transport Ref</TableHead>
                    <TableHead>HS Codes</TableHead>
                    <TableHead>Desglose</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-500" />
                          <span className="truncate max-w-[140px]" title={factura.nombreArchivo}>
                            {factura.nombreArchivo}
                          </span>
                          {factura.extraidoConIA && (
                            <span title="Extraído con IA">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {factura.estado === 'procesando' ? (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </span>
                        ) : factura.transportationReferences && factura.transportationReferences.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {factura.transportationReferences.slice(0, 2).map((ref, i) => (
                              <Badge key={i} variant="default" className="font-mono text-xs">
                                {ref}
                              </Badge>
                            ))}
                            {factura.transportationReferences.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{factura.transportationReferences.length - 2} más
                              </span>
                            )}
                          </div>
                        ) : factura.awbExtraidos.length > 0 ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {factura.awbExtraidos[0].substring(0, 15)}...
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {factura.hsCodesPanama && factura.hsCodesPanama.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {factura.hsCodesPanama.slice(0, 2).map((hs, i) => (
                              <Badge key={i} variant="secondary" className="font-mono text-xs">
                                {hs.codigo}
                              </Badge>
                            ))}
                            {factura.hsCodesPanama.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{factura.hsCodesPanama.length - 2} más
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {factura.desglose ? (
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-green-600" />
                              <span className="font-medium">${factura.desglose.totalInvoiceValue.toFixed(2)}</span>
                            </div>
                            {factura.desglose.totalFreight > 0 && (
                              <div className="text-muted-foreground">
                                Flete: ${factura.desglose.totalFreight.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : factura.datosExtraidos?.valores?.[0] ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-green-600" />
                            <span className="text-sm font-medium">
                              ${factura.datosExtraidos.valores[0].valor.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {factura.estado === 'validada' ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </Badge>
                        ) : factura.estado === 'error' ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Error
                          </Badge>
                        ) : factura.estado === 'procesando' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            IA
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pend.</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFacturaDetalle(factura)}
                            disabled={factura.estado === 'procesando'}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarFactura(factura.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {validacion && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{validacion.facturasValidas}</p>
                <p className="text-sm text-muted-foreground">Válidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{validacion.awbsEncontrados}</p>
                <p className="text-sm text-muted-foreground">AWBs asociados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{validacion.awbsSinFactura.length}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!facturaDetalle} onOpenChange={() => setFacturaDetalle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles de Factura
              {facturaDetalle?.extraidoConIA && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  Extraído con IA
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {facturaDetalle && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Archivo</p>
                <p className="font-mono text-sm">{facturaDetalle.nombreArchivo}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">AWBs Detectados</p>
                <div className="flex flex-wrap gap-2">
                  {facturaDetalle.awbExtraidos.length > 0 ? (
                    facturaDetalle.awbExtraidos.map((awb, i) => (
                      <Badge 
                        key={i} 
                        variant={facturaDetalle.awbsCoincidentes.includes(awb) ? "default" : "outline"}
                        className="font-mono"
                      >
                        {awb}
                        {facturaDetalle.awbsCoincidentes.includes(awb) && (
                          <CheckCircle className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No se detectaron AWBs</span>
                  )}
                </div>
              </div>

              {/* Datos Amazon específicos */}
              {facturaDetalle.transportationReferences && facturaDetalle.transportationReferences.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">📦 Transportation References (Amazon)</p>
                  <div className="flex flex-wrap gap-2">
                    {facturaDetalle.transportationReferences.map((ref, i) => (
                      <Badge key={i} className="font-mono bg-blue-100 text-blue-800">{ref}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {facturaDetalle.hsCodesPanama && facturaDetalle.hsCodesPanama.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-2">🇵🇦 PA HS Codes (Aranceles Panamá)</p>
                  <div className="space-y-1">
                    {facturaDetalle.hsCodesPanama.slice(0, 5).map((hs, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Badge variant="outline" className="font-mono">{hs.codigo}</Badge>
                        <span className="text-xs text-muted-foreground truncate">{hs.descripcion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {facturaDetalle.desglose && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">💰 Desglose de Valores</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-700">${facturaDetalle.desglose.totalItemValue.toFixed(2)}</p>
                      <p className="text-xs text-green-600">Item Value</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-700">${facturaDetalle.desglose.totalFreight.toFixed(2)}</p>
                      <p className="text-xs text-blue-600">Freight</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">${facturaDetalle.desglose.totalInvoiceValue.toFixed(2)}</p>
                      <p className="text-xs text-primary">Total Invoice</p>
                    </div>
                  </div>
                </div>
              )}
              
              {facturaDetalle.datosExtraidos?.valores && facturaDetalle.datosExtraidos.valores.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Valores Detectados</p>
                  <div className="flex flex-wrap gap-2">
                    {facturaDetalle.datosExtraidos.valores.map((v, i) => (
                      <Badge key={i} variant="secondary" className="font-mono">
                        ${v.valor.toFixed(2)} {v.moneda}
                        {v.concepto && <span className="ml-1 text-xs opacity-70">({v.concepto})</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {facturaDetalle.datosExtraidos?.items && facturaDetalle.datosExtraidos.items.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Items de la Factura</p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead>HS Code</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facturaDetalle.datosExtraidos.items.slice(0, 10).map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm max-w-[200px] truncate">{item.descripcion}</TableCell>
                            <TableCell className="font-mono text-xs">{item.hsCode || '-'}</TableCell>
                            <TableCell className="text-right">{item.cantidad || '-'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {item.valorTotal ? `$${item.valorTotal.toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {facturaDetalle.datosExtraidos?.descripciones && facturaDetalle.datosExtraidos.descripciones.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Descripciones</p>
                  <ul className="list-disc list-inside space-y-1">
                    {facturaDetalle.datosExtraidos.descripciones.map((desc, i) => (
                      <li key={i} className="text-sm">{desc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {facturaDetalle.datosExtraidos?.proveedores && facturaDetalle.datosExtraidos.proveedores.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Proveedores</p>
                  <div className="flex flex-wrap gap-2">
                    {facturaDetalle.datosExtraidos.proveedores.map((prov, i) => (
                      <Badge key={i} variant="outline">{prov}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {facturaDetalle.datosExtraidos?.destinatarios && facturaDetalle.datosExtraidos.destinatarios.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Destinatarios</p>
                  <div className="flex flex-wrap gap-2">
                    {facturaDetalle.datosExtraidos.destinatarios.map((dest, i) => (
                      <Badge key={i} variant="outline">{dest}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {facturaDetalle.errores.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>Errores de validación</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {facturaDetalle.errores.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
