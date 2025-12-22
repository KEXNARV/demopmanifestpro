import { useState, useMemo } from 'react';
import { 
  Users, 
  Package, 
  PackageCheck, 
  TrendingDown,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  CreditCard,
  FileText,
  CheckCircle2,
  Hash
} from 'lucide-react';
import { Consignee, ConsigneeStats, ConsolidatedDelivery } from '@/types/manifest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { filterConsignees, formatConsolidatedForExport } from '@/lib/consigneeProcessor';
import { ConsigneeCharts } from './ConsigneeCharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ConsigneeDashboardProps {
  consigneeMap: Map<string, Consignee>;
  stats: ConsigneeStats;
  consolidatedDeliveries: ConsolidatedDelivery[];
}

export function ConsigneeDashboard({ 
  consigneeMap, 
  stats, 
  consolidatedDeliveries 
}: ConsigneeDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [minPackagesFilter, setMinPackagesFilter] = useState<string>('all');
  const [expandedConsignees, setExpandedConsignees] = useState<Set<string>>(new Set());

  const filteredConsignees = useMemo(() => {
    const minPackages = minPackagesFilter === 'all' ? undefined : parseInt(minPackagesFilter);
    return filterConsignees(consigneeMap, {
      minPackages,
      searchTerm: searchTerm || undefined,
    }).sort((a, b) => b.totalPackages - a.totalPackages);
  }, [consigneeMap, searchTerm, minPackagesFilter]);

  const toggleExpanded = (consigneeId: string) => {
    setExpandedConsignees(prev => {
      const next = new Set(prev);
      if (next.has(consigneeId)) {
        next.delete(consigneeId);
      } else {
        next.add(consigneeId);
      }
      return next;
    });
  };

  const handleExportConsolidated = () => {
    const data = formatConsolidatedForExport(consolidatedDeliveries);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas Consolidadas');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Entregas_Consolidadas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportConsigneeList = () => {
    const data = Array.from(consigneeMap.values()).map(c => ({
      'Consignatario': c.name,
      'Total Paquetes': c.totalPackages,
      'Peso Total (lb)': c.totalWeight.toFixed(2),
      'Valor Total (USD)': c.totalValue.toFixed(2),
      'Consolidable': c.isConsolidatable ? 'Sí' : 'No',
      'Teléfono': c.phone || '',
      'Identificación': c.identification || '',
      'Provincias': c.provinces.join(', '),
      'Ciudades': c.cities.join(', '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consignatarios');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Lista_Consignatarios_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate tracking number stats
  const trackingStats = useMemo(() => {
    let totalGuias = 0;
    let consignatariosConMultiplesGuias = 0;
    const guiasPorConsignatario: { nombre: string; cantidad: number; guias: string[] }[] = [];

    consigneeMap.forEach((consignee) => {
      const guias = consignee.packages.map(p => p.trackingNumber).filter(Boolean);
      totalGuias += guias.length;
      if (guias.length >= 2) {
        consignatariosConMultiplesGuias++;
      }
      guiasPorConsignatario.push({
        nombre: consignee.name,
        cantidad: guias.length,
        guias: guias.slice(0, 5) // Limit to first 5 for display
      });
    });

    return {
      totalGuias,
      consignatariosConMultiplesGuias,
      guiasPorConsignatario: guiasPorConsignatario.sort((a, b) => b.cantidad - a.cantidad),
    };
  }, [consigneeMap]);

  return (
    <div className="space-y-6">
      {/* Analysis Report Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">Reporte de Análisis por Guía Individual</h3>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              El análisis se realizó usando las <strong>guías individuales de cada paquete</strong> (AWB Amazon, FedEx, UPS, etc.), 
              NO por la guía aérea master (MAWB).
            </p>
            
            {/* Tracking Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background/80 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">Guías Analizadas</span>
                </div>
                <p className="text-xl font-bold text-foreground">{trackingStats.totalGuias.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">paquetes únicos</p>
              </div>
              
              <div className="bg-background/80 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">Consignatarios</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stats.totalConsignees.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">destinatarios únicos</p>
              </div>
              
              <div className="bg-background/80 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">Con +2 Guías</span>
                </div>
                <p className="text-xl font-bold text-success">{trackingStats.consignatariosConMultiplesGuias.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">consolidables</p>
              </div>
              
              <div className="bg-background/80 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">Promedio</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stats.avgPackagesPerConsignee}</p>
                <p className="text-[10px] text-muted-foreground">guías/consignatario</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total Consignatarios</span>
          </div>
          <p className="stat-value">{stats.totalConsignees.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <PackageCheck className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Entregas Consolidables</span>
          </div>
          <p className="stat-value text-success">{stats.consolidatableConsignees.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {stats.consolidatablePackages.toLocaleString()} paquetes
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Promedio por Persona</span>
          </div>
          <p className="stat-value">{stats.avgPackagesPerConsignee}</p>
          <p className="text-xs text-muted-foreground">paquetes/consignatario</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Ahorro Consolidación</span>
          </div>
          <p className="stat-value text-success">{stats.consolidationSavings}</p>
          <p className="text-xs text-muted-foreground">viajes menos</p>
        </div>
      </div>

      {/* Efficiency Banner */}
      {stats.consolidationSavings > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                ¡Potencial de ahorro detectado!
              </p>
              <p className="text-sm text-muted-foreground">
                Consolidando entregas puedes reducir {stats.consolidationSavings} viajes 
                ({Math.round((stats.consolidationSavings / (stats.consolidatablePackages || 1)) * 100)}% menos paradas)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts */}
      <ConsigneeCharts consigneeMap={consigneeMap} stats={stats} />

      {/* Top Consignees */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Top 10 Consignatarios</h3>
          <Badge variant="secondary">Por volumen</Badge>
        </div>
        <div className="space-y-2">
          {stats.topConsignees.slice(0, 5).map((consignee, index) => (
            <div 
              key={consignee.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{consignee.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {consignee.cities.length > 0 ? consignee.cities[0] : 'Sin ubicación'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={consignee.totalPackages >= 3 ? 'bg-success text-success-foreground' : ''}>
                  {consignee.totalPackages} paquetes
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  ${consignee.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consignee List with Filters */}
      <div className="card-elevated">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <h3 className="font-semibold text-foreground">Lista de Consignatarios</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportConsigneeList} className="gap-2">
                <Download className="w-4 h-4" />
                Lista Completa
              </Button>
              <Button 
                size="sm" 
                onClick={handleExportConsolidated} 
                className="gap-2"
                disabled={consolidatedDeliveries.length === 0}
              >
                <Download className="w-4 h-4" />
                Entregas Consolidadas
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={minPackagesFilter} onValueChange={setMinPackagesFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por paquetes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="2">2+ paquetes</SelectItem>
                <SelectItem value="3">3+ paquetes</SelectItem>
                <SelectItem value="5">5+ paquetes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Consignee List */}
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto scrollbar-thin">
          {filteredConsignees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No se encontraron consignatarios con los filtros aplicados
            </div>
          ) : (
            filteredConsignees.map(consignee => (
              <Collapsible 
                key={consignee.id}
                open={expandedConsignees.has(consignee.id)}
                onOpenChange={() => toggleExpanded(consignee.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          consignee.isConsolidatable 
                            ? 'bg-success/10 text-success' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {consignee.isConsolidatable ? (
                            <PackageCheck className="w-5 h-5" />
                          ) : (
                            <Package className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{consignee.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {consignee.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {consignee.phone}
                              </span>
                            )}
                            {consignee.identification && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {consignee.identification}
                              </span>
                            )}
                            {consignee.cities.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {consignee.cities[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={consignee.isConsolidatable ? 'default' : 'secondary'}>
                            {consignee.totalPackages} paquete{consignee.totalPackages !== 1 ? 's' : ''}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {consignee.totalWeight.toFixed(1)} lb • ${consignee.totalValue.toFixed(2)}
                          </p>
                        </div>
                        {expandedConsignees.has(consignee.id) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Paquetes individuales (por guía Amazon/courier)
                      </p>
                      <div className="space-y-2">
                        {consignee.packages.map((pkg, idx) => (
                          <div 
                            key={pkg.id}
                            className="flex items-center justify-between text-sm p-2 bg-background rounded"
                          >
                            <div>
                              <p className="font-mono text-xs font-semibold text-primary">
                                Guía: {pkg.trackingNumber}
                              </p>
                              <p className="text-muted-foreground text-xs truncate max-w-[300px]">
                                {pkg.description}
                              </p>
                              {pkg.mawb && (
                                <p className="text-muted-foreground/60 text-[10px]">
                                  MAWB ref: {pkg.mawb}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${pkg.valueUSD.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">{pkg.weight} lb</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {consignee.addresses.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {consignee.addresses[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>

        {/* Summary Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredConsignees.length} de {stats.totalConsignees} consignatarios
          </p>
        </div>
      </div>
    </div>
  );
}
