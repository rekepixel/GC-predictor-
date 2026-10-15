"use client";
import { useEffect, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Save,
  Search,
  ShieldCheck,
  Clock3,
  ArrowRight,
} from "lucide-react";
import type { Dataset, Question, Source } from "@/lib/types";
import { api, Empty, Badge, SourceLink } from "./app";
import { ValidationLedger } from "./article-history";
import GeneratedReview from "./generated-review";
type Storage = { key: string; sha256: string };
const initialMeta = {
  title: "",
  url: "",
  year: 2026,
  session: "",
  model: "A",
  kind: "exam",
  origin: "official",
  publishedAt: null as string | null,
  definitive: false,
  verified: false,
  notes: "",
};
export default function Admin({
  data,
  refresh,
  selectedId,
  setSelectedId,
}: {
  data: Dataset;
  refresh: () => Promise<void>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const [tab, setTab] = useState(selectedId ? "review" : "import"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (selectedId) setTab("review");
  }, [selectedId]);
  async function perform(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      setSuccess(message);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }
  const q = data.questions.find((q) => q.id === selectedId);
  const pending = data.questions.filter(
    (q) =>
      (q.validation === "draft" || q.validation === "reviewed") &&
      !q.documentaryEligible,
  );
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">CUIDAR EL DATO ES CUIDAR TU ESTUDIO</p>
          <h1>Administración</h1>
          <p>Importa, contrasta y deja constancia de cada revisión.</p>
        </div>
        <a className="secondary" href="/api/export">
          <Download size={17} />
          Exportar datos
        </a>
      </div>
      <div className="tabs">
        {[
          ["import", "Importar documentos"],
          ["review", `Revisar preguntas (${pending.length})`],
          ["sources", "Fuentes y plantillas"],
          ["norms", "Normas y temario"],
          ["jobs", "Registro de importación"],
          ["validation", "Verificación por año"],
          ["generated", "Banco inédito"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className="notice error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}
      {tab === "validation" && <ValidationLedger data={data} />}
      {tab === "generated" && <GeneratedReview />}
      {tab === "import" && (
        <ImportForm data={data} perform={perform} busy={busy} />
      )}
      {tab === "review" && (
        <>
          {q ? (
            <ReviewForm
              key={q.id + q.createdAt}
              question={q}
              data={data}
              perform={perform}
              busy={busy}
              close={() => setSelectedId(null)}
            />
          ) : (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Cola de revisión</h2>
                  <p>
                    Comprueba enunciado, opciones, respuesta, concepto y
                    vigencia.
                  </p>
                </div>
                <Badge tone="amber">Revisión humana</Badge>
              </div>
              <div className="search-input">
                <Search size={17} />
                <input
                  placeholder="Buscar por año, número o enunciado…"
                  aria-label="Buscar pregunta para revisar"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="review-list">
                {data.questions
                  .filter((q) =>
                    `${q.year} ${q.number} ${q.stem}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .slice(0, 80)
                  .map((q) => (
                    <button key={q.id} onClick={() => setSelectedId(q.id)}>
                      <div>
                        <Badge
                          tone={
                            q.validation === "validated" ? "green" : "amber"
                          }
                        >
                          {q.validation}
                        </Badge>
                        <small>
                          {q.year} · {q.model} · nº {q.number}
                        </small>
                        <strong>
                          {q.stem.slice(0, 160)}
                          {q.stem.length > 160 ? "…" : ""}
                        </strong>
                      </div>
                      <ArrowRight size={17} />
                    </button>
                  ))}
              </div>
              {!data.questions.length && (
                <Empty
                  title="Sin preguntas por revisar"
                  description="Sube un PDF o ejecuta la importación del archivo oficial recopilado."
                />
              )}
              {data.questions.length > 80 && (
                <p className="muted">
                  Se muestran las primeras 80 coincidencias. Usa la búsqueda
                  para acotar.
                </p>
              )}
            </section>
          )}
        </>
      )}
      {tab === "sources" && (
        <SourceReview data={data} perform={perform} busy={busy} />
      )}
      {tab === "norms" && <Norms data={data} perform={perform} busy={busy} />}
      {tab === "jobs" && (
        <section className="panel">
          <h2>Registro de importaciones</h2>
          {data.jobs.length ? (
            data.jobs
              .slice()
              .reverse()
              .map((j) => (
                <article className="job" key={j.id}>
                  <div>
                    <strong>
                      {data.sources.find((s) => s.id === j.sourceId)?.title ||
                        j.sourceId}
                    </strong>
                    <Badge tone="amber">
                      {j.status === "needs_review"
                        ? "Pendiente de revisión"
                        : j.status}
                    </Badge>
                  </div>
                  <small>{new Date(j.createdAt).toLocaleString("es-ES")}</small>
                  {j.warnings.map((w) => (
                    <p className="muted" key={w}>
                      {w}
                    </p>
                  ))}
                  {j.errors.map((w) => (
                    <p className="error" key={w}>
                      {w}
                    </p>
                  ))}
                </article>
              ))
          ) : (
            <Empty
              title="Sin importaciones registradas"
              description="Cada importación conserva advertencias, errores y su fuente."
            />
          )}
        </section>
      )}
    </>
  );
}
function ImportForm({
  data,
  perform,
  busy,
}: {
  data: Dataset;
  perform: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
}) {
  const [meta, setMeta] = useState(initialMeta),
    [file, setFile] = useState<File | null>(null),
    [storage, setStorage] = useState<Storage | undefined>(),
    [json, setJson] = useState("[]"),
    [text, setText] = useState(""),
    [warning, setWarning] = useState(""),
    [extracting, setExtracting] = useState(false),
    [mode, setMode] = useState("exam"),
    [examId, setExamId] = useState(""),
    [checked, setChecked] = useState(false),
    [expected, setExpected] = useState(100),
    [heldAt, setHeldAt] = useState("");
  async function extract() {
    if (!file) return;
    setExtracting(true);
    setWarning("");
    try {
      const bytes = await file.arrayBuffer();
      if (
        bytes.byteLength > 25 * 1024 * 1024 ||
        new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
      )
        throw Error("Selecciona un PDF de hasta 25 MB.");
      const sha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      )
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      const ticket = await api("upload-ticket", {
        sha256,
        bytes: bytes.byteLength,
      });
      let d;
      if (ticket.direct) {
        const uploaded = await fetch(ticket.url, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: bytes,
        });
        if (!uploaded.ok && uploaded.status !== 409) {
          const error = await uploaded.json().catch(() => ({}));
          if (error.error !== "Duplicate" && error.statusCode !== "409")
            throw Error("No se pudo subir el PDF al almacenamiento privado.");
        }
        d = await api("extract", { key: ticket.key });
      } else {
        const form = new FormData();
        form.set("file", file);
        const r = await fetch("/api/extract", { method: "POST", body: form });
        d = await r.json();
        if (!r.ok) throw Error(d.error);
      }
      setStorage(d.storage);
      setText(d.text);
      setJson(
        JSON.stringify(
          mode === "exam" ? d.questions.questions : d.answers,
          null,
          2,
        ),
      );
      setWarning(
        mode === "exam"
          ? d.questions.warnings.join(" ")
          : "La extracción de una plantilla completa puede mezclar modelos o pruebas. Selecciona y contrasta la tabla de conocimientos y modelo antes de guardar.",
      );
    } catch (e) {
      setWarning(e instanceof Error ? e.message : "No se pudo extraer.");
    } finally {
      setExtracting(false);
    }
  }
  const update = (name: string, value: unknown) =>
    setMeta({ ...meta, [name]: value });
  return (
    <section className="panel import-form">
      <h2>Del PDF a un borrador revisable</h2>
      <p>
        Se conserva el original. La extracción automática nunca valida una
        pregunta ni certifica la plantilla.
      </p>
      <div className="tabs compact">
        <button
          className={mode === "exam" ? "active" : ""}
          onClick={() => {
            setMode("exam");
            setJson("[]");
            setChecked(false);
            update("kind", "exam");
          }}
        >
          Cuadernillo de examen
        </button>
        <button
          className={mode === "key" ? "active" : ""}
          onClick={() => {
            setMode("key");
            setJson("[]");
            setChecked(false);
            update("kind", "answer_key");
          }}
        >
          Plantilla de respuestas
        </button>
      </div>
      {mode === "key" && (
        <label>
          Examen al que pertenece
          <select
            required
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value);
              const e1 = data.exams.find((v) => v.id === e.target.value);
              if (e1)
                setMeta({
                  ...meta,
                  kind: "answer_key",
                  year: e1.year,
                  session: e1.session,
                  model: e1.model,
                });
            }}
          >
            <option value="">Selecciona año, sesión y modelo</option>
            {data.exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.year} · {e.session} · modelo {e.model}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-grid">
        <label>
          Título del documento
          <input
            value={meta.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Examen oficial 2026 · modelo A"
          />
        </label>
        <label>
          URL original
          <input
            type="url"
            value={meta.url}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://web.guardiacivil.es/…"
          />
        </label>
        <label>
          Año
          <input
            type="number"
            min="1900"
            max="2100"
            value={meta.year}
            onChange={(e) => update("year", Number(e.target.value))}
          />
        </label>
        <label>
          Convocatoria / sesión
          <input
            value={meta.session}
            onChange={(e) => update("session", e.target.value)}
            placeholder="2026-07-11 · turno único"
          />
        </label>
        <label>
          Modelo
          <input
            value={meta.model}
            onChange={(e) => update("model", e.target.value)}
            placeholder="A / B / 1A…"
          />
        </label>
        <label>
          Fecha de publicación (si verificada)
          <input
            type="date"
            value={meta.publishedAt || ""}
            onChange={(e) => update("publishedAt", e.target.value || null)}
          />
        </label>
        <label>
          Procedencia
          <select
            value={meta.origin}
            onChange={(e) => update("origin", e.target.value)}
          >
            <option value="official">Oficial · URL institucional</option>
            <option value="manual">Manual · procedencia sin acreditar</option>
            <option value="secondary">Secundaria</option>
          </select>
        </label>
        {mode === "exam" && (
          <>
            <label>
              Fecha de examen
              <input
                type="date"
                value={heldAt}
                onChange={(e) => setHeldAt(e.target.value)}
              />
            </label>
            <label>
              Preguntas ordinarias esperadas
              <input
                type="number"
                min="1"
                max="300"
                value={expected}
                onChange={(e) => setExpected(Number(e.target.value))}
              />
            </label>
          </>
        )}
      </div>
      <label>
        Notas de procedencia
        <textarea
          rows={2}
          value={meta.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Correcciones publicadas, condiciones de acceso, fecha pendiente…"
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={meta.verified}
          onChange={(e) => update("verified", e.target.checked)}
        />
        He comprobado la procedencia oficial del documento (esto no acredita el
        texto ni la plantilla definitiva).
      </label>
      <div className="upload-zone">
        <Upload size={28} />
        <strong>Sube el original en PDF</strong>
        <span>Máximo 25 MB · sólo texto digital, sin OCR automático</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Subir PDF"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setStorage(undefined);
            setChecked(false);
          }}
        />
        <button
          className="secondary"
          disabled={!file || extracting}
          onClick={extract}
        >
          {extracting ? "Extrayendo…" : "Extraer borrador"}
        </button>
      </div>
      {warning && (
        <div className="notice amber">
          <AlertCircle size={18} />
          <span>{warning}</span>
        </div>
      )}
      {text && (
        <details>
          <summary>Texto extraído · comprueba secciones y modelos</summary>
          <textarea
            className="code-input"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </details>
      )}
      <label>
        JSON de {mode === "exam" ? "preguntas" : "respuestas"} revisado
        <textarea
          className="code-input"
          rows={15}
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setChecked(false);
          }}
          spellCheck={false}
        />
      </label>
      <small>
        {mode === "exam"
          ? 'Formato: [{"number":1,"stem":"enunciado literal","options":["A","B","C","D"],"sourcePage":3,"reserve":false}]. Selecciona sólo conocimientos. Si una reserva reinicia numeración, usa 101–105 y consérvala identificada en las notas.'
          : 'Formato: [{"number":1,"correct":0,"cancelled":false}]. correct: 0=A, 1=B, 2=C, 3=D; null si anulada. Importa sólo el modelo y la prueba seleccionados.'}
      </small>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        He comprobado que el JSON pertenece a conocimientos generales y al
        modelo indicado; conservar como borrador.
      </label>
      <button
        className="primary"
        disabled={busy || !checked || (mode === "key" && !examId)}
        onClick={() =>
          perform(
            async () => {
              const entries = JSON.parse(json);
              if (mode === "exam")
                await api("import", {
                  bundle: {
                    source: { ...meta, kind: "exam" },
                    exam: {
                      year: meta.year,
                      session: meta.session,
                      model: meta.model,
                      heldAt: heldAt || null,
                      expectedQuestions: expected,
                    },
                    questions: entries,
                  },
                  storage,
                });
              else
                await api("answer-key", {
                  examId,
                  source: { ...meta, kind: "answer_key" },
                  entries,
                  storage,
                });
            },
            mode === "exam"
              ? "Examen guardado como borrador. Revisa las preguntas y añade su plantilla."
              : "Plantilla incorporada. Se ha retirado la validación anterior hasta volver a cotejar las preguntas.",
          )
        }
      >
        <Save size={17} />
        {busy ? "Guardando…" : "Guardar importación"}
      </button>
    </section>
  );
}
function ReviewForm({
  question: q,
  data,
  perform,
  busy,
  close,
}: {
  question: Question;
  data: Dataset;
  perform: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
  close: () => void;
}) {
  const [form, setForm] = useState({ ...q }),
    [confirmConceptReview, setConfirmConceptReview] = useState(false),
    [audit, setAudit] = useState<
      { action: string; created_at: string; actor: string }[]
    >([]);
  const update = (key: string, value: unknown) =>
    setForm({ ...form, [key]: value });
  const src = data.sources.find((s) => s.id === q.sourceId),
    key = data.sources.find((s) => s.id === q.keySourceId);
  return (
    <section className="panel review-form">
      <div className="panel-header">
        <div>
          <h2>
            {q.year} · modelo {q.model} · pregunta {q.number}
          </h2>
          <p>
            {q.session} ·{" "}
            {q.sourcePage
              ? "página " + q.sourcePage
              : "página pendiente de cotejo"}
          </p>
        </div>
        <button className="secondary" onClick={close}>
          Volver a la cola
        </button>
      </div>
      <div className="document-actions">
        <SourceLink source={src} />
        {src?.storageKey && (
          <a
            className="secondary"
            href={`/api/documents/${src.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={15} />
            PDF original
          </a>
        )}
        {key && <SourceLink source={key} />}
      </div>
      <div className="notice amber">
        <AlertCircle size={18} />
        <span>
          {key?.definitive
            ? "Plantilla marcada definitiva. Comprueba el texto y la respuesta antes de validar."
            : "Falta una plantilla oficial acreditada como definitiva. Puedes corregir y marcar «revisada», pero todavía no «validada»."}
        </span>
      </div>
      {q.answerIssue && (
        <div className="notice amber">
          <AlertCircle size={18} />
          <span>
            {q.answerIssue.description}{" "}
            <a href={q.answerIssue.sourceUrl} target="_blank" rel="noreferrer">
              Consultar norma
            </a>
          </span>
        </div>
      )}
      <label>
        Enunciado literal
        <textarea
          rows={5}
          value={form.stem}
          onChange={(e) => update("stem", e.target.value)}
        />
      </label>
      {form.options.map((option, i) => (
        <label key={i}>
          Opción {String.fromCharCode(65 + i)}
          <textarea
            rows={2}
            value={option}
            onChange={(e) => {
              const options = [...form.options];
              options[i] = e.target.value;
              update("options", options);
            }}
          />
        </label>
      ))}
      <div className="form-grid">
        <label>
          {q.answerIssue
            ? "Letra de la plantilla · discrepancia pendiente"
            : "Respuesta contrastada"}
          <select
            value={form.correct === null ? "" : form.correct}
            onChange={(e) =>
              update(
                "correct",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          >
            <option value="">Sin respuesta / anulada</option>
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                {String.fromCharCode(65 + i)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado de validación
          <select
            value={form.validation}
            onChange={(e) => update("validation", e.target.value)}
          >
            <option value="draft">Borrador</option>
            <option value="reviewed">Revisada · falta definitiva</option>
            <option value="validated">
              Validada · texto y definitiva cotejados
            </option>
            <option value="cancelled">Anulada por el tribunal</option>
          </select>
        </label>
        <label>
          Tema del programa
          <select
            value={form.topicId || ""}
            onChange={(e) => update("topicId", e.target.value || null)}
          >
            <option value="">Sin asignar</option>
            {data.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.number}. {t.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Concepto principal de estudio
          <input
            list="concepts"
            value={form.concept || ""}
            onChange={(e) => update("concept", e.target.value || null)}
            placeholder="Concepto independiente de la redacción"
          />
          <datalist id="concepts">
            {data.concepts.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </datalist>
        </label>
        <label>
          Materia
          <input
            value={form.subject || ""}
            onChange={(e) => update("subject", e.target.value || null)}
          />
        </label>
        <label>
          Subconcepto específico
          <input
            value={form.subconcept || ""}
            onChange={(e) => update("subconcept", e.target.value || null)}
          />
        </label>
        <label>
          Ley / reglamento / norma
          <input
            value={form.law || ""}
            onChange={(e) => update("law", e.target.value || null)}
          />
        </label>
        <label>
          Artículo
          <input
            value={form.article || ""}
            onChange={(e) => update("article", e.target.value || null)}
          />
        </label>
        <label>
          Apartado
          <input
            value={form.paragraph || ""}
            onChange={(e) => update("paragraph", e.target.value || null)}
          />
        </label>
        <label>
          Fuente normativa
          <input
            type="url"
            value={form.legalUrl || ""}
            onChange={(e) => update("legalUrl", e.target.value || null)}
            placeholder="https://www.boe.es/…"
          />
        </label>
        <label>
          Vigencia
          <select
            value={form.validity}
            onChange={(e) => update("validity", e.target.value)}
          >
            {[
              ["unreviewed", "Sin revisar"],
              ["current", "Vigente verificada"],
              ["affected", "Posible cambio normativo"],
              ["repealed", "Derogada"],
              ["unknown", "Vigencia desconocida"],
            ].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de distractor
          <input
            value={form.distractorType || ""}
            onChange={(e) => update("distractorType", e.target.value || null)}
            placeholder="Excepción, plazo, órgano, negación…"
          />
        </label>
        <label>
          Estilo de pregunta
          <input
            value={form.style || ""}
            onChange={(e) => update("style", e.target.value || null)}
          />
        </label>
      </div>
      <label>
        Explicación jurídica revisada
        <textarea
          rows={3}
          value={form.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          placeholder="Explica el concepto y su referencia; no transcribas contenido sin cotejar."
        />
      </label>
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.classificationReviewed}
            onChange={(e) => update("classificationReviewed", e.target.checked)}
          />
          Clasificación temática y conceptual asignada
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={confirmConceptReview}
            onChange={(e) => setConfirmConceptReview(e.target.checked)}
          />
          Confirmo mi revisión humana del concepto y subconcepto frente al
          original
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.legalVerified}
            onChange={(e) => update("legalVerified", e.target.checked)}
          />
          Norma, artículo y apartado cotejados
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.reserve}
            onChange={(e) => update("reserve", e.target.checked)}
          />
          Pregunta de reserva
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update("active", e.target.checked)}
          />
          Incluir como pregunta activa (reservas sólo si el tribunal confirma su
          activación)
        </label>
      </div>
      <button
        className="primary"
        disabled={busy}
        onClick={() =>
          perform(
            () =>
              api(
                `questions/${q.id}`,
                { ...form, confirmConceptReview },
                "PATCH",
              ),
            "Revisión guardada y registrada.",
          )
        }
      >
        <Save size={17} />
        Guardar revisión
      </button>
      <details
        onToggle={(e) => {
          if (e.currentTarget.open)
            api("audit/" + q.id)
              .then(setAudit)
              .catch(() => {});
        }}
      >
        <summary>Historial de cambios</summary>
        {audit.map((a, i) => (
          <p key={i}>
            {new Date(a.created_at).toLocaleString("es-ES")} · {a.action} ·{" "}
            {a.actor}
          </p>
        ))}
        {!audit.length && <p>Sin cambios registrados.</p>}
      </details>
    </section>
  );
}
function SourceReview({
  data,
  perform,
  busy,
}: {
  data: Dataset;
  perform: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState("");
  const source = data.sources.find((s) => s.id === selected);
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Registro de procedencia</h2>
          <p>
            Consulta, URL, año, modelo y original. Una publicación de resultados
            no demuestra una clave definitiva.
          </p>
        </div>
        <Badge>{data.sources.length} fuentes</Badge>
      </div>
      <div className="search-input">
        <Search size={17} />
        <input
          aria-label="Buscar fuente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar año, documento o estado…"
        />
      </div>
      {source && (
        <SourceEditor
          key={source.id}
          source={source}
          perform={perform}
          busy={busy}
          close={() => setSelected("")}
        />
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Documento / procedencia</th>
              <th>Año / modelo</th>
              <th>Acceso</th>
              <th>Consulta</th>
              <th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {data.sources
              .filter((s) =>
                (s.title + " " + s.year + " " + s.access)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.title}</strong>
                    <SourceLink source={s} />
                    <small>
                      {s.origin === "official" ? "Oficial" : s.origin} ·{" "}
                      {s.kind}
                    </small>
                  </td>
                  <td>
                    {s.year || "—"}
                    <small>
                      {s.model || "—"} · {s.session || "—"}
                    </small>
                  </td>
                  <td>
                    <Badge tone={s.storageKey ? "green" : "amber"}>
                      {s.storageKey ? "Original guardado" : s.access}
                    </Badge>
                  </td>
                  <td>
                    <small>{s.consultedAt.slice(0, 10)}</small>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(s.id);
                        scrollTo({ top: 0 });
                      }}
                    >
                      Revisar
                    </button>
                    {s.definitive && <Badge tone="green">Definitiva</Badge>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function SourceEditor({
  source: s,
  perform,
  busy,
  close,
}: {
  source: Source;
  perform: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
  close: () => void;
}) {
  const [form, setForm] = useState({
    verified: s.verified,
    definitive: s.definitive,
    publishedAt: s.publishedAt,
    notes: s.notes,
  });
  return (
    <div className="source-editor">
      <h3>{s.title}</h3>
      <p>{s.url}</p>
      <SourceLink source={s} />
      {s.storageKey && (
        <a
          className="source-link"
          target="_blank"
          rel="noreferrer"
          href={"/api/documents/" + s.id}
        >
          Abrir original guardado <ExternalLink size={13} />
        </a>
      )}
      {s.sha256 && <small className="hash">SHA-256: {s.sha256}</small>}
      <label>
        Fecha de publicación verificada
        <input
          type="date"
          value={form.publishedAt || ""}
          onChange={(e) =>
            setForm({ ...form, publishedAt: e.target.value || null })
          }
        />
      </label>
      <label>
        Evidencia, correcciones y carácter definitivo
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={form.verified}
          onChange={(e) => setForm({ ...form, verified: e.target.checked })}
        />
        Procedencia oficial comprobada
      </label>
      {s.kind === "answer_key" && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.definitive}
            onChange={(e) => setForm({ ...form, definitive: e.target.checked })}
          />
          Una fuente oficial acredita que es definitiva (cita el acuerdo, fecha
          y URL en las notas)
        </label>
      )}
      <p className="muted">
        Cambiar esta fuente retira la validación previa de sus preguntas para
        volver a cotejarlas.
      </p>
      <div className="button-row">
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            perform(
              () => api("sources/" + s.id, form, "PATCH"),
              "Fuente revisada. Revalida sus preguntas si corresponde.",
            )
          }
        >
          <Save size={16} />
          Guardar evidencia
        </button>
        <button className="secondary" onClick={close}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
function Norms({
  data,
  perform,
  busy,
}: {
  data: Dataset;
  perform: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
}) {
  const [change, setChange] = useState({
      law: "",
      article: "",
      publishedAt: "",
      effectiveFrom: "",
      sourceUrl: "",
      summary: "",
      affectedConceptId: "",
      reviewed: false,
    }),
    [json, setJson] = useState(
      JSON.stringify(
        {
          year: 2027,
          effectiveFrom: "",
          source: {
            title: "Temario oficial 2027",
            url: "",
            year: 2027,
            session: "programa-2027",
            model: "",
            kind: "syllabus",
            origin: "official",
            publishedAt: null,
            definitive: false,
            verified: true,
            notes: "Referencia de publicación oficial pendiente",
          },
          topics: [],
        },
        null,
        2,
      ),
    );
  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Versiones del programa</h2>
            <p>
              Conserva cada versión. No aplicar el temario actual al pasado.
            </p>
          </div>
          <Badge tone="amber">2027 pendiente</Badge>
        </div>
        {data.syllabi.map((s) => (
          <div className="syllabus-version" key={s.id}>
            <h3>Referencia {s.year}</h3>
            <p>{s.notes}</p>
            <SourceLink
              source={data.sources.find((source) => source.id === s.sourceId)}
            />
          </div>
        ))}
        <div className="syllabus-topics">
          {data.topics.map((t) => (
            <div key={t.id}>
              <span>{String(t.number).padStart(2, "0")}</span>
              <strong>{t.title}</strong>
              {t.number > 23 && (
                <Badge>Prueba lingüística · fuera de conocimientos</Badge>
              )}
            </div>
          ))}
        </div>
        <details>
          <summary>Registrar una nueva versión oficial de temario</summary>
          <p>
            Completa fecha de entrada en vigor, URL y fecha de publicación
            verificada; no sobrescribe la versión 2026.
          </p>
          <textarea
            className="code-input"
            rows={15}
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              perform(
                () => api("syllabus", JSON.parse(json)),
                "Nueva versión registrada. Revisa la correspondencia temática de las preguntas.",
              )
            }
          >
            Guardar nueva versión
          </button>
        </details>
      </section>
      <section className="panel">
        <h2>Cambios normativos documentados</h2>
        <p>
          Una novedad legal puede orientar el estudio; no acredita aparición en
          el examen.
        </p>
        <div className="form-grid">
          {[
            ["law", "Ley o norma"],
            ["article", "Artículo (opcional)"],
            ["publishedAt", "Fecha de publicación"],
            ["effectiveFrom", "Entrada en vigor"],
            ["sourceUrl", "Fuente oficial"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type={
                  key.endsWith("At") || key === "effectiveFrom"
                    ? "date"
                    : key === "sourceUrl"
                      ? "url"
                      : "text"
                }
                value={change[key as keyof typeof change] as string}
                onChange={(e) =>
                  setChange({ ...change, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <label>
            Concepto afectado
            <select
              value={change.affectedConceptId}
              onChange={(e) =>
                setChange({ ...change, affectedConceptId: e.target.value })
              }
            >
              <option value="">Sin vínculo conceptual</option>
              {data.concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Cambio y efecto en el estudio
          <textarea
            rows={3}
            value={change.summary}
            onChange={(e) => setChange({ ...change, summary: e.target.value })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={change.reviewed}
            onChange={(e) =>
              setChange({ ...change, reviewed: e.target.checked })
            }
          />
          He cotejado esta modificación en la fuente oficial
        </label>
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            perform(
              () =>
                api("law-changes", {
                  ...change,
                  article: change.article || null,
                  affectedConceptId: change.affectedConceptId || null,
                }),
              "Cambio normativo documentado.",
            )
          }
        >
          <Save size={16} />
          Guardar cambio normativo
        </button>
        {data.changes.map((c) => (
          <article className="job" key={c.id}>
            <strong>
              {c.law} {c.article ? "· art. " + c.article : ""}
            </strong>
            <p>{c.summary}</p>
            <small>
              Publicado {c.publishedAt} · vigente desde {c.effectiveFrom}
            </small>
            <a
              className="source-link"
              href={c.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Fuente normativa <ExternalLink size={13} />
            </a>
          </article>
        ))}
      </section>
    </>
  );
}
