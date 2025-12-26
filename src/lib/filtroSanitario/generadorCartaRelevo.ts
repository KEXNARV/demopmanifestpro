// ============================================
// GENERADOR DE CARTA DE RELEVO
// Documento de declaración de uso personal
// ============================================

import { ManifestRow } from '@/types/manifest';

export interface DatosCartaRelevo {
  nombreConsignatario: string;
  cedula: string;
  telefono?: string;
  direccion: string;
  descripcionProducto: string;
  trackingNumber: string;
  valorDeclarado: number;
  peso: number;
  fechaGeneracion: Date;
}

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Genera el contenido HTML de la Carta de Relevo
 */
export function generarHTMLCartaRelevo(datos: DatosCartaRelevo): string {
  const fecha = datos.fechaGeneracion.toLocaleDateString('es-PA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Sanitize all user-provided fields to prevent XSS
  const safeNombre = escapeHtml(datos.nombreConsignatario);
  const safeCedula = escapeHtml(datos.cedula || '[POR COMPLETAR]');
  const safeTelefono = escapeHtml(datos.telefono || '[POR COMPLETAR]');
  const safeDireccion = escapeHtml(datos.direccion);
  const safeDescripcion = escapeHtml(datos.descripcionProducto);
  const safeTracking = escapeHtml(datos.trackingNumber);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carta de Relevo - ${safeTracking}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 16pt;
      margin-bottom: 5px;
    }
    .header h2 {
      font-size: 14pt;
      font-weight: normal;
    }
    .content {
      text-align: justify;
    }
    .signature-section {
      margin-top: 60px;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 300px;
      margin-top: 60px;
      padding-top: 5px;
    }
    .details-box {
      border: 1px solid #000;
      padding: 15px;
      margin: 20px 0;
    }
    .details-box table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-box td {
      padding: 5px 10px;
      vertical-align: top;
    }
    .details-box td:first-child {
      font-weight: bold;
      width: 40%;
    }
    .legal-notice {
      font-size: 10pt;
      color: #666;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CARTA DE RELEVO</h1>
    <h2>DECLARACIÓN JURADA DE USO PERSONAL</h2>
    <p>Dirección Nacional de Farmacia y Drogas - MINSA</p>
  </div>

  <div class="content">
    <p>Panamá, ${fecha}</p>
    
    <p>Yo, <strong>${safeNombre}</strong>, portador(a) de la cédula de identidad personal 
    No. <strong>${safeCedula}</strong>, con domicilio en 
    <strong>${safeDireccion}</strong>, bajo juramento declaro:</p>

    <p><strong>PRIMERO:</strong> Que el siguiente producto importado es para mi uso personal y/o familiar, 
    y no tiene fines comerciales ni de reventa:</p>

    <div class="details-box">
      <table>
        <tr>
          <td>Número de Guía:</td>
          <td>${safeTracking}</td>
        </tr>
        <tr>
          <td>Descripción del Producto:</td>
          <td>${safeDescripcion}</td>
        </tr>
        <tr>
          <td>Valor Declarado:</td>
          <td>USD $${datos.valorDeclarado.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Peso:</td>
          <td>${datos.peso.toFixed(2)} lbs</td>
        </tr>
      </table>
    </div>

    <p><strong>SEGUNDO:</strong> Que la cantidad del producto corresponde a un suministro personal que 
    no excede los seis (6) meses de tratamiento o uso.</p>

    <p><strong>TERCERO:</strong> Que asumo total responsabilidad por el uso y efectos del producto importado, 
    eximiendo de cualquier responsabilidad a las autoridades aduaneras y sanitarias de Panamá.</p>

    <p><strong>CUARTO:</strong> Que estoy consciente de que proporcionar información falsa en esta 
    declaración jurada constituye un delito sancionado por las leyes de la República de Panamá.</p>

    <p><strong>QUINTO:</strong> Que autorizo a las autoridades competentes a verificar la información 
    proporcionada en este documento.</p>

    <div class="signature-section">
      <div class="signature-line">
        ${safeNombre}<br>
        Cédula: ${safeCedula}<br>
        Tel: ${safeTelefono}
      </div>
    </div>

    <div class="legal-notice">
      <p><strong>NOTA LEGAL:</strong> Este documento tiene validez únicamente para la importación 
      del paquete especificado. La falsificación o adulteración de esta declaración está penada 
      conforme al Código Penal de la República de Panamá.</p>
      <p>Documento generado automáticamente por el Sistema de Gestión de Manifiestos - PASAREX</p>
      <p>Fecha y hora de generación: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Genera datos para la carta desde un paquete del manifiesto
 */
export function crearDatosCartaDesdeManifiesto(paquete: ManifestRow): DatosCartaRelevo {
  return {
    nombreConsignatario: paquete.recipient || 'Consignatario',
    cedula: paquete.identification || '',
    telefono: paquete.phone,
    direccion: paquete.address || 'Dirección no especificada',
    descripcionProducto: paquete.description,
    trackingNumber: paquete.trackingNumber,
    valorDeclarado: paquete.valueUSD || 0,
    peso: paquete.weight || 0,
    fechaGeneracion: new Date()
  };
}

/**
 * Descarga la carta de relevo como archivo HTML
 */
export function descargarCartaRelevo(datos: DatosCartaRelevo): void {
  const html = generarHTMLCartaRelevo(datos);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Carta_Relevo_${datos.trackingNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
