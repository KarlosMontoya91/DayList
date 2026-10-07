# Estado del prompt maestro — 2026-10-07

El alcance completo del prompt NO está terminado. No se ha publicado en Git.

## Cambios autorizados

- Iconos ligeros en lugar de generación de imágenes 3D.
- Firebase en lugar de Supabase para cuentas. El usuario autorizó crear un proyecto nuevo; falta completar la autorización OAuth de la CLI.

## Implementado localmente

- 709 productos únicos en 38 categorías, aliases, normalización y búsqueda singular/plural. Icono asignado por producto, independiente de categoría; iniciales cuando no existe equivalencia visual.
- Productos propios con nombre, categoría e icono; edición; categorías propias; detalles por entrada de lista.
- Cantidad omitida o decimal, unidad, presentación separada, marca, variante, notas, prioridad y foto de referencia local reducida/recodificada.
- Listas múltiples: crear, renombrar, duplicar, archivar/restaurar y eliminar. Copiar/mover productos en una transacción local.
- Identidad por variante, aviso de duplicado, reactivación de comprado, recientes y deshacer.
- Temas claro/oscuro/sistema, filas/tarjetas, agrupación, orden de categorías y modo compra.
- IndexedDB, migración no destructiva desde verde-lists, comprobación de revisión entre pestañas. Una revisión obsoleta no sobrescribe datos.
- App shell offline, consulta y edición sin red después de la carga inicial. No equivale a sincronización remota.
- Reconocimiento del navegador cuando existe, alternativa por texto y revisión editable antes de insertar; parser probado con cantidades y presentaciones del ejemplo del prompt.
- Plantillas iniciales, guardar lista como plantilla y aplicar con selección/destino.
- Recetas manuales, edición, favoritas, porciones y revisión de ingredientes. URL como fuente, sin importación automática.
- Actividad y notas locales, ofertas manuales sin precios ficticios y tarjetas de fidelidad con número legible.
- Presupuesto estimado opcional por unidad de compra; total parcial y productos sin precio. Exportación JSON.

## Firebase

Adaptador Auth implementado para registro, verificación de correo, acceso, salida y recuperación, cargado únicamente cuando existe configuración pública. No probado contra un proyecto real.

La CLI 15.32.1 se instaló. El usuario reportó error OAuth; se generó un enlace nuevo. No se creó un proyecto ni se habilitó facturación. No hay cuentas, membresías ni listas sincronizadas activas.

## Pendiente

1. Autorizar Firebase, crear proyecto, determinar base/edición/región y conectar Auth.
2. Backend colaborativo: hogares, permisos, invitaciones, caducidad/revocación, transferencia, reglas y pruebas negativas de aislamiento.
3. Outbox remoto, idempotencia, reintentos y conflictos concurrentes; purga al revocar; importación de invitado a cuenta.
4. Perfil remoto, eliminación de cuenta, fotos privadas remotas, mensajes/reacciones y push.
5. Voz: comandos de modificar/eliminar, selección hablada de destino y proveedor alternativo de transcripción. No probado con micrófono físico.
6. Plantillas: edición avanzada, duplicación y opcionales. Recetas: búsqueda e importación URL protegida contra SSRF.
7. Folletos y códigos de barras/QR de fidelidad. Ofertas: proveedor real, región y fuente estructurada.
8. Presupuesto: gasto real, bases de precios y precisión monetaria arbitraria. Importación de archivos JSON.
9. Administración con rol de plataforma, ocultación de categorías y orden personal de listas.
10. WCAG completo, métricas LCP/INP/CLS, dos cuentas reales y PWA instalada en dispositivos.

Se conserva la app existente en módulos JavaScript; no se realizó migración a Next.js/TypeScript. Es una desviación respecto a la arquitectura sugerida y debe revisarse antes del backend completo.

## Fuentes revisadas

https://www.getbring.com/en/features
https://www.getbring.com/help-center-main-categories/items-lists
https://www.getbring.com/help-center-main-categories/inspirations-suggestions
https://www.getbring.com/help-center-main-categories/profile-settings
https://www.getbring.com/blog-posts/your-activities-at-a-glance
https://inspectorageek.com/bring-lista-de-compra/

La URL mobileappdesign devolvió error. Voz web, categorías propias y presupuesto son mejoras solicitadas. IndexedDB con revisión global es una decisión técnica local. Exportación no es colaboración.
