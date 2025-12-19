/**
 * DASHBOARD DE MANIFIESTO
 * 
 * Muestra métricas detalladas, gráficos de distribución,
 * tabla de paquetes con filtros y alertas.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, DollarSign, Calculator, Receipt, 
  Download, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, ArrowLeft, FileSpreadsheet
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

import { obtenerManifiesto, obtenerFilasPorManifiesto } from '@/lib/db/database';
import { descargarExcelCompleto } from '@/lib/exportacion/generarExcelCompleto';
import { FilaProcesada } from '@/lib/workers/procesador.worker';

// Colores para categorías aduaneras
const COLORES_CATEGORIA: Record<string, string> = {
  'A': '#10b981', // Verde - Documentos
  'B': '#3b82f6', // Azul - De Minimis
  'C': '#f59e0b', // Amarillo - Medio
  'D': '#ef4444', // Rojo - Alto valor
  'Sin Clasificar': '#6b7280' // Gris
};

const ITEMS_POR_PAGINA = 10;

export default function DashboardManifiesto() {
  const { manifiestoId } = useParams<{ manifiestoId: string }>();
  const navigate = useNavigate();

  // Estados
  const [manifiesto, setManifiesto] = useState<any>(null);
  const [paquetes, setPaquetes] = useState<FilaProcesada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  // Filtros y paginación
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [paginaActual, setPaginaActual] = useState(1);

  // Cargar datos
  useEffect(() => {
    if (!manifiestoId) return;

    const cargarDatos = async () => {
      setCargando(true);
      try {
        const man = obtenerManifiesto(manifiestoId);
        const filas = obtenerFilasPorManifiesto(manifiestoId);

        if (!man) {
          toast({
            variant: 'destructive',
            title: 'Manifiesto no encontrado',
            description: `No se encontró el manifiesto ${manifiestoId}`
          });
          navigate('/historial');
          return;
        }

        setManifiesto(man);
        setPaquetes(filas);
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los datos del manifiesto'
        });
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [manifiestoId, navigate]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const totalPaquetes = paquetes.length;
    const valorCIFTotal = paquetes.reduce((sum, p) => sum + (p.valorUSD || 0), 0);
    
    // Simular tributos basados en categoría
    let tributosTotal = 0;
    paquetes.forEach(p => {
      if (p.categoriaAduanera === 'C') {
        tributosTotal += (p.valorUSD || 0) * 0.15; // 15% aprox
      } else if (p.categoriaAduanera === 'D') {
        tributosTotal += (p.valorUSD || 0) * 0.25; // 25% aprox
      }
    });

    const totalCobrar = valorCIFTotal + tributosTotal;

    return { totalPaquetes, valorCIFTotal, tributosTotal, totalCobrar };
  }, [paquetes]);

  // Datos para gráfico de pastel
  const datosGrafico = useMemo(() => {
    const conteo: Record<string, number> = {};
    
    paquetes.forEach(p => {
      const cat = p.categoriaAduanera || 'Sin Clasificar';
      conteo[cat] = (conteo[cat] || 0) + 1;
    });

    return Object.entries(conteo).map(([name, value]) => ({
      name: name === 'A' ? 'A - Documentos' :
            name === 'B' ? 'B - De Minimis (≤$100)' :
            name === 'C' ? 'C - Medio ($100-$2,000)' :
            name === 'D' ? 'D - Alto (≥$2,000)' : name,
      value,
      color: COLORES_CATEGORIA[name] || COLORES_CATEGORIA['Sin Clasificar']
    }));
  }, [paquetes]);

  // Paquetes con alertas
  const paquetesConAlertas = useMemo(() => {
    return paquetes.filter(p => 
      p.requierePermiso || 
      (p.errores && p.errores.length > 0) ||
      (p.advertencias && p.advertencias.length > 0)
    );
  }, [paquetes]);

  // Filtrar paquetes
  const paquetesFiltrados = useMemo(() => {
    return paquetes.filter(p => {
      // Filtro por búsqueda
      if (busqueda) {
        const busquedaLower = busqueda.toLowerCase();
        const coincide = 
          p.tracking?.toLowerCase().includes(busquedaLower) ||
          p.destinatario?.toLowerCase().includes(busquedaLower) ||
          p.descripcion?.toLowerCase().includes(busquedaLower);
        if (!coincide) return false;
      }

      // Filtro por categoría
      if (filtroCategoria !== 'todas') {
        if (p.categoriaAduanera !== filtroCategoria) return false;
      }

      return true;
    });
  }, [paquetes, busqueda, filtroCategoria]);

  // Paginación
  const totalPaginas = Math.ceil(paquetesFiltrados.length / ITEMS_POR_PAGINA);
  const paquetesPaginados = paquetesFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  // Exportar Excel
  const handleDescargarExcel = async () => {
    if (!manifiesto) return;

    setExportando(true);
    try {
      await descargarExcelCompleto(
        manifiesto,
        paquetes,
        (progress) => {
          console.log('Progreso exportación:', progress);
        }
      );

      toast({
        title: 'Exportación completada',
        description: 'El archivo Excel se ha descargado correctamente'
      });
    } catch (error) {
      console.error('Error exportando:', error);
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo generar el archivo Excel'
      });
    } finally {
      setExportando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando manifiesto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/historial')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Dashboard: {manifiesto?.mawb || manifiestoId}
            </h1>
            <p className="text-sm text-muted-foreground">
              Procesado: {manifiesto?.fechaProcesamiento 
                ? new Date(manifiesto.fechaProcesamiento).toLocaleString() 
                : 'N/A'}
            </p>
          </div>
        </div>

        <Button onClick={handleDescargarExcel} disabled={exportando}>
          {exportando ? (
            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Descargar Reporte Excel
        </Button>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paquetes
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalPaquetes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor CIF Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metricas.valorCIFTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tributos Totales
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${metricas.tributosTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total a Cobrar
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${metricas.totalCobrar.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {paquetesConAlertas.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Paquetes que requieren atención</AlertTitle>
          <AlertDescription>
            {paquetesConAlertas.length} paquete(s) tienen restricciones o requieren revisión manual.
            {paquetesConAlertas.filter(p => p.requierePermiso).length > 0 && (
              <span className="block mt-1">
                • {paquetesConAlertas.filter(p => p.requierePermiso).length} requieren permisos especiales
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Gráfico y Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Categorías */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Distribución por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {datosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={datosGrafico}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {datosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de Paquetes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">Detalle de Paquetes</CardTitle>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar guía..."
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPaginaActual(1);
                    }}
                    className="pl-9 w-48"
                  />
                </div>
                
                <Select 
                  value={filtroCategoria} 
                  onValueChange={(v) => {
                    setFiltroCategoria(v);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="A">A - Documentos</SelectItem>
                    <SelectItem value="B">B - De Minimis</SelectItem>
                    <SelectItem value="C">C - Medio</SelectItem>
                    <SelectItem value="D">D - Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guía</TableHead>
                    <TableHead>Consignatario</TableHead>
                    <TableHead className="hidden md:table-cell">Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paquetesPaginados.length > 0 ? (
                    paquetesPaginados.map((paquete, idx) => (
                      <TableRow key={paquete.tracking || idx}>
                        <TableCell className="font-mono text-sm">
                          {paquete.tracking || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {paquete.destinatario || '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                          {paquete.descripcion || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: COLORES_CATEGORIA[paquete.categoriaAduanera || ''] + '20',
                              color: COLORES_CATEGORIA[paquete.categoriaAduanera || ''] || undefined
                            }}
                          >
                            {paquete.categoriaAduanera || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(paquete.valorUSD || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No se encontraron paquetes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((paginaActual - 1) * ITEMS_POR_PAGINA) + 1} - {Math.min(paginaActual * ITEMS_POR_PAGINA, paquetesFiltrados.length)} de {paquetesFiltrados.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
