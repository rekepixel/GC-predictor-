# Cotejo documental de 2026

Fecha de consulta: 14/10/2026. Proyecto existente conservado. Este informe distingue **contenido publicado comprobado** de **firmeza administrativa de las respuestas**. No presenta un examen definitivamente validado si falta esta última evidencia.

## Resultado

| Control              | Resultado                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Convocatoria         | Resolución 160/38243/2026, 5 de mayo; BOE-A-2026-9982                                                                               |
| Sesión               | 11 de julio de 2026, según cuadernillos y página oficial                                                                            |
| Cuadernillos         | A y B, descargados de Guardia Civil y conservados con SHA-256                                                                       |
| Sección              | Exclusivamente conocimientos generales, páginas 3–17 de cada PDF                                                                    |
| Registros            | 105 por modelo: preguntas 1–100 y reservas 101–105                                                                                  |
| Integridad del texto | Dos motores locales independientes: pypdf y pdfplumber; coincidencia de caracteres salvo espacios                                   |
| Alternativas         | Cuatro opciones no vacías y distintas por pregunta                                                                                  |
| Correspondencia      | 105 parejas A/B, uno a uno; orden de opciones conservado y mapeado                                                                  |
| Clave aplicada       | PDF nº 2 oficial corregido, comprobado frente al PDF nº 1                                                                           |
| Correcciones         | Exclusivamente A7 y B88: C → A                                                                                                      |
| Reservas             | 5 únicas, inactivas: 101 B, 102 C, 103 D, 104 B, 105 D                                                                              |
| Frecuencias          | 100 preguntas ordinarias únicas de una sesión; modelos y reservas excluidos del denominador                                         |
| Firmeza final        | Pendiente: la publicación consultada dice corregida, sin acreditar expresamente una clave final ni la relación final de anulaciones |
| Estado persistido    | `reviewed` + evidencia documental; ninguna promoción a `validated`                                                                  |

No hay una segunda revisión humana independiente de las 210 transcripciones. La comprobación literal es automatizada con dos motores sobre los originales; se inspeccionaron visualmente las tablas de respuestas y la diferencia de puntuación indicada abajo. Esta limitación consta en el artefacto. La correspondencia con una clave publicada no certifica la verdad jurídica material de todas sus respuestas.

## Fuentes oficiales recuperadas

1. [Página del proceso de ingreso](https://web.guardiacivil.es/es/tramites/ingresos/ingresocuerpo/): enlaza los cuadernillos y anuncia expresamente que PDF nº 2 corrige A7/B88.
2. [Cuadernillo A](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/Procesos_Selectivos_2026/INGRESO-GC-2026-TIPO-A.pdf).
3. [Cuadernillo B](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/Procesos_Selectivos_2026/INGRESO-GC-2026-TIPO-B.pdf).
4. [PDF nº 2 corregido](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/PLANTILLAS-INGRESO_CABOS_-Y_GUARDIAS.-2026-2.pdf).
5. [PDF nº 1 sustituido](https://web.guardiacivil.es/export/sites/guardiaCivil/documentos/pdfs/2026/Procesos_Selectivos_2026/PLANTILLAS-INGRESO-CABOS-Y-GUARDIAS.-2026.pdf).
6. [Convocatoria BOE-A-2026-9982](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-9982).
7. API oficial de legislación consolidada del BOE: `https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{id}/texto`. Las referencias guardan bloque, fragmento, versión, URL y huella del XML consultado.

Las cinco descargas recientes respondieron HTTP 200. Las huellas de A, B y PDF nº 2 coinciden con los originales ya conservados. Registro en `data/research/2026-retrieval.json`; copia HTML de la página en `data/research/2026-process-page.html`. La fecha de consulta no se usa como fecha de publicación.

## Discrepancias documentadas y correcciones

- **A7 / B88:** PDF nº 1 da C; PDF nº 2 da A. La aplicación almacena A (`correct:0`) en ambos y conserva los dos documentos. El anterior queda `superseded`; se rechaza su asociación por identificador, URL o huella conocidos.
- **A28 / B62:** opción C «Noveno» en A, «Noveno.» en B. Se conserva cada literal; la pareja está documentada como excepción verificada de puntuación, sin generalizar una normalización que borre signos de otras preguntas.
- **Cabecera de las plantillas:** contiene «160/3824032026 de 23 de mayo»; los cuadernillos y la convocatoria identifican 160/38243/2026 de 5 de mayo. Se conserva el original y se registra la errata, sin alterar su contenido.
- **Artículos propuestos:** se corrigieron asociaciones iniciales contrastándolas con el texto BOE. Una propuesta del TSV no se publica como artículo hasta localizar el bloque y un fragmento pertinente en la versión histórica.
- **Apartados no confirmados:** nueve propuestas (A11, A22, A23, A35, A36, A49, A61, A70 y A77) se mantienen como `paragraph:null`; el artículo sí tiene evidencia. La propuesta se conserva para revisión, separada de la referencia publicada.
- **A7:** la resolución internacional sugerida no pudo verificarse en su fuente primaria; no se asigna una norma/artículo inferidos como si estuvieran comprobados.
- Cero anulaciones registradas **no demuestra** ausencia de anulaciones. No se activó ninguna reserva sin acuerdo oficial.

## Temas, conceptos y normas

Los títulos de las preguntas y el programa oficial permiten clasificar las 105 preguntas, incluidas reservas. Se guarda un concepto curado independiente del enunciado, el método de clasificación y su revisión. Los valores de confianza de las reglas genéricas no son probabilidades calibradas.

Se identifican normas a partir del título expreso del cuadernillo. La verificación de su artículo es un control diferente: **76 localizaciones BOE**, de las cuales 5 pertenecen a reservas y 3 son preámbulo/disposiciones, dejan **68 referencias numéricas ordinarias**. Cada una aparece una vez en esta sesión. Hay 53 denominaciones normativas en las ordinarias; identificar la norma citada no implica haber cotejado todos sus artículos.

Para cada bloque BOE se elige una versión cuya publicación y entrada en vigor no sean posteriores al **11/07/2026**. El texto consolidado es informativo; se guarda la versión y el fragmento. No se certifica su vigencia actual ni para 2027. Si falta coincidencia inequívoca, no se asigna referencia. Los apartados requieren un cotejo adicional dentro de su sección.

## Registro anual del archivo existente

| Año  | Registros importados | Ordinarias únicas cotejadas | Firmeza definitiva acreditada | Registros literales pendientes | Exclusiones/pendientes                                                                          |
| ---- | -------------------: | --------------------------: | ----------------------------: | -----------------------------: | ----------------------------------------------------------------------------------------------- |
| 2026 |                  210 |                         100 |                             0 |                              0 | 100 variantes ordinarias A/B; 5 reservas únicas inactivas; 100 ordinarias pendientes de firmeza |
| 2025 |                    0 |                           0 |                             0 |                    Desconocido | 3 PDF secundarios, sin autenticar ni importar                                                   |
| 2024 |                    0 |                           0 |                             0 |                    Desconocido | 8 PDF secundarios, sin autenticar ni importar                                                   |
| 2023 |                    0 |                           0 |                             0 |                    Desconocido | Falta documentación primaria accesible                                                          |
| 2022 |                  630 |                           0 |                             0 |                            630 | Borradores conservados, excluidos del análisis                                                  |
| 2020 |                    0 |                           0 |                             0 |                    Desconocido | 4 modelos escaneados registrados; falta OCR/transcripción                                       |

En 2023–2025 no se inventa un total de preguntas pendientes ni se da por válida la fecha del nombre de un PDF. Se repitieron las 16 rutas oficiales anteriores catalogadas: devolvieron 404. Las copias secundarias proceden de Método GC (2025) y Ser Guardia Civil (2024). La consulta de la página secundaria de 2023 devolvió 403, sin eludir el bloqueo. Catálogo y seguimiento: `data/research/2023-2025-follow-up.json`.

## Reproducción y garantías de integridad

`python/verify_2026.py` produce `data/verified/2026-documentary.json`. `python/curate_2026.py` produce clasificación y evidencia normativa desde `2026-curation.tsv`. `scripts/seal-bank.ts` registra sus huellas y las de las fuentes; `scripts/apply-verified.ts` las verifica y actualiza la base transaccionalmente, sin borrar filas ni sustituir revisiones manuales. La aplicación carga ese banco en una base nueva sin requerir Python.

La elegibilidad documental se comprueba en servidor con una huella de enunciado, opciones, respuesta, fuente, clave, grupo canónico y mapa de opciones, además de las huellas oficiales. Cambiar esos campos invalida el cotejo; editar contenido también retira la evidencia de la pareja. Una anulación se propaga a sus equivalentes, conservando registros y auditoría. La sustitución de plantilla retira la evidencia previa.

Las pruebas de integración usan una SQLite temporal y los documentos auténticos conservados. Comprueban corrección, correspondencia, reservas, denominador, historial, rechazo de clave sustituida, alteraciones, idempotencia y anulaciones. No modifican la base personal.

## Estadísticas disponibles y límites

Dashboard de frecuencias temáticas y normativas, 100 conceptos curados con una aparición cada uno, 68 fichas de artículos con historial y fuentes, explorador por tema y registro anual funcionan con el corpus documental. Derechos Humanos 12, Procesal 9, Guardia Civil 9 y Constitucional 7 son recuentos sobre 100 ordinarias.

No hay comparación histórica sustantiva con un solo año. La puntuación heurística devuelve `null` y la vista muestra apariciones; las probabilidades siguen `null`. Retrospectiva y simulacros exigen el corpus estricto con clave definitiva y permanecen sin datos habilitados. Tampoco se afirma que el método supere frecuencia histórica o azar: aún no hay evaluación real posible.

Siguiente control necesario: acuerdo final/relación de anulaciones de 2026. Después, autenticar 2025, verificar cada sesión y ampliar 2024/2023; la publicación secundaria no sustituye esta comprobación.
