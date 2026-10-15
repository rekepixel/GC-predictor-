# GC Predictor en Netlify Free + Supabase Free

Decisión vigente del propietario, 15/10/2026. Se mantiene el repositorio, Next.js y toda la base privada. La propuesta anterior queda conservada en [el documento histórico](despliegue-contenedor-anterior.md). No se ha activado ningún servicio de pago.

**Estado actualizado:** Supabase está conectado. Se aplicó en el proyecto existente la migración de `generated_questions`, `exam_blueprints` y `exam_sessions`, con RLS y sin acceso para `anon` ni `authenticated`. Se comprobó escritura/actualización en una transacción revertida, sin importar datos personales. Sigue pendiente transferir la base completa, configurar las credenciales del servidor y autorizar Netlify. No hay una URL pública verificada. No confundir una compilación local con un despliegue.

## Arquitectura y cuotas gratuitas

- Netlify Free ejecuta Next.js App Router mediante su adaptador OpenNext. `netlify.toml` define Node 24, `npm run build` y `.next`. No se exporta como web estática ni se redirigen todas las rutas a un HTML.
- Supabase Free guarda PostgreSQL y un bucket **privado**. Todos los documentos conservan su ruta, huella y procedencia. Ningún registro personal depende del disco de una función.
- Netlify falla sin PostgreSQL o sin el recibo de importación privada: no crea SQLite temporal ni reconstruye silenciosamente la versión pública incompleta.
- La contraseña de propietario y el secreto de sesión se configuran solo en el servidor. Las cookies llevan Secure, HttpOnly y SameSite=Strict. El límite de acceso se guarda en PostgreSQL y funciona entre distintas instancias. No hay registro abierto de usuarios, ni cuentas distintas con acceso a los datos.
- Las revisiones y resultados siguen guardándose en PostgreSQL. `study_state` añade respuestas personales y marcas de estudio sincronizadas, con revisión optimista para detectar cambios simultáneos. Al volver a la aplicación se recarga el progreso. Marcar estudiada no valida una pregunta ni resuelve una clave discutida.
- PWA con identificador estable, iconos y modo standalone. El service worker solo conserva iconos y manifiesto, nunca exámenes, credenciales, respuestas o páginas privadas. Se necesita conexión.

Consulta de documentación oficial el 15/10/2026:

| Servicio                                                                     | Plan gratuito                                                                          | Uso y límites para este proyecto                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Netlify Free](https://www.netlify.com/pricing/)                             | 300 créditos mensuales; producción consume 15 créditos por despliegue                  | También consumen créditos tráfico, peticiones y cómputo. Al agotarse se pausa; no contratar recargas ni cambiar a un plan de pago. No se garantiza disponibilidad ilimitada.                                                                                              |
| [Funciones Netlify](https://docs.netlify.com/build/functions/configuration/) | 60 segundos síncronos; 6 MB por petición/respuesta almacenada en búfer                 | La carga del banco se divide en páginas de 100. Los PDF de hasta 25 MB van directamente al bucket mediante permiso firmado de un solo objeto. La extracción posterior recibe una ruta y verifica cabecera y SHA-256. Las descargas usan un enlace firmado de 60 segundos. |
| [Supabase Free](https://supabase.com/pricing)                                | 500 MB de base, 1 GB de archivos, 5 GB de salida y 5 GB adicionales de salida cacheada | La copia completa exige unos 94,2 MB de archivos. La importación de prueba ocupa unos 103 MB de PostgreSQL. El crecimiento y el tráfico se revisarán en el proyecto real.                                                                                                 |
| Supabase Free, operación                                                     | Pausa después de una semana de inactividad; sin copias automáticas incluidas           | El estudio frecuente lo mantiene activo; si se pausa, se reanuda desde el panel. Conservar copia privada externa. No se implementan peticiones artificiales para evitar su política de inactividad.                                                                       |

[Compatibilidad Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/): App Router, SSR y Route Handlers. [Conexión PostgreSQL serverless](https://supabase.com/docs/guides/database/connecting-to-postgres): pooler de transacciones, puerto 6543, pool de una conexión, consultas sin nombre y TLS con verificación del certificado. La CA opcional va en `DATABASE_CA_CERT`; nunca se desactiva la verificación TLS.

## Conexiones que necesita el propietario (sin terminal)

1. **Supabase ya está conectado: no volver a crear ni conectar un proyecto.** Falta configurar de forma privada la conexión PostgreSQL y la clave de servidor de Storage descritas abajo. La autorización del conector permite administrar el proyecto, pero no configura automáticamente las variables de ejecución de Netlify. No enviar contraseñas al chat ni activar complementos de pago.
2. En [Netlify](https://app.netlify.com/), entrar con GitHub y elegir equipo **Free**. **Add new project → Import an existing project → GitHub**. En la autorización de GitHub, dar acceso solo a `rekepixel/GC-predictor-`, el repositorio existente. Seleccionarlo; no duplicar ni crear otro repositorio. La configuración se lee de `netlify.toml`.
3. Para que el agente despliegue y compruebe el sitio sin pedir operaciones repetidas, hace falta acceso autorizado a la API de Netlify. Si se configura mediante credenciales del entorno, el token se crea en **User settings → Applications → Personal access tokens → New access token**, y se guarda únicamente como secreto del entorno `NETLIFY_AUTH_TOKEN`. No pegarlo al chat ni en GitHub. Un acceso de ChatGPT a GitHub no concede por sí solo acceso a Netlify. Si no se dispone de conexión segura del entorno, el propietario utiliza el panel de Netlify para configurar las variables y publicar; el agente continúa migración y comprobaciones accesibles.
4. Antes de publicar el uso personal, completar la migración privada descrita abajo y comprobar que Netlify dispone de las variables del servidor. En **Project configuration → Environment variables → Add a variable**, ponerlas con contexto **Production** y alcance **Functions** (y Builds si la interfaz lo requiere). Las variables de `netlify.toml` no sustituyen la configuración secreta de Functions. No compartir la base de producción con Deploy Previews de cambios no revisados ni con PR de terceros.
5. En **Domain management → Production domains**, elegir el nombre `gc-predictor` si está libre. El subdominio `.netlify.app` obtiene HTTPS de Netlify; no es necesario comprar un dominio. No se promete disponibilidad de ese nombre ni se publica una URL de ejemplo como si estuviera operativa.

Variables de servidor necesarias:

| Variable                    | Origen                                                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Supabase → proyecto → **Connect → Transaction pooler**. Sustituir el marcador de contraseña y codificar los caracteres especiales; el agente puede hacerlo si la credencial está vinculada de forma segura. Nunca variable NEXT_PUBLIC. |
| `DATABASE_CA_CERT`          | Si el certificado no usa una CA pública reconocida, copiar el certificado de **Database settings → SSL Configuration → Download certificate**; se admite texto PEM con saltos reales o escapados.                                       |
| `SUPABASE_URL`              | URL del proyecto Supabase.                                                                                                                                                                                                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio del proyecto, solo servidor; nunca clave anon para importaciones ni variable NEXT_PUBLIC.                                                                                                                             |
| `SUPABASE_STORAGE_BUCKET`   | `gc-originals`, siempre privado, sin políticas de acceso general.                                                                                                                                                                       |
| `PRIVATE_APP_PASSWORD`      | Contraseña propia de al menos 16 caracteres; se usa en los dos dispositivos.                                                                                                                                                            |
| `SESSION_SECRET`            | Secreto aleatorio estable de al menos 32 caracteres; no debe cambiar en cada despliegue.                                                                                                                                                |
| `GC_REMOTE_ONLY`            | `1`, también en Functions. La detección de Lambda bloquea además el uso accidental de SQLite.                                                                                                                                           |

## Migración privada que ejecuta el agente

El ZIP privado actualizado **está disponible en el entorno de trabajo**, 79.786.198 bytes, SHA-256 `35db0aa4848f4dc20902bb01ffa86a05f904c7aea41cd364759da86df2755f16`. La base de trabajo contiene la misma auditoría completa y 2.100 registros; se ha creado una nueva copia SQLite consistente en `.local/backups/netlify-before`. El ZIP original y el proyecto anterior se conservan.

El operador ejecuta `npm run cloud:preflight` y, solo con credenciales del proyecto privado configuradas, `npm run cloud:import`. No se pide al usuario ejecutar estos comandos. El proceso:

1. Abre la copia en modo lectura y comprueba integridad, referencias, 2.100 registros, 700 ordinarias elegibles y 1.470 entradas de plantilla. Verifica los cinco manifiestos sellados y sus dependencias.
2. Conserva las 71 fuentes, 24 registros de modelo/forma, 1.214 conceptos actuales e históricos, temarios, temas, trabajos, resultados, entradas de respuesta y **15.569 eventos de auditoría**. Los 24 registros de examen no se cuentan como 24 sesiones: siguen siendo 6 sesiones y 7 formas.
3. Mide datos y archivos antes de escribir. Se detiene si se rebasa el margen gratuito reservado, sin contratar capacidad. Nunca usa los 1.470 registros del banco público para fingir que están los 2.100 privados.
4. Sube archivos individualmente, incluidos todos los artefactos privados y los originales subidos. No sube el ZIP como un objeto de 80 MB ni el SQLite de 126 MB: superarían el límite de archivo gratuito. Los registros y auditorías van a PostgreSQL; los archivos pequeños van al bucket. No se copia indiscriminadamente `.local` ni los resultados nominales del Tribunal guardados para investigación.
5. Verifica SHA-256 después de cada subida, rechaza un objeto existente con bytes distintos y conserva las rutas de evidencia. El manifiesto privado de migración queda en Storage. Una interrupción se puede reintentar sin sobreescribir evidencias.
6. En una transacción, exige destino vacío, copia todas las tablas y compara las huellas de cada fila con SQLite. Activa RLS, retira permisos de anon/authenticated y comprueba ausencia de políticas generales de Storage. Si falla, revierte la base y no habilita la aplicación. Los objetos ya subidos siguen siendo privados.
7. Revisa tamaño real PostgreSQL y crea un recibo de importación solo tras verificarlo todo. Si se reintenta la misma importación ya completada, no cambia revisiones ni progreso posteriores. Una importación distinta sobre una base existente exige un procedimiento de actualización explícito.

La nueva auditoría y base personal permanecen fuera del repositorio público y del paquete de funciones. Los archivos anteriores ya públicos no se reclasifican como secretos ni se promete retirarlos de terceros. La exportación JSON del explorador no incluye todas las tablas internas: no sustituye a una copia PostgreSQL completa. Antes de futuras migraciones, el operador mantiene copia externa PostgreSQL y listado/huellas de objetos. El ZIP previo es la copia de la situación anterior al despliegue, no de las respuestas futuras en la nube.

## Publicación y comprobaciones finales

El despliegue se considera terminado únicamente después de verificar, contra el sitio real:

- HTTPS válido, pantalla de acceso y errores 401/403 sin sesión, secreto ausente y origen ajeno.
- 2.100 registros completos, 700 ordinarias cotejadas, 35 reservas separadas y auditoría conservada. Cero ascensos automáticos a respuesta definitiva o revisión humana.
- Dashboard de 700 preguntas, 37 familias interanuales y explorador con fuentes privadas accesibles solo tras entrar.
- Subida y extracción de PDF real, reintento sin duplicaciones y descarga con enlace firmado.
- Dos sesiones/dispositivos con la misma contraseña: marcas, respuestas de práctica, revisiones y resultados persistentes. Conflicto 409 si dos sesiones guardan la misma revisión antigua.
- Reinicio/despliegue nuevo sin regenerar ni perder la base. Manifiesto, iconos, service worker y cachés sin datos privados.
- Cuotas reales del equipo Free y del proyecto Supabase. No se habilitan recargas ni planes de pago.

Las pruebas locales son una evidencia previa, no reemplazan estas comprobaciones contra Netlify y Supabase reales.

## Instalar cuando la URL real esté comprobada

**iPhone:** abrir la URL HTTPS en Safari → iniciar sesión → **Compartir → Añadir a pantalla de inicio → Añadir**. Abrir después GC Predictor desde su icono. Si Safari y la aplicación instalada tienen sesiones separadas, entrar con la misma contraseña: ambos consultan el mismo progreso de PostgreSQL.

**Windows:** abrir la misma URL en Chrome o Edge → menú **Instalar GC Predictor / Instalar esta página como aplicación** (o icono de instalación en la barra de direcciones). Confirmar y abrir desde su icono. No requiere Node, Python, terminal ni tener el ordenador encendido para estudiar desde el iPhone.

La instalación física en Safari/iPhone y la URL pública permanecen pendientes hasta la autorización y el despliegue efectivos.
