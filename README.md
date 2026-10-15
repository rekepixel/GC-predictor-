# GC Predictor

Aplicación personal para analizar exámenes oficiales de acceso a la Escala de Cabos y Guardias y orientar el estudio de 2027. **La fiabilidad del corpus precede al ranking.** Una puntuación de prioridad no es una probabilidad de examen.

Implementación funcional con Next.js 16, App Router, TypeScript, Tailwind 4, SQLite/PostgreSQL y extracción local de PDF en JavaScript o Python. No necesita una API de IA ni servicios de pago para ejecutarse localmente.

## Fase actual: Netlify Free + Supabase Free

Decisión del 15/10/2026: alojamiento gratuito con Next.js y persistencia PostgreSQL/Storage privada. [Pasos de conexión, despliegue e instalación PWA](docs/despliegue-iphone.md); [pruebas y límites verificados](docs/verificacion-netlify.md). La configuración Netlify, la importación íntegra y la sincronización de progreso ya están implementadas. No hay todavía una URL real publicada: faltan conexiones autorizadas a las plataformas. La nueva auditoría privada no se sustituye por los datos incompletos de GitHub.

`npm run cloud:preflight` comprueba la copia privada completa y las cuotas; `npm run cloud:import` la transfiere a un proyecto privado vacío con las credenciales del servidor. Estos comandos son tareas del operador, no requisitos para estudiar desde el teléfono. Netlify nunca crea una base SQLite temporal ni importa automáticamente la semilla pública.

## Auditoría conservada: 700 preguntas

Informe vigente: [auditoría de las 700 preguntas](docs/auditoria-700.md). Se retira la confianza basada en «señale/indique», se conserva toda la evidencia previa y se prepara el [despliegue privado para iPhone](docs/despliegue-iphone.md).

El paquete completo de esta fase contiene 700 revisiones asistidas, **cero validaciones humanas nuevas**, una cola inicial de 211 etiquetas más 80 antiguas altas seleccionadas de forma reproducible, 65 materias, 652 focos conceptuales y 693 subaspectos. Las familias interanuales bajan de 89 a 37; el top 10 exploratorio cubre **0 conceptos de 2025 y 1 de 2026**, sin superar la frecuencia histórica. La evaluación estricta sigue sin datos suficientes y no se publican probabilidades.

La plantilla institucional del 28/10/2023 se recuperó de Internet Archive: **210 respuestas cotejadas, incluidas reservas A/B, cero diferencias**. La del 29/10/2023 también se recuperó y es idéntica a la copia retenida. Las plantillas institucionales de 2024/2025 siguen inaccesibles en las rutas comprobadas. Se conservan las copias y su procedencia. Se mantienen 700 ordinarias únicas, 35 reservas y **2.100 registros personales sin borrar ninguno**. Se añaden o precisan 31 referencias BOE (152 preguntas localizadas; 126 fichas de artículos).

**GitHub es público.** Esta subida contiene código e informe agregado. Los nuevos PDF, artefactos de auditoría y base personal se entregan en el **ZIP privado** para cumplir la instrucción de no publicar datos. Un clon público conserva el banco anterior de 553 familias, con su confianza retirada. Para utilizar los datos nuevos, descomprime el paquete completo y ejecuta `npm ci`, `npm run data:apply-verified` y `npm run dev`; abre **http://127.0.0.1:3000**.

Los nuevos filtros están en Explorador → Validación → Auditoría. Los tres niveles se consultan en Análisis de patrones. `npm run data:report:audit` compara ambas taxonomías; requiere el paquete privado. `npm run db:backup` y `npm run db:restore -- RUTA_COPIA` conservan SQLite y originales subidos. `npm run deploy:prepare` prepara la transferencia privada sin subirla. No se ha contratado alojamiento ni generado una URL pública.

## Estado conservado de la fase anterior: 700 preguntas con clasificación conceptual

Consulta del **14/10/2026**. Se continúa el mismo proyecto. Informe de la fase anterior: [análisis conceptual de las 700 preguntas](docs/concept-analysis-700.md); [datos calculados](data/research/concepts-700/analysis-report.json). Se conserva el [informe de la fase histórica anterior](docs/history-2023-2026.md).

| Control                                                | Resultado                                                                                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sesiones celebradas representadas                      | **6**: dos de 2023, dos de 2024, una de 2025 y una de 2026                                                                                                                                     |
| Formas distintas de examen                             | **7**; la sesión 28/09/2024 contiene dos ejercicios diferentes, uno aplicado en un aula de Baeza                                                                                               |
| Preguntas ordinarias para descripción                  | **700 únicas**, sin duplicar A/B                                                                                                                                                               |
| Reservas                                               | **35 únicas**, separadas e inactivas                                                                                                                                                           |
| Registros literales cotejados                          | **1.470** ocurrencias de modelo, con cuatro alternativas y claves emparejadas                                                                                                                  |
| Procedencia                                            | **100 ordinarias de descarga institucional y 600 cotejadas en copias secundarias corroboradas**                                                                                                |
| Respuesta final y anulaciones acreditadas por pregunta | **0**; no se presentan las copias ni las claves vigentes como prueba de ese control final                                                                                                      |
| Clasificación temática                                 | 700/700 ordinarias en los 23 temas de referencia 2026                                                                                                                                          |
| Clasificación conceptual específica                    | **700/700 asignadas**, 553 conceptos de estudio y subconcepto por pregunta; 524 nuevas asignaciones, 176 anteriores conservadas. Revisión asistida, pendiente de revisión humana independiente |
| Referencias normativas                                 | **133 preguntas** con alguna localización normativa cotejada; **122 fichas de artículos numéricos**, con sus versiones históricas                                                              |
| Repeticiones                                           | 2 grupos literales; 89 familias interanuales, 63 con años consecutivos; 14 relaciones explícitas que distinguen misma regla, mismo método y subaspectos                                        |
| Archivo existente                                      | **2.100 registros**: los 840 anteriores se conservan y se añaden 1.260 históricos; 630 de 2022 siguen en borrador                                                                              |
| Documentación                                          | 69 fuentes catalogadas; 45 PDF retenidos: 24 de procedencia oficial y 21 secundarios                                                                                                           |
| Predicción                                             | Probabilidades siempre `null`; retrospectiva estricta no concluyente; reconstrucción exploratoria separada                                                                                     |

**Corroborar copias no las convierte en descargas oficiales.** Para admitir el cotejo histórico se exige concordancia literal de dos motores PDF, cuatro alternativas, sección y reservas identificadas, transcripción visual independiente de las claves A/B y correspondencia biyectiva coherente de respuestas. Las copias coinciden entre dos proveedores: por SHA-256 en 2023/2024 y plantillas, o por texto de preguntas tras retirar únicamente la marca editorial del documento de contraste de 2025. Se conserva procedencia secundaria, originales institucionales inaccesibles y situación final pendiente.

La resolución de 24/07/2026 acredita resultados definitivos tras revisiones de notas, pero su parte resolutiva no enumera cambios de respuesta o anulaciones. Se registran tres estados: cotejo documental, respuesta y anulaciones finales acreditadas, y cotejo adicional pendiente. La procedencia y los controles pendientes se informan aparte. **No se exige un certificado independiente por su título; se exige evidencia del alcance por pregunta.** Esa falta no bloquea las frecuencias documentales.

En 2024 no se cuenta el examen suspendido del 29/09: las sesiones son 28/09 y 13/10. La primera reúne 200 preguntas distintas de dos ejercicios, cada uno con A/B. No se conoce el número de aspirantes de cada forma; las tasas se normalizan por sesión sobre los contenidos disponibles, sin inventar pesos poblacionales.

Estadísticas actuales: Derechos Humanos 80/700, Procesal Penal 68/700 y Constitucional 58/700. Son recuentos documentales. Las 700 ordinarias tienen clasificación conceptual asistida. Esto no equivale a revisión humana independiente ni a una taxonomía perfecta: 211 etiquetas tienen confianza cualitativa media y las familias pueden contener reglas distintas. El tiempo sin aparecer no añade puntos. Se documenta una discrepancia entre clave copiada y norma en 2024 2A81/2B75; su letra se conserva pero no se ofrece como respuesta jurídica fiable.

## Estado de entrega y permisos de GitHub

El proyecto completo está publicado en [rekepixel/GC-predictor-](https://github.com/rekepixel/GC-predictor-), rama **main**, con el código, los documentos recopilados y los bancos documentales de 2023–2026. El 14/10/2026 se resolvió el error 403 tras instalar ChatGPT Codex Connector y conceder acceso al repositorio. La subida se ha comprobado contra la referencia remota.

El historial del diagnóstico está en [Acceso a GitHub](docs/github-access.md). También se conservan los paquetes ZIP anteriores. Si usas el ZIP, entra en su carpeta `gc-predictor` y omite las dos líneas de clonación. No se incluyen contraseñas, dependencias instaladas ni bases de datos personales; el arranque carga automáticamente el banco documental de 2023–2026 y `data:archive` reconstruye además los borradores antiguos.

## Inicio local

Requisitos: **Node.js 24** y npm. SQLite no necesita un servicio externo. Puedes clonar el repositorio o utilizar el ZIP de la entrega.

```bash
git clone https://github.com/rekepixel/GC-predictor-.git
cd GC-predictor-
npm ci
cp .env.example .env.local
npm run dev
```

Abre **http://127.0.0.1:3000**. La primera petición crea la base y carga las 1.470 ocurrencias cotejadas de 2023–2026 desde la evidencia sellada incluida. **No requiere Python** para consultar el dashboard y el explorador. En una base existente conserva sus identificadores y aplica únicamente las comprobaciones nuevas, con auditoría. No sustituye revisiones manuales ya registradas.

Para reconstruir también el archivo antiguo, instala Python 3.11 o superior:

```bash
python -m venv .venv
.venv/bin/python -m pip install -r python/requirements.txt
PYTHON_BIN=.venv/bin/python npm run data:archive
```

`data:archive` es idempotente, importa sólo fuentes catalogadas como oficiales y nunca valida los borradores. En Windows usa `.venv\Scripts\python.exe` y configura `PYTHON_BIN` en tu terminal.

Para repetir el cotejo de los PDF retenidos, desde la raíz del repositorio:

```bash
.venv/bin/python python/verify_2026.py
# Opcional: renovar la comprobación normativa contra BOE; necesita red.
.venv/bin/python python/curate_2026.py
npx tsx scripts/seal-bank.ts
npm run data:apply-verified
```

Para el banco histórico ya curado:

```bash
.venv/bin/python python/verify_history.py
npm run data:apply-verified
```

`verify_history.py` trabaja sin red con los documentos y transcripciones de clave incluidos, verifica dos motores y ambos modelos y genera su propio manifiesto. Las transcripciones y grupos revisados se guardan en `data/verified/history/`. El comando abreviado es `npm run data:verify:history` usando `python` del PATH. Tras la extracción, `python/curate_history.py` reconstruye la clasificación desde las reglas de encabezados y las anotaciones explícitas. Las propuestas normativas nuevas necesitan el XML BOE en `.local/legal-cache` y revisión; ninguna propuesta se verifica automáticamente por su parecido.

El primer script compara pypdf y pdfplumber, comprueba sección, opciones, reservas, equivalencias y cambios de clave. El segundo utiliza el TSV de propuestas curadas y sólo publica artículos cuyo bloque y fragmento se localizan en una versión BOE publicada y vigente antes del examen. No convierte propuestas sin verificar en referencias ciertas. El sellado actualiza SHA-256 de las evidencias; revísalas antes de aplicarlas. Los fallos interrumpen el proceso. `npm run data:verify:2026` abrevia extracción, sellado y aplicación usando `python` del PATH; no renueva las referencias BOE.

La base local se guarda en `.local/gc-predictor.sqlite`, fuera de Git. Los PDF subidos se guardan en `.local/originals`, salvo que configures Supabase Storage. Los PDF institucionales recopilados en `data/raw` y las copias con procedencia explícita en `data/pending` forman parte del repositorio. Los comandos CLI leen `.env.local` y `.env`; las variables ya exportadas en la terminal tienen prioridad.

En desarrollo, el acceso sin contraseña se limita a un servidor enlazado a loopback y un host `localhost`/`127.0.0.1`. Para exigir contraseña también en desarrollo, configura `PRIVATE_APP_PASSWORD`. No expongas `next dev` a Internet.

Para reproducir la auditoría conceptual actual, sin API de IA ni conexión de red y con el paquete privado de esta fase:

```bash
.venv/bin/python python/curate_concepts.py
npm run data:apply-verified
npm run data:report:audit
```

Se conservan las 524 anotaciones y el artefacto sellado de la fase anterior. La confianza que contenían se ha retirado. `data:classify:concepts` ejecuta ahora la auditoría sobre las 700 filas usando `python` del PATH; necesita las propuestas del paquete privado y no modifica los artefactos históricos. Las revisiones humanas del usuario se preservan. Administración permite editar materia y subconcepto, y confirmar la revisión humana por separado.

## Qué se puede usar

- **Dashboard**: documentos y registros importados, años, estado de cobertura distribución de las 700 preguntas ordinarias cotejadas y gráficos interactivos; separa cotejo documental de firmeza final.
- **Explorador**: preguntas reales en borrador/revisadas/validadas, filtradas por año, sesión, modelo, tema, norma, artículo, concepto y texto. Conserva el enunciado y el orden literal de las opciones de cada modelo. Por defecto muestra ordinarias cotejadas y una sola variante por pregunta. La pestaña «Fichas de artículos» ofrece 122 fichas, historial, páginas A/B y versión normativa.
- **Administración**: subida y conservación de PDF, extracción revisable, importación de JSON, asociación de plantillas, cotejo de preguntas, fuentes, versiones del programa y cambios normativos. Auditoría de cambios y exportación JSON.
- **Análisis**: frecuencia de temas, normas, artículos y conceptos; repeticiones literales y conceptuales; sugerencias léxicas TF-IDF/coseno; periodos sin reaparición; estilos y distractores anotados.
- **Prioridades**: orden explicable por concepto o artículo, pesos configurables y referencias documentales. Con un único año sólo se muestran apariciones; los puntos heurísticos se habilitan con al menos dos años, sin promesa de fiabilidad predictiva. Se informa de cobertura, fechas desconocidas, vigencia y muestra pequeña.
- **Retrospectiva**: cortes 2024, 2025 y 2026, entrenamiento estrictamente anterior y comparativas por frecuencia y azar reproducible. La evaluación estricta informa «sin evidencia suficiente». Existe además una reconstrucción documental seleccionable, con supuestos de disponibilidad y taxonomía retrospectiva visibles; no prueba anticipación real.
- **Simulacros**: selección de preguntas oficiales activas validadas, filtro temático o top 10 conceptual, corrección en servidor y resultados persistidos por tema. La corrección que exige respuesta definitiva permanece deshabilitada con cero preguntas finales acreditadas. El explorador sí muestra las respuestas documentales y sus límites. No se generan preguntas nuevas mediante IA.
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

- **Observación descriptiva**: pregunta ordinaria activa con cotejo documental sellado —institucional o de copia corroborada identificada— o validación contra clave definitiva. **Corpus estricto**: únicamente el segundo supuesto, reservado a simulacros y retrospectiva. Las variantes equivalentes de una sesión/año se cuentan una vez. Se conservan literalmente las ocurrencias A/B y su correspondencia de opciones; los conflictos de respuesta entre variantes excluyen el grupo.
- **Frecuencia observada**: recuentos y proporciones sobre el corpus disponible. Para el ranking se calcula la **media de proporciones por sesión**, de modo que un examen con más preguntas disponibles no domine automáticamente.
- **Puntuación heurística**: combinación de frecuencia histórica (0,30), recencia desde 2023 (0,30), persistencia (0,20), temario verificado para la fecha (0,15) y cambios legales documentados (0,05). Los pesos se normalizan. Frecuencia y recencia se escalan respecto al máximo del corpus. Con al menos dos años cubiertos produce una prioridad relativa de estudio de 0 a 100, **sin símbolo de porcentaje**. Con un único año de entrenamiento devuelve `score:null` y muestra el recuento.
- **Probabilidad**: siempre `null`. No hay modelo probabilístico entrenado, calibrado ni validado. Superar una referencia retrospectiva no basta para afirmar una probabilidad.
- **Retrospectiva estricta**: antes de cada año objetivo sólo se usan años anteriores con fecha de disponibilidad anterior al examen. La disponibilidad es la más tardía entre publicación del examen y de su clave. Las fechas desconocidas se excluyen. El universo de conceptos lo define sólo el entrenamiento. Las anotaciones conceptuales retrospectivas se declaran como una limitación, no como conocimiento histórico reconstruido.
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

Configura primero `PRIVATE_APP_PASSWORD` y `SESSION_SECRET`; producción permanece bloqueada sin ellos. Mantén el contenedor detrás de HTTPS para uso remoto. El Dockerfile se aporta como alternativa; no se ha publicado una imagen ni contratado un hosting. El proyecto usa APIs de Node y SQLite nativo: **no es un sitio estático ni un Worker de Cloudflare**. No se ha desplegado en Sites por esa incompatibilidad de runtime; la entrega verificable es el código local y el paquete descargable; el repositorio GitHub ya contiene la aplicación; el despliegue alojado sigue pendiente. No hay una URL alojada todavía.

### iPhone

Accede a tu despliegue HTTPS desde Safari, abre Compartir y elige **Añadir a pantalla de inicio**. El manifiesto y los iconos están incluidos. `127.0.0.1` en el iPhone apunta al teléfono, no al ordenador: usa un dominio HTTPS de tu servidor para acceder desde el móvil. La instalación real en iOS requiere comprobarla en tu dispositivo; las pruebas automáticas cubren un viewport móvil, no Safari físico.

## Pruebas

```bash
npm run data:verify
npm test
npm run typecheck
npm run build
```

Las pruebas incluyen los dos bancos documentales reales y usan bases temporales: fixtures sintéticos identificados y una integración independiente con las evidencias de los PDF auténticos de 2026. Cubren equivalencias A/B y orden de opciones, preservación de repeticiones entre años, signos matemáticos, conflictos de claves, borradores/anulaciones, normalización por sesión, corte temporal, exclusión de fechas desconocidas, universo de conceptos sin futuro, referencias reproducibles, importación atómica, claves foráneas, revisión y auditoría, sustitución/anulación de plantillas y firmas de sesión.

GitHub Actions ejecuta integridad de fuentes, comprobación de tipos, pruebas y build. Las credenciales de Supabase no vienen configuradas; el adaptador PostgreSQL y el bucket necesitan una prueba de integración en tu entorno antes de usarlo como almacenamiento de producción. El Dockerfile y Safari iOS tampoco se certifican por la compilación de Next.js.

## Límites y siguiente paso

El corpus permite comparar seis sesiones, con procedencia explícita. No equivale a disponer de todas sus respuestas finales acreditadas. Faltan autenticación institucional plena de las copias, fechas originales de publicación, revisión humana independiente de las etiquetas conceptuales y referencias concretas en 567 preguntas (algunas materias no son jurídicas). No se han certificado retiradas concretas del temario 2026; mapear un tema no demuestra vigencia de cada contenido. Las versiones legales se cotejan para la fecha del examen, no para 2027.

La retrospectiva estricta mantiene sus controles de publicación y respuesta final. La reconstrucción exploratoria usa sólo exámenes anteriores, pero supone disponibilidad a partir de la celebración cuando falta la publicación y utiliza etiquetas retrospectivas: sus resultados no son concluyentes. Con cobertura conceptual completa, el top 10 cubre 3 conceptos/preguntas de 2025 y 3 de 2026. Frecuencia histórica cubre 2 y 3. Al ampliar a top 50, la heurística cubre 6 y 5 frente a 7 y 6 de frecuencia. **No se acredita mejora predictiva consistente**. Los resultados anteriores pertenecían al subconjunto incompleto y se conservan en el informe previo.

No hay calibración probabilística, OCR automático web, embeddings de pago ni sistema multiusuario. Las claves históricas escaneadas se transcribieron visualmente y se cruzaron entre A/B. La similitud es léxica y conserva su límite interactivo de 1.000 preguntas.

Siguiente paso: conseguir los acuerdos o claves que acrediten el estado final por pregunta, confirmar fechas históricas de publicación y revisar la taxonomía conceptual y resolver la discrepancia de clave documentada. Congelar la taxonomía y los pesos antes de evaluar un periodo externo nuevo. Los archivos y registros anteriores están conservados; el informe incluye las comprobaciones de integridad.
