import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Receipt, 
  Download, 
  Printer,
  Building2,
  Plane,
  Package,
  DollarSign,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { 
  DeclaracionOficial, 
  BoletaPago,
  formatearFechaANA,
  formatearPesoANA,
  formatearTarifaANA,
  CONSTANTES_ANA
} from '@/types/declaracionOficial';
import { 
  exportarDeclaracionTexto, 
  exportarBoletaTexto,
  generarBoletaPago
} from '@/lib/exportacion/generadorDeclaracionOficial';

interface PrevisualizadorDeclaracionANAProps {
  declaracion: DeclaracionOficial;
  onExportarDeclaracion?: () => void;
  onExportarBoleta?: () => void;
}

export function PrevisualizadorDeclaracionANA({ 
  declaracion,
  onExportarDeclaracion,
  onExportarBoleta
}: PrevisualizadorDeclaracionANAProps) {
  const [activeTab, setActiveTab] = useState('declaracion');
  
  // Generar boleta de pago
  const boleta = generarBoletaPago(declaracion, Math.floor(Math.random() * 100000));
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Previsualización Documento ANA
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportarDeclaracion}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="declaracion" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Declaración
            </TabsTrigger>
            <TabsTrigger value="boleta" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Boleta de Pago
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="declaracion" className="mt-4">
            <VistaDeclaracion declaracion={declaracion} />
          </TabsContent>
          
          <TabsContent value="boleta" className="mt-4">
            <VistaBoleta boleta={boleta} declaracion={declaracion} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================
// VISTA DE DECLARACIÓN
// ============================================

function VistaDeclaracion({ declaracion }: { declaracion: DeclaracionOficial }) {
  return (
    <ScrollArea className="h-[600px]">
      <div className="bg-white border rounded-lg p-6 space-y-6 font-mono text-sm">
        {/* Encabezado oficial */}
        <div className="text-center space-y-1 border-b pb-4">
          <div className="flex justify-center items-center gap-2 text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-lg">REPÚBLICA DE PANAMÁ</h2>
          <h3 className="font-semibold">AUTORIDAD NACIONAL DE ADUANAS</h3>
          <h4 className="text-primary font-bold">DECLARACIÓN</h4>
        </div>
        
        {/* Datos de cabecera */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Declaración No.:</span>
              <span className="font-bold">{declaracion.cabecera.declaracion_numero} 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha:</span>
              <span>{declaracion.cabecera.fecha_registro}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo Operación:</span>
              <span>{declaracion.cabecera.tipo_operacion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo Despacho:</span>
              <Badge variant="secondary">{declaracion.cabecera.tipo_despacho}</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vía:</span>
              <span className="flex items-center gap-1">
                <Plane className="h-3 w-3" />
                {declaracion.cabecera.via_transporte}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proc/Destino:</span>
              <span className="text-xs">{declaracion.cabecera.procedencia_destino}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aduana:</span>
              <span className="text-xs">{declaracion.cabecera.aduana_entrada}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Importador y Corredor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-3 bg-muted/50 rounded">
            <div className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              IMPORTADOR
            </div>
            <div className="text-sm">
              <div><strong>{declaracion.sujetos.importador.nombre}</strong></div>
              <div>RUC: {declaracion.sujetos.importador.identificacion}</div>
              <div>{declaracion.sujetos.importador.tipo_persona}</div>
            </div>
          </div>
          
          <div className="space-y-2 p-3 bg-muted/50 rounded">
            <div className="font-semibold">DATOS DE TRANSPORTE</div>
            <div className="text-sm space-y-1">
              <div>Madre: <strong>{declaracion.transporte.mawb_madre}</strong></div>
              <div>Hijo: <strong>{declaracion.transporte.hawb_hijo}</strong></div>
              <div>Consignante: {declaracion.transporte.consignante}</div>
              <div>Peso: {formatearPesoANA(declaracion.transporte.peso_bruto_total_kgs)} Kgs</div>
              <div>Bultos: {declaracion.transporte.bultos_declarados}</div>
            </div>
          </div>
        </div>
        
        {declaracion.sujetos.corredor_aduana && (
          <div className="p-2 bg-primary/5 rounded text-sm">
            <span className="text-muted-foreground">Corredor: </span>
            <strong>{declaracion.sujetos.corredor_aduana.nombre_completo}</strong>
          </div>
        )}
        
        <Separator />
        
        {/* Totales cabecera */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted rounded">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">F.O.B</div>
            <div className="font-bold">${declaracion.totales.valor_fob_total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">FLETE</div>
            <div className="font-bold">${declaracion.totales.valor_flete_total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">SEGURO</div>
            <div className="font-bold">${declaracion.totales.valor_seguro_total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">C.I.F</div>
            <div className="font-bold text-primary">${declaracion.totales.valor_cif_total.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-2 p-3 bg-primary/10 rounded">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">IMP IMPORT</div>
            <div className="font-bold">${declaracion.totales.impuesto_importacion_total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">ITBM</div>
            <div className="font-bold">${declaracion.totales.itbm_total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">ISC</div>
            <div className="font-bold">${declaracion.totales.isc_total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">TASA</div>
            <div className="font-bold">${declaracion.totales.tasa_uso_sistema.toFixed(2)}</div>
          </div>
          <div className="text-center bg-primary text-primary-foreground rounded p-1">
            <div className="text-xs">TOTAL</div>
            <div className="font-bold text-lg">B/. {declaracion.totales.total_a_pagar.toFixed(2)}</div>
          </div>
        </div>
        
        <Separator />
        
        {/* Artículos */}
        <div>
          <div className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            ARTÍCULOS ({declaracion.articulos.length})
          </div>
          
          <div className="space-y-3">
            {declaracion.articulos.map((art) => (
              <div key={art.numero_articulo} className="border rounded p-3 text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mr-2">#{art.numero_articulo}</Badge>
                    <span className="font-mono">{art.fraccion_arancelaria}</span>
                  </div>
                  <Badge>{art.pais_origen}</Badge>
                </div>
                
                <div className="font-medium">{art.descripcion_arancelaria}</div>
                <div className="text-muted-foreground">{art.especificacion_mercancia}</div>
                {art.codigo_referencia && (
                  <div className="text-primary text-xs">{art.codigo_referencia}</div>
                )}
                
                <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground">FOB:</span> ${art.valor_fob.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flete:</span> ${art.valor_flete.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seguro:</span> ${art.valor_seguro.toFixed(2)}
                  </div>
                  <div className="font-bold">
                    <span className="text-muted-foreground">CIF:</span> ${art.valor_cif.toFixed(2)}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs bg-muted/50 p-2 rounded">
                  <div>
                    <span className="text-muted-foreground">IMPORT/</span><br />
                    {formatearTarifaANA(art.impuestos.dai_tarifa_percent)}% = ${art.impuestos.dai_a_pagar.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ISC:</span><br />
                    {formatearTarifaANA(art.impuestos.isc_tarifa_percent)}% = ${art.impuestos.isc_a_pagar.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ITBM:</span><br />
                    {formatearTarifaANA(art.impuestos.itbm_tarifa_percent)}% = ${art.impuestos.itbm_a_pagar.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peso:</span><br />
                    {formatearPesoANA(art.peso_bruto_kgs)} Kgs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Pie de página */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <div>Pág. {declaracion.metadata?.pagina_actual || 1} de {declaracion.metadata?.total_paginas || 1}</div>
          <div className="mt-1">Generado por: {declaracion.metadata?.generado_por}</div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ============================================
// VISTA DE BOLETA
// ============================================

function VistaBoleta({ boleta, declaracion }: { boleta: BoletaPago; declaracion: DeclaracionOficial }) {
  return (
    <ScrollArea className="h-[600px]">
      <div className="bg-white border rounded-lg p-6 space-y-6 font-mono text-sm">
        {/* Encabezado oficial */}
        <div className="flex justify-between items-start">
          <div className="text-center flex-1 space-y-1">
            <h2 className="font-bold">REPÚBLICA DE PANAMÁ</h2>
            <h3 className="font-semibold text-sm">AUTORIDAD NACIONAL DE ADUANAS</h3>
            <h4 className="text-primary font-bold">BOLETA DE PAGO</h4>
          </div>
          <div className="text-right space-y-1">
            <div className="font-bold text-lg">No. {boleta.numero_control}</div>
            <div className="text-xs text-muted-foreground">
              Fecha de Impresión: {boleta.fecha_impresion}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Datos del importador */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Empresa:</span>
              <span className="ml-2 font-bold">{boleta.empresa_importador}</span>
            </div>
            <div>
              <span className="text-muted-foreground">RUC:</span>
              <span className="ml-2 font-bold">{boleta.ruc}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Fecha:</span>
              <span className="ml-2">{boleta.fecha_impresion}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Agente:</span>
              <span className="ml-2">{boleta.agente_corredor}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Tabla de formularios */}
        <div className="border rounded overflow-hidden">
          <div className="bg-muted p-2 text-xs font-semibold grid grid-cols-7 gap-2">
            <div>#</div>
            <div>Fecha Reg</div>
            <div className="col-span-2">Formulario</div>
            <div>Año</div>
            <div className="text-right">Hasta {boleta.escenarios_pago.normal.hasta_fecha}</div>
            <div className="text-right">Hasta {boleta.escenarios_pago.recargo_10_percent.hasta_fecha}</div>
          </div>
          
          {boleta.lineas.map((linea) => (
            <div key={linea.numero} className="p-2 text-xs grid grid-cols-7 gap-2 border-t">
              <div>{linea.numero}</div>
              <div>{linea.fecha_registro}</div>
              <div className="col-span-2 font-mono">{linea.formulario}</div>
              <div>{linea.año}</div>
              <div className="text-right font-bold">${linea.monto_escenario_1.toFixed(2)}</div>
              <div className="text-right font-bold">${linea.monto_escenario_2.toFixed(2)}</div>
            </div>
          ))}
          
          <div className="bg-primary/10 p-2 text-sm grid grid-cols-7 gap-2 border-t font-bold">
            <div className="col-span-5 text-right">TOTAL:</div>
            <div className="text-right">${boleta.escenarios_pago.normal.monto.toFixed(2)}</div>
            <div className="text-right">${boleta.escenarios_pago.recargo_10_percent.monto.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Escenarios de pago */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Escenarios de Pago
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Pago puntual */}
            <div className="border rounded p-3 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <CheckCircle className="h-4 w-4" />
                Pago Puntual
              </div>
              <div className="text-2xl font-bold text-green-700">
                ${boleta.escenarios_pago.normal.monto.toFixed(2)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Hasta el {boleta.escenarios_pago.normal.hasta_fecha}
              </div>
            </div>
            
            {/* Recargo 10% */}
            <div className="border rounded p-3 bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 font-semibold mb-2">
                <AlertTriangle className="h-4 w-4" />
                Recargo 10%
              </div>
              <div className="text-2xl font-bold text-orange-700">
                ${boleta.escenarios_pago.recargo_10_percent.monto.toFixed(2)}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Hasta el {boleta.escenarios_pago.recargo_10_percent.hasta_fecha}
              </div>
            </div>
            
            {/* Recargo 20% */}
            <div className="border rounded p-3 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                <AlertTriangle className="h-4 w-4" />
                Recargo 20%
              </div>
              <div className="text-2xl font-bold text-red-700">
                ${boleta.escenarios_pago.recargo_20_percent.monto.toFixed(2)}
              </div>
              <div className="text-xs text-red-600 mt-1">
                Desde el {boleta.escenarios_pago.recargo_20_percent.desde_fecha}
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Nota */}
        <div className="bg-muted/50 p-4 rounded text-xs space-y-2">
          <div className="font-semibold">Nota:</div>
          <div>Monto a pagar hasta el {boleta.escenarios_pago.normal.hasta_fecha}: <strong>${boleta.escenarios_pago.normal.monto.toFixed(2)}</strong></div>
          <div>Monto a pagar hasta el {boleta.escenarios_pago.recargo_10_percent.hasta_fecha}: <strong>${boleta.escenarios_pago.recargo_10_percent.monto.toFixed(2)}</strong></div>
          <div>Monto a pagar a partir del: <strong>${boleta.escenarios_pago.recargo_20_percent.monto.toFixed(2)}</strong></div>
          <div className="pt-2 text-muted-foreground italic">
            Esta boleta de pago al no ser pagada el {boleta.fecha_anulacion} deberá ser anulada y generar una nueva boleta de pago.
          </div>
        </div>
        
        {/* Sección Banco */}
        <div className="border-2 border-dashed p-4 text-center">
          <div className="font-bold text-lg mb-2">BANCO</div>
          <div className="text-muted-foreground text-sm">
            Espacio reservado para sello y firma bancaria
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default PrevisualizadorDeclaracionANA;
