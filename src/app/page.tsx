"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENTS, Agent } from "@/lib/agents";
import {
  generateDemoResponse,
  generateDemoSynthesis,
  DebateMessage,
} from "@/lib/debate";
import {
  Send,
  Play,
  Users,
  MessageSquare,
  Brain,
  Settings,
  Sparkles,
  ChevronDown,
  Zap,
  ExternalLink,
} from "lucide-react";

type DebateStatus = "idle" | "config" | "debating" | "synthesizing" | "complete";

export default function Home() {
  const [status, setStatus] = useState<DebateStatus>("idle");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    AGENTS.map((a) => a.id)
  );
  const [synthesis, setSynthesis] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState("");
  const [demoMode, setDemoMode] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, synthesis]);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const startDebate = async () => {
    if (!topic.trim() || selectedAgents.length < 2) return;
    setStatus("debating");
    setMessages([]);
    setCurrentRound(0);
    setSynthesis("");

    const activeAgents = AGENTS.filter((a) => selectedAgents.includes(a.id));
    let allMessages: DebateMessage[] = [];

    for (let round = 0; round < totalRounds; round++) {
      setCurrentRound(round);

      for (const agent of activeAgents) {
        setTypingAgent(agent.id);
        setIsTyping(true);

        // Simulate typing delay
        await new Promise((r) => setTimeout(r, demoMode ? 800 : 1500));

        let content: string;

        if (demoMode) {
          content = generateDemoResponse(agent.id, topic, round, allMessages);
          // Simulate streaming effect
          const words = content.split(" ");
          content = "";
          for (let i = 0; i < words.length; i++) {
            content += (i > 0 ? " " : "") + words[i];
            if (i % 5 === 0) {
              const currentMsg = {
                agentId: agent.id,
                content: content + " ▌",
                round,
                timestamp: Date.now(),
              };
              setMessages([...allMessages, currentMsg]);
              await new Promise((r) => setTimeout(r, 30));
            }
          }
        } else {
          const res = await fetch("/api/debate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic,
              agentId: agent.id,
              round,
              previousMessages: allMessages,
              selectedAgents,
              apiKey,
              provider,
              model,
            }),
          });
          const data = await res.json();
          content = data.content || "Failed to generate response.";
        }

        const newMsg: DebateMessage = {
          agentId: agent.id,
          content,
          round,
          timestamp: Date.now(),
        };
        allMessages = [...allMessages, newMsg];
        setMessages([...allMessages]);
        setIsTyping(false);
        setTypingAgent("");

        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Synthesis
    setStatus("synthesizing");
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1500));

    if (demoMode) {
      const syn = generateDemoSynthesis(topic, allMessages);
      setSynthesis(syn);
    } else {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Synthesize this debate about "${topic}" into a balanced summary with key insights, points of agreement/disagreement, and a recommended path forward.`,
          agentId: "researcher",
          round: 0,
          previousMessages: allMessages,
          selectedAgents,
          apiKey,
          provider,
          model,
        }),
      });
      const data = await res.json();
      setSynthesis(data.content || "Synthesis failed.");
    }

    setIsTyping(false);
    setStatus("complete");
  };

  const getAgentColor = (id: string) =>
    AGENTS.find((a) => a.id === id)?.color || "#3b82f6";

  const getAgent = (id: string): Agent | undefined =>
    AGENTS.find((a) => a.id === id);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DebateEngine
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
              <a
                href="https://github.com"
                target="_blank"
                className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-16 w-full z-40 bg-[#111118] border-b border-[#1e1e2e] overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-400">Demo Mode (no API key needed)</span>
                </label>
              </div>
              {!demoMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="bg-[#16161f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="mimo">Xiaomi MiMo</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input
                    type="password"
                    placeholder="API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-[#16161f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Model (optional)"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-[#16161f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-16">
        {/* Hero Section */}
        {status === "idle" && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-[80vh] flex items-center justify-center px-4"
          >
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e1e2e] bg-[#111118] text-sm text-gray-400"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Powered by Multi-Agent AI
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-7xl font-bold leading-tight"
              >
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Multi-Agent
                </span>
                <br />
                Debate Engine
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-gray-400 max-w-xl mx-auto"
              >
                Watch AI agents with distinct personas — Researcher, Creative, Devil&apos;s
                Advocate, Pragmatist, Philosopher — debate any topic in real-time.
                Get synthesized insights from multiple perspectives.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-full max-w-xl">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter a debate topic... (e.g., 'Is AI a net positive for humanity?')"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && topic.trim() && setStatus("config")
                      }
                      className="w-full px-5 py-4 rounded-2xl bg-[#111118] border border-[#1e1e2e] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all text-lg"
                    />
                    <button
                      onClick={() => topic.trim() && setStatus("config")}
                      disabled={!topic.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  {demoMode
                    ? "🎮 Demo Mode active — no API key needed"
                    : "Configure your API key in settings ⚙️"}
                </p>
              </motion.div>

              {/* Agent Preview */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-3 pt-4"
              >
                {AGENTS.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
                      style={{
                        borderColor: agent.color + "40",
                        background: agent.color + "15",
                      }}
                    >
                      {agent.avatar}
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {agent.name}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* Config Section */}
        {status === "config" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto px-4 py-12 space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Configure Your Debate</h2>
              <p className="text-gray-400">
                Topic: <span className="text-white font-medium">&ldquo;{topic}&rdquo;</span>
              </p>
            </div>

            {/* Agent Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Agents (min 2)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AGENTS.map((agent) => {
                  const selected = selectedAgents.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-opacity-50 bg-opacity-10"
                          : "border-[#1e1e2e] bg-[#111118] opacity-50"
                      }`}
                      style={{
                        borderColor: selected ? agent.color : undefined,
                        background: selected ? agent.color + "10" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.avatar}</span>
                        <div>
                          <div className="font-medium text-sm">{agent.name}</div>
                          <div className="text-xs text-gray-500">
                            {agent.role}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rounds */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Debate Rounds
              </h3>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalRounds(n)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      totalRounds === n
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-[#111118] text-gray-400 border border-[#1e1e2e] hover:border-[#2e2e3e]"
                    }`}
                  >
                    {n} rounds
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStatus("idle")}
                className="px-6 py-3 rounded-xl border border-[#1e1e2e] text-gray-400 hover:bg-[#111118] transition-all"
              >
                Back
              </button>
              <button
                onClick={startDebate}
                disabled={selectedAgents.length < 2}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
              >
                <Play className="w-5 h-5" />
                Start Debate
              </button>
            </div>
          </motion.section>
        )}

        {/* Debate Section */}
        {(status === "debating" || status === "synthesizing" || status === "complete") && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Topic Header */}
            <div className="text-center space-y-2 pb-4 border-b border-[#1e1e2e]">
              <h2 className="text-xl font-bold">
                &ldquo;{topic}&rdquo;
              </h2>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>
                  Round {currentRound + 1}/{totalRounds}
                </span>
                <span>•</span>
                <span>{selectedAgents.length} agents</span>
                {demoMode && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400">Demo Mode</span>
                  </>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md mx-auto h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      status === "complete"
                        ? "100%"
                        : status === "synthesizing"
                        ? "90%"
                        : `${((currentRound * selectedAgents.length + (isTyping ? 1 : 0)) / (totalRounds * selectedAgents.length)) * 100}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Agent Avatars Row */}
            <div className="flex justify-center gap-2">
              {AGENTS.filter((a) => selectedAgents.includes(a.id)).map(
                (agent) => (
                  <div
                    key={agent.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                      typingAgent === agent.id ? "animate-pulse-glow scale-110" : ""
                    }`}
                    style={{
                      borderColor:
                        typingAgent === agent.id
                          ? agent.color
                          : agent.color + "30",
                      background:
                        typingAgent === agent.id
                          ? agent.color + "20"
                          : agent.color + "08",
                    }}
                  >
                    {agent.avatar}
                  </div>
                )
              )}
            </div>

            {/* Messages */}
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg, i) => {
                  const agent = getAgent(msg.agentId);
                  if (!agent) return null;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 border-2"
                        style={{
                          borderColor: agent.color + "40",
                          background: agent.color + "15",
                        }}
                      >
                        {agent.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-medium text-sm"
                            style={{ color: agent.color }}
                          >
                            {agent.name}
                          </span>
                          <span className="text-xs text-gray-600">
                            {agent.role}
                          </span>
                          <span className="text-xs text-gray-700">
                            R{msg.round + 1}
                          </span>
                        </div>
                        <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl rounded-tl-sm p-4 text-sm leading-relaxed text-gray-300">
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && typingAgent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 border-2 animate-pulse"
                    style={{
                      borderColor: getAgentColor(typingAgent) + "40",
                      background: getAgentColor(typingAgent) + "15",
                    }}
                  >
                    {getAgent(typingAgent)?.avatar}
                  </div>
                  <div className="flex items-center gap-1 bg-[#111118] border border-[#1e1e2e] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
                    <div className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
                    <div className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
                  </div>
                </motion.div>
              )}

              {/* Synthesis */}
              {(status === "synthesizing" || status === "complete") && synthesis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-8"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-yellow-400">
                      Debate Synthesis
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-[#111118] to-[#16161f] border border-yellow-500/20 rounded-2xl p-6 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                    {synthesis}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Restart */}
            {status === "complete" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center pt-4"
              >
                <button
                  onClick={() => {
                    setStatus("idle");
                    setMessages([]);
                    setSynthesis("");
                    setCurrentRound(0);
                  }}
                  className="px-6 py-3 rounded-xl bg-[#111118] border border-[#1e1e2e] hover:border-blue-500/30 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start New Debate
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Features Section (idle only) */}
        {status === "idle" && (
          <section className="max-w-5xl mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Users className="w-6 h-6" />,
                  title: "5 Unique Personas",
                  desc: "Researcher, Creative, Devil's Advocate, Pragmatist, and Philosopher — each brings a distinct lens to any topic.",
                  color: "#3b82f6",
                },
                {
                  icon: <MessageSquare className="w-6 h-6" />,
                  title: "Multi-Round Debate",
                  desc: "Agents respond to each other's arguments, building on previous points and challenging assumptions in real-time.",
                  color: "#8b5cf6",
                },
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: "AI Synthesis",
                  desc: "After the debate, a synthesis agent summarizes key insights, tensions, and recommends a balanced path forward.",
                  color: "#f59e0b",
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="p-6 rounded-2xl bg-[#111118] border border-[#1e1e2e] hover:border-[#2e2e3e] transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      color: f.color,
                      background: f.color + "15",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-[#1e1e2e] py-8 text-center text-sm text-gray-600">
          <p>
            Built with Next.js + Tailwind CSS • Supports OpenAI, Xiaomi MiMo,
            DeepSeek & more
          </p>
        </footer>
      </main>
    </div>
  );
}
