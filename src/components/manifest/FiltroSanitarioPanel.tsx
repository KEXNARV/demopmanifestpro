import { useState, useMemo } from 'react';
import { ManifestRow } from '@/types/manifest';
import { 
  getMotorFiltroSanitario, 
  ResumenFiltroSanitario 
} from '@/lib/filtroSanitario/motorFiltroSanitario';
import { 
  ResultadoFiltroSanitario, 
  EstadoMINSA 
} from '@/lib/filtroSanitario/tiposFiltro';
import { 
  crearDatosCartaDesdeManifiesto, 
  descargarCartaRelevo 
} from '@/lib/filtroSanitario/generadorCartaRelevo';
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
} from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  FileText, 
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  FileDown,
  Upload,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface FiltroSanitarioPanelProps {
  data: ManifestRow[];
}

const ESTADO_CONFIG: Record<EstadoMINSA, { 
  label: string; 
  color: string; 
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
}> = {
  'CLEARED': { 
    label: 'Aprobado', 
    color: 'text-green-600', 
    icon: CheckCircle,
    bgColor: 'bg-green-50 border-green-200'
  },
  'REQUIRES_MINSA_CHECK': { 
    label: 'Requiere Verificación', 
    color: 'text-amber-600', 
    icon: ShieldAlert,
    bgColor: 'bg-amber-50 border-amber-200'
  },
  'PERSONAL_USE': { 
    label: 'Uso Personal', 
    color: 'text-blue-600', 
    icon: ShieldCheck,
    bgColor: 'bg-blue-50 border-blue-200'
  },
  'COMMERCIAL_HOLD': { 
    label: 'Detenido (Comercial)', 
    color: 'text-orange-600', 
    icon: Clock,
    bgColor: 'bg-orange-50 border-orange-200'
  },
  'DOCUMENTS_REQUIRED': { 
    label: 'Documentos Requeridos', 
    color: 'text-amber-600', 
    icon: FileText,
    bgColor: 'bg-amber-50 border-amber-200'
  },
  'PROHIBITED_GOODS': { 
    label: 'PROHIBIDO', 
    color: 'text-red-600', 
    icon: Ban,
    bgColor: 'bg-red-50 border-red-200'
  },
  'PENDING_DOCUMENTS': { 
    label: 'Esperando Documentos', 
    color: 'text-purple-600', 
    icon: Upload,
    bgColor: 'bg-purple-50 border-purple-200'
  }
};

export function FiltroSanitarioPanel({ data }: FiltroSanitarioPanelProps) {
  const [filtroActivo, setFiltroActivo] = useState<EstadoMINSA | 'ALL'>('ALL');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<ResultadoFiltroSanitario | null>(null);

  // Analizar todos los paquetes
  const { resultados, resumen } = useMemo(() => {
    const motor = getMotorFiltroSanitario();
    const resultados = motor.analizarManifiesto(data);
    const resumen = motor.obtenerResumen(resultados);
    return { resultados, resumen };
  }, [data]);

  // Filtrar resultados según el filtro activo
  const resultadosFiltrados = useMemo(() => {
    if (filtroActivo === 'ALL') return resultados;
    return resultados.filter(r => r.estado === filtroActivo);
  }, [resultados, filtroActivo]);

  // Obtener solo los que requieren acción
  const requierenAccion = useMemo(() => {
    return resultados.filter(r => r.requiereAccion);
  }, [resultados]);

  const handleDescargarCartaRelevo = (resultado: ResultadoFiltroSanitario) => {
    const paquete = data.find(p => p.id === resultado.paqueteId);
    if (paquete) {
      const datos = crearDatosCartaDesdeManifiesto(paquete);
      descargarCartaRelevo(datos);
      toast.success('Carta de Relevo generada', {
        description: `Archivo descargado para guía ${resultado.trackingNumber}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-bold text-green-600">{resumen.aprobados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress 
              value={resumen.porcentajeAprobado} 
              className="mt-2 h-1 bg-green-100" 
            />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requieren Docs</p>
                <p className="text-2xl font-bold text-amber-600">{resumen.requierenDocumentos}</p>
              </div>
              <FileText className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Detenidos</p>
                <p className="text-2xl font-bold text-orange-600">{resumen.detenidosComercial}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prohibidos</p>
                <p className="text-2xl font-bold text-red-600">{resumen.prohibidos}</p>
              </div>
              <Ban className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requieren Acción</p>
                <p className="text-2xl font-bold text-blue-600">{resumen.requierenAccion}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas críticas */}
      {resumen.prohibidos > 0 && (
        <Alert variant="destructive">
          <ShieldX className="h-5 w-5" />
          <AlertTitle>⛔ PRODUCTOS PROHIBIDOS DETECTADOS</AlertTitle>
          <AlertDescription>
            Se han detectado {resumen.prohibidos} paquete(s) con sustancias prohibidas. 
            Estos NO pueden ingresar al país y deben ser rechazados inmediatamente.
          </AlertDescription>
        </Alert>
      )}

      {resumen.detenidosComercial > 0 && (
        <Alert className="border-orange-300 bg-orange-50">
          <Clock className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-800">🚨 POSIBLE CARGA COMERCIAL</AlertTitle>
          <AlertDescription className="text-orange-700">
            Se han detectado {resumen.detenidosComercial} paquete(s) con cantidades que sugieren uso comercial. 
            Se requiere Registro Sanitario y Licencia de Importación.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumen">📊 Resumen</TabsTrigger>
          <TabsTrigger value="accion" className="relative">
            ⚠️ Requieren Acción
            {resumen.requierenAccion > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {resumen.requierenAccion}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="todos">📦 Todos</TabsTrigger>
          <TabsTrigger value="prohibidos" className="text-red-600">
            🚫 Prohibidos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="resumen" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Keywords Detectadas</CardTitle>
                <CardDescription>Términos farmacéuticos más frecuentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resumen.topKeywords.map(([keyword, count]) => (
                    <div key={keyword} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{keyword}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(count / resumen.total) * 100} 
                          className="w-24 h-2" 
                        />
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
                <CardDescription>Estado de revisión MINSA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(ESTADO_CONFIG).map(([estado, config]) => {
                    const count = resultados.filter(r => r.estado === estado).length;
                    if (count === 0) return null;
                    const Icon = config.icon;
                    return (
                      <div 
                        key={estado} 
                        className={`flex items-center justify-between p-2 rounded-lg border ${config.bgColor} cursor-pointer hover:opacity-80`}
                        onClick={() => setFiltroActivo(estado as EstadoMINSA)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className={`text-sm font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <Badge className={config.color}>{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Requieren Acción */}
        <TabsContent value="accion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Paquetes que Requieren Acción
              </CardTitle>
              <CardDescription>
                Estos paquetes necesitan documentación o revisión antes de la liquidación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guía</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>Documentos</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requierenAccion.map((resultado) => {
                      const estadoConfig = ESTADO_CONFIG[resultado.estado];
                      const Icon = estadoConfig.icon;
                      return (
                        <TableRow key={resultado.paqueteId}>
                          <TableCell className="font-mono text-sm">
                            {resultado.trackingNumber}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${estadoConfig.bgColor} ${estadoConfig.color} border`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {estadoConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {resultado.descripcion}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {resultado.keywordsDetectadas.slice(0, 3).map(k => (
                                <Badge key={k} variant="outline" className="text-xs">
                                  {k}
                                </Badge>
                              ))}
                              {resultado.keywordsDetectadas.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{resultado.keywordsDetectadas.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {resultado.documentosRequeridos.length} requeridos
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setPaqueteSeleccionado(resultado)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Detalle de Paquete - {resultado.trackingNumber}</DialogTitle>
                                    <DialogDescription>
                                      Estado: {estadoConfig.label}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DetallesPaquete resultado={resultado} />
                                </DialogContent>
                              </Dialog>
                              
                              {resultado.estado !== 'PROHIBITED_GOODS' && (
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => handleDescargarCartaRelevo(resultado)}
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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

        {/* Tab: Todos */}
        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Todos los Paquetes Analizados</CardTitle>
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
                    variant={filtroActivo === 'CLEARED' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFiltroActivo('CLEARED')}
                  >
                    Aprobados
                  </Button>
                  <Button 
                    variant={filtroActivo === 'DOCUMENTS_REQUIRED' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFiltroActivo('DOCUMENTS_REQUIRED')}
                  >
                    Con Docs
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
                      <TableHead>Keywords</TableHead>
                      <TableHead>Puede Liquidar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadosFiltrados.map((resultado) => {
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
                          <TableCell>
                            {resultado.keywordsDetectadas.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {resultado.keywordsDetectadas.slice(0, 2).map(k => (
                                  <Badge key={k} variant="outline" className="text-xs">
                                    {k}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {resultado.puedeProcesoLiquidacion ? (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                ✓ Sí
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                ✗ No
                              </Badge>
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

        {/* Tab: Prohibidos */}
        <TabsContent value="prohibidos">
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Productos Prohibidos
              </CardTitle>
              <CardDescription className="text-red-600">
                Estos productos NO pueden ingresar al país - RECHAZO AUTOMÁTICO
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {resumen.prohibidos === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No se detectaron productos prohibidos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resultados.filter(r => r.esProhibido).map(resultado => (
                    <Alert key={resultado.paqueteId} variant="destructive">
                      <Ban className="h-4 w-4" />
                      <AlertTitle>{resultado.trackingNumber}</AlertTitle>
                      <AlertDescription>
                        <p className="mb-2">{resultado.descripcion}</p>
                        <div className="flex gap-2 mt-2">
                          {resultado.keywordsDetectadas.map(k => (
                            <Badge key={k} variant="destructive">{k}</Badge>
                          ))}
                        </div>
                        {resultado.alertas.map(alerta => (
                          <p key={alerta.id} className="mt-2 font-semibold">
                            {alerta.accionRequerida}
                          </p>
                        ))}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para mostrar detalles del paquete
function DetallesPaquete({ resultado }: { resultado: ResultadoFiltroSanitario }) {
  const estadoConfig = ESTADO_CONFIG[resultado.estado];

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {resultado.alertas.map(alerta => (
        <Alert 
          key={alerta.id} 
          variant={alerta.tipo === 'critical' || alerta.tipo === 'error' ? 'destructive' : 'default'}
          className={alerta.tipo === 'warning' ? 'border-amber-300 bg-amber-50' : ''}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{alerta.titulo}</AlertTitle>
          <AlertDescription>
            <p>{alerta.mensaje}</p>
            {alerta.accionRequerida && (
              <p className="mt-2 font-semibold">👉 {alerta.accionRequerida}</p>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {/* Información del paquete */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Guía</p>
          <p className="font-mono">{resultado.trackingNumber}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tipo Importación</p>
          <Badge variant="outline">{resultado.tipoImportacion}</Badge>
        </div>
      </div>

      {/* Keywords detectadas */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Keywords Detectadas</p>
        <div className="flex flex-wrap gap-2">
          {resultado.keywordsDetectadas.map(k => (
            <Badge key={k} variant="secondary">{k}</Badge>
          ))}
        </div>
      </div>

      {/* Documentos requeridos */}
      {resultado.documentosRequeridos.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Documentos Requeridos</p>
          <div className="space-y-2">
            {resultado.documentosRequeridos.map(doc => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{doc.nombre}</p>
                  <p className="text-sm text-muted-foreground">{doc.descripcion}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.obligatorio && (
                    <Badge variant="destructive" className="text-xs">Obligatorio</Badge>
                  )}
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Subir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
