import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/manifest/Header';
import { 
  obtenerManifiestos, 
  obtenerEstadisticas, 
  eliminarManifiesto,
  actualizarEstadoManifiesto,
  ManifiestoGuardado 
} from '@/lib/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Scale, 
  FileText,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Archive,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function Historial() {
  const [manifiestos, setManifiestos] = useState<ManifiestoGuardado[]>([]);
  const [estadisticas, setEstadisticas] = useState<{
    totalManifiestos: number;
    totalPaquetes: number;
    valorTotal: number;
    pesoTotal: number;
    porEstado: Record<string, number>;
  } | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const data = await obtenerManifiestos();
      const stats = await obtenerEstadisticas();
      setManifiestos(data.sort((a, b) => 
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      ));
      setEstadisticas({
        totalManifiestos: stats.totalManifiestos,
        totalPaquetes: stats.totalPaquetes,
        valorTotal: stats.valorTotal,
        pesoTotal: stats.pesoTotal,
        porEstado: stats.porEstado
      });
    } catch (error) {
      toast.error('Error al cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleEliminar = (id: string) => {
    const exito = eliminarManifiesto(id);
    if (exito) {
      toast.success('Manifiesto eliminado');
      cargarDatos();
    } else {
      toast.error('Error al eliminar');
    }
  };

  const handleCambiarEstado = (id: string, estado: ManifiestoGuardado['estado']) => {
    const exito = actualizarEstadoManifiesto(id, estado);
    if (exito) {
      toast.success(`Estado actualizado a "${estado}"`);
      cargarDatos();
    } else {
      toast.error('Error al actualizar estado');
    }
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-PA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerBadgeEstado = (estado: ManifiestoGuardado['estado']) => {
    const estilos = {
      procesado: { variant: 'default' as const, icon: Clock, label: 'Procesado' },
      revisado: { variant: 'secondary' as const, icon: Eye, label: 'Revisado' },
      exportado: { variant: 'outline' as const, icon: Download, label: 'Exportado' },
      archivado: { variant: 'outline' as const, icon: Archive, label: 'Archivado' }
    };
    const config = estilos[estado];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Navegación */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Historial de Manifiestos</h1>
          </div>
          <Button onClick={cargarDatos} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Manifiestos</p>
                    <p className="text-2xl font-bold">{estadisticas.totalManifiestos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Package className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paquetes</p>
                    <p className="text-2xl font-bold">{estadisticas.totalPaquetes.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <DollarSign className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">{formatearMoneda(estadisticas.valorTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <Scale className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Total</p>
                    <p className="text-2xl font-bold">{estadisticas.pesoTotal.toFixed(1)} lbs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estados resumen */}
        {estadisticas && Object.keys(estadisticas.porEstado).length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Object.entries(estadisticas.porEstado).map(([estado, cantidad]) => (
                  <div key={estado} className="flex items-center gap-2">
                    {obtenerBadgeEstado(estado as ManifiestoGuardado['estado'])}
                    <span className="text-sm font-medium">{cantidad}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla de manifiestos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manifiestos Guardados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : manifiestos.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No hay manifiestos</h3>
                <p className="text-muted-foreground mb-4">
                  Aún no has procesado ningún manifiesto
                </p>
                <Link to="/">
                  <Button>Cargar Primer Manifiesto</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>MAWB</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Paquetes</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Calidad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manifiestos.map((m) => {
                      const porcentajeValidos = m.totalFilas > 0 
                        ? (m.filasValidas / m.totalFilas) * 100 
                        : 0;
                      
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.id}</TableCell>
                          <TableCell className="font-medium">{m.mawb || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{formatearFecha(m.fechaCreacion)}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">{m.filasValidas}</span>
                            <span className="text-muted-foreground">/{m.totalFilas}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatearMoneda(m.valorTotal)}
                          </TableCell>
                          <TableCell>{obtenerBadgeEstado(m.estado)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {porcentajeValidos >= 95 ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : porcentajeValidos >= 80 ? (
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <span className="text-sm">{porcentajeValidos.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCambiarEstado(m.id, 'revisado')}
                                title="Marcar como revisado"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCambiarEstado(m.id, 'archivado')}
                                title="Archivar"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar manifiesto?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará permanentemente el manifiesto {m.id} y todos sus datos asociados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleEliminar(m.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CargoManifest Pro — Historial de Manifiestos</p>
        </div>
      </footer>
    </div>
  );
}
