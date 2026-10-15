# Verificación de la adaptación a Netlify, 15/10/2026

El repositorio existente conserva todos sus registros. No hay aún un despliegue remoto certificado: faltan las conexiones autorizadas a Netlify y Supabase.

## Comprobaciones realizadas

- 52 pruebas automatizadas, cero fallos; TypeScript correcto. El clon público omite seis pruebas que requieren la evidencia privada, sin inventar esa evidencia.
- Next.js 16.4 compila con Node 24 y el adaptador OpenNext de Netlify 5.16.2. `netlify build --offline` genera correctamente la función. El adaptador de Netlify se actualiza automáticamente en los despliegues, según su recomendación oficial.
- Se invoca la **función generada de Netlify** desde un servidor de pruebas local, con PostgreSQL 17 real y TLS verificado. El servicio de caché de Netlify y la API REST de Storage se simulan: no se presentan como pruebas del servicio Supabase o Netlify real.
- Importación completa de la copia privada, dos ejecuciones sin duplicar registros, comparación exacta de huellas de todas las filas. 2.100 preguntas, 1.470 entradas de plantilla, 15.569 eventos de auditoría, 71 fuentes, 24 registros de modelo/forma y 1.214 conceptos actuales e históricos conservados. 700 preguntas ordinarias admitidas en descripción y 37 familias conceptuales interanuales.
- Tamaño PostgreSQL de la prueba final: 102.700.723 bytes. Archivos originales y evidencias previstos: 94.187.648 bytes. Caben con margen en los límites de 500 MB y 1 GB; el tamaño real del proyecto Supabase se volverá a medir antes de habilitar el sitio.
- La nueva base de pruebas es independiente de la personal. La base SQLite de trabajo permanece idéntica por filas a la copia anterior a esta fase. Todos los archivos `data/` del ZIP privado permanecen idénticos; no se ha reemplazado el ZIP ni borrado el proyecto previo.
- Acceso anónimo 401, origen ajeno 403, cookies Secure/HttpOnly, RLS en tablas, rol anon sin acceso, almacenamiento sin acceso anónimo. Una política insegura de Storage impide cualquier subida de archivos antes de iniciar la migración.
- Carga de los 2.100 registros en 22 peticiones de páginas, sin IDs duplicados. Las respuestas comprobadas están por debajo de 4 MB, con margen respecto al límite de Netlify de 6 MB.
- Descarga de un original mediante enlace temporal de 60 segundos; la huella coincide. Subida con permiso limitado a un solo objeto. El navegador no recibe la clave de servicio.
- El cuestionario real 2026 A se sube y extrae **dentro de la función generada**: 19 páginas, 126 candidatos genéricos, todos borradores. Es un extractor de documentos que puede mezclar secciones; no se incorporan esos 126 como nuevas preguntas validadas de conocimientos.
- Dos sesiones privadas consultan el mismo progreso y respuestas. Se conserva tras reiniciar el proceso. Se devuelve 409 ante una revisión simultánea obsoleta, sin sobrescribirla silenciosamente.
- Interfaz de producción comprobada con Chromium a 1.440 px y con emulación móvil de 390 px: entrada privada, consulta del banco, marcas y respuestas sincronizadas, recarga al recuperar foco, manifiesto válido, service worker activo, cero errores JavaScript y sin desbordamiento horizontal. La caché solo contiene iconos y manifiesto.

## Fallos encontrados y resueltos

1. Carga inicial superior a 7 MB: ahora el banco se solicita por páginas y el conjunto incompleto se rechaza si cambia el número de registros durante la carga.
2. PDF de hasta 25 MB frente a peticiones binarias Netlify limitadas: subida directa al bucket privado y comprobación SHA-256 en servidor; descarga firmada para evitar el límite de respuesta.
3. `data/raw` y `data/pending` solo se leían del disco: pasan a la misma ruta privada en Storage. También se importan los artefactos completos de la auditoría sin publicarlos en GitHub.
4. Posibilidad de crear SQLite temporal o cargar una semilla incompleta: bloqueo de ambos comportamientos en Netlify/Lambda y recibo obligatorio de importación completa.
5. Límite de intentos solo en memoria: pasa a PostgreSQL con incremento atómico y límite global adicional.
6. PDF.js omitía `pdf.worker.mjs` en la función empaquetada, aunque el servidor Next normal funcionaba. Se incluye explícitamente mediante el trazado de archivos de Next y se verifica extrayendo un examen real.
7. La prueba de navegador podía cambiar de URL antes de terminar la navegación de acceso. El test espera a que la aplicación esté cargada antes de cambiar de sección.

## Límites y pendientes

Faltan el proyecto real de Supabase, los secretos del servidor y la autorización de Netlify para publicar. La conexión GitHub existente no concede esos accesos. La conexión Supabase fue localizada y solicitada, pero aún no consta autorizada. No se ha contratado capacidad ni configurado facturación.

Pendientes de la conexión: importación en Supabase real, revisión de sus políticas y cuotas, despliegue Netlify, certificado HTTPS público, pruebas de acceso y persistencia contra esa URL, instalación física en Safari/iPhone y Chrome/Edge de Windows. Hasta entonces no se entrega una URL como funcional.

Las 700 clasificaciones siguen siendo asistidas, pendientes de revisión humana. La situación final de respuestas/anulaciones no mejora por cambiar el alojamiento. Los simulacros con calificación estricta continúan exigiendo respuestas definitivas acreditadas; las respuestas personales de práctica y marcas de estudio no alteran ese criterio. No hay nuevas probabilidades predictivas.

Los registros detallados y huellas se conservan en `.local/netlify-test/` y `.local/netlify-migration/`, fuera del repositorio público. [Guía de conexión e instalación](despliegue-iphone.md).
