"use client";
import { useState } from "react";
import { ShieldCheck, ArrowRight, LockKeyhole } from "lucide-react";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand-mark">
          <ShieldCheck size={30} />
        </div>
        <p className="eyebrow">TU PREPARACIÓN. TUS DATOS.</p>
        <h1>
          GC Predictor<span>.</span>
        </h1>
        <p>
          Un espacio privado para preparar Guardia Civil 2027 con evidencia
          verificable.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  password: new FormData(e.currentTarget).get("password"),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              location.href = "/";
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo conectar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Contraseña de acceso
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Tu contraseña privada"
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Comprobando…" : "Entrar en mi espacio"}
            <ArrowRight size={18} />
          </button>
        </form>
        <small>
          <LockKeyhole size={14} /> Las preguntas y tus resultados permanecen
          privados.
        </small>
      </div>
    </main>
  );
}
