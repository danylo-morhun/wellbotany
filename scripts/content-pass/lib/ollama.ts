// Minimal client for a local Ollama server (http://localhost:11434) — JSON
// answers constrained by a JSON Schema, optional images for vision models.

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export const TEXT_MODEL = process.env.CONTENT_TEXT_MODEL ?? "qwen3.6:35b-a3b";
export const VISION_MODEL = process.env.CONTENT_VISION_MODEL ?? "gemma4:26b";

/** One retry: a JSON answer cut short (looping model) usually works the second time. */
export async function chatJson<T>(opts: Parameters<typeof chatJsonOnce>[0]): Promise<T> {
  try {
    return await chatJsonOnce<T>(opts);
  } catch {
    return chatJsonOnce<T>(opts);
  }
}

async function chatJsonOnce<T>(opts: {
  model: string;
  system: string;
  user: string;
  schema: object;
  images?: string[]; // base64, no data: prefix
  // Reasoning before answering: slower, but noticeably better at picking one
  // option out of a long list (category classification)
  think?: boolean;
}): Promise<T> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      stream: false,
      // Thinking goes to a separate field, the JSON answer stays in content
      think: opts.think ?? false,
      format: opts.schema,
      // Fixed per model: a different num_ctx makes Ollama reload the model
      // num_predict caps runaway output (a model looping on a label)
      options: {
        temperature: 0,
        num_ctx: opts.images ? 8192 : 32768,
        num_predict: opts.images ? 300 : opts.think ? 12000 : 6000,
      },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user, ...(opts.images && { images: opts.images }) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message: { content: string } };
  try {
    return JSON.parse(data.message.content) as T;
  } catch {
    throw new Error(`model returned invalid JSON (${data.message.content.length} chars)`);
  }
}
