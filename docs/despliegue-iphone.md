# Acceso privado desde iPhone: despliegue preparado

No hay un servicio contratado ni una URL de alojamiento activa. El trabajo de esta fase prepara y prueba el contenedor; no autoriza un gasto ni una publicación de datos.

## Recomendación y costes comprobados el 14/10/2026

**Una instancia Node/Docker en Railway Hobby con volumen persistente**. Conserva SQLite y los PDF privados en `/app/.local`, usa la autenticación actual y recibe HTTPS automático en un subdominio del proveedor. Para una aplicación personal evita una migración de base de datos y no exige dominio, Supabase ni una API de IA.

| Opción | Coste de referencia | Encaje y límites |
| --- | --- | --- |
| Railway Hobby + volumen | **5 USD/mes de consumo mínimo**; el total es el mayor de 5 USD y el consumo. Volumen: 0,15 USD/GB/mes, RAM 10 USD/GB/mes y CPU 20 USD/vCPU/mes; tráfico y copias se facturan según uso. | Una cuenta, HTTPS automático, SQLite y ficheros persistentes. Presupuesto inicial orientativo de 5–10 USD/mes para uso personal, **no es precio cerrado ni medido durante un mes**. |
| Render Starter + disco de 1 GB | Web 7 USD/mes + disco 0,25 USD/GB/mes: **7,25 USD/mes**, antes de excesos o impuestos. | Misma arquitectura Docker y una réplica. El disco se monta sólo durante ejecución. |
| Alojamiento Next.js + Supabase Free | Puede tener coste inicial cero dentro de cuotas. Supabase: 500 MB de base y 1 GB de archivos; pausa tras una semana de inactividad. | Requiere mover toda la base, respuestas, auditorías y originales a PostgreSQL/Storage, probar restauración y mantener dos servicios. El adaptador existe, pero esa migración de producción no está certificada en esta entrega. |

Fuentes: [precios de Railway](https://docs.railway.com/pricing), [planes](https://docs.railway.com/pricing/plans), [volúmenes](https://docs.railway.com/volumes/reference), [HTTPS y dominios](https://docs.railway.com/networking/public-networking), [copias de volúmenes](https://docs.railway.com/volumes/backups), [precios de Render](https://render.com/pricing), [discos de Render](https://render.com/docs/disks), [precios de Supabase](https://supabase.com/pricing). Revisar la factura estimada al contratar; importes publicados en USD y sujetos a cambios.

El plan gratuito de Railway aporta crédito limitado; no se considera una garantía de servicio personal permanente. Una función efímera con SQLite en su disco temporal tampoco sirve para esta arquitectura.

## Qué está preparado en el proyecto

- `Dockerfile`: Node 24, compilación Next.js, módulo SQLite nativo y dependencias PDF de Python. Se excluyen `.env`, la base de trabajo y archivos locales de la imagen por defecto.
- `deployment/start.sh`: exige contraseña, secreto y un volumen montado en `/app/.local`; rechaza arrancar sobre disco efímero. Arranca una sola instancia escuchando en el puerto que asigna el proveedor.
- `railway.json`: compilación Docker y una réplica. **El volumen se crea manualmente** antes de arrancar; ese archivo no lo provisiona.
- La cookie de sesión siempre lleva `Secure` en producción, también detrás de un proxy HTTPS, además de `HttpOnly` y `SameSite=Strict`.
- `npm run db:backup`: copia consistente con la API online de SQLite, archivos originales y manifiesto SHA-256. `db:restore` comprueba huellas e integridad y rechaza sobrescribir una base existente.
- `npm run deploy:prepare`: genera una copia privada en `deployment/seed`, excluida de Git. En un volumen nuevo, el contenedor restaura esa copia antes de atender datos. En reinicios o despliegues siguientes **conserva la base del volumen y no vuelve a sustituirla por la semilla**.
- `.railwayignore` permite subir el contexto de despliegue privado excluyendo contraseñas, `.local`, dependencias y cachés.

El contenedor se ha probado con 512 MiB y una CPU, restaurando y conservando los 2.100 registros al recrearlo; una muestra al finalizar el análisis ocupó 128,3 MiB. Esa medición puntual no determina una factura mensual. SQLite requiere una sola instancia que escriba en el volumen. Escalar réplicas requeriría migrar y validar PostgreSQL; no se simula escalabilidad compartiendo un archivo SQLite entre servidores. Los PDF retenidos del proyecto van en la imagen, servidos mediante API autenticada; los PDF que suba el usuario se guardan en el volumen. Las rutas `data/` no se publican como contenido estático.

La contraseña es de propietario único. No hay alta de varios usuarios, recuperación por correo ni MFA de aplicación. No se necesita una cuenta adicional de autenticación para el uso personal previsto.

## Acciones concretas que requieren al propietario

El repositorio GitHub actual es **público**. La nueva evidencia y la base personal están en el ZIP privado, no en la subida de código. El camino más directo es desplegar el contexto completo desde ese ZIP mediante la CLI de Railway, sin hacer públicos los datos ni cambiar de repositorio.

1. Crear una cuenta en [Railway](https://railway.com/) y, **si se acepta el coste**, activar Hobby y facturación. Crear un proyecto con un servicio vacío, elegir región europea y una sola réplica. Todavía no generar dominio.
2. Crear un volumen para ese servicio con ruta de montaje **`/app/.local`**. Configurar capacidad suficiente para base, originales y copias; 1 GB basta para el estado actual, pero se debe vigilar crecimiento. No borrar el volumen en actualizaciones.
3. En Variables, establecer `PRIVATE_APP_PASSWORD` con contraseña propia y `SESSION_SECRET` con al menos 32 caracteres aleatorios. Para generar el secreto una vez: `openssl rand -base64 48`. En Windows también puede generarse con Node: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"`. No enviarlo al chat ni ponerlo en Git. Establecer `SQLITE_PATH=/app/.local/gc-predictor.sqlite`; dejar `DATABASE_URL` y variables Supabase sin configurar para esta opción.
4. Descomprimir el ZIP completo en una carpeta privada. Si ya existe la base personal, `npm ci` y `npm run deploy:prepare` crean una copia consistente de **todos** sus registros y originales. Si se parte de una base vacía sin datos propios, se puede omitir la semilla: el arranque carga el banco incluido en el paquete, pero no recreará resultados personales o borradores ajenos a ese banco.
5. Instalar la CLI oficial: `npm install -g @railway/cli`. Ejecutar `railway login`, después `railway link` y seleccionar **el proyecto y servicio creados**. Revisar que estén presentes ambos manifiestos privados de auditoría y que `deployment/seed/manifest.json` exista si se transfieren datos personales.
6. Sólo tras autorizar el envío de datos al alojamiento privado, ejecutar `railway up --no-gitignore`. La [documentación oficial de ese comando](https://docs.railway.com/cli/up) confirma que respeta `.railwayignore`; `--no-gitignore` permite incluir la evidencia y semilla privadas que deliberadamente se excluyen de Git. No usar `--new`, ni crear un registro Docker público. La imagen y el contexto quedan en el servicio privado del proveedor.
7. Esperar un despliegue correcto. En Settings → Networking → Public Networking → **Generate Domain**, generar HTTPS. La dirección sirve la pantalla de acceso; los datos requieren contraseña. La CLI no genera una URL pública por sí sola.
8. Entrar con la contraseña y comprobar: 700 ordinarias, 6 sesiones, 652 conceptos/focos con el paquete de auditoría, reservas separadas y registros personales conservados. Corregir una anotación de prueba, reiniciar y comprobar que continúa. Activar copias del volumen y mantener también una copia descargada fuera del proveedor.

Si se prefiere desplegar directamente desde GitHub, primero debe hacerse privado el **repositorio existente** y autorizar expresamente la incorporación de los nuevos datos; después se concede a la GitHub App del proveedor acceso sólo a `rekepixel/GC-predictor-`. La conexión de ChatGPT a GitHub no concede automáticamente permisos a Railway o Render. El flujo de CLI anterior no necesita esa aplicación de GitHub.

La restauración inicial ya está implementada; no se pide arrancar una aplicación sólo con 1.470 registros y asumir que conserva automáticamente los otros 630 borradores o resultados personales. Las copias contienen también `answer_entries` y `audit_events`; la exportación JSON del explorador, por sí sola, no sustituye a una copia completa.

## Desde el iPhone

Cuando exista la URL HTTPS: abrirla en Safari, iniciar sesión y usar **Compartir → Añadir a pantalla de inicio**. Conservar el volumen permite cerrar Safari, reiniciar el teléfono o actualizar el servidor sin perder revisiones. La PWA no guarda exámenes, respuestas ni páginas privadas para uso sin conexión; necesita acceso a Internet.

Se comprueba diseño de 390 px con navegador automatizado y producción detrás de un proxy HTTPS local. La prueba física de Safari/iPhone y la emisión de un certificado público por el proveedor quedan pendientes del despliegue autorizado. La dirección `127.0.0.1` de desarrollo pertenece al equipo donde se arranca y no es una URL accesible desde otro dispositivo.

## Copias y recuperación

En ejecución, crear copias consistentes mediante `node scripts/backup.mjs /app/.local/backups/FECHA`. Descargar una copia y mantenerla fuera del alojamiento. Las copias del volumen ayudan a recuperar fallos del proveedor, pero no reemplazan esa copia externa.

Para restaurar, detener el servicio y utilizar un volumen nuevo/vacío, conservar el anterior y ejecutar `SQLITE_PATH=/app/.local/gc-predictor.sqlite node scripts/restore.mjs DIRECTORIO_COPIA`. El script no sobreescribe una base existente ni un original diferente. Mantener también el paquete del proyecto con sus documentos retenidos; las copias SQLite y originales subidos no reemplazan esos PDF de referencia.
