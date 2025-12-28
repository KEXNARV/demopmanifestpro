// ============================================
// RESUMEN DE PRODUCTOS FARMACÉUTICOS
// Componente para visualizar y descargar
// reporte MINSA con todos los datos
// ============================================

import { useState, useMemo, useCallback } from 'react';
import {
  Pill,
  Leaf,
  Stethoscope,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  AlertOctagon,
  Shield,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Hash,
  FileText,
  Bot,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ManifestRow } from '@/types/manifest';
import { Liquidacion } from '@/types/aduanas';
import {
  extraerProductosFarmaceuticos,
  descargarReporteFarmaceuticos,
} from '@/lib/exportacion/reporteFarmaceuticos';
import { clasificarConAprendizaje } from '@/lib/core/ServicioAprendizajeHTS';
import { toast } from 'sonner';

interface FarmaceuticosResumenProps {
  paquetes: ManifestRow[];
  liquidaciones: Liquidacion[];
  mawb: string;
}

export function FarmaceuticosResumen({ paquetes, liquidaciones, mawb }: FarmaceuticosResumenProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationProgress, setClassificationProgress] = useState({ current: 0, total: 0 });
  const [enrichedPaquetes, setEnrichedPaquetes] = useState<ManifestRow[]>(paquetes);
  const [showDetalles, setShowDetalles] = useState(false);
  const [showTopProducts, setShowTopProducts] = useState(true);

  // Extraer productos farmacéuticos (usa paquetes enriquecidos si existen)
  const productosFarma = useMemo(() => 
    extraerProductosFarmaceuticos(enrichedPaquetes, liquidaciones),
    [enrichedPaquetes, liquidaciones]
  );

  // Clasificar con IA para mejorar detección HTS capítulo 30
  const handleClasificarConIA = useCallback(async () => {
    setIsClassifying(true);
    const sinHTS = paquetes.filter(p => !p.hsCode || p.hsCode === '');
    setClassificationProgress({ current: 0, total: sinHTS.length });

    if (sinHTS.length === 0) {
      toast.info('Todos los productos ya tienen código HTS asignado');
      setIsClassifying(false);
      return;
    }

    toast.info(`Clasificando ${sinHTS.length} productos con IA...`);
    let clasificados = 0;
    const updated = [...paquetes];

    for (let i = 0; i < sinHTS.length; i++) {
      const paquete = sinHTS[i];
      setClassificationProgress({ current: i + 1, total: sinHTS.length });

      try {
        const resultado = await clasificarConAprendizaje(
          String(paquete.description || ''),
          typeof paquete.value === 'number' ? paquete.value : 0,
          typeof paquete.weight === 'number' ? paquete.weight : undefined,
          typeof paquete.hawb === 'string' ? paquete.hawb : undefined,
          mawb
        );

        if (resultado.success && resultado.clasificacion) {
          const idx = updated.findIndex(p => p.hawb === paquete.hawb);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              hsCode: resultado.clasificacion.hsCode,
              htsDescription: resultado.clasificacion.descripcionArancelaria,
            };
            clasificados++;
          }
        }
      } catch (error) {
        console.error(`Error clasificando ${paquete.hawb}:`, error);
      }

      // Delay para evitar rate limiting
      if (i < sinHTS.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setEnrichedPaquetes(updated);
    setIsClassifying(false);
    
    const farmaDetectados = updated.filter(p => 
      p.hsCode?.startsWith('30') || p.hsCode?.startsWith('2936') || p.hsCode?.startsWith('2941')
    ).length;
    
    toast.success(
      `✓ ${clasificados} productos clasificados. ${farmaDetectados} con HTS capítulo 30 (farmacéuticos)`
    );
  }, [paquetes, mawb]);

  // Estadísticas
  const stats = useMemo(() => {
    const porTipo = new Map<string, number>();
    const palabrasFrecuentes = new Map<string, number>();
    let controlados = 0;
    let valorTotal = 0;
    let pesoTotal = 0;

    productosFarma.forEach(p => {
      // Contar por tipo
      porTipo.set(p.tipoProducto, (porTipo.get(p.tipoProducto) || 0) + 1);
      
      // Contar palabras clave
      p.palabrasClave.forEach(palabra => {
        palabrasFrecuentes.set(palabra, (palabrasFrecuentes.get(palabra) || 0) + 1);
      });

      // Controlados
      if (p.tipoProducto === 'psicotropico_controlado' || p.tipoProducto === 'opioide_controlado') {
        controlados++;
      }

      valorTotal += p.valorUSD;
      pesoTotal += p.peso;
    });

    // Top 10 palabras más frecuentes
    const topPalabras = Array.from(palabrasFrecuentes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total: productosFarma.length,
      porTipo: Array.from(porTipo.entries()).sort((a, b) => b[1] - a[1]),
      topPalabras,
      controlados,
      valorTotal,
      pesoTotal,
      porcentaje: paquetes.length > 0 ? ((productosFarma.length / paquetes.length) * 100).toFixed(1) : '0',
    };
  }, [productosFarma, paquetes.length]);

  // Descargar reporte
  const handleDescargar = async () => {
    setIsDownloading(true);
    try {
      await descargarReporteFarmaceuticos(paquetes, liquidaciones, mawb);
    } catch (error) {
      console.error('Error al descargar reporte:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (productosFarma.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 text-green-700">
          <CheckCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Sin Productos Farmacéuticos</h3>
            <p className="text-sm text-green-600">
              No se detectaron medicamentos o productos regulados en este manifiesto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con resumen y botón de descarga */}
      <div className="card-elevated p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center text-white">
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900">
                Productos Farmacéuticos Detectados
              </h2>
              <p className="text-red-700 mt-1">
                {stats.total} productos ({stats.porcentaje}%) requieren permiso MINSA
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="bg-white border-red-300 text-red-700">
                  ${stats.valorTotal.toFixed(2)} USD
                </Badge>
                <Badge variant="outline" className="bg-white border-red-300 text-red-700">
                  {stats.pesoTotal.toFixed(2)} lb
                </Badge>
                {stats.controlados > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    ⚠️ {stats.controlados} Controlados
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleClasificarConIA} 
              disabled={isClassifying || isDownloading}
              variant="outline"
              size="lg"
              className="border-blue-400 text-blue-700 hover:bg-blue-50 gap-2"
            >
              {isClassifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  {classificationProgress.current}/{classificationProgress.total}
                </>
              ) : (
                <>
                  <Bot className="w-5 h-5" />
                  <Sparkles className="w-4 h-4" />
                  Clasificar HTS con IA
                </>
              )}
            </Button>
            <Button 
              onClick={handleDescargar} 
              disabled={isDownloading || isClassifying}
              size="lg"
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Descargar Reporte MINSA
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Alerta de sustancias controladas */}
      {stats.controlados > 0 && (
        <div className="card-elevated p-4 bg-red-100 border-red-400 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-red-700" />
            <div>
              <h4 className="font-bold text-red-800">
                ⚠️ ALERTA: {stats.controlados} Sustancias Controladas
              </h4>
              <p className="text-sm text-red-700">
                Se detectaron opioides o psicotrópicos que requieren documentación especial y aprobación MINSA antes del despacho.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Distribución por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.porTipo.slice(0, 4).map(([tipo, cantidad]) => (
          <TipoCard key={tipo} tipo={tipo} cantidad={cantidad} total={stats.total} />
        ))}
      </div>

      {/* Top palabras clave detectadas */}
      <div className="card-elevated p-6">
        <button
          onClick={() => setShowTopProducts(!showTopProducts)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Top 10 Palabras Clave Detectadas
          </h3>
          {showTopProducts ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showTopProducts && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.topPalabras.map(([palabra, count], idx) => (
              <div
                key={palabra}
                className={`p-3 rounded-lg border ${
                  idx === 0 ? 'bg-red-100 border-red-300' :
                  idx === 1 ? 'bg-orange-100 border-orange-300' :
                  idx === 2 ? 'bg-amber-100 border-amber-300' :
                  'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{palabra}</span>
                  <Badge variant="secondary" className="ml-2 h-5 px-2">{count}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vista previa de productos */}
      <div className="card-elevated overflow-hidden">
        <button
          onClick={() => setShowDetalles(!showDetalles)}
          className="w-full p-4 flex items-center justify-between border-b border-border"
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Vista Previa - Primeros 10 Productos
          </h3>
          {showDetalles ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showDetalles && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">AWB</th>
                  <th className="text-left p-3 font-medium">Consignatario</th>
                  <th className="text-left p-3 font-medium">Cédula</th>
                  <th className="text-left p-3 font-medium">Teléfono</th>
                  <th className="text-left p-3 font-medium">Descripción</th>
                  <th className="text-left p-3 font-medium">HTS</th>
                  <th className="text-right p-3 font-medium">Peso</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productosFarma.slice(0, 10).map((p, idx) => (
                  <tr key={idx} className={`hover:bg-muted/30 ${
                    p.tipoProducto.includes('controlado') ? 'bg-red-50' : ''
                  }`}>
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3 font-mono text-xs">{p.guiaAerea}</td>
                    <td className="p-3 font-medium">{p.consignatario}</td>
                    <td className="p-3">{p.identificacion || '-'}</td>
                    <td className="p-3">{p.telefono || '-'}</td>
                    <td className="p-3 max-w-[200px] truncate" title={p.descripcionCompleta}>
                      {p.descripcionCompleta}
                    </td>
                    <td className="p-3 font-mono text-xs">{p.codigoArancelario || '-'}</td>
                    <td className="p-3 text-right">{p.peso.toFixed(2)} lb</td>
                    <td className="p-3 text-right">${p.valorUSD.toFixed(2)}</td>
                    <td className="p-3">
                      <TipoBadge tipo={p.tipoProducto} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productosFarma.length > 10 && (
              <div className="p-4 text-center text-muted-foreground text-sm bg-muted/30">
                ... y {productosFarma.length - 10} productos más. 
                <span className="font-medium ml-2">Descarga el reporte completo para ver todos.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información del reporte */}
      <div className="card-elevated p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">El reporte Excel MINSA incluye:</p>
            <ul className="mt-2 space-y-1 text-blue-700">
              <li>✓ Resumen ejecutivo con estadísticas</li>
              <li>✓ Listado completo con AWB, consignatario, cédula, teléfono, dirección</li>
              <li>✓ Descripción del paquete, código HTS, peso y valor USD</li>
              <li>✓ Palabras clave detectadas y tipo de producto</li>
              <li>✓ Hoja especial de sustancias controladas (si aplica)</li>
              <li>✓ Agrupación por consignatario</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar tarjeta de tipo
function TipoCard({ tipo, cantidad, total }: { tipo: string; cantidad: number; total: number }) {
  const config = getTipoConfig(tipo);
  const porcentaje = ((cantidad / total) * 100).toFixed(1);

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <config.icon className={`w-5 h-5 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.nombre}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{cantidad}</div>
      <div className="text-xs text-muted-foreground">{porcentaje}% del total farma</div>
    </div>
  );
}

// Badge para tipo de producto
function TipoBadge({ tipo }: { tipo: string }) {
  const config = getTipoConfig(tipo);
  
  return (
    <Badge variant="outline" className={config.bgColor}>
      <config.icon className={`w-3 h-3 mr-1 ${config.color}`} />
      <span className={config.color}>{config.nombreCorto}</span>
    </Badge>
  );
}

// Configuración de tipos
function getTipoConfig(tipo: string) {
  const configs: Record<string, { icon: any; color: string; bgColor: string; nombre: string; nombreCorto: string }> = {
    'medicamento_general': { 
      icon: Pill, 
      color: 'text-red-600', 
      bgColor: 'bg-red-50 border-red-200', 
      nombre: 'Medicamento General',
      nombreCorto: 'Medicamento'
    },
    'antibiotico': { 
      icon: Shield, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50 border-orange-200', 
      nombre: 'Antibiótico',
      nombreCorto: 'Antibiótico'
    },
    'psicotropico_controlado': { 
      icon: AlertOctagon, 
      color: 'text-red-700', 
      bgColor: 'bg-red-100 border-red-300', 
      nombre: '⚠️ Psicotrópico',
      nombreCorto: '⚠️ Controlado'
    },
    'opioide_controlado': { 
      icon: AlertTriangle, 
      color: 'text-red-800', 
      bgColor: 'bg-red-100 border-red-400', 
      nombre: '🔴 Opioide',
      nombreCorto: '🔴 Opioide'
    },
    'antidiabetico': { 
      icon: Pill, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50 border-purple-200', 
      nombre: 'Antidiabético',
      nombreCorto: 'Diabetes'
    },
    'cardiovascular': { 
      icon: Stethoscope, 
      color: 'text-pink-600', 
      bgColor: 'bg-pink-50 border-pink-200', 
      nombre: 'Cardiovascular',
      nombreCorto: 'Cardio'
    },
    'hormonal': { 
      icon: Leaf, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50 border-green-200', 
      nombre: 'Hormonal',
      nombreCorto: 'Hormonal'
    },
    'dispositivo_medico': { 
      icon: Stethoscope, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200', 
      nombre: 'Dispositivo Médico',
      nombreCorto: 'Dispositivo'
    },
  };

  return configs[tipo] || { 
    icon: Package, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50 border-gray-200', 
    nombre: tipo,
    nombreCorto: tipo
  };
}

export default FarmaceuticosResumen;
