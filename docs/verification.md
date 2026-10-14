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

## Clasificación completa de las 700 ordinarias

La fase vigente se detalla en [concept-analysis-700.md](concept-analysis-700.md). Se preserva el informe de las fases anteriores, incluidos sus resultados de cobertura parcial.

- Se aplicaron 524 anotaciones explícitas y se conservaron las 176 etiquetas conceptuales anteriores. 700 ordinarias asignadas, 553 conceptos, materia y subconcepto, con método, confianza cualitativa, fuente y huella. Se declara revisión asistida: cero confirmaciones humanas independientes en el banco entregado y 211 etiquetas de confianza media.
- Se repitió el cotejo dual de los doce cuadernillos históricos con `python/verify_history.py`, corrigiendo un filtro que eliminaba una línea real de rumbo inverso en 2024 1A87/1B73. Se conservaron el texto anterior y la prueba visual. Ninguna letra ni alternativa cambió.
- Se contrastó el artículo 50 de la Ley 42/2007 en el XML BOE, versión anterior al examen, y se documentó una discrepancia en 2024 2A81/2B75. La letra copiada A se conserva como dato, con advertencia en pregunta, administración y ficha del artículo. No se presume anulación oficial ni se pinta la letra como solución jurídicamente fiable.
- `npm test`: **42 pruebas aprobadas, cero fallos**; ocho nuevas sobre la clasificación completa, distinción de reglas, preservación de 176 etiquetas, ausencia de normas inventadas en topografía, versión ministerial histórica pendiente, línea recuperada, conflicto normativo, relaciones verificables, evaluación temporal, idempotencia y revisión humana explícita preservada. Tras ajustar la propagación del aviso a las fichas se ejecutaron de nuevo las ocho pruebas afectadas, todas correctas.
- `npm run typecheck`: correcto. `npm run build`: correcto, sin avisos de tracing pendientes. Se corrigió un acceso dinámico innecesario detectado por la primera compilación.
- `npm run data:verify`: 45 PDF con SHA-256 correcto. Tres manifiestos de evidencias comprobados íntegros: 2026, histórico y conceptual. Los PDF previos no se modificaron.
- Chromium/Playwright de desarrollo: dashboard 700/700, filtro de confianza media 211, filtro de conflicto 1, advertencia de clave, ausencia de resaltado verde en esa letra, texto de rumbo restaurado, materia/subconcepto editables, confirmación humana inicialmente desmarcada, apertura de relaciones con preguntas originales y evaluación exploratoria con sus límites. Cero errores JavaScript; sin desbordamiento a 390 píxeles. [Resultado](../data/research/concepts-700/browser-checks.json).
- Servidor compilado con SQLite nueva temporal y secretos aleatorios sólo en memoria: acceso anónimo API/documentos 401, login 200 y cookie firmada, carga de 1.470 registros de modelos, 700 ordinarias y 700 conceptos asignados, 122 fichas y una discrepancia; corpus final cero. Rechazo de origen externo 403, intento de validación sin fuente definitiva 400, PDF entregado con SHA correcto. Navegador móvil de producción sin errores ni desbordamiento; base personal sin cambios. [Resultado](../data/research/concepts-700/production-checks.json).
- Conservación: **148 rutas previas presentes, 45 PDF anteriores intactos, 2.100/2.100 IDs de preguntas conservados**, sin cambios de opciones, respuestas ni conceptos previamente asignados. Sólo los dos enunciados de rumbo recuperaron una línea. Todas las entidades y los eventos de auditoría anteriores conservan sus IDs; copia transaccional previa y paquetes anteriores retenidos.

El análisis resultante informa 89 familias interanuales, 63 con años consecutivos y 14 relaciones explícitas de contenido, sin convertir todas las familias en reglas idénticas. La reconstrucción top 10 obtiene 3 preguntas de 2025 y 3 de 2026; frecuencia obtiene 2 y 3. Top 50 no mejora la frecuencia en esos objetivos. No se acredita ventaja predictiva estable ni calibración; la evaluación estricta sigue sin fuentes finales/publicación suficientes. La asignación completa no sustituye una revisión humana independiente ni acredita vigencia 2027.

## Auditoría de las 700 preguntas · 14/10/2026

- TypeScript y compilación Next.js correctos. Suite completa: **48 pruebas pasadas, cero fallos**; los seis controles de auditoría se repitieron tras ajustar la conservación de revisiones del propietario, también correctos.
- Copia del contenido que se sube al repositorio público, sin evidencias privadas: **42 pruebas pasadas y 6 explícitamente omitidas**. No se presentan esas seis como ejecutadas en el clon público.
- Las 45 huellas de los PDF previos, incluidos los nombres `.PDF` en mayúsculas, coinciden. Se conservan los 164 archivos versionados previos y todos los identificadores de las tablas. No cambiaron enunciados, alternativas, letras, condición de reserva, fuentes asociadas a las preguntas ni relaciones A/B.
- Plantilla 28/10/2023 archivada: 210 celdas de conocimientos cotejadas, cero diferencias; SHA-1 del PDF coincide con el digest CDX. La del 29/10/2023 coincide byte a byte con la copia retenida.
- Backup/restauración: tablas `questions`, `sources`, `audit_events`, `answer_entries` y `attempts` idénticas; integridad y claves foráneas correctas; sobrescritura de base existente rechazada.
- Contenedor de producción con volumen y semilla privada: **2.100 registros antes y después de recrearlo**, edición y PDF subido conservados. Límite de prueba: 512 MiB y 1 CPU; muestra de memoria al terminar: 128,3 MiB. La restauración inicial se omite cuando la base del volumen ya existe.
- HTTPS local mediante proxy: cookie `Secure`, `HttpOnly`, `SameSite=Strict`; API anónima 401, origen ajeno 403, validación final sin evidencia 400, PDF duplicado 400. Los PDF archivados se sirven autenticados y con su hash íntegro. Python PDF y SQLite nativo funcionan en el contenedor.
- Extracción web de un PDF real de 19 páginas: 126 candidatos genéricos. **Pueden mezclar secciones; son borradores, no 126 conocimientos validados.** El banco estadístico de 700 procede del cotejo específico y no incorpora esos candidatos del test.
- Chromium, 390 y 1440 px: cola de 291 entradas, incertidumbre visible, conflicto no marcado como respuesta correcta y tres niveles de análisis; sin desbordamiento horizontal ni errores JavaScript. Safari/iPhone físico y certificado público del alojamiento pendientes de despliegue autorizado.

Las pruebas mutantes se ejecutaron sobre copias aisladas, no sobre la base personal. Los resultados detallados están en `data/research/quality-audit-700/` del paquete privado. No se ha desplegado un servicio ni contratado un plan.
