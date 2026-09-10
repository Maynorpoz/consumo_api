# Datos curiosos de gatos — Consumo de API pública

Aplicación web que consulta la API pública **Cat Facts** mediante un formulario
HTML semántico y accesible, muestra los resultados como una lista construida
dinámicamente en el DOM y representa de forma explícita los distintos estados de
la interfaz. La lógica está escrita en TypeScript y se compila a JavaScript.

> Nota: la API devuelve las frases (`facts`) en **inglés**. La interfaz, los
> mensajes y los estados de la aplicación están en español.

## API utilizada

- **Nombre:** Cat Facts
- **URL base:** `https://catfact.ninja`
- **Documentación:** https://catfact.ninja/
- **Autenticación:** no requiere API key. Permite peticiones desde el navegador (CORS abierto).

### Endpoints consumidos

La aplicación construye la URL como `https://catfact.ninja/<recurso>?limit=<n>`.

| Opción del formulario | Petición | Respuesta |
|---|---|---|
| Datos curiosos | `GET /facts?limit=<n>` | `{ data: [{ fact: string, length: number }], ... }` |
| Razas de gato | `GET /breeds?limit=<n>` | `{ data: [{ breed, country, origin, coat, pattern }], ... }` |

Donde `<n>` es la cantidad de resultados (1 a 20) indicada en el formulario.

### Modelado en TypeScript

Las respuestas se modelan con las interfaces `CatFact`, `CatBreed` y el genérico
`RespuestaPaginada<T>` (ver [`src/main.ts`](src/main.ts)). Antes de leer el
cuerpo se comprueba `response.ok`; la conversión se hace con `await response.json()`.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (incluye `npm`).
- Un servidor web local. Se ha usado la extensión **Live Server** de VS Code.

## Instalación

```bash
npm install
```

## Ejecución

1. Compilar TypeScript a JavaScript (genera `dist/main.js`):

   ```bash
   npm run build
   ```

   Durante el desarrollo puede dejarse la compilación en modo observación:

   ```bash
   npm run watch
   ```

2. Servir la carpeta del proyecto con un servidor local. Con la extensión
   Live Server de VS Code: clic derecho sobre `index.html` →
   **«Open with Live Server»**.

3. Abrir la URL que indique el servidor (por ejemplo
   `http://127.0.0.1:5500/index.html`).

> Debe abrirse mediante `http://`, no como archivo `file://`, para que el
> navegador permita la petición `fetch` a la API.

## Estructura del proyecto

```
consumo_api/
├── index.html        # Estructura semántica y formulario accesible
├── css/
│   └── styles.css    # Estilos, foco visible y estilos por estado
├── src/
│   └── main.ts       # Lógica: formulario, fetch, estados de interfaz
├── dist/
│   └── main.js       # JavaScript compilado (generado por tsc)
├── tsconfig.json
├── package.json
└── README.md
```

## Formulario

Formulario semántico (`<form>`, `<fieldset>`, `<legend>`) con tres controles,
cada uno con su `<label>` asociado y validación nativa:

| Control | Tipo | Validación |
|---|---|---|
| Tipo de consulta | `<select>` | `required` |
| Cantidad de resultados | `<input type="number">` | `required`, `min="1"`, `max="20"`, `step="1"` |
| Filtrar por texto (opcional) | `<input type="text">` | `maxlength="30"`, `pattern` (solo letras y espacios) |

El evento `submit` se procesa con TypeScript: se llama a `preventDefault()`, se
validan los campos y se leen los valores con `FormData`. El filtro de texto se
aplica en el cliente sobre los resultados recibidos.

## Estados de la interfaz

La zona de resultados (`#estado`, con `role="status"` y `aria-live="polite"`)
representa cinco estados:

| Estado | Cuándo se muestra | Comportamiento |
|---|---|---|
| **Inicial** | Al cargar la página o tras un error de validación | Mensaje con instrucciones; lista vacía |
| **Cargando** | Mientras se resuelve la petición `fetch` | Mensaje «Cargando resultados…»; el botón se deshabilita |
| **Éxito** | La API devuelve resultados (tras aplicar el filtro) | Mensaje con el número de resultados; lista de tarjetas en el DOM |
| **Sin resultados** | La API responde con `data` vacío, o el filtro no encuentra coincidencias | Mensaje explicativo; lista vacía |
| **Error** | `response.ok` es `false` o falla la red (`catch`) | Mensaje de error; permite volver a intentar |

Detalles de comportamiento:

- **Sin solicitudes duplicadas:** mientras una petición está en curso, una
  bandera interna y el atributo `disabled` del botón impiden lanzar otra.
- **Nueva consulta:** el bloque `finally` reactiva siempre el botón, de modo que
  se puede realizar otra búsqueda después de un resultado o de un error.
- **Seguridad en el DOM:** los datos externos se insertan únicamente con
  `textContent` y `document.createElement`; no se usa `innerHTML` con contenido
  no confiable.
