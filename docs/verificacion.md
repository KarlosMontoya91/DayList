# Verificación

- npm run check: aprobado.
- npm test: 6 pruebas unitarias aprobadas (catálogo, aliases/iconos, cantidades/presentación, variantes y decimales).
- node tests/browser.cjs: aprobado en Microsoft Edge headless.

E2E: iconos de aguacate y chiles, alta de producto desconocido con categoría/icono, detalles decimales y notas, deshacer, persistencia, claro/oscuro, frase múltiple de cuatro artículos, listas, catálogo propio y edición sin conexión después de recargar.

Sin desbordamiento horizontal en 360, 390, 430, 768, 1024, 1280 y 1440 px. Capturas en preview-light.png, preview-dark.png y preview-mobile.png. Ambas hojas CSS responden 200 y Content-Type text/css. Se retiró Google Fonts para eliminar una dependencia de red que podía retrasar los estilos.

No comprobado: micrófono físico, instalación móvil, OAuth exitoso, Firebase Auth real, colaboración, permisos remotos, notificaciones y métricas de rendimiento. No se afirma cumplimiento completo del prompt.
