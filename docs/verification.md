# Verificación de la entrega inicial

Fecha: 14/10/2026. Entorno Node 24.19.0 y Python 3.12.14.

- `npm run typecheck`: correcto.
- `npm test`: 14 pruebas aprobadas, cero fallos. Bases temporales con fixtures sintéticos separados del corpus real.
- `npm run build`: compilación de producción correcta, sin avisos pendientes de tracing.
- `npm audit --omit=dev --audit-level=high`: cero vulnerabilidades informadas en dependencias de producción en la consulta.
- `npm run data:verify`: 22 originales coinciden con el SHA-256 del catálogo.
- Carga real con `data:archive`: 12 modelos registrados, 6 sesiones candidatas, 840 preguntas en borrador, cero validadas. 2020 sin extracción digital.
- API real de desarrollo: bootstrap/análisis/extracción PDF devuelven 200; un origen externo en escritura devuelve 403. El PDF de plantilla 2026 se extrae sin atribuir validez definitiva. Los originales `.PDF` de 2022 se entregan correctamente tras autenticación.
- Producción sin secretos: API bloqueada con 503 y página privada redirige a login. Producción con credenciales de prueba y SQLite temporal: acceso anónimo rechazado 401, login y cookie HttpOnly firmada correctos, importación → revisión → validación → simulacro corregido y guardado, sustitución por clave anulada y persistencia del resultado anterior correctos. Nunca se modificó el corpus auténtico para esa prueba.
- Chromium instalado, mediante Playwright: navegación de las seis secciones, apertura de revisión de pregunta, capturas a 1440 y 390 píxeles de ancho. Sin errores de JavaScript y sin desbordamiento horizontal en ambos tamaños. No equivale a una prueba física de Safari iOS.

Pendientes: PostgreSQL/Supabase y Storage con credenciales reales; ejecución Docker; instalación Safari/iPhone real; despliegue alojado HTTPS. No se afirma que el motor estadístico supere referencias con datos reales: actualmente carece de corpus definitivo validado. No hay rendimiento predictivo ni calibración acreditados.

Entrega remota: `git push` devuelve 403; `github_create_blob` también devuelve `Resource not accessible by integration` (403). La cuenta puede leer el repositorio público, pero la consulta de cuentas con la app instalada devuelve una lista vacía. Se conserva un commit local y se entregan ZIP y Git bundle; no se afirma que exista código subido al remoto.
