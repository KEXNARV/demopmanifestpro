import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Consignee, ConsigneeStats } from '@/types/manifest';
import { Package, Users, BarChart3, PieChartIcon } from 'lucide-react';

interface ConsigneeChartsProps {
  consigneeMap: Map<string, Consignee>;
  stats: ConsigneeStats;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(142, 76%, 36%)',
  'hsl(var(--warning))',
  'hsl(38, 92%, 50%)',
  'hsl(var(--destructive))',
  'hsl(280, 65%, 60%)',
  'hsl(200, 70%, 50%)',
];

export function ConsigneeCharts({ consigneeMap, stats }: ConsigneeChartsProps) {
  // Distribution of packages per consignee (grouped ranges)
  const distributionData = useMemo(() => {
    const ranges = [
      { range: '1 guía', min: 1, max: 1, count: 0 },
      { range: '2 guías', min: 2, max: 2, count: 0 },
      { range: '3-4 guías', min: 3, max: 4, count: 0 },
      { range: '5-9 guías', min: 5, max: 9, count: 0 },
      { range: '10+ guías', min: 10, max: Infinity, count: 0 },
    ];

    consigneeMap.forEach((consignee) => {
      const pkgCount = consignee.totalPackages;
      for (const range of ranges) {
        if (pkgCount >= range.min && pkgCount <= range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges.map(r => ({
      name: r.range,
      consignatarios: r.count,
      porcentaje: stats.totalConsignees > 0 
        ? Math.round((r.count / stats.totalConsignees) * 100) 
        : 0
    }));
  }, [consigneeMap, stats.totalConsignees]);

  // Top 8 consignees for bar chart
  const topConsigneesData = useMemo(() => {
    return stats.topConsignees.slice(0, 8).map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      fullName: c.name,
      guias: c.totalPackages,
      valor: Math.round(c.totalValue),
    }));
  }, [stats.topConsignees]);

  // Consolidation pie chart data
  const consolidationData = useMemo(() => {
    const consolidatable = stats.consolidatableConsignees;
    const single = stats.totalConsignees - consolidatable;
    
    return [
      { name: 'Consolidables (2+)', value: consolidatable, color: 'hsl(var(--success))' },
      { name: 'Una guía', value: single, color: 'hsl(var(--muted-foreground))' },
    ];
  }, [stats]);

  // Value distribution by package count
  const valueByPackageData = useMemo(() => {
    const data: { rango: string; valorTotal: number; cantidad: number }[] = [
      { rango: '1 guía', valorTotal: 0, cantidad: 0 },
      { rango: '2 guías', valorTotal: 0, cantidad: 0 },
      { rango: '3-4 guías', valorTotal: 0, cantidad: 0 },
      { rango: '5+ guías', valorTotal: 0, cantidad: 0 },
    ];

    consigneeMap.forEach((consignee) => {
      const pkg = consignee.totalPackages;
      const val = consignee.totalValue;
      
      if (pkg === 1) {
        data[0].valorTotal += val;
        data[0].cantidad++;
      } else if (pkg === 2) {
        data[1].valorTotal += val;
        data[1].cantidad++;
      } else if (pkg >= 3 && pkg <= 4) {
        data[2].valorTotal += val;
        data[2].cantidad++;
      } else {
        data[3].valorTotal += val;
        data[3].cantidad++;
      }
    });

    return data.map(d => ({
      ...d,
      valorTotal: Math.round(d.valorTotal),
    }));
  }, [consigneeMap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground text-sm">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-muted-foreground">
              {entry.name}: <span className="font-semibold text-foreground">{entry.value.toLocaleString()}</span>
              {entry.dataKey === 'valor' && ' USD'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Análisis Visual por Guía Individual</h3>
          <p className="text-sm text-muted-foreground">Distribución de paquetes usando guías únicas de Amazon, FedEx, UPS, etc.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Bar Chart */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground text-sm">Distribución de Guías por Consignatario</h4>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="consignatarios" 
                  name="Consignatarios"
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {distributionData.map((item, idx) => (
              <span key={idx} className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {item.name}: <strong className="text-foreground">{item.consignatarios}</strong> ({item.porcentaje}%)
              </span>
            ))}
          </div>
        </div>

        {/* Consolidation Pie Chart */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-success" />
            <h4 className="font-medium text-foreground text-sm">Potencial de Consolidación</h4>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={consolidationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {consolidationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Consignatarios']}
                />
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-muted-foreground">
              <strong className="text-success">{stats.consolidatableConsignees}</strong> consignatarios con múltiples guías individuales
            </p>
          </div>
        </div>

        {/* Top Consignees Bar Chart */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground text-sm">Top 8 Consignatarios por Guías Individuales</h4>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topConsigneesData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10 }} 
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="guias" 
                  name="Guías Individuales"
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Value by Package Count Area Chart */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-success" />
            <h4 className="font-medium text-foreground text-sm">Valor Total por Cantidad de Guías</h4>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valueByPackageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                          <p className="font-medium text-foreground text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            Valor: <span className="font-semibold text-foreground">${payload[0]?.value?.toLocaleString()}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Consignatarios: <span className="font-semibold text-foreground">{payload[0]?.payload?.cantidad}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="valorTotal" 
                  name="Valor Total USD"
                  stroke="hsl(var(--success))" 
                  fillOpacity={1}
                  fill="url(#colorValor)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {valueByPackageData.map((item, idx) => (
              <div key={idx} className="text-[10px]">
                <p className="text-muted-foreground">{item.rango}</p>
                <p className="font-semibold text-foreground">${item.valorTotal.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}