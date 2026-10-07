# Súper Hogar — Listas de compras

### Selector de iconos de DayList

Productos y categorías incluyen búsqueda visual mediante Iconify. Busca en español, selecciona y pulsa **Confirmar icono** antes de guardar. Usa un diccionario ES–EN ampliable, Lucide/Tabler, caché IndexedDB offline y conserva ambos temas. [Documentación y configuración de traducción](docs/iconify.md). Iconify funciona sin clave; la traducción externa es opcional y no está configurada.

Aplicación local con 709 productos en 38 categorías, productos propios con icono independiente, detalles, temas, recetas y plantillas. Conserva la identidad verde de la versión inicial.

## Ejecutar

Requiere Node.js 22 o posterior. No necesita instalar dependencias para el modo invitado.

```sh
npm run dev
```

Abre http://127.0.0.1:5173.

Permite crear, renombrar y eliminar listas; agregar productos por categoría; ajustar cantidades; marcar comprados; filtrar y limpiar comprados. Incluye temas claro y oscuro. Los datos y el tema se guardan en localStorage del navegador, sin cuenta ni sincronización remota. La primera visita incluye una lista de ejemplo.

Usa fuentes del sistema; no depende de Google Fonts. Los datos se migran desde localStorage a IndexedDB sin borrar el original. Mantén el mismo origen: localhost y 127.0.0.1 tienen almacenes diferentes.

`npm run check` valida sintaxis. `npm test` ejecuta las pruebas unitarias. `node tests/browser.cjs` verifica los flujos en Edge con Playwright instalado en el runtime de este equipo.

`node scripts/build-catalog.cjs` reconstruye el catálogo desde data/catalog-source.txt. El reporte está en docs/catalog-report.md.

El usuario eligió Firebase y crear un proyecto nuevo. Falta autorizar la CLI. El adaptador Auth existe pero no está conectado ni probado. .env.example contiene los campos públicos necesarios; nunca colocar claves de servicio en el frontend. Compartir listas requiere implementar además el backend y sus reglas.

**El alcance completo del prompt aún no está terminado.** Consulta docs/estado-requisitos.md y docs/verificacion.md para distinguir funciones locales, pruebas e integraciones pendientes. No se publicó en Git.
