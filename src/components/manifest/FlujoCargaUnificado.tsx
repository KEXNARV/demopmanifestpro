/**
 * FLUJO DE CARGA UNIFICADO
 * 
 * Stepper de 3 pasos:
 * 1. Carga de Documentos (Manifiesto Excel + Facturas PDF)
 * 2. Procesamiento IA/OCR
 * 3. Revisión y Conciliación de Liquidación
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileSpreadsheet, FileText, X, AlertCircle, CheckCircle2, 
  Loader2, ChevronRight, ChevronLeft, Sparkles, AlertTriangle,
  Package, DollarSign, Scale, FileSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { SelectorModoTransporte, useTransportMode } from '@/components/transporte/SelectorModoTransporte';
import { PROVINCIAS_PANAMA } from '@/lib/panamaGeography';
import { getCorregimientosPorProvincia } from '@/lib/panamaGeography/corregimientos';

// Tipos
interface ArchivosCargados {
  manifiesto: File | null;
  facturas: File[];
}

interface ProgresoExtraccion {
  fase: 'idle' | 'extrayendo-manifiesto' | 'extrayendo-facturas' | 'vinculando' | 'completado' | 'error';
  porcentaje: number;
  mensaje: string;
}

interface DatosExtraidos {
  mawb: string;
  totalPaquetes: number;
  paquetes: PaqueteExtraido[];
  facturas: FacturaExtraida[];
  vinculaciones: Vinculacion[];
}

interface PaqueteExtraido {
  tracking: string;
  descripcion: string;
  valorUSD: number;
  peso: number;
  destinatario: string;
  provincia?: string;
  corregimiento?: string;
  categoriaAduanera: 'A' | 'B' | 'C' | 'D';
}

interface FacturaExtraida {
  nombreArchivo: string;
  awbReferencia: string;
  valorTotal: number;
  valorFlete: number;
  hsCode?: string;
  descripcion: string;
  fechaFactura?: string;
}

interface Vinculacion {
  trackingManifiesto: string;
  awbFactura: string;
  estado: 'coincide' | 'discrepancia' | 'sin-factura' | 'factura-sin-paquete';
  discrepancias?: Discrepancia[];
}

interface Discrepancia {
  campo: 'valor' | 'peso' | 'descripcion' | 'hsCode';
  valorManifiesto: string | number;
  valorFactura: string | number;
  diferencia?: number;
  porcentajeDiferencia?: number;
}

type PasoActual = 1 | 2 | 3;

const PASOS = [
  { numero: 1, titulo: 'Carga de Documentos', descripcion: 'Manifiesto + Facturas' },
  { numero: 2, titulo: 'Procesamiento IA', descripcion: 'Extracción OCR' },
  { numero: 3, titulo: 'Verificación', descripcion: 'Conciliación de Liquidación' }
];

export function FlujoCargaUnificado() {
  const navigate = useNavigate();
  const inputManifiestoRef = useRef<HTMLInputElement>(null);
  const inputFacturasRef = useRef<HTMLInputElement>(null);
  
  // Estados principales
  const [pasoActual, setPasoActual] = useState<PasoActual>(1);
  const [archivos, setArchivos] = useState<ArchivosCargados>({ manifiesto: null, facturas: [] });
  const [progreso, setProgreso] = useState<ProgresoExtraccion>({ fase: 'idle', porcentaje: 0, mensaje: '' });
  const [datosExtraidos, setDatosExtraidos] = useState<DatosExtraidos | null>(null);
  const [isDragging, setIsDragging] = useState<'manifiesto' | 'facturas' | null>(null);
  
  // Modo de transporte
  const { modo, zona, setModo, setZona } = useTransportMode();

  // Handlers de archivos
  const handleManifiestoSelect = useCallback((file: File) => {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setArchivos(prev => ({ ...prev, manifiesto: file }));
      toast({ title: 'Manifiesto cargado', description: file.name });
    } else {
      toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Solo se permiten archivos Excel' });
    }
  }, []);

  const handleFacturasSelect = useCallback((files: FileList) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfs.length > 0) {
      setArchivos(prev => ({ ...prev, facturas: [...prev.facturas, ...pdfs] }));
      toast({ title: `${pdfs.length} factura(s) añadida(s)` });
    } else {
      toast({ variant: 'destructive', title: 'Archivos no válidos', description: 'Solo se permiten PDFs' });
    }
  }, []);

  const removeFactura = useCallback((index: number) => {
    setArchivos(prev => ({
      ...prev,
      facturas: prev.facturas.filter((_, i) => i !== index)
    }));
  }, []);

  // Drag handlers
  const handleDragOver = (e: React.DragEvent, tipo: 'manifiesto' | 'facturas') => {
    e.preventDefault();
    setIsDragging(tipo);
  };

  const handleDragLeave = () => setIsDragging(null);

  const handleDrop = (e: React.DragEvent, tipo: 'manifiesto' | 'facturas') => {
    e.preventDefault();
    setIsDragging(null);
    
    if (tipo === 'manifiesto' && e.dataTransfer.files[0]) {
      handleManifiestoSelect(e.dataTransfer.files[0]);
    } else if (tipo === 'facturas') {
      handleFacturasSelect(e.dataTransfer.files);
    }
  };

  // Procesamiento (simulado - se conectará con el worker real)
  const iniciarProcesamiento = useCallback(async () => {
    if (!archivos.manifiesto) {
      toast({ variant: 'destructive', title: 'Sin manifiesto', description: 'Carga un archivo de manifiesto' });
      return;
    }

    setPasoActual(2);
    setProgreso({ fase: 'extrayendo-manifiesto', porcentaje: 10, mensaje: 'Analizando manifiesto Excel...' });

    try {
      // Simular procesamiento del manifiesto
      await new Promise(r => setTimeout(r, 1500));
      setProgreso({ fase: 'extrayendo-manifiesto', porcentaje: 30, mensaje: 'Detectando columnas automáticamente...' });
      
      await new Promise(r => setTimeout(r, 1000));
      setProgreso({ fase: 'extrayendo-facturas', porcentaje: 50, mensaje: `Procesando ${archivos.facturas.length} facturas con IA...` });
      
      // Simular extracción de facturas
      await new Promise(r => setTimeout(r, 2000));
      setProgreso({ fase: 'vinculando', porcentaje: 80, mensaje: 'Vinculando facturas con paquetes...' });
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Datos de ejemplo (se reemplazarán con datos reales del worker)
      const datosSimulados: DatosExtraidos = {
        mawb: '230-12345678',
        totalPaquetes: 150,
        paquetes: [
          { tracking: 'TBA123456789', descripcion: 'Electronics', valorUSD: 250, peso: 2.5, destinatario: 'Juan Pérez', provincia: 'Panamá', corregimiento: 'San Francisco', categoriaAduanera: 'C' },
          { tracking: 'TBA987654321', descripcion: 'Clothing', valorUSD: 85, peso: 1.2, destinatario: 'María García', provincia: 'Chiriquí', corregimiento: 'David', categoriaAduanera: 'B' },
          { tracking: 'TBA456789123', descripcion: 'Supplements', valorUSD: 3500, peso: 5.0, destinatario: 'Carlos López', provincia: 'Panamá', corregimiento: 'Bella Vista', categoriaAduanera: 'D' },
        ],
        facturas: [
          { nombreArchivo: 'invoice_TBA123456789.pdf', awbReferencia: 'TBA123456789', valorTotal: 248.50, valorFlete: 25, hsCode: '8471.30', descripcion: 'Laptop computer', fechaFactura: '2025-01-03' },
          { nombreArchivo: 'invoice_TBA456789123.pdf', awbReferencia: 'TBA456789123', valorTotal: 3450, valorFlete: 150, hsCode: '2106.90', descripcion: 'Dietary supplements', fechaFactura: '2025-01-02' },
        ],
        vinculaciones: [
          { trackingManifiesto: 'TBA123456789', awbFactura: 'TBA123456789', estado: 'discrepancia', discrepancias: [
            { campo: 'valor', valorManifiesto: 250, valorFactura: 248.50, diferencia: 1.50, porcentajeDiferencia: 0.6 }
          ]},
          { trackingManifiesto: 'TBA987654321', awbFactura: '', estado: 'sin-factura' },
          { trackingManifiesto: 'TBA456789123', awbFactura: 'TBA456789123', estado: 'discrepancia', discrepancias: [
            { campo: 'valor', valorManifiesto: 3500, valorFactura: 3450, diferencia: 50, porcentajeDiferencia: 1.4 }
          ]},
        ]
      };
      
      setDatosExtraidos(datosSimulados);
      setProgreso({ fase: 'completado', porcentaje: 100, mensaje: '¡Procesamiento completado!' });
      
      // Avanzar al paso 3 automáticamente
      setTimeout(() => setPasoActual(3), 1500);
      
    } catch (error) {
      setProgreso({ fase: 'error', porcentaje: 0, mensaje: 'Error en el procesamiento' });
      toast({ variant: 'destructive', title: 'Error', description: 'Hubo un problema procesando los documentos' });
    }
  }, [archivos]);

  // Renderizado del Stepper
  const renderStepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {PASOS.map((paso, index) => (
          <div key={paso.numero} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300",
                pasoActual === paso.numero 
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                  : pasoActual > paso.numero
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              )}>
                {pasoActual > paso.numero ? <CheckCircle2 className="w-6 h-6" /> : paso.numero}
              </div>
              <div className="mt-2 text-center">
                <p className={cn(
                  "font-medium text-sm",
                  pasoActual >= paso.numero ? "text-foreground" : "text-muted-foreground"
                )}>
                  {paso.titulo}
                </p>
                <p className="text-xs text-muted-foreground">{paso.descripcion}</p>
              </div>
            </div>
            {index < PASOS.length - 1 && (
              <div className={cn(
                "w-20 h-1 mx-4 rounded transition-colors",
                pasoActual > paso.numero ? "bg-green-500" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Paso 1: Carga de documentos
  const renderPaso1 = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Carga de Documentos</h2>
        <p className="text-muted-foreground mt-1">
          Sube el manifiesto de transporte y las facturas comerciales asociadas
        </p>
      </div>

      {/* Selector de Transporte */}
      <Card>
        <CardContent className="pt-6">
          <SelectorModoTransporte
            modoSeleccionado={modo}
            zonaSeleccionada={zona}
            onModoChange={setModo}
            onZonaChange={setZona}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Manifiesto Excel */}
        <Card className={cn(
          "transition-all duration-300",
          isDragging === 'manifiesto' && "ring-2 ring-primary"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Manifiesto de Transporte
              <Badge variant="destructive" className="ml-auto">Requerido</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => handleDragOver(e, 'manifiesto')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'manifiesto')}
              onClick={() => inputManifiestoRef.current?.click()}
              className={cn(
                "relative p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all text-center",
                isDragging === 'manifiesto' 
                  ? "border-primary bg-primary/5" 
                  : archivos.manifiesto 
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-border hover:border-primary/50"
              )}
            >
              <input
                ref={inputManifiestoRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleManifiestoSelect(e.target.files[0])}
                className="hidden"
              />
              
              {archivos.manifiesto ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{archivos.manifiesto.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(archivos.manifiesto.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchivos(prev => ({ ...prev, manifiesto: null }));
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Cambiar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Arrastra tu archivo Excel</p>
                    <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                  </div>
                  <Badge variant="outline">.xlsx, .xls</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Facturas PDF */}
        <Card className={cn(
          "transition-all duration-300",
          isDragging === 'facturas' && "ring-2 ring-primary"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              Facturas Comerciales
              <Badge variant="secondary" className="ml-auto">Opcional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => handleDragOver(e, 'facturas')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'facturas')}
              onClick={() => inputFacturasRef.current?.click()}
              className={cn(
                "relative p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all text-center",
                isDragging === 'facturas' 
                  ? "border-primary bg-primary/5" 
                  : archivos.facturas.length > 0
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-border hover:border-primary/50"
              )}
            >
              <input
                ref={inputFacturasRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => e.target.files && handleFacturasSelect(e.target.files)}
                className="hidden"
              />
              
              {archivos.facturas.length > 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-blue-600" />
                  </div>
                  <p className="font-medium text-foreground">
                    {archivos.facturas.length} factura(s) cargada(s)
                  </p>
                  <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                    Añadir más
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Arrastra facturas PDF</p>
                    <p className="text-sm text-muted-foreground">Múltiples archivos permitidos</p>
                  </div>
                  <Badge variant="outline">.pdf</Badge>
                </div>
              )}
            </div>

            {/* Lista de facturas */}
            {archivos.facturas.length > 0 && (
              <ScrollArea className="mt-4 max-h-32">
                <div className="space-y-2">
                  {archivos.facturas.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span className="truncate flex-1">{f.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFactura(i)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nota informativa sobre campos geográficos */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Campos Geográficos Obligatorios</AlertTitle>
        <AlertDescription>
          El manifiesto debe incluir las columnas <strong>Provincia</strong> y <strong>Barrio/Corregimiento</strong> 
          para el correcto procesamiento de entregas. El sistema validará que los corregimientos correspondan a las provincias indicadas.
        </AlertDescription>
      </Alert>

      {/* Botón de continuar */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={iniciarProcesamiento}
          disabled={!archivos.manifiesto}
          className="gap-2"
        >
          Procesar Documentos
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  // Paso 2: Procesamiento IA
  const renderPaso2 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          {progreso.fase === 'completado' ? (
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          ) : progreso.fase === 'error' ? (
            <AlertCircle className="w-10 h-10 text-destructive" />
          ) : (
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-foreground">Procesamiento con IA</h2>
        <p className="text-muted-foreground mt-1">{progreso.mensaje}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{progreso.fase.replace(/-/g, ' ').toUpperCase()}</span>
            <span className="text-muted-foreground">{progreso.porcentaje}%</span>
          </div>
          <Progress 
            value={progreso.porcentaje} 
            className={cn(
              "h-3",
              progreso.fase === 'error' && "[&>div]:bg-destructive",
              progreso.fase === 'completado' && "[&>div]:bg-green-500"
            )}
          />
          
          {/* Detalles del procesamiento */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <FileSpreadsheet className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Manifiesto</p>
              <p className="text-xs text-muted-foreground">{archivos.manifiesto?.name}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Facturas</p>
              <p className="text-xs text-muted-foreground">{archivos.facturas.length} archivo(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Paso 3: Verificación de Liquidación
  const renderPaso3 = () => {
    if (!datosExtraidos) return null;

    const discrepancias = datosExtraidos.vinculaciones.filter(v => v.estado === 'discrepancia');
    const sinFactura = datosExtraidos.vinculaciones.filter(v => v.estado === 'sin-factura');
    const coinciden = datosExtraidos.vinculaciones.filter(v => v.estado === 'coincide');

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Verificación de Liquidación</h2>
          <p className="text-muted-foreground mt-1">
            Revisa las discrepancias entre el manifiesto y las facturas comerciales
          </p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{datosExtraidos.totalPaquetes}</p>
              <p className="text-xs text-muted-foreground">Total Paquetes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{coinciden.length}</p>
              <p className="text-xs text-muted-foreground">Coinciden</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{discrepancias.length}</p>
              <p className="text-xs text-muted-foreground">Discrepancias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <FileSearch className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold text-muted-foreground">{sinFactura.length}</p>
              <p className="text-xs text-muted-foreground">Sin Factura</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de discrepancias */}
        {discrepancias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Discrepancias Detectadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <div className="space-y-3">
                  {discrepancias.map((v, i) => (
                    <div key={i} className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-medium">{v.trackingManifiesto}</span>
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          {v.discrepancias?.length} diferencia(s)
                        </Badge>
                      </div>
                      {v.discrepancias?.map((d, j) => (
                        <div key={j} className="flex items-center gap-4 text-sm mt-2">
                          <span className="text-muted-foreground capitalize">{d.campo}:</span>
                          <span className="text-foreground">
                            Manifiesto: <strong>${d.valorManifiesto}</strong>
                          </span>
                          <span className="text-foreground">
                            Factura: <strong>${d.valorFactura}</strong>
                          </span>
                          {d.porcentajeDiferencia && (
                            <Badge variant={d.porcentajeDiferencia > 5 ? "destructive" : "secondary"}>
                              {d.porcentajeDiferencia.toFixed(1)}% dif.
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Paquetes sin factura */}
        {sinFactura.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="w-5 h-5" />
                Paquetes sin Factura Asociada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sinFactura.map((v, i) => (
                  <Badge key={i} variant="outline">
                    {v.trackingManifiesto}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Estos paquetes se procesarán con los valores del manifiesto.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setPasoActual(1)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver a Cargar
          </Button>
          <Button size="lg" onClick={() => {
            toast({ title: 'Procesamiento confirmado', description: 'Redirigiendo al dashboard...' });
            // navigate(`/dashboard/${datosExtraidos.mawb}`);
          }}>
            Confirmar y Continuar
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      {renderStepper()}
      
      <div className="mt-8">
        {pasoActual === 1 && renderPaso1()}
        {pasoActual === 2 && renderPaso2()}
        {pasoActual === 3 && renderPaso3()}
      </div>
    </div>
  );
}
