import type { NextApiRequest, NextApiResponse } from "next";
import { Elysia } from "elysia";
import { createOpencodeClient } from "@opencode-ai/sdk";
import { createClientWithActiveServer } from "@/lib/server-url";

// Create OpenCode client factory that uses active server from request header
const getOpenCodeClient = (req: NextApiRequest) => {
  return createClientWithActiveServer(req);
};

const app = new Elysia({ prefix: "/api" })
  .get("/", () => ({ message: "Hello from Elysia!" }))
  .get("/sessions", async ({ request }) => {
    const client = getOpenCodeClient(request as any);
    const sessions = await client.session.list();
    return sessions;
  })
  .post("/sessions", async ({ request }) => {
    const client = getOpenCodeClient(request as any);
    const session = await client.session.create({});
    return session;
  })
  .get("/sessions/:id", async ({ params, request }) => {
    const client = getOpenCodeClient(request as any);
    const session = await client.session.get({
      path: { id: params.id },
    });
    return session;
  })
  .get("/sessions/:id/messages", async ({ params, request }) => {
    const client = getOpenCodeClient(request as any);
    const messages = await client.session.messages({
      path: { id: params.id },
    });
    return messages;
  })
  .post("/sessions/:id/prompt", async ({ params, body, request }) => {
    const client = getOpenCodeClient(request as any);
    const { text, model } = body as {
      text: string;
      model?: { providerID: string; modelID: string };
    };
    const response = await client.session.prompt({
      path: { id: params.id },
      body: {
        ...(model && { model }),
        parts: [{ type: "text", text }],
      },
    });
    return response;
  })
  .get("/models", async ({ request }) => {
    const client = getOpenCodeClient(request as any);
    const config = await client.config.providers();
    return config;
  })
  .get("/project/current", async ({ request }) => {
    const client = getOpenCodeClient(request as any);
    const project = await client.project.current();
    return project;
  })
  .get("/files/search", async ({ query, request }) => {
    const client = getOpenCodeClient(request as any);
    const { q } = query as { q?: string };
    if (!q) {
      return [];
    }
    const files = await client.find.files({
      query: { query: q },
    });
    return files;
  })
  .get("/config", async ({ request }) => {
    const client = getOpenCodeClient(request as any);
    const config = await client.config.get();
    return config;
  })
  .delete("/sessions/:id", async ({ params, request }) => {
    const client = getOpenCodeClient(request as any);
    await client.session.delete({
      path: { id: params.id },
    });
    return { success: true };
  });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v);
        }
      } else {
        headers.set(key, value);
      }
    }
  }

  const body = await new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const request = new Request(url, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method || "")
      ? undefined
      : new Uint8Array(body),
  });

  const response = await app.handle(request);

  res.status(response.status);

  response.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value);
  });

  const responseBody = await response.text();
  res.send(responseBody);
}
