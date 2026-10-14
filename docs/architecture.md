# Arquitectura de GC Predictor

## Decisiones

Next.js App Router y TypeScript permiten servir la UI y una API privada desde el mismo proceso. Tailwind 4 y CSS adaptable, componentes accesibles, iconos Lucide y Recharts. SQLite ofrece ejecución sin cuentas. PostgreSQL comparte el mismo contrato SQL, con pool transaccional y RLS sin políticas públicas; Supabase Storage es opcional para los originales. Se conserva una arquitectura de servidor Node, apropiada para PDF y SQLite nativo. No se adapta artificialmente a un hosting estático.

Se eligió JSON validado en tablas relacionadas frente a un esquema con decenas de columnas inestables: fuentes, exámenes, preguntas, conceptos, versiones de temario, temas, cambios normativos, importaciones y simulacros. Las relaciones de examen/fuente/canonical tienen índices y claves foráneas. Las plantillas (`answer_entries`) son relacionales y el servidor contrasta sus respuestas al validar. `audit_events` conserva antes/después, actor y fecha. La instancia es personal; `owner` en auditoría representa al dueño de la contraseña, no identifica a distintos usuarios.

## Archivos

- `lib/types.ts`: contratos de dominio, estado de validación y pesos.
- `lib/db.ts`: SQLite/PostgreSQL, migración, transacciones, persistencia y auditoría.
- `lib/store.ts`: carga del catálogo y del temario; lectura del dataset y aplicación idempotente del banco cotejado.
- `lib/verified-bank.ts`, `lib/historical-bank.ts`, `lib/documentary.ts`: manifiesto y validación transaccional de evidencias; elegibilidad documental y huellas por pregunta.
- `lib/history.ts`, `components/article-history.tsx`: fichas normativas e informe anual.
- `lib/importer.ts`, `lib/review.ts`: esquema de entrada, procedencia, extracción, correspondencia de opciones, plantillas y revisión.
- `lib/analysis.ts`: frecuencias, corpus admisible, ranking, comparación textual y evaluación temporal.
- `lib/auth.ts`, `lib/files.ts`: sesiones firmadas, protección del acceso, originales privados locales/Supabase.
- `app/api/[...path]/route.ts`: endpoints autenticados, corrección de simulacros y exportación.
- `components/app.tsx`, `components/admin.tsx`: interfaz de las seis secciones, filtros y revisión.
- `python/verify_2026.py`, `python/curate_2026.py`, `python/verify_history.py`, `python/curate_history.py`: cotejo con dos motores PDF y referencias BOE históricas.
- `python/extract.py`: extracción especializada de conocimientos del archivo oficial, excluyendo idioma y ortografía.
- `data/source-catalog.json`, `data/syllabus-2026.json`, `data/raw`: investigación y originales públicos oficiales. No contienen resultados personales.

## Estados y trazabilidad

Documento localizado → original descargado y huella → extracción `draft` → cotejo `reviewed` → respuesta de clave definitiva + revisión literal `validated`. `cancelled` conserva la pregunta y la excluye; `reserve` no significa activa. Las propuestas de clasificación y referencias normativas tienen revisión independiente de la pregunta. Ninguna llamada de importación puede establecer `validated`. El cotejo documental de 2026 es ortogonal al estado: guarda `reviewed` y un certificado con ámbito `official_corrected_documentary`, firmeza no confirmada, huellas, método y limitaciones. `observedCorpus` permite frecuencias publicadas; `validatedCorpus` conserva el filtro de clave definitiva.

Se conserva una ocurrencia literal por modelo. `canonicalId` agrupa equivalencias dentro del mismo año y sesión; `optionMap` corresponde al orden del grupo. Se usa igualdad conservadora del enunciado y de las cuatro opciones (NFC y espacios), ordenando sólo el conjunto para la huella. Acentos, negaciones, puntuación y símbolos se conservan. Errores de extracción que impiden igualdad necesitan cotejo humano antes de consolidarse. No se agrupan automáticamente preguntas sólo por su concepto ni se eliminan repeticiones entre años.

## Aplicación del banco documental

Los JSON de `data/verified` conservan el banco original de 210 ocurrencias de 2026; `data/verified/history` añade 1.260 de 2023–2025 y sus referencias, transcripciones de claves y corroboraciones; el manifiesto fija sus huellas y las de la consulta oficial. `initialize` aplica el banco a una base nueva o existente mediante una transacción. Una versión de manifiesto ya aplicada no se repite; los identificadores existentes se reutilizan y las revisiones manuales se preservan. `GC_SKIP_VERIFIED_BANK=1` se reserva para aislamiento de fixtures de prueba. El estado inicial se puede reconstruir sin ejecutar Python.

Antes de aplicar se validan esquemas, numeración, reservas, correcciones y correspondencia biyectiva, además de las huellas de los PDF retenidos. El cotejo en ejecución liga texto, opciones, respuesta, identidad de fuente/clave, grupo y mapa A/B. Cambiar contenido retira el certificado propio y el de la pareja. La revisión de metadatos conserva la relación; una anulación se propaga a sus variantes, con auditoría y sin borrar filas. La clave sustituida nº 1 queda conservada y bloqueada para corrección.

`data/pending` conserva 21 copias secundarias. Doce cuadernillos y cinco claves alimentan el banco histórico tras el cotejo dual y la corroboración: SHA-256 entre proveedores o concordancia textual con excepción explícita de marca editorial. Dos copias de contraste y dos escaneados anteriores de 2025 no duplican preguntas. Las fuentes siguen con origen secundario y sin validación oficial/final. El servidor entrega sus PDF tras autenticación.

El ámbito `corroborated_documentary` liga la huella por pregunta a la corroboración de ambas fuentes. El manifiesto histórico incluye todos sus JSON y las huellas de los PDF; una aplicación fallida se revierte. La migración es aditiva, conserva identificadores previos y respeta registros `manual-reviewed` o ya validados. Las modificaciones de clasificación de 2026 conservan el subaspecto original y auditoría. `verificationState` distingue cotejo documental, respuesta final acreditada y pendiente; el origen es una dimensión separada.

La analítica documental incluye ambas procedencias con aviso. La retrospectiva estricta y los simulacros requieren el corpus final. La reconstrucción exploratoria se calcula por separado y declara sus supuestos, cobertura parcial y etiquetas retrospectivas. No modifica fechas de publicación ni genera probabilidades.

## Acceso y despliegue

Local sin contraseña sólo bajo desarrollo y loopback. Producción requiere contraseña y secreto; no existe cuenta administrativa predeterminada. No se permite usar la contraseña como clave de servicio ni se exponen claves en variables `NEXT_PUBLIC_`. La sesión dura siete días y sólo contiene expiración/nonce y firma HMAC. El control de intentos de login en memoria es apropiado para una instancia personal; varios procesos necesitan límite compartido en el proxy. Los endpoints rechazan operaciones de otro origen. Los originales se entregan sólo tras autenticar la solicitud.

Los PDFs de hasta 25 MB y 150 páginas se analizan en proceso; los PDF no confiables o corpus grandes deberían pasar a un worker aislado y cola con límites de CPU. El registro de importaciones inicial y de revisiones es persistente. Los errores de subida/extracción aparecen en la interfaz; una extracción abortada antes de crear una fuente no crea un trabajo de importación persistente. Pueden quedar originales huérfanos; un administrador debe eliminarlos tras comprobar que ninguna fuente los referencia.

No se cachean páginas privadas ni respuestas API en el service worker. SQLite/WAL exige disco persistente y un solo servicio con acceso coherente al archivo. En serverless usa PostgreSQL y Storage. Las copias de seguridad deben incluir base de datos y originales; la exportación JSON permite inspección/migración, pero no incluye los binarios ni sustituye una copia transaccional de la base.

## Evolución

Para más datos: columnas/índices materializados de frecuencia, procesado en cola, revisión en lotes, mapeo histórico de versiones de programa y referencias legales por fecha, motor OCR aislado y sugerencias semánticas opcionales con modelo local. Añadir un modelo probabilístico sólo después de fijar el protocolo temporal, reservar un conjunto externo y demostrar calibración fuera de entrenamiento.
