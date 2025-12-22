import { useState, useMemo } from 'react';
import {
  Package,
  DollarSign,
  Weight,
  Users,
  TrendingUp,
  Download,
  FileDown,
  Pill,
  Leaf,
  Stethoscope,
  PawPrint,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Archive,
  Shield,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  FileWarning,
  AlertOctagon,
  Info,
  Globe,
  Mountain,
  Waves,
  Building2,
  Calculator,
} from 'lucide-react';
import { ProcessingConfig } from '@/types/manifest';
import { ExtendedProcessingResult } from '@/lib/excelProcessor';
import { ExportFile, generateExportFiles, downloadExportFile, downloadAllFilesAsZip, ExportConfig, MAWBExportInfo } from '@/lib/exportService';
import { COMPANY_INFO, REGULATORY_INFO, CONTACT_EMERGENCY, PHARMA_REQUIREMENTS } from '@/lib/companyConfig';
import { PROVINCIAS_PANAMA, ICONOS_REGION, COLORES_PROVINCIA, getRegiones } from '@/lib/panamaGeography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ConsigneeDashboard } from './ConsigneeDashboard';
import { LiquidacionDashboard } from './LiquidacionDashboard';
import { FarmaceuticosResumen } from './FarmaceuticosResumen';
import { FiltroSanitarioPanel } from './FiltroSanitarioPanel';
import { generarReporteConsolidado } from '@/lib/aduanas/reporteConsolidado';
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

interface MAWBInfo {
  mawb: string;
  airlineCode: string;
  airlineName: string;
  sequenceNumber: string;
  formatted: string;
  isValid: boolean;
}

interface VisualDashboardProps {
  result: ExtendedProcessingResult;
  config: ProcessingConfig;
  mawbInfo: MAWBInfo | null;
  onReset: () => void;
}

const COLORS = {
  primary: 'hsl(217, 91%, 60%)',
  secondary: 'hsl(142, 71%, 45%)',
  warning: 'hsl(38, 92%, 50%)',
  danger: 'hsl(0, 84%, 60%)',
  purple: 'hsl(262, 83%, 58%)',
  cyan: 'hsl(187, 85%, 43%)',
  gray: 'hsl(215, 16%, 47%)',
};

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  medication: { icon: Pill, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
  supplements: { icon: Leaf, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  medical: { icon: Stethoscope, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  veterinary: { icon: PawPrint, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  general: { icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
};

export function VisualDashboard({ result, config, mawbInfo, onReset }: VisualDashboardProps) {
  const { summary, consigneeMap, consigneeStats, consolidatedDeliveries, liquidaciones, resumenLiquidacion } = result;
  const allRows = result.batches.flatMap(b => b.rows);

  // Convert MAWBInfo to MAWBExportInfo (use default if no MAWB)
  const mawbExportInfo: MAWBExportInfo = mawbInfo ? {
    mawb: mawbInfo.mawb,
    airlineCode: mawbInfo.airlineCode,
    airlineName: mawbInfo.airlineName,
    formatted: mawbInfo.formatted,
  } : {
    mawb: 'SIN-MAWB',
    airlineCode: '000',
    airlineName: 'No especificada',
    formatted: 'SIN MAWB',
  };

  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeDate: false,
    generateByProvince: false,
    generateByCity: false,
    generateByWeight: false,
    generateHighValue: false,
    generateHeavyWeight: false,
  });
  const [showOptionalFiles, setShowOptionalFiles] = useState(false);

  const exportFiles = useMemo(() => 
    generateExportFiles(result, config, exportConfig, mawbExportInfo),
    [result, config, exportConfig, mawbExportInfo]
  );

  const mainFiles = exportFiles.filter(f => !f.isOptional);
  const optionalFiles = exportFiles.filter(f => f.isOptional);

  // Calculate metrics
  const totalWeight = allRows.reduce((sum, r) => sum + r.weight, 0);
  const avgValue = summary.totalValue / summary.totalRows || 0;
  const avgWeight = totalWeight / summary.totalRows || 0;
  const consolidationRate = (consigneeStats.consolidatablePackages / summary.totalRows * 100) || 0;
  const tripsReduced = consigneeStats.consolidatablePackages - consigneeStats.consolidatableConsignees;

  // Value distribution data
  const valueDistribution = [
    { name: '< $100', value: allRows.filter(r => r.valueUSD < 100).length, color: COLORS.primary },
    { name: '≥ $100', value: allRows.filter(r => r.valueUSD >= 100).length, color: COLORS.secondary },
  ];

  // Category distribution data
  const categoryDistribution = config.categories.map(cat => ({
    name: cat.name.split(' ')[0],
    fullName: cat.name,
    value: summary.byProductCategory[cat.id] || 0,
    percentage: ((summary.byProductCategory[cat.id] || 0) / summary.totalRows * 100).toFixed(1),
  }));

  // Province distribution data (using detected provinces)
  const provinceData = useMemo(() => {
    const byProvince = new Map<string, { count: number; value: number; weight: number }>();
    allRows.forEach(row => {
      const province = row.detectedProvince || row.province || 'Sin Provincia';
      const current = byProvince.get(province) || { count: 0, value: 0, weight: 0 };
      byProvince.set(province, {
        count: current.count + 1,
        value: current.value + row.valueUSD,
        weight: current.weight + row.weight,
      });
    });
    return Array.from(byProvince.entries())
      .map(([name, data]) => ({
        name,
        value: data.count,
        totalValue: data.value,
        totalWeight: data.weight,
        percentage: ((data.count / summary.totalRows) * 100).toFixed(1),
        color: COLORES_PROVINCIA[name] || 'hsl(215, 16%, 47%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [allRows, summary.totalRows]);

  // Region distribution data
  const regionData = useMemo(() => {
    const byRegion = new Map<string, { count: number; value: number; weight: number }>();
    allRows.forEach(row => {
      const region = row.detectedRegion || 'Sin Región';
      const current = byRegion.get(region) || { count: 0, value: 0, weight: 0 };
      byRegion.set(region, {
        count: current.count + 1,
        value: current.value + row.valueUSD,
        weight: current.weight + row.weight,
      });
    });
    return Array.from(byRegion.entries())
      .map(([name, data]) => ({
        name,
        value: data.count,
        totalValue: data.value,
        totalWeight: data.weight,
        percentage: ((data.count / summary.totalRows) * 100).toFixed(1),
        icon: ICONOS_REGION[name] || '📍',
      }))
      .sort((a, b) => b.value - a.value);
  }, [allRows, summary.totalRows]);

  // City distribution data (top 10)
  const cityData = useMemo(() => {
    const byCity = new Map<string, { count: number; province: string; value: number }>();
    allRows.forEach(row => {
      const city = row.detectedCity || row.city || 'Sin Ciudad';
      const province = row.detectedProvince || row.province || '';
      const current = byCity.get(city) || { count: 0, province, value: 0 };
      byCity.set(city, {
        count: current.count + 1,
        province: province || current.province,
        value: current.value + row.valueUSD,
      });
    });
    return Array.from(byCity.entries())
      .map(([name, data]) => ({
        name,
        value: data.count,
        province: data.province,
        totalValue: data.value,
        percentage: ((data.count / summary.totalRows) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [allRows, summary.totalRows]);

  // Geographic detection stats
  const geoStats = useMemo(() => {
    const detected = allRows.filter(r => r.geoConfidence && r.geoConfidence > 0).length;
    const highConfidence = allRows.filter(r => r.geoConfidence && r.geoConfidence >= 70).length;
    const mediumConfidence = allRows.filter(r => r.geoConfidence && r.geoConfidence >= 40 && r.geoConfidence < 70).length;
    const lowConfidence = allRows.filter(r => r.geoConfidence && r.geoConfidence > 0 && r.geoConfidence < 40).length;
    const notDetected = allRows.length - detected;
    return { detected, highConfidence, mediumConfidence, lowConfidence, notDetected };
  }, [allRows]);

  // Weight distribution
  const weightDistribution = useMemo(() => {
    const ranges = [
      { name: 'Ligero (< 5lb)', min: 0, max: 5 },
      { name: 'Medio (5-15lb)', min: 5, max: 15 },
      { name: 'Pesado (15-30lb)', min: 15, max: 30 },
      { name: 'Extra (> 30lb)', min: 30, max: Infinity },
    ];
    return ranges.map(range => ({
      name: range.name,
      value: allRows.filter(r => r.weight >= range.min && r.weight < range.max).length,
    }));
  }, [allRows]);

  // Pharma stats
  const pharmaStats = {
    medication: allRows.filter(r => r.category === 'medication').length,
    supplements: allRows.filter(r => r.category === 'supplements').length,
    medical: allRows.filter(r => r.category === 'medical').length,
    veterinary: allRows.filter(r => r.category === 'veterinary').length,
  };
  const totalFarma = pharmaStats.medication + pharmaStats.supplements + pharmaStats.medical + pharmaStats.veterinary;

  // High value alerts
  const highValueCount = allRows.filter(r => r.valueUSD >= REGULATORY_INFO.thresholds.lowValue).length;
  const veryHighValueCount = allRows.filter(r => r.valueUSD >= REGULATORY_INFO.thresholds.veryHighValue).length;
  const missingIdCount = allRows.filter(r => !r.identification || r.identification.trim() === '').length;
  const missingAddressCount = allRows.filter(r => !r.address || r.address.trim() === '').length;


  const handleDownloadAll = async () => {
    await downloadAllFilesAsZip(exportFiles, result, mawbExportInfo);
  };

  const handleDownloadFile = (file: ExportFile) => {
    downloadExportFile(file, consigneeMap, mawbExportInfo);
  };

  const getFileIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      'dollar-sign': DollarSign,
      'trending-up': TrendingUp,
      'pill': Pill,
      'leaf': Leaf,
      'stethoscope': Stethoscope,
      'paw-print': PawPrint,
      'users': Users,
      'package': Package,
      'weight': Weight,
      'shield': Shield,
      'map-pin': MapPin,
    };
    const Icon = icons[iconName] || Package;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={<Package className="w-5 h-5" />}
          label="Guías Totales"
          value={summary.totalRows.toLocaleString()}
          subtitle={`${summary.totalBatches} lotes`}
          color="text-primary"
        />
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Consignatarios"
          value={consigneeStats.totalConsignees.toLocaleString()}
          subtitle={`${consigneeStats.avgPackagesPerConsignee.toFixed(1)} paq/persona`}
          color="text-blue-600"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Valor Total"
          value={`$${(summary.totalValue / 1000).toFixed(1)}K`}
          subtitle={`Prom: $${avgValue.toFixed(2)}`}
          color="text-green-600"
        />
        <MetricCard
          icon={<Weight className="w-5 h-5" />}
          label="Peso Total"
          value={`${totalWeight.toLocaleString()} lb`}
          subtitle={`Prom: ${avgWeight.toFixed(1)} lb`}
          color="text-orange-600"
        />
        <MetricCard
          icon={<Archive className="w-5 h-5" />}
          label="Consolidados"
          value={consigneeStats.consolidatableConsignees.toString()}
          subtitle={`${consigneeStats.consolidatablePackages} paquetes`}
          color="text-purple-600"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Tasa Consolidación"
          value={`${consolidationRate.toFixed(1)}%`}
          subtitle={`-${tripsReduced} viajes`}
          color="text-cyan-600"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="liquidacion" className="gap-1">
            <Calculator className="w-4 h-4" />
            Liquidación
            {resumenLiquidacion.requierenRevision > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {resumenLiquidacion.requierenRevision}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="geographic" className="gap-1">
            📍 Geográfico
            {provinceData.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-emerald-100 text-emerald-700">
                {provinceData.filter(p => p.name !== 'Sin Provincia').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="regulatory" className="gap-1">
            🇵🇦 Regulatorio
            {(pharmaStats.medication + highValueCount) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pharmaStats.medication + pharmaStats.supplements + pharmaStats.medical + pharmaStats.veterinary + highValueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pharma">
            Farma
            {totalFarma > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                {totalFarma}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="consignees">Consignatarios</TabsTrigger>
          <TabsTrigger value="files">
            Archivos
            <Badge variant="secondary" className="ml-2">
              {mainFiles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Value Distribution */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Distribución por Valor</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={valueDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {valueDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Guías']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {valueDistribution.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}: {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Distribución por Categoría</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryDistribution} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip
                      formatter={(value: number, _name, props) => [
                        `${value.toLocaleString()} (${props.payload.percentage}%)`,
                        props.payload.fullName
                      ]}
                    />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geographic Distribution */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Distribución Geográfica (Top 5)
              </h3>
              <div className="space-y-3">
                {provinceData.slice(0, 5).map((province, i) => (
                  <div key={province.name} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: province.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{province.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {province.value.toLocaleString()} ({province.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${province.percentage}%`,
                            backgroundColor: province.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weight Distribution */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Weight className="w-4 h-4" />
                Análisis de Peso
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weightDistribution}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Paquetes']} />
                    <Bar dataKey="value" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Consolidation Panel */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Entregas Consolidadas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{consigneeStats.consolidatableConsignees}</p>
                <p className="text-sm text-muted-foreground">Consignatarios con múltiples paquetes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{consigneeStats.consolidatablePackages}</p>
                <p className="text-sm text-muted-foreground">Paquetes consolidables</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">{tripsReduced}</p>
                <p className="text-sm text-green-600">Viajes reducidos</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">{consolidationRate.toFixed(1)}%</p>
                <p className="text-sm text-blue-600">Tasa de consolidación</p>
              </div>
            </div>
            {consigneeStats.topConsignees.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Top Consignatarios:</p>
                <div className="space-y-2">
                  {consigneeStats.topConsignees.slice(0, 5).map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">
                        <span className="text-muted-foreground">{i + 1}.</span> {c.name}
                      </span>
                      <span className="text-sm font-medium">{c.totalPackages} paq • ${c.totalValue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Liquidación Aduanera Tab */}
        <TabsContent value="liquidacion" className="space-y-6">
          <LiquidacionDashboard 
            liquidaciones={liquidaciones}
            resumen={resumenLiquidacion}
            paquetes={allRows}
            mawb={mawbExportInfo.mawb}
            onExportarLiquidaciones={() => {
              generarReporteConsolidado(
                liquidaciones,
                resumenLiquidacion,
                allRows,
                { mawb: mawbExportInfo.mawb, fechaProceso: new Date() }
              );
            }}
          />
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="space-y-6">
          {/* Geographic Header */}
          <div className="card-elevated p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xl">
                  🗺️
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Distribución Geográfica - Panamá</h3>
                  <p className="text-sm text-emerald-700">10 provincias • {regionData.filter(r => r.name !== 'Sin Región').length} regiones detectadas</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-700">
                {geoStats.detected} detectadas ({((geoStats.detected / allRows.length) * 100).toFixed(0)}%)
              </Badge>
            </div>
          </div>

          {/* Detection Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <p className="text-2xl font-bold text-green-700">{geoStats.highConfidence}</p>
              <p className="text-xs text-green-600">Alta Confianza (≥70%)</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
              <p className="text-2xl font-bold text-yellow-700">{geoStats.mediumConfidence}</p>
              <p className="text-xs text-yellow-600">Media (40-69%)</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
              <p className="text-2xl font-bold text-orange-700">{geoStats.lowConfidence}</p>
              <p className="text-xs text-orange-600">Baja (&lt;40%)</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-700">{geoStats.notDetected}</p>
              <p className="text-xs text-gray-600">No Detectado</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
              <p className="text-2xl font-bold text-emerald-700">{provinceData.filter(p => p.name !== 'Sin Provincia').length}</p>
              <p className="text-xs text-emerald-600">Provincias</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Province Distribution */}
            <div className="card-elevated p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Distribución por Provincia
              </h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {provinceData.map((province, i) => (
                  <div key={province.name} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: province.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{province.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {province.value.toLocaleString()} ({province.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${province.percentage}%`,
                            backgroundColor: province.color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>${province.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>{province.totalWeight.toLocaleString()} lb</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Region Distribution */}
            <div className="card-elevated p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Distribución por Región
              </h4>
              <div className="h-[250px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionData.filter(r => r.name !== 'Sin Región')}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {regionData.filter(r => r.name !== 'Sin Región').map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Paquetes']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {regionData.filter(r => r.name !== 'Sin Región').map((region, i) => (
                  <div key={region.name} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                    <span>{region.icon}</span>
                    <span className="flex-1 truncate">{region.name}</span>
                    <span className="font-medium">{region.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 10 Cities */}
            <div className="card-elevated p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                🏆 Top 10 Destinos
              </h4>
              <div className="space-y-2">
                {cityData.map((city, i) => (
                  <div key={city.name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{city.name}</p>
                        <p className="text-xs text-muted-foreground">{city.province}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{city.value.toLocaleString()} paq</p>
                      <p className="text-xs text-muted-foreground">${city.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Province Table */}
            <div className="card-elevated p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                📊 Estadísticas por Provincia
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Provincia</th>
                      <th className="text-right py-2 px-2">Guías</th>
                      <th className="text-right py-2 px-2">%</th>
                      <th className="text-right py-2 px-2">Valor</th>
                      <th className="text-right py-2 px-2">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provinceData.slice(0, 10).map((province) => (
                      <tr key={province.name} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{province.name}</td>
                        <td className="text-right py-2 px-2">{province.value.toLocaleString()}</td>
                        <td className="text-right py-2 px-2 text-muted-foreground">{province.percentage}%</td>
                        <td className="text-right py-2 px-2">${province.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2">{province.totalWeight.toLocaleString()} lb</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Regulatory Tab */}
        <TabsContent value="regulatory" className="space-y-6">
          {/* Regulatory Header */}
          <div className="card-elevated p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                  🇵🇦
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Alertas Regulatorias Panamá</h3>
                  <p className="text-sm text-blue-700">{COMPANY_INFO.location}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
                ANA • MINSA • MIDA
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Alerts */}
            <div className="card-elevated p-6 border-red-200 bg-red-50/30">
              <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-4">
                <AlertOctagon className="w-5 h-5" />
                Productos Sujetos a Control MINSA
              </h4>
              <div className="space-y-3">
                <AlertItem
                  icon={<Pill className="w-4 h-4" />}
                  label={`${pharmaStats.medication} medicamentos requieren permiso sanitario`}
                  type="critical"
                  visible={pharmaStats.medication > 0}
                />
                <AlertItem
                  icon={<Leaf className="w-4 h-4" />}
                  label={`${pharmaStats.supplements} suplementos requieren notificación`}
                  type="warning"
                  visible={pharmaStats.supplements > 0}
                />
                <AlertItem
                  icon={<Stethoscope className="w-4 h-4" />}
                  label={`${pharmaStats.medical} productos médicos requieren registro`}
                  type="warning"
                  visible={pharmaStats.medical > 0}
                />
                <AlertItem
                  icon={<PawPrint className="w-4 h-4" />}
                  label={`${pharmaStats.veterinary} productos veterinarios (permiso MIDA)`}
                  type="warning"
                  visible={pharmaStats.veterinary > 0}
                />
                {totalFarma === 0 && (
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Sin productos regulados en este lote
                  </p>
                )}
              </div>
            </div>

            {/* Customs Alerts */}
            <div className="card-elevated p-6 border-amber-200 bg-amber-50/30">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-4">
                <FileWarning className="w-5 h-5" />
                Verificación Aduanera
              </h4>
              <div className="space-y-3">
                <AlertItem
                  icon={<DollarSign className="w-4 h-4" />}
                  label={`${highValueCount} paquetes ≥ USD ${REGULATORY_INFO.thresholds.lowValue} (declaración completa)`}
                  type="warning"
                  visible={highValueCount > 0}
                />
                <AlertItem
                  icon={<Shield className="w-4 h-4" />}
                  label={`${veryHighValueCount} paquetes > USD ${REGULATORY_INFO.thresholds.veryHighValue} (inspección probable)`}
                  type="critical"
                  visible={veryHighValueCount > 0}
                />
                <div className="pt-2 border-t border-amber-200 mt-2">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {summary.totalRows - highValueCount} paquetes &lt; ${REGULATORY_INFO.thresholds.lowValue} (Fast Track)
                  </p>
                </div>
              </div>
            </div>

            {/* Documentation Alerts */}
            <div className="card-elevated p-6 border-blue-200 bg-blue-50/30">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-4">
                <Info className="w-5 h-5" />
                Documentación Pendiente
              </h4>
              <div className="space-y-3">
                <AlertItem
                  icon={<Users className="w-4 h-4" />}
                  label={`${missingIdCount} guías sin número de identificación`}
                  type={missingIdCount > 10 ? 'critical' : missingIdCount > 0 ? 'warning' : 'info'}
                  visible={missingIdCount > 0}
                />
                <AlertItem
                  icon={<MapPin className="w-4 h-4" />}
                  label={`${missingAddressCount} direcciones requieren validación`}
                  type={missingAddressCount > 0 ? 'warning' : 'info'}
                  visible={missingAddressCount > 0}
                />
                {missingIdCount === 0 && missingAddressCount === 0 && (
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Documentación completa
                  </p>
                )}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="card-elevated p-6">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5" />
                Contactos de Emergencia Tocumen
              </h4>
              <div className="space-y-3 text-sm">
                <ContactRow
                  name={CONTACT_EMERGENCY.ana.name}
                  phone={CONTACT_EMERGENCY.ana.phone}
                  email={CONTACT_EMERGENCY.ana.email}
                />
                <ContactRow
                  name={CONTACT_EMERGENCY.minsa.name}
                  phone={CONTACT_EMERGENCY.minsa.phone}
                  email={CONTACT_EMERGENCY.minsa.email}
                />
                <ContactRow
                  name={CONTACT_EMERGENCY.security.name}
                  phone={CONTACT_EMERGENCY.security.phone}
                />
                <div className="pt-2 border-t">
                  <ContactRow
                    name={COMPANY_INFO.name}
                    phone={COMPANY_INFO.phone}
                    email={COMPANY_INFO.email}
                    highlight
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Table */}
          <div className="card-elevated p-6">
            <h4 className="font-semibold text-foreground mb-4">Resumen por Régimen de Despacho</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Régimen</th>
                    <th className="text-right py-2 px-3">Guías</th>
                    <th className="text-right py-2 px-3">%</th>
                    <th className="text-left py-2 px-3">Procedimiento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Despacho Simplificado (&lt;$100)
                    </td>
                    <td className="text-right py-2 px-3 font-medium">{(summary.totalRows - highValueCount).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-muted-foreground">
                      {(((summary.totalRows - highValueCount) / summary.totalRows) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-green-700">Fast Track ANA</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Declaración Completa (≥$100)
                    </td>
                    <td className="text-right py-2 px-3 font-medium">{highValueCount.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-muted-foreground">
                      {((highValueCount / summary.totalRows) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-amber-700">DUA Completa</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-red-500" />
                      Productos Regulados (MINSA)
                    </td>
                    <td className="text-right py-2 px-3 font-medium">{totalFarma.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-muted-foreground">
                      {((totalFarma / summary.totalRows) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-red-700">Inspección Sanitaria</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Pharma Tab */}
        <TabsContent value="pharma" className="space-y-6">
          <FarmaceuticosResumen
            paquetes={allRows}
            liquidaciones={liquidaciones}
            mawb={mawbExportInfo.mawb}
          />
        </TabsContent>

        {/* Consignees Tab */}
        <TabsContent value="consignees">
          <ConsigneeDashboard
            consigneeMap={consigneeMap}
            stats={consigneeStats}
            consolidatedDeliveries={consolidatedDeliveries}
          />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6">
          {/* MAWB Info Header */}
          <div className="card-elevated p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                  ✈️
                </div>
                <div>
                <h3 className="font-bold text-lg text-foreground">{mawbExportInfo.formatted}</h3>
                  <p className="text-sm text-muted-foreground">
                    Aerolínea: {mawbExportInfo.airlineName} ({mawbExportInfo.airlineCode})
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary/50">
                {summary.totalRows.toLocaleString()} guías
              </Badge>
            </div>
          </div>

          <div className="card-elevated">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Archivos Generados</h3>
                <p className="text-sm text-muted-foreground">{mainFiles.length} archivos con nomenclatura MAWB</p>
              </div>
              <Button onClick={handleDownloadAll} className="gap-2">
                <Download className="w-4 h-4" />
                Descargar Todo ({mawbExportInfo.formatted.replace('MAWB ', '')}.zip)
              </Button>
            </div>

            <div className="divide-y divide-border">
              {mainFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  onDownload={() => handleDownloadFile(file)}
                  getIcon={getFileIcon}
                />
              ))}
            </div>

            {/* Optional Files Section */}
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowOptionalFiles(!showOptionalFiles)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showOptionalFiles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Archivos Opcionales
              </button>

              {showOptionalFiles && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="byProvince"
                      checked={exportConfig.generateByProvince}
                      onCheckedChange={(checked) =>
                        setExportConfig({ ...exportConfig, generateByProvince: checked as boolean })
                      }
                    />
                    <label htmlFor="byProvince" className="text-sm">Por Provincia</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="heavyWeight"
                      checked={exportConfig.generateHeavyWeight}
                      onCheckedChange={(checked) =>
                        setExportConfig({ ...exportConfig, generateHeavyWeight: checked as boolean })
                      }
                    />
                    <label htmlFor="heavyWeight" className="text-sm">Peso Pesado (&gt; 30 lb)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="highValue"
                      checked={exportConfig.generateHighValue}
                      onCheckedChange={(checked) =>
                        setExportConfig({ ...exportConfig, generateHighValue: checked as boolean })
                      }
                    />
                    <label htmlFor="highValue" className="text-sm">Alto Valor (&gt; $500)</label>
                  </div>

                  {optionalFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {optionalFiles.map((file) => (
                        <FileRow
                          key={file.id}
                          file={file}
                          onDownload={() => handleDownloadFile(file)}
                          getIcon={getFileIcon}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset} size="lg">
          Procesar Nuevo Archivo
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="card-elevated p-4">
      <div className={`flex items-center gap-2 ${color} mb-2`}>
        {icon}
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PharmaCard({
  icon: Icon,
  label,
  count,
  total,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = ((count / total) * 100).toFixed(1);
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${colors.text}`} />
        <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold ${colors.text}`}>{count}</p>
      <p className={`text-sm ${colors.text} opacity-70`}>{percentage}%</p>
    </div>
  );
}

function FileRow({
  file,
  onDownload,
  getIcon,
  compact = false,
}: {
  file: ExportFile;
  onDownload: () => void;
  getIcon: (name: string) => React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
        <div className="flex items-center gap-2">
          {getIcon(file.icon)}
          <span className="text-sm">{file.name}</span>
          <Badge variant="outline" className="text-xs">{file.stats.totalRows}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onDownload}>
          <FileDown className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {getIcon(file.icon)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="font-medium text-foreground">{file.name}.xlsx</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{file.stats.totalRows.toLocaleString()} guías</span>
            <span>•</span>
            <span>${file.stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>•</span>
            <span>{file.stats.uniqueConsignees} consignatarios</span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onDownload} className="gap-2">
        <FileDown className="w-4 h-4" />
        Descargar
      </Button>
    </div>
  );
}

function AlertItem({
  icon,
  label,
  type,
  visible = true,
}: {
  icon: React.ReactNode;
  label: string;
  type: 'critical' | 'warning' | 'info';
  visible?: boolean;
}) {
  if (!visible) return null;
  
  const typeClasses: Record<string, string> = {
    critical: 'text-red-700 bg-red-100',
    warning: 'text-amber-700 bg-amber-100',
    info: 'text-blue-700 bg-blue-100',
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded ${typeClasses[type]}`}>
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ContactRow({
  name,
  phone,
  email,
  highlight = false,
}: {
  name: string;
  phone: string;
  email?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-2 rounded ${highlight ? 'bg-primary/10 border border-primary/20' : ''}`}>
      <span className={`font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{name}</span>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {phone}
        </span>
        {email && (
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {email}
          </span>
        )}
      </div>
    </div>
  );
}
