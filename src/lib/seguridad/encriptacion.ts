import CryptoJS from 'crypto-js';

export class ProtectorDatos {
  private static STORAGE_KEY = '__app_encryption_key__';
  
  static inicializarSesion(): void {
    if (!sessionStorage.getItem(this.STORAGE_KEY)) {
      const clave = CryptoJS.lib.WordArray.random(256/8).toString();
      sessionStorage.setItem(this.STORAGE_KEY, clave);
      console.log('✅ Clave de encriptación generada');
    }
  }
  
  private static obtenerClave(): string {
    let clave = sessionStorage.getItem(this.STORAGE_KEY);
    if (!clave) {
      this.inicializarSesion();
      clave = sessionStorage.getItem(this.STORAGE_KEY)!;
    }
    return clave;
  }
  
  static encriptar(texto: string): string {
    if (!texto || texto.trim() === '') return texto;
    try {
      const clave = this.obtenerClave();
      const encrypted = CryptoJS.AES.encrypt(texto, clave);
      return encrypted.toString();
    } catch (error) {
      console.error('Error encriptando:', error);
      return texto;
    }
  }
  
  static desencriptar(textoEncriptado: string): string {
    if (!textoEncriptado || textoEncriptado.trim() === '') return textoEncriptado;
    try {
      const clave = this.obtenerClave();
      const decrypted = CryptoJS.AES.decrypt(textoEncriptado, clave);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error desencriptando:', error);
      return '[DATO PROTEGIDO]';
    }
  }
  
  static hashear(texto: string): string {
    if (!texto) return '';
    return CryptoJS.SHA256(texto).toString();
  }
  
  static ofuscar(texto: string, tipo: 'cedula' | 'telefono' | 'email' | 'direccion'): string {
    if (!texto || texto.trim() === '') return texto;
    
    switch (tipo) {
      case 'cedula':
        return texto.replace(/(\d{1,2})-(\d+)-(\d{4})/, '$1-***-$3');
      case 'telefono':
        return texto.replace(/(\+?\d{1,3})?-?(\d+)-(\d{4})/, '$1-****-$3');
      case 'email':
        const [local, domain] = texto.split('@');
        if (!domain) return texto;
        return `${local[0]}***${local[local.length-1]}@${domain}`;
      case 'direccion':
        const partes = texto.split(',');
        if (partes.length < 2) return '***';
        return `${partes[0]}, ***, ${partes[partes.length-1]}`;
      default:
        return '***';
    }
  }
  
  static limpiarSesion(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}

if (typeof window !== 'undefined') {
  ProtectorDatos.inicializarSesion();
}
