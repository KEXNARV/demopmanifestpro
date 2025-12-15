import { Plane, FileSpreadsheet } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">CargoManifest Pro</h1>
            <p className="text-sm text-muted-foreground">
              Procesador de Manifiestos de Carga Aérea
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
