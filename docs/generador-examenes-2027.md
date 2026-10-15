# Exámenes históricos y generador documentado, 15/10/2026

Se amplía el repositorio existente. Se conservan las 2.100 filas históricas, las 700 preguntas ordinarias únicas, las 35 reservas únicas, la auditoría y los archivos anteriores. Los candidatos nuevos se guardan en otra tabla y no entran en las frecuencias de preguntas oficiales.

## Qué funciona

- Inicio con dos acciones principales: examen histórico y generación para 2027.
- Selección de los 14 modelos originales de las 7 formas disponibles, correspondientes a 6 sesiones de 2023–2026. A/B conserva orden y opciones originales, pero no duplica observaciones estadísticas. Las dos formas del 28/09/2024 se promedian dentro de su sesión; no se inventan pesos por número de aspirantes.
- Práctica documental con 100 ordinarias y 5 reservas separadas: respuestas en blanco, marcas, navegación, tiempo transcurrido, guardado, reanudación y resultados persistentes. Los conflictos entre dos dispositivos devuelven 409 para evitar sobrescrituras silenciosas.
- Correcciones y explicaciones del intento ocultas hasta finalizar. Resultado por tema, errores por concepto, revisión de marcadas y acceso privado a documentos originales.
- Se conservan claves provisionales y discrepancias. La pregunta 2024 2A81/2B75 no recibe una solución jurídica inventada: se muestra la clave documental controvertida y un intervalo orientativo si se respondió. Sus errores no alimentan el ranking de conceptos fallados. Solo una anulación acreditada activa una reserva, por orden.
- Calificación orientativa de conocimientos: aciertos menos errores/3, blancos cero, escala limitada a 0–100 y umbral de 50. No decide la aptitud global del proceso selectivo. Los 140 minutos oficiales corresponden al bloque teórico conjunto; el reloj mide práctica, sin atribuir ese tiempo solo a conocimientos.

La fórmula y los 100+5 se cotejaron con la [convocatoria BOE-A-2026-9982](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-9982), apartados 6.1.1.c, 7.3 y 7.6; se retuvieron el documento y la imagen de la fórmula con SHA-256. No se asume que esa puntuación estuviera acreditada para todas las convocatorias anteriores: los resultados históricos indican que se usa como práctica orientativa de 2026.

## Planificación y banco nuevo

Antes de seleccionar preguntas se guarda un plan de 105 posiciones: tema, formato, señal de negación, complejidad observable, reglas recurrentes y distribución de letras. Se permite ponderar 2025–2026 con factores 1, 1,5 o 2; no se ajustan esos factores para mejorar retrospectivamente el año objetivo. Las reservas se planifican por separado y las letras se permutan con una semilla reproducible.

El perfil usa exclusivamente las 700 ordinarias documentales y tasas por sesión. Detecta señales de plazos, competencias, definiciones, mayorías, supuestos y enunciados compuestos. La longitud y semejanza léxica de opciones son aproximaciones de complejidad, no dificultad psicométrica. Las 190 señales negativas no certifican que las otras 510 preguntas sean afirmativas. Las señales de distractores tampoco prueban por sí solas su falsedad jurídica. No se estima un porcentaje de literalidad normativa que no se ha cotejado.

Estado del banco privado nuevo:

| Estado | Número | Alcance |
| --- | ---: | --- |
| Cotejo documental asistido | 13 | Comparación directa con artículos BOE fechados, cuatro alternativas justificadas y referencias históricas; sin validación humana independiente |
| Borradores ligados a fuentes | 95 | Falta comprobar significado, distractores, programa y estilo; no seleccionables |
| Revisión humana independiente | 0 | No se confunde con revisión por IA |

Se retuvieron instantáneas XML de **35 normas del BOE**. Para cada artículo se elige una versión publicada y vigente como máximo el **15/10/2026**, con huella, fragmento y fechas; no una modificación posterior al corte. El programa 2026 es la referencia provisional: no se da por verificado el de 2027 ni la vigencia futura. La selección exige fuente íntegra, fecha, programa, cuatro opciones distintas, una apoyada y tres contradichas con motivos, relación histórica y distancia respecto a los originales.

**No hay suficientes preguntas aptas para un examen inédito de 100+5.** El generador guarda el plan y explica las carencias por tema y otros criterios; no rellena huecos con borradores ni preguntas oficiales. La preparación automática de borradores tampoco acredita calidad: 95 candidatos conservan sus comprobaciones semánticas pendientes. En Administración → Banco inédito se pueden inspeccionar y revisar expresamente; una revisión del propietario se registra como tal, sin cambiar el banco histórico.

## Retrospectiva y utilidad observada

Entrenamiento antes de 2025 y antes de 2026, sin preguntas del año objetivo ni posteriores. Semillas aleatorias 4052 y 4053, 200 repeticiones. Menor distancia temática es mejor; no es una probabilidad de acertar artículos.

| Año objetivo | Distancia temática por sesión | Frecuencia sin normalizar | Uniforme por temas | Aleatoria media | Aciertos entre 25 conceptos priorizados |
| --- | ---: | ---: | ---: | ---: | --- |
| 2025 | 0,07125 | 0,07200 | 0,22217 | 0,29065 | 0; frecuencia simple: 0; aleatoria media: 0,715 |
| 2026 | 0,09400 | 0,09667 | 0,21565 | 0,28915 | 3; frecuencia simple: 3; aleatoria media: 0,905 |

El ajuste de distribución temática es mejor que un reparto uniforme; **no demuestra una mejora sobre la frecuencia simple en conceptos**. La taxonomía actual se revisó retrospectivamente utilizando el corpus completo: aunque las preguntas de entrenamiento respetan el corte temporal, sus etiquetas no son un diccionario congelado anterior a cada examen. Esta reconstrucción no es una validación prospectiva independiente.

No se puede evaluar honestamente la calidad de preguntas nuevas como si se hubieran creado antes de 2025/2026: el banco y sus referencias se redactaron después. Esa parte queda no concluyente. No se publican probabilidades. La auditoría anterior y sus resultados con top 10 se conservan; la tabla nueva usa top 25 y no sustituye aquella comparación.

## Archivos, importación y acceso

Código: `lib/exam-profile.ts`, `lib/exam-engine.ts`, `lib/generated-review.ts`, `components/exam-hub.tsx` y `components/generated-review.tsx`. Migración: `supabase/migrations/20261015113618_exam_generator.sql`. Las tres tablas nuevas son `generated_questions`, `exam_blueprints` y `exam_sessions`.

Los textos nuevos y evidencias están en `data/generated/2027-v1/`; el informe individual está en `data/research/exam-generator/analysis-v1.json`. Ambas rutas son privadas e ignoradas por Git. Un clon público no contiene esas 108 preguntas ni la auditoría privada completa: no se reconstruyen con una versión incompleta.

Tareas del operador, ya ejecutadas sobre la copia privada de trabajo: `npm run exam:sources`, `npm run exam:prepare-drafts`, `npm run exam:import` y `npm run exam:report`. Los dos primeros scripts tienen fecha de corte fija de 2026; una actualización requiere otra versión y revisión. El importador comprueba fuentes y rechaza sobrescribir candidatos existentes modificados. No marca automáticamente borradores como cotejados.

Para probar esta copia local: `npm run dev`, abrir **http://127.0.0.1:3000**, entrar y utilizar **Empezar examen**. Se mantiene toda la navegación anterior. Para estudiar desde el iPhone sin ordenador aún hace falta completar el despliegue real descrito en [la guía Netlify/Supabase](despliegue-iphone.md).

Supabase ya está conectado y las tres tablas se migraron con RLS y acceso público denegado. Se comprobó insertar/actualizar mediante una transacción revertida. Todavía no se ha importado el banco completo al proyecto real ni hay una aplicación remota configurada. Faltan autorización Netlify y secretos del servidor; no hay URL real comprobada ni instalación física en iPhone validada. No se han activado servicios de pago.

## Verificación y conservación

La batería actual contiene **59 pruebas automatizadas, todas superadas**, y TypeScript correcto. Incluye puntuación, reservas acreditadas, discrepancias, normalización, cortes temporales, selección incompleta, ocultación de correcciones, conflictos y resultados inmutables. El caso sintético de 105 preguntas existe únicamente en tests: no se importa ni cuenta como banco real.

La compilación real de Netlify/OpenNext también pasa. La función empaquetada se probó en un ejecutor local contra PostgreSQL real con certificado TLS verificado: importación repetible de las 2.100 filas, 14 modelos disponibles, examen completo corregido con 75 aciertos/25 errores, discrepancia jurídica, bloqueo del generador y resultados conservados tras reiniciar. Chromium comprobó a 1.440 y 390 píxeles guardar y retomar entre dos sesiones, marcas, blancos, corrección final, ausencia de desbordamiento y cero errores JavaScript; también pasaron manifiesto, service worker y sincronización del explorador anterior. Se corrigió una demora visual al seleccionar alternativas: ahora se marcan de inmediato y se restaura el estado anterior si falla la persistencia.

Storage y la caché de Netlify se simularon mediante sus contratos locales; esa prueba no certifica un despliegue remoto. La prueba independiente en Supabase real solo comprende la migración y la transacción revertida descritas arriba. El ensayo completo ocupó 104,3 MB de PostgreSQL; la transferencia privada actual preparada requiere 112,7 MB de archivos, dentro del margen gratuito comprobado. La instalación física en Safari/iPhone sigue pendiente de HTTPS real.

Se verificó que las filas de las 12 tablas anteriores siguen presentes e idénticas, incluidas las 2.100 preguntas y los 15.569 eventos de auditoría previos. Los 124 archivos anteriores bajo `data/` incluidos en el ZIP privado conservan su huella. Las importaciones nuevas añaden 108 candidatos separados y sus eventos, sin sesiones de práctica artificiales en la base personal. El ZIP anterior se conserva sin reemplazarlo.
