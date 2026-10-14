"use client";
import { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  ScanLine,
  TrendingUp,
  Target,
  Settings2,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  FileCheck2,
  Database,
  CalendarDays,
  Menu,
  X,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Upload,
  Download,
  RefreshCw,
  LockKeyhole,
  Clock3,
  Layers3,
  GraduationCap,
  LineChart,
  FileText,
  Info,
  LogOut,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Dataset, Question, Weights, Source } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { frequencies, rank, patterns, backtest } from "@/lib/analysis";
import Admin from "./admin";
import { ArticleHistory } from "./article-history";
type Stats = ReturnType<typeof frequencies>;
type Analysis = {
  ranking: ReturnType<typeof rank>;
  patterns: ReturnType<typeof patterns>;
  backtest: ReturnType<typeof backtest>;
  reconstruction: ReturnType<typeof backtest>;
};
export async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(
    "/api/" + path,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const json = await response.json();
  if (!response.ok) {
    if (response.status === 401) location.href = "/login";
    throw Error(json.error || "No se pudo completar la operación.");
  }
  return json;
}
const sections = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "examenes", label: "Explorador de exámenes", icon: BookOpen },
  { id: "patrones", label: "Análisis de patrones", icon: ScanLine },
  { id: "prioridades", label: "Prioridades 2027", icon: TrendingUp },
  { id: "simulacros", label: "Simulacros", icon: Target },
  { id: "administracion", label: "Administración", icon: Settings2 },
];
const format = (n: number) => n.toLocaleString("es-ES");
const pct = (n: number) =>
  `${(n * 100).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Layers3 size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function SourceLink({ source }: { source: Source | undefined }) {
  return source?.url ? (
    <a
      className="source-link"
      href={source.url}
      target="_blank"
      rel="noreferrer"
    >
      {source.origin === "official"
        ? "Fuente institucional"
        : "Fuente secundaria"}{" "}
      <ExternalLink size={13} />
    </a>
  ) : (
    <span className="muted">Fuente manual</span>
  );
}
export default function App() {
  const [data, setData] = useState<Dataset | null>(null),
    [stats, setStats] = useState<Stats | null>(null),
    [error, setError] = useState(""),
    [section, setSection] = useState("dashboard"),
    [menu, setMenu] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [kind, setKind] = useState<"concept" | "article">("concept"),
    [k, setK] = useState(10),
    [loadingAnalysis, setLoadingAnalysis] = useState(false);
  async function refresh() {
    try {
      const result = await api("bootstrap");
      setData(result.data);
      setStats(result.stats);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión.");
    }
  }
  const navigate = (id: string) => {
    setSection(id);
    setMenu(false);
    location.hash = id;
  };
  useEffect(() => {
    refresh();
    const onHash = () => {
      const value = location.hash.slice(1);
      if (sections.some((s) => s.id === value)) setSection(value);
    };
    onHash();
    addEventListener("hashchange", onHash);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!data || !["prioridades", "patrones"].includes(section)) return;
    let cancelled = false;
    setLoadingAnalysis(true);
    api("analysis", { weights, kind, k })
      .then((value) => {
        if (!cancelled) {
          setAnalysis(value);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalysis(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data, section, weights, kind, k]);
  const review = (id: string) => {
    setSelected(id);
    navigate("administracion");
  };
  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        aria-label="Abrir navegación"
        onClick={() => setMenu(true)}
      >
        <Menu />
      </button>
      {menu && (
        <button
          className="scrim"
          aria-label="Cerrar navegación"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong>
              GC Predictor<span>.</span>
            </strong>
            <small>ESTUDIA CON EVIDENCIA</small>
          </div>
          <button
            className="mobile-close"
            aria-label="Cerrar menú"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="space-label">MI ESPACIO DE ESTUDIO</div>
        <nav>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(s.id)}
              className={section === s.id ? "nav-item active" : "nav-item"}
            >
              <s.icon size={19} />
              <span>{s.label}</span>
              {s.id === "prioridades" && <span className="nav-year">27</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="next-call">
            <GraduationCap size={22} />
            <strong>Objetivo: Guardia Civil</strong>
            <span>Convocatoria 2027</span>
            <div className="next-call-line" />
            <small>La evidencia guía. Tú decides.</small>
          </div>
          <div className="private-space">
            <LockKeyhole size={15} />
            <span>Espacio privado</span>
            <button
              aria-label="Cerrar sesión"
              onClick={async () => {
                await api("logout", {});
                location.href = "/login";
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Mi preparación <ChevronRight size={14} />{" "}
            <strong>{sections.find((s) => s.id === section)?.label}</strong>
          </span>
          <div>
            <Badge tone="green">
              <span className="status-dot" />
              Fuentes verificables
            </Badge>
            <span className="avatar">GC</span>
          </div>
        </header>
        <main className="main-content">
          {error && (
            <div role="alert" className="notice error">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={refresh}>Reintentar</button>
            </div>
          )}
          {!data || !stats ? (
            <div className="loading">
              <RefreshCw className="spin" />
              Cargando tu archivo de estudio…
            </div>
          ) : (
            <>
              {section === "dashboard" && (
                <Dashboard data={data} stats={stats} navigate={navigate} />
              )}
              {section === "examenes" && (
                <Explorer data={data} review={review} />
              )}
              {section === "patrones" && (
                <Patterns
                  data={data}
                  stats={stats}
                  analysis={analysis}
                  busy={loadingAnalysis}
                  review={review}
                />
              )}
              {section === "prioridades" && (
                <Priorities
                  data={data}
                  analysis={analysis}
                  busy={loadingAnalysis}
                  weights={weights}
                  setWeights={setWeights}
                  kind={kind}
                  setKind={setKind}
                  k={k}
                  setK={setK}
                  review={review}
                />
              )}
              {section === "simulacros" && (
                <Simulations data={data} refresh={refresh} />
              )}
              {section === "administracion" && (
                <Admin
                  data={data}
                  refresh={refresh}
                  selectedId={selected}
                  setSelectedId={setSelected}
                />
              )}
            </>
          )}
          <footer className="footer">
            <ShieldCheck size={14} />
            <span>GC Predictor · Datos reales. Criterio propio.</span>
            <span>Una prioridad de estudio no es una probabilidad.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Dashboard({
  data,
  stats,
  navigate,
}: {
  data: Dataset;
  stats: Stats;
  navigate: (id: string) => void;
}) {
  const files = data.sources.filter(
      (s) => s.storageKey && s.origin === "official",
    ),
    sessions = new Set(data.exams.map((e) => e.year + "|" + e.session));
  const importedYears = [...new Set(data.exams.map((e) => e.year))].sort();
  const uniqueDrafts = new Set(data.questions.map((q) => q.canonicalId)).size;
  return (
    <>
      <PageTitle
        eyebrow="TU PREPARACIÓN, CON PERSPECTIVA"
        title="El conocimiento empieza en los datos."
        description="Tu archivo oficial y el punto de partida para preparar 2027."
        action={
          <button
            className="primary"
            onClick={() => navigate("administracion")}
          >
            <Upload size={17} />
            Importar examen
          </button>
        }
      />
      <div className="notice amber">
        <Info size={18} />
        <span>
          {stats.basisNote} Clave final acreditada: {stats.definitiveQuestions}{" "}
          preguntas. Descarga oficial: {stats.primaryDocumentQuestions}; copias
          secundarias corroboradas: {stats.corroboratedCopyQuestions}.
          {stats.conceptReviews.assisted > 0 &&
            ` Clasificación asistida: ${stats.conceptClassified}/${stats.questions}; revisión humana independiente: ${stats.conceptReviews.independentHuman}.`}
          {stats.answerIssues > 0 &&
            ` ${stats.answerIssues} pregunta con discrepancia de respuesta documentada; su aparición se cuenta, su respuesta no se ofrece como fiable.`}
          {stats.years.length < 2
            ? " Un solo año no permite comparar tendencias históricas."
            : " Las comparaciones describen el corpus disponible y su cobertura parcial."}
        </span>
      </div>
      <section className="hero">
        <div>
          <Badge tone="hero-badge">GUARDIA CIVIL · CONVOCATORIA 2027</Badge>
          <h2>
            Menos intuición.
            <br />
            Más evidencia.
          </h2>
          <p>
            Conecta lo que se ha preguntado con lo que necesitas estudiar.
            Siempre con el examen original a un clic.
          </p>
          <button className="hero-button" onClick={() => navigate("examenes")}>
            Explorar mi archivo <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-evidence">
          <div className="hero-ring">
            <ShieldCheck size={55} />
          </div>
          <span>CALIDAD DEL CORPUS</span>
          <strong>
            {stats.questions
              ? format(stats.questions) + " preguntas cotejadas"
              : "Pendiente de validación"}
          </strong>
          <p>
            {stats.questions
              ? "Contenido documental cotejado y variantes agrupadas; firmeza final aparte."
              : "Los borradores no alimentan estadísticas ni prioridades."}
          </p>
        </div>
      </section>
      <div className="metrics-grid">
        {[
          {
            icon: Database,
            label: "Preguntas cotejadas para análisis",
            value: format(stats.questions),
            note: `${format(stats.definitiveQuestions)} con clave definitiva · ${format(stats.documentaryOnlyQuestions)} con cotejo documental`,
          },
          {
            icon: CalendarDays,
            label: "Sesiones importadas",
            value: format(sessions.size),
            note: importedYears.length
              ? `Archivo: ${importedYears.join(", ")} · modelos agrupados`
              : "Aún no hay exámenes importados",
          },
          {
            icon: FileCheck2,
            label: "Documentos oficiales",
            value: format(files.length),
            note: "Originales descargados · huella SHA-256",
          },
          {
            icon: Layers3,
            label: "Cobertura por temas",
            value: pct(stats.coverage),
            note: "Temas representados por preguntas cotejadas y clasificación revisada",
          },
        ].map((m) => (
          <div className="metric" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <m.icon size={18} />
            </div>
            <strong>{m.value}</strong>
            <small>{m.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel evolution">
          <div className="panel-header">
            <div>
              <h2>Evolución del archivo</h2>
              <p>Preguntas ordinarias cotejadas por convocatoria</p>
            </div>
            <Badge>2017 — 2026</Badge>
          </div>
          {stats.byYear.length ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.byYear}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="questions"
                    name="Preguntas cotejadas"
                    fill="#2f6b58"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty
              title="La gráfica espera transcripciones cotejadas"
              description="Tener un PDF no acredita su transcripción. Revisa texto, sección, modelo y clave oficial antes de incluirlo."
              action={
                <button
                  className="text-button"
                  onClick={() => navigate("administracion")}
                >
                  Ir a revisión <ArrowUpRight size={16} />
                </button>
              }
            />
          )}
          <div className="year-strip">
            {Array.from({ length: 10 }, (_, i) => 2017 + i).map((year) => {
              const q = data.questions.filter((q) => q.year === year),
                v = stats.byYear.find((y) => y.year === year),
                hasPDF = data.exams.some((e) => e.year === year);
              return (
                <div
                  key={year}
                  className={v ? "covered" : q.length ? "pending" : ""}
                  title={
                    v
                      ? `${v.questions} preguntas cotejadas`
                      : q.length
                        ? `${q.length} registros en borrador`
                        : "Sin cuadernillo importado"
                  }
                >
                  <span className="year-dot" />
                  <strong>{year}</strong>
                  <small>
                    {v
                      ? "Cotejado"
                      : q.length
                        ? "Revisión"
                        : hasPDF
                          ? "PDF / OCR"
                          : "Sin datos"}
                  </small>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel reliability">
          <div className="panel-header">
            <h2>La fiabilidad, primero</h2>
            <ShieldCheck size={20} />
          </div>
          <div className="reliability-item">
            <span className="step">1</span>
            <div>
              <strong>Originales trazables</strong>
              <p>{files.length} documentos con URL y huella de archivo.</p>
            </div>
          </div>
          <div className="reliability-item">
            <span className="step">2</span>
            <div>
              <strong>Cotejo y plantilla definitiva</strong>
              <p>
                {format(uniqueDrafts)} grupos extraídos.{" "}
                {format(stats.questions)} preguntas ordinarias cotejadas.
              </p>
            </div>
          </div>
          <div className="reliability-item">
            <span className="step">3</span>
            <div>
              <strong>Priorizar con criterio</strong>
              <p>
                Heurística explicada y evaluación temporal. Sin probabilidades
                inventadas.
              </p>
            </div>
          </div>
          <div className="subtle-note">
            <Info size={17} />
            <span>
              El temario 2027 está pendiente. La referencia actual es el
              programa oficial enlazado para 2026.
            </span>
          </div>
        </section>
      </div>
      <div className="two-col">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Temas más frecuentes</h2>
              <p>Sólo asignaciones revisadas</p>
            </div>
            <button
              className="icon-button"
              aria-label="Ver patrones"
              onClick={() => navigate("patrones")}
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
          {stats.topics.length ? (
            <div className="frequency-list">
              {stats.topics.slice(0, 6).map((t, i) => (
                <div key={t.name}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <strong>{t.name}</strong>
                  <b>{t.count}</b>
                  <small>{pct(t.share)}</small>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Sin frecuencias publicables"
              description="Las clasificaciones automáticas son propuestas. Valida las preguntas y revisa su tema para incluirlas aquí."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Artículos destacados</h2>
              <p>Referencias jurídicas cotejadas</p>
            </div>
            <BookOpen size={20} />
          </div>
          {stats.articles.length ? (
            <div className="frequency-list">
              {stats.articles.slice(0, 5).map((a) => (
                <div key={a.name}>
                  <strong>{a.name}</strong>
                  <b>{a.count}</b>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Sin artículos verificados todavía"
              description="No inferimos un artículo a partir de números del enunciado. Cada referencia requiere una fuente normativa y revisión."
            />
          )}
        </section>
      </div>
      <section className="panel sources-summary">
        <div>
          <div className="small-icon">
            <FileText size={22} />
          </div>
          <div>
            <h2>Del documento a la evidencia</h2>
            <p>
              {data.sources.length} fuentes registradas ·{" "}
              {data.topics.filter((t) => t.number <= 23).length} temas de
              conocimientos generales.
            </p>
          </div>
        </div>
        <button
          className="secondary"
          onClick={() => navigate("administracion")}
        >
          Revisar fuentes <ArrowRight size={16} />
        </button>
      </section>
    </>
  );
}
export function QuestionCard({
  q,
  data,
  review,
}: {
  q: Question;
  data: Dataset;
  review: (id: string) => void;
}) {
  const [answer, setAnswer] = useState(false);
  const topic = data.topics.find((t) => t.id === q.topicId);
  return (
    <article className="question-card">
      <div className="question-top">
        <div>
          <Badge
            tone={
              q.validation === "validated" || q.documentaryEligible
                ? "green"
                : q.validation === "cancelled"
                  ? "red"
                  : "amber"
            }
          >
            {q.validation === "validated"
              ? "Definitiva acreditada"
              : q.documentaryEligible
                ? q.documentaryVerification?.scope ===
                  "corroborated_documentary"
                  ? "Cotejo · copia secundaria corroborada"
                  : "Cotejo · fuente oficial"
                : q.validation === "cancelled"
                  ? "Anulada"
                  : q.validation === "reviewed"
                    ? "Revisada · falta definitiva"
                    : "Borrador"}
          </Badge>
          <span>
            {q.year} · {q.session} · Modelo {q.model} · Nº {q.number}
            {q.reserve ? " · Reserva" : ""}
          </span>
        </div>
        <button className="text-button" onClick={() => review(q.id)}>
          Revisar <ArrowUpRight size={14} />
        </button>
      </div>
      <h3 className="literal">{q.stem}</h3>
      <div className="options">
        {q.options.map((o, i) => (
          <div
            key={i}
            className={
              answer && q.correct === i && !q.answerIssue
                ? "option correct"
                : "option"
            }
          >
            <span>{String.fromCharCode(65 + i)}</span>
            <p className="literal">{o}</p>
            {answer && q.correct === i && !q.answerIssue && (
              <CheckCircle2 size={17} />
            )}
          </div>
        ))}
      </div>
      <div className="question-tags">
        {topic && (
          <Badge>
            {q.classificationReviewed ? "Tema revisado" : "Tema sugerido"}:{" "}
            {topic.number}
          </Badge>
        )}
        {q.confidence !== null && !q.classificationReviewed && (
          <Badge>Confianza de regla {pct(q.confidence)}</Badge>
        )}
        {q.concept && <Badge tone="green">Concepto: {q.concept}</Badge>}
        {q.subject && <Badge>Materia: {q.subject}</Badge>}
        {q.subconcept && <Badge>Subconcepto: {q.subconcept}</Badge>}
        {q.conceptDetail && <Badge>Subaspecto: {q.conceptDetail}</Badge>}
        {q.law && (
          <Badge>
            {q.law}
            {q.article
              ? (/^\d/.test(q.article) ? " · art. " : " · ") + q.article
              : ""}
            {q.legalVerified
              ? " · referencia cotejada"
              : q.lawVerified
                ? " · norma identificada, artículo pendiente"
                : " · sin cotejar"}
          </Badge>
        )}
      </div>
      {q.conceptReview && (
        <p className="muted">
          {q.conceptReview.independentHumanReview
            ? "Clasificación revisada por el usuario"
            : "Clasificación asistida · revisión humana independiente pendiente"}{" "}
          · confianza cualitativa{" "}
          {q.conceptReview.confidence === "high" ? "alta" : "media"}, no
          calibrada.{" "}
          {q.conceptReview.scope === "keyed_statement_focus"
            ? "La etiqueta destaca el foco de la alternativa de clave; el ítem puede examinar varios contenidos."
            : ""}
        </p>
      )}
      {q.answerIssue && (
        <div className="notice amber" role="note">
          <AlertCircle size={18} />
          <span>
            <strong>Discrepancia de respuesta pendiente.</strong>{" "}
            {q.answerIssue.description}{" "}
            <a href={q.answerIssue.sourceUrl} target="_blank" rel="noreferrer">
              Consultar versión normativa
            </a>
          </span>
        </div>
      )}
      {answer && (
        <div className="answer-note">
          {q.answerIssue
            ? `La plantilla copiada marca ${String.fromCharCode(65 + (q.correct ?? 0))}. No se ofrece como respuesta jurídica fiable mientras persista la discrepancia.`
            : q.correct === null
              ? "Sin respuesta contrastada."
              : q.validation === "validated"
                ? "Respuesta de plantilla definitiva."
                : q.documentaryEligible
                  ? q.documentaryVerification?.scope ===
                    "corroborated_documentary"
                    ? "Respuesta cotejada con copias secundarias concordantes de la plantilla. La procedencia y la situación final por pregunta se informan por separado."
                    : "Respuesta cotejada con la plantilla oficial nº 2. Resultados definitivos publicados el 24/07/2026; el acuerdo no identifica cambios de respuesta ni anulaciones por pregunta."
                  : "Respuesta provisional extraída. No equivale a una plantilla definitiva."}
          {q.explanation && <p>{q.explanation}</p>}
          {q.legalUrl && (
            <a href={q.legalUrl} target="_blank" rel="noreferrer">
              Consultar norma <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
      <div className="question-bottom">
        <SourceLink source={data.sources.find((s) => s.id === q.sourceId)} />
        {data.sources.find((s) => s.id === q.sourceId)?.storageKey && (
          <a
            className="source-link"
            href={`/api/documents/${encodeURIComponent(q.sourceId)}#page=${q.sourcePage || 1}`}
            target="_blank"
            rel="noreferrer"
          >
            PDF conservado · pág. {q.sourcePage || 1}
          </a>
        )}
        {q.keySourceId && (
          <a
            className="source-link"
            href={data.sources.find((s) => s.id === q.keySourceId)?.url}
            target="_blank"
            rel="noreferrer"
          >
            Plantilla <ExternalLink size={13} />
          </a>
        )}
        <button className="text-button" onClick={() => setAnswer(!answer)}>
          {answer ? "Ocultar respuesta" : "Consultar respuesta"}
          <ChevronRight size={14} />
        </button>
      </div>
    </article>
  );
}
function Explorer({
  data,
  review,
}: {
  data: Dataset;
  review: (id: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [year, setYear] = useState(""),
    [topic, setTopic] = useState(""),
    [law, setLaw] = useState(""),
    [article, setArticle] = useState(""),
    [concept, setConcept] = useState(""),
    [status, setStatus] = useState("documentary"),
    [session, setSession] = useState(""),
    [model, setModel] = useState(""),
    [page, setPage] = useState(1);
  const [tab, setTab] = useState("questions"),
    [variants, setVariants] = useState(false),
    [reserves, setReserves] = useState(false);
  const filtered = useMemo(
    () =>
      data.questions
        .filter(
          (q) =>
            (!search ||
              (q.stem + " " + q.options.join(" "))
                .toLocaleLowerCase("es")
                .includes(search.toLocaleLowerCase("es"))) &&
            (!year || q.year === Number(year)) &&
            (!topic || q.topicId === topic) &&
            (!law || q.law === law) &&
            (!article || (q.article || "").includes(article)) &&
            (!concept ||
              (q.concept || "")
                .toLocaleLowerCase("es")
                .includes(concept.toLocaleLowerCase("es"))) &&
            (!status ||
              (status === "documentary"
                ? q.documentaryEligible || q.validation === "validated"
                : status === "concept_medium"
                  ? q.documentaryEligible &&
                    q.conceptReview?.confidence === "medium"
                  : status === "answer_conflict"
                    ? q.documentaryEligible && !!q.answerIssue
                    : q.validation === status)) &&
            (reserves || !q.reserve) &&
            (!session || q.session === session) &&
            (!model || q.model === model),
        )
        .sort(
          (a, b) =>
            b.year - a.year ||
            a.session.localeCompare(b.session) ||
            a.model.localeCompare(b.model) ||
            a.number - b.number,
        )
        .filter(
          (q, i, all) =>
            variants ||
            !!model ||
            all.findIndex((other) => other.canonicalId === q.canonicalId) === i,
        ),
    [
      data,
      search,
      year,
      topic,
      law,
      article,
      concept,
      status,
      session,
      model,
      variants,
      reserves,
    ],
  );
  useEffect(
    () => setPage(1),
    [
      search,
      year,
      topic,
      law,
      article,
      concept,
      status,
      session,
      model,
      variants,
      reserves,
    ],
  );
  if (tab === "articles")
    return (
      <>
        <PageTitle
          eyebrow="REFERENCIAS Y EVIDENCIA"
          title="Explorador de exámenes"
          description="Historial por artículo, con fuentes y correspondencias A/B."
        />
        <div className="tabs">
          <button onClick={() => setTab("questions")}>
            Preguntas por tema
          </button>
          <button className="active">Fichas de artículos</button>
        </div>
        <ArticleHistory data={data} review={review} />
      </>
    );
  const years = [...new Set(data.questions.map((q) => q.year))].sort(
      (a, b) => b - a,
    ),
    laws = [
      ...new Set(data.questions.map((q) => q.law).filter(Boolean)),
    ] as string[];
  return (
    <>
      <PageTitle
        eyebrow="EL EXAMEN, SIN INTERMEDIARIOS"
        title="Explorador de exámenes"
        description="Enunciados literales, opciones, respuestas y fuentes. Cada modelo conserva su orden original."
      />
      <div className="tabs">
        <button className="active">Preguntas por tema</button>
        <button onClick={() => setTab("articles")}>Fichas de artículos</button>
      </div>
      <div className="notice">
        <Info size={18} />
        <span>
          Los borradores se pueden consultar, pero quedan fuera de los análisis.
          A/B se agrupan por contenido dentro de la misma sesión; las
          repeticiones entre años se conservan. Las copias secundarias
          corroboradas mantienen esa procedencia; no se presentan como descargas
          institucionales.
        </span>
      </div>
      <section className="panel filters">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Buscar enunciado"
            placeholder="Buscar palabras en preguntas y opciones…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-grid">
          <label>
            Año
            <select
              aria-label="Año"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            Convocatoria
            <select
              aria-label="Convocatoria"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="">Todas las sesiones</option>
              {[...new Set(data.questions.map((q) => q.session))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Modelo
            <select
              aria-label="Modelo"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">Todos</option>
              {[...new Set(data.questions.map((q) => q.model))]
                .sort()
                .map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          </label>
          <label>
            Tema
            <select
              aria-label="Tema"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">Todo el temario</option>
              {data.topics
                .filter((t) => t.number <= 23)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.number}. {t.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Norma
            <select
              aria-label="Norma"
              value={law}
              onChange={(e) => setLaw(e.target.value)}
            >
              <option value="">Todas las normas</option>
              {laws.sort().map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Artículo
            <input
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              placeholder="Ej. 193"
            />
          </label>
          <label>
            Concepto
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. declaración de fallecimiento"
            />
          </label>
          <label>
            Validación
            <select
              aria-label="Validación"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="documentary">
                Cotejo documental o definitiva
              </option>
              <option value="validated">Validadas</option>
              <option value="concept_medium">Concepto · confianza media</option>
              <option value="answer_conflict">Discrepancia de respuesta</option>
              <option value="draft">Borradores</option>
              <option value="reviewed">Revisadas</option>
              <option value="cancelled">Anuladas</option>
            </select>
          </label>
        </div>
      </section>
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={variants}
            onChange={(e) => setVariants(e.target.checked)}
          />
          Mostrar cada variante A/B (no cambia las estadísticas)
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={reserves}
            onChange={(e) => setReserves(e.target.checked)}
          />
          Incluir reservas identificadas e inactivas
        </label>
      </div>
      <div className="results-heading">
        <span>
          <strong>{format(filtered.length)}</strong> registros encontrados
        </span>
        <button
          className="text-button"
          onClick={() => {
            setSearch("");
            setYear("");
            setTopic("");
            setLaw("");
            setArticle("");
            setConcept("");
            setStatus("");
            setSession("");
            setModel("");
          }}
        >
          Limpiar filtros <X size={14} />
        </button>
      </div>
      {filtered.length ? (
        filtered
          .slice((page - 1) * 15, page * 15)
          .map((q) => (
            <QuestionCard key={q.id} q={q} data={data} review={review} />
          ))
      ) : (
        <section className="panel">
          <Empty
            title="No hay preguntas con estos filtros"
            description="Importa un cuadernillo oficial o amplía la búsqueda. No se añaden preguntas de demostración al archivo."
          />
        </section>
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={page === 1}
          onClick={() => {
            setPage(page - 1);
            scrollTo({ top: 0 });
          }}
        >
          Anterior
        </button>
        <span>
          Página {page} de {Math.max(1, Math.ceil(filtered.length / 15))}
        </span>
        <button
          className="secondary"
          disabled={page >= Math.ceil(filtered.length / 15)}
          onClick={() => {
            setPage(page + 1);
            scrollTo({ top: 0 });
          }}
        >
          Siguiente
        </button>
      </div>
    </>
  );
}
function QuestionEvidence({
  ids,
  data,
  review,
}: {
  ids: string[];
  data: Dataset;
  review: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      style={{ gridColumn: "1 / -1", width: "100%" }}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Inspeccionar {ids.length} preguntas y sus fuentes</summary>
      {open &&
        ids.map((id) => {
          const q = data.questions.find((q) => q.id === id);
          return q ? (
            <QuestionCard key={id} q={q} data={data} review={review} />
          ) : null;
        })}
    </details>
  );
}
function Patterns({
  data,
  stats,
  analysis,
  busy,
  review,
}: {
  data: Dataset;
  stats: Stats;
  analysis: Analysis | null;
  busy: boolean;
  review: (id: string) => void;
}) {
  const [tab, setTab] = useState("literal");
  const p = analysis?.patterns;
  return (
    <>
      <PageTitle
        eyebrow="LO QUE VUELVE A APARECER"
        title="Análisis de patrones"
        description="Repetición literal, conceptos persistentes y cambios de estilo sobre preguntas documentadas y cotejadas."
      />
      <div className="tabs">
        {[
          ["literal", "Repeticiones literales"],
          ["concept", "Conceptos repetidos"],
          ["relations", "Relaciones de contenido"],
          ["laws", "Frecuencia de leyes"],
          ["recent", "Histórica frente a reciente"],
          ["similar", "Similitud textual"],
          ["dormant", "Contenidos sin reaparición"],
          ["style", "Estilo y distractores"],
          ["temporal", "Distribución temporal"],
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
      {busy && <p className="muted">Calculando con los datos disponibles…</p>}
      <section className="panel">
        {!p ? (
          <Empty
            title="Preparando análisis"
            description="La comparación utiliza contenido oficial cotejado. La firmeza final de la clave se informa aparte."
          />
        ) : tab === "literal" ? (
          p.literals.length ? (
            p.literals.map((r, i) => (
              <div className="pattern-row" key={i}>
                <Badge tone="green">{r.years.join(" · ")}</Badge>
                <p>{r.stem}</p>
                <button
                  className="text-button"
                  onClick={() => review(r.ids[0])}
                >
                  Ver evidencia <ArrowUpRight size={14} />
                </button>
                <QuestionEvidence ids={r.ids} data={data} review={review} />
              </div>
            ))
          ) : (
            <Empty
              title="Sin repeticiones literales verificadas"
              description="Se normalizan espacios y Unicode, conservando acentos, puntuación y símbolos. Los cambios de orden entre modelos no crean una nueva observación."
            />
          )
        ) : tab === "relations" ? (
          <>
            <p className="muted">
              Relaciones explícitas revisadas a posteriori. Se distingue misma
              regla, mismo método y subaspectos relacionados. No es una prueba
              predictiva ni un inventario exhaustivo.
            </p>
            {p.reviewedRelations.map((r) => (
              <div className="pattern-row" key={r.id}>
                <strong>{r.name}</strong>
                <Badge>
                  {r.kind === "same_rule"
                    ? "Misma regla examinada"
                    : r.kind === "same_method"
                      ? "Mismo método de cálculo"
                      : "Subaspectos distintos"}
                </Badge>
                <p>{r.reason}</p>
                <QuestionEvidence
                  ids={r.questionIds}
                  data={data}
                  review={review}
                />
              </div>
            ))}
          </>
        ) : tab === "concept" ? (
          p.concepts.length ? (
            p.concepts.map((c) => (
              <div className="pattern-row" key={c.id}>
                <strong>{c.name}</strong>
                <p>
                  {c.count} preguntas · {c.years.join(", ")}
                  {c.consecutiveYears.length
                    ? ` · años consecutivos: ${c.consecutiveYears.join(", ")}`
                    : ""}
                </p>
                <button
                  className="text-button"
                  onClick={() => review(c.evidence[0])}
                >
                  Consultar evidencia
                </button>
                <QuestionEvidence
                  ids={c.evidence}
                  data={data}
                  review={review}
                />
              </div>
            ))
          ) : (
            <Empty
              title="Sin conceptos persistentes revisados"
              description="Redacciones distintas sólo se agrupan por concepto cuando su asignación ha sido revisada."
            />
          )
        ) : tab === "laws" ? (
          <>
            <p className="muted">
              Norma expresamente identificada en el enunciado, una vez por
              pregunta ordinaria. {stats.questions} preguntas en el corpus; la
              identificación de la norma no equivale a revisión completa de
              todos sus artículos.
            </p>
            {stats.laws.map((l) => {
              const ids = [
                ...new Map(
                  data.questions
                    .filter(
                      (q) =>
                        q.law === l.name &&
                        q.active &&
                        !q.reserve &&
                        q.documentaryEligible,
                    )
                    .map((q) => [q.canonicalId, q.id]),
                ).values(),
              ];
              return (
                <div className="pattern-row" key={l.name}>
                  <strong>{l.name}</strong>
                  <span>
                    {l.count} apariciones · {pct(l.share)}
                  </span>
                  <QuestionEvidence ids={ids} data={data} review={review} />
                </div>
              );
            })}
          </>
        ) : tab === "recent" ? (
          <>
            <p className="muted">
              Frecuencia histórica de todo el corpus frente a {p.recentFrom}–
              {Math.max(...stats.years)}. Las tasas son medias de proporciones
              por sesión, no probabilidades. Conceptos revisados:{" "}
              {stats.conceptClassified}/{stats.questions}; los pendientes
              limitan las conclusiones.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Apariciones históricas</th>
                    <th>Apariciones recientes</th>
                    <th>Tasa histórica por sesión</th>
                    <th>Tasa reciente por sesión</th>
                  </tr>
                </thead>
                <tbody>
                  {p.recentComparison.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.count}</td>
                      <td>{c.recentCount}</td>
                      <td>{pct(c.historicalRate)}</td>
                      <td>{pct(c.recentRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "similar" ? (
          <>
            <div className="notice">
              <Info size={17} />
              <span>
                {p.similarityMethod}
                {p.truncated
                  ? " Se muestran las primeras 1.000 preguntas del corpus."
                  : ""}
              </span>
            </div>
            {p.similar.length ? (
              p.similar.map((pair, i) => (
                <div className="similar-pair" key={i}>
                  <Badge>
                    Similitud {pair.score.toFixed(2)} · requiere revisión
                  </Badge>
                  <p>{data.questions.find((q) => q.id === pair.a)?.stem}</p>
                  <p>{data.questions.find((q) => q.id === pair.b)?.stem}</p>
                  <button
                    className="text-button"
                    onClick={() => review(pair.a)}
                  >
                    Revisar concepto
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Sin parejas por encima del umbral"
                description="La similitud de palabras no certifica que dos preguntas examinen el mismo concepto."
              />
            )}
          </>
        ) : tab === "temporal" ? (
          <TemporalDistribution stats={stats} />
        ) : tab === "dormant" ? (
          <>
            <p className="muted">
              Han pasado al menos tres años desde su última observación respecto
              al último año cubierto. Un año sin datos no demuestra ausencia. El
              tiempo sin aparecer no añade puntos a la prioridad ni implica que
              deba volver a preguntarse.
            </p>
            {p.dormant.length ? (
              p.dormant.map((c) => (
                <div className="pattern-row" key={c.id}>
                  <strong>{c.name}</strong>
                  <p>
                    Última observación: {c.lastYear} · {c.count} preguntas
                  </p>
                  <button
                    className="text-button"
                    onClick={() => review(c.evidence[0])}
                  >
                    Ver evidencia
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Sin intervalos históricos suficientes"
                description="Se necesitan varios años de corpus revisado para estudiar posibles ausencias."
              />
            )}
          </>
        ) : (
          <div className="two-col">
            <div>
              <h3>Estilo del enunciado</h3>
              {p.styles.length ? (
                p.styles.map((s) => (
                  <div className="pattern-row" key={s.name}>
                    <strong>{s.name}</strong>
                    <span>
                      {s.count} · {pct(s.share)}
                    </span>
                  </div>
                ))
              ) : (
                <Empty
                  title="Sin estilos contabilizables"
                  description="Valida las preguntas para comparar el estilo por año."
                />
              )}
            </div>
            <div>
              <h3>Trampas y distractores</h3>
              {p.distractors.length ? (
                p.distractors.map((s) => (
                  <div className="pattern-row" key={s.name}>
                    <strong>{s.name}</strong>
                    <span>{s.count}</span>
                  </div>
                ))
              ) : (
                <Empty
                  title="Sin distractores anotados"
                  description="Puedes revisar inversiones, excepciones, plazos y órganos en la administración."
                />
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
function Priorities({
  data,
  analysis,
  busy,
  weights,
  setWeights,
  kind,
  setKind,
  k,
  setK,
  review,
}: {
  data: Dataset;
  analysis: Analysis | null;
  busy: boolean;
  weights: Weights;
  setWeights: (w: Weights) => void;
  kind: "concept" | "article";
  setKind: (k: "concept" | "article") => void;
  k: number;
  setK: (n: number) => void;
  review: (id: string) => void;
}) {
  const [tab, setTab] = useState("ranking"),
    [evaluationMode, setEvaluationMode] = useState("strict");
  const r = analysis?.ranking,
    b =
      evaluationMode === "strict"
        ? analysis?.backtest
        : analysis?.reconstruction;
  return (
    <>
      <PageTitle
        eyebrow="ORIENTAR EL ESTUDIO, SIN FALSA PRECISIÓN"
        title="Prioridades 2027"
        description="Un ranking explicable de estudio, contrastado con el pasado. No es una predicción del examen."
      />
      <div className="notice amber">
        <AlertCircle size={18} />
        <span>
          {r?.probabilityStatus ||
            "La puntuación heurística no se convierte en una probabilidad de aparición."}{" "}
          El temario 2027 requiere confirmación oficial.
        </span>
      </div>
      <div className="tabs">
        <button
          className={tab === "ranking" ? "active" : ""}
          onClick={() => setTab("ranking")}
        >
          Ranking de estudio
        </button>
        <button
          className={tab === "validation" ? "active" : ""}
          onClick={() => setTab("validation")}
        >
          Validación histórica
        </button>
        <button
          className={tab === "method" ? "active" : ""}
          onClick={() => setTab("method")}
        >
          Método y pesos
        </button>
      </div>
      {busy && <p className="muted">Actualizando el análisis…</p>}
      {tab === "ranking" ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                {r?.heuristicAvailable
                  ? "Prioridad heurística de estudio"
                  : "Ranking descriptivo por frecuencia"}
              </h2>
              <p>
                {r?.trainingQuestions || 0} preguntas cotejadas · frecuencia
                normalizada por sesión
              </p>
            </div>
            <select
              aria-label="Tipo de ranking"
              value={kind}
              onChange={(e) => setKind(e.target.value as "concept" | "article")}
            >
              <option value="concept">Conceptos de estudio clasificados</option>
              <option value="article">Artículos verificados</option>
            </select>
          </div>
          <p className="muted">{r?.heuristicStatus}</p>
          <p className="muted">{r?.qualityNote}</p>
          {r?.priorities.length ? (
            r.priorities.map((p, i) => (
              <article className="priority-row" key={p.id}>
                <div className="priority-number">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {p.count} observaciones · años {p.years.join(", ")} · última
                    aparición {p.lastYear}
                  </p>
                  {p.topicIds.length > 1 && (
                    <p className="muted">
                      Temas de aparición:{" "}
                      {p.topicIds
                        .map(
                          (id) => data.topics.find((t) => t.id === id)?.number,
                        )
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <div className="priority-evidence">
                    <span>
                      Frecuencia histórica: <b>{pct(p.historicalRate)}</b>
                    </span>
                    <span>
                      Presencia reciente: <b>{pct(p.recentRate)}</b>
                    </span>
                  </div>
                  <details>
                    <summary>Por qué aparece y qué límites tiene</summary>
                    <p>
                      Componentes normalizados: frecuencia{" "}
                      {pct(p.components.historical)}, recencia{" "}
                      {pct(p.components.recent)}, persistencia{" "}
                      {pct(p.components.persistence)}, temario{" "}
                      {p.components.syllabus
                        ? "verificado para la fecha"
                        : "sin confirmación temporal"}
                      , cambio normativo{" "}
                      {p.components.legislation
                        ? "documentado"
                        : "sin cambio documentado"}
                      .
                    </p>
                    {p.warnings.map((w) => (
                      <p key={w} className="muted">
                        • {w}
                      </p>
                    ))}
                    <div className="evidence-buttons">
                      {p.evidence.slice(0, 8).map((id) => (
                        <button
                          className="text-button"
                          key={id}
                          onClick={() => review(id)}
                        >
                          Ver {data.questions.find((q) => q.id === id)?.year} ·
                          nº {data.questions.find((q) => q.id === id)?.number}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="priority-score">
                  <strong>
                    {p.score === null ? p.count : p.score.toFixed(1)}
                  </strong>
                  <small>
                    {p.score === null ? "APARICIONES" : "PUNTOS / 100"}
                  </small>
                  <Badge>
                    {p.score === null ? "Frecuencia" : "Heurística"}
                  </Badge>
                </div>
              </article>
            ))
          ) : (
            <Empty
              title="El ranking todavía no tiene evidencia suficiente"
              description="Valida preguntas con la plantilla definitiva y asigna conceptos o artículos revisados. No se completa el ranking con estadísticas ficticias."
            />
          )}
        </section>
      ) : tab === "validation" ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Evaluación retrospectiva temporal</h2>
                <p>
                  Entrenamiento anterior al examen · objetivo 2024, 2025 y 2026
                </p>
                <label>
                  Ámbito de evaluación
                  <select
                    aria-label="Ámbito de evaluación"
                    value={evaluationMode}
                    onChange={(e) => setEvaluationMode(e.target.value)}
                  >
                    <option value="strict">
                      Estricta: respuesta final y publicación acreditadas
                    </option>
                    <option value="documentary">
                      Reconstrucción documental exploratoria
                    </option>
                  </select>
                </label>
              </div>
              <label className="inline-label">
                Top k
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={k}
                  onChange={(e) =>
                    setK(
                      Math.max(1, Math.min(100, Number(e.target.value) || 10)),
                    )
                  }
                />
              </label>
            </div>
            <div className="notice">
              <Info size={18} />
              <span>{b?.status || "Preparando evaluación…"}</span>
            </div>
            {b?.rows.map((row) => (
              <div className="backtest-row" key={row.year}>
                <div>
                  <h3>{row.year}</h3>
                  <small>Corte: {row.cutoff}</small>
                  <p>
                    {row.trainingQuestions} preguntas de entrenamiento
                    <br />
                    {row.targetQuestions} preguntas objetivo ·{" "}
                    {row.classifiedTargetQuestions} con concepto
                  </p>
                  {row.assumedAvailabilityQuestions > 0 && (
                    <small>
                      {row.assumedAvailabilityQuestions} fechas de
                      disponibilidad supuestas a partir de la celebración. No es
                      una evaluación estricta.
                    </small>
                  )}
                </div>
                {row.status === "insufficient" ? (
                  <div className="backtest-empty">
                    <Badge tone="amber">Sin evaluación</Badge>
                    <p>{row.reason}</p>
                    {row.excludedUndated > 0 && (
                      <small>
                        {row.excludedUndated} preguntas anteriores excluidas por
                        falta de fecha de publicación.
                      </small>
                    )}
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Ranking</th>
                          <th>Aciertos de conceptos</th>
                          <th>Precisión @{row.k}</th>
                          <th>Cobertura conceptos</th>
                          <th>Cobertura preguntas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          [
                            row.heuristicAvailable
                              ? "Heurística"
                              : "Apariciones · sin puntuación heurística",
                            row.heuristic,
                          ],
                          ["Frecuencia histórica", row.frequency],
                          ["Aleatorio · semilla 2027", row.random],
                        ].map(([name, m]) => {
                          const metric = m as NonNullable<typeof row.heuristic>;
                          return (
                            <tr key={String(name)}>
                              <td>{String(name)}</td>
                              <td>
                                {metric.hits} / {row.targetConcepts}
                              </td>
                              <td>{pct(metric.precision)}</td>
                              <td>{pct(metric.conceptCoverage)}</td>
                              <td>{pct(metric.questionCoverage)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="muted">
                      Aleatorio medio (200 repeticiones):{" "}
                      {pct(row.randomMeanCoverage!)}. Conceptos nuevos fuera del
                      universo histórico: {row.unseenConcepts}. Intervalo Wilson
                      de cobertura heurística:{" "}
                      {row.heuristic!.coverageInterval.map(pct).join(" — ")}.
                    </p>
                    <Badge tone={row.beatsReferences ? "green" : "amber"}>
                      {row.beatsReferences
                        ? "Supera referencias en esta partición"
                        : "No supera ambas referencias"}
                    </Badge>
                    <details>
                      <summary>Resultados por tema</summary>
                      {row.heuristic?.byTopic.map((t) => (
                        <p key={t.topicId || "none"}>
                          {data.topics.find((d) => d.id === t.topicId)?.title ||
                            "Sin tema"}
                          : {t.covered}/{t.questions} · {pct(t.coverage)}
                        </p>
                      ))}
                    </details>
                  </div>
                )}
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>Límites de la evaluación</h2>
            {b?.limitations.map((l) => (
              <p className="method-paragraph" key={l}>
                {l}
              </p>
            ))}
          </section>
        </>
      ) : (
        <section className="panel weights">
          <h2>Cómo se calcula la prioridad</h2>
          <p>{r?.formula}</p>
          <div className="weight-grid">
            {(
              [
                "historical",
                "recent",
                "persistence",
                "syllabus",
                "legislation",
              ] as const
            ).map((key) => (
              <label key={key}>
                <span>
                  {
                    {
                      historical: "Frecuencia histórica",
                      recent: "Presencia reciente",
                      persistence: "Persistencia entre años",
                      syllabus: "Relevancia en el temario",
                      legislation: "Cambios legislativos",
                    }[key]
                  }
                  <b>{weights[key].toFixed(2)}</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights({ ...weights, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Inicio del periodo reciente
            <input
              type="number"
              min="2017"
              max="2026"
              value={weights.recentFrom}
              onChange={(e) =>
                setWeights({
                  ...weights,
                  recentFrom: Math.min(
                    2026,
                    Math.max(2017, Number(e.target.value) || 2023),
                  ),
                })
              }
            />
          </label>
          <button
            className="secondary"
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
          >
            <RefreshCw size={16} />
            Restablecer pesos
          </button>
          <div className="subtle-note">
            <Info size={18} />
            <p>
              Los pesos son exploratorios. Modificarlos después de ver un
              resultado retrospectivo implica ajuste a ese resultado: exige otro
              año independiente para validar. La calidad y la cobertura se
              muestran como límites; no se ocultan mediante un multiplicador de
              confianza.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
function Simulations({
  data,
  refresh,
}: {
  data: Dataset;
  refresh: () => Promise<void>;
}) {
  const [topic, setTopic] = useState(""),
    [n, setN] = useState(20),
    [priority, setPriority] = useState(false),
    [questions, setQuestions] = useState<Question[]>([]),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [result, setResult] = useState<{
      attempt: Dataset["attempts"][number];
      correction: {
        id: string;
        correct: number;
        explanation: string;
        law: string | null;
        article: string | null;
        legalUrl: string | null;
        legalVerified: boolean;
      }[];
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const eligible = data.questions.filter(
    (q) => q.validation === "validated" && q.active && q.correct !== null,
  );
  const unique = [...new Map(eligible.map((q) => [q.canonicalId, q])).values()];
  async function create() {
    setError("");
    const idsPool = new Set<string>(await api("simulation-pool"));
    let pool = data.questions
      .filter((q) => idsPool.has(q.id))
      .filter((q) => !topic || q.topicId === topic);
    if (priority) {
      const a = await api("analysis", {
        weights: DEFAULT_WEIGHTS,
        kind: "concept",
        k: 10,
      });
      const ids = new Set(
        a.ranking.priorities.slice(0, 10).map((p: { id: string }) => p.id),
      );
      pool = pool.filter((q) => q.conceptId && ids.has(q.conceptId));
    }
    if (!pool.length) {
      setError("No hay preguntas definitivas validadas para esta selección.");
      return;
    }
    pool = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    setQuestions(pool);
    setAnswers({});
    setResult(null);
  }
  return (
    <>
      <PageTitle
        eyebrow="PRACTICAR CON EL ORIGINAL"
        title="Simulacros"
        description="Tests de preguntas oficiales validadas. Corrección y resultados guardados en tu espacio privado."
      />
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      {!questions.length ? (
        <>
          <section className="panel simulation-config">
            <div className="small-icon">
              <Target size={26} />
            </div>
            <h2>Diseña tu siguiente test</h2>
            <p>
              {unique.length} preguntas definitivas disponibles, sin duplicar
              modelos.
            </p>
            <div className="filter-grid">
              <label>
                Tema
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="">Todos los temas</option>
                  {data.topics
                    .filter((t) => t.number <= 23)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.number}. {t.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Número de preguntas
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={n}
                  onChange={(e) =>
                    setN(
                      Math.max(1, Math.min(100, Number(e.target.value) || 20)),
                    )
                  }
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={priority}
                onChange={(e) => setPriority(e.target.checked)}
              />
              Sólo conceptos del top 10 de prioridades heurísticas
            </label>
            <button
              className="primary"
              disabled={!unique.length}
              onClick={() => create().catch((e) => setError(e.message))}
            >
              Crear simulacro <ArrowRight size={16} />
            </button>
            {!unique.length && (
              <Empty
                title="Primero, una base fiable"
                description="Los borradores no sirven para corregir un test con garantías. Revisa el cuadernillo y su plantilla definitiva en Administración."
              />
            )}
            <p className="muted">
              Este modo utiliza exclusivamente preguntas oficiales. La
              generación de preguntas nuevas no está habilitada.
            </p>
          </section>
          <section className="panel">
            <h2>Mis resultados</h2>
            {data.attempts.length ? (
              data.attempts
                .slice()
                .reverse()
                .map((a) => (
                  <div className="attempt" key={a.id}>
                    <span>{new Date(a.createdAt).toLocaleString("es-ES")}</span>
                    <strong>
                      {a.correct} / {a.total}
                    </strong>
                    <Badge tone="green">{pct(a.correct / a.total)}</Badge>
                    <details>
                      <summary>Por tema</summary>
                      {Object.entries(a.topicResults).map(([id, v]) => (
                        <p key={id}>
                          {data.topics.find((t) => t.id === id)?.title ||
                            "Sin tema"}
                          : {v.correct}/{v.total}
                        </p>
                      ))}
                    </details>
                  </div>
                ))
            ) : (
              <Empty
                title="Aún no has realizado simulacros"
                description="Cada test corregido guarda respuestas, fecha y resultados por tema."
              />
            )}
          </section>
        </>
      ) : (
        <>
          <div className="simulation-status">
            <strong>
              {result
                ? `Resultado: ${result.attempt.correct}/${result.attempt.total}`
                : `${Object.keys(answers).length}/${questions.length} respondidas`}
            </strong>
            <button
              className="secondary"
              onClick={() => {
                setQuestions([]);
                setResult(null);
              }}
            >
              Nuevo test
            </button>
          </div>
          {questions.map((q, i) => {
            const correction = result?.correction.find((c) => c.id === q.id);
            return (
              <article className="question-card" key={q.id}>
                <Badge tone="green">
                  Pregunta oficial · {q.year} · nº {q.number}
                </Badge>
                <h3>
                  {i + 1}. {q.stem}
                </h3>
                <fieldset className="options" disabled={!!result}>
                  <legend className="sr-only">Selecciona una respuesta</legend>
                  {q.options.map((o, index) => (
                    <label
                      key={index}
                      className={
                        "option " +
                        (correction?.correct === index
                          ? "correct"
                          : answers[q.id] === index
                            ? "selected"
                            : "")
                      }
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={index}
                        checked={answers[q.id] === index}
                        onChange={() =>
                          setAnswers({ ...answers, [q.id]: index })
                        }
                      />
                      <span>{String.fromCharCode(65 + index)}</span>
                      <p>{o}</p>
                    </label>
                  ))}
                </fieldset>
                {correction && (
                  <div className="answer-note">
                    <strong>
                      {answers[q.id] === correction.correct
                        ? "Correcta"
                        : answers[q.id] === undefined
                          ? "Sin contestar"
                          : "Incorrecta"}{" "}
                      · respuesta {String.fromCharCode(65 + correction.correct)}
                    </strong>
                    <p>{correction.explanation}</p>
                    {correction.legalUrl && (
                      <a
                        href={correction.legalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {correction.law} · art. {correction.article}
                        {!correction.legalVerified
                          ? " · referencia sin cotejar"
                          : ""}
                      </a>
                    )}
                    <SourceLink
                      source={data.sources.find((s) => s.id === q.sourceId)}
                    />
                  </div>
                )}
              </article>
            );
          })}
          {!result && (
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setResult(
                    await api("simulations", {
                      questionIds: questions.map((q) => q.id),
                      answers,
                    }),
                  );
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Corrigiendo…" : "Corregir y guardar"}{" "}
              <CheckCircle2 size={17} />
            </button>
          )}
        </>
      )}
    </>
  );
}

function TemporalDistribution({ stats }: { stats: Stats }) {
  const [group, setGroup] = useState("year"),
    [metric, setMetric] = useState<"topics" | "styles" | "distractors">(
      "topics",
    ),
    [selected, setSelected] = useState("");
  const series =
    group === "year"
      ? stats.byYear.map((row) => ({ ...row, label: String(row.year) }))
      : stats.bySession;
  const labels = [
    ...new Set(series.flatMap((row) => row[metric].map((item) => item.name))),
  ].sort();
  const active = labels.includes(selected) ? selected : labels[0];
  const chart = series.map((row) => ({
    label: row.label,
    share: 100 * (row[metric].find((item) => item.name === active)?.share || 0),
    questions: row.questions,
  }));
  if (!series.length)
    return (
      <Empty
        title="Sin distribución temporal cotejada"
        description="Para comparar temas, estilos y distractores por año o sesión se necesitan transcripciones cotejadas. Los huecos del archivo no se rellenan con ceros históricos."
      />
    );
  return (
    <>
      <div className="form-grid">
        <label>
          Agrupar por
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="year">Año</option>
            <option value="session">Convocatoria / sesión</option>
          </select>
        </label>
        <label>
          Contenido
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
          >
            <option value="topics">Temas revisados</option>
            <option value="styles">Estilo de preguntas</option>
            <option value="distractors">Tipos de distractor</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Proporciones respecto a las preguntas ordinarias cotejadas disponibles
        en cada periodo. Una celda sin anotaciones no demuestra ausencia
        histórica.
      </p>
      {labels.length ? (
        <>
          <label className="series-selector">
            Contenido del gráfico
            <select
              value={active || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {labels.map((label) => (
                <option key={label}>{label}</option>
              ))}
            </select>
          </label>
          <div className="chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis unit=" %" />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value).toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`,
                    active,
                  ]}
                />
                <Bar
                  name="Proporción observada"
                  dataKey="share"
                  fill="#34715b"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Contenido</th>
                  {series.map((row) => (
                    <th key={row.label}>
                      {row.label}
                      <br />
                      {row.questions} preguntas
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {series.map((row) => {
                      const item = row[metric].find(
                        (item) => item.name === label,
                      );
                      return (
                        <td
                          key={row.label}
                          style={
                            item
                              ? {
                                  background: `rgba(91,137,74,${0.05 + 0.4 * item.share})`,
                                }
                              : undefined
                          }
                        >
                          {item ? (
                            <>
                              {item.count} · {pct(item.share)}
                            </>
                          ) : (
                            "Sin anotación"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty
          title="Faltan anotaciones revisadas para este contenido"
          description="Las preguntas cotejadas se conservan como denominador; no se atribuyen temas, estilos o distractores inexistentes."
        />
      )}
    </>
  );
}
