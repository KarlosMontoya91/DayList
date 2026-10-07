# Selector Iconify de DayList

## Uso

Abre los detalles de un producto, busca en español y elige un resultado. Pulsa **Confirmar icono** y después **Guardar cambios**. Seleccionar una miniatura no guarda el producto. Para categorías usa **Elegir icono de categoría** en los detalles o en el catálogo (con una categoría seleccionada). El alta de categorías propias también incluye el selector.

Los iconos existentes se conservan hasta que se confirme un reemplazo. Productos y categorías guardan `icon_key` completo (`lucide:milk`, por ejemplo). Los iconos de categorías viven en `state.categoryIcons[nombre].icon_key`, sin cambiar el esquema anterior de nombres de categorías. Los detalles de una entrada siguen separados del catálogo.

## Búsqueda

`src/icon-semantics.js` contiene el diccionario ampliable ES–EN, sinónimos regionales, plurales controlados, frases y modificadores. Se busca primero el concepto específico, después la familia y finalmente la categoría. Una frase con palabras desconocidas no se presenta como traducida: se intenta el proveedor opcional o se muestran alternativas explícitas. El usuario puede corregir la consulta o elegir modo inglés.

Cada petición usa `https://api.iconify.design/search?query=...&limit=24&prefixes=lucide,tabler`. La documentación pública indica un mínimo de 32 en algunas versiones del API: se envía 24 como se solicitó y se limita localmente a 24 aunque el servidor devuelva más. Se eliminan duplicados por identificador y se conserva la prioridad de concepto antes de colección.

Debounce de 350 ms y AbortController para búsquedas, traducción y descarga de resultados anteriores. Se invalida además cada generación para impedir resultados tardíos. Cerrar o reemplazar el selector cancela el trabajo pendiente.

## Caché y seguridad

IndexedDB `daylist-iconify` almacena búsquedas (TTL de 7 días, reutilizadas offline incluso si son antiguas), traducciones reales del proveedor y SVG estáticos con licencia. Los SVG confirmados se guardan antes de permitir aplicar la selección y no caducan. Nunca se usa localStorage para SVG.

Solo se admiten las colecciones registradas, excluyendo variantes Tabler `-filled`. Se depura el SVG con una lista de geometría y atributos permitidos, eliminando scripts, eventos, estilos y referencias externas. `currentColor` conserva el contraste en ambos temas. El service worker cachea los módulos locales; no intercepta traducción ni otros endpoints privados.

## Traducción opcional

Configurar `ICON_TRANSLATION_URL` con un endpoint compatible con LibreTranslate y, si aplica, `ICON_TRANSLATION_API_KEY`. Reiniciar el servidor. POST `/api/icon-translation` recibe `{text}`; el servidor envía `{q,source:"es",target:"en",format:"text"}` y devuelve `{translation}` a partir de `translatedText`. La URL y la clave no se envían al navegador. Se limita longitud, tiempo y origen; no se registran consultas o credenciales. Sin configuración devuelve 503; con fallo de proveedor, 502. No hay traducciones simuladas.

## Colecciones aprobadas para esta integración

Se eligieron solo dos colecciones outline de 24 px para mantener consistencia. Sus licencias se muestran en el selector y se conservan en los registros de caché.

| Prefijo | Colección | Licencia | Fuente |
|---|---|---|---|
| lucide | Lucide | ISC (algunos iconos heredados de Feather: MIT) | https://lucide.dev/license |
| tabler | Tabler Icons | MIT | https://github.com/tabler/tabler-icons/blob/main/LICENSE |

Los avisos completos se conservan en `licenses/`. Revalidar licencia al ampliar la lista de colecciones. No se habilitan otras colecciones porque aparezcan en respuestas del API.

Referencias: https://iconify.design/docs/api/ y https://iconify.design/docs/api/search.html.

## Verificación ejecutada

- 10 pruebas de catálogo/semántica/cantidades más una prueba del adaptador de traducción: aprobadas.
- `tests/iconify-browser.cjs`: confirma selección explícita, persistencia de producto/categoría, eliminación de SVG activo, deduplicación, allowlist, debounce, desconocidos, temas, móvil y reutilización de SVG/búsquedas offline.
- `tests/iconify-states.cjs`: cancela búsquedas anteriores, ignora respuestas tardías, verifica vacío/error/reintento y respuesta del proveedor configurable.
- `tests/iconify-live.cjs`: consulta real a api.iconify.design y SVG reales cargados en Edge, sin mocks.
- `tests/browser.cjs`: regresión de listas, cantidades, recientes/deshacer, persistencia, dictado por texto, temas, siete tamaños y offline: aprobada.

El proveedor de traducción externo no está configurado. Su contrato se probó con un servidor HTTP local de prueba; no se afirma una conexión activa a un proveedor comercial o gratuito.
