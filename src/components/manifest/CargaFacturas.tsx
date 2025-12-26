// ============================================
// COMPONENTE DE CARGA DE FACTURAS COMERCIALES
// Asocia facturas PDF a paquetes que requieren liquidación
// ============================================

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  FileWarning,
  Package
} from 'lucide-react';
import { Liquidacion } from '@/types/aduanas';
import { toast } from 'sonner';

interface FacturaAsociada {
  id: string;
  nombreArchivo: string;
  awbExtraidos: string[];
  archivo: File;
  fechaCarga: Date;
  estado: 'pendiente' | 'validada' | 'error';
  errores: string[];
  awbsCoincidentes: string[];
  awbsFaltantes: string[];
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
  const [validacion, setValidacion] = useState<ValidacionResultado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AWBs que requieren factura (categoría D - alto valor)
  const awbsRequeridosSet = new Set(
    liquidacionesPendientes
      .filter(l => l.categoriaAduanera === 'D' || l.valorCIF > 100)
      .map(l => l.numeroGuia.toUpperCase().trim())
  );
  const awbsRequeridos = Array.from(awbsRequeridosSet);

  // Extraer AWBs del nombre del archivo PDF
  const extraerAWBsDeNombre = (nombreArchivo: string): string[] => {
    const nombre = nombreArchivo.toUpperCase();
    // Patrones comunes: AWB123456789, 123-45678901, etc
    const patrones = [
      /\b\d{3}[-\s]?\d{8}\b/g,       // 123-45678901
      /\bAWB\s*\d{9,12}\b/gi,         // AWB123456789
      /\b[A-Z]{2,3}\d{8,12}\b/g,      // AA12345678
      /\b\d{10,14}\b/g                 // Números largos
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

  // Validar facturas contra liquidaciones
  const validarFacturas = useCallback((facturasActuales: FacturaAsociada[]) => {
    const awbsEnFacturas = new Set<string>();
    
    const facturasValidadas = facturasActuales.map(factura => {
      const awbsCoincidentes: string[] = [];
      const errores: string[] = [];
      
      // Buscar coincidencias
      for (const awb of factura.awbExtraidos) {
        const normalizado = awb.toUpperCase().trim();
        if (awbsRequeridosSet.has(normalizado)) {
          awbsCoincidentes.push(normalizado);
          awbsEnFacturas.add(normalizado);
        }
      }
      
      // Verificar si se encontró al menos un AWB válido
      if (awbsCoincidentes.length === 0) {
        errores.push('No se encontró ningún AWB que coincida con los paquetes pendientes de liquidación');
      }
      
      return {
        ...factura,
        awbsCoincidentes,
        errores,
        estado: errores.length === 0 ? 'validada' as const : 'error' as const
      };
    });
    
    // AWBs que no tienen factura asociada
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
  }, [awbsRequeridos, awbsRequeridosSet, onFacturasAsociadas]);

  // Manejar carga de archivos
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setCargando(true);
    
    try {
      const nuevasFacturas: FacturaAsociada[] = [];
      
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} no es un archivo PDF válido`);
          continue;
        }
        
        const awbsExtraidos = extraerAWBsDeNombre(file.name);
        
        nuevasFacturas.push({
          id: `factura-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nombreArchivo: file.name,
          awbExtraidos: awbsExtraidos,
          archivo: file,
          fechaCarga: new Date(),
          estado: 'pendiente',
          errores: [],
          awbsCoincidentes: [],
          awbsFaltantes: []
        });
      }
      
      const todasFacturas = [...facturas, ...nuevasFacturas];
      const resultado = validarFacturas(todasFacturas);
      
      if (resultado.facturasValidas > 0) {
        toast.success(`${resultado.facturasValidas} factura(s) validada(s) correctamente`);
      }
      if (resultado.facturasConErrores > 0) {
        toast.warning(`${resultado.facturasConErrores} factura(s) con problemas de validación`);
      }
      
    } catch (error) {
      toast.error('Error al procesar las facturas');
    } finally {
      setCargando(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  // Eliminar factura
  const eliminarFactura = (id: string) => {
    const nuevasFacturas = facturas.filter(f => f.id !== id);
    setFacturas(nuevasFacturas);
    if (nuevasFacturas.length > 0) {
      validarFacturas(nuevasFacturas);
    } else {
      setValidacion(null);
    }
  };

  // Si no hay liquidaciones pendientes que requieran factura
  if (awbsRequeridos.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <FileText className="w-5 h-5" />
          Facturas Comerciales Requeridas
          <Badge variant="secondary" className="ml-2">
            {awbsRequeridos.length} paquetes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instrucciones */}
        <Alert>
          <Package className="w-4 h-4" />
          <AlertTitle>Paquetes que requieren factura</AlertTitle>
          <AlertDescription>
            Se requieren facturas comerciales para {awbsRequeridos.length} paquete(s) 
            con valor superior a $100 USD. Cargue los archivos PDF de las facturas 
            para asociarlos a las guías correspondientes.
          </AlertDescription>
        </Alert>

        {/* Botón de carga */}
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
          
          {facturas.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {facturas.length} archivo(s) cargado(s)
            </span>
          )}
        </div>

        {/* Alertas de validación */}
        {validacion && validacion.awbsSinFactura.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Facturas faltantes</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Los siguientes {validacion.awbsSinFactura.length} AWB(s) no tienen factura asociada:
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

        {/* Tabla de facturas cargadas */}
        {facturas.length > 0 && (
          <ScrollArea className="h-[300px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>AWBs Detectados</TableHead>
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
                        <span className="truncate max-w-[200px]" title={factura.nombreArchivo}>
                          {factura.nombreArchivo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {factura.awbsCoincidentes.length > 0 ? (
                          factura.awbsCoincidentes.map(awb => (
                            <Badge key={awb} variant="default" className="font-mono text-xs">
                              {awb}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {factura.awbExtraidos.length > 0 
                              ? `${factura.awbExtraidos.length} AWB(s) no coinciden`
                              : 'No se detectaron AWBs'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {factura.estado === 'validada' ? (
                        <Badge className="bg-green-100 text-green-800 gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Validada
                        </Badge>
                      ) : factura.estado === 'error' ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Procesando
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => eliminarFactura(factura.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Resumen de validación */}
        {validacion && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {validacion.facturasValidas}
              </p>
              <p className="text-sm text-muted-foreground">Facturas válidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {validacion.awbsEncontrados}
              </p>
              <p className="text-sm text-muted-foreground">AWBs asociados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {validacion.awbsSinFactura.length}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
