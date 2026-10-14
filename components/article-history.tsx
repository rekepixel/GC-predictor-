"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import type { Dataset } from "@/lib/types";
import type { articleProfiles, validationByYear } from "@/lib/history";
import { api, Badge, Empty, QuestionCard } from "./app";
type Profile = ReturnType<typeof articleProfiles>[number];
export function ArticleHistory({
  data,
  review,
}: {
  data: Dataset;
  review: (id: string) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api("articles")
      .then((d) => {
        if (active) setProfiles(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [data]);
  const options = profiles.filter((p) =>
    `${p.law} ${p.article}`
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es")),
  );
  const profile = options.find((p) => p.id === selected) || options[0];
  return (
    <>
      <section className="panel">
        <h2>Ficha de artículo e historial de apariciones</h2>
        <p className="muted">
          Una aparición por pregunta ordinaria cotejada. Las variantes A/B y las
          reservas no añaden apariciones.
        </p>
        <div className="form-grid">
          <label>
            Buscar norma o artículo
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código Civil, 6, Constitución…"
            />
          </label>
          <label>
            Artículo
            <select
              aria-label="Seleccionar artículo"
              value={profile?.id || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="" disabled>
                Selecciona una referencia cotejada
              </option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.law} · art. {p.article}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {profile ? (
          <>
            <h3>
              {profile.law} · artículo {profile.article}
            </h3>
            <div className="question-tags">
              <Badge tone="green">
                {profile.count}{" "}
                {profile.count === 1 ? "aparición" : "apariciones"} comprobadas
              </Badge>
              <Badge>Años: {profile.years.join(", ")}</Badge>
              <Badge>
                {profile.checkedAsOf
                  ? "Norma cotejada al " + profile.checkedAsOf
                  : "Fecha normativa pendiente"}
              </Badge>
            </div>
            {profile.url && (
              <a
                className="source-link"
                href={profile.url}
                target="_blank"
                rel="noreferrer"
              >
                Consultar texto normativo y versión del BOE{" "}
                <ExternalLink size={13} />
              </a>
            )}
            <p className="muted">
              Conceptos examinados: {profile.concepts.join("; ")}.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Año y sesión</th>
                    <th>Pregunta ordinaria</th>
                    <th>Variantes equivalentes</th>
                    <th>Apartado</th>
                    <th>Respuesta</th>
                    <th>Versión normativa por aparición</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.history.map((h) => (
                    <tr key={h.questionId}>
                      <td>
                        {h.year}
                        <small>{h.session}</small>
                      </td>
                      <td>
                        {h.model}
                        {h.number}
                      </td>
                      <td>
                        {h.variants
                          .map(
                            (v) =>
                              `${v.model}${v.number} · pág. ${v.sourcePage}`,
                          )
                          .join(" / ")}
                      </td>
                      <td>{h.paragraph || "Sólo artículo cotejado"}</td>
                      <td>
                        {h.finality === "final_confirmed"
                          ? "Definitiva acreditada"
                          : h.finality === "corroborated_documentary"
                            ? "Copia de clave corroborada · situación final pendiente"
                            : "Clave oficial cotejada · situación final pendiente"}
                      </td>
                      <td>
                        {h.legalUrl ? (
                          <a href={h.legalUrl} target="_blank" rel="noreferrer">
                            {h.checkedAsOf || "Consultar versión"}
                          </a>
                        ) : (
                          "Sin versión cotejada"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="notice amber">
              <Info size={17} />
              <span>
                La referencia normativa está cotejada para la fecha indicada.
                Este historial describe lo publicado; no acredita la firmeza
                final de las respuestas ni predice futuras convocatorias.
              </span>
            </div>
          </>
        ) : (
          <Empty
            title={
              loading
                ? "Cargando referencias…"
                : "Sin artículos cotejados para esta búsqueda"
            }
            description="Sólo se ofrecen fichas cuando existe una pregunta cotejada y una referencia normativa comprobada."
          />
        )}
      </section>
      {profile?.history.map((h) => {
        const q = data.questions.find((q) => q.id === h.questionId);
        return q ? (
          <QuestionCard key={q.id} q={q} data={data} review={review} />
        ) : null;
      })}
    </>
  );
}
export function ValidationLedger({ data }: { data: Dataset }) {
  const [rows, setRows] = useState<ReturnType<typeof validationByYear>>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("validation-report")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [data]);
  return (
    <section className="panel">
      <h2>Registro de verificación por año</h2>
      <p className="muted">
        Tres estados: cotejo documental completo; respuesta y anulaciones
        definitivas acreditadas; comprobaciones documentales adicionales
        pendientes. Las fuentes secundarias mantienen su procedencia y sus
        límites.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th>Ordinarias cotejadas</th>
              <th>Definitivas acreditadas</th>
              <th>Registros por revisar</th>
              <th>Variantes A/B excluidas</th>
              <th>Reservas inactivas</th>
              <th>Anulaciones registradas</th>
              <th>Documentación pendiente</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td>
                  <strong>{r.year}</strong>
                  <small>
                    {r.models} modelos · {r.validSessions} sesiones cotejadas ·{" "}
                    {r.forms} formas
                  </small>
                </td>
                <td>
                  {r.verifiedOrdinary}
                  <small>
                    {r.primaryOrdinary} descarga oficial ·{" "}
                    {r.corroboratedOrdinary} copia corroborada
                  </small>
                </td>
                <td>
                  {r.definitiveOrdinary}
                  <small>
                    {r.finalityPending
                      ? `${r.finalityPending} sin acreditación específica de respuesta final/anulaciones`
                      : ""}
                  </small>
                </td>
                <td>{r.pendingImportedRecords}</td>
                <td>{r.duplicateModelRecords}</td>
                <td>{r.inactiveReserveQuestions}</td>
                <td>{r.discardedCancelledRecords}</td>
                <td>
                  {r.missingExamDocuments
                    ? "Falta original primario"
                    : r.pendingImportedRecords
                      ? "Cotejo pendiente"
                      : r.finalityPending
                        ? "Situación final por pregunta pendiente"
                        : "Consultar fuentes"}
                  <small>
                    {r.secondaryDocumentsPending
                      ? `${r.secondaryDocumentsPending} copias secundarias pendientes de autenticar. `
                      : ""}
                    {r.notes}
                    {r.conceptsPending
                      ? ` ${r.conceptsPending} conceptos específicos pendientes.`
                      : ""}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice">
        <Info size={17} />
        <span>
          Para 2026 se cotejan 210 registros de modelo y se consolidan 105
          preguntas: 100 ordinarias y 5 reservas. No se ha acreditado una
          relación final de anulaciones; cero anulaciones registradas no
          significa que se haya probado su inexistencia.
        </span>
      </div>
    </section>
  );
}
