import { MapPin } from 'lucide-react';
import { COMPANY_INFO, DEVELOPER_INFO } from '@/lib/companyConfig';
import logoPassarex from '@/assets/logo-pasarex.png';

export function Header() {
  return (
    <header className="border-b border-border bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={logoPassarex} 
              alt="Pasarex - Logística de confianza" 
              className="h-10 md:h-12 w-auto"
            />
          </div>
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{COMPANY_INFO.location}</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Desarrollado por {DEVELOPER_INFO.name} • v{DEVELOPER_INFO.version}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
