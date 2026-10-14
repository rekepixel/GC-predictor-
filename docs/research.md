# Investigación de fuentes oficiales — GC Predictor

Fecha de consulta: **14 de octubre de 2026 (UTC)**. El detalle reproducible de cada URL, acceso, procedencia, fecha y SHA-256 está en [`data/source-catalog.json`](../data/source-catalog.json). Esta investigación describe documentos; **descargar un PDF no equivale a importar ni validar un examen**.

**Actualización:** el nuevo cotejo y las descargas secundarias se documentan al final y en [validación de 2026](validation-2026.md). La tabla inicial se conserva como registro de la primera recopilación.

## Dónde publica la Guardia Civil

El punto principal es la [página oficial de ingreso a la Escala de Cabos y Guardias](https://web.guardiacivil.es/es/tramites/ingresos/ingresocuerpo/). La [página oficial del procedimiento](https://web.guardiacivil.es/es/tramites/autorizaciones-de-armas-y-explosivos/Procedimiento-de-ingreso-directo-en-la-Escala-de-Cabos-y-Guardias-de-la-Guardia-Civil/) reúne el programa, las normas del proceso y los enlaces de convocatoria. Las convocatorias se contrastan con el **BOE**, por ejemplo [BOE-A-2026-9982](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-9982).

Las páginas vivas se actualizan y algunos cuadernillos de años anteriores dejan de responder aunque continúen apareciendo en un buscador. La ausencia en la página actual no demuestra que no exista el documento. Una vista indexada tampoco demuestra que su descarga siga disponible.

Se siguieron redirecciones HTTP normales de `www.guardiacivil.es/documentos/...` al portal `web.guardiacivil.es/export/sites/guardiaCivil/documentos/...`. No se usaron credenciales, formularios, mecanismos de evasión, rastreo indiscriminado ni datos personales de aspirantes. `robots.txt` del portal respondió 404; sólo se consultaron páginas/enlaces públicos concretos, con concurrencia limitada. Un índice secundario devolvió 403 al descargar su HTML: se registró y no se eludió.

## Recopilación inicial, antes del nuevo cotejo de 2026

| Año  | Cuadernillos oficiales descargados | Plantillas descargadas | Situación                                                                            |
| ---- | ---------------------------------: | ---------------------: | ------------------------------------------------------------------------------------ |
| 2017 |                                  0 |                      0 | Se encontraron índices secundarios; falta original oficial verificable.              |
| 2018 |                                  0 |                      0 | Se encontraron índices secundarios; falta original oficial verificable.              |
| 2019 |                                  0 |                      0 | Se encontraron índices secundarios; falta original oficial verificable.              |
| 2020 |                                  4 |                      2 | Dos pares A/B y sus plantillas, originales oficiales accesibles.                     |
| 2021 |                                  0 |                      1 | Sólo plantilla oficial; no se cuenta como examen disponible.                         |
| 2022 |                                  6 |                      3 | Tres pares A/B y plantillas; claves escaneadas requieren OCR y revisión.             |
| 2023 |                                  0 |                      0 | Rutas oficiales localizadas devolvieron 404.                                         |
| 2024 |                                  0 |                      0 | Rutas oficiales consultadas devolvieron 404; sesiones requieren contraste adicional. |
| 2025 |                                  0 |                      0 | Cuadernillos A/B y plantilla indexados devolvieron 404.                              |
| 2026 |                                  2 |                      1 | Un par A/B y plantilla oficial corregida nº 2.                                       |

**12 cuadernillos oficiales** corresponden como máximo a **6 sesiones candidatas** (dos 2020, tres 2022, una 2026), antes de verificar fechas, deduplicar A/B y revisar preguntas. No son 12 exámenes independientes. Hay **7 PDFs de claves relevantes** contando la plantilla aislada de 2021. También se conserva un PDF de aptitudes intelectuales de 2022, que se excluye de conocimientos generales, y dos documentos del temario. Total: **22 PDFs oficiales descargados**. El catálogo no contiene preguntas ni estadísticas inventadas. Exámenes validados por esta investigación: **0**.

Se dejaron originales en `data/raw`. Cada descarga se verificó como PDF y se calculó SHA-256. Las fechas exactas de publicación se dejan como `null` cuando no constan expresamente. Ni la fecha del examen, ni la fecha interna de creación de un PDF, ni el año de su carpeta prueban su publicación pública.

## Convocatoria 2026: evidencia y correcciones

La fecha de examen **11/07/2026** se verificó en la propia [página oficial](https://web.guardiacivil.es/es/tramites/ingresos/ingresocuerpo/), en las portadas oficiales y en la clave; no se asumió porque el entorno estuviera fechado en 2026.

Se descargaron [tipo A](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/Procesos_Selectivos_2026/INGRESO-GC-2026-TIPO-A.pdf) y [tipo B](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/Procesos_Selectivos_2026/INGRESO-GC-2026-TIPO-B.pdf), 19 páginas cada uno. Ambos incluyen otras pruebas. Para el banco objetivo deben extraerse sólo **conocimientos generales, preguntas 1–100 y reservas 101–105**, conservando `isReserve` y las otras secciones separadas.

La [plantilla oficial nº 2](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/PLANTILLAS-INGRESO_CABOS_-Y_GUARDIAS.-2026-2.pdf) sustituye la nº 1. La web identifica una corrección de la respuesta de **A7/B88**. El PDF nº 2 contiene las claves de A/B y, en su segunda página, las reservas de conocimientos para ambos: **101 B, 102 C, 103 D, 104 B, 105 D**. Esto permite cotejar cada reserva; no autoriza incorporarla al denominador de 100 preguntas puntuables si no hay evidencia de activación.

El PDF de clave contiene una errata en los datos de resolución del encabezado. La portada de los cuadernillos y el BOE identifican correctamente la **Resolución 160/38243/2026, de 5 de mayo**. Guardar la discrepancia como nota del documento, sin alterar el texto literal de las preguntas.

La [resolución de resultados definitivos de 24/07/2026](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/Procesos_Selectivos_2026/IngresoGC_2026/PUBLICACION-RESOLUCION-RESULTADOS-DEFINITIVOS-PRUEBAS-ESCRITAS.pdf) se descargó temporalmente y se inspeccionó su primera página visualmente. Publica resultados definitivos tras revisión y menciona modificaciones de resultados, pero **no enumera cambios de respuesta ni una relación de preguntas anuladas**. El fichero completo es un listado de aspirantes de aproximadamente 83 MB, innecesario para el banco; no se incorpora al repositorio.

**No confundir resultados definitivos con plantilla definitiva.** La web actual presenta nº 2 como clave corregida vigente, pero su carácter definitivo no aparece rotulado expresamente. El catálogo conserva `definitive: false`, con `answerKeyStatus: corrected_official_not_explicitly_final`. Hace falta revisión documental antes de validar preguntas. Tampoco se deduce que no haya anulaciones sólo porque no se hayan localizado.

## Años anteriores y diferencias de sesión

Los cuadernillos 2020 llevan `2000` en parte del nombre del archivo aunque se alojan en la carpeta 2020 y pertenecen a esa convocatoria. El nombre de un fichero no determina por sí mismo el año del examen. Las plantillas localizadas distinguen **24 y 25 de octubre de 2020**. Se han preservado los cuatro modelos y las dos claves.

Los originales 2022 distinguen modelos **1A/1B**, **2A/2B** y **3A/3B**. Las claves corresponden a **25/09/2022**, **24/09/2022** y una tercera sesión atribuida a Canarias por índices secundarios. La **fecha exacta del modelo 3 y su relación con la sesión Canarias quedan pendientes** de lectura/revisión del documento oficial. No se adivina esa fecha. Los PDFs de claves contienen páginas de imagen sin texto recuperable mediante `pdftotext`; deben someterse a OCR y cotejo humano antes de asociar respuestas.

En 2021 se descargó `6_PLANTILLAS_PRUE_CORREC_25_SEP_INGR_21.pdf`, pero no un cuadernillo oficial. La referencia secundaria de una misma clave para ambas jornadas no se adopta sin comprobar cada página de la plantilla. No genera registros de preguntas ni cobertura de examen completo.

Las rutas oficiales encontradas para 2023, 2024 y 2025 respondieron **404**. Se conservan sus URLs exactas en el catálogo como pistas documentales reales, con `authenticity: document_not_verified`, sin atribuirles contenido. Los resúmenes de buscador no se importan como originales.

En 2024 hay discrepancias entre índices secundarios: uno distribuye modelos entre 28/09, 29/09 y 13/10; otro sitúa modelos 1/2 el 28/09. El título oficial indexado de resultados definitivos menciona **28/09 y 13/10**. No se ha verificado en esta sesión el acuerdo de suspensión/repetición ni cuáles modelos se utilizaron realmente. **No contar las fechas/etiquetas de un índice secundario como exámenes válidos para frecuencias o validación temporal.**

Los índices secundarios [MAD](https://mad.es/blog/examenes-guardia-civil-pdf/) y [Tercio14](https://tercio14.com/oposicion/examenes) ayudaron a descubrir rutas históricas y carencias 2017–2019. MAD también enlaza copias de academia de 2017, 2021, 2025 y años anteriores (2007, 2008, 2010, 2011, 2014). Estas copias **no se han descargado ni incorporado**: quedan como alternativa manual con procedencia secundaria y autenticidad pendiente. No se copiaron sus explicaciones ni transcripciones.

## Temario de referencia 2026 y actualización 2027

La [página corporativa del procedimiento de ingreso](https://web.guardiacivil.es/es/tramites/autorizaciones-de-armas-y-explosivos/Procedimiento-de-ingreso-directo-en-la-Escala-de-Cabos-y-Guardias-de-la-Guardia-Civil/) describe la convocatoria 2026 y enlaza como temario el [PDF actualizado 2024](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2024/TEMARIO_INGRESO_GC_ACTUALIZADO_2024.pdf), de 8 páginas. Se verificaron sus **25 números y títulos**; están en [`data/syllabus-2026.json`](../data/syllabus-2026.json). Temas 1–23: conocimientos generales; 24: inglés; 25: lengua española.

Se descargó también la [resolución de actualización de 29/05/2023](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/tablon_de_anuncios/MODIFICACION_29_05_2023_Temario_GUARDIAS.pdf). No se ha inventado una resolución de temario 2026. La referencia es «documento actualmente enlazado oficialmente en la información de 2026». La publicación exacta del PDF y su fecha inicial de validez no se presumen a partir de su nombre.

La estructura conserva una **versión** y evidencia de procedencia para reemplazarla por una nueva versión 2027 cuando se publique/verifique. Estado 2027: **no verificado ni importado**. No hay temario 2027 inventado. No sobrescribir el programa histórico: una evaluación de 2024 sólo puede usar información y delimitación temática disponibles antes de ese examen. El título de un tema no demuestra por sí solo la vigencia de todos sus artículos; contrastar cada norma con su versión BOE y fecha de examen.

## Reglas recomendadas para importación y validación

1. Registrar documento original, SHA-256, URL, fecha de consulta, fecha de publicación conocida y estado de acceso. Si la URL no responde, admitir PDF manual y mantener `pending_review` hasta verificar procedencia.
2. Separar conocimientos generales de ortografía, gramática, inglés y aptitudes intelectuales antes de extraer preguntas. Distinguir reservas, preguntas activadas, anuladas y puntuables.
3. Conservar enunciado y opciones literales, número original, página y modelo. No corregir errores jurídicos/tipográficos del original silenciosamente. Anotar correcciones en un campo separado.
4. Emparejar pregunta con su clave de la misma convocatoria, fecha y modelo. La extracción de la clave es independiente; OCR incompleto, letras ambiguas y claves sustituidas bloquean validación.
5. Establecer carácter definitivo sólo con documento expreso o revisión documentada del expediente; registrar qué evidencia lo respalda. No convertir «oficial» en «definitivo» automáticamente.
6. Deduplicar A/B **dentro de una misma sesión**, verificando texto, conjunto de opciones y coherencia de clave. Permutaciones de preguntas/opciones necesitan un mapa; no usar sólo número. Una repetición de otro año permanece como otra aparición legítima.
7. Separar concepto de texto literal. Guardar clasificación, confianza, fuente normativa y estado de revisión. Una asignación automática no demuestra artículo preciso ni concepto validado.
8. Para estadísticas, usar exclusivamente las filas cuyo estado exige el análisis, mostrar denominador, sesiones/años disponibles y calidad de cobertura. Un faltante documental no equivale a ausencia del contenido.
9. No calcular probabilidades de examen a partir de estos PDFs. Con tres años candidatos y revisión incompleta faltan datos para validación 2024–2026 y calibración predictiva.

## Siguiente intervención documental

Revisar primero **2026 A/B + clave corregida**, confirmar el carácter definitivo y conservar el mapa A/B. Después cotejar/OCR 2020 y 2022. Obtener manualmente cuadernillos y **plantillas definitivas** 2023, 2024 y 2025, junto con acuerdos de anulaciones y sesiones. Esos años son imprescindibles para una evaluación retrospectiva 2024, 2025 y 2026 sin fugas de información futura.

## Seguimiento: banco documental 2026 y fuentes 2023–2025

Se han recuperado de nuevo A, B, PDF nº 2 y el PDF nº 1 original; los tres originales ya retenidos conservan idéntica huella. La página oficial confirma A7/B88 corregidas y el cotejo de ambas claves confirma C→A como únicos cambios. Se conservan ahora **23 PDF de procedencia oficial** y **11 copias secundarias** pendientes (3 de 2025 y 8 de 2024), con un catálogo de 57 fuentes. Los documentos de resultados personales y los análisis de academia no se incorporan.

Las 16 rutas primarias anteriores consultadas volvieron a responder 404. Se han localizado copias desde [Método GC 2025](https://metodogc.com/examenes-oposiciones-guardia-civil/examen-2025/) y [Ser Guardia Civil 2024](https://serguardiacivil.es/examen-guardia-civil-2024/). Ser Guardia Civil es una fuente secundaria: no pertenece al dominio institucional. Para clasificar dominios se exige coincidencia exacta o subdominio con punto, evitando confundir nombres parecidos. La página secundaria de 2023 consultada respondió 403 y se respetó el bloqueo.

Las copias de 2024 no prueban qué sesiones se celebraron o repitieron; sus nombres no establecen fechas acreditadas. Ninguna pregunta secundaria entra en el análisis. Seguimiento HTTP y huellas: `data/research/2023-2025-follow-up.json`.

El nuevo banco contiene 210 ocurrencias cotejadas (105 parejas): 100 ordinarias únicas y 5 reservas únicas. Mantiene firmeza no acreditada; habilita sólo frecuencias descriptivas y conserva la exigencia definitiva para retrospectiva y simulacros. Informe del protocolo, referencias BOE históricas y discrepancias en [validación de 2026](validation-2026.md).
