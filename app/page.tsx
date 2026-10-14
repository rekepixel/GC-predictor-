import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, localOpen, verifySession } from "@/lib/auth";
import App from "@/components/app";
export const dynamic = "force-dynamic";
export default async function Page() {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  if (!verifySession(jar.get(COOKIE)?.value) && !localOpen(h.get("host") || ""))
    redirect("/login");
  return <App />;
}
