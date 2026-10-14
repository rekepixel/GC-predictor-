# Método y límites estadísticos

## Tres salidas que no se confunden

1. **Frecuencia observada**: número de apariciones en lo disponible. No representa el total de exámenes históricos no recopilados.
2. **Prioridad heurística**: utilidad relativa exploratoria para ordenar el estudio. Escala de puntos 0–100 con fórmula y evidencias visibles, habilitada sólo con al menos dos años. Con un año `score:null` y orden descriptivo por apariciones.
3. **Probabilidad predictiva calibrada**: no disponible. El código devuelve `null`, nunca el score dividido por 100.

## Unidad y denominadores

Un examen es año + sesión, no modelo A/B. Hay dos corpus: el descriptivo admite preguntas ordinarias activas con cotejo documental sellado, de descarga institucional o de copia secundaria corroborada explícitamente, además de las definitivamente validadas. La procedencia de cada cohorte se mantiene visible; corroborar copias no autentica su origen institucional. El estricto, para simulacros y retrospectiva, sólo admite preguntas activas validadas con fuente oficial y clave definitiva. La interfaz muestra siempre la diferencia y los recuentos de cada estado. El cotejo documental no asciende el estado `reviewed` a `validated`. Las variantes identificadas por literalidad o mediante una correspondencia documental verificada se consolidan, preservando las opciones originales y su mapa. La excepción A28/B62 de 2026 conserva la diferencia «Noveno»/«Noveno.» sin eliminar puntuación del resto del corpus. Las discrepancias de respuesta del grupo se excluyen y se informan. Una pregunta legítimamente repetida en otro año conserva su observación. Las reservas se excluyen hasta que se acredita su activación; las anuladas se conservan para auditoría y no para frecuencias.

Se informa del recuento y proporción del corpus, de la parte clasificada y de años/sesiones con datos. Para priorizar un contenido c, en cada sesión e se calcula `n(c,e)/N(e)`, siendo N las preguntas admisibles en el corpus usado de esa sesión. Para descripción se utilizan ordinarias; las reservas documentales nunca aumentan ese denominador, aunque alguien cambie su marca activa. Se promedian esas proporciones entre las sesiones disponibles. Las preguntas sin concepto revisado siguen en el denominador, evitando elevar artificialmente la proporción al ignorarlas.

No se equipara ausencia de datos con ausencia de un contenido. La cobertura y la calidad se comunican explícitamente, no se ocultan detrás de una probabilidad o un «índice de confianza» supuestamente calibrado.

## Componentes de la heurística

Frecuencia histórica normalizada por el máximo de contenidos del entrenamiento; recencia (mismo cálculo desde 2023, modificable); persistencia (años distintos con observación / años cubiertos); relevancia en una versión oficial de programa con fecha acreditada anterior al corte; cambio normativo revisado publicado y vigente antes del corte en los dos años anteriores.

Por defecto, pesos 0,30 / 0,30 / 0,20 / 0,15 / 0,05, normalizados por su suma. Un peso es una decisión exploratoria, no un coeficiente aprendido. El catálogo actual de títulos no tiene fecha de entrada en vigor reconstruida: ese componente queda sin evidencia temporal. El programa 2027 está pendiente.

## Retrospectiva

Para cada objetivo 2024/2025/2026 se toma la primera fecha de examen acreditada del año; si falta, se usa de manera conservadora el 1 de enero. Sólo se entrenan años anteriores y preguntas cuya disponibilidad sea anterior al corte. La disponibilidad es `max(publicación del cuadernillo, publicación de la plantilla aplicada)`. Si alguna fecha no está verificada, la pregunta se excluye del entrenamiento retrospectivo. Los metadatos normativos/curriculares también tienen cortes temporales.

El universo y los máximos del score salen exclusivamente del entrenamiento; los conceptos nuevos del objetivo no entran en él. No se aprende con el año objetivo. La evaluación usa sus etiquetas como verdad de contraste. Estas etiquetas son anotaciones humanas retrospectivas y su construcción puede introducir sesgos: no se afirma que se haya reconstruido exactamente el conocimiento del opositor antes de ese examen. Para una validación más estricta deben congelarse taxonomías y anotaciones antes del periodo externo.

Las referencias usan el mismo universo y k efectivo. Frecuencia: proporción histórica media por sesión, desempate estable por nombre. Azar: Fisher–Yates con generador congruencial determinista, semilla 2027 derivada por año y 200 realizaciones. Se muestra la primera y la media de cobertura conceptual. El score debe superar ambas referencias en cada partición disponible para emitir siquiera una observación favorable, que sigue sin probar calibración ni generalización.

- Precisión@k = conceptos seleccionados presentes en el objetivo / k efectivo.
- Cobertura conceptual = conceptos objetivo cubiertos / conceptos objetivo revisados.
- Cobertura de preguntas = preguntas objetivo con concepto seleccionado / preguntas objetivo con concepto revisado.
- Se informa de preguntas objetivo sin clasificación, conceptos nuevos y resultados por tema.
- Intervalo Wilson 95% sobre conceptos como descripción orientativa. La dependencia entre contenidos, las múltiples comparaciones y pocos años impiden tratarlo como una garantía de rendimiento futuro.

Si no hay objetivos validados, fechas acreditadas o conceptos revisados, las métricas son `null`; no se fabrican ceros aparentando evaluación. Elegir pesos después de ver el resultado es ajuste retrospectivo: hace falta un periodo independiente posterior.

## Texto y estilo

La igualdad literal conserva la puntuación y símbolos (por ejemplo, `>` y `<` nunca se igualan). TF-IDF/coseno identifica similitud léxica en enunciados, umbral 0,72, con límite interactivo de 1.000 preguntas. No es un modelo semántico ni prueba equivalencia jurídica. Las relaciones conceptuales provienen de la misma asignación conceptual revisada, independiente del enunciado. Los tipos de distractor y estilos son anotaciones; una regla de «INCORRECTA» sólo sugiere un estilo negativo.

## Estado histórico 2023–2026

Hay 700 ordinarias de seis sesiones: 100 de descarga institucional y 600 cotejadas en copias secundarias corroboradas; 35 reservas únicas están separadas. Las copias siguen siendo secundarias, no definitivas y sin autenticación institucional plena. El corpus final sigue vacío. Véase [el informe actual](history-2023-2026.md).

En 28/09/2024 se documentan dos formas diferentes: el denominador es 200, frente a 100 en 13/10. No se estiman tamaños de población ni pesos de aspirantes. Los artículos se agregan por norma y número, conservando apartados y versiones en las fichas.

Las 700/700 preguntas tienen una clasificación conceptual asistida; se conservaron 176 etiquetas y se asignaron las 524 pendientes. Hay 553 familias y 89 reaparecen entre años. La cobertura de asignación no equivale a validación semántica independiente: 211 etiquetas son de confianza cualitativa media y ninguna ha pasado en este flujo una segunda revisión humana independiente. Se preservan subconceptos y relaciones explícitas de misma regla, método o subaspectos. El ranking de artículos mantiene cobertura parcial. No hay un incremento de prioridad por años sin aparecer. Tampoco se han acreditado retiradas concretas del temario vigente.

## Reconstrucción exploratoria separada

La evaluación estricta no cambia sus exigencias de fuente final y publicación acreditada. La opción `documentary_reconstruction` usa el corpus documental y, sólo en memoria, sustituye publicación desconocida por celebración del examen como supuesto explícito. Nunca guarda esa fecha como publicación real. Una publicación conocida posterior al corte excluye el registro. Los exámenes objetivo no se incluyen en entrenamiento ni amplían su universo de conceptos.

Las claves copiadas se recuperaron posteriormente: no se ha certificado su disponibilidad histórica en esa versión. Las etiquetas y familias se curaron retrospectivamente, con riesgo de sesgo por conocimiento del objetivo y selección de coincidencias. Este ejercicio no prueba ausencia de toda fuga de información ni constituye validación predictiva. Requiere fechas verificadas y taxonomía congelada antes de evaluar un periodo externo.

Top 10 exploratorio con cobertura completa: 3/99 conceptos de 2025 y 3/100 de 2026; la frecuencia histórica obtiene 2 y 3. La mejora de una partición no es consistente: con top 50, frecuencia supera la heurística en ambos objetivos. No se demuestra mejora predictiva estable ni se emiten probabilidades. Los resultados de la fase parcial anterior se conservan en su informe, sin compararlos como si el universo fuera idéntico. En 2024 hay un único año de entrenamiento: la puntuación está deshabilitada y se etiqueta el orden descriptivo por apariciones.

## Revisión conceptual y conflictos de respuesta

Las etiquetas se ligan al contenido mediante huella, fuente, página y método. La revisión asistida se distingue de la confirmación humana en Administración. Una pregunta de varias proposiciones puede clasificarse por el foco de su alternativa de clave: se informa de esa limitación y una proposición falsa de una pregunta negativa nunca se convierte en explicación jurídica.

Las familias pueden examinar diferentes reglas. El inventario de relaciones explícitas no es exhaustivo; distingue misma regla, mismo método y subaspectos. La revisión posterior de 2024 1A87/1B73 encontró una línea descartada por un filtro compartido: dos motores con el mismo preprocesado no constituyen comprobaciones independientes de ese preprocesado. Se reparó y se conservó el texto previo.

Una discrepancia entre clave y ley se informa aparte de la aparición de contenido: 2024 2A81/2B75 sigue como observación documental, con letra conservada, aviso visible y bloqueo de corrección estricta. No se presume anulación ni se cambia la respuesta sin acuerdo. Véase [el informe conceptual vigente](concept-analysis-700.md).
