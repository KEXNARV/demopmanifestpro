/**
 * DASHBOARD DE MANIFIESTO v3.0
 * 
 * Dashboard mejorado que muestra:
 * 1. Información del MAWB y aerolínea detectada
 * 2. Estadísticas generales
 * 3. Distribución automática por valor (<$100 y >$100)
 * 4. Clasificación HTS de productos
 * 5. Tablas de paquetes por lote
 * 6. Exportación a Excel
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, DollarSign, Calculator, Receipt, 
  Download, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, ArrowLeft, FileSpreadsheet,
  Plane, CheckCircle2, AlertCircle, TrendingUp, Pill
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { FilaProcesada } from '@/lib/workers/procesador.worker';
import { 
  extraerProductosFarmaceuticos, 
  generarReporteFarmaceuticos 
} from '@/lib/exportacion/reporteFarmaceuticos';

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
  const [exportandoFarma, setExportandoFarma] = useState(false);

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
          navigate('/');
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
    
    // Calcular tributos basados en categoría
    let tributosTotal = 0;
    paquetes.forEach(p => {
      if (p.categoriaAduanera === 'B') {
        tributosTotal += 2; // Tasa mínima de minimis
      } else if (p.categoriaAduanera === 'C') {
        tributosTotal += (p.valorUSD || 0) * 0.17 + 2; // DAI + ITBMS + tasa
      } else if (p.categoriaAduanera === 'D') {
        tributosTotal += (p.valorUSD || 0) * 0.25 + 2; // Mayor tributo
      }
    });

    const totalCobrar = valorCIFTotal + tributosTotal;

    // Distribución por valor
    const menorA100 = paquetes.filter(p => (p.valorUSD || 0) <= 100);
    const mayorA100 = paquetes.filter(p => (p.valorUSD || 0) > 100);

    return { 
      totalPaquetes, 
      valorCIFTotal, 
      tributosTotal, 
      totalCobrar,
      menorA100: {
        cantidad: menorA100.length,
        porcentaje: totalPaquetes > 0 ? Math.round((menorA100.length / totalPaquetes) * 100) : 0,
        valorTotal: menorA100.reduce((sum, p) => sum + (p.valorUSD || 0), 0)
      },
      mayorA100: {
        cantidad: mayorA100.length,
        porcentaje: totalPaquetes > 0 ? Math.round((mayorA100.length / totalPaquetes) * 100) : 0,
        valorTotal: mayorA100.reduce((sum, p) => sum + (p.valorUSD || 0), 0)
      }
    };
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

  // Paquetes separados por lote
  const loteA = useMemo(() => paquetes.filter(p => (p.valorUSD || 0) <= 100), [paquetes]);
  const loteB = useMemo(() => paquetes.filter(p => (p.valorUSD || 0) > 100), [paquetes]);
  const conRestricciones = useMemo(() => paquetes.filter(p => p.requierePermiso), [paquetes]);
  
  // Productos farmacéuticos
  const productosFarmaceuticos = useMemo(() => {
    // Convertir FilaProcesada a ManifestRow para la función
    const paquetesParaAnalisis = paquetes.map(p => ({
      trackingNumber: p.tracking || '',
      recipient: p.destinatario || '',
      identification: p.identificacion || '',
      phone: p.telefono || '',
      address: p.direccion || '',
      description: p.descripcion || '',
      valueUSD: p.valorUSD || 0,
      weight: p.peso || 0,
      province: p.provincia || '',
      city: p.ciudad || '',
      district: (p as any).distrito || '',
      detectedProvince: p.provincia,
      detectedCity: p.ciudad,
      email: (p as any).email || '',
      codigoArancelario: (p as any).codigoArancelario || '',
      amazonTracking: (p as any).amazonTracking || ''
    }));
    return extraerProductosFarmaceuticos(paquetesParaAnalisis as any, []);
  }, [paquetes]);

  // Filtrar paquetes
  const paquetesFiltrados = useMemo(() => {
    return paquetes.filter(p => {
      if (busqueda) {
        const busquedaLower = busqueda.toLowerCase();
        const coincide = 
          p.tracking?.toLowerCase().includes(busquedaLower) ||
          p.destinatario?.toLowerCase().includes(busquedaLower) ||
          p.descripcion?.toLowerCase().includes(busquedaLower);
        if (!coincide) return false;
      }

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

  // Exportar Excel con distribución por lotes
  const handleDescargarExcel = async () => {
    if (!manifiesto) return;

    setExportando(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // HOJA 1: Resumen
      const resumen = [
        ['RESUMEN DEL MANIFIESTO'],
        [''],
        ['MAWB:', manifiesto.mawb || 'No detectado'],
        ['Fecha Proceso:', manifiesto.fechaProcesamiento ? new Date(manifiesto.fechaProcesamiento).toLocaleString() : 'N/A'],
        ['Total Paquetes:', metricas.totalPaquetes],
        [''],
        ['ESTADÍSTICAS POR CATEGORÍA'],
        ['Categoría A (Documentos):', paquetes.filter(p => p.categoriaAduanera === 'A').length],
        ['Categoría B (De Minimis ≤$100):', paquetes.filter(p => p.categoriaAduanera === 'B').length],
        ['Categoría C (Bajo Valor):', paquetes.filter(p => p.categoriaAduanera === 'C').length],
        ['Categoría D (Alto Valor):', paquetes.filter(p => p.categoriaAduanera === 'D').length],
        ['Con Restricciones:', conRestricciones.length],
        [''],
        ['DISTRIBUCIÓN POR VALOR'],
        ['Menores a $100:', metricas.menorA100.cantidad, `(${metricas.menorA100.porcentaje}%)`],
        ['Mayores a $100:', metricas.mayorA100.cantidad, `(${metricas.mayorA100.porcentaje}%)`],
        [''],
        ['FINANCIERO'],
        ['Valor CIF Total:', `$${metricas.valorCIFTotal.toFixed(2)}`],
        ['Tributos Total:', `$${metricas.tributosTotal.toFixed(2)}`],
        ['Total a Cobrar:', `$${metricas.totalCobrar.toFixed(2)}`]
      ];
      
      const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
      wsResumen['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
      
      // HOJA 2: Lote A (< $100)
      if (loteA.length > 0) {
        const datosLoteA = [
          ['LOTE A - PAQUETES MENORES A $100 USD'],
          [''],
          ['#', 'Guía', 'Consignatario', 'Dirección', 'Descripción', 'Categoría', 'Valor CIF']
        ];
        
        loteA.forEach((paq, idx) => {
          datosLoteA.push([
            (idx + 1).toString(),
            paq.tracking || '',
            paq.destinatario || '',
            paq.direccion || '',
            (paq.descripcion || '').substring(0, 50),
            paq.categoriaAduanera || '',
            `$${(paq.valorUSD || 0).toFixed(2)}`
          ]);
        });
        
        datosLoteA.push([]);
        datosLoteA.push(['TOTAL', '', '', '', '', '', `$${metricas.menorA100.valorTotal.toFixed(2)}`]);
        
        const wsLoteA = XLSX.utils.aoa_to_sheet(datosLoteA);
        wsLoteA['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsLoteA, 'Lote A (<$100)');
      }
      
      // HOJA 3: Lote B (> $100)
      if (loteB.length > 0) {
        const datosLoteB = [
          ['LOTE B - PAQUETES MAYORES A $100 USD'],
          [''],
          ['#', 'Guía', 'Consignatario', 'Dirección', 'Descripción', 'Categoría', 'Valor CIF']
        ];
        
        loteB.forEach((paq, idx) => {
          datosLoteB.push([
            (idx + 1).toString(),
            paq.tracking || '',
            paq.destinatario || '',
            paq.direccion || '',
            (paq.descripcion || '').substring(0, 50),
            paq.categoriaAduanera || '',
            `$${(paq.valorUSD || 0).toFixed(2)}`
          ]);
        });
        
        datosLoteB.push([]);
        datosLoteB.push(['TOTAL', '', '', '', '', '', `$${metricas.mayorA100.valorTotal.toFixed(2)}`]);
        
        const wsLoteB = XLSX.utils.aoa_to_sheet(datosLoteB);
        wsLoteB['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsLoteB, 'Lote B (>$100)');
      }
      
      // HOJA 4: Productos con Restricciones
      if (conRestricciones.length > 0) {
        const datosRestricciones = [
          ['PRODUCTOS CON RESTRICCIONES'],
          [''],
          ['#', 'Guía', 'Descripción', 'Categoría', 'Autoridades', 'Valor']
        ];
        
        conRestricciones.forEach((paq, idx) => {
          datosRestricciones.push([
            (idx + 1).toString(),
            paq.tracking || '',
            (paq.descripcion || '').substring(0, 50),
            paq.categoria || paq.categoriaAduanera || '',
            (paq.autoridades || []).join(', '),
            `$${(paq.valorUSD || 0).toFixed(2)}`
          ]);
        });
        
        const wsRestricciones = XLSX.utils.aoa_to_sheet(datosRestricciones);
        wsRestricciones['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsRestricciones, 'Restricciones');
      }
      
      // Generar y descargar
      const mawbClean = (manifiesto.mawb || 'SIN_MAWB').replace(/[^a-zA-Z0-9-]/g, '_');
      XLSX.writeFile(wb, `Manifiesto_${mawbClean}_${Date.now()}.xlsx`);

      toast({
        title: '✅ Excel generado',
        description: 'El archivo se ha descargado correctamente'
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

  // Descargar reporte farmacéuticos MINSA
  const handleDescargarFarmaceuticos = async () => {
    if (!manifiesto || productosFarmaceuticos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin productos farmacéuticos',
        description: 'No se detectaron productos farmacéuticos en este manifiesto'
      });
      return;
    }

    setExportandoFarma(true);
    try {
      const paquetesParaAnalisis = paquetes.map(p => ({
        trackingNumber: p.tracking || '',
        recipient: p.destinatario || '',
        identification: p.identificacion || '',
        phone: p.telefono || '',
        address: p.direccion || '',
        description: p.descripcion || '',
        valueUSD: p.valorUSD || 0,
        weight: p.peso || 0,
        province: p.provincia || '',
        city: p.ciudad || '',
        district: (p as any).distrito || '',
        detectedProvince: p.provincia,
        detectedCity: p.ciudad,
        email: (p as any).email || '',
        codigoArancelario: (p as any).codigoArancelario || '',
        amazonTracking: (p as any).amazonTracking || ''
      }));

      const blob = await generarReporteFarmaceuticos(
        paquetesParaAnalisis as any, 
        [], 
        manifiesto.mawb || 'SIN_MAWB'
      );
      
      const mawbClean = (manifiesto.mawb || 'SIN_MAWB').replace(/[^a-zA-Z0-9-]/g, '_');
      const fechaHoy = new Date().toISOString().split('T')[0];
      saveAs(blob, `Reporte_Farmaceuticos_MINSA_${mawbClean}_${fechaHoy}.xlsx`);

      toast({
        title: '✅ Reporte MINSA generado',
        description: `Se encontraron ${productosFarmaceuticos.length} productos farmacéuticos`
      });
    } catch (error) {
      console.error('Error exportando farmacéuticos:', error);
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo generar el reporte farmacéutico'
      });
    } finally {
      setExportandoFarma(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                {manifiesto?.mawb || manifiestoId}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Procesado: {manifiesto?.fechaProcesamiento 
                ? new Date(manifiesto.fechaProcesamiento).toLocaleString() 
                : 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {productosFarmaceuticos.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleDescargarFarmaceuticos} 
              disabled={exportandoFarma}
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              {exportandoFarma ? (
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Pill className="mr-2 h-4 w-4" />
              )}
              Reporte MINSA ({productosFarmaceuticos.length})
            </Button>
          )}
          
          <Button onClick={handleDescargarExcel} disabled={exportando}>
            {exportando ? (
              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar Excel
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paquetes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalPaquetes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor CIF Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${metricas.valorCIFTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tributos Total</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total a Cobrar</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${metricas.totalCobrar.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Valor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lote A - Menores a $100</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {metricas.menorA100.cantidad} paquetes
              </Badge>
            </CardTitle>
            <CardDescription>
              {metricas.menorA100.porcentaje}% del total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">${metricas.menorA100.valorTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lote B - Mayores a $100</span>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {metricas.mayorA100.cantidad} paquetes
              </Badge>
            </CardTitle>
            <CardDescription>
              {metricas.mayorA100.porcentaje}% del total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">${metricas.mayorA100.valorTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pastel */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría Aduanera</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {datosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosGrafico}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
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
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Productos con Restricciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conRestricciones.length === 0 ? (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  No hay productos con restricciones en este manifiesto
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {conRestricciones.slice(0, 5).map((paq, idx) => (
                  <Alert key={idx} className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200">{paq.tracking}</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                      {paq.descripcion?.substring(0, 50)}... - Autoridades: {(paq.autoridades || []).join(', ') || 'N/A'}
                    </AlertDescription>
                  </Alert>
                ))}
                {conRestricciones.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{conRestricciones.length - 5} más...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs con Tablas por Lote */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Paquetes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="loteA" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="loteA">
                Lote A ({loteA.length})
              </TabsTrigger>
              <TabsTrigger value="loteB">
                Lote B ({loteB.length})
              </TabsTrigger>
              <TabsTrigger value="restricciones">
                Restricciones ({conRestricciones.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="loteA">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Guía</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteA.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No hay paquetes en este lote
                        </TableCell>
                      </TableRow>
                    ) : (
                      loteA.slice(0, 20).map((paq, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{paq.tracking}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{paq.descripcion}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{paq.categoriaAduanera || 'B'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(paq.valorUSD || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {loteA.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 20 de {loteA.length} paquetes. Descarga el Excel para ver todos.
                </p>
              )}
            </TabsContent>

            <TabsContent value="loteB">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Guía</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteB.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No hay paquetes en este lote
                        </TableCell>
                      </TableRow>
                    ) : (
                      loteB.slice(0, 20).map((paq, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{paq.tracking}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{paq.descripcion}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{paq.categoriaAduanera || 'D'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(paq.valorUSD || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {loteB.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 20 de {loteB.length} paquetes. Descarga el Excel para ver todos.
                </p>
              )}
            </TabsContent>

            <TabsContent value="restricciones">
              {conRestricciones.length === 0 ? (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    No hay productos con restricciones en este manifiesto
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Guía</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Categoría Producto</TableHead>
                        <TableHead>Autoridades</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conRestricciones.map((paq, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{paq.tracking}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{paq.descripcion}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{paq.categoria || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {(paq.autoridades || []).join(', ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(paq.valorUSD || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
