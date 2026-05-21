"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENTS, Agent } from "@/lib/agents";
import { generateDemoResponse, generateDemoSynthesis, DebateMessage } from "@/lib/debate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Play,
  Users,
  MessageSquare,
  Brain,
  Settings,
  Sparkles,
  Zap,
  ExternalLink,
  RotateCcw,
  Check,
  X,
  ChevronRight,
} from "lucide-react";

type DebateStatus = "idle" | "config" | "debating" | "synthesizing" | "complete";

export default function Home() {
  const [status, setStatus] = useState<DebateStatus>("idle");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENTS.map((a) => a.id));
  const [synthesis, setSynthesis] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState("");
  const [useLiveApi, setUseLiveApi] = useState(true);
  const [provider, setProvider] = useState("mimo");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages, synthesis]);

  const toggleAgent = (id: string) =>
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );

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
        await new Promise((r) => setTimeout(r, 800));

        let content: string;

        if (useLiveApi) {
          try {
            const res = await fetch("/api/debate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic,
                agentId: agent.id,
                round,
                previousMessages: allMessages,
                selectedAgents,
                apiKey: customApiKey || undefined,
                provider,
                model: customModel || undefined,
              }),
            });
            const data = await res.json();
            content = data.content || data.error || "Failed to generate response.";
          } catch {
            content = "API request failed. Falling back to demo response.";
            content = generateDemoResponse(agent.id, topic, round, allMessages);
          }
        } else {
          content = generateDemoResponse(agent.id, topic, round, allMessages);
          // Simulate streaming
          const words = content.split(" ");
          content = "";
          for (let i = 0; i < words.length; i++) {
            content += (i > 0 ? " " : "") + words[i];
            if (i % 4 === 0) {
              setMessages([...allMessages, { agentId: agent.id, content: content + " ▌", round, timestamp: Date.now() }]);
              await new Promise((r) => setTimeout(r, 25));
            }
          }
        }

        const newMsg: DebateMessage = { agentId: agent.id, content, round, timestamp: Date.now() };
        allMessages = [...allMessages, newMsg];
        setMessages([...allMessages]);
        setIsTyping(false);
        setTypingAgent("");
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Synthesis
    setStatus("synthesizing");
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1000));

    if (useLiveApi) {
      try {
        const res = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: `Synthesize this debate about "${topic}" into a balanced summary with key insights, points of agreement/disagreement, and a recommended path forward. Use markdown formatting with headers.`,
            agentId: "researcher",
            round: 0,
            previousMessages: allMessages,
            selectedAgents,
            apiKey: customApiKey || undefined,
            provider,
            model: customModel || undefined,
          }),
        });
        const data = await res.json();
        setSynthesis(data.content || generateDemoSynthesis(topic, allMessages));
      } catch {
        setSynthesis(generateDemoSynthesis(topic, allMessages));
      }
    } else {
      setSynthesis(generateDemoSynthesis(topic, allMessages));
    }

    setIsTyping(false);
    setStatus("complete");
  };

  const getAgent = (id: string): Agent | undefined => AGENTS.find((a) => a.id === id);

  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-base mt-3 mb-1">{line.replace("### ", "")}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.replace("## ", "")}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-xl mt-4 mb-2">{line.replace("# ", "")}</h1>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc text-muted-foreground">{line.replace("- ", "")}</li>;
      if (line.match(/^\d+\./)) return <li key={i} className="ml-4 list-decimal text-muted-foreground">{line.replace(/^\d+\.\s*/, "")}</li>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-foreground/80 leading-relaxed">{line}</p>;
    });
  };

  const exampleTopics = [
    "Is AI a net positive for humanity?",
    "Should we colonize Mars or fix Earth first?",
    "Is remote work better than office work?",
    "Should social media be regulated by governments?",
    "Is universal basic income inevitable?",
  ];

  return (
    <TooltipProvider>
      <div className="dark min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-base tracking-tight">DebateEngine</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">v1.0</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <a href="https://github.com/everything-is-oke/multi-agent-debate" target="_blank" rel="noopener">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>GitHub</TooltipContent>
              </Tooltip>
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
              className="fixed top-14 w-full z-40 bg-card border-b border-border/50 overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Mode:</label>
                    <Button
                      variant={useLiveApi ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseLiveApi(true)}
                    >
                      Live API
                    </Button>
                    <Button
                      variant={!useLiveApi ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseLiveApi(false)}
                    >
                      Demo
                    </Button>
                  </div>
                  {useLiveApi && (
                    <>
                      <Select value={provider} onValueChange={(v) => setProvider(v || "mimo")}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mimo">Xiaomi MiMo</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="deepseek">DeepSeek</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="password"
                        placeholder="Custom API Key (optional)"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="w-56"
                      />
                      <Input
                        type="text"
                        placeholder="Model (optional)"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="w-44"
                      />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className={`pt-14 ${showSettings ? "pt-28" : "pt-14"} transition-all`}>
          {/* Hero */}
          {status === "idle" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-[85vh] flex items-center justify-center px-4">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px]" />
              </div>

              <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                    <Sparkles className="w-3 h-3" />
                    Powered by Multi-Agent AI
                  </Badge>
                </motion.div>

                <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
                  <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Multi-Agent
                  </span>
                  <br />
                  Debate Engine
                </motion.h1>

                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                  Watch AI agents with distinct personas debate any topic in real-time.
                  Get synthesized insights from multiple perspectives.
                </motion.p>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-4">
                  <div className="relative max-w-xl mx-auto">
                    <Input
                      type="text"
                      placeholder="Enter a debate topic..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && topic.trim() && setStatus("config")}
                      className="h-12 text-base pr-12 bg-card"
                    />
                    <Button
                      size="icon"
                      disabled={!topic.trim()}
                      onClick={() => topic.trim() && setStatus("config")}
                      className="absolute right-1 top-1 h-10 w-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {exampleTopics.slice(0, 3).map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        size="sm"
                        className="text-xs text-muted-foreground h-7"
                        onClick={() => { setTopic(t); setStatus("config"); }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </motion.div>

                {/* Agent Preview */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-center gap-4 pt-2">
                  {AGENTS.map((agent) => (
                    <Tooltip key={agent.id}>
                      <TooltipTrigger>
                        <div className="flex flex-col items-center gap-1.5 group">
                          <Avatar className="h-11 w-11 border-2 transition-all group-hover:scale-110" style={{ borderColor: agent.color + "50" }}>
                            <AvatarFallback className="text-lg" style={{ background: agent.color + "15" }}>
                              {agent.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground font-medium">{agent.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.role}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </motion.div>

                {/* Features */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="grid grid-cols-3 gap-4 pt-6 max-w-lg mx-auto">
                  {[
                    { icon: <Users className="w-4 h-4" />, label: "5 Personas" },
                    { icon: <MessageSquare className="w-4 h-4" />, label: "Multi-Round" },
                    { icon: <Zap className="w-4 h-4" />, label: "AI Synthesis" },
                  ].map((f, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/50 border border-border/50">
                      <div className="text-primary">{f.icon}</div>
                      <span className="text-xs text-muted-foreground font-medium">{f.label}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.section>
          )}

          {/* Config */}
          {status === "config" && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-12 space-y-8">
              <div className="text-center space-y-2">
                <Badge variant="outline">Configure Debate</Badge>
                <h2 className="text-2xl font-bold mt-2">&ldquo;{topic}&rdquo;</h2>
              </div>

              {/* Agent Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Select Agents
                    <Badge variant="secondary" className="ml-auto text-xs">{selectedAgents.length} selected</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AGENTS.map((agent) => {
                    const selected = selectedAgents.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selected
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/50 bg-card opacity-50 hover:opacity-70"
                        }`}
                      >
                        <Avatar className="h-9 w-9 border" style={{ borderColor: agent.color + "40" }}>
                          <AvatarFallback style={{ background: agent.color + "15" }}>{agent.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{agent.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
                        </div>
                        {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Rounds */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Debate Rounds
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        variant={totalRounds === n ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTotalRounds(n)}
                        className="flex-1"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setStatus("idle")}>
                  <X className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button disabled={selectedAgents.length < 2} onClick={startDebate} className="gap-1.5">
                  <Play className="w-4 h-4" /> Start Debate
                </Button>
              </div>
            </motion.section>
          )}

          {/* Debate */}
          {(status === "debating" || status === "synthesizing" || status === "complete") && (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {/* Header */}
              <div className="text-center space-y-3 pb-4 border-b border-border/50">
                <h2 className="text-xl font-bold">&ldquo;{topic}&rdquo;</h2>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline">Round {currentRound + 1}/{totalRounds}</Badge>
                  <Badge variant="outline">{selectedAgents.length} agents</Badge>
                  {useLiveApi ? (
                    <Badge variant="default" className="bg-emerald-600">Live: {provider === "mimo" ? "MiMo" : provider}</Badge>
                  ) : (
                    <Badge variant="secondary">Demo Mode</Badge>
                  )}
                </div>
                <div className="w-full max-w-md mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{
                      width: status === "complete" ? "100%" : status === "synthesizing" ? "90%" : `${((currentRound * selectedAgents.length + (isTyping ? 1 : 0)) / (totalRounds * selectedAgents.length)) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Agent Row */}
              <div className="flex justify-center gap-2">
                {AGENTS.filter((a) => selectedAgents.includes(a.id)).map((agent) => (
                  <Tooltip key={agent.id}>
                    <TooltipTrigger>
                      <Avatar
                        className={`h-9 w-9 border-2 transition-all ${typingAgent === agent.id ? "animate-pulse-glow scale-110" : ""}`}
                        style={{ borderColor: typingAgent === agent.id ? agent.color : agent.color + "25" }}
                      >
                        <AvatarFallback style={{ background: agent.color + (typingAgent === agent.id ? "25" : "08") }}>
                          {agent.avatar}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{agent.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Messages */}
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((msg, i) => {
                    const agent = getAgent(msg.agentId);
                    if (!agent) return null;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex gap-3">
                        <Avatar className="h-9 w-9 flex-shrink-0 border-2" style={{ borderColor: agent.color + "30" }}>
                          <AvatarFallback style={{ background: agent.color + "12" }}>{agent.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-sm" style={{ color: agent.color }}>{agent.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{agent.role}</Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">R{msg.round + 1}</span>
                          </div>
                          <Card className="border-border/50">
                            <CardContent className="p-3.5 text-sm leading-relaxed">
                              {renderMarkdown(msg.content)}
                            </CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Typing */}
                {isTyping && typingAgent && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0 border-2 animate-pulse" style={{ borderColor: getAgent(typingAgent)?.color + "40" }}>
                      <AvatarFallback style={{ background: getAgent(typingAgent)?.color + "15" }}>
                        {getAgent(typingAgent)?.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1.5 bg-card border border-border/50 rounded-xl px-4 py-2.5">
                      <div className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
                      <div className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
                      <div className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
                    </div>
                  </motion.div>
                )}

                {/* Synthesis */}
                {(status === "synthesizing" || status === "complete") && synthesis && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pt-4">
                    <Separator className="mb-6" />
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-amber-500">Synthesis</span>
                    </div>
                    <Card className="border-amber-500/20 bg-amber-500/5">
                      <CardContent className="p-5 text-sm">
                        {renderMarkdown(synthesis)}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Restart */}
              {status === "complete" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setStatus("idle"); setMessages([]); setSynthesis(""); setCurrentRound(0); }}
                    className="gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Start New Debate
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="border-t border-border/30 py-6 text-center text-xs text-muted-foreground mt-12">
            Built with Next.js + shadcn/ui • Powered by Xiaomi MiMo V2.5
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
