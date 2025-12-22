import { useState, useMemo } from 'react';
import { ManifestRow } from '@/types/manifest';
import { 
  analizarManifiestoSubvaluacion, 
  obtenerResumenSubvaluacion,
  ResultadoSubvaluacion,
  EstadoValoracion,
  PRODUCTOS_REFERENCIA
} from '@/lib/validacion/detectorSubvaluacion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  TrendingDown,
  FileWarning,
  Eye,
  Upload,
  Edit,
  ShieldAlert,
  Calculator,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface SubvaluacionPanelProps {
  data: ManifestRow[];
}

const ESTADO_CONFIG: Record<EstadoValoracion, { 
  label: string; 
  color: string; 
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
}> = {
  'OK': { 
    label: 'Valor Correcto', 
    color: 'text-green-600', 
    icon: CheckCircle,
    bgColor: 'bg-green-50 border-green-200'
  },
  'SOSPECHOSO': { 
    label: 'Valor Sospechoso', 
    color: 'text-amber-600', 
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 border-amber-200'
  },
  'SUBVALUADO': { 
    label: 'SUBVALUADO', 
    color: 'text-red-600', 
    icon: AlertOctagon,
    bgColor: 'bg-red-50 border-red-200'
  },
  'REVISION_MANUAL': { 
    label: 'Revisión Manual', 
    color: 'text-orange-600', 
    icon: FileWarning,
    bgColor: 'bg-orange-50 border-orange-200'
  }
};

export function SubvaluacionPanel({ data }: SubvaluacionPanelProps) {
  const [filtroActivo, setFiltroActivo] = useState<EstadoValoracion | 'ALL'>('ALL');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<ResultadoSubvaluacion | null>(null);

  // Analizar todos los paquetes
  const { resultados, resumen } = useMemo(() => {
    const resultados = analizarManifiestoSubvaluacion(data);
    const resumen = obtenerResumenSubvaluacion(resultados);
    return { resultados, resumen };
  }, [data]);

  // Filtrar resultados
  const resultadosFiltrados = useMemo(() => {
    if (filtroActivo === 'ALL') return resultados;
    return resultados.filter(r => r.estado === filtroActivo);
  }, [resultados, filtroActivo]);

  // Solo los problemáticos
  const problematicos = useMemo(() => {
    return resultados.filter(r => r.estado !== 'OK');
  }, [resultados]);

  const handleCorregirValor = (resultado: ResultadoSubvaluacion) => {
    toast.info('Corrección de valor', {
      description: `Abrir formulario de corrección para guía ${resultado.trackingNumber}`
    });
  };

  const handleSubirComprobante = (resultado: ResultadoSubvaluacion) => {
    toast.info('Subir comprobante', {
      description: `Subir factura o comprobante bancario para guía ${resultado.trackingNumber}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header con Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor OK</p>
                <p className="text-2xl font-bold text-green-600">{resumen.aprobados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sospechosos</p>
                <p className="text-2xl font-bold text-amber-600">{resumen.sospechosos}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subvaluados</p>
                <p className="text-2xl font-bold text-red-600">{resumen.subvaluados}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
                <p className="text-2xl font-bold text-orange-600">{resumen.bloqueados}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Diferencia</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${resumen.diferenciaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas críticas */}
      {resumen.subvaluados > 0 && (
        <Alert variant="destructive">
          <AlertOctagon className="h-5 w-5" />
          <AlertTitle>⚠️ SUBVALUACIÓN DETECTADA</AlertTitle>
          <AlertDescription>
            Se han detectado {resumen.subvaluados} paquete(s) con valores significativamente por debajo del precio de mercado. 
            Diferencia total estimada: <strong>${resumen.diferenciaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>. 
            Aduanas podría revaluar y aplicar multas.
          </AlertDescription>
        </Alert>
      )}

      {resumen.sospechosos > 0 && resumen.subvaluados === 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800">⚡ Valores Potencialmente Bajos</AlertTitle>
          <AlertDescription className="text-amber-700">
            Se detectaron {resumen.sospechosos} paquete(s) con valores que podrían estar por debajo del mercado. 
            Se recomienda verificar y adjuntar facturas de compra.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumen">📊 Resumen</TabsTrigger>
          <TabsTrigger value="alertas" className="relative">
            ⚠️ Alertas
            {problematicos.length > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {problematicos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="todos">📦 Todos</TabsTrigger>
          <TabsTrigger value="referencias">💰 Precios Ref.</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="resumen" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparación de Valores</CardTitle>
                <CardDescription>Valor declarado vs. valor estimado de mercado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor Total Declarado:</span>
                    <span className="text-xl font-bold">
                      ${resumen.valorTotalDeclarado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor Estimado Real:</span>
                    <span className="text-xl font-bold text-amber-600">
                      ${resumen.valorTotalEstimado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Diferencia Potencial:</span>
                    <span className="text-xl font-bold text-red-600">
                      ${resumen.diferenciaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Impuestos Adicionales Est.:</span>
                    <span className="text-lg font-semibold text-red-500">
                      ${(resumen.diferenciaTotal * 0.07).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos con Mayor Subvaluación</CardTitle>
                <CardDescription>Top 5 productos con diferencia de valor</CardDescription>
              </CardHeader>
              <CardContent>
                {resumen.topProductosSubvaluados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No se detectó subvaluación significativa</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumen.topProductosSubvaluados.map((item, idx) => (
                      <div key={item.producto} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <span className="font-medium">{item.producto}</span>
                          <Badge variant="secondary">{item.cantidad}x</Badge>
                        </div>
                        <span className="text-red-600 font-semibold">
                          -${item.diferencia.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Paquetes con Alerta de Valoración
              </CardTitle>
              <CardDescription>
                Paquetes que requieren revisión por posible subvaluación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {problematicos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Todos los valores están dentro del rango aceptable</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estado</TableHead>
                        <TableHead>Guía</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Declarado</TableHead>
                        <TableHead className="text-right">Ref. Mín.</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problematicos.map((resultado) => {
                        const estadoConfig = ESTADO_CONFIG[resultado.estado];
                        const Icon = estadoConfig.icon;
                        return (
                          <TableRow key={resultado.paqueteId} className={resultado.bloqueado ? 'bg-red-50' : ''}>
                            <TableCell>
                              <Badge className={`${estadoConfig.bgColor} ${estadoConfig.color} border`}>
                                <Icon className="h-3 w-3 mr-1" />
                                {estadoConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {resultado.trackingNumber}
                              {resultado.bloqueado && (
                                <Badge variant="destructive" className="ml-2 text-xs">BLOQUEADO</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{resultado.productoDetectado}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {resultado.descripcion}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${resultado.valorDeclarado.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              ${resultado.precioReferenciaMin?.toFixed(2) || '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {resultado.diferenciaPorcentaje 
                                ? `-${resultado.diferenciaPorcentaje.toFixed(0)}%`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                      <DialogTitle>{resultado.productoDetectado}</DialogTitle>
                                      <DialogDescription>
                                        Guía: {resultado.trackingNumber}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DetalleSubvaluacion resultado={resultado} />
                                    <DialogFooter className="gap-2">
                                      <Button 
                                        variant="outline" 
                                        onClick={() => handleSubirComprobante(resultado)}
                                      >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Subir Comprobante
                                      </Button>
                                      <Button onClick={() => handleCorregirValor(resultado)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Corregir Valor
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Todos */}
        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Todos los Paquetes</CardTitle>
                  <CardDescription>
                    {resultadosFiltrados.length} de {resumen.total} paquetes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={filtroActivo === 'ALL' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFiltroActivo('ALL')}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={filtroActivo === 'OK' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFiltroActivo('OK')}
                  >
                    OK
                  </Button>
                  <Button 
                    variant={filtroActivo === 'SUBVALUADO' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFiltroActivo('SUBVALUADO')}
                  >
                    Subvaluados
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Guía</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Producto Ref.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadosFiltrados.slice(0, 100).map((resultado) => {
                      const estadoConfig = ESTADO_CONFIG[resultado.estado];
                      const Icon = estadoConfig.icon;
                      return (
                        <TableRow key={resultado.paqueteId}>
                          <TableCell>
                            <Icon className={`h-5 w-5 ${estadoConfig.color}`} />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {resultado.trackingNumber}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {resultado.descripcion}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${resultado.valorDeclarado.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {resultado.productoDetectado ? (
                              <Badge variant="outline">{resultado.productoDetectado}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Precios de Referencia */}
        <TabsContent value="referencias">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Base de Precios de Referencia
              </CardTitle>
              <CardDescription>
                Precios de mercado utilizados para detectar subvaluación ({PRODUCTOS_REFERENCIA.length} productos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Precio Mín.</TableHead>
                      <TableHead className="text-right">Precio Máx.</TableHead>
                      <TableHead>Keywords</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PRODUCTOS_REFERENCIA.map((producto, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {producto.nombreProducto}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{producto.categoria}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${producto.precioMinimo.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${producto.precioMaximo.toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {producto.keywords.slice(0, 2).map(k => (
                              <Badge key={k} variant="secondary" className="text-xs">
                                {k}
                              </Badge>
                            ))}
                            {producto.keywords.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{producto.keywords.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para mostrar detalles de subvaluación
function DetalleSubvaluacion({ resultado }: { resultado: ResultadoSubvaluacion }) {
  const estadoConfig = ESTADO_CONFIG[resultado.estado];

  return (
    <div className="space-y-4">
      {/* Alerta */}
      <Alert 
        variant={resultado.nivelAlerta === 'critical' ? 'destructive' : 'default'}
        className={resultado.nivelAlerta === 'warning' ? 'border-amber-300 bg-amber-50' : ''}
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{resultado.mensaje}</AlertTitle>
        <AlertDescription>
          <p className="mt-2">{resultado.accionRequerida}</p>
        </AlertDescription>
      </Alert>

      {/* Comparación de precios */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Valor Declarado</p>
          <p className="text-2xl font-bold text-red-600">
            ${resultado.valorDeclarado.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Precio Mercado (Mín)</p>
          <p className="text-2xl font-bold text-green-600">
            ${resultado.precioReferenciaMin?.toFixed(2) || '-'}
          </p>
        </div>
      </div>

      {resultado.diferenciaPorcentaje && resultado.diferenciaPorcentaje > 0 && (
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">Diferencia</p>
          <p className="text-3xl font-bold text-red-700">
            -{resultado.diferenciaPorcentaje.toFixed(0)}%
          </p>
          <p className="text-sm text-red-600">
            (${((resultado.precioReferenciaMin || 0) - resultado.valorDeclarado).toFixed(2)} menos)
          </p>
        </div>
      )}

      {/* Descripción original */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">Descripción Original</p>
        <p className="text-sm p-2 bg-muted rounded">{resultado.descripcion}</p>
      </div>
    </div>
  );
}
