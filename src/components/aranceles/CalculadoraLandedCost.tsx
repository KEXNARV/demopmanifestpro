import { useState, useEffect, useMemo } from 'react';
import { Calculator, Scale, DollarSign, Truck, Shield, AlertTriangle, CheckCircle, Briefcase, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { jsPDF } from 'jspdf';
import type { Arancel } from '@/types/aduanas';

interface CalculadoraLandedCostProps {
  arancel: Arancel;
  trigger?: React.ReactNode;
}

interface LandedCostResult {
  valorFOB: number;
  costoFlete: number;
  seguro: number;
  valorCIF: number;
  daiPercent: number;
  daiAmount: number;
  baseITBMS: number;
  itbmsPercent: number;
  itbmsAmount: number;
  tasaAdministrativa: number;
  esImportacionFormal: boolean;
  totalTributos: number;
  totalAPagar: number;
}

// Tarifa promedio de mercado por libra
const TARIFA_POR_LIBRA = 3.50;

// Umbral para Importación Formal
const UMBRAL_IMPORTACION_FORMAL = 2000;
const TASA_ADMINISTRATIVA = 70;

export function CalculadoraLandedCost({ arancel, trigger }: CalculadoraLandedCostProps) {
  const [valorFOB, setValorFOB] = useState<string>('');
  const [costoFlete, setCostoFlete] = useState<string>('');
  const [seguro, setSeguro] = useState<string>('');
  const [pesoLibras, setPesoLibras] = useState<string>('');
  const [usarSeguroAuto, setUsarSeguroAuto] = useState(true);
  const [showPesoEstimator, setShowPesoEstimator] = useState(false);

  // Parsear porcentajes desde la base de datos
  const parsePercent = (value: number | string | undefined): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const str = String(value).toLowerCase().trim();
    if (str === 'exento' || str === 'exempt' || str === '') return 0;
    // Remover % y convertir
    const cleaned = str.replace('%', '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const daiPercent = parsePercent(arancel.daiPercent);
  const itbmsPercent = parsePercent(arancel.itbmsPercent);

  // Calcular seguro automático (1% del FOB)
  useEffect(() => {
    if (usarSeguroAuto && valorFOB) {
      const fob = parseFloat(valorFOB) || 0;
      setSeguro((fob * 0.01).toFixed(2));
    }
  }, [valorFOB, usarSeguroAuto]);

  // Estimar flete por peso
  const estimarPorPeso = () => {
    const peso = parseFloat(pesoLibras) || 0;
    const estimado = peso * TARIFA_POR_LIBRA;
    setCostoFlete(estimado.toFixed(2));
    setShowPesoEstimator(false);
  };

  // Calcular Landed Cost
  const resultado = useMemo((): LandedCostResult | null => {
    const fob = parseFloat(valorFOB) || 0;
    const flete = parseFloat(costoFlete) || 0;
    const seg = parseFloat(seguro) || 0;

    if (fob <= 0) return null;

    // Paso A: CIF
    const valorCIF = fob + flete + seg;

    // Paso B: DAI
    const daiAmount = valorCIF * (daiPercent / 100);

    // Paso C: Base ITBMS
    const baseITBMS = valorCIF + daiAmount;

    // Paso D: ITBMS
    const itbmsAmount = baseITBMS * (itbmsPercent / 100);

    // Paso E: Tasa Administrativa (TGA)
    const esImportacionFormal = valorCIF >= UMBRAL_IMPORTACION_FORMAL;
    const tasaAdministrativa = esImportacionFormal ? TASA_ADMINISTRATIVA : 0;

    // Paso F: Total (CIF + DAI + ITBMS + TGA)
    const totalTributos = daiAmount + itbmsAmount + tasaAdministrativa;
    const totalAPagar = valorCIF + totalTributos;

    return {
      valorFOB: fob,
      costoFlete: flete,
      seguro: seg,
      valorCIF,
      daiPercent,
      daiAmount,
      baseITBMS,
      itbmsPercent,
      itbmsAmount,
      tasaAdministrativa,
      esImportacionFormal,
      totalTributos,
      totalAPagar,
    };
  }, [valorFOB, costoFlete, seguro, daiPercent, itbmsPercent]);

  const formatMoney = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatMoneyPDF = (value: number) => `$${value.toFixed(2)}`;

  const isExento = daiPercent === 0 && itbmsPercent === 0;

  // Generar PDF
  const generarPDF = () => {
    if (!resultado) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Colores
    const primaryColor: [number, number, number] = [30, 64, 175]; // blue-800
    const textColor: [number, number, number] = [51, 65, 85]; // slate-700
    const lightGray: [number, number, number] = [241, 245, 249]; // slate-100

    // Encabezado
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Estimado de Costos Aduanales', margin, y + 8);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Basado en el Arancel de Importacion de Panama', margin, y + 18);
    
    const fecha = new Date().toLocaleDateString('es-PA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.setFontSize(10);
    doc.text(`Fecha de generacion: ${fecha}`, margin, y + 28);

    y = 55;

    // Detalle del Producto
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle del Producto', margin, y);
    y += 8;

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const productDetails = [
      ['Producto:', arancel.descripcion],
      ['Codigo Arancelario (HS):', arancel.hsCode],
      ['DAI Aplicado:', `${resultado.daiPercent}%`],
      ['ITBMS Aplicado:', `${resultado.itbmsPercent}%`],
      ['Categoria:', arancel.categoria || 'General'],
    ];

    productDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), margin + 50, y);
      y += 6;
    });

    y += 10;

    // Tabla de Desglose
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Desglose de Costos (Liquidacion)', margin, y);
    y += 8;

    doc.setDrawColor(...primaryColor);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const tableData = [
      { label: 'Valor FOB (Mercancia)', value: resultado.valorFOB, isHeader: false },
      { label: 'Flete Estimado', value: resultado.costoFlete, isHeader: false },
      { label: 'Seguro (1%)', value: resultado.seguro, isHeader: false },
      { label: 'VALOR CIF (Base Imponible)', value: resultado.valorCIF, isHeader: true },
      { label: `(+) Arancel de Importacion (DAI ${resultado.daiPercent}%)`, value: resultado.daiAmount, isHeader: false },
      { label: `(+) ITBMS (${resultado.itbmsPercent}%)`, value: resultado.itbmsAmount, isHeader: false },
    ];

    if (resultado.esImportacionFormal) {
      tableData.push({ label: '(+) Tasa Administrativa (TGA)', value: resultado.tasaAdministrativa, isHeader: false });
    }

    doc.setTextColor(...textColor);
    doc.setFontSize(10);

    tableData.forEach((item, index) => {
      if (item.isHeader) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(item.label, margin + 2, y);
      doc.text(formatMoneyPDF(item.value), pageWidth - margin - 25, y, { align: 'right' });
      y += 8;
    });

    y += 5;

    // Total Tributos
    doc.setFillColor(254, 243, 199); // amber-100
    doc.rect(margin, y - 4, pageWidth - margin * 2, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text('TOTAL A PAGAR EN ADUANAS:', margin + 2, y + 2);
    doc.setFontSize(12);
    doc.text(formatMoneyPDF(resultado.totalTributos), pageWidth - margin - 25, y + 2, { align: 'right' });
    y += 15;

    // Total Final
    doc.setFillColor(...primaryColor);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text('COSTO TOTAL (Mercancia + Impuestos):', margin + 2, y + 3);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatMoneyPDF(resultado.totalAPagar), pageWidth - margin - 25, y + 3, { align: 'right' });

    y += 25;

    // Alerta Importacion Formal
    if (resultado.esImportacionFormal) {
      doc.setFillColor(254, 249, 195); // yellow-100
      doc.rect(margin, y - 4, pageWidth - margin * 2, 18, 'F');
      doc.setTextColor(133, 77, 14); // yellow-800
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('IMPORTACION FORMAL', margin + 2, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const alertText = 'Al superar los $2,000 CIF, esta carga requiere un Corredor de Aduanas. Los honorarios del corredor no estan incluidos en este estimado.';
      const splitAlert = doc.splitTextToSize(alertText, pageWidth - margin * 2 - 4);
      doc.text(splitAlert, margin + 2, y + 9);
      y += 25;
    }

    // Disclaimer
    y = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const disclaimer = 'Este documento es una estimacion referencial basada en los datos proporcionados. No constituye una liquidacion oficial de la Autoridad Nacional de Aduanas. Los aforadores oficiales tienen la potestad final sobre la clasificacion y valoracion de la mercancia.';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
    doc.text(splitDisclaimer, margin, y);

    // Descargar
    const fileName = `estimado-aduanal-${arancel.hsCode.replace(/\./g, '')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Impuestos (AWB)
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-white">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6 text-green-600" />
            Calculadora de Landed Cost
          </SheetTitle>
          <SheetDescription>
            Calcule el costo total de importación a Panamá
          </SheetDescription>
        </SheetHeader>

        {/* Producto Seleccionado */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Código HS:</span>
                <Badge variant="outline" className="font-mono bg-white">
                  {arancel.hsCode}
                </Badge>
              </div>
              <p className="font-medium text-slate-800">{arancel.descripcion}</p>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">DAI:</span>
                  <Badge className={daiPercent > 0 ? 'bg-amber-500' : 'bg-green-500'}>
                    {daiPercent > 0 ? `${daiPercent}%` : 'Exento'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">ITBMS:</span>
                  <Badge className={itbmsPercent > 0 ? 'bg-blue-500' : 'bg-green-500'}>
                    {itbmsPercent > 0 ? `${itbmsPercent}%` : 'Exento'}
                  </Badge>
                </div>
              </div>
              {isExento && (
                <div className="flex items-center gap-2 mt-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Producto libre de impuestos</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulario de Entrada */}
        <div className="space-y-5">
          {/* Valor FOB */}
          <div className="space-y-2">
            <Label htmlFor="fob" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-500" />
              Valor FOB (Precio de Compra)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                id="fob"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valorFOB}
                onChange={(e) => setValorFOB(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Costo Flete */}
          <div className="space-y-2">
            <Label htmlFor="flete" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-500" />
              Costo Flete (AWB)
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="flete"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costoFlete}
                  onChange={(e) => setCostoFlete(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Popover open={showPesoEstimator} onOpenChange={setShowPesoEstimator}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0" title="Estimar por peso">
                    <Scale className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 bg-white z-50" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold">Estimar por Peso</h4>
                    </div>
                    <p className="text-sm text-slate-600">
                      Si no conoce el costo exacto del flete, ingrese el peso estimado.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="peso">Peso en Libras (lb)</Label>
                      <Input
                        id="peso"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Ej: 5.5"
                        value={pesoLibras}
                        onChange={(e) => setPesoLibras(e.target.value)}
                      />
                      <p className="text-xs text-slate-500">
                        Tarifa estimada: ${TARIFA_POR_LIBRA.toFixed(2)} USD/lb
                      </p>
                    </div>
                    {pesoLibras && parseFloat(pesoLibras) > 0 && (
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-sm font-medium text-green-800">
                          Flete estimado: {formatMoney(parseFloat(pesoLibras) * TARIFA_POR_LIBRA)}
                        </p>
                      </div>
                    )}
                    <Button 
                      onClick={estimarPorPeso} 
                      className="w-full"
                      disabled={!pesoLibras || parseFloat(pesoLibras) <= 0}
                    >
                      Usar Estimación
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-slate-500">
              Use el botón de balanza para estimar el flete por peso
            </p>
          </div>

          {/* Seguro */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="seguro" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500" />
                Seguro
              </Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarSeguroAuto}
                  onChange={(e) => setUsarSeguroAuto(e.target.checked)}
                  className="rounded"
                />
                <span className="text-slate-600">Auto (1% FOB)</span>
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                id="seguro"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={seguro}
                onChange={(e) => {
                  setSeguro(e.target.value);
                  setUsarSeguroAuto(false);
                }}
                className="pl-8"
                disabled={usarSeguroAuto}
              />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Resultado */}
        {resultado ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              Desglose de Costos
            </h3>

            {/* Desglose detallado */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
              {/* CIF */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Valor FOB:</span>
                  <span>{formatMoney(resultado.valorFOB)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>+ Flete:</span>
                  <span>{formatMoney(resultado.costoFlete)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>+ Seguro:</span>
                  <span>{formatMoney(resultado.seguro)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span className="text-blue-700">Valor CIF:</span>
                  <span className="text-blue-700">{formatMoney(resultado.valorCIF)}</span>
                </div>
              </div>

              <Separator />

              {/* DAI */}
              <div className="flex justify-between">
                <span className="text-slate-700">
                  DAI ({resultado.daiPercent}% de CIF):
                </span>
                <span className={resultado.daiAmount > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                  {resultado.daiAmount > 0 ? formatMoney(resultado.daiAmount) : 'Exento'}
                </span>
              </div>

              {/* Base ITBMS */}
              <div className="flex justify-between text-sm text-slate-500">
                <span>Base ITBMS (CIF + DAI):</span>
                <span>{formatMoney(resultado.baseITBMS)}</span>
              </div>

              {/* ITBMS */}
              <div className="flex justify-between">
                <span className="text-slate-700">
                  ITBMS ({resultado.itbmsPercent}% de Base):
                </span>
                <span className={resultado.itbmsAmount > 0 ? 'text-blue-600 font-medium' : 'text-green-600'}>
                  {resultado.itbmsAmount > 0 ? formatMoney(resultado.itbmsAmount) : 'Exento'}
                </span>
              </div>

              <Separator />

              {/* Tasa Administrativa (TGA) */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700">Tasa Administrativa (TGA):</span>
                  {resultado.esImportacionFormal && (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 bg-amber-50">
                      Importación Formal
                    </Badge>
                  )}
                </div>
                <span className={resultado.tasaAdministrativa > 0 ? 'text-purple-600 font-medium' : 'text-green-600'}>
                  {formatMoney(resultado.tasaAdministrativa)}
                </span>
              </div>
            </div>

            {/* Alerta de Importación Formal */}
            {resultado.esImportacionFormal && (
              <Alert className="border-amber-400 bg-amber-50">
                <Briefcase className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Importación Formal</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  Al superar los $2,000 CIF, esta carga se considera <strong>Importación Formal</strong>. 
                  Requiere pago de Tasa Administrativa ($70) y contratación de un <strong>Corredor de Aduanas</strong> (Honorarios no incluidos aquí).
                </AlertDescription>
              </Alert>
            )}

            {/* Total Tributos */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-amber-800">Total Tributos:</span>
                <span className="font-bold text-amber-800 text-lg">
                  {formatMoney(resultado.totalTributos)}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                DAI + ITBMS{resultado.esImportacionFormal ? ' + TGA' : ''}
              </p>
            </div>

            {/* TOTAL A PAGAR */}
            <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-green-100 text-sm">COSTO TOTAL PUESTO EN PANAMÁ</p>
                  <p className="text-xs text-green-200 mt-1">
                    CIF + DAI + ITBMS{resultado.esImportacionFormal ? ' + TGA' : ''}
                  </p>
                </div>
                <span className="font-bold text-3xl">
                  {formatMoney(resultado.totalAPagar)}
                </span>
              </div>
            </div>

            {/* Botón Descargar PDF */}
            <Button 
              onClick={generarPDF}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Estimado en PDF
            </Button>

            {/* Advertencia si hay impuestos altos */}
            {resultado.daiPercent > 50 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Producto con DAI elevado</p>
                  <p className="text-sm text-amber-700">
                    Este producto tiene un arancel superior al 50%. Verifique contingentes arancelarios disponibles.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Calculator className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Ingrese el Valor FOB para calcular los impuestos</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
