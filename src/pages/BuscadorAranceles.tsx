import { useState, useMemo } from 'react';
import { Search, FileText, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ARANCELES_PANAMA } from '@/lib/aduanas/arancelesData';
import { Link } from 'react-router-dom';
import { ImportadorAranceles } from '@/components/aranceles/ImportadorAranceles';
import type { Arancel } from '@/types/aduanas';

export default function BuscadorAranceles() {
  const [busqueda, setBusqueda] = useState('');
  const [arancelesImportados, setArancelesImportados] = useState<Arancel[]>([]);

  const todosAranceles = useMemo(() => {
    return [...ARANCELES_PANAMA, ...arancelesImportados];
  }, [arancelesImportados]);

  const handleImport = (nuevos: Arancel[]) => {
    setArancelesImportados(prev => [...prev, ...nuevos]);
  };

  const resultados = useMemo(() => {
    if (!busqueda.trim()) {
      return todosAranceles;
    }

    const termino = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return todosAranceles.filter(arancel => {
      const codigo = arancel.hsCode.toLowerCase();
      const descripcion = arancel.descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const categoria = (arancel.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      return codigo.includes(termino) || 
             descripcion.includes(termino) || 
             categoria.includes(termino);
    });
  }, [busqueda, todosAranceles]);

  const formatearPorcentaje = (valor: number) => {
    if (valor === 0) return 'Exento';
    return `${valor}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Buscador de Aranceles</h1>
                <p className="text-blue-200 text-sm">República de Panamá - Autoridad Nacional de Aduanas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ImportadorAranceles onImport={handleImport} />
              <Link 
                to="/" 
                className="text-blue-200 hover:text-white text-sm underline underline-offset-2"
              >
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <Card className="mb-8 border-0 shadow-xl bg-white">
          <CardContent className="pt-8 pb-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  Consulta de Códigos Arancelarios
                </h2>
                <p className="text-slate-500">
                  Busque por código arancelario (ej. "0901") o por descripción (ej. "café")
                </p>
              </div>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ingrese código o descripción del producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg border-2 border-slate-200 focus:border-blue-500 rounded-xl shadow-sm"
                />
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
                <Info className="h-4 w-4" />
                <span>Mostrando {resultados.length} de {todosAranceles.length} aranceles</span>
                {arancelesImportados.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    +{arancelesImportados.length} importados
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg font-semibold text-slate-700">
              Resultados de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableHead className="font-bold text-slate-700 w-[180px]">Código Arancelario</TableHead>
                    <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center w-[100px]">DAI</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center w-[100px]">ITBMS</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center w-[100px]">Unidad</TableHead>
                    <TableHead className="font-bold text-slate-700 w-[120px]">Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-12 w-12 text-slate-300" />
                          <p className="text-lg font-medium">No se encontraron resultados</p>
                          <p className="text-sm">Intente con otro término de búsqueda</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    resultados.map((arancel, index) => (
                      <TableRow 
                        key={arancel.hsCode} 
                        className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <TableCell className="font-mono font-medium text-blue-700">
                          {arancel.hsCode}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {arancel.descripcion}
                          {arancel.requiresPermiso && (
                            <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-600">
                              Requiere Permiso
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={arancel.daiPercent === 0 ? 'secondary' : 'default'}
                            className={arancel.daiPercent === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                          >
                            {formatearPorcentaje(arancel.daiPercent)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={arancel.itbmsPercent === 0 ? 'secondary' : 'default'}
                            className={arancel.itbmsPercent === 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}
                          >
                            {formatearPorcentaje(arancel.itbmsPercent)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-slate-600">
                          {arancel.unidad}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {arancel.categoria || 'General'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Datos basados en la nomenclatura arancelaria de Panamá.</p>
          <p className="mt-1">Para información oficial, consulte la <a href="https://www.ana.gob.pa" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Autoridad Nacional de Aduanas</a></p>
        </div>
      </main>
    </div>
  );
}
