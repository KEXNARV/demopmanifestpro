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
} from 'lucide-react';
import { ProcessingConfig } from '@/types/manifest';
import { ExtendedProcessingResult } from '@/lib/excelProcessor';
import { ExportFile, generateExportFiles, downloadExportFile, downloadAllFilesAsZip, ExportConfig } from '@/lib/exportService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ConsigneeDashboard } from './ConsigneeDashboard';
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

interface VisualDashboardProps {
  result: ExtendedProcessingResult;
  config: ProcessingConfig;
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

export function VisualDashboard({ result, config, onReset }: VisualDashboardProps) {
  const { summary, consigneeMap, consigneeStats, consolidatedDeliveries } = result;
  const allRows = result.batches.flatMap(b => b.rows);

  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeDate: true,
    generateByProvince: false,
    generateByCity: false,
    generateByWeight: false,
    generateHighValue: false,
    generateHeavyWeight: false,
  });
  const [showOptionalFiles, setShowOptionalFiles] = useState(false);

  const exportFiles = useMemo(() => 
    generateExportFiles(result, config, exportConfig),
    [result, config, exportConfig]
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

  // Province distribution data
  const provinceData = useMemo(() => {
    const byProvince = new Map<string, number>();
    allRows.forEach(row => {
      const province = row.province || 'Sin Provincia';
      byProvince.set(province, (byProvince.get(province) || 0) + 1);
    });
    return Array.from(byProvince.entries())
      .map(([name, value]) => ({ name, value, percentage: ((value / summary.totalRows) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [allRows, summary.totalRows]);

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

  const handleDownloadAll = async () => {
    await downloadAllFilesAsZip(exportFiles, result);
  };

  const handleDownloadFile = (file: ExportFile) => {
    downloadExportFile(file, consigneeMap);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
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
                Distribución Geográfica
              </h3>
              <div className="space-y-3">
                {provinceData.map((province, i) => (
                  <div key={province.name} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{province.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {province.value.toLocaleString()} ({province.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${province.percentage}%` }}
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

        {/* Pharma Tab */}
        <TabsContent value="pharma" className="space-y-6">
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-4">Productos Farmacéuticos y Regulados</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PharmaCard
                icon={Pill}
                label="Medicamentos"
                count={pharmaStats.medication}
                total={summary.totalRows}
                color="red"
              />
              <PharmaCard
                icon={Leaf}
                label="Suplementos"
                count={pharmaStats.supplements}
                total={summary.totalRows}
                color="green"
              />
              <PharmaCard
                icon={Stethoscope}
                label="Productos Médicos"
                count={pharmaStats.medical}
                total={summary.totalRows}
                color="blue"
              />
              <PharmaCard
                icon={PawPrint}
                label="Veterinarios"
                count={pharmaStats.veterinary}
                total={summary.totalRows}
                color="purple"
              />
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Total Productos Regulados: {totalFarma} ({((totalFarma / summary.totalRows) * 100).toFixed(1)}%)</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Estos productos requieren trámites especiales para despacho aduanero.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
          <div className="card-elevated">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Archivos Generados</h3>
                <p className="text-sm text-muted-foreground">{mainFiles.length} archivos principales</p>
              </div>
              <Button onClick={handleDownloadAll} className="gap-2">
                <Download className="w-4 h-4" />
                Descargar Todo (ZIP)
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
