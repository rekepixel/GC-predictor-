"use client";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  BookOpen,
  Flag,
  Clock3,
  Save,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { api } from "./app";
import type { ExamRun, ExamItem } from "@/lib/exam-engine";

type Run = Omit<ExamRun, "items"> & {
  items: (Pick<
    ExamItem,
    "id" | "number" | "reserve" | "origin" | "stem" | "options" | "topicId"
  > &
    Partial<ExamItem>)[];
};
type Home = {
  exams: {
    id: string;
    year: number;
    session: string;
    heldAt: string | null;
    model: string;
    notes: string;
    documentaryOnly: boolean;
    issues: { number: number; description: string }[];
  }[];
  sessions: {
    id: string;
    title: string;
    status: string;
    answered: number;
    updatedAt: string;
  }[];
  bank: { total: number; eligible: number; pending: number };
  profile: {
    questions: number;
    topics: Record<string, number>;
    formats: Record<string, number>;
    polarity: Record<string, number>;
    limitations: string[];
  };
  retrospective: unknown[];
};
const clock = (seconds: number) =>
  `${Math.floor(seconds / 3600)
    .toString()
    .padStart(
      2,
      "0",
    )}:${Math.floor(seconds / 60) % 60 < 10 ? "0" : ""}${Math.floor(seconds / 60) % 60}:${(seconds % 60).toString().padStart(2, "0")}`;
export default function ExamHub() {
  const [home, setHome] = useState<Home | null>(null),
    [run, setRun] = useState<Run | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [examId, setExamId] = useState(""),
    [weight, setWeight] = useState(1),
    [blocked, setBlocked] = useState<{
      blueprintId: string;
      shortages: { topicId: string; needed: number; available: number }[];
      plan: {
        topics: Record<string, number>;
        negative: number;
        recurringConceptTarget: number;
      };
    } | null>(null),
    [review, setReview] = useState("errors");
  const [elapsed, setElapsed] = useState(0);
  const base = useRef({ saved: 0, at: Date.now() });
  function open(value: Run) {
    setRun(value);
    setElapsed(value.elapsedSeconds);
    base.current = { saved: value.elapsedSeconds, at: Date.now() };
    const u = new URL(location.href);
    u.searchParams.set("examen", value.id);
    history.replaceState(null, "", u);
  }
  async function load() {
    setHome(await api("exam-home"));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
    const id = new URL(location.href).searchParams.get("examen");
    if (id)
      api("exam-runs/" + encodeURIComponent(id))
        .then(open)
        .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!run || run.status !== "in_progress") return;
    const timer = setInterval(
      () =>
        setElapsed(
          base.current.saved +
            Math.floor((Date.now() - base.current.at) / 1000),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [run?.id, run?.status]);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function save(
    changes: Partial<Pick<Run, "answers" | "flagged" | "currentIndex">> = {},
    finish = false,
  ) {
    if (!run) return;
    const previous = run;
    // Reflect the choice immediately while the disabled controls wait for persistence.
    // Restore the saved snapshot on error; stale revisions still require explicit recovery.
    setRun({ ...run, ...changes });
    try {
      const next = await api(
        (finish ? "exam-finish/" : "exam-runs/") + run.id,
        {
          revision: run.revision,
          answers: changes.answers || run.answers,
          flagged: changes.flagged || run.flagged,
          currentIndex: changes.currentIndex ?? run.currentIndex,
          elapsedSeconds: elapsed,
        },
        finish ? "POST" : "PATCH",
      );
      open(next);
    } catch (e) {
      setRun(previous);
      throw e;
    }
  }
  const close = () => {
    setRun(null);
    setBlocked(null);
    const u = new URL(location.href);
    u.searchParams.delete("examen");
    history.replaceState(null, "", u);
    load().catch((e) => setError(e.message));
  };
  if (run) {
    const q = run.items[run.currentIndex];
    const finished = run.status === "finished",
      result = run.result;
    return (
      <div className="exam-workspace">
        <div className="page-title">
          <div>
            <p className="eyebrow">
              {run.mode === "historical"
                ? "EXAMEN OFICIAL · PRÁCTICA DOCUMENTAL"
                : "PREGUNTAS INÉDITAS · ORIENTACIÓN 2027"}
            </p>
            <h1>{run.title}</h1>
          </div>
          <button className="secondary" disabled={busy} onClick={close}>
            <ArrowLeft size={16} />
            Mis exámenes
          </button>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() =>
                perform(async () => open(await api("exam-runs/" + run.id)))
              }
            >
              Recuperar última versión guardada
            </button>
          </div>
        )}
        {!finished ? (
          <>
            <div className="exam-toolbar">
              <span>
                <Clock3 size={16} />
                {clock(elapsed)} transcurrido
              </span>
              <span>
                {
                  Object.keys(run.answers).filter((id) =>
                    run.items.some((x) => x.id === id && !x.reserve),
                  ).length
                }
                /100 ordinarias respondidas
              </span>
              <button
                disabled={busy}
                className="secondary"
                onClick={() =>
                  perform(async () => {
                    await save();
                    close();
                  })
                }
              >
                <Save size={16} />
                {busy ? "Guardando…" : "Guardar y continuar después"}
              </button>
            </div>
            <p className="notice amber">
              Las respuestas y correcciones se ocultan hasta finalizar. Las
              cinco reservas están separadas y solo puntúan si sustituyen una
              anulación acreditada. El tiempo mostrado corresponde a esta
              práctica de conocimientos.
            </p>
            <div className="exam-layout">
              <section className="panel exam-question">
                <p className="eyebrow">
                  {q.reserve
                    ? `RESERVA ${run.items.filter((x) => x.reserve).indexOf(q) + 1} · SIN PUNTUAR SALVO SUSTITUCIÓN`
                    : `PREGUNTA ${run.items.filter((x) => !x.reserve).indexOf(q) + 1} DE 100`}
                </p>
                <h2 className="literal">{q.stem}</h2>
                <fieldset className="exam-options" disabled={busy}>
                  <legend className="sr-only">
                    Selecciona una alternativa o deja en blanco
                  </legend>
                  {q.options.map((o, i) => (
                    <label
                      key={i}
                      className={
                        run.answers[q.id] === i
                          ? "exam-choice selected"
                          : "exam-choice"
                      }
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={i}
                        checked={run.answers[q.id] === i}
                        onChange={() =>
                          perform(() =>
                            save({ answers: { ...run.answers, [q.id]: i } }),
                          )
                        }
                      />
                      <strong>{String.fromCharCode(65 + i)}</strong>
                      <span className="literal">{o}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="exam-actions">
                  <button
                    className="text-button"
                    disabled={busy || run.answers[q.id] === undefined}
                    onClick={() =>
                      perform(async () => {
                        const answers = { ...run.answers };
                        delete answers[q.id];
                        await save({ answers });
                      })
                    }
                  >
                    Dejar en blanco
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    aria-pressed={run.flagged.includes(q.id)}
                    onClick={() =>
                      perform(() =>
                        save({
                          flagged: run.flagged.includes(q.id)
                            ? run.flagged.filter((id) => id !== q.id)
                            : [...run.flagged, q.id],
                        }),
                      )
                    }
                  >
                    <Flag size={16} />
                    {run.flagged.includes(q.id)
                      ? "Marcada para revisar"
                      : "Marcar para revisar"}
                  </button>
                </div>
                <div className="exam-actions">
                  <button
                    className="secondary"
                    disabled={busy || run.currentIndex === 0}
                    onClick={() =>
                      perform(() =>
                        save({ currentIndex: run.currentIndex - 1 }),
                      )
                    }
                  >
                    <ArrowLeft size={16} />
                    Anterior
                  </button>
                  <button
                    className="primary"
                    disabled={busy || run.currentIndex === run.items.length - 1}
                    onClick={() =>
                      perform(() =>
                        save({ currentIndex: run.currentIndex + 1 }),
                      )
                    }
                  >
                    Siguiente
                    <ArrowRight size={16} />
                  </button>
                </div>
              </section>
              <aside className="panel exam-map">
                <h2>Navegar por el examen</h2>
                <div className="exam-number-grid">
                  {run.items.map((item, index) => (
                    <button
                      key={item.id}
                      disabled={busy}
                      className={[
                        index === run.currentIndex ? "current" : "",
                        run.answers[item.id] !== undefined ? "answered" : "",
                        run.flagged.includes(item.id) ? "flagged" : "",
                      ].join(" ")}
                      aria-label={`${item.reserve ? "Reserva" : "Pregunta"} ${item.reserve ? index - 99 : index + 1}${run.flagged.includes(item.id) ? ", marcada" : ""}`}
                      aria-current={
                        index === run.currentIndex ? "step" : undefined
                      }
                      onClick={() =>
                        perform(() => save({ currentIndex: index }))
                      }
                    >
                      {item.reserve ? `R${index - 99}` : index + 1}
                    </button>
                  ))}
                </div>
                <p className="muted">
                  Verde: respondida · borde ámbar: marcada. R1–R5: reservas.
                </p>
                <details>
                  <summary>Finalizar y corregir</summary>
                  <p>
                    {100 -
                      Object.keys(run.answers).filter((id) =>
                        run.items.some((x) => x.id === id && !x.reserve),
                      ).length}{" "}
                    ordinarias quedarán en blanco. Al finalizar no se pueden
                    cambiar las respuestas.
                  </p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => perform(() => save({}, true))}
                  >
                    Finalizar examen
                    <CheckCircle2 size={16} />
                  </button>
                </details>
              </aside>
            </div>
          </>
        ) : (
          result && (
            <>
              <section className="panel">
                <p className="eyebrow">RESULTADO DE PRÁCTICA</p>
                <h2>
                  {result.score.toFixed(2)} / 100 · {result.aptLabel}
                  {result.provisional ? " · provisional" : ""}
                </h2>
                <p>
                  {result.correct} aciertos · {result.wrong} fallos ·{" "}
                  {result.blank} en blanco · {clock(run.elapsedSeconds)}
                </p>
                <p className="notice amber">{result.warning}</p>
                {result.unresolved.length > 0 && (
                  <p className="notice error">
                    Existen {result.unresolved.length} preguntas con
                    discrepancias; has respondido a {result.uncertainAnswered}.
                    Intervalo sin darlas por resueltas:{" "}
                    {result.scoreRange.lower.toFixed(2)}–
                    {result.scoreRange.upper.toFixed(2)} puntos. La nota
                    anterior refleja la clave documental, no resuelve la
                    controversia jurídica.
                  </p>
                )}
                <p>
                  {run.scoring.formula}. Mínimo de conocimientos:{" "}
                  {run.scoring.minimum}.{" "}
                  <a
                    href={run.scoring.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Convocatoria y criterio de corrección
                  </a>
                </p>
                <p>
                  Reservas usadas: {result.substitutions.length}; reservas sin
                  puntuar: {result.unusedReserves}.
                </p>
              </section>
              <div className="tabs">
                {[
                  ["errors", "Errores y blancos"],
                  ["flagged", "Marcadas para repasar"],
                  ["all", "Todas las correcciones"],
                  ["topics", "Temas y conceptos"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={review === id ? "active" : ""}
                    onClick={() => setReview(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {review === "topics" ? (
                <section className="panel">
                  <h2>Resultado por tema</h2>
                  {Object.entries(result.byTopic).map(([id, s]) => (
                    <p key={id}>
                      {id}: {s.correct} aciertos · {s.wrong} fallos · {s.blank}{" "}
                      blancos
                    </p>
                  ))}
                  <h2>Conceptos que conviene repasar</h2>
                  {Object.entries(result.errorsByConcept)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, n]) => (
                      <p key={name}>
                        {name}: {n} fallos
                      </p>
                    ))}
                </section>
              ) : (
                run.items
                  .filter(
                    (item) =>
                      review === "all" ||
                      (review === "flagged"
                        ? run.flagged.includes(item.id)
                        : ((!item.reserve &&
                            !result.substitutions.some(
                              (s) => s.cancelledId === item.id,
                            ) &&
                            !result.excluded.includes(item.id)) ||
                            result.substitutions.some(
                              (s) => s.reserveId === item.id,
                            )) &&
                          (run.answers[item.id] !== item.correct ||
                            !!item.issue)),
                  )
                  .map((item) => (
                    <section className="panel" key={item.id}>
                      <p className="eyebrow">
                        {item.reserve ? "RESERVA" : "ORDINARIA"} · {item.number}{" "}
                        · {item.origin === "official" ? "OFICIAL" : "INÉDITA"}
                      </p>
                      <h2 className="literal">{item.stem}</h2>
                      {item.options.map((o, i) => (
                        <p
                          className={
                            i === item.correct && !item.issue
                              ? "answer-note"
                              : "literal"
                          }
                          key={i}
                        >
                          {String.fromCharCode(65 + i)}. {o}
                          {i === run.answers[item.id] ? " · Tu respuesta" : ""}
                          {i === item.correct
                            ? item.issue
                              ? " · Clave documental controvertida"
                              : " · Clave documental"
                            : ""}
                        </p>
                      ))}
                      {item.issue && (
                        <p className="notice error">{item.issue}</p>
                      )}
                      <p>{item.explanation}</p>
                      {item.referenceDate && (
                        <p className="muted">
                          Normativa contrastada para {item.referenceDate}.
                          Dificultad orientativa: {item.difficulty}. Cotejo
                          asistido
                          {item.humanReviewed
                            ? " y revisión personal registrada"
                            : "; sin revisión humana independiente"}
                          .
                        </p>
                      )}
                      <p>
                        {item.concept}
                        {item.law ? ` · ${item.law}` : ""}
                        {item.article ? ` · artículo ${item.article}` : ""}
                      </p>
                      {item.legalUrl && (
                        <a
                          href={item.legalUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Consultar referencia
                        </a>
                      )}
                      {item.sourceId && (
                        <a
                          className="source-link"
                          href={`/api/documents/${encodeURIComponent(item.sourceId)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Cuestionario conservado
                        </a>
                      )}
                      {item.keySourceId && (
                        <a
                          className="source-link"
                          href={`/api/documents/${encodeURIComponent(item.keySourceId)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Plantilla conservada
                        </a>
                      )}
                      {!!item.historicalReferences?.length && (
                        <HistoricalReferences ids={item.historicalReferences} />
                      )}
                    </section>
                  ))
              )}
            </>
          )
        )}
      </div>
    );
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">GUARDIA CIVIL 2027</p>
          <h1>Empieza tu examen</h1>
          <p>
            Practica, recibe una corrección explicada y retoma tu progreso desde
            cualquier dispositivo.
          </p>
        </div>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="exam-start-grid">
        <section className="panel">
          <Play size={25} />
          <h2>Posible examen 2027</h2>
          <p>
            100 preguntas inéditas y cinco reservas, seleccionadas después de
            guardar una planificación basada en exámenes reales.
          </p>
          <label>
            Peso exploratorio de 2025–2026
            <select
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            >
              <option value={1}>Igual peso por sesión</option>
              <option value={1.5}>Recientes × 1,5</option>
              <option value={2}>Recientes × 2</option>
            </select>
          </label>
          <button
            className="primary"
            disabled={busy || !home}
            onClick={() =>
              perform(async () => {
                const value = await api("exam-start", {
                  mode: "generated",
                  recentWeight: weight,
                });
                if (value.status === "ready") open(value.run);
                else setBlocked(value);
              })
            }
          >
            Generar posible examen 2027
            <Play size={16} />
          </button>
          <p className="muted">
            Temario 2026 provisional hasta acreditar el de 2027. Sin
            probabilidades inventadas ni API de IA de pago obligatoria.
          </p>
          {home && (
            <p>
              {home.bank.eligible} inéditas disponibles · {home.bank.pending}{" "}
              pendientes de controles.
            </p>
          )}
        </section>
        <section className="panel">
          <BookOpen size={25} />
          <h2>Examen oficial anterior</h2>
          <p>
            Preguntas originales, modelos separados y corrección con la
            plantilla documental conservada.
          </p>
          <label>
            Convocatoria y modelo
            <select value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">Selecciona un examen</option>
              {home?.exams.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.year} · {e.heldAt || e.session} · modelo {e.model}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={busy || !examId}
            onClick={() =>
              perform(async () =>
                open(
                  (await api("exam-start", { mode: "historical", examId })).run,
                ),
              )
            }
          >
            Realizar examen oficial anterior
            <ArrowRight size={16} />
          </button>
          <p className="muted">
            Se conservan las incidencias de cada clave. Una nota documental
            puede ser provisional.
          </p>
        </section>
      </div>
      {blocked && (
        <section className="panel" role="status">
          <h2>Planificación guardada · simulacro todavía bloqueado</h2>
          <p>
            Faltan preguntas inéditas aptas para cubrir la distribución. No se
            ha rellenado con preguntas oficiales ni se presenta un examen
            incompleto como si tuviera 100.
          </p>
          <p>
            Referencia de planificación: {blocked.blueprintId}. Preguntas
            negativas previstas por señales históricas: {blocked.plan.negative};
            recurrencia conceptual orientativa:{" "}
            {blocked.plan.recurringConceptTarget}.
          </p>
          <div className="exam-shortages">
            {blocked.shortages.map((s, i) => (
              <p key={i}>
                {s.topicId}: necesarias {s.needed}, disponibles en esta
                selección {s.available}.
              </p>
            ))}
          </div>
        </section>
      )}
      <section className="panel">
        <h2>Mis exámenes guardados</h2>
        {home?.sessions.length ? (
          home.sessions.map((s) => (
            <div className="attempt" key={s.id}>
              <div>
                <strong>{s.title}</strong>
                <p>
                  {s.status === "finished" ? "Finalizado" : "En curso"} ·{" "}
                  {s.answered} respuestas ·{" "}
                  {new Date(s.updatedAt).toLocaleString("es-ES")}
                </p>
              </div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  perform(async () => open(await api("exam-runs/" + s.id)))
                }
              >
                {s.status === "finished" ? "Revisar resultado" : "Continuar"}
              </button>
            </div>
          ))
        ) : (
          <p>Tus intentos aparecerán aquí al comenzar un examen.</p>
        )}
      </section>
      <details className="panel">
        <summary>En qué se basa la planificación</summary>
        <p>
          {home?.profile.questions || 0} preguntas históricas, sin duplicar
          modelos A/B. Cada sesión aporta una unidad; formas distintas del mismo
          día se promedian.
        </p>
        <p>
          La planificación describe tendencias observadas; no demuestra que se
          anticipen preguntas futuras. La dificultad que se mida por texto será
          una aproximación, no una tasa real de acierto.
        </p>
        {home?.profile.limitations.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </details>
    </>
  );
}
function HistoricalReferences({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false),
    [rows, setRows] = useState<
      {
        id: string;
        year: number;
        model: string;
        number: number;
        stem: string;
        sourceId: string;
      }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (open && !rows.length)
      Promise.all(ids.map((id) => api("questions/" + id)))
        .then(setRows)
        .catch((e) => setError(e.message));
  }, [open, ids, rows.length]);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Preguntas históricas de referencia</summary>
      <p>
        Referencia de estilo o materia; la respuesta nueva se fundamenta en la
        norma citada.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((q) => (
        <div key={q.id}>
          <p>
            {q.year} · {q.model} · nº {q.number}
          </p>
          <p className="literal">{q.stem}</p>
          <a
            href={`/api/documents/${encodeURIComponent(q.sourceId)}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver cuestionario original
          </a>
        </div>
      ))}
    </details>
  );
}
