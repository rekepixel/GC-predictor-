# Auditoría de las 700 preguntas · 14/10/2026

La base conserva **2.100 registros**, incluidas las 630 preguntas antiguas en borrador. El corpus descriptivo sigue teniendo **700 ordinarias únicas**, 35 reservas separadas, siete formas de examen y seis sesiones celebradas. No se han eliminado modelos ni registros: las 700 variantes B ordinarias quedan fuera del denominador estadístico. Tampoco se ha cambiado ninguna letra de respuesta, enunciado, alternativa, correspondencia A/B o fuente previa.

| Año | Ordinarias cotejadas únicas | Reservas separadas | Con localización normativa | Con respuesta final y anulaciones acreditadas |
| --- | ---: | ---: | ---: | ---: |
| 2023 | 200 | 10 | 26 | 0 |
| 2024 | 300 | 15 | 42 | 0 |
| 2025 | 100 | 5 | 13 | 0 |
| 2026 | 100 | 5 | 71 | 0 |

Las reservas no forman parte de las frecuencias. Una referencia normativa localizada no convierte una clave documental en respuesta final certificada. Las clasificaciones de las 700 ordinarias siguen pendientes de confirmación manual.

## Resultado y alcance de la revisión

Se ha realizado una **segunda pasada asistida sobre las 700 entradas**, con un archivo de entrada que oculta etiquetas y confianza anteriores. Se propuso un foco de contenido por pregunta a partir del enunciado y la alternativa señalada en la clave y, después, se reconcilió con las etiquetas anteriores. Los cuatro textos de opción quedan conservados y pasan comprobaciones estructurales. **Esto no equivale a una segunda lectura jurídica exhaustiva de las cuatro alternativas por un experto humano.**

La pasada procede del mismo asistente que conoce el historial de trabajo: ocultar campos en el archivo limita la dependencia directa, pero **no demuestra independencia entre revisores o modelos**. Hay **cero revisiones humanas independientes acreditadas y 700 revisiones manuales pendientes**. Las propuestas no certifican la respuesta del Tribunal.

Se retira la confianza media/alta que `curate_concepts.py` asignaba por «señale», «indique» o «proposición». El código de reproducción histórica queda conservado en `python/curate_concepts_legacy.py`; el comando actual ejecuta la auditoría y no regenera ni sobrescribe sus evidencias selladas. También se corrige la confirmación manual para que conserve el identificador conceptual vigente cuando existen etiquetas históricas con el mismo nombre; así no divide silenciosamente sus recuentos. La aplicación usa `unassessed`, guarda la confianza antigua únicamente como metadato histórico y deja de mostrarla como garantía de calidad.

Cada entrada nueva registra huella del literal y opciones, propuesta, etiqueta anterior, motivo, polaridad, alcance y comprobaciones pendientes. La cola prioriza conflicto documental, familias que mezclan reglas, preguntas negativas, foco dependiente de opciones, ausencia de artículo/versiones y subaspecto poco específico. **El riesgo ordena trabajo; no es confianza, probabilidad ni exactitud calibrada.**

La revisión inicial incluye las **211 antiguas etiquetas medias** y **80 antiguas altas**. La muestra se reproduce ordenando SHA-256 de `gc-audit-2027-v1|identidad` y tomando las primeras 80 de las 489 altas. No se ha usado el resultado retrospectivo para seleccionar la muestra ni modificar pesos.

## Taxonomía: conservar tres niveles

| Nivel | Etiquetas distintas | Presentes en varios años |
| --- | ---: | ---: |
| Materia general | 65 | 59 |
| Concepto o foco de regla propuesto | 652 | 37 |
| Subaspecto anotado | 693 | 6 |

Los subaspectos aún dependen en parte de anotaciones anteriores; **171 etiquetas previas no diferenciaban bien concepto y subaspecto** y quedan señaladas para revisión. Los 652 focos no son una taxonomía jurídica definitivamente validada. No se fuerza su reducción para aparentar más recurrencias.

Se detectan **85 familias anteriores que mezclaban focos distintos**, con 199 preguntas afectadas. Se proponen tres unificaciones que afectan a siete preguntas: conversión entre sistemas angulares, categorías de armas y divisiones de riesgo de explosivos. Compartir catálogo conceptual no afirma que cada opción proceda de la misma regla o apartado.

Ejemplos relevantes:

- El Consejo Asesor del MNP aparecía como una familia de ocho preguntas. Se separan naturaleza, composición, proponentes, designación, mandato, reuniones y retribución. Sólo la naturaleza del órgano forma una pareja conceptual entre 2023 y 2025.
- La tutela civil del honor distingue vías procesales, medidas de reparación y caducidad. El mismo artículo 9 contiene reglas diferentes.
- El límite general de detención en 72 horas sigue separado del supuesto de entrega al juez más próximo en 24 horas.
- Una opción negativa sobre funciones del Rey no se equipara automáticamente a una pregunta positiva sobre competencias del Gobierno.
- Las penas por naturaleza/duración forman un concepto de clasificación; se conservan apartados y tipos de pena para inspeccionar que cinco apariciones no significan cinco repeticiones del mismo subaspecto.

Se mantienen las 14 relaciones explícitas de la fase anterior como evidencias asistidas, diferenciando misma regla, mismo método y subaspectos relacionados. No son una certificación humana ni una enumeración exhaustiva. La aplicación permite abrir sus enunciados y fuentes.

## Recurrencias y retrospectiva: comparación sin ocultar diferencias

Mismos 700 registros documentales, pesos y cortes de años; cambio de taxonomía. Las etiquetas anteriores no se borran.

| Medida | Antes | Ahora |
| --- | ---: | ---: |
| Familias / focos conceptuales | 553 | 652 |
| Familias presentes en varios años | 89 | 37 |
| Familias con años consecutivos | 63 | 17 |
| Grupos de repetición literal | 2 | 2 |
| Preguntas con referencia normativa localizada | 133 | 152 |
| Fichas de artículos numéricos | 122 | 126 |

En la reconstrucción exploratoria, top 10 de conceptos:

| Objetivo | Aciertos heurística anterior | Aciertos nueva | Frecuencia histórica nueva | Preguntas cubiertas nueva |
| --- | ---: | ---: | ---: | ---: |
| 2024 | 3 | 1 | 1 | 2/300 |
| 2025 | 3 | 0 | 0 | 0/100 |
| 2026 | 3 | 1 | 1 | 1/100 |

Con sólo 2023 para entrenar 2024, no se activa puntuación heurística: esa columna es un orden descriptivo. En top 25 la nueva clasificación obtiene 0 conceptos de 2025 y 3 de 2026; en top 50, 1 y 3. La heurística **no supera la frecuencia histórica** en estos cortes. Azar: mismo universo histórico, semilla 2027 y 200 repeticiones; cobertura media nueva top 10 de 0,28 conceptos en 2025 y 0,265 en 2026. Son referencias exploratorias, no pruebas de significación o calibración.

Hay muchos empates: el desempate alfabético hace que el top-k dependa también del nombre de las etiquetas. Por ello, pequeños cambios en aciertos no se interpretan como una mejora estadística. Las particiones no incorporan preguntas de años futuros al entrenamiento. Sin embargo, las etiquetas se construyeron retrospectivamente con conocimiento del conjunto y faltan fechas históricas de publicación verificadas. Por eso la reconstrucción **no acredita anticipación real**. La evaluación estricta permanece sin datos suficientes y las probabilidades siguen siendo `null`. No se concede una bonificación a lo que lleva años sin aparecer. Tampoco se certifica vigencia 2027 ni exclusión del temario sin evidencia.

## Fuentes institucionales de 2023

La URL aportada devuelve **404 con HTML** el 14/10/2026. Las variantes `www`, `web` y `/export/sites/guardiaCivil` probadas tampoco entregan ese PDF. Se ha recuperado la captura del original institucional en Internet Archive:

- [Plantilla actualizada del 28/10/2023, captura 29/12/2023](https://web.archive.org/web/20231229065405id_/https://www.guardiacivil.es/documentos/pdfs/2023/IngresoGC2023/Plantillas_dxa_28OCT2023_Actualizado31oct.pdf). PDF de dos páginas, 1.368.721 bytes. SHA-256 `d0bf2afb60ca711ceabaaf36980602fd3b9729a83c479cc974f2f83d3e6d384b`. El SHA-1 en base32 coincide con el digest del índice CDX. Nueva transcripción visual asistida y comparación de **210 respuestas de conocimientos**: 200 ordinarias A/B y 10 reservas A/B, **cero diferencias**. El resaltado de actualización visible está en ortografía, fuera de este banco.
- [Plantilla del 29/10/2023, captura 14/11/2023](https://web.archive.org/web/20231114132036id_/https://www.guardiacivil.es/documentos/pdfs/2023/IngresoGC2023/Plantillas_dxa_29OCT2023.pdf). SHA-256 `965e9da17e543161e20b305a764515cc9f7533b3c9431fc53b0fd83b23851194`: idéntica byte a byte a la copia ya conservada. Se comprueban 210 vinculaciones al banco usando la transcripción previa; esto se distingue de una nueva transcripción independiente.

Se conserva cada PDF previo, el nuevo archivo, su huella, fecha de captura y comparación por celda. Descarga de original institucional **a través de archivo histórico** se identifica expresamente: no se presenta como una descarga actual del servidor de Guardia Civil. Los cuestionarios de 2023 siguen siendo copias corroboradas; tampoco se acredita con estas plantillas la ausencia de rectificaciones posteriores.

## Fuentes de 2024 y 2025 y discrepancia jurídica

Se han vuelto a comprobar rutas institucionales indexadas, variantes de host, prefijo de exportación, carpeta de convocatoria y archivos CDX. Los resultados incluyen 404, respuestas HTML con HTTP 200 y errores 503 o consultas vacías del archivo. Ninguno de esos casos se registra como PDF descargado. No se ha recuperado una nueva plantilla institucional de 2024/2025. Las copias anteriores de proveedores distintos se mantienen con su procedencia y límites; esto no demuestra que el documento no exista en otra ruta.

Para **2024 2A81 / 2B75**, se vuelve a descargar el XML BOE y seleccionar la versión del artículo 50 de la Ley 42/2007 publicada el **22/09/2015**, vigente desde **07/10/2015**, aplicable al 28/09/2024. Su apartado 1 incluye sitios naturales de Patrimonio Mundial (b), OSPAR (c), Reservas de Biosfera (f) y Reservas biogenéticas (g): **las cuatro opciones están incluidas**.

La copia de plantilla marca A en ambos modelos. **No se cambia esa letra ni se inventa una alternativa jurídicamente correcta o una anulación.** No se ha localizado un acuerdo institucional que cierre la discrepancia; continúa bloqueada para uso con respuesta final. [Consultar artículo y versión BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2007-21490&p=20150922&tn=1#a50).

Se añaden o precisan **31 referencias de regla** contra bloques BOE fechados; 19 preguntas antes sin localización pasan a tenerla, hasta 152. Se conservan XML completos comprimidos, hashes, bloque y versión seleccionada y motivo. Se priorizaron Consejo Asesor del MNP, honor, audiencia del tutor, penas, antecedentes, volante de identificación y procedimiento administrativo. Algunas preguntas no jurídicas no requieren un artículo.

Se señala además para examen manual la redacción de 2025 A9, donde una alternativa parece confundir el tratado con su Comité. Es **una alerta**, sin solución legal nueva ni cambio de respuesta acreditados.

## Entrega, privacidad y reproducción

El repositorio existente de GitHub es **público**. Para respetar la instrucción de no publicar datos, los nuevos PDF, entradas de auditoría, transcripciones, propuestas y base personal se entregan en un **ZIP privado**, excluidos de la subida pública. GitHub recibe el código y este informe agregado. Los archivos ya existentes en el repositorio se conservan; no se cambia su visibilidad.

El paquete completo conserva los informes anteriores y añade:

- `data/verified/quality-audit-700/`: entrada ciega, 700 revisiones, comparación, cola CSV, BOE y manifiesto.
- `data/verified/documentary-audit-2023/`: fuentes archivadas, nueva transcripción, comparaciones por celda y manifiesto.
- `data/research/quality-audit-700/`: intentos de acceso y comparación de análisis anterior/nuevo.
- `.local/gc-predictor.sqlite`: copia consistente de la base personal, sin contraseñas ni variables de entorno.

Con el paquete completo:

```bash
npm ci
npm run data:apply-verified
npm run data:report:audit
npm run dev
```

Abre `http://127.0.0.1:3000`. En **Explorador → Validación**, elige **Auditoría · 211 iniciales + muestra de 80** para ver las 291 entradas ordenadas por riesgo. Abre «Auditoría de clasificación», contrasta todas las opciones y fuentes y usa «Revisar» para corregir. La casilla de confirmación humana viene desmarcada. En **Análisis de patrones → Materia, concepto y subaspecto**, compara los tres niveles y despliega evidencia original. En Prioridades puedes comparar frecuencia y retrospectiva exploratoria; el modo estricto conserva sus límites.

Sólo clonando GitHub se obtiene el banco de la fase anterior y la retirada de confianza; los seis controles de integración del paquete privado se marcan como omitidos si ese paquete no existe. No se presentan como pasados. Para reproducir las 700 revisiones de esta fase se necesita el ZIP completo. No se crean sustitutos ni etiquetas inventadas si faltan sus artefactos.

El despliegue privado, costes y pasos para el iPhone se detallan en [despliegue privado](despliegue-iphone.md). No se ha contratado un servicio ni publicado una web o un contenedor.

Si ya tienes una base propia en otro equipo, conserva su carpeta `.local`: no extraigas encima la base incluida en el ZIP. Haz primero una copia consistente y actualiza código/evidencias; las anotaciones se aplican únicamente al literal cotejado y se preservan revisiones del propietario.
