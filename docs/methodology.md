# Método y límites estadísticos

## Tres salidas que no se confunden

1. **Frecuencia observada**: número de apariciones en lo disponible. No representa el total de exámenes históricos no recopilados.
2. **Prioridad heurística**: utilidad relativa exploratoria para ordenar el estudio. Escala de puntos 0–100 con fórmula y evidencias visibles.
3. **Probabilidad predictiva calibrada**: no disponible. El código devuelve `null`, nunca el score dividido por 100.

## Unidad y denominadores

Un examen es año + sesión, no modelo A/B. El corpus sólo admite preguntas activas validadas con fuente oficial y clave definitiva. Las variantes identificadas por literalidad se consolidan, preservando las opciones originales y su mapa. Las discrepancias de respuesta del grupo se excluyen y se informan. Una pregunta legítimamente repetida en otro año conserva su observación. Las reservas se excluyen hasta que se acredita su activación; las anuladas se conservan para auditoría y no para frecuencias.

Se informa del recuento y proporción del corpus, de la parte clasificada y de años/sesiones con datos. Para priorizar un contenido c, en cada sesión e se calcula `n(c,e)/N(e)`, siendo N las preguntas activas validadas de esa sesión. Se promedian esas proporciones entre las sesiones disponibles. Las preguntas sin concepto revisado siguen en el denominador, evitando elevar artificialmente la proporción al ignorarlas.

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

En esta entrega no hay corpus estadístico habilitado. Todas las conclusiones sustantivas sobre «qué cae» o qué estudiar deben esperar una validación suficiente de originales y claves definitivas.
