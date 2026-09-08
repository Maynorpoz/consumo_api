// Lógica de la aplicación: formulario + consumo de la API Cat Facts + estados de interfaz.
// API pública: https://catfact.ninja
//   - GET /facts?limit=<n>   -> { data: [{ fact, length }], ... }
//   - GET /breeds?limit=<n>  -> { data: [{ breed, country, origin, coat, pattern }], ... }
// Se compila a ../dist/main.js con `tsc`.

// ===== Modelo de datos =====
type TipoConsulta = "facts" | "breeds";

interface Consulta {
  tipo: TipoConsulta;
  cantidad: number;
  filtro: string;
}

interface CatFact {
  fact: string;
  length: number;
}

interface CatBreed {
  breed: string;
  country: string;
  origin: string;
  coat: string;
  pattern: string;
}

interface RespuestaPaginada<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

type EstadoUI = "inicial" | "cargando" | "exito" | "sinResultados" | "error";

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
const lista = obtener<HTMLUListElement>("resultados");
const botonBuscar = obtener<HTMLButtonElement>("btn-buscar");

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

// ===== Estados de la interfaz =====
function mostrarEstado(tipo: EstadoUI, mensaje: string): void {
  estado.dataset.estado = tipo;
  estado.textContent = mensaje;
}

// ===== Consumo de la API =====
async function consultarApi(consulta: Consulta): Promise<Array<CatFact | CatBreed>> {
  const url = `https://catfact.ninja/${consulta.tipo}?limit=${consulta.cantidad}`;
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`La API respondió con estado ${respuesta.status} (${respuesta.statusText}).`);
  }

  const cuerpo = (await respuesta.json()) as RespuestaPaginada<CatFact | CatBreed>;
  return Array.isArray(cuerpo.data) ? cuerpo.data : [];
}

function filtrar(items: Array<CatFact | CatBreed>, consulta: Consulta): Array<CatFact | CatBreed> {
  if (!consulta.filtro) return items;
  return items.filter((item) => {
    const texto =
      consulta.tipo === "facts"
        ? (item as CatFact).fact
        : (item as CatBreed).breed;
    return texto.toLowerCase().includes(consulta.filtro);
  });
}

// ===== Render de resultados (solo textContent / createElement) =====
function pintarResultados(items: Array<CatFact | CatBreed>, tipo: TipoConsulta): void {
  lista.replaceChildren();

  for (const item of items) {
    const elemento = document.createElement("li");

    if (tipo === "facts") {
      const parrafo = document.createElement("p");
      parrafo.textContent = (item as CatFact).fact;
      elemento.appendChild(parrafo);
    } else {
      const raza = item as CatBreed;
      const titulo = document.createElement("h3");
      titulo.textContent = raza.breed || "Raza sin nombre";

      const detalle = document.createElement("p");
      const partes = [
        raza.origin && `Origen: ${raza.origin}`,
        raza.country && `País: ${raza.country}`,
        raza.coat && `Pelaje: ${raza.coat}`,
        raza.pattern && `Patrón: ${raza.pattern}`,
      ].filter((parte): parte is string => Boolean(parte));
      detalle.textContent = partes.join(" · ");

      elemento.append(titulo, detalle);
    }

    lista.appendChild(elemento);
  }
}

// ===== Evento submit =====
let peticionEnCurso = false;

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (peticionEnCurso) return; // evita solicitudes duplicadas

  limpiarErrores();
  if (!validar()) {
    mostrarEstado("inicial", "Revisa los campos marcados antes de continuar.");
    return;
  }

  const consulta = leerConsulta();

  peticionEnCurso = true;
  botonBuscar.disabled = true;
  lista.replaceChildren();
  mostrarEstado("cargando", "Cargando resultados…");

  try {
    const items = await consultarApi(consulta);
    const visibles = filtrar(items, consulta);

    if (visibles.length === 0) {
      mostrarEstado(
        "sinResultados",
        consulta.filtro
          ? `Sin resultados para el filtro «${consulta.filtro}».`
          : "La API no devolvió resultados.",
      );
      return;
    }

    pintarResultados(visibles, consulta.tipo);
    mostrarEstado("exito", `${visibles.length} resultado(s) encontrados.`);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "Error desconocido.";
    mostrarEstado("error", `No se pudo completar la consulta. ${detalle}`);
  } finally {
    peticionEnCurso = false;
    botonBuscar.disabled = false;
  }
});

mostrarEstado("inicial", "Introduce los parámetros y pulsa «Buscar» para comenzar.");

export {};
