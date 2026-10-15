// Local harness for the actual OpenNext-generated Netlify function. Not a production server.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = process.cwd();
const functionRoot = path.join(
  root,
  ".netlify/functions-internal/___netlify-server-handler",
);
// Netlify provides this metadata and cache service in production. Simulate cache misses locally.
const blobServer = http.createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});
await new Promise((resolve) => blobServer.listen(0, "127.0.0.1", resolve));
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
  JSON.stringify({
    deployID: "localtest",
    siteID: "localtest",
    token: "localtest",
    edgeURL: `http://127.0.0.1:${blobServer.address().port}`,
    primaryRegion: "us-east-2",
  }),
).toString("base64");
process.chdir(functionRoot);
const handler = (
  await import(
    pathToFileURL(path.join(functionRoot, "___netlify-server-handler.mjs"))
  )
).default;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:3003");
    if (
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === "/sw.js" ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/_next/static/")
    ) {
      const relative = url.pathname.slice(1);
      if (relative.includes("..")) {
        res.writeHead(400);
        return res.end();
      }
      res.setHeader(
        "content-type",
        relative.endsWith(".js")
          ? "application/javascript"
          : relative.endsWith(".css")
            ? "text/css"
            : relative.endsWith(".webmanifest")
              ? "application/manifest+json"
              : relative.endsWith(".png")
                ? "image/png"
                : "image/svg+xml",
      );
      return res.end(
        await fs.readFile(path.join(root, ".netlify/static", relative)),
      );
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(",") : value);
    const request = new Request(url, {
      method: req.method,
      headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Buffer.concat(chunks), duplex: "half" }
        : {}),
    });
    const context = {
      account: { id: "local-test" },
      deploy: { id: "local-test" },
      site: { id: "local-test", url: url.origin },
      requestId: crypto.randomUUID(),
      waitUntil: (promise) => promise.catch(() => {}),
    };
    const response = await handler(request, context);
    res.statusCode = response.status;
    for (const [key, value] of response.headers)
      if (key !== "set-cookie") res.setHeader(key, value);
    if (response.headers.getSetCookie().length)
      res.setHeader("set-cookie", response.headers.getSetCookie());
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Local Netlify harness error");
  }
});
server.listen(3003, "127.0.0.1");
