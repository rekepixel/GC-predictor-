/** Netlify must never silently fall back to an ephemeral SQLite database. */
export function remoteOnly() {
  return (
    process.env.NETLIFY === "true" ||
    process.env.GC_REMOTE_ONLY === "1" ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}
export function requireCloudStorage() {
  if (
    remoteOnly() &&
    (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
    throw Error("Falta configurar el almacenamiento privado de Supabase.");
}
