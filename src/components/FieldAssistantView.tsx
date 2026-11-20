import React, { useEffect, useRef, useState } from 'react';
import { InferenceMode } from 'firebase/ai';
import {
  CameraIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ImageIcon,
  MicIcon,
  MicOffIcon,
  SendIcon,
  XIcon,
} from './icons';
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
import { FormattedText } from './FormattedText';

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
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState<'AUTO' | InferenceMode>('AUTO');
  const [expandedProtocolId, setExpandedProtocolId] = useState<string>('proto-cpr');

  const initialCamp =
    camps.find((c) => c.id === defaultReportCampId) ?? camps[2] ?? camps[0];
  const [reportCampId, setReportCampId] = useState<string>(initialCamp?.id || '');
  const [reportBeds, setReportBeds] = useState<number>(initialCamp?.availableBeds ?? 5);
  const [reportSafety, setReportSafety] = useState<number>(initialCamp?.safetyLevel ?? 6);
  const [reportStatus, setReportStatus] = useState<CampStatus>(initialCamp?.status ?? 'ACTIVE');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [reportPhoto, setReportPhoto] = useState<string | undefined>(undefined);
  const [reportSavedBanner, setReportSavedBanner] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportPhotoRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const isOffline = operatingMode === 'FIELD_OFFLINE';

  // Sync default report camp when navigating from Tactical Map inspector
  useEffect(() => {
    if (!defaultReportCampId) return;
    const target = camps.find((c) => c.id === defaultReportCampId);
    if (!target) return;
    setReportCampId(target.id);
    setReportBeds(target.availableBeds);
    setReportSafety(target.safetyLevel);
    setReportStatus(target.status);
  }, [defaultReportCampId, camps]);

  // Keep newest assistant reply scrolled into view
  useEffect(() => {
    if (messages.length <= 1) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    transcriptEndRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [messages]);

  const handleSelectReportCamp = (campId: string) => {
    setReportCampId(campId);
    const target = camps.find((c) => c.id === campId);
    if (target) {
      setReportBeds(target.availableBeds);
      setReportSafety(target.safetyLevel);
      setReportStatus(target.status);
    }
  };

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
    setVoiceError(null);
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceError(
        'Voice transcription is unavailable in this browser. Type your query below or open in Chrome Desktop.'
      );
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
    rec.onerror = () => {
      setListening(false);
      setVoiceError('Microphone capture failed. Check mic permissions or type your query below.');
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleSend = async (customText?: string) => {
    const query = (customText ?? input).trim();
    if (!query || sending) return;
    setSending(true);
    setVoiceError(null);
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
      reportedBeds: reportStatus === 'DESTROYED' ? 0 : Math.max(0, Math.min(200, reportBeds)),
      reportedSafety: reportStatus === 'DESTROYED' ? 1 : Math.max(1, Math.min(10, reportSafety)),
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
      <section className="flex flex-col self-start overflow-hidden rounded-xl border border-hairline bg-surface xl:col-span-7">
        {/* Assistant Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Field triage assistant</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Text, voice, or photo grounded in local aid camps and emergency protocols
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            <span>SDK mode</span>
            <select
              value={modeOverride}
              onChange={(e) => setModeOverride(e.target.value as 'AUTO' | InferenceMode)}
              className="h-9 rounded-md border border-control bg-recessed px-2 font-mono text-xs text-ink-primary sm:h-8 sm:text-[11px]"
            >
              <option value="AUTO">
                Auto ({isOffline ? 'ONLY_ON_DEVICE' : 'PREFER_ON_DEVICE'})
              </option>
              <option value={InferenceMode.PREFER_ON_DEVICE}>PREFER_ON_DEVICE</option>
              <option value={InferenceMode.ONLY_ON_DEVICE}>ONLY_ON_DEVICE</option>
              <option value={InferenceMode.PREFER_IN_CLOUD}>PREFER_IN_CLOUD</option>
              <option value={InferenceMode.ONLY_IN_CLOUD}>ONLY_IN_CLOUD</option>
            </select>
          </label>
        </div>

        {/* Context Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-recessed/70 px-4 py-2 text-xs">
          <span className="inline-flex items-center gap-2 text-ink-secondary">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isOffline ? 'bg-caution' : 'bg-safe'}`}
            />
            <span>
              {isOffline
                ? 'Field offline: locked to on-device Gemini Nano 4'
                : 'Hybrid routing: prefers Nano 4 with Cloud Gemini fallback'}
            </span>
          </span>
          <span className="tabular font-mono text-[11px] text-ink-muted">
            {snapshot
              ? `Pack ${snapshot.checksum} · ${snapshot.campCount} camps · ${snapshot.protocolCount} protocols`
              : `Live cache · ${camps.length} camps · ${protocols.length} protocols`}
          </span>
        </div>

        {/* Chat Transcript */}
        <div
          aria-live="polite"
          className="h-[310px] space-y-3 overflow-y-auto p-4 xl:h-[340px]"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'border-accent/35 bg-raised text-ink-primary'
                    : 'border-hairline bg-recessed text-ink-primary'
                }`}
              >
                {msg.imageDataUrl && (
                  <img
                    src={msg.imageDataUrl}
                    alt="Attached field photo"
                    className="mb-2 max-h-44 rounded-md border border-hairline object-cover"
                  />
                )}
                {msg.voiceUsed && msg.role === 'user' && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                    <MicIcon size={12} />
                    <span>Voice transcript</span>
                  </div>
                )}

                {msg.role === 'assistant' ? (
                  msg.text ? (
                    <FormattedText text={msg.text} />
                  ) : (
                    <span className="text-ink-muted">Generating response...</span>
                  )
                ) : (
                  <div className="whitespace-pre-line">{msg.text}</div>
                )}

                {msg.role === 'assistant' && msg.inferenceSource && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5">
                    <InferenceBadge
                      source={msg.inferenceSource}
                      latencyMs={msg.latencyMs}
                      requestedMode={msg.requestedMode}
                    />
                    {msg.sourcesCited && msg.sourcesCited.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sourcesCited.map((src) => (
                          <span
                            key={src}
                            className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-muted"
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
          <div ref={transcriptEndRef} />
        </div>

        {/* Prompts + Composer */}
        <div className="border-t border-hairline bg-recessed/70 p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              'Adult unresponsive and not breathing, give CPR steps',
              'Severe arterial leg bleeding, tourniquet steps and nearest trauma camp',
              'Safest camp with open beds right now',
              'How to purify flood water with bleach',
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink-secondary transition-colors duration-150 hover:border-control hover:text-ink-primary sm:py-1"
              >
                {q}
              </button>
            ))}
          </div>

          {voiceError && (
            <div
              role="alert"
              className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-caution/35 bg-caution-dim/60 px-3 py-2 text-xs text-ink-primary"
            >
              <span>{voiceError}</span>
              <button
                onClick={() => setVoiceError(null)}
                aria-label="Dismiss voice error"
                className="rounded p-1 text-ink-secondary hover:bg-ink-primary/10 hover:text-ink-primary"
              >
                <XIcon size={13} />
              </button>
            </div>
          )}

          {attachedImage && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-control bg-surface p-1.5 pr-2.5">
              <img
                src={attachedImage}
                alt="Attached preview"
                className="h-9 w-9 rounded object-cover"
              />
              <span className="text-xs text-ink-secondary">Photo attached</span>
              <button
                onClick={() => setAttachedImage(null)}
                className="rounded p-1 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink-primary"
                aria-label="Remove attached photo"
              >
                <XIcon size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
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
              title="Upload photo from device"
              aria-label="Upload photo"
              className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-secondary sm:h-9 sm:w-9"
            >
              <ImageIcon size={16} />
            </button>
            <button
              onClick={() => setCameraOpen(true)}
              title="Capture live camera photo"
              aria-label="Open camera"
              className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-secondary sm:h-9 sm:w-9"
            >
              <CameraIcon size={16} />
            </button>
            <button
              onClick={toggleVoiceInput}
              title="Voice input via microphone"
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={listening}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 ease-instrument sm:h-9 sm:w-9 ${
                listening
                  ? 'border-hazard bg-hazard-dim text-hazard'
                  : 'border-control bg-raised text-ink-secondary hover:bg-raised-hover hover:text-ink-primary'
              }`}
            >
              {listening ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
            </button>

            <input
              type="text"
              aria-label="Ask Field AI"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                listening ? 'Listening...' : 'Ask about camps, beds, CPR, or trauma triage'
              }
              className="h-10 flex-1 rounded-lg border border-control bg-surface px-3 text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
            />

            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="btn-primary flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-medium disabled:opacity-50 sm:h-9"
            >
              <SendIcon size={14} />
              <span>{sending ? 'Sending' : 'Send'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Right 5 Columns: Field Observation Logger + Offline Protocols */}
      <div className="flex flex-col gap-4 xl:col-span-5">
        {/* Field Report Form */}
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-ink-primary">Log field observation</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              {isOffline
                ? 'Queues offline and relays over local mesh until Base camp reconnect'
                : 'Queues for Cloud Gemini conflict reconciliation and relays to local mesh'}
            </p>
          </div>

          <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-medium text-ink-secondary">Aid camp</span>
                <select
                  value={reportCampId}
                  onChange={(e) => handleSelectReportCamp(e.target.value)}
                  className="h-10 w-full rounded-lg border border-control bg-recessed px-2.5 text-base text-ink-primary sm:h-9 sm:text-xs"
                >
                  {camps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block font-medium text-ink-secondary">Observed status</span>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value as CampStatus)}
                  className="h-10 w-full rounded-lg border border-control bg-recessed px-2.5 text-base text-ink-primary sm:h-9 sm:text-xs"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="OVERCROWDED">Overcrowded</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="DESTROYED">Destroyed (broadcast alert)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block font-medium text-ink-secondary">Open beds</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={reportStatus === 'DESTROYED' ? 0 : reportBeds}
                  disabled={reportStatus === 'DESTROYED'}
                  onChange={(e) => setReportBeds(Number(e.target.value))}
                  className="tabular h-10 w-full rounded-lg border border-control bg-recessed px-2.5 font-mono text-base text-ink-primary disabled:opacity-50 sm:h-9 sm:text-xs"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-medium text-ink-secondary">Safety (1–10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={reportStatus === 'DESTROYED' ? 1 : reportSafety}
                  disabled={reportStatus === 'DESTROYED'}
                  onChange={(e) => setReportSafety(Number(e.target.value))}
                  className="tabular h-10 w-full rounded-lg border border-control bg-recessed px-2.5 font-mono text-base text-ink-primary disabled:opacity-50 sm:h-9 sm:text-xs"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block font-medium text-ink-secondary">Field notes</span>
              <textarea
                rows={2}
                maxLength={280}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Incoming casualties, generator fuel, road blockage, smoke"
                className="w-full rounded-lg border border-control bg-recessed px-3 py-2 text-base text-ink-primary placeholder:text-ink-muted sm:text-xs"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
                  className="btn-secondary inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-ink-secondary sm:h-9"
                >
                  <ImageIcon size={14} className="text-ink-muted" />
                  <span>{reportPhoto ? 'Photo attached' : 'Attach ward photo'}</span>
                </button>
              </div>

              <button
                type="submit"
                className={`${
                  reportStatus === 'DESTROYED' ? 'btn-danger' : 'btn-primary'
                } h-10 rounded-lg px-4 text-xs font-medium sm:h-9`}
              >
                {reportStatus === 'DESTROYED'
                  ? 'Broadcast alert'
                  : isOffline
                    ? 'Queue offline'
                    : 'Queue for cloud'}
              </button>
            </div>

            {reportSavedBanner && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-safe/30 bg-safe-dim/60 px-3 py-2 text-xs text-ink-primary"
              >
                <CheckCircleIcon size={14} className="shrink-0 text-safe" />
                <span>Report queued for Cloud reconciliation and relayed on local mesh</span>
              </div>
            )}
          </form>
        </section>

        {/* Cached Emergency Protocols */}
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-primary">Emergency protocols</h3>
            <span className="font-mono text-[11px] text-ink-muted">
              {protocols.length} cached offline
            </span>
          </div>

          <div className="max-h-[360px] divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline bg-recessed">
            {protocols.map((proto) => {
              const expanded = expandedProtocolId === proto.id;
              const sevColor =
                proto.severity === 'CRITICAL'
                  ? 'text-hazard'
                  : proto.severity === 'HIGH'
                    ? 'text-caution'
                    : 'text-ink-muted';
              const sevLabel =
                proto.severity === 'CRITICAL'
                  ? 'Critical'
                  : proto.severity === 'HIGH'
                    ? 'High'
                    : 'Standard';

              return (
                <div key={proto.id}>
                  <button
                    aria-expanded={expanded}
                    onClick={() => setExpandedProtocolId(expanded ? '' : proto.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left transition-colors duration-150 hover:bg-raised/60 sm:py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-ink-primary">
                        {proto.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-muted">
                        {proto.category.charAt(0) + proto.category.slice(1).toLowerCase()}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-[11px] font-medium ${sevColor}`}>{sevLabel}</span>
                      {expanded ? (
                        <ChevronUpIcon size={14} className="text-ink-muted" />
                      ) : (
                        <ChevronDownIcon size={14} className="text-ink-muted" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-hairline bg-surface/60 px-3.5 py-3 text-xs text-ink-secondary">
                      <p className="mb-2 text-ink-muted">{proto.summary}</p>
                      <ol className="list-decimal space-y-1.5 pl-4 text-ink-primary">
                        {proto.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                      {proto.warnings.length > 0 && (
                        <div className="mt-3 rounded-md border border-caution/30 bg-caution-dim/60 p-2.5 text-xs text-ink-primary">
                          <div className="mb-1 font-medium text-caution">Critical warnings</div>
                          <ul className="space-y-1 text-ink-secondary">
                            {proto.warnings.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          handleSend(
                            `Walk me through "${proto.title}" step-by-step and tell me the safest camp to evacuate this casualty to.`
                          )
                        }
                        className="mt-3 text-xs font-medium text-accent transition-colors duration-150 hover:text-ink-primary"
                      >
                        Ask Field AI and find evacuation camp →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <CameraCaptureModal
        open={cameraOpen}
        title="Field camera capture"
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setAttachedImage(dataUrl)}
      />
    </div>
  );
};
