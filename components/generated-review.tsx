"use client";
import { useEffect, useState } from "react";
import type { GeneratedQuestion } from "@/lib/exam-engine";
import { api } from "./app";
export default function GeneratedReview() {
  const [rows, setRows] = useState<
      Pick<
        GeneratedQuestion,
        "id" | "stem" | "concept" | "topicId" | "referenceDate" | "quality"
      >[]
    >([]),
    [selected, setSelected] = useState<GeneratedQuestion | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState(""),
    [correct, setCorrect] = useState(0),
    [reasons, setReasons] = useState<string[]>(["", "", "", ""]),
    [checks, setChecks] = useState<Record<string, boolean>>({});
  const reload = () => api("generated-bank").then(setRows);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);
  async function select(id: string) {
    if (!id) {
      setSelected(null);
      return;
    }
    const q = await api("generated-bank/" + id);
    setSelected(q);
    setCorrect(q.correct);
    setNotes("");
    setReasons(
      [0, 1, 2, 3].map(
        (i) =>
          q.optionChecks.find((c: { index: number }) => c.index === i)
            ?.reason || "",
      ),
    );
    setChecks({});
  }
  async function save(state: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setSelected(
        await api(
          "generated-bank/" + selected.id,
          { state, notes, correct, reasons, ...checks },
          "PATCH",
        ),
      );
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Banco de preguntas inéditas</h2>
      <p>
        La redacción nueva y el cotejo asistido se distinguen de la revisión
        personal. Un borrador no entra en un simulacro corregible.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <label>
        Candidato
        <select
          value={selected?.id || ""}
          onChange={(e) =>
            select(e.target.value).catch((e) => setError(e.message))
          }
        >
          <option value="">Selecciona para contrastar</option>
          {rows.map((q) => (
            <option key={q.id} value={q.id}>
              {q.topicId} ·{" "}
              {
                {
                  draft: "Borrador",
                  documentary_checked: "Cotejo documental",
                  rejected: "Rechazada",
                }[q.quality.state]
              }{" "}
              · {q.concept.slice(0, 100)}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          <h3 className="literal">{selected.stem}</h3>
          <p>
            Normativa de referencia: {selected.referenceDate}. Método:{" "}
            {selected.quality.method.includes("owner")
              ? "Revisión personal"
              : selected.quality.method.includes("assistant_direct")
                ? "Cotejo asistido con texto BOE fechado"
                : "Propuesta automática pendiente de contraste semántico"}
            . Revisión personal: {selected.quality.humanReviewed ? "sí" : "no"}.
          </p>
          {selected.options.map((o, i) => (
            <label key={i} className="review-option">
              <span>
                {String.fromCharCode(65 + i)}. {o}
              </span>
              <textarea
                aria-label={`Justificación alternativa ${String.fromCharCode(65 + i)}`}
                value={reasons[i]}
                onChange={(e) =>
                  setReasons((prev) =>
                    prev.map((v, j) => (j === i ? e.target.value : v)),
                  )
                }
              />
            </label>
          ))}
          <label>
            Única alternativa correcta
            <select
              value={correct}
              onChange={(e) => setCorrect(Number(e.target.value))}
            >
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>
                  {String.fromCharCode(65 + i)}
                </option>
              ))}
            </select>
          </label>
          {selected.evidence.map((e, i) => (
            <details key={i}>
              <summary>Fuente, versión y fragmento {i + 1}</summary>
              <p>
                <a href={e.url} target="_blank" rel="noreferrer">
                  Consultar fuente original
                </a>{" "}
                · publicación {e.publishedAt} · entrada en vigor{" "}
                {e.effectiveFrom} · contrastada {e.checkedAsOf}
              </p>
              <p className="literal">{e.quote}</p>
              <p>
                Programa: {e.syllabusQuote}, página {e.syllabusPage}. SHA-256:{" "}
                {e.sha256}
              </p>
            </details>
          ))}
          <p>{selected.explanation}</p>
          {selected.quality.issues.map((note) => (
            <p className="notice amber" key={note}>
              {note}
            </p>
          ))}
          {[
            [
              "personallyReviewed",
              "He revisado personalmente la correspondencia entre pregunta, norma y alternativas.",
            ],
            [
              "syllabusChecked",
              "He comprobado que el apartado está incluido en el programa acreditado.",
            ],
            [
              "temporalChecked",
              "He comprobado publicación y vigencia para la fecha de referencia indicada.",
            ],
            [
              "allDistractorsChecked",
              "He comprobado una única respuesta y la falsedad de los tres distractores en este contexto.",
            ],
          ].map(([key, label]) => (
            <label className="checkbox-label" key={key}>
              <input
                type="checkbox"
                checked={!!checks[key]}
                onChange={(e) =>
                  setChecks((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
          <label>
            Motivo y observaciones
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Registra qué has contrastado y cualquier límite pendiente (mínimo 20 caracteres)."
            />
          </label>
          <div className="exam-actions">
            <button
              className="primary"
              disabled={busy || notes.length < 20}
              onClick={() => save("documentary_checked")}
            >
              Guardar cotejo personal
            </button>
            <button
              className="secondary"
              disabled={busy || notes.length < 20}
              onClick={() => save("rejected")}
            >
              Rechazar candidato
            </button>
          </div>
          <p className="muted">
            Guardar el cotejo no modifica ninguna pregunta histórica ni
            certifica una predicción para 2027.
          </p>
        </>
      )}
    </section>
  );
}
