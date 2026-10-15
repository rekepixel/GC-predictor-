// Test double for the Supabase Storage HTTP contract. Never used in production.
import http from "node:http";
import crypto from "node:crypto";
export async function storageEmulator() {
  const stats = { writes: 0 };
  const secret = crypto.randomBytes(24).toString("hex"),
    objects = new Map(),
    tickets = new Map();
  let bucket = false;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost"),
      pathname = decodeURIComponent(url.pathname).replace(/^\/storage\/v1/, "");
    const reply = (code, value) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(value));
    };
    const ticket = tickets.get(url.searchParams.get("token"));
    if (ticket && pathname === ticket.path && ticket.expires > Date.now()) {
      if (req.method === "PUT" && ticket.upload) {
        stats.writes++;
        if (objects.has(ticket.key))
          return reply(409, { error: "Duplicate", statusCode: "409" });
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        objects.set(ticket.key, Buffer.concat(chunks));
        return reply(200, { ok: true });
      }
      if (req.method === "GET" && !ticket.upload && objects.has(ticket.key)) {
        res.end(objects.get(ticket.key));
        return;
      }
    }
    if (
      req.headers.apikey !== secret ||
      req.headers.authorization !== `Bearer ${secret}`
    )
      return reply(403, { error: "private" });
    if (pathname.startsWith("/bucket")) {
      if (req.method === "POST") {
        bucket = true;
        return reply(200, { name: "gc-originals", public: false });
      }
      return reply(bucket ? 200 : 404, { public: false });
    }
    const upload = pathname.startsWith("/object/upload/sign/"),
      download = pathname.startsWith("/object/sign/");
    if (req.method === "POST" && (upload || download)) {
      const key = pathname.replace(
        upload ? "/object/upload/sign/" : "/object/sign/",
        "",
      );
      const path = (upload ? "/object/upload/sign/" : "/object/sign/") + key,
        token = crypto.randomBytes(18).toString("hex");
      tickets.set(token, { key, path, upload, expires: Date.now() + 120000 });
      return reply(
        200,
        upload
          ? { url: path + "?token=" + token }
          : { signedURL: path + "?token=" + token },
      );
    }
    const key = pathname.replace(/^\/object\/(authenticated\/)?/, "");
    if (req.method === "POST") {
      stats.writes++;
      if (objects.has(key))
        return reply(400, { error: "Duplicate", statusCode: "409" });
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      objects.set(key, Buffer.concat(chunks));
      return reply(200, { ok: true });
    }
    if (req.method === "GET" && objects.has(key)) {
      res.end(objects.get(key));
      return;
    }
    reply(404, { error: "missing" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    objects,
    url: `http://127.0.0.1:${server.address().port}`,
    secret,
    stats,
  };
}
