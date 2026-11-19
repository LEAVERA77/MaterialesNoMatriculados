export interface Material {
  nombre: string;
  especificacion: string;
  unidad: string;
  display: string;
  searchString: string;
  stock?: number;
  id?: number;
}

const MATERIALES_RAW: string[] = [
  "Alambre de fardo | Fardo Negro Nº 16 | kg",
  "Alambre de fardo galvanizado | Fardo galvanizado Nº 16 | kg",
  "Arco para hoja sierra | Arco Sierra Manual Profesional 300 Mm Con Hoja 12\" | pieza",
  "Balde de plástico albañil | | piezas",
  "Batería 9 V | Batería alcalina 9 V | piezas",
  "Broca de anclaje para Hormigón | Perno de expansión a golpe de 12x120 mm caja x 10 unidades | Caja",
  "Bulón  alta resistencia 7/16\"x1 3/4\" | Con tuerca, 2 arandelas planas y una de presión | Conjunto",
  "Bulón alta resistencia | 3/8\" x 2\". Con tuerca, 2 arandelas planas y una de presión. | conjunto",
  "Bulón alta resistencia 1/2\"x2\" 12hilos/pulg | Con tuerca, 2 arandelas planas y una de presión | Conjunto",
  "Caja de herramientas | Chapa galvanizada 420*210*210 mm | piezas",
  "Cinta autosoldable | 19mm x 5m x 0,76mm | pieza",
  "Cinta de peligro | Cinta \"PELIGRO\" roja y blanca- Ancho 8cm-Largo 200m | pieza",
  "Cinta métrica con freno 5 mts - 19mm | | piezas",
  "Corta Hierro | 300 x 35mm | piezas",
  "Destornillador Philips aislado | PH2x100mm | piezas",
  "Destornillador Plano aislado | 6,5x150 mm | piezas",
  "Disco de corte metales | 350x3,0x25,4 mm | piezas",
  "Disco de corte metales | 180x1,6x22,23mm(13000 rpm) | piezas",
  "Disco de corte Widia diamantado | 180mm segmentado | piezas",
  "Disco de desbaste | 114x6mm | piezas",
  "Disco de desbaste | 180*6*22,23mm | piezas",
  "Electrodo para soldadora | Punta azul de 2,5mm | Kilos",
  "Electrodo para soldadora | Punta azul de 3,25mm | Kilos",
  "Escobillón sin cabo | | piezas",
  "Espuma de Poliuretano expandido | Aerosol de 300ml | piezas",
  "Grillete corazón 5/8\" | Grillete tipo corazón para eslingas 5/8\" 3 Tn | pieza",
  "Hoja/filo para cutter | Repuesto para cutters cuchilla trapezoidal caja x 10 unidades | caja",
  "Lampara Led 150W | Lampara Led potencia 100W, rosca E40 | pieza",
  "Lima afilado de cadenas motosierras | Lima afilado cadena motosierras 3/16\" | pieza",
  "Lima afilado de cadenas motosierras | Lima afilado cadena motosierras 7/32\" | pieza",
  "Lima afilado de cadenas motosierras | Lima afilado cadena motosierras 5/32\" | pieza",
  "Llave ajustable tipo \"Francesa\" | Llave ajustable 8\" | piezas",
  "Llave combina criquet 13mm | Llave combinada crique 13mm-No articulada | pieza",
  "Llave combinada | 13mm | piezas",
  "Llave combinada | 14mm | piezas",
  "Llave combinada | 17mm | piezas",
  "Llave combinada | 19mm | piezas",
  "Martillo de pena | 400gr mango de madera | piezas",
  "Mascara para soldar | Fotosensible con regulacion de sensibilidad | pieza",
  "Mecha acero Rapido 10mm | | piezas",
  "Mecha acero Rapido 12mm | | piezas",
  "Mecha acero rápido 13mm | | piezas",
  "Mecha acero rápido 4mm | | piezas",
  "Mecha acero rápido 5mm | | piezas",
  "Mecha acero Rapido 6mm | | piezas",
  "Mecha acero Rapido 8mm | | piezas",
  "Mecha acero rápido 9,75mm | | piezas",
  "Mecha p/madera de taladro explosión | Encastre Hexagonal, diámetro 19mm, largo 250mm | pieza",
  "Mecha widia - 12mm | 12x160mm | piezas",
  "Mecha widia - 14mm | 14x160mm | piezas",
  "Mecha widia - 6mm | 6x100mm | piezas",
  "Mecha widia - 8mm | 8x120mm | piezas",
  "Mecha widia -10mm | 10x160mm | piezas",
  "Palo de madera - con rosca | Para escobillón | piezas",
  "Pilas AA 1,5 V | Pilas 1,5 V | piezas",
  "Pilas AAA 1,5 V | Pilas 1,5 V | piezas",
  "Pilas D | Pilas 1,5 V | piezas",
  "Pintura en aerosol | 3 en 1 Color Gris espacial 440ml | pieza",
  "Pintura en Aerosol | 240 cm3 Color Rojo | pieza",
  "Pinza alicate corte diagonal aislada para 1,1 kV | 6 pulgadas | piezas",
  "Pinza pico de loro | Pico de loro 250mm mango anatómico | piezas",
  "Pinza punta plana aislada para 1,1 kV | 6 pulgadas 160mm | piezas",
  "Pinza universal aislada para 1,1 kV | 8 pulgadas | piezas",
  "Producto multiuso, destraba/limpia/afloja piezas (tipo WD-40) | Aerosol 155G/216 cm3 | piezas",
  "Punta Philips para atornillador | punta doble Bosch PH2 x 65mm alto impacto kit x 8 unidades | piezas",
  "Set llave ALEN | Set allen hexagonal cardanicas 9 pieza-medidas 10-8-6-5-4-3-2,5-2-1,5 | kit",
  "Set llave TORK | Set llaves tork 9 pieza -Medias T50-45-40-30-27-25-20-15-10 | kit",
  "Soplete p/cartucho de gas | Soplete para cartucho gas Butano/Propano C/encendido electrónico | pieza",
  "Talco Industrial Para Gomería Neumáticos | x kg | pieza",
  "Tarugo para pared | Plastico de 6 mm  caja x 100 unidades | caja",
  "Tarugo para pared | Plastico de 8 mm  caja x 500 unidades | caja",
  "Tirafondo cabeza hexagonal | Tirafondo Hexagonal Zincado 5/16x8\" | pieza",
  "Tornillo autoperforante corto | T1 mecha 8x1/2\", cabeza philip | piezas",
  "Tornillo autoperforante largo | T1 mecha 8x3/4\", cabeza philip | piezas",
  "Tornillo FIX | Tirafondo tipo Fix 6x3/4 | pieza",
  "Tornillo tanque | 1/4 pulg x 3/4pulg | piezas",
  "Tornillo tirafondo | Cabeza Phillips, 6 mm x 1\" caja x 100 unidades | piezas",
  "Tornillo tirafondo | Cabeza Phillips, 8 mm x 1 1/2\" caja x 500 unidades | piezas",
  "Tornillo tirafondo | Cabeza Phillips, 8 mm x 1 3/4\" caja x 500 unidades | Caja",
  "Bastidor y tapa blanca p/caja 10x5 | | piezas",
  "Cable 2x1,5mm tipo taller | | Metro",
  "Cable unipolar 2,5 mm Celeste | | Metro",
  "Cable unipolar 2,5 mm Rojo | | Metro",
  "Cable unipolar 2,5 mm Verde/amarillo | | Metro",
  "Caja de embutir octogonal 9x9x5 | | piezas",
  "Caja de embutir rectangular 10x5 | | piezas",
  "Caño de PVC de 20 mm | | piezas",
  "Cinta aisladora color Blanco | | piezas",
  "Cinta aisladora color Negro | | piezas",
  "Cinta aisladora color Rojo | | piezas",
  "Cinta aisladora color Verde | | piezas",
  "Conector para caño caja PVC 20mm | | piezas",
  "Fotocélula 10A zócalo extraíble tipo A°P° | | piezas",
  "Grampa de fijación p/caño 20 mm | | piezas",
  "Lámpara LED luz fría 50W/220V E27 | | piezas",
  "Llave de punto p/bastidor blanco Mod 400V | | piezas",
  "Portabastidor rectangular PVC 13x8,5x5 | | piezas",
  "Termocontraíble 12,7mm x mt. | | Metro",
  "Tomacorriente p/bastidor blanco mod 10A | | piezas",
  "Unión Cu estañado tubo 21mm UCC4 | | piezas",
  "Unión Cu estañado tubo 21mm UCC6 | | piezas",
  "Disco de corte metales | 114 x 1,6 x 22,23mm | piezas",
  "Cuchilla para cutter fijo | Repuesto para cutter - cuchilla trapezoidal caja x 10 unidades | piezas",
  "Cutter fijo | Cutter de 5-1/2\" de hoja fija | piezas",
  "Llave T Tubo hexagonal | T9/16 x 150mm - Mango de polipropileno | piezas",
  "Llave T Tubo hexagonal | T13 x 150mm - Mango de polipropileno | piezas",
  "Llave T Tubo hexagonal | T11 x 150mm - Mango de polipropileno | piezas",
  "Llave T Tubo hexagonal | T10 x 150mm - Mango de polipropileno | piezas",
  "Bocallave hexagonal Larga | 24mm - Encastre de 1/2\" | piezas",
  "Bocallave hexagonal Larga | 22mm - Encastre de 1/2\" | piezas",
  "Bocallave hexagonal Larga | 19mm - Encastre de 1/2\" | piezas",
  "Bocallave hexagonal Larga | 17mm - Encastre de 1/2\" | piezas",
  "Bocallave hexagonal Larga | 13mm - Encastre de 1/2\" | piezas",
  "Bocallave hexagonal Larga | 9/16\" - Encastre de 1/2\" | piezas",
  "Bocallave hexagonal Larga | 1/2\" - Encastre de 1/2\" | piezas",
  "Barra de extensión | 24mm - Encastre de 1/2\" | piezas",
  "Llave criquet | 250mm - Encastre de 1/2\" | piezas",
  "Llave combinada | 24mm | piezas",
  "Llave combinada | 22mm | piezas",
  "Llave ajustable tipo Francesa | Llave ajustable 12\" | piezas",
  "Llave ajustable tipo Francesa | Llave ajustable 10\" | piezas",
  "Maza | 2kg - acero forjado - cabo de madera | piezas",
  "Pala de Punta | Forjada, pocera, cabo corto empuñadura de madera, longitud 1m | piezas",
  "Pala Ancha | Forjada, cabo corto empuñadura de madera, longitud 1m | piezas",
  "Equipo Criquet Tensor | Equipo Criquet Tensor con gancho 3000kg | piezas",
  "Soga | Diámetro 10,5mm - Longitud 30m | piezas",
  "Cepillo de Acero bronceado con mango | | piezas",
  "Disco cepillo 115mm | Disco cepillo p/amolador angular 115mm cónico-Rosca M14 | piezas",
  "Cartucho gas Butano | Cartucho gas butano 227gr-para soplete | piezas",
  "Soplete gas butano | Soplete para cartucho gas butano con encendido. | piezas",
  "Mecha escalonada | Mecha escalonada HSS 4-32mm | piezas",
  "Corta Fierro | Corta Fierro 350mm-Hexagonal punta plana | piezas",
  "Linterna LED recargable | Linterna LED Recargable 400 Lumenes 10W-IP54-Recarga USB | piezas",
  "Alambre n°8 | Alambre recocido negro n°8 (4,06mm) | kg",
  "Derribante de insectos (cipermetrina) | Insecticida mata moscas, mosquitos y cucarachas - 500 cc base acuosa | piezas",
  "Insecticida en Aerosol | Repelente de insectos en aerosol tipo Bardahl 165-165 cc | piezas",
  "Grasera manual | Grasera manual 3kg con manguera y pico 1,5m | piezas",
];

const vistos = new Set<string>();
export const MATERIALES: Material[] = MATERIALES_RAW.filter((l) => {
  if (vistos.has(l)) return false;
  vistos.add(l);
  return true;
}).map((line) => {
  const [nombre = "—", especificacion = "", unidad = "u."] = line.split("|").map((s) => s.trim());
  return {
    nombre,
    especificacion,
    unidad: unidad || "u.",
    display: `${nombre}${especificacion ? " · " + especificacion : ""} (${unidad || "u."})`,
    searchString: `${nombre} ${especificacion}`.toLowerCase(),
  };
});

// Catálogo activo: se reemplaza con los materiales y el stock reales de la base de datos.
let CATALOGO: Material[] = MATERIALES;

export function setCatalogo(lista: { id: number; nombre: string; especificacion: string; unidad: string; stock: number }[]) {
  if (!lista.length) return;
  CATALOGO = lista.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    especificacion: m.especificacion,
    unidad: m.unidad || "u.",
    stock: m.stock,
    display: `${m.nombre}${m.especificacion ? " · " + m.especificacion : ""} (${m.unidad || "u."})`,
    searchString: `${m.nombre} ${m.especificacion}`.toLowerCase(),
  }));
}

export function stockDe(id: number | undefined): number | undefined {
  if (id === undefined) return undefined;
  return CATALOGO.find((m) => m.id === id)?.stock;
}

function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function buscarMateriales(query: string): Material[] {
  if (!query || query.trim().length < 2) return [];
  const q = normalizar(query.trim());
  const palabras = q.split(/\s+/);
  let res = CATALOGO.filter((m) => {
    const s = normalizar(m.searchString);
    return palabras.every((p) => s.includes(p));
  });
  if (res.length === 0) {
    res = CATALOGO.map((m) => ({ m, d: levenshtein(q, normalizar(m.searchString)) }))
      .sort((a, b) => a.d - b.d)
      .filter((s) => s.d <= Math.max(3, Math.floor(q.length * 0.5)))
      .map((s) => s.m);
  }
  return res.slice(0, 10);
}
