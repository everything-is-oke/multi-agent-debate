import { NextRequest } from "next/server";
import { AGENTS } from "@/lib/agents";

export async function POST(req: NextRequest) {
  const { topic, agentId, round, previousMessages, selectedAgents, apiKey, provider, model } =
    await req.json();

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404 });
  }

  const contextMessages = (previousMessages || [])
    .slice(-8)
    .map((m: { agentId: string; content: string }) => {
      const a = AGENTS.find((a) => a.id === m.agentId);
      return `${a?.name || m.agentId}: ${m.content}`;
    })
    .join("\n\n");

  // Detect language from topic
  const langHint = detectLanguage(topic);

  const userPrompt = contextMessages
    ? `The debate topic is: "${topic}"\n\nHere's what's been said so far:\n${contextMessages}\n\nRound ${round + 1}: Now it's your turn. Respond to the previous arguments, add your unique perspective, and advance the discussion. Be engaging and substantive. ${langHint}`
    : `The debate topic is: "${topic}"\n\nRound 1: Open the debate with your initial perspective on this topic. Be bold, specific, and set the stage for the discussion. ${langHint}`;

  const mimoApiKey = process.env.MIMO_API_KEY;
  const mimoBaseUrl = process.env.MIMO_BASE_URL || "https://llm.tbuglabs.com/v1";
  const mimoModel = process.env.MIMO_MODEL || "mimo/mimo-v2.5";

  let apiUrl = `${mimoBaseUrl}/chat/completions`;
  let modelName = model || mimoModel;
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey || mimoApiKey}`,
  };

  if (provider === "deepseek") {
    apiUrl = "https://api.deepseek.com/v1/chat/completions";
    modelName = model || "deepseek-chat";
  } else if (provider === "openai") {
    apiUrl = "https://api.openai.com/v1/chat/completions";
    modelName = model || "gpt-4o-mini";
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: agent.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: error }), { status: response.status });
    }

    // Stream SSE to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}

function detectLanguage(text: string): string {
  // Simple heuristic detection
  const indonesian = /\b(yang|dan|ini|itu|untuk|dengan|tidak|akan|bisa|sudah|pada|dari|ke|di|adalah|juga|lebih|atau|sangat|saya|kamu|mereka|kita|apa|bagaimana|mengapa|harus|seperti|kalau|gak|ga|dong|sih|banget|aja|udah|emang|gimana|kenapa|kalo|bener|kayak)\b/i;
  const chinese = /[\u4e00-\u9fff]/;
  const japanese = /[\u3040-\u309f\u30a0-\u30ff]/;
  const korean = /[\uac00-\ud7af\u1100-\u11ff]/;

  if (chinese.test(text)) return "IMPORTANT: Respond entirely in Chinese (中文).";
  if (japanese.test(text)) return "IMPORTANT: Respond entirely in Japanese (日本語).";
  if (korean.test(text)) return "IMPORTANT: Respond entirely in Korean (한국어).";
  if (indonesian.test(text)) return "IMPORTANT: Respond entirely in Indonesian (Bahasa Indonesia). Use casual/gaul style.";

  return "";
}
