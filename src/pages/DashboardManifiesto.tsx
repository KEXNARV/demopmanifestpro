/**
 * DASHBOARD DE MANIFIESTO v3.0
 * 
 * Dashboard mejorado que muestra:
 * 1. Información del MAWB y aerolínea detectada
 * 2. Estadísticas generales
 * 3. Distribución automática por valor (según umbral configurable)
 * 4. Clasificación HTS de productos
 * 5. Tablas de paquetes por lote
 * 6. Exportación a Excel
 * 
 * H01 FIX: Usa ConfigService para umbrales
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, DollarSign, Calculator, Receipt, 
  Download, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, ArrowLeft, FileSpreadsheet,
  Plane, CheckCircle2, AlertCircle, TrendingUp, Pill, Barcode, Brain
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
import { GTINPanel } from '@/components/manifest/GTINPanel';
import { RevisionGTIN } from '@/components/manifest/RevisionGTIN';
import { extraerGTINsDeTexto } from '@/lib/gtin/gtinProcessor';
import { ManifestRow } from '@/types/manifest';
import { ConfigService } from '@/lib/config/ConfigService';
import { useAgenteAduanal } from '@/hooks/useAgenteAduanal';
import { PanelAgenteAduanal } from '@/components/manifest/PanelAgenteAduanal';
import { TableroPanelAprendizaje } from '@/components/manifest/TableroPanelAprendizaje';

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

  // Agente Aduanal AI
  const agenteAduanal = useAgenteAduanal();

  // Filtros y paginación
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [paginaActual, setPaginaActual] = useState(1);

  // Cargar datos y procesar con AI automáticamente
  useEffect(() => {
    if (!manifiestoId) return;

    const cargarDatos = async () => {
      setCargando(true);
      try {
        const man = await obtenerManifiesto(manifiestoId);
        const filas = await obtenerFilasPorManifiesto(manifiestoId);

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

        // Convertir a ManifestRow y procesar con AI automáticamente
        if (filas.length > 0) {
          const paquetesParaAI: ManifestRow[] = filas.map((p, idx) => ({
            id: `row-${idx}`,
            trackingNumber: p.tracking || '',
            description: p.descripcion || '',
            valueUSD: p.valorUSD || 0,
            weight: p.peso || 0,
            recipient: p.destinatario || '',
            address: p.direccion || '',
            originalRowIndex: idx,
            province: p.provincia || '',
            city: p.ciudad || '',
            identification: p.identificacion || '',
            phone: p.telefono || '',
          }));

          // Procesar con el Agente Aduanal AI
          agenteAduanal.procesarManifiesto(paquetesParaAI, manifiestoId, {
            fechaRegistro: new Date()
          });
        }
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

    // H01 FIX: Usar umbral desde ConfigService
    const umbral = ConfigService.getUmbralDeMinimis();
    
    // Distribución por valor usando umbral configurable
    const menorAUmbral = paquetes.filter(p => (p.valorUSD || 0) <= umbral);
    const mayorAUmbral = paquetes.filter(p => (p.valorUSD || 0) > umbral);

    return { 
      totalPaquetes, 
      valorCIFTotal, 
      tributosTotal, 
      totalCobrar,
      umbral, // Incluir umbral en estadísticas
      menorAUmbral: {
        cantidad: menorAUmbral.length,
        porcentaje: totalPaquetes > 0 ? Math.round((menorAUmbral.length / totalPaquetes) * 100) : 0,
        valorTotal: menorAUmbral.reduce((sum, p) => sum + (p.valorUSD || 0), 0)
      },
      mayorAUmbral: {
        cantidad: mayorAUmbral.length,
        porcentaje: totalPaquetes > 0 ? Math.round((mayorAUmbral.length / totalPaquetes) * 100) : 0,
        valorTotal: mayorAUmbral.reduce((sum, p) => sum + (p.valorUSD || 0), 0)
      }
    };
  }, [paquetes]);

  // Datos para gráfico de pastel
  const datosGrafico = useMemo(() => {
    const conteo: Record<string, number> = {};
    const umbral = ConfigService.getUmbralDeMinimis();
    const umbralCorredor = ConfigService.getUmbralCorredorObligatorio();
    
    paquetes.forEach(p => {
      const cat = p.categoriaAduanera || 'Sin Clasificar';
      conteo[cat] = (conteo[cat] || 0) + 1;
    });

    return Object.entries(conteo).map(([name, value]) => ({
      name: name === 'A' ? 'A - Documentos' :
            name === 'B' ? `B - De Minimis (≤$${umbral})` :
            name === 'C' ? `C - Medio ($${umbral}-$${umbralCorredor})` :
            name === 'D' ? `D - Alto (≥$${umbralCorredor})` : name,
      value,
      color: COLORES_CATEGORIA[name] || COLORES_CATEGORIA['Sin Clasificar']
    }));
  }, [paquetes]);

  // Paquetes separados por lote - H01 FIX: Usar umbral configurable
  const umbral = ConfigService.getUmbralDeMinimis();
  const loteA = useMemo(() => paquetes.filter(p => (p.valorUSD || 0) <= umbral), [paquetes, umbral]);
  const loteB = useMemo(() => paquetes.filter(p => (p.valorUSD || 0) > umbral), [paquetes, umbral]);
  const conRestricciones = useMemo(() => paquetes.filter(p => p.requierePermiso), [paquetes]);

  // Descripciones para análisis GTIN
  const descripciones = useMemo(() => paquetes.map(p => p.descripcion || ''), [paquetes]);
  
  // Convertir paquetes a ManifestRow para revisión GTIN
  const [paquetesConGTIN, setPaquetesConGTIN] = useState<ManifestRow[]>([]);
  
  useEffect(() => {
    // Analizar GTIN en cada paquete
    const paquetesAnalizados = paquetes.map((p, idx) => {
      const gtinInfos = extraerGTINsDeTexto(p.descripcion || '');
      const gtinInvalidos = gtinInfos.filter(g => !g.valido);
      const gtinValido = gtinInfos.length === 0 || gtinInvalidos.length === 0;
      
      return {
        id: `row-${idx}`,
        trackingNumber: p.tracking || '',
        description: p.descripcion || '',
        valueUSD: p.valorUSD || 0,
        weight: p.peso || 0,
        recipient: p.destinatario || '',
        address: p.direccion || '',
        originalRowIndex: idx,
        gtinCodigos: gtinInfos.map(g => g.codigo),
        gtinValido,
        gtinErrores: gtinInvalidos.flatMap(g => g.errores),
        gtinPaisOrigen: gtinInfos.find(g => g.paisOrigen)?.paisOrigen,
        requiereRevisionGTIN: gtinInfos.length > 0 && !gtinValido,
      } as ManifestRow;
    });
    setPaquetesConGTIN(paquetesAnalizados);
  }, [paquetes]);
  
  // Conteo de GTINs encontrados y que requieren revisión
  const gtinsEncontrados = useMemo(() => {
    return paquetesConGTIN.filter(p => p.gtinCodigos && p.gtinCodigos.length > 0).length;
  }, [paquetesConGTIN]);
  
  const gtinsConProblemas = useMemo(() => {
    return paquetesConGTIN.filter(p => p.requiereRevisionGTIN).length;
  }, [paquetesConGTIN]);
  
  // Handlers para revisión GTIN
  const handleUpdateGTINRow = (rowId: string, updates: Partial<ManifestRow>) => {
    setPaquetesConGTIN(prev => 
      prev.map(row => row.id === rowId ? { ...row, ...updates } : row)
    );
  };
  
  const handleMarcarGTINRevisado = (rowId: string) => {
    setPaquetesConGTIN(prev =>
      prev.map(row => row.id === rowId ? { ...row, requiereRevisionGTIN: false } : row)
    );
  };
  
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

  // Exportar Excel consolidado con el nuevo sistema AI
  const handleDescargarExcel = async () => {
    if (!manifiesto) return;

    // Si hay resultado del Agente AI, usar firma digital
    if (agenteAduanal.resultado) {
      setExportando(true);
      try {
        // Abrir diálogo de firma digital del Panel Agente Aduanal
        // El usuario debe ir a la pestaña "Agente AI" y usar el botón de descarga
        toast({
          title: 'Usar Agente AI',
          description: 'Para descargar el Excel consolidado con firma digital, ve a la pestaña "Agente AI" y presiona "Descargar con Firma Digital".'
        });
      } finally {
        setExportando(false);
      }
      return;
    }

    // Fallback: generar Excel básico si no hay procesamiento AI
    setExportando(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // HOJA 1: Resumen
      const resumenData = [
        ['RESUMEN DEL MANIFIESTO - FORMATO CORREDOR'],
        [''],
        ['MAWB:', manifiesto.mawb || 'No detectado'],
        ['Fecha Proceso:', manifiesto.fechaProcesamiento ? new Date(manifiesto.fechaProcesamiento).toLocaleString() : 'N/A'],
        ['Total Paquetes:', metricas.totalPaquetes],
        [''],
        ['DISTRIBUCIÓN POR VALOR'],
        [`≤$${metricas.umbral} (De Minimis):`, metricas.menorAUmbral.cantidad, `(${metricas.menorAUmbral.porcentaje}%)`],
        [`>$${metricas.umbral} (Liquidación):`, metricas.mayorAUmbral.cantidad, `(${metricas.mayorAUmbral.porcentaje}%)`],
        [''],
        ['⚠️ NOTA: Para obtener el formato completo con clasificación HTS, RUC/Cédula y liquidación,'],
        ['procese el manifiesto con el Agente AI en la pestaña correspondiente.']
      ];
      
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
      
      // HOJA 2: Todos los paquetes
      const headerRow = ['#', 'GUIA', 'CONSIGNATARIO', 'DIRECCIÓN', 'DESCRIPCIÓN', 'CATEGORÍA', 'VALOR USD'];
      const datosCompletos = [headerRow];
      
      paquetes.forEach((paq, idx) => {
        datosCompletos.push([
          (idx + 1).toString(),
          paq.tracking || '',
          paq.destinatario || '',
          paq.direccion || '',
          (paq.descripcion || '').substring(0, 80),
          paq.categoriaAduanera || 'B',
          `$${(paq.valorUSD || 0).toFixed(2)}`
        ]);
      });
      
      const wsCompleto = XLSX.utils.aoa_to_sheet(datosCompletos);
      wsCompleto['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 35 }, { wch: 50 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsCompleto, 'Paquetes');
      
      const mawbClean = (manifiesto.mawb || 'SIN_MAWB').replace(/[^a-zA-Z0-9-]/g, '_');
      XLSX.writeFile(wb, `Manifiesto_Basico_${mawbClean}_${Date.now()}.xlsx`);

      toast({
        title: 'Excel básico generado',
        description: 'Para el formato completo con HTS y RUC, usa el Agente AI.'
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
            Reporte MINSA {productosFarmaceuticos.length > 0 && `(${productosFarmaceuticos.length})`}
          </Button>
          
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
              <span>Lote A - Menores o igual a ${metricas.umbral}</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {metricas.menorAUmbral.cantidad} paquetes
              </Badge>
            </CardTitle>
            <CardDescription>
              {metricas.menorAUmbral.porcentaje}% del total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">${metricas.menorAUmbral.valorTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lote B - Mayores a ${metricas.umbral}</span>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {metricas.mayorAUmbral.cantidad} paquetes
              </Badge>
            </CardTitle>
            <CardDescription>
              {metricas.mayorAUmbral.porcentaje}% del total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">${metricas.mayorAUmbral.valorTotal.toFixed(2)}</span>
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
          <Tabs defaultValue="agenteAI" className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-4">
              <TabsTrigger value="agenteAI" className="text-primary">
                <Brain className="h-3 w-3 mr-1" />
                Agente AI
              </TabsTrigger>
              <TabsTrigger value="loteA">
                Lote A ({loteA.length})
              </TabsTrigger>
              <TabsTrigger value="loteB">
                Lote B ({loteB.length})
              </TabsTrigger>
              <TabsTrigger value="farmaceuticos" className="text-red-600 dark:text-red-400">
                <Pill className="h-3 w-3 mr-1" />
                MINSA ({productosFarmaceuticos.length})
              </TabsTrigger>
              <TabsTrigger value="gtin">
                <Barcode className="h-3 w-3 mr-1" />
                GTIN {gtinsEncontrados > 0 && `(${gtinsEncontrados})`}
              </TabsTrigger>
              <TabsTrigger 
                value="gtin-revision" 
                className={gtinsConProblemas > 0 ? "text-amber-600 dark:text-amber-400" : ""}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Revisión GTIN
              </TabsTrigger>
              <TabsTrigger value="restricciones">
                Restricciones ({conRestricciones.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agenteAI">
              <PanelAgenteAduanal 
                agenteState={agenteAduanal} 
                mawb={manifiesto?.mawb}
              />
              <div className="mt-6">
                <TableroPanelAprendizaje />
              </div>
            </TabsContent>

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

            <TabsContent value="farmaceuticos">
              {productosFarmaceuticos.length === 0 ? (
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <Pill className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    No se detectaron productos farmacéuticos que requieran permiso MINSA en este manifiesto
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Guía</TableHead>
                        <TableHead>Consignatario</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Peso</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosFarmaceuticos.slice(0, 30).map((paq, idx) => (
                        <TableRow key={idx} className="bg-red-50/30 dark:bg-red-950/20">
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{paq.guiaAerea}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{paq.consignatario}</TableCell>
                          <TableCell className="max-w-[250px]">
                            <span className="text-red-700 dark:text-red-400 font-medium">
                              {paq.descripcionCompleta?.substring(0, 60)}{paq.descripcionCompleta && paq.descripcionCompleta.length > 60 ? '...' : ''}
                            </span>
                          </TableCell>
                          <TableCell>{paq.peso?.toFixed(2) || '0'} lb</TableCell>
                          <TableCell className="text-right font-medium">
                            ${(paq.valorUSD || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {productosFarmaceuticos.length > 30 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 30 de {productosFarmaceuticos.length} productos. Descarga el reporte MINSA para ver todos.
                </p>
              )}
            </TabsContent>

            <TabsContent value="gtin">
              <GTINPanel descripciones={descripciones} />
            </TabsContent>

            <TabsContent value="gtin-revision">
              <RevisionGTIN 
                rows={paquetesConGTIN}
                onUpdateRow={handleUpdateGTINRow}
                onMarcarRevisado={handleMarcarGTINRevisado}
              />
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
