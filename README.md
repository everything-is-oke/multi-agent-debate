# 🧠 Multi-Agent Debate Engine

Watch AI agents with distinct personas debate any topic in real-time.

## Features

- **5 Unique Agent Personas**: Researcher, Creative Thinker, Devil's Advocate, Pragmatist, Philosopher
- **Multi-Round Debate**: Agents respond to each other's arguments across configurable rounds
- **Real-Time Streaming**: Watch agents "think" and type in real-time
- **AI Synthesis**: Get a balanced summary with key insights after the debate
- **Multiple Providers**: Supports OpenAI, Xiaomi MiMo, DeepSeek, or any OpenAI-compatible API
- **Demo Mode**: Try it without an API key using pre-built responses

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/multi-agent-debate)

## API Providers

| Provider | Endpoint | Models |
|----------|----------|--------|
| OpenAI | api.openai.com | gpt-4o, gpt-4o-mini |
| Xiaomi MiMo | api.xiaomimimo.com | MiMo-V2.5-Pro |
| DeepSeek | api.deepseek.com | deepseek-chat |

## Architecture

```
User Input (Topic)
       ↓
   Config Panel (Select Agents, Rounds)
       ↓
   Debate Loop
       ↓
   ┌─────────────────────────────────┐
   │  Round 1: Agent A → B → C → D   │
   │  Round 2: Agent A → B → C → D   │
   │  Round N: Agent A → B → C → D   │
   └─────────────────────────────────┘
       ↓
   Synthesis Agent → Final Summary
       ↓
   Complete
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **AI**: OpenAI-compatible API (pluggable)

## License

MIT
