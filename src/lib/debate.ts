import { AGENTS } from "./agents";

export interface DebateMessage {
  agentId: string;
  content: string;
  round: number;
  timestamp: number;
}

export interface DebateState {
  topic: string;
  messages: DebateMessage[];
  currentRound: number;
  currentAgentIndex: number;
  status: "idle" | "debating" | "synthesizing" | "complete";
  synthesis?: string;
  activeAgents: string[];
}

// Demo mode - returns mock debate without API calls
export function generateDemoResponse(
  agentId: string,
  topic: string,
  round: number,
  previousMessages: DebateMessage[]
): string {
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return "";

  const recentContext = previousMessages
    .slice(-3)
    .map((m) => {
      const a = AGENTS.find((a) => a.id === m.agentId);
      return `${a?.name}: ${m.content.slice(0, 100)}...`;
    })
    .join("\n");

  const demoResponses: Record<string, string[]> = {
    researcher: [
      `Looking at the data on "${topic}", recent studies from MIT and Stanford show a 73% improvement in outcomes when this approach is applied systematically. A 2024 meta-analysis of 847 cases demonstrated statistically significant results (p < 0.001). The evidence is compelling — we're not dealing with anecdotal success here, but reproducible patterns across multiple domains.`,
      `Building on the evidence base, I want to highlight that longitudinal studies tracking outcomes over 5+ years show sustained benefits. The key metric isn't just initial success — it's durability. And the data shows that when implemented correctly, we see a 4.2x improvement in long-term outcomes compared to traditional approaches. The numbers don't lie.`,
      `The emerging research is fascinating. Three separate research teams — at Oxford, MIT, and Tsinghua — have independently confirmed these findings. What's particularly striking is the cross-cultural consistency. The effect holds across different populations, economies, and contexts. This suggests we're looking at a fundamental principle, not a local phenomenon.`,
    ],
    creative: [
      `What if we're thinking about "${topic}" all wrong? Imagine it like jazz — the beauty isn't in the sheet music, it's in the improvisation. What if the "problems" we see are actually features? Like how a crack in a sidewalk becomes a home for wildflowers. The most innovative solutions often come from reframing the "bug" as the actual breakthrough.`,
      `I love how this debate is evolving! Here's a wild thought — what if "${topic}" is actually a symptom of a much bigger shift? Like how the horse carriage wasn't just about transportation, it was about freedom. Maybe we should zoom out and ask: what's the REAL question we're trying to answer? Because I think the surface topic hides something much more profound underneath.`,
      `Here's an analogy that might reframe everything: think of "${topic}" like an ecosystem, not a machine. Machines have right and wrong answers. Ecosystems have balance and adaptation. Maybe the goal isn't to find THE answer, but to create the conditions where multiple good answers can coexist and evolve. Nature's been doing this for 3.8 billion years — maybe we should take notes.`,
    ],
    critic: [
      `Hold on — everyone's nodding along, but I see some serious issues. With "${topic}", we're assuming a stable foundation, but what happens when the underlying conditions change? History is littered with "obvious" solutions that failed catastrophically when context shifted. Remember when everyone said subprime mortgages were safe? The consensus was wrong then too. What makes us so confident now?`,
      `I appreciate the enthusiasm, but let's pressure-test this. The arguments for "${topic}" rely heavily on optimistic assumptions. What's the failure rate? What happens in the worst-case scenario? Nobody's addressed the tail risks. And frankly, the "data shows" argument from earlier cherry-picks favorable studies while ignoring the significant body of contradictory evidence.`,
      `Let me play devil's advocate one more time. Even if everything said so far is true — and I have doubts — there's a massive implementation gap between theory and practice. The real world is messy, unpredictable, and full of perverse incentives. Every "simple" solution creates new, more complex problems. I'm not saying we shouldn't try, but the confidence level here is dangerously high.`,
    ],
    pragmatist: [
      `Alright, interesting points all around. But let's get practical about "${topic}". What does implementation actually look like? Who's paying for it? What's the timeline? I've seen too many great ideas die in execution. Let's talk about the first 3 concrete steps: (1) define measurable success criteria, (2) identify the minimum viable approach, (3) set a 90-day checkpoint to assess real results vs projections.`,
      `Everyone's debating the theory, but I want to talk about ROI. For "${topic}", what's the actual cost-benefit? In my experience, the best solutions aren't the most elegant — they're the ones that get done. A 70% solution shipped in 2 weeks beats a 95% solution that takes 6 months. Let's focus on what's actionable TODAY, not what's optimal in theory.`,
      `Here's the reality check: regardless of who's "right" in this debate, the question is what can we actually DO about "${topic}" in the next 30 days? I'd suggest we pick the 2-3 highest-impact, lowest-effort actions and start there. Measure, iterate, adjust. Perfect is the enemy of shipped. And shipped is the only thing that creates real value.`,
    ],
    philosopher: [
      `This debate touches something fundamental about "${topic}" that we shouldn't rush past. Throughout history, humanity has grappled with similar tensions — between progress and caution, between individual benefit and collective good. The ancient Greeks debated these same patterns. What can Aristotle's concept of the "golden mean" teach us here? Perhaps the answer isn't in any single perspective, but in the tension between them.`,
      `I want to zoom out and consider the ethical dimensions. "${topic}" isn't just a technical or practical question — it's a question about values. What kind of future are we building? Who benefits and who bears the cost? As Seneca wrote, "Every new opinion starts as a minority one." But not every minority opinion deserves to be a majority. The question is: what principles should guide our choice?`,
      `What strikes me about this debate is that everyone is optimizing for different values — truth, beauty, efficiency, safety, wisdom. These are all legitimate goods, but they exist in tension. The philosopher's job isn't to pick winners, but to illuminate the tradeoffs. With "${topic}", the deepest question isn't "what should we do?" but "what kind of people do we become by doing it?"`,
    ],
  };

  const agentResponses = demoResponses[agentId] || demoResponses["researcher"];
  return agentResponses[Math.min(round, agentResponses.length - 1)];
}

export function generateDemoSynthesis(topic: string, messages: DebateMessage[]): string {
  const perspectives = messages.length;
  const agents = [...new Set(messages.map((m) => m.agentId))];

  return `## Debate Synthesis: "${topic}"

After ${Math.ceil(messages.length / agents.length)} rounds of rigorous debate involving ${agents.length} distinct perspectives, here are the key insights:

### Points of Agreement
All agents acknowledge that "${topic}" is a significant and nuanced issue requiring thoughtful action. There's consensus that neither pure optimism nor pure pessimism serves us well — a balanced approach is needed.

### Key Tensions
- **Evidence vs. Vision**: Dr. Nova's data-driven approach clashed with Luna's creative reframing, highlighting the tension between what we know and what we imagine.
- **Caution vs. Action**: Atlas's risk-focused scrutiny challenged Sage's bias toward execution, revealing the implementation gap between analysis and deployment.
- **Principle vs. Pragmatism**: Echo's philosophical grounding pushed the group to consider not just what works, but what's right.

### Recommended Path Forward
1. **Start with Sage's approach**: Take 2-3 concrete actions within 30 days
2. **Apply Atlas's guardrails**: Define failure criteria and worst-case protocols upfront
3. **Use Nova's evidence base**: Measure outcomes against the cited benchmarks
4. **Keep Luna's vision**: Schedule a 90-day creative review to explore unconventional alternatives
5. **Maintain Echo's ethical lens**: Establish principles that guide decisions when data is ambiguous

The debate reveals that the best answer isn't any single perspective — it's the synthesis of all five, applied with wisdom and humility.`;
}
