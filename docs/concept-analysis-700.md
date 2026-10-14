# Análisis conceptual de las 700 preguntas

Fase del 14/10/2026 sobre el mismo repositorio. [Datos calculados](../data/research/concepts-700/analysis-report.json), [524 asignaciones explícitas](../data/curation/concepts-700.psv), [revisión sellada](../data/verified/concepts-2023-2026/review.json), [relaciones revisadas](../data/curation/concept-relations.json).

## Resultado de la clasificación

Se analizaron las **524 ordinarias pendientes** y se conservaron las **176 etiquetas anteriores**. Las **700/700** ordinarias tienen tema de referencia, materia, concepto y subconcepto. Se distinguen **553 conceptos de estudio**, sin duplicar los modelos A/B ni incluir las 35 reservas únicas. Los 2.100 registros del archivo personal permanecen, incluidas ocurrencias alternativas y borradores antiguos.

| Año  | Ordinarias | Con concepto asignado | Pendientes de asignación |
| ---- | ---------: | --------------------: | -----------------------: |
| 2023 |        200 |                   200 |                        0 |
| 2024 |        300 |                   300 |                        0 |
| 2025 |        100 |                   100 |                        0 |
| 2026 |        100 |                   100 |                        0 |

Es **revisión asistida del contenido**, no una segunda revisión humana independiente: ese último control sigue pendiente en las 700. Se guarda método, fecha, confianza cualitativa, fragmento de enunciado, alternativa señalada por la clave, página y huella de entrada. Hay 211 clasificaciones de confianza media, especialmente preguntas de varias proposiciones cuyo foco se identifica con la alternativa de clave. La confianza es orientativa, no una probabilidad calibrada de clasificación correcta.

En preguntas negativas, la alternativa marcada puede ser una proposición jurídicamente falsa: se conserva como evidencia de qué se examina, nunca como explicación jurídica. El concepto es una familia para estudiar; el subconcepto precisa la regla o aspecto. Cuando una etiqueta anterior ya era específica se conserva también como detalle, sin inventar una subdivisión adicional. Las familias no tienen una granularidad universal: deben inspeccionarse antes de afirmar equivalencia de conocimientos.

El tema se mantiene según el programa oficial de referencia 2026, cuyo origen ya estaba acreditado. Eso no reconstruye automáticamente los programas históricos. La materia separa el área de conocimiento del texto literal. La norma se conserva cuando está identificada en el cuadernillo; para topografía, historia u organizaciones no se inventa una ley. Identificar una norma no verifica sus artículos ni su vigencia para 2027.

Hay **133 preguntas con alguna referencia normativa específica cotejada y 122 fichas de artículos numéricos**. La localización añadida en esta fase corresponde a una discrepancia, no a la confirmación de una respuesta correcta. Las restantes 567 no se completan con números inferidos. Se mantiene la limitación de procedencia: 100 ordinarias de descarga institucional, 600 de copias secundarias corroboradas, y **0 con respuesta final/anulaciones acreditadas por pregunta**.

## Qué patrones se observan realmente

- **89 conceptos** aparecen en más de un año; **63** presentan años consecutivos. Son apariciones de familias, no 89 reglas idénticas.
- **2 grupos literales** entre años, conservando puntuación, opciones y observaciones separadas por sesión.
- **14 relaciones explícitas** inspeccionables: 10 de la misma regla examinada, una del mismo método de cálculo y tres de subaspectos relacionados. Este inventario revisado no es exhaustivo ni una certificación de las respuestas.

| Concepto                                                          | Apariciones | Años                   | Sesiones distintas |
| ----------------------------------------------------------------- | ----------: | ---------------------- | -----------------: |
| Consejo Asesor del Mecanismo Nacional de Prevención de la Tortura |           8 | 2023, 2024, 2025, 2026 |                  5 |
| Tutela frente a intromisiones ilegítimas en el honor              |           5 | 2023, 2024, 2026       |                  4 |
| Clasificación de penas por gravedad y duración                    |           5 | 2023, 2024, 2026       |                  5 |
| Garantías frente a la expulsión de ciudadanos de la Unión         |           4 | 2023, 2024, 2025       |                  3 |
| Competencia penal de la Audiencia Nacional                        |           4 | 2024, 2025, 2026       |                  3 |

El Consejo Asesor es un ejemplo de recurrencia útil para organizar el estudio, pero sus ocho preguntas no exigen la misma regla: función, composición, nombramiento, reuniones, retribuciones y mandatos son subaspectos diferentes. Las repeticiones de una misma sesión o forma se muestran en su contexto, sin presentarlas como ocho años o sesiones.

Entre las relaciones más concretas están el límite general de detención de 72 horas (2024 2A45 / 2026 A46), audiencia obligatoria del menor en remoción del tutor (2023 1A40 / 2025 A38), protección del menor europeo frente a expulsión (2023 1A69 / 2025 A63), Sala Cuarta del Supremo (2024 2A48 / 2026 A48) y notificación de reexportación (2024 1A100 / 2026 A98). Las preguntas y PDF se pueden abrir desde «Análisis de patrones → Relaciones de contenido».

Se separan expresamente la detención general de 72 horas y la entrega al juez más próximo de 24 horas; la escala lineal de distancias y la relación cuadrática de superficies; el procedimiento legislativo ordinario y sus variantes especiales. Las trampas se documentan donde hay evidencia, no mediante estadísticas generales de distractores inventadas.

La utilidad acreditada es **descriptiva y de organización del repaso**: localizar contenidos persistentes y sus variantes, consultar sus fuentes y preparar fichas completas. No está acreditada una ventaja predictiva estable para elegir unas pocas materias del próximo examen.

## Evaluación temporal con cobertura completa

Se mantuvieron fórmula, pesos y semilla de la fase anterior. Entrenamiento sólo con exámenes anteriores al objetivo; universo del ranking obtenido del entrenamiento. No se ajustaron pesos para mejorar este resultado. La normalización sigue usando sesiones: en 28/09/2024 hay dos formas distintas, con denominador 200, y en 13/10 hay 100. El 29/09 suspendido no se cuenta.

La evaluación estricta permanece sin resultados concluyentes: faltan respuestas finales y fechas históricas de publicación acreditadas. La tabla corresponde a la **reconstrucción documental exploratoria**, que supone disponibilidad desde el examen cuando no consta publicación y utiliza una taxonomía creada a posteriori. Eso puede introducir sesgo de anotación y selección de coincidencias; no prueba ausencia de toda fuga de información. Las copias corregidas tampoco tienen su disponibilidad histórica certificada.

| Objetivo | Ordinarias de entrenamiento | Conceptos objetivo |                      Aciertos top 10 propuesto | Frecuencia histórica top 10 | Azar: media de aciertos conceptuales, 200 realizaciones |
| -------- | --------------------------: | -----------------: | ---------------------------------------------: | --------------------------: | ------------------------------------------------------: |
| 2024     |                         200 |                268 | 3, orden descriptivo sin puntuación heurística |                           3 |                                                   1,875 |
| 2025     |                         500 |                 99 |                                              3 |                           2 |                                                     1,2 |
| 2026     |                         600 |                100 |                                              3 |                           3 |                                                   0,305 |

En 2024 el entrenamiento tiene sólo un año: la puntuación heurística está deshabilitada. En 2025 y 2026 el top 10 cubre **3 de las 100 preguntas** del objetivo. Una precisión de conceptos de 3/10 no es una probabilidad de examen ni cubre el 30 % de sus preguntas.

Como análisis de sensibilidad, sin seleccionar un k óptimo ni modificar los pesos:

| Año  | Top k | Aciertos heurística | Aciertos frecuencia | Preguntas objetivo cubiertas por heurística |
| ---- | ----: | ------------------: | ------------------: | ------------------------------------------: |
| 2025 |    25 |                   4 |                   3 |                                       4/100 |
| 2025 |    50 |                   6 |                   7 |                                       6/100 |
| 2026 |    25 |                   4 |                   5 |                                       4/100 |
| 2026 |    50 |                   5 |                   6 |                                       5/100 |

Con esta granularidad, sólo 19 de las 100 etiquetas de 2026 tenían alguna aparición anterior. Es una medición de esta taxonomía, no prueba de que el resto del contenido jurídico fuese totalmente nuevo. La mejora de un concepto en el top 10 de 2025 no se repite en 2026; al ampliar el ranking, frecuencia simple puede superar la heurística. **No se acredita una mejora predictiva consistente.** Todas las probabilidades siguen `null`. Los resultados anteriores de 2/14 y 6/100 pertenecían al subconjunto incompleto y no son comparables directamente: han cambiado cobertura y universo conceptual, no los pesos.

Para estudiar 2027, el ranking puede ordenar el repaso de familias persistentes, acompañado de sus subconceptos y versión normativa. Estos resultados no justifican excluir el resto del temario ni afirmar que un contenido «toca» porque lleve años sin salir. Conviene congelar esta taxonomía, revisar sus etiquetas y probarla sobre un periodo externo posterior antes de formular afirmaciones predictivas.

## Incidencias encontradas y tratadas

### Línea perdida por el extractor

En **2024 1A87 / 1B73**, rumbo inverso, un filtro demasiado amplio descartaba una línea que empezaba por «dirección», al confundirla con cabecera. Ambos motores compartían ese filtro: su concordancia no detectaba el error. Se restringió a nombres institucionales completos y se repitió el cotejo de los doce cuadernillos históricos con ambos motores. Sólo dos registros recuperaron texto; ninguna alternativa ni respuesta cambió.

Se conservan texto anterior, texto recuperado, motivo, páginas y [prueba visual](../data/verified/concepts-2023-2026/2024-1A-87-page14.png) en [extractor-restorations.json](../data/verified/history/extractor-restorations.json), además de la auditoría y copias de la fase anterior. Esto demuestra por qué dos extractores con el mismo preprocesado no equivalen a dos revisiones independientes.

### Pregunta y clave incompatibles con la norma

En **2024 2A81 / 2B75**, la pregunta pide qué espacio NO es área protegida por instrumentos internacionales y la clave copiada marca A, Reservas de la Biosfera. El [artículo 50.1 de la Ley 42/2007 en versión anterior al examen](https://www.boe.es/buscar/act.php?id=BOE-A-2007-21490&p=20150922&tn=1#a50) enumera las cuatro opciones, incluidas las reservas de la biosfera y las biogenéticas.

Se contrastó de nuevo con el XML BOE, seleccionando versión publicada el 22/09/2015 y vigente desde 07/10/2015, ambas anteriores al 28/09/2024. Se conserva bloque, URL, huella XML, página de pregunta y página de clave en [issues.json](../data/verified/concepts-2023-2026/issues.json). La discrepancia está entre el material copiado y la norma; **no se afirma un error definitivo del tribunal ni una anulación oficial no localizada**.

La letra A se conserva como dato documental, pero no se pinta como respuesta correcta ni se presenta como solución jurídica fiable. La aparición del contenido sigue contabilizada, con aviso. La pregunta queda excluida de corrección estricta mientras persista la discrepancia. No se sustituye por una reserva ni se cambia a otra letra por interpretación propia.

## Reproducción y funcionamiento

```bash
npm ci
cp .env.example .env.local
npm run dev
# http://127.0.0.1:3000
```

El banco sellado se carga sin Python. Para reconstruir esta curación desde los artefactos existentes:

```bash
python python/curate_concepts.py
npm run data:apply-verified
npx tsx scripts/history-report.ts --concepts
npm run data:verify
npm test
npm run typecheck
npm run build
```

El script Python no hace llamadas a IA ni a Internet; sella las asignaciones explícitas, los textos de entrada, las relaciones y las evidencias. Para repetir también la extracción corregida: `python python/verify_history.py`, seguido de `python python/curate_concepts.py` y aplicación. Utiliza el entorno Python de requisitos del README.

«Administración → Revisar» permite editar materia, concepto y subconcepto. La confirmación humana es una acción separada y desmarcada por defecto. El filtro de Validación del explorador permite abrir las 211 preguntas de confianza conceptual media y la pregunta con discrepancia de respuesta. Cambiar etiquetas retira la anterior constancia asistida si deja de corresponder. Las revisiones del usuario se respetan al reaplicar el banco. La interfaz informa de confianza no calibrada y de la discrepancia de respuesta.

## Conservación y límites

Se comprobaron **148 rutas previas presentes**, **45 PDF previos con huella intacta** y **2.100/2.100 identificadores de pregunta preservados**. No cambiaron respuestas, alternativas ni etiquetas conceptuales anteriores. Sólo se repararon los dos enunciados indicados, conservando sus textos anteriores y auditoría. No se perdieron IDs de fuentes, sesiones/modelos, conceptos, programa, temas, trabajos, intentos o auditoría. La copia transaccional previa está en `.local/backups/concepts-700/before.sqlite` y el paquete histórico anterior se conserva.

La asignación completa no resuelve autenticación institucional de copias, respuestas finales, anulaciones, revisión humana independiente, vigencia 2027 ni definición exhaustiva de subconceptos equivalentes. Las relaciones explícitas no son una búsqueda exhaustiva de todas las reglas repetidas. PostgreSQL/Supabase, Safari físico y el despliegue HTTPS mantienen sus pruebas/configuración pendientes. El informe de verificación recoge las comprobaciones realmente ejecutadas.
