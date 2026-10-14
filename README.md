# GC Predictor

Aplicación personal para analizar exámenes oficiales de acceso a la Escala de Cabos y Guardias y orientar el estudio de 2027. **La fiabilidad del corpus precede al ranking.** Una puntuación de prioridad no es una probabilidad de examen.

Implementación funcional con Next.js 16, App Router, TypeScript, Tailwind 4, SQLite/PostgreSQL y extracción local de PDF en JavaScript o Python. No necesita una API de IA ni servicios de pago para ejecutarse localmente.

## Estado real tras el cotejo de 2026

Consulta del **14/10/2026**. Se ha continuado el proyecto y la base existentes, sin eliminar archivos ni preguntas. Informe reproducible: [validación de 2026](docs/validation-2026.md), [fuentes](docs/research.md) y [catálogo](data/source-catalog.json).

| Elemento                          | Resultado comprobado                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sesión cotejada                   | 11/07/2026, modelos oficiales A y B, misma convocatoria                                                                      |
| Registros literales cotejados     | **210**: 105 por modelo; dos extracciones independientes concordantes                                                        |
| Preguntas únicas                  | **105**: 100 ordinarias y 5 de reserva, con equivalencia A/B biyectiva                                                       |
| Base del dashboard                | **100 ordinarias cotejadas documentalmente**, sin duplicar modelos ni incluir reservas                                       |
| Validación con firmeza definitiva | **0**: la fuente confirma PDF nº 2 corregido, pero no acredita expresamente firmeza final ni relación final de anulaciones   |
| Corrección oficial                | A7 / B88: **C → A**, contrastando PDF nº 1 y nº 2                                                                            |
| Clasificación                     | 105 temas/conceptos revisados; 100 ordinarias repartidas entre los 23 temas                                                  |
| Referencias normativas            | 76 localizaciones BOE comprobadas, incluidas reservas y disposiciones; **68 fichas de artículos numéricos ordinarios**       |
| Años 2025 / 2024 / 2023           | 0 preguntas cotejadas; 3 / 8 / 0 copias secundarias pendientes; fuentes primarias anteriores consultadas no accesibles       |
| Archivo conservado                | 840 registros existentes: 210 cotejados de 2026 y 630 borradores de 2022; 2020 sin transcripción                             |
| Documentos                        | 57 fuentes catalogadas; 23 PDF de procedencia oficial en `data/raw` y 11 copias secundarias sin autenticar en `data/pending` |
| Prioridad y predicción            | Orden descriptivo con fuentes; puntuación heurística suspendida con un solo año; probabilidades siempre `null`               |

**Cotejo documental no significa plantilla administrativamente definitiva.** Las preguntas siguen en estado `reviewed`, con un certificado documental independiente ligado al texto, opciones, respuesta, equivalencia y huellas de los originales. El dashboard describe el contenido publicado y muestra esta limitación. Simulacros y evaluación retrospectiva mantienen el requisito de clave definitiva; actualmente no tienen preguntas habilitadas.

Frecuencias reales de 2026: Derechos Humanos 12/100; Procesal Penal 9/100; Fuerzas y Cuerpos de Seguridad/Guardia Civil 9/100; Constitucional 7/100. Son proporciones del examen disponible, **no probabilidades de 2027**. Cada concepto curado aparece una vez en esta única sesión; no hay evidencia todavía de persistencia entre años.

Las 840 filas no representan preguntas independientes: incluyen modelos y reservas. Se conservan las repeticiones legítimas entre años. No hay datos de demostración en la aplicación. Las copias secundarias no se importan automáticamente ni alimentan análisis.

## Estado de entrega y permisos de GitHub

El proyecto está guardado en este espacio de trabajo y en un paquete ZIP. La conexión actual a GitHub permite consultar el repositorio público, pero **rechaza la escritura con HTTP 403: Resource not accessible by integration**. El primer `git push` y la escritura mediante la conexión nativa fallaron; no se ha subido el código al remoto.

Diagnóstico e instrucciones exactas en [Acceso a GitHub](docs/github-access.md). La conexión de Codex necesita acceso al repositorio y permiso Contents de escritura; hacerlo público no concede ese permiso. Si utilizas el ZIP, descomprímelo, entra en su carpeta `gc-predictor` y comienza las instrucciones por `npm ci`, omitiendo las dos líneas de clonación. El paquete no incluye contraseñas, dependencias instaladas ni bases de datos personales; el arranque carga automáticamente el banco documental de 2026; `data:archive` reconstruye además los borradores antiguos.

## Inicio local

Requisitos: **Node.js 24** y npm. SQLite no necesita un servicio externo. Si el remoto continúa vacío por el 403, usa el ZIP de esta entrega y entra en su carpeta `gc-predictor`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abre **http://127.0.0.1:3000**. La primera petición crea la base y carga las 210 ocurrencias cotejadas de 2026 desde la evidencia sellada incluida. **No requiere Python** para consultar el dashboard y el explorador. En una base existente conserva sus identificadores y aplica únicamente las comprobaciones nuevas, con auditoría. No sustituye revisiones manuales ya registradas.

Para reconstruir también el archivo antiguo, instala Python 3.11 o superior:

```bash
python -m venv .venv
.venv/bin/python -m pip install -r python/requirements.txt
PYTHON_BIN=.venv/bin/python npm run data:archive
```

`data:archive` es idempotente, importa sólo fuentes catalogadas como oficiales y nunca valida los borradores. En Windows usa `.venv\Scripts\python.exe` y configura `PYTHON_BIN` en tu terminal.

Para repetir el cotejo de los PDF retenidos:

```bash
.venv/bin/python python/verify_2026.py
# Opcional: renovar la comprobación normativa contra BOE; necesita red.
.venv/bin/python python/curate_2026.py
npx tsx scripts/seal-bank.ts
npm run data:apply-verified
```

El primer script compara pypdf y pdfplumber, comprueba sección, opciones, reservas, equivalencias y cambios de clave. El segundo utiliza el TSV de propuestas curadas y sólo publica artículos cuyo bloque y fragmento se localizan en una versión BOE publicada y vigente antes del examen. No convierte propuestas sin verificar en referencias ciertas. El sellado actualiza SHA-256 de las evidencias; revísalas antes de aplicarlas. Los fallos interrumpen el proceso. `npm run data:verify:2026` abrevia extracción, sellado y aplicación usando `python` del PATH; no renueva las referencias BOE.

La base local se guarda en `.local/gc-predictor.sqlite`, fuera de Git. Los PDF subidos se guardan en `.local/originals`, salvo que configures Supabase Storage. Los PDF oficiales recopilados en `data/raw` forman parte del repositorio. Los comandos CLI leen `.env.local` y `.env`; las variables ya exportadas en la terminal tienen prioridad.

En desarrollo, el acceso sin contraseña se limita a un servidor enlazado a loopback y un host `localhost`/`127.0.0.1`. Para exigir contraseña también en desarrollo, configura `PRIVATE_APP_PASSWORD`. No expongas `next dev` a Internet.

## Qué se puede usar

- **Dashboard**: documentos y registros importados, años, estado de cobertura y, distribución de las 100 preguntas ordinarias cotejadas y gráficos interactivos; separa cotejo documental de firmeza final.
- **Explorador**: preguntas reales en borrador/revisadas/validadas, filtradas por año, sesión, modelo, tema, norma, artículo, concepto y texto. Conserva el enunciado y el orden literal de las opciones de cada modelo. Por defecto muestra ordinarias cotejadas y una sola variante por pregunta. La pestaña «Fichas de artículos» ofrece 68 referencias, historial, páginas A/B y versión normativa.
- **Administración**: subida y conservación de PDF, extracción revisable, importación de JSON, asociación de plantillas, cotejo de preguntas, fuentes, versiones del programa y cambios normativos. Auditoría de cambios y exportación JSON.
- **Análisis**: frecuencia de temas, normas, artículos y conceptos; repeticiones literales y conceptuales; sugerencias léxicas TF-IDF/coseno; periodos sin reaparición; estilos y distractores anotados.
- **Prioridades**: orden explicable por concepto o artículo, pesos configurables y referencias documentales. Con un único año sólo se muestran apariciones; los puntos heurísticos se habilitan con al menos dos años, sin promesa de fiabilidad predictiva. Se informa de cobertura, fechas desconocidas, vigencia y muestra pequeña.
- **Retrospectiva**: cortes 2024, 2025 y 2026, entrenamiento estrictamente anterior y comparativas por frecuencia y azar reproducible. Con el corpus inicial informa «sin evidencia suficiente».
- **Simulacros**: selección de preguntas oficiales activas validadas, filtro temático o top 10 conceptual, corrección en servidor y resultados persistidos por tema. Con cero preguntas validadas, crear tests permanece deshabilitado. No se generan preguntas nuevas mediante IA.
- **PWA**: manifiesto, iconos y modo standalone. El service worker conserva sólo iconos/manifiesto, nunca exámenes, respuestas, sesiones o páginas privadas. No funciona como archivo de exámenes sin conexión.

## Flujo de importación y validación

1. **Localiza el original**, su modelo, convocatoria y la plantilla de respuestas. Guarda la URL y las fechas verificadas. No sustituyas una fecha desconocida por el año de convocatoria, la fecha del examen ni la fecha de descarga.
2. En **Administración → Importar documentos**, identifica año, sesión y modelo. Sube el PDF de cuadernillo; pulsa «Extraer borrador».
3. Contrasta la sección de conocimientos. El extractor genérico puede mezclar numeraciones de ortografía/idioma o cabeceras; no lo consideres una transcripción validada. Corrige el JSON y deja sólo la prueba/modelo correspondientes. Los PDF escaneados necesitan OCR local.
4. Guarda el cuadernillo. En «Plantilla de respuestas», selecciona exactamente ese examen/modelo. Revisa el JSON de respuestas: `0=A`, `1=B`, `2=C`, `3=D`; una anulación lleva `correct:null, cancelled:true`. Importar un PDF completo de plantillas puede mezclar tablas: selecciona y coteja la tabla correcta.
5. En **Fuentes y plantillas**, acredita si la plantilla es **definitiva**, con acuerdo oficial, fecha y URL en las notas. Una plantilla «corregida», una lista de aprobados o unos resultados «definitivos» no prueban por sí mismos que esa clave sea definitiva. El PDF nº 2 de 2026 se mantiene sin esa marca. El PDF nº 1 está identificado como sustituido y se rechaza si se intenta volver a asociar, incluso con otro identificador.
6. En **Revisar preguntas**, coteja el enunciado literal y las cuatro opciones con el original; comprueba la respuesta, anotaciones y activación de reservas. Puedes marcar «revisada» antes de disponer de una clave definitiva. Para «validada», el servidor exige examen oficial verificado, clave oficial definitiva verificada y coincidencia con la respuesta de la plantilla del modelo.
7. Asigna **tema** y **concepto** por separado. El concepto representa la materia examinada, aunque la redacción cambie. Las propuestas de reglas guardan un valor de confianza **orientativo, no calibrado**, método y estado de revisión. Sólo las clasificaciones revisadas alimentan las frecuencias temáticas/conceptuales.
8. Verifica norma, artículo y apartado con una fuente institucional. No se infiere un artículo de cualquier número del enunciado. Sólo las referencias marcadas como cotejadas entran en el ranking de artículos. Registra vigencia y posibles cambios.

Reemplazar una plantilla o modificar la evidencia de una fuente retira la validación anterior de sus preguntas. Una anulación queda archivada y se excluye del corpus. Las reservas permanecen inactivas salvo activación explícita contrastada con el acuerdo del tribunal. Toda revisión queda registrada en `audit_events`.

**Numeración de reservas:** algunos cuadernillos antiguos imprimen 1–5 en un bloque separado. El extractor del archivo usa 101–105 como identificadores internos, conserva `printedNumber`, `reserve` y la página. Debes mapear del mismo modo su plantilla antes de importar. Los modelos A/B no comparten automáticamente una respuesta por letra: se conserva el orden de opciones de cada uno.

### Extracción Python y JSON

```bash
.venv/bin/python python/extract.py data/raw/2026-exam-A.pdf --out .local/draft-A.json
```

El resultado contiene `questions`, páginas y advertencias. No se hacen llamadas a IA. No se ejecuta OCR automático para evitar incorporar texto dudoso sin cotejo. Puedes usar una herramienta OCR local de tu elección sobre una **copia** del PDF, conservar el original y trasladar el resultado al editor JSON. Anota herramienta, idioma y errores; no subas documentos personales a servicios externos.

`npm run data:import -- archivo-bundle.json` importa un paquete con estructura:

```json
{
  "source": {
    "title": "TÍTULO REAL DEL ORIGINAL",
    "url": "https://web.guardiacivil.es/URL_REAL",
    "year": 2026,
    "session": "IDENTIFICADOR REAL DE SESIÓN",
    "model": "A",
    "kind": "exam",
    "origin": "official",
    "publishedAt": null,
    "verified": false,
    "definitive": false,
    "notes": "Pendiente de cotejo"
  },
  "exam": {
    "year": 2026,
    "session": "IDENTIFICADOR REAL DE SESIÓN",
    "model": "A",
    "heldAt": null,
    "expectedQuestions": 100
  },
  "questions": []
}
```

Es una **plantilla de formato, no un examen ni un documento real**. Sustituye metadatos y agrega exclusivamente preguntas literales verificables. Cada pregunta requiere `number`, `stem`, `options` (4), y admite `sourcePage`, `printedNumber` y `reserve`. La propiedad opcional `answerKey` contiene otra `source` de tipo `answer_key` y `entries:[{number,correct,cancelled}]`. Importar nunca activa la validación.

## Método estadístico

Detalle en [docs/methodology.md](docs/methodology.md).

- **Observación descriptiva**: pregunta ordinaria oficial activa con cotejo documental sellado o validación contra clave definitiva. **Corpus estricto**: únicamente el segundo supuesto, reservado a simulacros y retrospectiva. Las variantes equivalentes de una sesión/año se cuentan una vez. Se conservan literalmente las ocurrencias A/B y su correspondencia de opciones; los conflictos de respuesta entre variantes excluyen el grupo.
- **Frecuencia observada**: recuentos y proporciones sobre el corpus disponible. Para el ranking se calcula la **media de proporciones por sesión**, de modo que un examen con más preguntas disponibles no domine automáticamente.
- **Puntuación heurística**: combinación de frecuencia histórica (0,30), recencia desde 2023 (0,30), persistencia (0,20), temario verificado para la fecha (0,15) y cambios legales documentados (0,05). Los pesos se normalizan. Frecuencia y recencia se escalan respecto al máximo del corpus. Con al menos dos años cubiertos produce una prioridad relativa de estudio de 0 a 100, **sin símbolo de porcentaje**. Con el único año actual devuelve `score:null` y muestra el recuento.
- **Probabilidad**: siempre `null`. No hay modelo probabilístico entrenado, calibrado ni validado. Superar una referencia retrospectiva no basta para afirmar una probabilidad.
- **Retrospectiva**: antes de cada año objetivo sólo se usan años anteriores con fecha de disponibilidad anterior al examen. La disponibilidad es la más tardía entre publicación del examen y de su clave. Las fechas desconocidas se excluyen. El universo de conceptos lo define sólo el entrenamiento. Las anotaciones conceptuales retrospectivas se declaran como una limitación, no como conocimiento histórico reconstruido.
- **Referencias**: frecuencia histórica normalizada y selección aleatoria del mismo universo y tamaño. Semilla 2027, 200 repeticiones; se muestra una realización y la media de cobertura aleatoria.
- **Métricas**: precisión de conceptos top-k, cobertura de conceptos únicos, cobertura de preguntas clasificadas, resultados por tema e intervalo Wilson orientativo. Las dependencias entre preguntas y las muestras pequeñas limitan la interpretación.

No se interpretan años sin documentos como años donde un concepto no apareció. El temario 2026 no se atribuye retroactivamente a convocatorias anteriores. Una fecha curricular desconocida no genera el componente de relevancia temporal.

## Persistencia y arquitectura

Ver [docs/architecture.md](docs/architecture.md).

SQLite es el valor predeterminado; `DATABASE_URL` activa PostgreSQL. El esquema inicial está en `migrations/001_initial.sql`. Hay claves foráneas e índices; el contenido versionable de cada entidad se almacena como JSON validado por Zod en `payload`. Esto mantiene los originales, permite auditoría completa y evita una migración de columnas por cada nueva anotación. Las analíticas están en funciones puras TypeScript, independientes de la UI y del motor de persistencia.

Las transacciones SQLite se serializan; PostgreSQL usa conexiones transaccionales del pool. El modo PostgreSQL activa **Row Level Security sin políticas públicas** en todas las tablas de la aplicación, incluidas plantillas y auditoría. Se espera una conexión de servidor propietaria/BYPASSRLS; no uses roles de cliente `anon`/`authenticated`. No hay consultas SQL construidas con nombres de tabla introducidos por el usuario.

La reconstrucción del archivo y el cotejo dual de PDF requieren Python; la web y el banco sellado no: su extractor PDF usa `pdfjs-dist` en el servidor. La similitud básica funciona localmente mediante TF-IDF y coseno, sin API de IA ni embeddings de pago.

## Producción privada con PostgreSQL/Supabase

1. Crea un proyecto PostgreSQL/Supabase y un bucket de Storage **privado** llamado `gc-originals`.
2. Configura en el servidor (nunca en el cliente ni en el repositorio):
   - `DATABASE_URL`: conexión PostgreSQL del servidor con SSL, normalmente con `sslmode=require`. Usa el endpoint/pool apropiado al proveedor y una cuenta propietaria de las tablas.
   - `PRIVATE_APP_PASSWORD`: contraseña robusta de tu espacio personal.
   - `SESSION_SECRET`: secreto aleatorio de **al menos 32 caracteres**. Por ejemplo, `openssl rand -base64 48` y copia el resultado directamente a la configuración de secretos del hosting.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`: para conservar originales en el bucket privado. La clave de servicio queda sólo en el servidor.
3. Ejecuta `npm ci`, `npm run db:migrate`, `npm run build` y `npm start`. Publica detrás de HTTPS usando un hosting compatible con **Node.js y módulos nativos**, con estos valores de entorno. El servidor se enlaza a loopback por defecto; configura un proxy HTTPS del mismo host.
4. Ejecuta `PYTHON_BIN=... npm run data:archive` contra esa misma base si quieres cargar el archivo oficial inicial. Una base de producción y tu SQLite local son independientes.
5. Verifica que `/api/bootstrap` rechace sesiones anónimas. El modo producción falla cerrado si faltan contraseña o secreto. Las cookies son HttpOnly/SameSite Strict; las escrituras verifican el origen. `IMPORT_API_TOKEN` es opcional para CLI/automatizaciones y sólo se admite si la autenticación de producción está configurada.

Para ver producción localmente: configura contraseña y secreto en `.env.local`, ejecuta `npm run build && npm start`, abre la web e inicia sesión. No necesitas Supabase si usas un servidor con volumen persistente SQLite y `.local/originals`.

### Docker opcional

```bash
docker build -t gc-predictor .
docker volume create gc-predictor-data
docker run --rm -p 127.0.0.1:3000:3000 --env-file .env.local \
  -v gc-predictor-data:/app/.local gc-predictor
```

Configura primero `PRIVATE_APP_PASSWORD` y `SESSION_SECRET`; producción permanece bloqueada sin ellos. Mantén el contenedor detrás de HTTPS para uso remoto. El Dockerfile se aporta como alternativa; no se ha publicado una imagen ni contratado un hosting. El proyecto usa APIs de Node y SQLite nativo: **no es un sitio estático ni un Worker de Cloudflare**. No se ha desplegado en Sites por esa incompatibilidad de runtime; la entrega verificable es el código local y el paquete descargable; la subida a GitHub sigue pendiente del permiso de escritura. No hay una URL alojada todavía.

### iPhone

Accede a tu despliegue HTTPS desde Safari, abre Compartir y elige **Añadir a pantalla de inicio**. El manifiesto y los iconos están incluidos. `127.0.0.1` en el iPhone apunta al teléfono, no al ordenador: usa un dominio HTTPS de tu servidor para acceder desde el móvil. La instalación real en iOS requiere comprobarla en tu dispositivo; las pruebas automáticas cubren un viewport móvil, no Safari físico.

## Pruebas

```bash
npm run data:verify
npm test
npm run typecheck
npm run build
```

Las pruebas usan bases temporales: fixtures sintéticos identificados y una integración independiente con las evidencias de los PDF auténticos de 2026. Cubren equivalencias A/B y orden de opciones, preservación de repeticiones entre años, signos matemáticos, conflictos de claves, borradores/anulaciones, normalización por sesión, corte temporal, exclusión de fechas desconocidas, universo de conceptos sin futuro, referencias reproducibles, importación atómica, claves foráneas, revisión y auditoría, sustitución/anulación de plantillas y firmas de sesión.

GitHub Actions ejecuta comprobación de tipos, pruebas y build. Las credenciales de Supabase no vienen configuradas; el adaptador PostgreSQL y el bucket necesitan una prueba de integración en tu entorno antes de usarlo como almacenamiento de producción. El Dockerfile y Safari iOS tampoco se certifican por la compilación de Next.js.

## Límites y siguiente paso

El corpus permite describir una única sesión de 2026. Falta acreditar la firmeza final de su clave, las anulaciones y la autenticidad de los documentos pendientes de 2023–2025. No permite comparar tendencias históricas ni acreditar rendimiento predictivo. Las referencias legales se han cotejado para el 11/07/2026, no se certifica automáticamente su vigencia para 2027. Nueve propuestas de apartado permanecen sin confirmar; las referencias internacionales y otras pendientes no reciben artículos supuestos.

No hay calibración probabilística, OCR automático, embeddings semánticos, sistema multiusuario ni explicaciones jurídicas generadas. La similitud es léxica y tiene un límite interactivo de 1.000 preguntas.

El siguiente paso es obtener un acuerdo oficial que acredite la plantilla final/anulaciones de 2026 y autenticar las copias de 2025. Tras ese control, repetir el protocolo por sesión en 2024 y 2023, unificar conceptos entre años y ejecutar la retrospectiva sin información futura. Informe y límites: [validación 2026](docs/validation-2026.md).
