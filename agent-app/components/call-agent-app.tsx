"use client";

import { useEffect, useMemo, useReducer, useState, useTransition } from "react";

type StatusEntry = {
  timestamp: number;
  status: string;
};

const FINAL_STATES = new Set([
  "completed",
  "canceled",
  "busy",
  "failed",
  "no-answer",
]);

const voiceOptions = [
  { label: "Polly Joanna (US)", value: "Polly.Joanna" },
  { label: "Polly Matthew (US)", value: "Polly.Matthew" },
  { label: "Polly Amy (UK)", value: "Polly.Amy" },
  { label: "Polly Brian (UK)", value: "Polly.Brian" },
  { label: "Polly Lupe (ES)", value: "Polly.Lupe" },
];

const statusReducer = (state: StatusEntry[], status: string) => {
  const trimmed = status.toLowerCase();
  if (state.length > 0 && state[state.length - 1].status === trimmed) {
    return state;
  }
  return [...state, { status: trimmed, timestamp: Date.now() }];
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const CallAgentApp = () => {
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [goal, setGoal] = useState("");
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("Warm and confident");
  const [notes, setNotes] = useState("");
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState(voiceOptions[0]?.value ?? "Polly.Joanna");
  const [language, setLanguage] = useState("en-US");
  const [shouldRecord, setShouldRecord] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [statusEntries, dispatchStatus] = useReducer(statusReducer, []);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isGeneratingScript, startGenerating] = useTransition();
  const [isStartingCall, startCallTransition] = useTransition();

  useEffect(() => {
    if (!callSid) return;
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/call/${callSid}`);
        if (!response.ok) throw new Error("Call status fetch failed");
        const data = (await response.json()) as {
          status: string;
          duration?: string;
        };
        if (!cancelled) {
          setLatestStatus(data.status);
          dispatchStatus(data.status);
        }
        if (FINAL_STATES.has(data.status?.toLowerCase?.() ?? "")) {
          return;
        }
        setTimeout(fetchStatus, 5000);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setCallError("Unable to refresh call status.");
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [callSid]);

  const disableCall = useMemo(
    () => !customerNumber || !script || isStartingCall,
    [customerNumber, script, isStartingCall]
  );

  const handleGenerateScript = () => {
    setScriptError(null);
    startGenerating(async () => {
      try {
        const response = await fetch("/api/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName,
            goal,
            product,
            tone,
            notes,
          }),
        });
        if (!response.ok) {
          const { error } = (await response.json()) as { error?: string };
          throw new Error(error ?? "Generation failed");
        }
        const data = (await response.json()) as { script: string };
        setScript(data.script);
      } catch (error) {
        console.error(error);
        setScriptError(
          error instanceof Error ? error.message : "Unable to generate script."
        );
      }
    });
  };

  const handleStartCall = () => {
    setCallError(null);
    startCallTransition(async () => {
      try {
        const response = await fetch("/api/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toNumber: customerNumber,
            script,
            voice,
            language,
            record: shouldRecord,
          }),
        });
        if (!response.ok) {
          const { error } = (await response.json()) as { error?: string };
          throw new Error(error ?? "Call failed to start.");
        }
        const data = (await response.json()) as {
          callSid: string;
          status: string;
        };
        setCallSid(data.callSid);
        setLatestStatus(data.status);
        dispatchStatus(data.status);
      } catch (error) {
        console.error(error);
        setCallError(
          error instanceof Error ? error.message : "Unable to start call."
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <header className="mb-12 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
            Voice Intelligence
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Calling Agent Command Center
          </h1>
          <p className="max-w-2xl text-lg text-slate-400">
            Generate persuasive call scripts with AI and instantly launch
            outbound calls through Twilio. Configure the message, pick a voice,
            and track live status without leaving this dashboard.
          </p>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-8 rounded-3xl bg-slate-900/60 p-8 ring-1 ring-white/5 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">
              Campaign Brief
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Customer Name
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Jordan Smith"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Customer Number (E.164)
                </span>
                <input
                  type="tel"
                  value={customerNumber}
                  onChange={(event) => setCustomerNumber(event.target.value)}
                  placeholder="+14155550123"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Call Goal
                </span>
                <input
                  type="text"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="Book a product demo"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Product or Offer
                </span>
                <input
                  type="text"
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  placeholder="Nimbus CRM Suite"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Preferred Tone
                </span>
                <input
                  type="text"
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="Warm and confident"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Extra Notes
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Mention the partnership discount"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleGenerateScript}
                disabled={
                  isGeneratingScript || !customerName || !goal || !product
                }
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {isGeneratingScript ? "Generating..." : "Generate Script"}
              </button>
              {scriptError && (
                <p className="text-sm text-rose-400">{scriptError}</p>
              )}
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">
                Agent Script
              </span>
              <textarea
                rows={10}
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Agent: Hi Jordan, this is..."
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </label>
            <div className="grid gap-6 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Voice
                </span>
                <select
                  value={voice}
                  onChange={(event) => setVoice(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                >
                  {voiceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Language
                </span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-US">Spanish (US)</option>
                  <option value="fr-CA">French (Canada)</option>
                </select>
              </label>
              <label className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  checked={shouldRecord}
                  onChange={(event) => setShouldRecord(event.target.checked)}
                  className="h-5 w-5 rounded border border-white/10 bg-slate-950/60 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-300">
                  Record call
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleStartCall}
                disabled={disableCall}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {isStartingCall ? "Dialing..." : "Launch Call"}
              </button>
              {callError && (
                <p className="text-sm text-rose-400">{callError}</p>
              )}
            </div>
          </div>

          <aside className="space-y-6 rounded-3xl border border-white/5 bg-slate-950/40 p-8 shadow-2xl shadow-black/40">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                Live Call Monitor
              </h2>
              <p className="text-sm text-slate-400">
                Calls are placed with your configured Twilio number. Keep this
                panel open to watch real-time status updates as the call
                progresses through Twilio&apos;s voice pipeline.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Status
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {latestStatus ? latestStatus : "Idle"}
              </p>
              {callSid && (
                <p className="mt-3 break-all text-xs text-slate-500">
                  Call SID: {callSid}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status Timeline
              </p>
              <ul className="mt-3 space-y-3 text-sm text-slate-300">
                {statusEntries.length === 0 && (
                  <li className="text-slate-500">No call activity yet.</li>
                )}
                {statusEntries.map((entry) => (
                  <li key={entry.timestamp} className="flex items-center justify-between">
                    <span className="capitalize">{entry.status}</span>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5 text-sm text-slate-200">
              <p className="font-semibold text-sky-200">Setup Checklist</p>
              <ul className="mt-2 space-y-2 text-slate-300">
                <li>1. Configure <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_CALLER_ID</code> in <code>.env.local</code>.</li>
                <li>2. Assign an <code>OPENAI_API_KEY</code> for script generation.</li>
                <li>3. Deploy to Vercel and update your Twilio Voice webhooks if you need inbound logic.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};
