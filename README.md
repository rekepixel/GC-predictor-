# GC Predictor

Aplicación personal para analizar exámenes oficiales de acceso a la Escala de Cabos y Guardias y orientar el estudio de 2027. **La fiabilidad del corpus precede al ranking.** Una puntuación de prioridad no es una probabilidad de examen.

Implementación funcional con Next.js 16, App Router, TypeScript, Tailwind 4, SQLite/PostgreSQL y extracción local de PDF en JavaScript o Python. No necesita una API de IA ni servicios de pago para ejecutarse localmente.

## Estado real de la primera entrega

Investigación realizada el **14/10/2026**. Consulta [el informe de fuentes](docs/research.md) y [el catálogo verificable](data/source-catalog.json).

| Elemento                         | Estado                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Fuentes catalogadas              | 45 registros, con URL y fecha de consulta                                                                      |
| Originales oficiales descargados | 22 PDF en `data/raw`, con SHA-256                                                                              |
| Cuadernillos registrados         | 12 modelos de 2020, 2022 y 2026; máximo 6 sesiones candidatas                                                  |
| Extracción inicial               | 840 registros de pregunta: 8 modelos digitales × 105 preguntas, incluidas reservas                             |
| Cuadernillos 2020                | Escaneados; registrados, sin preguntas extraídas. Necesitan OCR/transcripción                                  |
| Corpus estadístico validado      | **0 preguntas; 0 exámenes validados**                                                                          |
| Plantilla 2026                   | Oficial corregida nº 2; respuesta extraída para A/B y reservas; carácter definitivo no acreditado expresamente |
| Temario de referencia            | 25 títulos oficiales; 23 de conocimientos + inglés y lengua española                                           |
| Temario 2027                     | Pendiente de publicación/verificación; no inventado                                                            |
| Probabilidades calibradas        | No implementadas ni publicadas: faltan corpus y validación suficientes                                         |

Los 840 registros **no son 840 preguntas independientes**: incluyen variantes A/B y reservas. La deduplicación literal conservadora encuentra inicialmente 651 grupos provisionales; discrepancias de extracción y variantes restantes necesitan revisión. **No utilizar ese número como tamaño de muestra estadística.** Las preguntas que se repiten en otros años se conservan como observaciones distintas. No hay datos de demostración en la aplicación; los datos sintéticos sólo existen en `tests/`.

Los originales de 2022 y 2026 tienen extracción en borrador. Los registros 2020 conservan la procedencia y el error de extracción. Los PDF 2022 de respuestas son principalmente escaneados: no se les asignan respuestas inventadas. Las rutas oficiales 2023–2025 consultadas devolvieron 404; 2017–2019 siguen sin cuadernillos originales oficiales verificados. 2021 sólo tiene plantilla localizada. Esto no demuestra que los documentos no existan en otro archivo.

## Inicio local

Requisitos: **Node.js 24**, npm y, para la importación inicial del archivo, Python 3.11 o superior. SQLite no requiere servicio externo.

```bash
git clone https://github.com/rekepixel/GC-predictor-.git
cd GC-predictor-
npm ci
cp .env.example .env.local
npm run db:migrate
python -m venv .venv
.venv/bin/python -m pip install -r python/requirements.txt
PYTHON_BIN=.venv/bin/python npm run data:archive
npm run dev
```

Abre **http://127.0.0.1:3000**. En Windows usa `.venv\Scripts\python.exe` y configura `PYTHON_BIN` en tu terminal. También puedes instalar pypdf en tu Python habitual y ejecutar directamente `npm run data:archive`.

`data:archive` es idempotente: no vuelve a importar modelos ya registrados. Inicializa el catálogo y el temario, extrae exclusivamente conocimientos generales, conserva reservas como inactivas y registra advertencias. Nunca valida preguntas. Para comenzar sin datos de preguntas, omite ese comando; el catálogo de fuentes sigue disponible.

La base local se guarda en `.local/gc-predictor.sqlite`, fuera de Git. Los PDF subidos se guardan en `.local/originals`, salvo que configures Supabase Storage. Los PDF oficiales recopilados en `data/raw` forman parte del repositorio. Los comandos CLI leen `.env.local` y `.env`; las variables ya exportadas en la terminal tienen prioridad.

En desarrollo, el acceso sin contraseña se limita a un servidor enlazado a loopback y un host `localhost`/`127.0.0.1`. Para exigir contraseña también en desarrollo, configura `PRIVATE_APP_PASSWORD`. No expongas `next dev` a Internet.

## Qué se puede usar

- **Dashboard**: documentos y registros importados, años, estado de cobertura y, cuando haya corpus validado, distribución y gráficos interactivos.
- **Explorador**: preguntas reales en borrador/revisadas/validadas, filtradas por año, sesión, modelo, tema, norma, artículo, concepto y texto. Conserva el enunciado y el orden literal de las opciones de cada modelo.
- **Administración**: subida y conservación de PDF, extracción revisable, importación de JSON, asociación de plantillas, cotejo de preguntas, fuentes, versiones del programa y cambios normativos. Auditoría de cambios y exportación JSON.
- **Análisis**: frecuencia de temas, normas, artículos y conceptos; repeticiones literales y conceptuales; sugerencias léxicas TF-IDF/coseno; periodos sin reaparición; estilos y distractores anotados.
- **Prioridades**: ranking explicable por concepto o artículo, pesos configurables y referencias documentales. Se informa de cobertura, fechas desconocidas, vigencia y muestra pequeña.
- **Retrospectiva**: cortes 2024, 2025 y 2026, entrenamiento estrictamente anterior y comparativas por frecuencia y azar reproducible. Con el corpus inicial informa «sin evidencia suficiente».
- **Simulacros**: selección de preguntas oficiales activas validadas, filtro temático o top 10 conceptual, corrección en servidor y resultados persistidos por tema. Con cero preguntas validadas, crear tests permanece deshabilitado. No se generan preguntas nuevas mediante IA.
- **PWA**: manifiesto, iconos y modo standalone. El service worker conserva sólo iconos/manifiesto, nunca exámenes, respuestas, sesiones o páginas privadas. No funciona como archivo de exámenes sin conexión.

## Flujo de importación y validación

1. **Localiza el original**, su modelo, convocatoria y la plantilla de respuestas. Guarda la URL y las fechas verificadas. No sustituyas una fecha desconocida por el año de convocatoria, la fecha del examen ni la fecha de descarga.
2. En **Administración → Importar documentos**, identifica año, sesión y modelo. Sube el PDF de cuadernillo; pulsa «Extraer borrador».
3. Contrasta la sección de conocimientos. El extractor genérico puede mezclar numeraciones de ortografía/idioma o cabeceras; no lo consideres una transcripción validada. Corrige el JSON y deja sólo la prueba/modelo correspondientes. Los PDF escaneados necesitan OCR local.
4. Guarda el cuadernillo. En «Plantilla de respuestas», selecciona exactamente ese examen/modelo. Revisa el JSON de respuestas: `0=A`, `1=B`, `2=C`, `3=D`; una anulación lleva `correct:null, cancelled:true`. Importar un PDF completo de plantillas puede mezclar tablas: selecciona y coteja la tabla correcta.
5. En **Fuentes y plantillas**, acredita si la plantilla es **definitiva**, con acuerdo oficial, fecha y URL en las notas. Una plantilla «corregida», una lista de aprobados o unos resultados «definitivos» no prueban por sí mismos que esa clave sea definitiva. Las fuentes iniciales se mantienen sin esa marca.
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

- **Observación**: pregunta oficial activa, validada contra una plantilla definitiva. Las variantes equivalentes de una sesión/año se cuentan una vez. Se conservan literalmente las ocurrencias A/B y su correspondencia de opciones; los conflictos de respuesta entre variantes excluyen el grupo.
- **Frecuencia observada**: recuentos y proporciones sobre el corpus disponible. Para el ranking se calcula la **media de proporciones por sesión**, de modo que un examen con más preguntas disponibles no domine automáticamente.
- **Puntuación heurística**: combinación de frecuencia histórica (0,30), recencia desde 2023 (0,30), persistencia (0,20), temario verificado para la fecha (0,15) y cambios legales documentados (0,05). Los pesos se normalizan. Frecuencia y recencia se escalan respecto al máximo del corpus. Es una prioridad relativa de estudio de 0 a 100, **sin símbolo de porcentaje**.
- **Probabilidad**: siempre `null`. No hay modelo probabilístico entrenado, calibrado ni validado. Superar una referencia retrospectiva no basta para afirmar una probabilidad.
- **Retrospectiva**: antes de cada año objetivo sólo se usan años anteriores con fecha de disponibilidad anterior al examen. La disponibilidad es la más tardía entre publicación del examen y de su clave. Las fechas desconocidas se excluyen. El universo de conceptos lo define sólo el entrenamiento. Las anotaciones conceptuales retrospectivas se declaran como una limitación, no como conocimiento histórico reconstruido.
- **Referencias**: frecuencia histórica normalizada y selección aleatoria del mismo universo y tamaño. Semilla 2027, 200 repeticiones; se muestra una realización y la media de cobertura aleatoria.
- **Métricas**: precisión de conceptos top-k, cobertura de conceptos únicos, cobertura de preguntas clasificadas, resultados por tema e intervalo Wilson orientativo. Las dependencias entre preguntas y las muestras pequeñas limitan la interpretación.

No se interpretan años sin documentos como años donde un concepto no apareció. El temario 2026 no se atribuye retroactivamente a convocatorias anteriores. Una fecha curricular desconocida no genera el componente de relevancia temporal.

## Persistencia y arquitectura

Ver [docs/architecture.md](docs/architecture.md).

SQLite es el valor predeterminado; `DATABASE_URL` activa PostgreSQL. El esquema inicial está en `migrations/001_initial.sql`. Hay claves foráneas e índices; el contenido versionable de cada entidad se almacena como JSON validado por Zod en `payload`. Esto mantiene los originales, permite auditoría completa y evita una migración de columnas por cada nueva anotación. Las analíticas están en funciones puras TypeScript, independientes de la UI y del motor de persistencia.

Las transacciones SQLite se serializan; PostgreSQL usa conexiones transaccionales del pool. El modo PostgreSQL activa **Row Level Security sin políticas públicas** en todas las tablas de la aplicación, incluidas plantillas y auditoría. Se espera una conexión de servidor propietaria/BYPASSRLS; no uses roles de cliente `anon`/`authenticated`. No hay consultas SQL construidas con nombres de tabla introducidos por el usuario.

Los scripts de importación requieren Python; la web no: su extractor PDF usa `pdfjs-dist` en el servidor. La similitud básica funciona localmente mediante TF-IDF y coseno, sin API de IA ni embeddings de pago.

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

Configura primero `PRIVATE_APP_PASSWORD` y `SESSION_SECRET`; producción permanece bloqueada sin ellos. Mantén el contenedor detrás de HTTPS para uso remoto. El Dockerfile se aporta como alternativa; no se ha publicado una imagen ni contratado un hosting. El proyecto usa APIs de Node y SQLite nativo: **no es un sitio estático ni un Worker de Cloudflare**. No se ha desplegado en Sites por esa incompatibilidad de runtime; la entrega verificable es el código ejecutable en GitHub. No hay una URL alojada todavía.

### iPhone

Accede a tu despliegue HTTPS desde Safari, abre Compartir y elige **Añadir a pantalla de inicio**. El manifiesto y los iconos están incluidos. `127.0.0.1` en el iPhone apunta al teléfono, no al ordenador: usa un dominio HTTPS de tu servidor para acceder desde el móvil. La instalación real en iOS requiere comprobarla en tu dispositivo; las pruebas automáticas cubren un viewport móvil, no Safari físico.

## Pruebas

```bash
npm run data:verify
npm test
npm run typecheck
npm run build
```

Las pruebas usan fixtures sintéticos explícitamente identificados en bases temporales separadas. Cubren equivalencias A/B y orden de opciones, preservación de repeticiones entre años, signos matemáticos, conflictos de claves, borradores/anulaciones, normalización por sesión, corte temporal, exclusión de fechas desconocidas, universo de conceptos sin futuro, referencias reproducibles, importación atómica, claves foráneas, revisión y auditoría, sustitución/anulación de plantillas y firmas de sesión.

GitHub Actions ejecuta comprobación de tipos, pruebas y build. Las credenciales de Supabase no vienen configuradas; el adaptador PostgreSQL y el bucket necesitan una prueba de integración en tu entorno antes de usarlo como almacenamiento de producción. El Dockerfile y Safari iOS tampoco se certifican por la compilación de Next.js.

## Límites y siguiente paso

El software implementa el flujo, pero **el corpus todavía no permite extraer conclusiones estadísticas reales**. No se han cotejado 840 preguntas a mano ni se ha acreditado una clave definitiva por el mero paso del tiempo. No hay calibración probabilística, OCR automático, embeddings semánticos, un sistema de varios usuarios ni explicaciones jurídicas generadas. La detección de similitud es léxica y tiene un límite de 1.000 preguntas por cálculo interactivo; para corpus mayores conviene indexación en segundo plano.

El siguiente paso recomendado es **acreditar la plantilla definitiva de una sesión completa de 2026, cotejar un modelo, resolver sus equivalencias con el otro y revisar conceptos y artículos**. Después completar 2023–2025 mediante originales aportados y repetir el mismo protocolo. Sólo cuando haya suficientes años validados tendrá sentido interpretar la evaluación retrospectiva y ajustar el ranking.
