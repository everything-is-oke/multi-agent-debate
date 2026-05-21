import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";

export async function POST(req: NextRequest) {
  try {
    const { topic, agentId, round, previousMessages, selectedAgents, apiKey, provider, model } =
      await req.json();

    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const contextMessages = (previousMessages || [])
      .slice(-6)
      .map((m: { agentId: string; content: string }) => {
        const a = AGENTS.find((a) => a.id === m.agentId);
        return `${a?.name || m.agentId}: ${m.content}`;
      })
      .join("\n\n");

    const userPrompt = contextMessages
      ? `The debate topic is: "${topic}"\n\nHere's what's been said so far:\n${contextMessages}\n\nRound ${round + 1}: Now it's your turn. Respond to the previous arguments, add your unique perspective, and advance the discussion. Be engaging and substantive.`
      : `The debate topic is: "${topic}"\n\nRound 1: Open the debate with your initial perspective on this topic. Be bold, specific, and set the stage for the discussion.`;

    // Default: use MiMo from env
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
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No response generated.";

    return NextResponse.json({ content, agentId });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
