// Lógica de la aplicación: formulario + consumo de la API Cat Facts + estados de interfaz.
// API pública: https://catfact.ninja
//   - GET /facts?limit=<n>   -> { data: [{ fact, length }], ... }
//   - GET /breeds?limit=<n>  -> { data: [{ breed, country, origin, coat, pattern }], ... }
// Se compila a ../dist/main.js con `tsc`.

// ===== Modelo de la consulta que arma el formulario =====
type TipoConsulta = "facts" | "breeds";

interface Consulta {
  tipo: TipoConsulta;
  cantidad: number;
  filtro: string;
}

// ===== Utilidades del DOM =====
function obtener<T extends HTMLElement>(id: string): T {
  const elemento = document.getElementById(id);
  if (!elemento) {
    throw new Error(`No se encontró el elemento #${id} en el DOM.`);
  }
  return elemento as T;
}

const formulario = obtener<HTMLFormElement>("form-busqueda");
const estado = obtener<HTMLParagraphElement>("estado");

const campos = {
  tipo: obtener<HTMLSelectElement>("tipo"),
  cantidad: obtener<HTMLInputElement>("cantidad"),
  filtro: obtener<HTMLInputElement>("filtro"),
};

type NombreCampo = keyof typeof campos;

// ===== Validación =====
function mensajeError(campo: HTMLInputElement | HTMLSelectElement): string {
  const v = campo.validity;
  if (v.valueMissing) return "Este campo es obligatorio.";
  if (v.rangeUnderflow) return `El valor mínimo permitido es ${(campo as HTMLInputElement).min}.`;
  if (v.rangeOverflow) return `El valor máximo permitido es ${(campo as HTMLInputElement).max}.`;
  if (v.stepMismatch) return "Introduce un número entero.";
  if (v.badInput) return "Introduce un número válido.";
  if (v.patternMismatch) return "Solo se permiten letras y espacios.";
  if (v.tooLong) return "El texto supera el máximo de caracteres.";
  return campo.validationMessage || "El valor introducido no es válido.";
}

function mostrarError(nombre: NombreCampo, mensaje: string): void {
  obtener<HTMLParagraphElement>(`${nombre}-error`).textContent = mensaje;
}

function limpiarErrores(): void {
  (Object.keys(campos) as NombreCampo[]).forEach((nombre) => {
    obtener<HTMLParagraphElement>(`${nombre}-error`).textContent = "";
  });
}

function validar(): boolean {
  let valido = true;
  let primerInvalido: HTMLElement | null = null;

  (Object.keys(campos) as NombreCampo[]).forEach((nombre) => {
    const campo = campos[nombre];
    if (!campo.checkValidity()) {
      mostrarError(nombre, mensajeError(campo));
      if (!primerInvalido) primerInvalido = campo;
      valido = false;
    }
  });

  if (primerInvalido) (primerInvalido as HTMLElement).focus();
  return valido;
}

// ===== Lectura de los valores con FormData =====
function leerConsulta(): Consulta {
  const datos = new FormData(formulario);
  return {
    tipo: String(datos.get("tipo") ?? "") as TipoConsulta,
    cantidad: Number(datos.get("cantidad") ?? 0),
    filtro: String(datos.get("filtro") ?? "").trim().toLowerCase(),
  };
}

// ===== Evento submit =====
formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  limpiarErrores();

  if (!validar()) {
    estado.textContent = "Revisa los campos marcados antes de continuar.";
    return;
  }

  const consulta = leerConsulta();

  // Paso 6: de momento solo confirmamos la lectura de los valores.
  // El fetch a la API se implementa en el paso 7.
  const resumen =
    `Consulta preparada: ${consulta.tipo} · ${consulta.cantidad} resultado(s)` +
    (consulta.filtro ? ` · filtro "${consulta.filtro}"` : "");
  estado.textContent = resumen;
  console.log("Consulta:", consulta);
});

export {};
