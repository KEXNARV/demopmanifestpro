// ============================================
// COMPONENTE DE REVISIÓN MANUAL DE LIQUIDACIONES
// Para productos que requieren clasificación manual
// ============================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Save, X, Search, Calculator, CheckCircle } from 'lucide-react';
import { Liquidacion, Arancel } from '@/types/aduanas';
import { ARANCELES_PANAMA, KEYWORDS_ARANCEL } from '@/lib/aduanas/arancelesData';

interface RevisionManualProps {
  liquidacion: Liquidacion;
  onGuardar: (liquidacion: Liquidacion) => void;
  onCancelar: () => void;
}

export function RevisionManual({
  liquidacion,
  onGuardar,
  onCancelar
}: RevisionManualProps) {
  
  const [hsCodeBusqueda, setHsCodeBusqueda] = useState('');
  const [arancelesSugeridos, setArancelesSugeridos] = useState<Arancel[]>([]);
  const [hsCodeSeleccionado, setHsCodeSeleccionado] = useState<Arancel | null>(
    liquidacion.hsCode && liquidacion.hsCode !== '9999.99.99' ? {
      hsCode: liquidacion.hsCode,
      descripcion: liquidacion.descripcionArancelaria || '',
      daiPercent: liquidacion.percentDAI,
      iscPercent: liquidacion.percentISC,
      itbmsPercent: liquidacion.percentITBMS,
      requiresPermiso: false,
      categoria: 'General'
    } : null
  );
  
  const [observaciones, setObservaciones] = useState(
    liquidacion.observaciones.join('\n')
  );
  
  const [valorCIFManual, setValorCIFManual] = useState(
    liquidacion.valorCIF.toString()
  );
  
  // Buscar HS Code en la base de datos local
  const buscarHSCode = () => {
    if (!hsCodeBusqueda || hsCodeBusqueda.length < 2) {
      setArancelesSugeridos([]);
      return;
    }
    
    const busquedaLower = hsCodeBusqueda.toLowerCase();
    
    // Buscar en aranceles por descripción, código o categoría
    const resultados = ARANCELES_PANAMA.filter(arancel => 
      arancel.descripcion.toLowerCase().includes(busquedaLower) ||
      arancel.hsCode.includes(hsCodeBusqueda) ||
      arancel.categoria.toLowerCase().includes(busquedaLower)
    ).slice(0, 10);
    
    // También buscar en keywords
    for (const [hsCode, keywords] of Object.entries(KEYWORDS_ARANCEL)) {
      if (keywords.some(k => k.toLowerCase().includes(busquedaLower))) {
        const arancel = ARANCELES_PANAMA.find(a => a.hsCode === hsCode);
        if (arancel && !resultados.find(r => r.hsCode === hsCode)) {
          resultados.push(arancel);
        }
      }
    }
    
    setArancelesSugeridos(resultados.slice(0, 10));
  };
  
  // Efecto para buscar mientras escribe
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarHSCode();
    }, 300);
    return () => clearTimeout(timer);
  }, [hsCodeBusqueda]);
  
  // Seleccionar HS Code
  const seleccionarHSCode = (arancel: Arancel) => {
    setHsCodeSeleccionado(arancel);
    setArancelesSugeridos([]);
    setHsCodeBusqueda('');
  };
  
  // Función para redondear a 2 decimales
  const redondear = (valor: number): number => Math.round(valor * 100) / 100;
  
  // Recalcular con nuevo HS Code
  const recalcular = (): Liquidacion => {
    if (!hsCodeSeleccionado) return liquidacion;
    
    const valorCIF = parseFloat(valorCIFManual) || liquidacion.valorCIF;
    
    // Aplicar cascada fiscal
    const baseDAI = valorCIF;
    const montoDAI = redondear(baseDAI * (hsCodeSeleccionado.daiPercent / 100));
    
    const baseISC = valorCIF + montoDAI;
    const montoISC = redondear(baseISC * (hsCodeSeleccionado.iscPercent / 100));
    
    const baseITBMS = valorCIF + montoDAI + montoISC;
    const montoITBMS = redondear(baseITBMS * (hsCodeSeleccionado.itbmsPercent / 100));
    
    const tasaAduanera = 2.00;
    const totalTributos = redondear(montoDAI + montoISC + montoITBMS + tasaAduanera);
    const totalAPagar = redondear(valorCIF + totalTributos);
    
    return {
      ...liquidacion,
      valorCIF,
      hsCode: hsCodeSeleccionado.hsCode,
      descripcionArancelaria: hsCodeSeleccionado.descripcion,
      percentDAI: hsCodeSeleccionado.daiPercent,
      percentISC: hsCodeSeleccionado.iscPercent,
      percentITBMS: hsCodeSeleccionado.itbmsPercent,
      montoDAI,
      baseISC,
      montoISC,
      baseITBMS,
      montoITBMS,
      tasaAduanera,
      tasasAdicionales: 0,
      totalTributos,
      totalAPagar,
      observaciones: observaciones.split('\n').filter(o => o.trim()),
      estado: 'calculada',
      requiereRevisionManual: false,
      motivoRevisionManual: undefined
    };
  };
  
  const handleGuardar = () => {
    const liquidacionActualizada = recalcular();
    onGuardar(liquidacionActualizada);
  };
  
  const previewCalculo = hsCodeSeleccionado ? recalcular() : null;
  
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="bg-amber-50 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Revisión Manual de Liquidación</CardTitle>
              <p className="text-sm text-amber-700">
                Guía: <span className="font-mono font-bold">{liquidacion.numeroGuia}</span>
              </p>
            </div>
          </div>
          <Badge variant="destructive">Requiere Atención</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Motivo de revisión */}
        <Alert variant="destructive" className="bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Motivo de Revisión</AlertTitle>
          <AlertDescription>
            {liquidacion.motivoRevisionManual || 'Clasificación arancelaria requerida'}
          </AlertDescription>
        </Alert>
        
        {/* Información actual */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Información del Paquete</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Categoría:</span>
              <span className="ml-2 font-medium">{liquidacion.categoriaAduanera}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant="secondary" className="ml-2">{liquidacion.estado}</Badge>
            </div>
          </div>
        </div>
        
        {/* Valor CIF */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Valor CIF (USD)</label>
          <Input
            type="number"
            step="0.01"
            value={valorCIFManual}
            onChange={(e) => setValorCIFManual(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Desglose: FOB ${liquidacion.valorFOB.toFixed(2)} + 
            Flete ${liquidacion.valorFlete.toFixed(2)} + 
            Seguro ${liquidacion.valorSeguro.toFixed(2)}
          </p>
        </div>
        
        {/* Búsqueda HS Code */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Clasificación Arancelaria (HS Code)</label>
          
          {hsCodeSeleccionado ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-green-600 mb-2">{hsCodeSeleccionado.hsCode}</Badge>
                  <p className="text-sm font-medium text-green-800">
                    {hsCodeSeleccionado.descripcion}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-green-700">
                    <span>DAI: {hsCodeSeleccionado.daiPercent}%</span>
                    <span>ISC: {hsCodeSeleccionado.iscPercent}%</span>
                    <span>ITBMS: {hsCodeSeleccionado.itbmsPercent}%</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHsCodeSeleccionado(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descripción, código HS o categoría..."
                    value={hsCodeBusqueda}
                    onChange={(e) => setHsCodeBusqueda(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {arancelesSugeridos.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="divide-y">
                    {arancelesSugeridos.map((arancel) => (
                      <button
                        key={arancel.hsCode}
                        onClick={() => seleccionarHSCode(arancel)}
                        className="w-full text-left p-3 hover:bg-muted/50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{arancel.hsCode}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {arancel.categoria}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{arancel.descripcion}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>DAI: {arancel.daiPercent}%</span>
                          <span>ISC: {arancel.iscPercent}%</span>
                          <span>ITBMS: {arancel.itbmsPercent}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              {hsCodeBusqueda.length >= 2 && arancelesSugeridos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No se encontraron códigos arancelarios
                </p>
              )}
            </>
          )}
        </div>
        
        {/* Vista previa del cálculo */}
        {previewCalculo && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Vista Previa del Cálculo</h4>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CIF</span>
                <span className="font-mono">${previewCalculo.valorCIF.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DAI ({previewCalculo.percentDAI}%)</span>
                <span className="font-mono">${previewCalculo.montoDAI.toFixed(2)}</span>
              </div>
              {previewCalculo.montoISC > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISC ({previewCalculo.percentISC}%)</span>
                  <span className="font-mono">${previewCalculo.montoISC.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ITBMS ({previewCalculo.percentITBMS}%)</span>
                <span className="font-mono">${previewCalculo.montoITBMS.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasa Aduanera</span>
                <span className="font-mono">${previewCalculo.tasaAduanera.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Tributos</span>
                <span className="font-mono">${previewCalculo.totalTributos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-blue-700">
                <span>TOTAL A PAGAR</span>
                <span className="font-mono">${previewCalculo.totalAPagar.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Observaciones */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Observaciones</label>
          <Textarea
            placeholder="Agregar observaciones o notas..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
          />
        </div>
        
        {/* Acciones */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleGuardar}
            disabled={!hsCodeSeleccionado}
            className="flex-1 gap-2"
            size="lg"
          >
            <CheckCircle className="w-4 h-4" />
            Guardar y Aplicar
          </Button>
          
          <Button
            onClick={onCancelar}
            variant="outline"
            className="flex-1 gap-2"
            size="lg"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
