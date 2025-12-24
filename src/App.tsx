import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Historial from "./pages/Historial";
import TestDeteccion from "./pages/TestDeteccion";
import DashboardManifiesto from "./pages/DashboardManifiesto";
import BuscadorAranceles from "./pages/BuscadorAranceles";
import NotFound from "./pages/NotFound";
import { ProtectorDatos } from "@/lib/seguridad/encriptacion";

const queryClient = new QueryClient();

const App: React.FC = () => {
  // Inicializar sistema de encriptación al arrancar
  useEffect(() => {
    let mounted = true;
    
    const initSession = async () => {
      try {
        if (mounted) {
          await ProtectorDatos.inicializarSesion();
        }
      } catch (error) {
        console.warn('Error inicializando sesión de seguridad');
      }
    };
    
    initSession();
    
    return () => {
      mounted = false;
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Ruta pública de autenticación */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Rutas protegidas */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              
              <Route path="/historial" element={
                <ProtectedRoute>
                  <Historial />
                </ProtectedRoute>
              } />
              
              <Route path="/test-deteccion" element={
                <ProtectedRoute allowedRoles={['admin', 'revisor']}>
                  <TestDeteccion />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard/:manifiestoId" element={
                <ProtectedRoute>
                  <DashboardManifiesto />
                </ProtectedRoute>
              } />
              
              <Route path="/aranceles" element={
                <ProtectedRoute>
                  <BuscadorAranceles />
                </ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
