"use client";
import { useEffect, useRef, useState } from "react";
import { Marked } from "marked";
import type { Dict } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; text: string; tools?: string[] };

const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: { html: ({ text }) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!) },
});

// Minimal typing for the browser speech recognition API.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speakable(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>|-]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Chat({ canCall, t, defaultSpeech }: { canCall: boolean; t: Dict["assistant"]; defaultSpeech: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(defaultSpeech);
  const [speak, setSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat?id=main")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {});
    // Restore voice preferences after mount (localStorage is browser-only).
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem("unuai-voice");
        if (saved) {
          const v = JSON.parse(saved);
          setSpeak(Boolean(v.speak));
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem("unuai-voice", JSON.stringify({ speak })); } catch {}
  }, [speak]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function say(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = lang;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  async function send(text: string, viaVoice = false) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "main", message, mode: viaVoice && speak ? "voice" : "text" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const tools = (data.events ?? []).filter((e: { ok: boolean }) => e.ok).map((e: { tool: string }) => e.tool);
      setMessages((m) => [...m, { role: "assistant", text: data.text, tools }]);
      if (speak) say(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError(t.noVoice);
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      finalText = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setInput(finalText);
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) send(finalText, true);
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    window.speechSynthesis?.cancel();
    setListening(true);
    rec.start();
  }

  async function callMe() {
    setNotice(null);
    const res = await fetch("/api/phone/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setNotice(res.ok ? t.calling : data.error);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">{t.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className="input w-auto py-1" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Voice language">
            <option value="ro-RO">Română</option>
            <option value="en-US">English</option>
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /> {t.speak}
          </label>
          {canCall && <button className="btn py-1" onClick={callMe}>{t.callMe}</button>}
        </div>
      </div>
      {notice && <p className="mb-2 text-sm text-muted">{notice}</p>}

      <div className="card flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t.intro}</p>
            <div className="flex flex-wrap gap-2">
              {t.suggestions.map((s) => (
                <button key={s} className="btn text-left" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={m.role === "user" ? "max-w-[85%] rounded-2xl bg-accent px-4 py-2 text-sm text-white" : "max-w-[95%]"}>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <>
                    {m.tools && m.tools.length > 0 && (
                      <div className="mb-1 flex flex-wrap gap-1">
                        {[...new Set(m.tools)].map((tool) => (
                          <span key={tool} className="badge bg-accent-soft text-amber-900">{t.tools[tool] ?? tool.replaceAll("_", " ")}</span>
                        ))}
                      </div>
                    )}
                    <div className="prose-unu" dangerouslySetInnerHTML={{ __html: marked.parse(m.text, { async: false }) as string }} />
                    <button className="mt-1 text-xs text-muted hover:underline" onClick={() => say(m.text)}>{t.readAloud}</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {busy && <p className="animate-pulse text-sm text-muted">{t.thinking}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`btn ${listening ? "border-red-400 bg-red-50 text-red-700" : ""}`}
          aria-label={t.talk}
          title={t.talk}
        >
          {listening ? t.listening : "🎤"}
        </button>
        <textarea
          className="input min-h-[42px] flex-1 resize-none"
          rows={1}
          value={input}
          placeholder={t.placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>{t.send}</button>
      </form>
    </div>
  );
}
