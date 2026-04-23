import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  context.waitUntil(logRequest(req));

  return new Response("Hello, world!");
};

async function logRequest(req: Request) {
  await fetch("https://cs431.miec.app/log", {
    method: "POST",
    body: JSON.stringify({ url: req.url, timestamp: Date.now() }),
    headers: { "Content-Type": "application/json" },
  });
}

export const config: Config = {
  // path: "/api/test-hello-world",
};
