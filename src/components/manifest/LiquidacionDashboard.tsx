// ============================================
// DASHBOARD DE LIQUIDACIÓN ADUANERA
// Visualización y gestión de liquidaciones
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Calculator,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Shield,
  Download,
  Filter,
  Search,
  ChevronRight,
  Info,
  XCircle,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { Liquidacion, ResumenLiquidacion, CategoriaAduanera } from '@/types/aduanas';
import { ManifestRow } from '@/types/manifest';
import { Input } from '@/components/ui/input';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LiquidacionDashboardProps {
  liquidaciones: Liquidacion[];
  resumen: ResumenLiquidacion;
  paquetes?: ManifestRow[];
  mawb?: string;
  onExportarLiquidaciones?: () => void;
  onExportarResumen?: () => void;
}

// Colores por categoría
const CATEGORIA_COLORS: Record<CategoriaAduanera, { bg: string; text: string; label: string; chartColor: string }> = {
  'A': { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Documentos', chartColor: '#64748b' },
  'B': { bg: 'bg-green-100', text: 'text-green-700', label: 'De Minimis', chartColor: '#22c55e' },
  'C': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bajo Valor', chartColor: '#3b82f6' },
  'D': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Alto Valor', chartColor: '#f59e0b' }
};


// Colores por estado
const ESTADO_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  'pendiente_revision': { variant: 'secondary', label: 'Pendiente Revisión' },
  'pendiente_hs_code': { variant: 'secondary', label: 'Pendiente HS Code' },
  'calculada': { variant: 'default', label: 'Calculada' },
  'aprobada': { variant: 'default', label: 'Aprobada' },
  'pagada': { variant: 'default', label: 'Pagada' },
  'liberada': { variant: 'outline', label: 'Liberada' },
  'en_revision_manual': { variant: 'destructive', label: 'Revisión Manual' }
};

export function LiquidacionDashboard({ 
  liquidaciones, 
  resumen,
  paquetes,
  mawb,
  onExportarLiquidaciones,
  onExportarResumen
}: LiquidacionDashboardProps) {
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaAduanera | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [tabActiva, setTabActiva] = useState('resumen');
  
  // Filtrar liquidaciones
  const liquidacionesFiltradas = useMemo(() => {
    return liquidaciones.filter(liq => {
      const matchCategoria = filtroCategoria === 'todas' || liq.categoriaAduanera === filtroCategoria;
      const matchBusqueda = busqueda === '' || 
        liq.numeroGuia.toLowerCase().includes(busqueda.toLowerCase());
      return matchCategoria && matchBusqueda;
    });
  }, [liquidaciones, filtroCategoria, busqueda]);
  
  // Estadísticas por categoría
  const estadisticasCategorias = useMemo(() => {
    return Object.entries(resumen.porCategoria).map(([cat, data]) => ({
      categoria: cat as CategoriaAduanera,
      ...CATEGORIA_COLORS[cat as CategoriaAduanera],
      cantidad: data.cantidad,
      valor: data.valor,
      porcentaje: resumen.totalPaquetes > 0 
        ? Math.round((data.cantidad / resumen.totalPaquetes) * 100) 
        : 0
    }));
  }, [resumen]);
  
  // Datos para gráfico de pastel por categoría
  const pieChartData = useMemo(() => {
    return Object.entries(resumen.porCategoria)
      .filter(([_, data]) => data.cantidad > 0)
      .map(([cat, data]) => ({
        name: `Cat. ${cat} - ${CATEGORIA_COLORS[cat as CategoriaAduanera].label}`,
        value: data.cantidad,
        color: CATEGORIA_COLORS[cat as CategoriaAduanera].chartColor,
        monto: liquidaciones
          .filter(l => l.categoriaAduanera === cat)
          .reduce((sum, l) => sum + l.totalAPagar, 0)
      }));
  }, [resumen, liquidaciones]);
  
  // Datos para gráfico de barras de tributos
  const tributosData = useMemo(() => {
    const totalDAI = liquidaciones.reduce((s, l) => s + l.montoDAI, 0);
    const totalISC = liquidaciones.reduce((s, l) => s + l.montoISC, 0);
    const totalITBMS = liquidaciones.reduce((s, l) => s + l.montoITBMS, 0);
    const totalTasas = liquidaciones.reduce((s, l) => s + l.tasaAduanera, 0);
    
    return [
      { nombre: 'DAI', monto: totalDAI, fill: '#3b82f6' },
      { nombre: 'ISC', monto: totalISC, fill: '#f59e0b' },
      { nombre: 'ITBMS', monto: totalITBMS, fill: '#22c55e' },
      { nombre: 'Tasas', monto: totalTasas, fill: '#8b5cf6' }
    ];
  }, [liquidaciones]);
  
  
  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Liquidación Aduanera</h2>
            <p className="text-sm text-muted-foreground">
              {resumen.totalPaquetes.toLocaleString()} paquetes procesados
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onExportarResumen && (
            <Button variant="outline" onClick={onExportarResumen} className="gap-2">
              <FileText className="w-4 h-4" />
              Exportar Resumen
            </Button>
          )}
          {onExportarLiquidaciones && (
            <Button onClick={onExportarLiquidaciones} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Liquidaciones
            </Button>
          )}
        </div>
      </div>
      
      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor CIF Total</p>
                <p className="text-2xl font-bold text-foreground">
                  ${resumen.totalValorCIF.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tributos</p>
                <p className="text-2xl font-bold text-foreground">
                  ${resumen.totalTributos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Calculator className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-2xl font-bold text-foreground">
                  ${resumen.totalAPagar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requieren Revisión</p>
                <p className="text-2xl font-bold text-foreground">
                  {resumen.requierenRevision}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resumen.conRestricciones} con restricciones
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Distribución por categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Distribución por Categoría Aduanera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {estadisticasCategorias.map((cat) => (
              <button
                key={cat.categoria}
                onClick={() => setFiltroCategoria(cat.categoria)}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  filtroCategoria === cat.categoria 
                    ? 'border-primary shadow-md' 
                    : 'border-transparent'
                } ${cat.bg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xl font-bold ${cat.text}`}>
                    Cat. {cat.categoria}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {cat.porcentaje}%
                  </Badge>
                </div>
                <p className={`text-sm font-medium ${cat.text}`}>{cat.label}</p>
                <p className="text-2xl font-bold mt-1">{cat.cantidad.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  ${cat.valor.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </button>
            ))}
          </div>
          {filtroCategoria !== 'todas' && (
            <div className="mt-4 flex justify-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFiltroCategoria('todas')}
              >
                Mostrar todas las categorías
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs de contenido */}
      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumen" className="gap-2">
            <FileText className="w-4 h-4" />
            Resumen Fiscal
          </TabsTrigger>
          <TabsTrigger value="detalle" className="gap-2">
            <Calculator className="w-4 h-4" />
            Detalle Liquidaciones
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas ({resumen.requierenRevision})
          </TabsTrigger>
        </TabsList>
        
        {/* Tab: Resumen Fiscal */}
        <TabsContent value="resumen" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desglose de impuestos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Desglose de Tributos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DesgloseTributo 
                    label="DAI (Derecho Arancelario)" 
                    monto={liquidaciones.reduce((sum, l) => sum + l.montoDAI, 0)}
                    porcentaje="Variable"
                    descripcion="Arancel según clasificación HS"
                  />
                  <DesgloseTributo 
                    label="ISC (Impuesto Selectivo)" 
                    monto={liquidaciones.reduce((sum, l) => sum + l.montoISC, 0)}
                    porcentaje="Variable"
                    descripcion="Solo para productos específicos"
                  />
                  <DesgloseTributo 
                    label="ITBMS" 
                    monto={liquidaciones.reduce((sum, l) => sum + l.montoITBMS, 0)}
                    porcentaje="7%"
                    descripcion="Impuesto sobre CIF + DAI + ISC"
                  />
                  <DesgloseTributo 
                    label="Tasa Aduanera" 
                    monto={liquidaciones.reduce((sum, l) => sum + l.tasaAduanera, 0)}
                    porcentaje="$2.00/paq"
                    descripcion="Tasa de servicio courier"
                  />
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">TOTAL TRIBUTOS</span>
                      <span className="font-bold text-xl text-primary">
                        ${resumen.totalTributos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Cascada fiscal ejemplo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cascada Fiscal (Ejemplo)</CardTitle>
              </CardHeader>
              <CardContent>
                <CascadaFiscalEjemplo />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab: Detalle */}
        <TabsContent value="detalle" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Liquidaciones Individuales</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por guía..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guía</TableHead>
                      <TableHead>Cat.</TableHead>
                      <TableHead className="text-right">CIF</TableHead>
                      <TableHead className="text-right">DAI</TableHead>
                      <TableHead className="text-right">ISC</TableHead>
                      <TableHead className="text-right">ITBMS</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liquidacionesFiltradas.slice(0, 100).map((liq) => (
                      <TableRow key={liq.id}>
                        <TableCell className="font-mono text-sm">
                          {liq.numeroGuia}
                          {liq.tieneRestricciones && (
                            <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={`${CATEGORIA_COLORS[liq.categoriaAduanera].bg} ${CATEGORIA_COLORS[liq.categoriaAduanera].text}`}
                          >
                            {liq.categoriaAduanera}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.valorCIF.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.montoDAI.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.montoISC.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.montoITBMS.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${liq.totalAPagar.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ESTADO_BADGES[liq.estado]?.variant || 'secondary'}>
                            {ESTADO_BADGES[liq.estado]?.label || liq.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {liquidacionesFiltradas.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Mostrando 100 de {liquidacionesFiltradas.length} liquidaciones
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Paquetes que Requieren Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resumen.requierenRevision === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">Todo en orden</p>
                  <p className="text-sm text-muted-foreground">
                    No hay paquetes que requieran revisión manual
                  </p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {/* Productos con restricciones */}
                  {resumen.conRestricciones > 0 && (
                    <AccordionItem value="restricciones" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-red-500" />
                          <span>Productos con Restricciones</span>
                          <Badge variant="destructive">{resumen.conRestricciones}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {liquidaciones
                            .filter(l => l.tieneRestricciones)
                            .slice(0, 20)
                            .map((liq) => (
                              <div 
                                key={liq.id}
                                className="p-3 bg-red-50 rounded-lg border border-red-200"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-medium">{liq.numeroGuia}</span>
                                  <Badge variant="outline" className="text-red-600 border-red-300">
                                    ${liq.valorCIF.toFixed(2)}
                                  </Badge>
                                </div>
                                <div className="mt-2 space-y-1">
                                  {liq.restricciones.map((r, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="font-medium text-red-700">{r.autoridad}:</span>
                                        <span className="text-red-600 ml-1">{r.mensaje}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {/* Alto valor (Categoría D) */}
                  {resumen.porCategoria.D.cantidad > 0 && (
                    <AccordionItem value="alto-valor" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-amber-500" />
                          <span>Alto Valor (Requiere Corredor)</span>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            {resumen.porCategoria.D.cantidad}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {liquidaciones
                            .filter(l => l.categoriaAduanera === 'D')
                            .slice(0, 20)
                            .map((liq) => (
                              <div 
                                key={liq.id}
                                className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-mono font-medium">{liq.numeroGuia}</span>
                                  <p className="text-sm text-amber-700 mt-1">
                                    {liq.motivoRevisionManual}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  ${liq.valorCIF.toFixed(2)}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {/* Pendientes HS Code */}
                  {resumen.pendientesHSCode > 0 && (
                    <AccordionItem value="hs-code" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <span>Clasificación Arancelaria Pendiente</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            {resumen.pendientesHSCode}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            Estos paquetes tienen clasificación genérica. Revise la descripción
                            para asignar el código HS correcto.
                          </p>
                          {liquidaciones
                            .filter(l => l.hsCode === '9999.99.99')
                            .slice(0, 20)
                            .map((liq) => {
                              // Buscar la descripción del paquete original
                              const paqueteOriginal = paquetes?.find(
                                p => p.trackingNumber === liq.numeroGuia
                              );
                              const descripcionProducto = paqueteOriginal?.description || liq.descripcionArancelaria || 'Sin descripción';
                              
                              return (
                                <div 
                                  key={liq.id}
                                  className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-medium">{liq.numeroGuia}</span>
                                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                                      HS: {liq.hsCode}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-foreground mt-2">
                                    {descripcionProducto}
                                  </p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    Tasas estándar aplicadas (DAI: 15%, ITBMS: 7%)
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para desglose de tributo
function DesgloseTributo({ 
  label, 
  monto, 
  porcentaje, 
  descripcion 
}: { 
  label: string; 
  monto: number; 
  porcentaje: string;
  descripcion: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      </div>
      <div className="text-right">
        <p className="font-mono font-bold">
          ${monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground">{porcentaje}</p>
      </div>
    </div>
  );
}

// Cascada fiscal visual ejemplo
function CascadaFiscalEjemplo() {
  const ejemplo = {
    fob: 150.00,
    flete: 18.00,
    seguro: 2.52,
    cif: 170.52,
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7
  };
  
  const dai = ejemplo.cif * (ejemplo.daiPercent / 100);
  const baseIsc = ejemplo.cif + dai;
  const isc = baseIsc * (ejemplo.iscPercent / 100);
  const baseItbms = ejemplo.cif + dai + isc;
  const itbms = baseItbms * (ejemplo.itbmsPercent / 100);
  const tasa = 2.00;
  const total = dai + isc + itbms + tasa;
  
  return (
    <div className="space-y-3 text-sm">
      <div className="p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-muted-foreground mb-2">Valor Declarado</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs">FOB</p>
            <p className="font-mono font-medium">${ejemplo.fob.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs">Flete</p>
            <p className="font-mono font-medium">${ejemplo.flete.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs">Seguro</p>
            <p className="font-mono font-medium">${ejemplo.seguro.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
      </div>
      
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center">
          <span className="font-medium">CIF (Base Imponible)</span>
          <span className="font-mono font-bold text-blue-700">${ejemplo.cif.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="space-y-2 pl-4 border-l-2 border-dashed border-muted">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">DAI ({ejemplo.daiPercent}% de CIF)</span>
          <span className="font-mono">${dai.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">ISC ({ejemplo.iscPercent}% de CIF+DAI)</span>
          <span className="font-mono">${isc.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">ITBMS ({ejemplo.itbmsPercent}% de CIF+DAI+ISC)</span>
          <span className="font-mono">${itbms.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Tasa Aduanera</span>
          <span className="font-mono">${tasa.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex justify-between items-center">
          <span className="font-bold">TOTAL TRIBUTOS</span>
          <span className="font-mono font-bold text-green-700">${total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex justify-between items-center">
          <span className="font-bold text-primary">TOTAL A PAGAR</span>
          <span className="font-mono font-bold text-primary">${(ejemplo.cif + total).toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">CIF + Tributos</p>
      </div>
    </div>
  );
}
