# Verificación de GC Predictor

Fecha: 14/10/2026. Entorno Node 24.19.0 y Python 3.12.14. El estado vigente de la fase histórica está al final y en [history-2023-2026.md](history-2023-2026.md); las entregas anteriores se conservan como historial.

## Comprobaciones de la entrega inicial

Se conservan como registro de la primera entrega; el estado actual del corpus se detalla al final.

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

## Cotejo y segunda entrega: 2026

- Protocolo real ejecutado sobre A/B y las dos plantillas oficiales: 210 ocurrencias, 105 equivalencias, corrección A7/B88 C→A, cinco reservas únicas separadas, 100 ordinarias para descripción. Dos motores PDF concordantes; inspección visual de tablas y excepción A28/B62. No se afirma revisión humana independiente de todas las transcripciones.
- `npm run data:verify`: **34 archivos con SHA-256 correcto**, diferenciando **23 de procedencia oficial** y **11 copias secundarias sin autenticar**. Las secundarias no se importan ni alimentan estadísticas.
- `npm test`: **23 pruebas aprobadas**, cero fallos. Nueve comprobaciones de integración sobre el banco auténtico, en SQLite temporal. Comprueban equivalencias, corrección, firmeza pendiente, reservas, estadísticas, artículos, rechazo de clave sustituida, modificaciones, idempotencia, cambios de referencia y anulaciones. Los fixtures sintéticos siguen aislados.
- `npm run typecheck` y `npm run build`: correctos. Las rutas servidor, API y login compilan en producción.
- Navegación Chromium mediante Playwright: dashboard con 100 ordinarias, filtro Constitucional con 7, artículo 6 CC con una aparición y A33/B22, prioridades descriptivas y registro anual. Cero errores JavaScript; sin desbordamiento horizontal a 390 píxeles. Capturas de escritorio y móvil conservadas en el entorno. No certifica Safari iOS físico.
- Producción con credenciales de prueba y SQLite nueva temporal: anónimo 401, login firmado correcto, carga automática de 210 ocurrencias reales, 100 ordinarias, 0 definitivas y 68 artículos. Intento de marcar una pregunta como definitiva sin clave final rechazado con 400; el corpus permanece intacto. Los secretos aleatorios no se imprimieron ni guardaron en el repositorio.
- Conservación: **77 rutas previas presentes**, **22 PDF anteriores con huella intacta** y **840/840 identificadores de pregunta preservados**. Copia transaccional previa en `.local/backups/pre-validation.sqlite`. Los paquetes de la primera entrega se conservan.
- Informe agregado sin resultados personales en `data/research/validation-summary-2026.json`; el reporte operativo se regenera con `npm run data:apply-verified` en `.local/reports/validation-summary.json`.

Estado estricto: **0 preguntas con firmeza definitiva acreditada**. Frecuencias documentales habilitadas con ese aviso; simulacros y retrospectiva sin corpus estricto. Ninguna probabilidad ni eficacia predictiva acreditada. Las 2023–2025 siguen pendientes de fuentes primarias/autenticación, no se rellenan años ni cifras.

La conexión GitHub volvió a devolver instalaciones y cuentas vacías. Instrucciones y distinción entre conector de consulta y acceso de escritura Codex en [github-access.md](github-access.md). No hay despliegue HTTPS contratado/configurado; la compilación no publica por sí sola una URL. PostgreSQL/Supabase, Docker y Safari físico mantienen sus pruebas pendientes.

## Publicación en GitHub confirmada

El 14/10/2026, después de instalar ChatGPT Codex Connector y conceder acceso al repositorio, el push finalizó correctamente. La rama remota `main` contiene el proyecto y sus documentos; se comprobó su referencia mediante `git ls-remote`. El error 403 anterior queda resuelto. Esto publica el código, no despliega la aplicación web.

## Entrega histórica 2023–2026: controles actuales

- Protocolo real ejecutado con `python/verify_history.py`: 12 cuadernillos digitales, 1.260 ocurrencias, 630 pares A/B incluyendo reservas, cuatro alternativas, dos motores concordantes y claves transcritas visualmente de ambos modelos. No requiere red para reproducirlo. Cotejo de copias entre proveedores conservado sin convertir su origen en oficial.
- `npm run data:verify`: **45 PDF con SHA-256 correcto**, 24 de procedencia institucional y 21 copias secundarias; la huella no autentica por sí sola el origen.
- `npm test`: **34 pruebas aprobadas, cero fallos**. Se mantienen las 23 anteriores y se añaden 11 sobre el banco histórico auténtico, con bases temporales. Cubren dos sesiones/tres formas de 2024, exclusión del 29/09, conservación de la errata impresa de 2025 y corrección visual de espacio de extracción de 2024, biyección A/B, reservas, dos repeticiones literales, conceptos, versiones BOE anteriores, alteración de corroboración, idempotencia y corte temporal. Los fixtures sintéticos no se mezclan con datos reales.
- `npm run typecheck` y `npm run build`: correctos; rutas, API y login compilan en producción.
- Navegación Chromium/Playwright sobre desarrollo: dashboard con 700 ordinarias; explorador 2024 con 300; artículo 9 LO 1/1982 con tres apariciones y fuentes A/B; apertura de los dos grupos literales y sus preguntas; doce familias conceptuales; comparación de frecuencias; cambio entre retrospectiva estricta y reconstrucción exploratoria. Sin errores de JavaScript ni desbordamiento a 390 píxeles.
- Producción compilada con credenciales aleatorias en memoria y SQLite nueva temporal: API y documentos anónimos 401, login 200 y cookie HttpOnly/SameSite Strict, carga automática de **1.470 registros / 700 ordinarias / 0 finales**, 121 fichas, 2 grupos literales y 12 conceptuales. PDF entregado coincide con SHA del catálogo; escritura de origen externo 403; intento de declarar final una pregunta secundaria 400. Corpus personal sin modificaciones. [Resultado agregado](../data/research/history/production-checks.json).
- Navegador en producción, autenticado y a 390 píxeles: dashboard correcto, sin desbordamiento ni errores JS. No equivale a Safari/iPhone físico.
- Conservación: **109 rutas previas presentes, 34 PDF previos sin cambios, 840/840 IDs de preguntas anteriores conservados**. Se compararon también todas las fuentes, exámenes, conceptos, programas, temas, cambios legales, trabajos, intentos y auditoría: ningún identificador anterior perdido. La base contiene ahora 2.100 preguntas. Copia transaccional anterior en `.local/backups/historical-2023-2026/before.sqlite`; los ZIP anteriores se conservan.

La retrospectiva estricta sigue sin datos finales/publicación suficientes. La reconstrucción documental obtiene 2 conceptos top 10 en 2025 y 6 en 2026, igual que frecuencia histórica, con cobertura parcial y supuestos explícitos. No se acredita mejora ni calibración. Se preservan 524 conceptos pendientes y 568 preguntas sin referencia concreta cotejada; no se inventan equivalencias. No se han certificado retiradas concretas del temario.

El acceso de escritura a GitHub ya se resolvió en la fase anterior. La nueva fase se prepara como commit adicional, ZIP y Git bundle con nombre nuevo, conservando el estado anterior. Publicar código no despliega la web. PostgreSQL/Supabase, Docker, Safari físico y hosting HTTPS mantienen los límites indicados anteriormente.
