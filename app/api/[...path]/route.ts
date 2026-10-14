import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorized,
  COOKIE,
  configured,
  loginAllowed,
  loginFailed,
  safeOrigin,
  secureEqual,
  sessionToken,
} from "@/lib/auth";
import { dataset, initialize } from "@/lib/store";
import { audit, getDB, put } from "@/lib/db";
import {
  attachAnswerKey,
  bundleSchema,
  extractPDF,
  importBundle,
  officialURL,
  sourceSchema,
} from "@/lib/importer";
import { reviewQuestion } from "@/lib/review";
import { storePDF, readPDF } from "@/lib/files";
import {
  frequencies,
  patterns,
  rank,
  backtest,
  validatedCorpus,
} from "@/lib/analysis";
import type { Source, Weights } from "@/lib/types";
import { isDocumentaryVerified, verificationState } from "@/lib/documentary";
import { articleProfiles, validationByYear } from "@/lib/history";
import { classificationWorklist } from "@/lib/quality-audit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function response(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
function weightsOf(input: unknown) {
  return z
    .object({
      historical: z.number().min(0).max(1).optional(),
      recent: z.number().min(0).max(1).optional(),
      persistence: z.number().min(0).max(1).optional(),
      syllabus: z.number().min(0).max(1).optional(),
      legislation: z.number().min(0).max(1).optional(),
      recentFrom: z.number().int().min(1900).max(2027).optional(),
    })
    .parse(input || {}) as Partial<Weights>;
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const segments = (await ctx.params).path;
  const action = segments[0],
    id = segments[1];
  try {
    if (req.method !== "GET" && !safeOrigin(req))
      return response({ error: "Origen no permitido." }, 403);
    if (action === "login" && req.method === "POST") {
      if (!configured())
        return response(
          {
            error:
              "Configura PRIVATE_APP_PASSWORD y SESSION_SECRET (mínimo 32 caracteres) antes de iniciar producción.",
          },
          503,
        );
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
      if (!loginAllowed(ip))
        return response(
          { error: "Demasiados intentos. Espera 15 minutos." },
          429,
        );
      const { password } = z
        .object({ password: z.string().max(512) })
        .parse(await req.json());
      if (
        !process.env.PRIVATE_APP_PASSWORD ||
        !secureEqual(password, process.env.PRIVATE_APP_PASSWORD)
      ) {
        loginFailed(ip);
        return response({ error: "Contraseña incorrecta." }, 401);
      }
      const r = response({ ok: true });
      r.cookies.set(COOKIE, sessionToken(), {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" ||
          req.nextUrl.protocol === "https:",
        sameSite: "strict",
        maxAge: 7 * 86400,
        path: "/",
      });
      return r;
    }
    if (!authorized(req))
      return response(
        {
          error: configured()
            ? "Acceso privado: inicia sesión."
            : "Falta configurar autenticación de producción.",
        },
        configured() ? 401 : 503,
      );
    await initialize();
    if (action === "classification-audit" && req.method === "GET")
      return response(classificationWorklist(await dataset()));
    if (action === "logout" && req.method === "POST") {
      const r = response({ ok: true });
      r.cookies.delete(COOKIE);
      return r;
    }
    if (action === "bootstrap" && req.method === "GET") {
      const data = await dataset();
      return response({
        data: {
          ...data,
          questions: data.questions.map((q) => ({
            ...q,
            documentaryEligible: isDocumentaryVerified(q, data),
            verificationState: verificationState(q, data),
          })),
        },
        stats: frequencies(data),
        validationByYear: validationByYear(data),
        simulationIds: validatedCorpus(data).questions.map((q) => q.id),
      });
    }
    if (action === "articles" && req.method === "GET")
      return response(articleProfiles(await dataset()));
    if (action === "validation-report" && req.method === "GET")
      return response(validationByYear(await dataset()));
    if (action === "simulation-pool" && req.method === "GET")
      return response(
        validatedCorpus(await dataset()).questions.map((q) => q.id),
      );
    if (action === "analysis" && req.method === "POST") {
      const input = await req.json(),
        weights = weightsOf(input.weights);
      const data = await dataset();
      return response({
        ranking: rank(
          data,
          weights,
          2027,
          "2027-01-01",
          input.kind === "article" ? "article" : "concept",
        ),
        patterns: patterns(data, weights),
        backtest: backtest(
          data,
          weights,
          z
            .number()
            .int()
            .min(1)
            .max(100)
            .parse(input.k ?? 10),
          2027,
        ),
        reconstruction: backtest(
          data,
          weights,
          z
            .number()
            .int()
            .min(1)
            .max(100)
            .parse(input.k ?? 10),
          2027,
          "documentary_reconstruction",
        ),
      });
    }
    if (action === "export" && req.method === "GET") {
      const data = await dataset();
      return new NextResponse(
        JSON.stringify(
          { schemaVersion: 1, exportedAt: new Date().toISOString(), ...data },
          null,
          2,
        ),
        {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition":
              'attachment; filename="gc-predictor-export.json"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (action === "extract" && req.method === "POST") {
      const form = await req.formData(),
        file = form.get("file");
      if (!(file instanceof File)) throw Error("Selecciona un archivo PDF.");
      const storage = await storePDF(file);
      const extraction = await extractPDF(new Uint8Array(storage.bytes));
      return response({
        ...extraction,
        storage: { key: storage.key, sha256: storage.sha256 },
      });
    }
    if (action === "import" && req.method === "POST") {
      const body = await req.json();
      const storage = body.storage
        ? z
            .object({
              key: z.string().regex(/^originals\/[a-f0-9]{64}\.pdf$/),
              sha256: z.string().regex(/^[a-f0-9]{64}$/),
            })
            .parse(body.storage)
        : undefined;
      if (storage) {
        const { createHash } = await import("node:crypto");
        const bytes = await readPDF(storage.key);
        if (createHash("sha256").update(bytes).digest("hex") !== storage.sha256)
          throw Error("Huella del documento incompatible.");
      }
      return response(await importBundle(body.bundle || body, storage));
    }
    if (action === "answer-key" && req.method === "POST") {
      const body = await req.json();
      return response(
        await attachAnswerKey(
          z.string().parse(body.examId),
          body.source,
          body.entries,
          body.storage,
        ),
      );
    }
    if (action === "questions" && id && req.method === "PATCH")
      return response(await reviewQuestion(id, await req.json()));
    if (action === "sources" && id && req.method === "PATCH") {
      const fields = z
        .object({
          verified: z.boolean(),
          definitive: z.boolean(),
          publishedAt: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable(),
          notes: z.string().min(5).max(6000),
        })
        .parse(await req.json());
      return getDB().transaction(async (tx) => {
        const data = await dataset(tx),
          source = data.sources.find((s) => s.id === id);
        if (!source) throw Error("Fuente inexistente.");
        if (
          fields.verified &&
          (source.origin !== "official" || !officialURL(source.url))
        )
          throw Error("Sólo se verifica como oficial una URL institucional.");
        if (
          fields.definitive &&
          (source.kind !== "answer_key" ||
            !fields.verified ||
            source.answerKeyStatus === "superseded")
        )
          throw Error(
            "Sólo una plantilla oficial verificada y no sustituida puede ser definitiva.",
          );
        const updated: Source = { ...source, ...fields };
        await put(tx, "sources", updated as unknown as Record<string, unknown>);
        await audit(tx, id, "review_source", source, updated);
        for (const q of data.questions.filter(
          (q) => q.sourceId === id || q.keySourceId === id,
        )) {
          const examSource =
              q.sourceId === id
                ? updated
                : data.sources.find((s) => s.id === q.sourceId),
            keySource =
              q.keySourceId === id
                ? updated
                : data.sources.find((s) => s.id === q.keySourceId);
          const dates = [examSource?.publishedAt, keySource?.publishedAt];
          const changed = {
            ...q,
            validation:
              q.validation === "validated" ? "reviewed" : q.validation,
            availableAt: dates.every(Boolean)
              ? (dates as string[]).sort().at(-1)!
              : null,
          };
          await put(tx, "questions", changed);
          await audit(tx, q.id, "source_changed_revalidation", q, changed);
        }
        return response(updated);
      });
    }
    if (action === "documents" && id && req.method === "GET") {
      const data = await dataset(),
        source = data.sources.find((s) => s.id === id);
      if (!source?.storageKey) throw Error("No hay copia local del documento.");
      const bytes = await readPDF(source.storageKey);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="original.pdf"',
          "Cache-Control": "no-store",
        },
      });
    }
    if (action === "audit" && id && req.method === "GET")
      return response(
        await getDB().query(
          "SELECT action,actor,before_payload,after_payload,created_at FROM audit_events WHERE entity_id=? ORDER BY created_at DESC",
          [id],
        ),
      );
    if (action === "law-changes" && req.method === "POST") {
      const change = z
        .object({
          law: z.string().min(3).max(500),
          article: z.string().max(100).nullable(),
          effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          sourceUrl: z.string().url(),
          summary: z.string().min(10).max(3000),
          affectedConceptId: z.string().nullable(),
          reviewed: z.boolean(),
        })
        .parse(await req.json());
      if (!officialURL(change.sourceUrl))
        throw Error("Introduce fuente normativa oficial.");
      const record = { ...change, id: crypto.randomUUID() };
      await getDB().transaction(async (tx) => {
        await put(tx, "law_changes", record);
        await audit(tx, record.id, "add_law_change", null, record);
      });
      return response(record);
    }
    if (action === "syllabus" && req.method === "POST") {
      const input = z
        .object({
          year: z.number().int().min(2017).max(2100),
          effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          source: sourceSchema,
          topics: z
            .array(
              z.object({
                number: z.number().int().min(1).max(100),
                title: z.string().min(3).max(300),
              }),
            )
            .min(1)
            .max(100),
        })
        .parse(await req.json());
      if (
        input.source.kind !== "syllabus" ||
        !input.source.verified ||
        input.source.origin !== "official" ||
        !officialURL(input.source.url)
      )
        throw Error(
          "La versión del temario necesita fuente oficial verificada.",
        );
      if (
        new Set(input.topics.map((t) => t.number)).size !== input.topics.length
      )
        throw Error("Hay temas duplicados.");
      const { sourceRecord } = await import("@/lib/importer");
      return getDB().transaction(async (tx) => {
        const src = sourceRecord(input.source),
          syllabus = {
            id: crypto.randomUUID(),
            year: input.year,
            effectiveFrom: input.effectiveFrom,
            sourceId: src.id,
            status: "verified",
            notes: "Versión revisada manualmente; conserva las anteriores.",
          };
        await put(tx, "sources", src as unknown as Record<string, unknown>);
        await put(tx, "syllabi", syllabus);
        for (const t of input.topics)
          await put(tx, "topics", {
            ...t,
            id: `${syllabus.id}-${t.number}`,
            syllabusId: syllabus.id,
          });
        await audit(tx, syllabus.id, "new_syllabus", null, syllabus);
        return response(syllabus);
      });
    }
    if (action === "simulations" && req.method === "POST") {
      const body = z
        .object({
          questionIds: z.array(z.string()).min(1).max(100),
          answers: z.record(z.string(), z.number().int().min(0).max(3)),
        })
        .parse(await req.json());
      if (new Set(body.questionIds).size !== body.questionIds.length)
        throw Error("Pregunta duplicada.");
      const data = await dataset(),
        qs = validatedCorpus(data).questions.filter((q) =>
          body.questionIds.includes(q.id),
        );
      if (qs.length !== body.questionIds.length)
        throw Error(
          "El simulacro incluye preguntas no definitivas, anuladas o duplicadas por modelo.",
        );
      if (
        Object.keys(body.answers).some((id) => !body.questionIds.includes(id))
      )
        throw Error("Respuesta ajena al simulacro.");
      const topicResults: Record<string, { correct: number; total: number }> =
        {};
      let correct = 0;
      for (const q of qs) {
        const right = body.answers[q.id] === q.correct;
        if (right) correct++;
        const t = q.topicId || "sin-tema";
        topicResults[t] ??= { correct: 0, total: 0 };
        topicResults[t].total++;
        if (right) topicResults[t].correct++;
      }
      const attempt = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...body,
        correct,
        total: qs.length,
        topicResults,
      };
      await put(getDB(), "attempts", attempt);
      return response({
        attempt,
        correction: qs.map((q) => ({
          id: q.id,
          correct: q.correct,
          explanation:
            q.explanation ||
            "No hay explicación jurídica revisada. Consulta la norma y el cuadernillo original.",
          law: q.law,
          article: q.article,
          legalUrl: q.legalUrl,
          legalVerified: q.legalVerified,
          sourceId: q.sourceId,
          keySourceId: q.keySourceId,
        })),
      });
    }
    return response({ error: "Ruta no encontrada." }, 404);
  } catch (e) {
    if (e instanceof z.ZodError)
      return response(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    const message = e instanceof Error ? e.message : "Error inesperado";
    console.error(`[GC Predictor ${action}] ${message}`);
    return response({ error: message }, 400);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
