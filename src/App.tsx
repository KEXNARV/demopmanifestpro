import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Historial from "./pages/Historial";
import TestDeteccion from "./pages/TestDeteccion";
import DashboardManifiesto from "./pages/DashboardManifiesto";
import NotFound from "./pages/NotFound";
import { ProtectorDatos } from "@/lib/seguridad/encriptacion";

const queryClient = new QueryClient();

const App = () => {
  // Inicializar sistema de encriptación al arrancar
  useEffect(() => {
    ProtectorDatos.inicializarSesion();
    
    return () => {
      ProtectorDatos.limpiarSesion();
    };
  }, []);

  // Limpiar al cerrar ventana/pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      ProtectorDatos.limpiarSesion();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/test-deteccion" element={<TestDeteccion />} />
          <Route path="/dashboard/:manifiestoId" element={<DashboardManifiesto />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
