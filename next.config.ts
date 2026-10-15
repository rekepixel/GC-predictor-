import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pdfjs-dist"],
  // PDF.js loads its fake-worker module dynamically; tracing otherwise omits it on Netlify.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  poweredByHeader: false,
  ...(process.env.GC_REMOTE_ONLY === "1" || process.env.NETLIFY === "true"
    ? {
        outputFileTracingExcludes: {
          "/*": ["./data/**/*", "./.local/**/*", "./deployment/seed/**/*"],
        },
      }
    : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};
export default config;
