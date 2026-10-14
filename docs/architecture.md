# Arquitectura de GC Predictor

## Decisiones

Next.js App Router y TypeScript permiten servir la UI y una API privada desde el mismo proceso. Tailwind 4 y CSS adaptable, componentes accesibles, iconos Lucide y Recharts. SQLite ofrece ejecución sin cuentas. PostgreSQL comparte el mismo contrato SQL, con pool transaccional y RLS sin políticas públicas; Supabase Storage es opcional para los originales. Se conserva una arquitectura de servidor Node, apropiada para PDF y SQLite nativo. No se adapta artificialmente a un hosting estático.

Se eligió JSON validado en tablas relacionadas frente a un esquema con decenas de columnas inestables: fuentes, exámenes, preguntas, conceptos, versiones de temario, temas, cambios normativos, importaciones y simulacros. Las relaciones de examen/fuente/canonical tienen índices y claves foráneas. Las plantillas (`answer_entries`) son relacionales y el servidor contrasta sus respuestas al validar. `audit_events` conserva antes/después, actor y fecha. La instancia es personal; `owner` en auditoría representa al dueño de la contraseña, no identifica a distintos usuarios.

## Archivos

- `lib/types.ts`: contratos de dominio, estado de validación y pesos.
- `lib/db.ts`: SQLite/PostgreSQL, migración, transacciones, persistencia y auditoría.
- `lib/store.ts`: carga del catálogo y del temario; lectura del dataset.
- `lib/importer.ts`, `lib/review.ts`: esquema de entrada, procedencia, extracción, correspondencia de opciones, plantillas y revisión.
- `lib/analysis.ts`: frecuencias, corpus admisible, ranking, comparación textual y evaluación temporal.
- `lib/auth.ts`, `lib/files.ts`: sesiones firmadas, protección del acceso, originales privados locales/Supabase.
- `app/api/[...path]/route.ts`: endpoints autenticados, corrección de simulacros y exportación.
- `components/app.tsx`, `components/admin.tsx`: interfaz de las seis secciones, filtros y revisión.
- `python/extract.py`: extracción especializada de conocimientos del archivo oficial, excluyendo idioma y ortografía.
- `data/source-catalog.json`, `data/syllabus-2026.json`, `data/raw`: investigación y originales públicos oficiales. No contienen resultados personales.

## Estados y trazabilidad

Documento localizado → original descargado y huella → extracción `draft` → cotejo `reviewed` → respuesta de clave definitiva + revisión literal `validated`. `cancelled` conserva la pregunta y la excluye; `reserve` no significa activa. Las propuestas de clasificación y referencias normativas tienen revisión independiente de la pregunta. Ninguna llamada de importación puede establecer `validated`.

Se conserva una ocurrencia literal por modelo. `canonicalId` agrupa equivalencias dentro del mismo año y sesión; `optionMap` corresponde al orden del grupo. Se usa igualdad conservadora del enunciado y de las cuatro opciones (NFC y espacios), ordenando sólo el conjunto para la huella. Acentos, negaciones, puntuación y símbolos se conservan. Errores de extracción que impiden igualdad necesitan cotejo humano antes de consolidarse. No se agrupan automáticamente preguntas sólo por su concepto ni se eliminan repeticiones entre años.

## Acceso y despliegue

Local sin contraseña sólo bajo desarrollo y loopback. Producción requiere contraseña y secreto; no existe cuenta administrativa predeterminada. No se permite usar la contraseña como clave de servicio ni se exponen claves en variables `NEXT_PUBLIC_`. La sesión dura siete días y sólo contiene expiración/nonce y firma HMAC. El control de intentos de login en memoria es apropiado para una instancia personal; varios procesos necesitan límite compartido en el proxy. Los endpoints rechazan operaciones de otro origen. Los originales se entregan sólo tras autenticar la solicitud.

Los PDFs de hasta 25 MB y 150 páginas se analizan en proceso; los PDF no confiables o corpus grandes deberían pasar a un worker aislado y cola con límites de CPU. El registro de importaciones inicial y de revisiones es persistente. Los errores de subida/extracción aparecen en la interfaz; una extracción abortada antes de crear una fuente no crea un trabajo de importación persistente. Pueden quedar originales huérfanos; un administrador debe eliminarlos tras comprobar que ninguna fuente los referencia.

No se cachean páginas privadas ni respuestas API en el service worker. SQLite/WAL exige disco persistente y un solo servicio con acceso coherente al archivo. En serverless usa PostgreSQL y Storage. Las copias de seguridad deben incluir base de datos y originales; la exportación JSON permite inspección/migración, pero no incluye los binarios ni sustituye una copia transaccional de la base.

## Evolución

Para más datos: columnas/índices materializados de frecuencia, procesado en cola, revisión en lotes, mapeo histórico de versiones de programa y referencias legales por fecha, motor OCR aislado y sugerencias semánticas opcionales con modelo local. Añadir un modelo probabilístico sólo después de fijar el protocolo temporal, reservar un conjunto externo y demostrar calibración fuera de entrenamiento.
