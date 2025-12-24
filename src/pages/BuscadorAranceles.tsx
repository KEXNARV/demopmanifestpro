import { useState, useMemo } from 'react';
import { Search, FileText, Info, AlertTriangle, CheckCircle, Cpu, Shield, Calculator, TestTube, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ARANCELES_COMPLETOS, expandirBusqueda } from '@/lib/aduanas/arancelesCompletos';
import { 
  classifyProduct, 
  calculateTaxes, 
  getRequiredPermits, 
  runTestCases,
  validateClassification,
  type MatchResult,
  type RegulatoryAlert,
  type TaxCalculation
} from '@/lib/clasificacion/fuzzyMatcher';
import { Link } from 'react-router-dom';
import { ImportadorAranceles } from '@/components/aranceles/ImportadorAranceles';
import { CalculadoraLandedCost } from '@/components/aranceles/CalculadoraLandedCost';
import type { Arancel } from '@/types/aduanas';

// Términos que requieren desambiguación
const TERMINOS_AMBIGUOS: Record<string, { mensaje: string; opciones: string[] }> = {
  "neumatico": { mensaje: "¿Qué tipo de neumático buscas?", opciones: ["Auto", "Moto", "Bicicleta"] },
  "llanta": { mensaje: "¿Qué tipo de llanta buscas?", opciones: ["Auto", "Moto", "Bicicleta"] },
  "freno": { mensaje: "¿Frenos para qué vehículo?", opciones: ["Auto", "Moto", "Bicicleta"] },
};

// Términos que muestran alertas especiales
const ALERTAS_ESPECIALES: Record<string, { tipo: 'warning' | 'info'; titulo: string; mensaje: string }> = {
  "vaper": { tipo: 'warning', titulo: 'Regulación Sanitaria', mensaje: 'Los cigarrillos electrónicos y vapers están sujetos a regulaciones sanitarias adicionales en Panamá. Consulte con MINSA.' },
  "cigarrillo electronico": { tipo: 'warning', titulo: 'Regulación Sanitaria', mensaje: 'Los cigarrillos electrónicos y vapers están sujetos a regulaciones sanitarias adicionales en Panamá. Consulte con MINSA.' },
  "gpu": { tipo: 'info', titulo: 'Nota sobre clasificación', mensaje: 'En Panamá, partes de PC pueden clasificarse como "Partes y accesorios de máquinas" o "Circuitos integrados".' },
  "tarjeta de video": { tipo: 'info', titulo: 'Nota sobre clasificación', mensaje: 'En Panamá, partes de PC pueden clasificarse como "Partes y accesorios de máquinas" o "Circuitos integrados".' },
  "motherboard": { tipo: 'info', titulo: 'Nota sobre clasificación', mensaje: 'En Panamá, partes de PC pueden clasificarse como "Partes y accesorios de máquinas" o "Circuitos integrados".' },
};

export default function BuscadorAranceles() {
  const [busqueda, setBusqueda] = useState('');
  const [arancelesImportados, setArancelesImportados] = useState<Arancel[]>([]);
  const [valorCIF, setValorCIF] = useState<string>('');
  const [selectedArancel, setSelectedArancel] = useState<Arancel | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  const todosAranceles = useMemo(() => {
    return [...ARANCELES_COMPLETOS, ...arancelesImportados];
  }, [arancelesImportados]);

  const handleImport = (nuevos: Arancel[]) => {
    setArancelesImportados(prev => [...prev, ...nuevos]);
  };

  // Clasificación inteligente con fuzzy matching
  const classification = useMemo(() => {
    if (!busqueda.trim()) return null;
    return classifyProduct(busqueda, valorCIF ? parseFloat(valorCIF) : undefined);
  }, [busqueda, valorCIF]);

  // Detectar si hay desambiguación necesaria
  const desambiguacion = useMemo(() => {
    if (!busqueda.trim()) return null;
    const terminoNorm = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, value] of Object.entries(TERMINOS_AMBIGUOS)) {
      if (terminoNorm.includes(key)) return value;
    }
    return null;
  }, [busqueda]);

  // Detectar alertas especiales
  const alertaEspecial = useMemo(() => {
    if (!busqueda.trim()) return null;
    const terminoNorm = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, value] of Object.entries(ALERTAS_ESPECIALES)) {
      if (terminoNorm.includes(key)) return value;
    }
    return null;
  }, [busqueda]);

  // Resultados filtrados (fallback al método tradicional si no hay clasificación)
  const resultados = useMemo(() => {
    if (!busqueda.trim()) return todosAranceles.slice(0, 50);
    
    if (classification?.matches.length) {
      return classification.matches.map(m => m.arancel);
    }

    const terminosExpandidos = expandirBusqueda(busqueda);
    return todosAranceles.filter(arancel => {
      const textoCompleto = `${arancel.hsCode} ${arancel.descripcion} ${arancel.categoria || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return terminosExpandidos.some(termino => textoCompleto.includes(termino));
    }).slice(0, 50);
  }, [busqueda, todosAranceles, classification]);

  const formatearPorcentaje = (valor: number) => valor === 0 ? 'Exento' : `${valor}%`;
  const formatearMoneda = (valor: number) => `$${valor.toFixed(2)}`;

  const esLibreDeImpuestos = (arancel: Arancel) => arancel.daiPercent === 0 && arancel.itbmsPercent === 0;
  const esComponentePC = (arancel: Arancel) => arancel.categoria === 'Componentes PC';

  const handleOpcionDesambiguacion = (opcion: string) => {
    setBusqueda(prev => `${prev} ${opcion}`);
  };

  const handleSelectArancel = (arancel: Arancel) => {
    setSelectedArancel(arancel);
  };

  // Test results
  const testResults = useMemo(() => showTestResults ? runTestCases() : null, [showTestResults]);

  // Calcular impuestos para arancel seleccionado
  const taxCalc = useMemo(() => {
    if (!selectedArancel || !valorCIF) return null;
    return calculateTaxes(selectedArancel, parseFloat(valorCIF));
  }, [selectedArancel, valorCIF]);

  // Permisos requeridos para arancel seleccionado
  const permits = useMemo(() => {
    if (!selectedArancel) return [];
    return getRequiredPermits(selectedArancel);
  }, [selectedArancel]);

  // Validación del arancel seleccionado
  const validation = useMemo(() => {
    if (!selectedArancel) return null;
    return validateClassification(selectedArancel, valorCIF ? parseFloat(valorCIF) : 0);
  }, [selectedArancel, valorCIF]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Clasificador Arancelario Inteligente</h1>
                <p className="text-blue-200 text-sm">República de Panamá - Sistema con Matching 85%+</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setShowTestResults(!showTestResults)}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Cases
              </Button>
              <ImportadorAranceles onImport={handleImport} />
              <Link to="/" className="text-blue-200 hover:text-white text-sm underline underline-offset-2">
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Test Results Panel */}
        {showTestResults && testResults && (
          <Card className="mb-6 border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5 text-purple-600" />
                Resultados de Casos de Prueba
              </CardTitle>
              <CardDescription>
                Passed: {testResults.passed} | Failed: {testResults.failed}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.results.map((r, i) => (
                  <div key={i} className={`p-2 rounded text-sm ${r.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                    <span className="font-medium">{r.input}</span>
                    <span className="mx-2">→</span>
                    <span className="font-mono">{r.actualHSCode || 'No match'}</span>
                    <span className="ml-2 text-xs text-slate-600">
                      (Score: {r.matchScore}%)
                    </span>
                    {!r.passed && (
                      <span className="ml-2 text-red-600 text-xs">
                        Expected: {r.expectedHSCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Search and Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Section */}
            <Card className="border-0 shadow-xl bg-white">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                      Búsqueda Inteligente de Aranceles
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Escriba el producto para clasificación automática (ej. "Laptop Dell", "iPhone", "Air Fryer")
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Ingrese producto a clasificar..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-12 pr-4 py-6 text-lg border-2 border-slate-200 focus:border-blue-500 rounded-xl"
                      />
                    </div>
                    <div className="w-40">
                      <Input
                        type="number"
                        placeholder="Valor CIF $"
                        value={valorCIF}
                        onChange={(e) => setValorCIF(e.target.value)}
                        className="h-full border-2 border-slate-200 focus:border-blue-500 rounded-xl text-center"
                      />
                    </div>
                  </div>

                  {/* Match Confidence Indicator */}
                  {classification?.bestMatch && (
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-5 w-5 ${
                          classification.bestMatch.confidence === 'high' ? 'text-green-600' :
                          classification.bestMatch.confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }`} />
                        <span className="font-medium">Match: {classification.bestMatch.score}%</span>
                      </div>
                      <Badge variant={classification.bestMatch.confidence === 'high' ? 'default' : 'secondary'} 
                             className={classification.bestMatch.confidence === 'high' ? 'bg-green-500' : ''}>
                        {classification.bestMatch.confidence === 'high' ? 'Alta Confianza' :
                         classification.bestMatch.confidence === 'medium' ? 'Confianza Media' : 'Requiere Revisión'}
                      </Badge>
                      {classification.ambiguous && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          ⚠️ Múltiples Coincidencias
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Info className="h-4 w-4" />
                    <span>Mostrando {resultados.length} de {todosAranceles.length} aranceles</span>
                    {arancelesImportados.length > 0 && (
                      <Badge variant="secondary" className="ml-2">+{arancelesImportados.length} importados</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desambiguación */}
            {desambiguacion && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Info className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">{desambiguacion.mensaje}</span>
                    <div className="flex gap-2">
                      {desambiguacion.opciones.map((opcion) => (
                        <Badge 
                          key={opcion}
                          variant="outline" 
                          className="cursor-pointer hover:bg-blue-100 border-blue-300 text-blue-700"
                          onClick={() => handleOpcionDesambiguacion(opcion)}
                        >
                          {opcion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alertas especiales */}
            {alertaEspecial && (
              <Alert className={alertaEspecial.tipo === 'warning' ? 'border-amber-500 bg-amber-50' : 'border-blue-500 bg-blue-50'}>
                {alertaEspecial.tipo === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Cpu className="h-4 w-4 text-blue-600" />}
                <AlertTitle className={alertaEspecial.tipo === 'warning' ? 'text-amber-800' : 'text-blue-800'}>
                  {alertaEspecial.titulo}
                </AlertTitle>
                <AlertDescription className={alertaEspecial.tipo === 'warning' ? 'text-amber-700' : 'text-blue-700'}>
                  {alertaEspecial.mensaje}
                </AlertDescription>
              </Alert>
            )}

            {/* Results Table */}
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg font-semibold text-slate-700">Resultados de Clasificación</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 w-[140px]">Código HS</TableHead>
                        <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center w-[80px]">DAI</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center w-[80px]">ITBMS</TableHead>
                        <TableHead className="font-bold text-slate-700 w-[120px]">Estado</TableHead>
                        <TableHead className="font-bold text-slate-700 w-[80px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                              <Search className="h-12 w-12 text-slate-300" />
                              <p className="text-lg font-medium">No se encontraron resultados</p>
                              <p className="text-sm">Intente con términos más específicos o use el código HS</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        resultados.map((arancel, index) => {
                          const matchInfo = classification?.matches.find(m => m.arancel.hsCode === arancel.hsCode);
                          return (
                            <TableRow 
                              key={`${arancel.hsCode}-${index}`} 
                              className={`cursor-pointer hover:bg-blue-50 ${selectedArancel?.hsCode === arancel.hsCode ? 'bg-blue-100' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${esLibreDeImpuestos(arancel) ? 'bg-green-50/50' : ''}`}
                              onClick={() => handleSelectArancel(arancel)}
                            >
                              <TableCell className="font-mono font-medium text-blue-700 text-sm">
                                {arancel.hsCode}
                                {matchInfo && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    {matchInfo.score}% match
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                <div className="space-y-1">
                                  <span className="text-sm">{arancel.descripcion}</span>
                                  {arancel.requiresPermiso && (
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 ml-2">
                                      Requiere Permiso
                                    </Badge>
                                  )}
                                  {esComponentePC(arancel) && (
                                    <p className="text-xs text-blue-600 italic">Ver nota sobre clasificación</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={arancel.daiPercent === 0 ? 'bg-green-100 text-green-700' : arancel.daiPercent > 50 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                                  {formatearPorcentaje(arancel.daiPercent)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={arancel.itbmsPercent === 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                                  {formatearPorcentaje(arancel.itbmsPercent)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {esLibreDeImpuestos(arancel) ? (
                                  <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1 text-xs">
                                    <CheckCircle className="h-3 w-3" />
                                    Libre
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">{arancel.categoria || 'General'}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => handleSelectArancel(arancel)}>
                                  <Calculator className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details Panel */}
          <div className="space-y-6">
            {selectedArancel ? (
              <>
                {/* Selected Product Card */}
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-blue-800">Producto Seleccionado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-slate-500">Código HS</span>
                        <p className="font-mono font-bold text-blue-700">{selectedArancel.hsCode}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Descripción</span>
                        <p className="text-sm font-medium">{selectedArancel.descripcion}</p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-xs text-slate-500">DAI</span>
                          <p className="font-bold text-lg">{formatearPorcentaje(selectedArancel.daiPercent)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">ITBMS</span>
                          <p className="font-bold text-lg">{formatearPorcentaje(selectedArancel.itbmsPercent)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Unidad</span>
                          <p className="font-bold text-lg">{selectedArancel.unidad}</p>
                        </div>
                      </div>

                      {/* Botón Calcular Impuestos (AWB) */}
                      <div className="pt-3 border-t border-blue-200">
                        <CalculadoraLandedCost arancel={selectedArancel} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Calculator */}
                {taxCalc && (
                  <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Cálculo de Impuestos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {taxCalc.breakdown.map((item, i) => (
                          <div key={i} className="flex justify-between items-center py-1 border-b border-green-100 last:border-0">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="font-mono font-bold">{formatearMoneda(item.value)}</span>
                          </div>
                        ))}
                        {taxCalc.isExempt && (
                          <Badge className="bg-green-500 text-white w-full justify-center mt-2">
                            ✓ {taxCalc.exemptionReason}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regulatory Alerts */}
                {permits.length > 0 && (
                  <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Entidades Reguladoras
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {permits.map((permit, i) => (
                          <div key={i} className={`p-3 rounded-lg ${
                            permit.severity === 'critical' ? 'bg-red-100 border border-red-300' :
                            permit.severity === 'warning' ? 'bg-amber-100 border border-amber-300' :
                            'bg-blue-100 border border-blue-300'
                          }`}>
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs shrink-0">{permit.entityCode}</Badge>
                              <div>
                                <p className="font-medium text-sm">{permit.entity}</p>
                                <p className="text-xs text-slate-600 mt-1">{permit.requirement}</p>
                                <p className="text-xs text-slate-500 mt-1">{permit.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Validation Warnings */}
                {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                  <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-800">Validaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {validation.errors.map((err, i) => (
                          <div key={i} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="text-red-500">✗</span> {err}
                          </div>
                        ))}
                        {validation.warnings.map((warn, i) => (
                          <div key={i} className="text-sm text-amber-700 flex items-start gap-2">
                            <span className="text-amber-500">⚠</span> {warn}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="py-12 text-center text-slate-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium">Seleccione un producto</p>
                  <p className="text-sm">Para ver cálculo de impuestos y permisos requeridos</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Estadísticas de Base de Datos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">{todosAranceles.length}</p>
                    <p className="text-xs text-slate-600">Total Códigos</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">
                      {todosAranceles.filter(a => a.daiPercent === 0 && a.itbmsPercent === 0).length}
                    </p>
                    <p className="text-xs text-slate-600">Exentos</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-700">
                      {todosAranceles.filter(a => a.requiresPermiso).length}
                    </p>
                    <p className="text-xs text-slate-600">Con Permisos</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-700">
                      {new Set(todosAranceles.map(a => a.categoria)).size}
                    </p>
                    <p className="text-xs text-slate-600">Categorías</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Sistema de Clasificación Arancelaria - Matching Inteligente con score mínimo 85%</p>
          <p className="mt-1">Para información oficial, consulte la <a href="https://www.ana.gob.pa" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Autoridad Nacional de Aduanas</a></p>
        </div>
      </main>
    </div>
  );
}
