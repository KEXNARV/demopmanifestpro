import type { Arancel } from '@/types/aduanas';

// Aranceles completos de Panamá - Importados desde CSV oficial
export const ARANCELES_COMPLETOS: Arancel[] = [
  { hsCode: "0101.21.00.00", descripcion: "Caballos reproductores de raza pura", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Animales", unidad: "u" },
  { hsCode: "0105.11.00.00", descripcion: "Gallos y gallinas (peso <= 185 g)", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Animales", unidad: "u" },
  { hsCode: "0201.30.00.00", descripcion: "Carne de bovino deshuesada (fresca/refrig)", daiPercent: 30, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Carnes", unidad: "kg" },
  { hsCode: "0203.11.00.00", descripcion: "Carne de cerdo (canales o medias canales)", daiPercent: 40, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Carnes", unidad: "kg" },
  { hsCode: "0207.12.00.00", descripcion: "Pollo entero congelado (sin trocear)", daiPercent: 260, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Carnes", unidad: "kg" },
  { hsCode: "0306.17.00.00", descripcion: "Camarones y langostinos congelados", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Mariscos", unidad: "kg" },
  { hsCode: "0304.41.00.00", descripcion: "Filetes de Salmón frescos o refrigerados", daiPercent: 10, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Mariscos", unidad: "kg" },
  { hsCode: "0401.20.00.00", descripcion: "Leche y nata (grasa > 1% pero <= 6%)", daiPercent: 155, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Lácteos", unidad: "kg" },
  { hsCode: "0406.90.10.00", descripcion: "Queso tipo Cheddar", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Lácteos", unidad: "kg" },
  { hsCode: "0406.90.20.00", descripcion: "Queso tipo Mozzarella", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Lácteos", unidad: "kg" },
  { hsCode: "0409.00.00.00", descripcion: "Miel natural", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Alimentos", unidad: "kg" },
  { hsCode: "0703.10.10.00", descripcion: "Cebollas frescas", daiPercent: 72, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Vegetales", unidad: "kg" },
  { hsCode: "0713.33.10.00", descripcion: "Frijoles (porotos) negros secos", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Granos", unidad: "kg" },
  { hsCode: "0803.90.10.00", descripcion: "Plátanos (bananas) frescos", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Frutas", unidad: "kg" },
  { hsCode: "0804.40.00.00", descripcion: "Aguacates frescos o secos", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Frutas", unidad: "kg" },
  { hsCode: "0805.10.00.00", descripcion: "Naranjas frescas", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Frutas", unidad: "kg" },
  { hsCode: "0901.21.00.00", descripcion: "Café tostado (sin descafeinar)", daiPercent: 54, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Café", unidad: "kg" },
  { hsCode: "1006.30.00.00", descripcion: "Arroz semiblanqueado o blanqueado", daiPercent: 90, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Cereales", unidad: "kg" },
  { hsCode: "1101.00.00.00", descripcion: "Harina de trigo", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Cereales", unidad: "kg" },
  { hsCode: "1209.91.00.00", descripcion: "Semillas de hortalizas para siembra", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Agrícola", unidad: "kg" },
  { hsCode: "1507.10.00.00", descripcion: "Aceite de soja en bruto", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Aceites", unidad: "kg" },
  { hsCode: "1509.10.00.00", descripcion: "Aceite de oliva virgen", daiPercent: 5, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Aceites", unidad: "kg" },
  { hsCode: "1604.14.10.00", descripcion: "Atunes en conserva", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Conservas", unidad: "kg" },
  { hsCode: "1701.14.00.00", descripcion: "Azúcar de caña", daiPercent: 154, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Azúcar", unidad: "kg" },
  { hsCode: "1806.31.00.00", descripcion: "Chocolate relleno (bloques o barras)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Confitería", unidad: "kg" },
  { hsCode: "1902.11.00.00", descripcion: "Pastas alimenticias con huevo (sin cocer)", daiPercent: 15, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Alimentos", unidad: "kg" },
  { hsCode: "1905.90.30.00", descripcion: "Pan tostado y productos similares", daiPercent: 10, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Panadería", unidad: "kg" },
  { hsCode: "2009.12.00.00", descripcion: "Jugo de naranja congelado", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bebidas", unidad: "l" },
  { hsCode: "2103.20.00.00", descripcion: "Ketchup y salsas de tomate", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Salsas", unidad: "kg" },
  { hsCode: "2106.90.71.00", descripcion: "Suplementos alimenticios", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Suplementos", unidad: "kg" },
  { hsCode: "2201.10.00.00", descripcion: "Agua mineral (sin azúcar)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bebidas", unidad: "l" },
  { hsCode: "2203.00.00.00", descripcion: "Cerveza de malta", daiPercent: 10, iscPercent: 0, itbmsPercent: 10, requiresPermiso: false, categoria: "Bebidas Alcohólicas", unidad: "l" },
  { hsCode: "2208.30.00.00", descripcion: "Whisky", daiPercent: 10, iscPercent: 0, itbmsPercent: 10, requiresPermiso: false, categoria: "Bebidas Alcohólicas", unidad: "l" },
  { hsCode: "2402.20.00.00", descripcion: "Cigarrillos que contengan tabaco", daiPercent: 15, iscPercent: 0, itbmsPercent: 15, requiresPermiso: true, categoria: "Tabaco", unidad: "u" },
  { hsCode: "2523.29.00.00", descripcion: "Cemento Portland", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "kg" },
  { hsCode: "2710.12.50.00", descripcion: "Gasolina para motores", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: true, categoria: "Combustibles", unidad: "gal" },
  { hsCode: "3004.90.99.00", descripcion: "Medicamentos para uso humano", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: true, categoria: "Farmacéuticos", unidad: "kg", autoridad: "MINSA" },
  { hsCode: "3303.00.10.00", descripcion: "Perfumes y aguas de tocador", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Cosméticos", unidad: "l" },
  { hsCode: "3304.99.00.00", descripcion: "Preparaciones de belleza y maquillaje", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Cosméticos", unidad: "kg" },
  { hsCode: "3305.10.00.00", descripcion: "Champú", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Cosméticos", unidad: "kg" },
  { hsCode: "3401.11.00.00", descripcion: "Jabón de tocador en barras", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Higiene", unidad: "kg" },
  { hsCode: "3808.91.90.00", descripcion: "Insecticidas", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Químicos", unidad: "kg" },
  { hsCode: "3917.23.00.00", descripcion: "Tubos de vinilo (PVC) rígidos", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Plásticos", unidad: "kg" },
  { hsCode: "3923.21.00.00", descripcion: "Bolsas de plástico", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Plásticos", unidad: "kg" },
  { hsCode: "3926.90.99.00", descripcion: "Otras manufacturas de plástico", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Plásticos", unidad: "kg" },
  { hsCode: "4011.10.00.00", descripcion: "Neumáticos nuevos (autos turismo)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Vehículos", unidad: "u" },
  { hsCode: "4202.21.00.00", descripcion: "Bolsos de mano de cuero natural", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  { hsCode: "4407.11.00.00", descripcion: "Madera aserrada de pino", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Madera", unidad: "m3" },
  { hsCode: "4802.56.00.00", descripcion: "Papel para imprimir o escribir", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Papel", unidad: "kg" },
  { hsCode: "4818.10.00.00", descripcion: "Papel higiénico", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Papel", unidad: "kg" },
  { hsCode: "4901.99.00.00", descripcion: "Libros y folletos", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Libros", unidad: "kg" },
  { hsCode: "5208.11.00.00", descripcion: "Tejidos de algodón (sin blanquear)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Textiles", unidad: "m2" },
  { hsCode: "6109.10.00.00", descripcion: "Camisetas de algodón (T-shirts)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Ropa", unidad: "u" },
  { hsCode: "6203.42.00.00", descripcion: "Pantalones largos de algodón (Hombre)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Ropa", unidad: "u" },
  { hsCode: "6204.62.00.00", descripcion: "Pantalones largos de algodón (Mujer)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Ropa", unidad: "u" },
  { hsCode: "6302.21.00.00", descripcion: "Ropa de cama estampada (algodón)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Textiles", unidad: "kg" },
  { hsCode: "6402.19.00.00", descripcion: "Calzado deportivo (suela sintética)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Calzado", unidad: "par" },
  { hsCode: "6403.99.00.00", descripcion: "Calzado de cuero (zapatos de vestir)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Calzado", unidad: "par" },
  { hsCode: "6505.00.90.00", descripcion: "Gorras y sombreros", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  { hsCode: "6810.11.00.00", descripcion: "Bloques de hormigón para construcción", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "u" },
  { hsCode: "6907.21.00.00", descripcion: "Baldosas de cerámica (pisos)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "m2" },
  { hsCode: "7007.11.00.00", descripcion: "Vidrio templado de seguridad", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "m2" },
  { hsCode: "7113.19.00.00", descripcion: "Joyería de oro", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Joyería", unidad: "g" },
  { hsCode: "7214.20.00.00", descripcion: "Barras de hierro/acero corrugadas", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "kg" },
  { hsCode: "7308.30.00.00", descripcion: "Puertas y ventanas de hierro/acero", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "kg" },
  { hsCode: "7317.00.00.00", descripcion: "Clavos y tachuelas", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Ferretería", unidad: "kg" },
  { hsCode: "7610.10.00.00", descripcion: "Puertas y ventanas de aluminio", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Construcción", unidad: "kg" },
  { hsCode: "8201.10.00.00", descripcion: "Layas y palas (herramientas)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Herramientas", unidad: "u" },
  { hsCode: "8301.40.00.00", descripcion: "Cerraduras de metal común", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Ferretería", unidad: "u" },
  { hsCode: "8413.30.00.00", descripcion: "Bombas de combustible o aceite", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Maquinaria", unidad: "u" },
  { hsCode: "8414.51.00.00", descripcion: "Ventiladores de mesa o techo", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8415.10.00.00", descripcion: "Aires Acondicionados (Split/Ventana)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8418.10.00.00", descripcion: "Refrigeradores y congeladores", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8421.21.00.00", descripcion: "Filtros de agua domésticos", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8428.10.00.00", descripcion: "Ascensores y montacargas", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Maquinaria", unidad: "u" },
  { hsCode: "8443.31.00.00", descripcion: "Impresoras multifuncionales", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8450.11.00.00", descripcion: "Lavadoras de ropa automáticas", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8471.30.00.00", descripcion: "Laptops (Computadoras portátiles)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8471.41.00.00", descripcion: "Tablets (Tabletas)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8501.10.00.00", descripcion: "Motores eléctricos pequeños", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Maquinaria", unidad: "u" },
  { hsCode: "8504.40.00.00", descripcion: "UPS (Sistemas de alimentación ininterrumpida)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8507.10.00.00", descripcion: "Baterías de plomo (acumuladores)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8516.10.00.00", descripcion: "Calentadores de agua eléctricos", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8516.50.00.00", descripcion: "Hornos microondas", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8516.60.00.00", descripcion: "Estufas y hornos eléctricos", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8517.13.00.00", descripcion: "Smartphones (Teléfonos inteligentes)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8517.62.00.00", descripcion: "Routers y Modems WiFi", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8523.51.00.00", descripcion: "Memorias USB y Discos Sólidos (SSD)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8525.80.20.00", descripcion: "Cámaras digitales", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8528.52.00.00", descripcion: "Monitores de computadora", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8528.72.00.00", descripcion: "Smart TV (Televisores LED/OLED)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8536.50.00.00", descripcion: "Interruptores eléctricos", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Eléctricos", unidad: "u" },
  { hsCode: "8539.50.00.00", descripcion: "Bombillos LED", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Eléctricos", unidad: "u" },
  { hsCode: "8544.49.10.00", descripcion: "Cables eléctricos de cobre", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Eléctricos", unidad: "kg" },
  { hsCode: "8703.23.91.00", descripcion: "Automóvil sedán (1.5L a 3.0L)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Vehículos", unidad: "u" },
  { hsCode: "8704.21.10.00", descripcion: "Pick-up (carga <= 5 toneladas)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Vehículos", unidad: "u" },
  { hsCode: "8711.20.00.00", descripcion: "Motocicletas (50cc a 250cc)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Vehículos", unidad: "u" },
  { hsCode: "8712.00.00.00", descripcion: "Bicicletas (sin motor)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Vehículos", unidad: "u" },
  { hsCode: "9001.30.00.00", descripcion: "Lentes de contacto", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Óptica", unidad: "par" },
  { hsCode: "9003.11.00.00", descripcion: "Monturas de gafas (plástico)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Óptica", unidad: "u" },
  { hsCode: "9004.10.00.00", descripcion: "Gafas de sol", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Óptica", unidad: "u" },
  { hsCode: "9018.12.00.00", descripcion: "Equipos médicos (Ecógrafos)", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: true, categoria: "Médico", unidad: "u", autoridad: "MINSA" },
  { hsCode: "9019.20.00.00", descripcion: "Equipos de oxigenoterapia", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: true, categoria: "Médico", unidad: "u", autoridad: "MINSA" },
  { hsCode: "9021.10.00.00", descripcion: "Artículos ortopédicos", daiPercent: 0, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Médico", unidad: "u" },
  { hsCode: "9102.11.00.00", descripcion: "Relojes de pulsera (mecánicos)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Relojes", unidad: "u" },
  { hsCode: "9201.10.00.00", descripcion: "Pianos verticales", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "u" },
  { hsCode: "9207.10.00.00", descripcion: "Teclados musicales electrónicos", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "u" },
  { hsCode: "9401.30.00.00", descripcion: "Sillas giratorias de oficina", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Muebles", unidad: "u" },
  { hsCode: "9403.30.00.00", descripcion: "Escritorios de madera (Oficina)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Muebles", unidad: "u" },
  { hsCode: "9404.10.00.00", descripcion: "Colchones", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Muebles", unidad: "u" },
  { hsCode: "9405.40.10.00", descripcion: "Lámparas eléctricas de techo/pared", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Iluminación", unidad: "u" },
  { hsCode: "9503.00.10.00", descripcion: "Triciclos, patinetes y coches de pedal", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Juguetes", unidad: "u" },
  { hsCode: "9503.00.90.00", descripcion: "Juguetes de plástico", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Juguetes", unidad: "kg" },
  { hsCode: "9504.50.00.00", descripcion: "Consolas de videojuegos", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "9506.62.10.00", descripcion: "Balones de fútbol", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Deportes", unidad: "u" },
  { hsCode: "9506.91.00.00", descripcion: "Artículos para gimnasia/ejercicio", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Deportes", unidad: "kg" },
  { hsCode: "9603.21.00.00", descripcion: "Cepillos de dientes", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Higiene", unidad: "u" },
  { hsCode: "9608.10.00.00", descripcion: "Bolígrafos", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Oficina", unidad: "u" },
  { hsCode: "9619.00.10.00", descripcion: "Pañales para bebés", daiPercent: 5, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Bebé", unidad: "kg" },
  { hsCode: "9619.00.20.00", descripcion: "Toallas sanitarias", daiPercent: 5, iscPercent: 0, itbmsPercent: 0, requiresPermiso: false, categoria: "Higiene", unidad: "kg" },
  // Productos tecnológicos y de venta online
  { hsCode: "8517.62.00.00", descripcion: "Asistentes de voz (Amazon Echo / Google Nest)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8517.62.00.00", descripcion: "Dispositivos de Streaming (Fire TV Stick / Roku / Chromecast)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8528.72.00.00", descripcion: "Proyectores portátiles (Mini Projectors)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8508.11.00.00", descripcion: "Aspiradoras Robot (Roomba / Roborock)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8516.60.00.00", descripcion: "Freidoras de Aire (Air Fryers)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "8509.40.00.00", descripcion: "Batidoras personales (Nutribullet / Ninja)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  { hsCode: "9617.00.00.00", descripcion: "Termos y botellas aisladas (Stanley / Yeti)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Hogar", unidad: "u" },
  { hsCode: "8518.30.00.00", descripcion: "Auriculares True Wireless (AirPods / Galaxy Buds)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8518.21.00.00", descripcion: "Bocinas portátiles Bluetooth (JBL / Bose)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8471.60.00.00", descripcion: "Teclados mecánicos Gaming (Razer / Logitech)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8471.60.00.00", descripcion: "Ratones (Mouse) Gaming de alta precisión", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "9405.42.00.00", descripcion: "Aros de luz LED (Ring Lights para Streaming)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Iluminación", unidad: "u" },
  { hsCode: "8525.80.20.00", descripcion: "Cámaras de acción (GoPro / DJI Osmo)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8802.20.00.00", descripcion: "Drones con cámara (DJI Mini / Air)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "9504.50.00.00", descripcion: "Gafas de Realidad Virtual (Meta Quest / PS VR)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "9504.50.00.00", descripcion: "Mandos y controles para videojuegos (PS5 / Xbox)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8414.51.00.00", descripcion: "Bases de enfriamiento para Laptops (Cooling Pads)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8504.40.90.00", descripcion: "Cargadores rápidos (GaN Chargers)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8507.60.00.00", descripcion: "Baterías portátiles (Power Banks)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8517.79.00.00", descripcion: "Fundas y carcasas para celulares (Cases)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  { hsCode: "3926.90.99.00", descripcion: "Soportes de celular para auto o escritorio", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  { hsCode: "9019.10.00.00", descripcion: "Pistolas de masaje muscular (Massage Guns)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Salud", unidad: "u" },
  { hsCode: "9603.21.00.00", descripcion: "Cepillos de dientes eléctricos", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Higiene", unidad: "u" },
  { hsCode: "8510.10.00.00", descripcion: "Afeitadoras y recortadoras de barba eléctricas", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Higiene", unidad: "u" },
  { hsCode: "9102.12.00.00", descripcion: "Relojes Inteligentes (Apple Watch / Garmin)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "6404.11.10.00", descripcion: "Zapatillas de correr (Running Shoes)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Calzado", unidad: "par" },
  { hsCode: "6402.91.00.00", descripcion: "Zuecos de plástico tipo Crocs", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Calzado", unidad: "par" },
  { hsCode: "4202.92.00.00", descripcion: "Mochilas para portátiles / Tech Backpacks", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  { hsCode: "9506.91.00.00", descripcion: "Esterillas de Yoga (Yoga Mats)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Deportes", unidad: "u" },
  { hsCode: "9506.91.00.00", descripcion: "Bandas elásticas de resistencia", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Deportes", unidad: "kg" },
  { hsCode: "2106.90.62.00", descripcion: "Vitaminas y Multivitamínicos", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Suplementos", unidad: "kg" },
  { hsCode: "2106.90.99.00", descripcion: "Proteína en polvo (Whey Protein)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Suplementos", unidad: "kg" },
  { hsCode: "3924.10.00.00", descripcion: "Organizadores de nevera (Plástico transparente)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Hogar", unidad: "kg" },
  { hsCode: "6307.90.90.00", descripcion: "Organizadores de equipaje (Packing Cubes)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Viaje", unidad: "kg" },
  { hsCode: "8539.52.00.00", descripcion: "Bombillas inteligentes (Smart Bulbs WiFi)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Iluminación", unidad: "u" },
  { hsCode: "8536.69.00.00", descripcion: "Enchufes inteligentes (Smart Plugs)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8543.70.99.00", descripcion: "Lectores de libros electrónicos (Kindle / Kobo)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrónica", unidad: "u" },
  { hsCode: "8303.00.00.00", descripcion: "Cajas fuertes de seguridad domésticas", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Seguridad", unidad: "u" },
  { hsCode: "9207.10.00.00", descripcion: "Teclados MIDI / Controladores musicales", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "u" },
  { hsCode: "8516.40.00.00", descripcion: "Planchas de vapor verticales (Steamers)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  // Autopartes
  { hsCode: "8708.30.10.00", descripcion: "Frenos y servofrenos (Pastillas de freno)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "kg" },
  { hsCode: "8708.10.00.00", descripcion: "Parachoques (Bumpers) y sus partes", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "kg" },
  { hsCode: "8708.91.00.00", descripcion: "Radiadores para vehículos", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "kg" },
  { hsCode: "7007.21.00.00", descripcion: "Parabrisas de vidrio laminado", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "kg" },
  { hsCode: "8511.40.00.00", descripcion: "Motores de arranque (Starter)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "u" },
  { hsCode: "8511.50.00.00", descripcion: "Generadores (Alternadores)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "u" },
  { hsCode: "4016.99.90.00", descripcion: "Alfombras para auto (Rubber mats)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Autopartes", unidad: "u" },
  // Bebidas Alcohólicas
  { hsCode: "2204.21.00.00", descripcion: "Vino en recipientes <= 2 litros", daiPercent: 15, iscPercent: 0, itbmsPercent: 10, requiresPermiso: false, categoria: "Bebidas Alcohólicas", unidad: "l" },
  { hsCode: "2208.40.00.00", descripcion: "Ron y demás aguardientes de caña", daiPercent: 10, iscPercent: 0, itbmsPercent: 10, requiresPermiso: false, categoria: "Bebidas Alcohólicas", unidad: "l" },
  { hsCode: "2208.60.00.00", descripcion: "Vodka", daiPercent: 10, iscPercent: 0, itbmsPercent: 10, requiresPermiso: false, categoria: "Bebidas Alcohólicas", unidad: "l" },
  { hsCode: "2208.70.00.00", descripcion: "Licores y cremas (ej. Baileys)", daiPercent: 15, iscPercent: 0, itbmsPercent: 10, requiresPermiso: false, categoria: "Bebidas Alcohólicas", unidad: "l" },
  // Pinturas y Construcción
  { hsCode: "3208.10.00.00", descripcion: "Pinturas y barnices (Base poliéster)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Pinturas", unidad: "kg" },
  { hsCode: "3209.10.00.00", descripcion: "Pinturas acrílicas o vinílicas (Base agua)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Pinturas", unidad: "kg" },
  { hsCode: "6910.10.00.00", descripcion: "Inodoros y lavabos de porcelana", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Baño", unidad: "u" },
  { hsCode: "7324.10.00.00", descripcion: "Fregaderos de acero inoxidable", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Cocina", unidad: "u" },
  { hsCode: "8481.80.10.00", descripcion: "Grifería (Llaves de agua para cocina/baño)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Baño", unidad: "kg" },
  // Hogar y Decoración
  { hsCode: "5703.20.00.00", descripcion: "Alfombras y revestimientos de nailon", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Hogar", unidad: "m2" },
  { hsCode: "6303.91.00.00", descripcion: "Cortinas y visillos", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Hogar", unidad: "kg" },
  { hsCode: "9404.90.00.00", descripcion: "Edredones y cojines", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Hogar", unidad: "u" },
  { hsCode: "3925.90.20.00", descripcion: "Persianas y celosías de plástico", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Hogar", unidad: "kg" },
  // Bebé
  { hsCode: "6111.20.00.00", descripcion: "Ropa de bebé de algodón", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bebé", unidad: "kg" },
  { hsCode: "9503.00.10.00", descripcion: "Coches y sillas de paseo para bebé", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bebé", unidad: "u" },
  { hsCode: "9403.70.00.00", descripcion: "Sillas altas para comer (Bebés)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bebé", unidad: "u" },
  { hsCode: "3926.90.99.00", descripcion: "Biberones y chupones", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bebé", unidad: "kg" },
  // Instrumentos Musicales
  { hsCode: "9202.90.00.00", descripcion: "Guitarras (Acústicas y Eléctricas)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "u" },
  { hsCode: "9205.10.00.00", descripcion: "Instrumentos de viento (Trompetas/Saxofones)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "u" },
  { hsCode: "9206.00.00.00", descripcion: "Instrumentos de percusión (Tambores)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "u" },
  { hsCode: "9209.92.00.00", descripcion: "Cuerdas para instrumentos musicales", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Música", unidad: "kg" },
  // Joyería y Accesorios
  { hsCode: "7117.19.00.00", descripcion: "Bisutería (Joyería de fantasía)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Joyería", unidad: "kg" },
  { hsCode: "9101.21.00.00", descripcion: "Relojes de pulsera automáticos (Metal precioso)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Relojes", unidad: "u" },
  // Farmacéuticos y Aromaterapia
  { hsCode: "9602.00.90.00", descripcion: "Cápsulas de gelatina vacías (Farma/Suplementos)", daiPercent: 0, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Farmacéuticos", unidad: "kg" },
  { hsCode: "3301.29.00.00", descripcion: "Aceites esenciales (Aromaterapia)", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bienestar", unidad: "kg" },
  { hsCode: "3307.41.00.00", descripcion: "Varillas de incienso y preparaciones perfumadas", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Bienestar", unidad: "kg" },
  { hsCode: "9613.10.00.00", descripcion: "Encendedores de bolsillo (Gas)", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Varios", unidad: "u" },
  // Viaje y Accesorios personales
  { hsCode: "4202.12.00.00", descripcion: "Maletas de viaje (Plástico/Textil)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Viaje", unidad: "u" },
  { hsCode: "4203.30.00.00", descripcion: "Cinturones de cuero", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  { hsCode: "6601.91.00.00", descripcion: "Paraguas y sombrillas", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Accesorios", unidad: "u" },
  // Deportes y Hobbies
  { hsCode: "9507.10.00.00", descripcion: "Cañas de pescar y anzuelos", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Deportes", unidad: "u" },
  { hsCode: "9506.31.00.00", descripcion: "Palos de golf", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Deportes", unidad: "u" },
  // Cuidado personal
  { hsCode: "8214.20.00.00", descripcion: "Sets de manicura y pedicura", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Higiene", unidad: "kg" },
  { hsCode: "9615.11.00.00", descripcion: "Peines y pasadores para el cabello", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Higiene", unidad: "kg" },
  // Cocina
  { hsCode: "8211.91.00.00", descripcion: "Cuchillos de mesa y cocina", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Cocina", unidad: "u" },
  { hsCode: "7323.93.00.00", descripcion: "Ollas y sartenes de acero inoxidable", daiPercent: 10, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Cocina", unidad: "kg" },
  { hsCode: "8509.80.90.00", descripcion: "Trituradoras de basura domésticas", daiPercent: 5, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Electrodomésticos", unidad: "u" },
  // Decoración
  { hsCode: "3926.40.00.00", descripcion: "Figuras decorativas (Adornos de plástico)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Decoración", unidad: "kg" },
  { hsCode: "4420.10.00.00", descripcion: "Figuras decorativas (Adornos de madera)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Decoración", unidad: "kg" },
  { hsCode: "8306.29.00.00", descripcion: "Marcos para fotografías (Portarretratos)", daiPercent: 15, iscPercent: 0, itbmsPercent: 7, requiresPermiso: false, categoria: "Decoración", unidad: "kg" },
];

// Obtener categorías únicas para filtros
export const CATEGORIAS_ARANCELES = [...new Set(ARANCELES_COMPLETOS.map(a => a.categoria))].sort();

// Sistema de sinónimos para búsqueda flexible (inglés/español y marcas comunes)
export const SINONIMOS_BUSQUEDA: Record<string, string[]> = {
  // Electrodomésticos
  "freidora": ["air fryer", "airfryer", "freidora de aire", "freidora sin aceite"],
  "air fryer": ["freidora", "freidora de aire", "airfryer"],
  "aspiradora robot": ["roomba", "roborock", "robot vacuum", "vacuum robot"],
  "roomba": ["aspiradora robot", "robot aspirador"],
  "batidora": ["nutribullet", "ninja", "blender", "licuadora"],
  
  // Asistentes y streaming
  "alexa": ["asistente de voz", "echo", "amazon echo", "altavoz inteligente"],
  "echo": ["alexa", "asistente de voz", "amazon echo"],
  "google home": ["asistente de voz", "google nest", "nest"],
  "asistente": ["alexa", "echo", "google home", "nest", "asistente de voz"],
  "fire tv": ["streaming", "fire stick", "chromecast", "roku"],
  "roku": ["streaming", "fire tv", "chromecast"],
  "chromecast": ["streaming", "fire tv", "roku"],
  
  // Accesorios móviles
  "case": ["funda", "carcasa", "cover", "protector"],
  "funda": ["case", "carcasa", "cover", "protector celular"],
  "carcasa": ["case", "funda", "cover"],
  "power bank": ["bateria portatil", "cargador portatil", "powerbank"],
  "bateria portatil": ["power bank", "powerbank"],
  
  // Audio
  "airpods": ["auriculares", "earbuds", "audifonos inalambricos", "true wireless"],
  "earbuds": ["auriculares", "airpods", "audifonos"],
  "audifonos": ["auriculares", "earbuds", "headphones", "airpods"],
  "bocina": ["speaker", "altavoz", "parlante", "jbl", "bose"],
  "speaker": ["bocina", "altavoz", "parlante"],
  
  // Computación
  "laptop": ["portatil", "notebook", "computadora portatil"],
  "portatil": ["laptop", "notebook"],
  "mouse": ["raton", "mouse gaming"],
  "raton": ["mouse"],
  "teclado": ["keyboard", "teclado mecanico", "teclado gaming"],
  "keyboard": ["teclado"],
  
  // Suplementos
  "whey": ["proteina", "whey protein", "proteina en polvo"],
  "proteina": ["whey", "protein", "whey protein"],
  "vitaminas": ["multivitaminico", "vitamins", "suplemento"],
  
  // Wearables
  "smartwatch": ["reloj inteligente", "apple watch", "garmin", "smart watch"],
  "apple watch": ["smartwatch", "reloj inteligente"],
  "reloj inteligente": ["smartwatch", "apple watch", "garmin"],
  
  // Drones y cámaras
  "drone": ["dron", "dji", "quadcopter"],
  "dji": ["drone", "dron"],
  "gopro": ["camara de accion", "action cam", "camara deportiva"],
  "camara de accion": ["gopro", "action cam", "dji osmo"],
  
  // Gaming
  "vr": ["realidad virtual", "meta quest", "oculus", "playstation vr"],
  "realidad virtual": ["vr", "meta quest", "oculus"],
  "meta quest": ["vr", "realidad virtual", "oculus"],
  "control": ["mando", "joystick", "gamepad", "controller"],
  "mando": ["control", "joystick", "gamepad"],
  "consola": ["videojuego", "ps5", "xbox", "nintendo", "playstation"],
  
  // Otros
  "kindle": ["lector electronico", "ebook reader", "e-reader", "kobo"],
  "ebook": ["kindle", "lector electronico", "libro electronico"],
  "stanley": ["termo", "botella termica", "yeti"],
  "termo": ["stanley", "yeti", "botella aislada"],
  "crocs": ["zuecos", "sandalias plastico"],
  "yoga mat": ["esterilla", "colchoneta yoga", "mat yoga"],
  "esterilla": ["yoga mat", "mat", "colchoneta"],
  "ring light": ["aro de luz", "luz led circular", "luz streaming"],
  "aro de luz": ["ring light", "luz led"],
};

// Función para expandir términos de búsqueda con sinónimos
export function expandirBusqueda(termino: string): string[] {
  const termsNormalized = termino.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const terminos = new Set<string>([termsNormalized]);
  
  // Buscar en el mapa de sinónimos
  for (const [key, values] of Object.entries(SINONIMOS_BUSQUEDA)) {
    const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Si el término contiene la clave o viceversa
    if (termsNormalized.includes(keyNorm) || keyNorm.includes(termsNormalized)) {
      terminos.add(keyNorm);
      values.forEach(v => terminos.add(v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    }
    
    // También buscar en los valores
    for (const value of values) {
      const valueNorm = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (termsNormalized.includes(valueNorm) || valueNorm.includes(termsNormalized)) {
        terminos.add(keyNorm);
        values.forEach(v => terminos.add(v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
      }
    }
  }
  
  return Array.from(terminos);
}
