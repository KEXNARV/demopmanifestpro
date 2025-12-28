import { MapPin, History, Home, Plane } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { COMPANY_INFO, DEVELOPER_INFO, PLATFORM_INFO } from '@/lib/companyConfig';
import { Button } from '@/components/ui/button';
import logoIPL from '@/assets/logo-ipl.png';

export function Header() {
  const location = useLocation();
  const isHistorial = location.pathname === '/historial';

  return (
    <header className="border-b-2 border-primary/30 bg-gradient-to-r from-primary/10 via-background to-primary/10 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-4 group">
              <div className="relative">
                <img 
                  src={logoIPL} 
                  alt="IPL Customs AI - Intelligent Broker" 
                  className="h-16 md:h-20 w-auto drop-shadow-lg transition-transform group-hover:scale-105"
                />
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                  <Plane className="w-3 h-3" />
                </div>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold text-primary tracking-tight">IPL Customs AI</span>
                <span className="text-sm font-medium text-muted-foreground">Intelligent Broker Panama</span>
                <span className="text-xs text-muted-foreground/70">Sistema de Corretaje Aduanal</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-2 ml-6 border-l border-border pl-6">
              <Link to="/">
                <Button 
                  variant={!isHistorial ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Inicio
                </Button>
              </Link>
              <Link to="/historial">
                <Button 
                  variant={isHistorial ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  Historial
                </Button>
              </Link>
            </nav>
          </div>
          <div className="hidden lg:flex flex-col items-end text-right">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{COMPANY_INFO.location}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {PLATFORM_INFO.name} v{PLATFORM_INFO.version}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {DEVELOPER_INFO.name}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
