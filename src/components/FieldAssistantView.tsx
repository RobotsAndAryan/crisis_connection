import React, { useRef, useState } from 'react';
import { InferenceMode } from 'firebase/ai';
import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  HeartPulse,
  Image as ImageIcon,
  Mic,
  MicOff,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import {
  AidCamp,
  CampStatus,
  ChatMessage,
  EmergencyProtocol,
  FieldPackSnapshot,
  FieldReport,
  OperatingMode,
} from '../types/crisis';
import { InferenceBadge } from './InferenceBadge';
import { CameraCaptureModal } from './CameraCaptureModal';

interface FieldAssistantViewProps {
  camps: AidCamp[];
  protocols: EmergencyProtocol[];
  operatingMode: OperatingMode;
  snapshot: FieldPackSnapshot | null;
  messages: ChatMessage[];
  onSendMessage: (params: {
    query: string;
    imageDataUrl?: string;
    voiceUsed?: boolean;
    overrideMode?: InferenceMode;
  }) => Promise<void>;
  onSubmitFieldReport: (report: Omit<FieldReport, 'id' | 'timestamp' | 'syncedToCloud'>) => void;
  defaultReportCampId?: string;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export const FieldAssistantView: React.FC<FieldAssistantViewProps> = ({
  camps,
  protocols,
  operatingMode,
  snapshot,
  messages,
  onSendMessage,
  onSubmitFieldReport,
  defaultReportCampId,
}) => {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState<'AUTO' | InferenceMode>('AUTO');
  const [expandedProtocolId, setExpandedProtocolId] = useState<string>('proto-cpr');

  // Offline Field Report state
  const [reportCampId, setReportCampId] = useState<string>(defaultReportCampId || camps[2]?.id || camps[0]?.id || '');
  const [reportBeds, setReportBeds] = useState<number>(5);
  const [reportSafety, setReportSafety] = useState<number>(6);
  const [reportStatus, setReportStatus] = useState<CampStatus>('ACTIVE');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [reportPhoto, setReportPhoto] = useState<string | undefined>(undefined);
  const [reportSavedBanner, setReportSavedBanner] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportPhotoRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const isOffline = operatingMode === 'FIELD_OFFLINE';

  const handleImageAttach = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleVoiceInput = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Web Speech API voice recognition is not supported in this browser. Try Chrome Desktop.');
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setVoiceUsed(true);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleSend = async (customText?: string) => {
    const query = (customText ?? input).trim();
    if (!query || sending) return;
    setSending(true);
    const imgToSend = attachedImage ?? undefined;
    const usedVoice = voiceUsed;
    setInput('');
    setAttachedImage(null);
    setVoiceUsed(false);

    try {
      await onSendMessage({
        query,
        imageDataUrl: imgToSend,
        voiceUsed: usedVoice,
        overrideMode: modeOverride === 'AUTO' ? undefined : modeOverride,
      });
    } finally {
      setSending(false);
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const camp = camps.find((c) => c.id === reportCampId);
    if (!camp) return;

    onSubmitFieldReport({
      campId: camp.id,
      campName: camp.name,
      workerId: 'worker-self',
      workerName: 'Field Worker (This Device)',
      reportedBeds: reportStatus === 'DESTROYED' ? 0 : Math.max(0, reportBeds),
      reportedSafety: reportStatus === 'DESTROYED' ? 1 : reportSafety,
      reportedStatus: reportStatus,
      notes:
        reportNotes.trim() ||
        `Field update logged ${isOffline ? 'offline' : 'online'} for ${camp.name}.`,
      photoDataUrl: reportPhoto,
      source: 'FIELD_WORKER',
    });

    setReportNotes('');
    setReportPhoto(undefined);
    setReportSavedBanner(true);
    setTimeout(() => setReportSavedBanner(false), 3500);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Left 7 Columns: Multimodal Field AI Assistant */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 xl:col-span-7">
        {/* Assistant Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                In-Field Hybrid AI Assistant (RAG over Downloaded DB)
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              User Input (Text / Voice / Photo) → On-Device Gemini Nano 4 → Queries Downloaded Aid DB & Protocols
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>SDK Mode:</span>
              <select
                value={modeOverride}
                onChange={(e) => setModeOverride(e.target.value as 'AUTO' | InferenceMode)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-cyan-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="AUTO">
                  AUTO ({isOffline ? 'ONLY_ON_DEVICE' : 'PREFER_ON_DEVICE'})
                </option>
                <option value={InferenceMode.PREFER_ON_DEVICE}>PREFER_ON_DEVICE</option>
                <option value={InferenceMode.ONLY_ON_DEVICE}>ONLY_ON_DEVICE</option>
                <option value={InferenceMode.PREFER_IN_CLOUD}>PREFER_IN_CLOUD</option>
                <option value={InferenceMode.ONLY_IN_CLOUD}>ONLY_IN_CLOUD</option>
              </select>
            </label>
          </div>
        </div>

        {/* Downloaded Pack Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 bg-slate-900/60 px-4 py-1.5 text-[11px]">
          <div className="flex items-center gap-2 text-slate-300">
            {isOffline ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                <WifiOff className="h-3.5 w-3.5" /> OFFLINE FIELD MODE — Strictly On-Device Nano 4
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> HYBRID MODE — Prefers Nano 4, Auto Cloud Fallback
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            {snapshot
              ? `Local Pack ${snapshot.checksum} (${snapshot.campCount} camps, ${snapshot.protocolCount} protocols)`
              : `Live Cache (${camps.length} camps, ${protocols.length} protocols)`}
          </span>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: '380px', maxHeight: '520px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'border border-cyan-500/30 bg-cyan-950/60 text-cyan-50'
                    : 'border border-slate-800 bg-slate-950/90 text-slate-200'
                }`}
              >
                {msg.imageDataUrl && (
                  <img
                    src={msg.imageDataUrl}
                    alt="Attached field photo"
                    className="mb-2 max-h-44 rounded-lg border border-slate-700 object-cover"
                  />
                )}
                {msg.voiceUsed && msg.role === 'user' && (
                  <div className="mb-1 inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                    <Mic className="h-2.5 w-2.5" /> VOICE TRANSCRIPT
                  </div>
                )}
                <div className="whitespace-pre-line">{msg.text || (msg.streaming ? 'Thinking...' : '')}</div>

                {msg.role === 'assistant' && msg.inferenceSource && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
                    <InferenceBadge
                      source={msg.inferenceSource}
                      latencyMs={msg.latencyMs}
                      requestedMode={msg.requestedMode}
                    />
                    {msg.sourcesCited && msg.sourcesCited.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.sourcesCited.map((src) => (
                          <span
                            key={src}
                            className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Prompts + Multimodal Composer */}
        <div className="border-t border-slate-800 bg-slate-950/80 p-3">
          <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
            {[
              'Adult unresponsive and not breathing — give CPR steps now',
              'Severe arterial leg bleeding — tourniquet protocol + nearest trauma camp',
              'Tell me the safest & shortest camp with open beds right now',
              'How do I purify flood water with bleach?',
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
              >
                {q}
              </button>
            ))}
          </div>

          {attachedImage && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900 p-1.5 pr-2.5">
              <img
                src={attachedImage}
                alt="Preview"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="text-[11px] text-cyan-200">Multimodal photo ready</span>
              <button
                onClick={() => setAttachedImage(null)}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Image Upload & Live Camera Snapshot */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleImageAttach(e, setAttachedImage)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload photo from device (Multimodal input)"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCameraOpen(true)}
              title="Open live camera viewfinder (Multimodal capture)"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <Camera className="h-4 w-4" />
            </button>

            {/* Voice Mic Button */}
            <button
              onClick={toggleVoiceInput}
              title="Voice query via microphone (Hands-free field input)"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                listening
                  ? 'animate-pulse border-red-500 bg-red-500/20 text-red-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300'
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                listening
                  ? 'Listening to voice query...'
                  : 'Ask about nearest safe camp, beds, CPR, trauma triage, or attach a photo...'
              }
              className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />

            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sending ? 'Running' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right 5 Columns: Offline Emergency Protocols + Field Report Logger */}
      <div className="flex flex-col gap-4 xl:col-span-5">
        {/* Offline Field Report Submission Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Upload className="h-4 w-4 text-violet-400" />
                Log Field Observation {isOffline ? '(Offline Outbox + Mesh)' : '(Cloud Queue)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Reports sync via Local Mesh offline and reconcile in Cloud Gemini upon reconnect.
              </p>
            </div>
          </div>

          <form onSubmit={handleReportSubmit} className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-slate-400">Aid Camp</span>
                <select
                  value={reportCampId}
                  onChange={(e) => setReportCampId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                >
                  {camps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-slate-400">Observed Status</span>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value as CampStatus)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="OVERCROWDED">OVERCROWDED</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="DESTROYED">DESTROYED (Triggers Alert)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-slate-400">
                  Counted Available Beds
                </span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={reportStatus === 'DESTROYED' ? 0 : reportBeds}
                  disabled={reportStatus === 'DESTROYED'}
                  onChange={(e) => setReportBeds(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white disabled:opacity-50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-slate-400">
                  Safety Level (1=Hazard, 10=Safe)
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={reportStatus === 'DESTROYED' ? 1 : reportSafety}
                  disabled={reportStatus === 'DESTROYED'}
                  onChange={(e) => setReportSafety(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white disabled:opacity-50"
                />
              </label>
            </div>

            <textarea
              rows={2}
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              placeholder="Field notes: casualties incoming, generator fuel, road blockage, smoke..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
            />

            <div className="flex items-center justify-between gap-2">
              <div>
                <input
                  ref={reportPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageAttach(e, (url) => setReportPhoto(url))}
                />
                <button
                  type="button"
                  onClick={() => reportPhotoRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-slate-500"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{reportPhoto ? 'Photo Attached ✓' : 'Attach Ward Photo'}</span>
                </button>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
              >
                {reportStatus === 'DESTROYED'
                  ? 'Broadcast Emergency Report'
                  : isOffline
                    ? 'Queue Offline + Mesh'
                    : 'Queue for Cloud Resolution'}
              </button>
            </div>

            {reportSavedBanner && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Field report logged! Queued for Cloud Conflict Resolution & pushed to Local Mesh.
                </span>
              </div>
            )}
          </form>
        </div>

        {/* Offline Essential Emergency Protocols (Whiteboard: "Essential info -> CPR, protocols") */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
              <HeartPulse className="h-4 w-4 text-red-400" />
              Downloaded Emergency Protocols
            </h3>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
              CACHED OFFLINE
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {protocols.map((proto) => {
              const expanded = expandedProtocolId === proto.id;
              return (
                <div
                  key={proto.id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70"
                >
                  <button
                    onClick={() => setExpandedProtocolId(expanded ? '' : proto.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-100">{proto.title}</div>
                        <div className="text-[10px] text-slate-400">{proto.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                          proto.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-300'
                            : proto.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {proto.severity}
                      </span>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-800/80 px-3 py-2.5 text-[11px] text-slate-300">
                      <p className="mb-2 text-slate-400">{proto.summary}</p>
                      <ol className="list-decimal space-y-1 pl-4">
                        {proto.steps.map((step, idx) => (
                          <li key={idx} className="leading-snug">
                            {step}
                          </li>
                        ))}
                      </ol>
                      {proto.warnings.length > 0 && (
                        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10.5px] text-amber-200">
                          <div className="mb-0.5 flex items-center gap-1 font-bold text-amber-300">
                            <AlertTriangle className="h-3 w-3" /> Critical Warnings
                          </div>
                          {proto.warnings.map((w, i) => (
                            <div key={i}>• {w}</div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() =>
                          handleSend(
                            `Walk me through "${proto.title}" step-by-step and tell me the safest camp to evacuate this casualty to.`
                          )
                        }
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:underline"
                      >
                        <ShieldAlert className="h-3 w-3" /> Ask Field AI + Find Evacuation Camp →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <CameraCaptureModal
        open={cameraOpen}
        title="Field Worker Multimodal Camera Capture"
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setAttachedImage(dataUrl)}
      />
    </div>
  );
};
