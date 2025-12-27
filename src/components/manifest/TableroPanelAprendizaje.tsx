// ============================================
// TABLERO DE CONOCIMIENTO ADQUIRIDO
// Muestra cómo la plataforma evoluciona y aprende
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  Shield,
  FileText,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Lightbulb
} from 'lucide-react';
import { 
  GestorRestriccionesAprendidas, 
  RestriccionAprendida, 
  RegistroAprendizaje 
} from '@/lib/aprendizaje/gestorRestriccionesAprendidas';
import { toast } from 'sonner';

interface TableroPanelAprendizajeProps {
  onClose?: () => void;
}

export function TableroPanelAprendizaje({ onClose }: TableroPanelAprendizajeProps) {
  const [restricciones, setRestricciones] = useState<RestriccionAprendida[]>([]);
  const [logAprendizaje, setLogAprendizaje] = useState<RegistroAprendizaje[]>([]);
  const [estadisticas, setEstadisticas] = useState<ReturnType<typeof GestorRestriccionesAprendidas.obtenerEstadisticas> | null>(null);
  
  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, []);
  
  const cargarDatos = () => {
    GestorRestriccionesAprendidas.inicializar();
    setRestricciones(GestorRestriccionesAprendidas.obtenerTodas());
    setLogAprendizaje(GestorRestriccionesAprendidas.obtenerLogAprendizaje(50));
    setEstadisticas(GestorRestriccionesAprendidas.obtenerEstadisticas());
  };
  
  // Formatear fecha
  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString('es-PA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Exportar datos
  const handleExportar = () => {
    const datos = GestorRestriccionesAprendidas.exportar();
    const blob = new Blob([datos], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conocimiento-pasarex-${formatearFecha(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conocimiento exportado correctamente');
  };
  
  // Importar datos
  const handleImportar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const texto = await file.text();
        const exito = GestorRestriccionesAprendidas.importar(texto);
        if (exito) {
          cargarDatos();
          toast.success('Conocimiento importado correctamente');
        } else {
          toast.error('Error al importar el archivo');
        }
      }
    };
    input.click();
  };
  
  // Desactivar restricción
  const handleDesactivar = (id: string) => {
    if (GestorRestriccionesAprendidas.desactivarRestriccion(id)) {
      cargarDatos();
      toast.success('Restricción desactivada');
    }
  };
  
  // Iconos por tipo de evento
  const iconoEvento = (tipo: RegistroAprendizaje['tipoEvento']) => {
    switch (tipo) {
      case 'restriccion_aprendida': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'hts_corregido': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'permiso_asignado': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'patron_detectado': return <Lightbulb className="w-4 h-4 text-purple-500" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };
  
  // Badge por autoridad
  const badgeAutoridad = (autoridad: string) => {
    const colores: Record<string, string> = {
      'MINSA': 'bg-red-100 text-red-700',
      'MIDA': 'bg-green-100 text-green-700',
      'AUPSA': 'bg-amber-100 text-amber-700',
      'MINGOB': 'bg-slate-100 text-slate-700',
      'ASEP': 'bg-blue-100 text-blue-700',
      'MiAmbiente': 'bg-emerald-100 text-emerald-700'
    };
    return colores[autoridad] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Conocimiento Adquirido
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>
            <p className="text-sm text-muted-foreground">
              La plataforma aprende de sus correcciones
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportar} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportar} className="gap-2">
            <Upload className="w-4 h-4" />
            Importar
          </Button>
        </div>
      </div>
      
      {/* Cards de estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Restricciones Aprendidas</p>
                  <p className="text-2xl font-bold">{estadisticas.restriccionesActivas}</p>
                </div>
                <Shield className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Veces Aplicadas</p>
                  <p className="text-2xl font-bold">{estadisticas.totalAplicaciones}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Autoridades</p>
                  <p className="text-2xl font-bold">{estadisticas.autoridadesMasComunes.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Último Aprendizaje</p>
                  <p className="text-lg font-bold">
                    {estadisticas.ultimoAprendizaje 
                      ? formatearFecha(estadisticas.ultimoAprendizaje)
                      : 'Sin datos'}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Log de Aprendizaje - Tabla principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Historial de Aprendizaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logAprendizaje.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Aún no hay aprendizaje registrado. La IA aprenderá de sus correcciones manuales.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Fecha</TableHead>
                    <TableHead>Concepto Aprendido</TableHead>
                    <TableHead>Acción Automática Nueva</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logAprendizaje.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {iconoEvento(registro.tipoEvento)}
                          {formatearFecha(registro.fecha)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{registro.conceptoAprendido}</p>
                        <p className="text-xs text-muted-foreground">{registro.descripcion}</p>
                      </TableCell>
                      <TableCell className="text-sm text-green-700">
                        {registro.accionAutomaticaNueva}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Restricciones Aprendidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Restricciones por Palabra Clave
          </CardTitle>
        </CardHeader>
        <CardContent>
          {restricciones.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No hay restricciones aprendidas. Asigne permisos manualmente para que la IA aprenda.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palabra Clave</TableHead>
                    <TableHead>Autoridad</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Aplicaciones</TableHead>
                    <TableHead className="text-center">Confianza</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restricciones.map((restriccion) => (
                    <TableRow key={restriccion.id}>
                      <TableCell className="font-medium">
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {restriccion.palabraClave}
                        </code>
                        {restriccion.palabrasRelacionadas.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {restriccion.palabrasRelacionadas.slice(0, 2).map((p, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                            {restriccion.palabrasRelacionadas.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{restriccion.palabrasRelacionadas.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={badgeAutoridad(restriccion.autoridad)}>
                          {restriccion.autoridad}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {restriccion.descripcion}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{restriccion.vecesAplicada}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div 
                            className={`w-2 h-2 rounded-full ${
                              restriccion.confianza >= 80 ? 'bg-green-500' :
                              restriccion.confianza >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="text-sm">{restriccion.confianza}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDesactivar(restriccion.id)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Ejemplos recientes de aprendizaje */}
      {logAprendizaje.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lightbulb className="w-5 h-5" />
              Ejemplos de Aprendizaje Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logAprendizaje.slice(0, 3).map((registro) => (
                <div 
                  key={registro.id}
                  className="p-3 bg-background rounded-lg border flex items-start gap-3"
                >
                  {iconoEvento(registro.tipoEvento)}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {registro.conceptoAprendido}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {registro.descripcion}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      → {registro.accionAutomaticaNueva}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatearFecha(registro.fecha)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TableroPanelAprendizaje;
