export interface Usuario {
  legajo: string;
  apellido: string;
  nombre: string;
}

// Padrón de legajos habilitados
export const USUARIOS: Usuario[] = [
  { legajo: "10246", apellido: "VERA", nombre: "Leandro Federico" },
  { legajo: "11123", apellido: "ECKERT", nombre: "Enzo Emanuel" },
  { legajo: "11166", apellido: "OLGIATTI", nombre: "Duilio Joaquin" },
  { legajo: "11188", apellido: "CIARROCA", nombre: "Enzo Simon" },
  { legajo: "11339", apellido: "CESARIO", nombre: "Leandro Ivan" },
  { legajo: "11422", apellido: "CIARROCCA", nombre: "Manuel Santiago" },
  { legajo: "11440", apellido: "GRILLE", nombre: "Emiliano Gabriel" },
  { legajo: "12065", apellido: "NARVAEZ", nombre: "Raúl Jorge" },
  { legajo: "12318", apellido: "VALLE", nombre: "Roberto Omar" },
  { legajo: "12320", apellido: "GOMEZ", nombre: "Alejandro David" },
  { legajo: "12322", apellido: "ALTAMIRANO", nombre: "Rodolfo Hernan" },
  { legajo: "12323", apellido: "GOMEZ", nombre: "Gerardo Isidoro" },
  { legajo: "12324", apellido: "RETAMAR", nombre: "Carlos Hernan" },
  { legajo: "12325", apellido: "NUÑEZ", nombre: "Hector Eduardo" },
  { legajo: "12663", apellido: "MONZÓN", nombre: "Hugo Cesar" },
  { legajo: "12684", apellido: "MAIER", nombre: "Fernando" },
  { legajo: "13810", apellido: "ISAAC", nombre: "Leandro" },
  { legajo: "13870", apellido: "GIMENEZ", nombre: "Rosendo Emanuel" },
  { legajo: "16088", apellido: "MATEO", nombre: "Lucas Juan Marcos" },
  { legajo: "17902", apellido: "ALBARENQUE", nombre: "Fernando" },
  { legajo: "18286", apellido: "MIGNOLA", nombre: "Luis Gabriel" },
  { legajo: "18287", apellido: "FERNANDEZ", nombre: "Ariel Roberto Fabian" },
  { legajo: "18288", apellido: "BATTISTI", nombre: "Elias Imanol" },
  { legajo: "18289", apellido: "VARELA", nombre: "Luis Alberto" },
  { legajo: "18406", apellido: "LARA", nombre: "Diego Valentin" },
];

export const nombreCompleto = (u: Usuario) => `${u.apellido}, ${u.nombre}`;

export function buscarPorLegajo(legajo: string): Usuario | undefined {
  const limpio = legajo.replace(/\D/g, "").replace(/^0+/, "");
  return USUARIOS.find((u) => u.legajo === limpio);
}
