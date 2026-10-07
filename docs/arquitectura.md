# Arquitectura actual

- src/main.js: listas, catálogo, formularios, migración y mutaciones locales.
- src/catalog.js y data/catalog.json: productos, categorías, aliases e iconos.
- src/parser.js: cantidades, unidades, presentación e identidad.
- src/storage.js: IndexedDB con revisión autoritativa dentro de la transacción.
- src/extras.js: inspiración, recetas, voz, ofertas, fidelidad y perfil.
- src/firebase.js: adaptador Auth diferido; configuración pública desde /api/config.
- server.cjs: servidor de assets permitidos explícitamente. No sirve .env ni archivos arbitrarios.
- sw.js: caché explícita de recursos públicos. No intercepta Auth/API/terceros.

Catálogo y entradas tienen IDs independientes. Los detalles y fotos pertenecen a cada entrada. Cambiar productos propios afecta futuras adiciones, no reescribe compras anteriores.

El backend colaborativo y su autorización aún no están implementados. Las transacciones actuales son locales. No publicar listas compartidas sin implementar y probar ese backend.
