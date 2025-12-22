/**
 * COMPONENTE DE UPLOAD DE MANIFIESTO - PROCESAMIENTO AUTOMÁTICO
 * 
 * - El usuario SOLO sube el archivo Excel
 * - El sistema procesa TODO automáticamente:
 *   - Detecta MAWB
 *   - Detecta columnas
 *   - Clasifica productos
 *   - Calcula liquidaciones
 *   - Genera distribución por valor
 * 
 * NO REQUIERE MAPEO MANUAL DE COLUMNAS
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { GestorLocks } from '@/lib/concurrencia/gestorLocks';
import { guardarManifiesto } from '@/lib/db/database';
import { devLog, devError, devSuccess } from '@/lib/logger';

interface ProgresoInfo {
  porcentaje: number;
  mensaje: string;
  fase: 'idle' | 'analizando' | 'procesando' | 'liquidando' | 'guardando' | 'completado' | 'error';
}

interface AnalisisInfo {
  mawb: string;
  aerolinea: string;
  confianza: number;
  advertencias: string[];
}

interface UploadManifiestoProps {
  onComplete?: (resultado: any) => void;
  onError?: (error: Error) => void;
}

export function UploadManifiesto({ onComplete, onError }: UploadManifiestoProps) {
  const navigate = useNavigate();
  
  // Estados simplificados
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analisisInfo, setAnalisisInfo] = useState<AnalisisInfo | null>(null);
  
  // Estado de progreso
  const [progreso, setProgreso] = useState<ProgresoInfo>({
    porcentaje: 0,
    mensaje: '',
    fase: 'idle'
  });

  // Limpieza automática de locks expirados
  useEffect(() => {
    GestorLocks.limpiarLocksExpirados();
    
    const interval = setInterval(() => {
      GestorLocks.limpiarLocksExpirados();
    }, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Handlers de archivo
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setArchivo(file);
      setAnalisisInfo(null);
      toast({
        title: 'Archivo seleccionado',
        description: `${file.name} (${(file.size / 1024).toFixed(0)} KB)`
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Archivo no válido',
        description: 'Solo se permiten archivos Excel (.xlsx, .xls)'
      });
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setAnalisisInfo(null);
      toast({
        title: 'Archivo seleccionado',
        description: `${file.name} (${(file.size / 1024).toFixed(0)} KB)`
      });
    }
  }, []);

  const clearFile = useCallback(() => {
    setArchivo(null);
    setAnalisisInfo(null);
    setProgreso({ porcentaje: 0, mensaje: '', fase: 'idle' });
  }, []);

  // Procesar manifiesto - PROCESAMIENTO COMPLETAMENTE AUTOMÁTICO
  const procesarManifiesto = useCallback(async () => {
    if (!archivo) {
      toast({
        variant: 'destructive',
        title: 'Sin archivo',
        description: 'Por favor selecciona un archivo Excel'
      });
      return;
    }

    try {
      setProgreso({ porcentaje: 5, mensaje: 'Iniciando procesamiento automático...', fase: 'analizando' });
      
      // Leer archivo
      const arrayBuffer = await archivo.arrayBuffer();
      
      // Crear worker
      const worker = new Worker(
        new URL('@/lib/workers/procesador.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      // Configurar listeners
      worker.onmessage = async (e) => {
        const { tipo, payload } = e.data;
        
        if (tipo === 'PROGRESO') {
          const fase = payload.progreso < 30 ? 'analizando' :
                       payload.progreso < 70 ? 'procesando' :
                       payload.progreso < 90 ? 'liquidando' : 'guardando';
          
          setProgreso({
            porcentaje: payload.progreso,
            mensaje: payload.mensaje,
            fase
          });
        }
        
        if (tipo === 'COMPLETADO') {
          devSuccess('Procesamiento completado');
          
          const mawb = payload.analisis?.mawb || `AUTO-${Date.now()}`;
          
          // Preparar resultado en formato esperado por guardarManifiesto
          const resultado = {
            manifiesto: {
              mawb: payload.manifiesto?.mawb || mawb,
              fechaProcesamiento: payload.manifiesto?.fechaProceso || new Date().toISOString(),
              totalFilas: payload.paquetes?.length || 0,
              filasValidas: payload.paquetes?.length || 0,
              filasConErrores: 0
            },
            filas: payload.paquetes?.map((p: any, i: number) => ({
              indice: i + 1,
              tracking: p.numeroGuia || '',
              destinatario: p.consignatario?.nombreCompleto || '',
              identificacion: p.consignatario?.identificacion || '',
              telefono: p.consignatario?.telefono || '',
              direccion: p.consignatario?.direccion || p.ubicacion?.direccionCompleta || '',
              descripcion: p.descripcion || '',
              valorUSD: p.valor || 0,
              peso: p.peso || 0,
              provincia: p.ubicacion?.provincia || 'Panamá',
              ciudad: p.ubicacion?.ciudad || 'Panamá',
              corregimiento: '',
              categoria: p.categoriaProducto || 'general',
              subcategoria: '',
              requierePermiso: p.requierePermiso || false,
              autoridades: p.autoridad ? [p.autoridad] : [],
              categoriaAduanera: p.categoriaAduanera || 'D',
              confianzaClasificacion: p.confianzaClasificacion || 0,
              errores: [],
              advertencias: []
            })) || [],
            resumen: {
              totalPaquetes: payload.paquetes?.length || 0,
              valorTotal: payload.manifiesto?.estadisticas?.valorCIFTotal || 0,
              pesoTotal: payload.manifiesto?.estadisticas?.pesoTotal || 0,
              promedioValor: 0,
              promedioPeso: 0,
              porCategoria: {},
              porProvincia: {},
              porCategoriaAduanera: {},
              tiempoProcesamiento: 0
            },
            deteccionColumnas: {
              mapeo: {},
              confianza: {},
              noDetectados: [],
              sugerencias: {}
            },
            clasificacion: {
              categorias: {},
              requierenPermisos: 0,
              prohibidos: 0
            },
            errores: [],
            advertencias: payload.analisis?.advertencias || []
          };
          
          // Guardar en base de datos
          try {
            await guardarManifiesto(resultado);
            
            setProgreso({ 
              porcentaje: 100, 
              mensaje: '¡Procesamiento completado!',
              fase: 'completado' 
            });
            
            // Mostrar información del análisis
            setAnalisisInfo({
              mawb: payload.analisis?.mawb || 'No detectado',
              aerolinea: payload.analisis?.aerolinea || 'Desconocida',
              confianza: payload.analisis?.confianza || 0,
              advertencias: payload.analisis?.advertencias || []
            });
            
            toast({
              title: '✅ Procesamiento completado',
              description: `MAWB: ${payload.analisis?.mawb} | ${payload.paquetes?.length || 0} paquetes procesados`,
              duration: 5000
            });
            
            // Callback de completado
            onComplete?.({
              mawb,
              manifiesto: payload.manifiesto,
              paquetes: payload.paquetes,
              liquidaciones: payload.liquidaciones
            });
            
            // Navegar al dashboard después de 2 segundos
            setTimeout(() => {
              navigate(`/dashboard/${payload.manifiesto.id}`);
            }, 2000);
            
          } catch (error) {
            devError('Error guardando datos');
            toast({
              variant: 'destructive',
              title: 'Error guardando datos',
              description: error instanceof Error ? error.message : 'Error desconocido'
            });
            
            setProgreso({ 
              porcentaje: 0, 
              mensaje: 'Error guardando datos', 
              fase: 'error' 
            });
          }
          
          worker.terminate();
        }
        
        if (tipo === 'ERROR') {
          devError('Error del worker');
          
          setProgreso({ 
            porcentaje: 0, 
            mensaje: payload.mensaje || 'Error desconocido', 
            fase: 'error' 
          });
          
          toast({
            variant: 'destructive',
            title: 'Error en procesamiento',
            description: payload.mensaje,
            duration: 10000
          });
          
          onError?.(new Error(payload.mensaje));
          
          worker.terminate();
        }
      };
      
      worker.onerror = (error) => {
        devError('Error crítico del worker');
        
        setProgreso({ 
          porcentaje: 0, 
          mensaje: 'Error crítico del sistema', 
          fase: 'error' 
        });
        
        toast({
          variant: 'destructive',
          title: 'Error crítico',
          description: 'Hubo un problema procesando el archivo. Intenta nuevamente.'
        });
        
        onError?.(new Error('Error crítico del worker'));
        
        worker.terminate();
      };
      
      // Enviar datos al worker
      worker.postMessage({
        tipo: 'PROCESAR_MANIFIESTO',
        payload: {
          archivo: arrayBuffer,
          operador: 'Usuario Actual' // TODO: Obtener de sistema de auth
        }
      });
      
    } catch (error) {
      devError('Error en procesamiento');
      
      setProgreso({ 
        porcentaje: 0, 
        mensaje: error instanceof Error ? error.message : 'Error desconocido', 
        fase: 'error' 
      });
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
      
      onError?.(error instanceof Error ? error : new Error('Error desconocido'));
    }
  }, [archivo, navigate, onComplete, onError]);

  const isProcesando = progreso.fase !== 'idle' && progreso.fase !== 'completado' && progreso.fase !== 'error';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Título e instrucciones */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Procesamiento Automático de Manifiestos
        </h2>
        <p className="text-muted-foreground">
          Sube tu archivo Excel y el sistema procesará todo automáticamente.
          No requiere configuración manual.
        </p>
      </div>

      {/* Zona de drop del archivo */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 md:p-12 cursor-pointer',
          'bg-card border-2 border-dashed border-border rounded-xl transition-all duration-300',
          isDragging && 'border-primary bg-primary/5 scale-[1.02]',
          isProcesando && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcesando}
        />
        
        {archivo ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{archivo.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isProcesando && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
                Cambiar archivo
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Upload className={cn(
                'w-8 h-8 transition-colors duration-300',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo Excel'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                o haz clic para seleccionar
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Archivos .xlsx, .xls</span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Progreso */}
      {progreso.fase !== 'idle' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {progreso.mensaje}
            </span>
            <span className="text-sm text-muted-foreground">
              {progreso.porcentaje}%
            </span>
          </div>
          <Progress 
            value={progreso.porcentaje} 
            className={cn(
              "h-2",
              progreso.fase === 'error' && "[&>div]:bg-destructive",
              progreso.fase === 'completado' && "[&>div]:bg-green-500"
            )}
          />
          {progreso.fase === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{progreso.mensaje}</span>
            </div>
          )}
        </div>
      )}

      {/* Información del análisis completado */}
      {analisisInfo && progreso.fase === 'completado' && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-green-800 dark:text-green-200">
                ✅ Análisis completado exitosamente
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
                <div>MAWB: {analisisInfo.mawb}</div>
                <div>Aerolínea: {analisisInfo.aerolinea}</div>
                <div>Confianza: {(analisisInfo.confianza * 100).toFixed(0)}%</div>
              </div>
              {analisisInfo.advertencias.length > 0 && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  <p className="font-medium">Advertencias:</p>
                  <ul className="list-disc list-inside">
                    {analisisInfo.advertencias.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-green-600 dark:text-green-400 animate-pulse">
                Redirigiendo al dashboard...
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Botón Procesar */}
      <Button 
        onClick={procesarManifiesto}
        disabled={!archivo || isProcesando}
        size="lg"
        className="w-full h-14 text-lg font-semibold"
      >
        {isProcesando ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando automáticamente...
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2" />
            Procesar Manifiesto
          </>
        )}
      </Button>

      {/* Info del sistema automático */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">
          🤖 El sistema detectará automáticamente:
        </p>
        <ul className="grid grid-cols-2 gap-1 text-xs">
          <li>• MAWB en formato IATA</li>
          <li>• Aerolínea según prefijo</li>
          <li>• Guías de tracking</li>
          <li>• Datos del consignatario</li>
          <li>• Descripción de productos</li>
          <li>• Peso, volumen y valor</li>
          <li>• Clasificación HTS automática</li>
          <li>• Cálculo de tributos</li>
          <li>• Distribución por valor</li>
        </ul>
      </div>
    </div>
  );
}
