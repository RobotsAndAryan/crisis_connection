import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sliders,
  X,
} from 'lucide-react';
import {
  FirebaseConfigValues,
  FirebaseRuntimeState,
  loadStoredFirebaseConfig,
  saveStoredFirebaseConfig,
} from '../services/firebase';
import { OnDeviceCapabilityStatus } from '../services/hybridAI';
import { InferenceTelemetryEntry } from '../types/crisis';
import { InferenceBadge } from './InferenceBadge';

interface FirebaseDiagnosticsModalProps {
  open: boolean;
  onClose: () => void;
  firebaseState: FirebaseRuntimeState;
  nanoStatus: OnDeviceCapabilityStatus;
  telemetry: InferenceTelemetryEntry[];
  onRefreshNano: () => void;
  onReinitFirebase: () => Promise<void>;
  onResetDemoData: () => void;
}

export const FirebaseDiagnosticsModal: React.FC<FirebaseDiagnosticsModalProps> = ({
  open,
  onClose,
  firebaseState,
  nanoStatus,
  telemetry,
  onRefreshNano,
  onReinitFirebase,
  onResetDemoData,
}) => {
  const stored = loadStoredFirebaseConfig();
  const [form, setForm] = useState<FirebaseConfigValues>({
    apiKey: stored?.apiKey || '',
    authDomain: stored?.authDomain || '',
    projectId: stored?.projectId || '',
    storageBucket: stored?.storageBucket || '',
    messagingSenderId: stored?.messagingSenderId || '',
    appId: stored?.appId || '',
    recaptchaSiteKey: stored?.recaptchaSiteKey || '',
    appCheckDebugToken: stored?.appCheckDebugToken || 'true',
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apiKey || !form.projectId || !form.appId) return;
    setSaving(true);
    saveStoredFirebaseConfig({
      ...form,
      authDomain: form.authDomain || `${form.projectId}.firebaseapp.com`,
      storageBucket: form.storageBucket || `${form.projectId}.firebasestorage.app`,
    });
    await onReinitFirebase();
    setSaving(false);
  };

  const handleClearConfig = async () => {
    saveStoredFirebaseConfig(null);
    setForm({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      recaptchaSiteKey: '',
      appCheckDebugToken: 'true',
    });
    await onReinitFirebase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-white">
              Firebase AI Logic · Hybrid Inference & Diagnostics
            </h2>
            <p className="text-xs text-slate-400">
              Runtime status for Gemini Nano 4, Cloud Gemini fallback, App Check, Firestore, Auth & Remote Config
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* On-Device Chrome Nano 4 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Cpu className="h-4 w-4 text-emerald-400" /> On-Device Gemini Nano 4 (Chrome)
                </span>
                <button
                  onClick={onRefreshNano}
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-slate-700"
                >
                  <RefreshCw className="h-3 w-3" /> Re-check
                </button>
              </div>
              <div className="mt-1.5 font-mono text-[11px] font-bold text-emerald-300">
                Status: {nanoStatus.availability.toUpperCase()}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{nanoStatus.detail}</p>
            </div>

            {/* Firebase Cloud & App Check */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <ShieldCheck className="h-4 w-4 text-violet-400" /> Firebase Project & App Check
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                    firebaseState.configured
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {firebaseState.configured ? 'CONNECTED' : 'LOCAL SANDBOX'}
                </span>
              </div>
              <div className="mt-1.5 space-y-1 font-mono text-[11px] text-slate-300">
                <div>Project: {firebaseState.projectId || 'Not configured'}</div>
                <div>
                  App Check: {firebaseState.appCheckActive ? 'Active' : 'Inactive'}{' '}
                  {firebaseState.appCheckDebugMode ? '(Debug Token Enabled)' : ''}
                </div>
                <div>
                  Auth UID: {firebaseState.user ? firebaseState.user.uid.slice(0, 14) + '…' : 'Offline/Guest'}
                </div>
              </div>
            </div>

            {/* Remote Config Live Values */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Sliders className="h-4 w-4 text-cyan-400" /> Firebase Remote Config Parameters
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[10.5px] text-slate-300">
                <div>cloud_model_name:</div>
                <div className="text-cyan-300">{firebaseState.remoteParams.cloudModelName}</div>
                <div>default_inference_mode:</div>
                <div className="text-cyan-300">{firebaseState.remoteParams.defaultInferenceMode}</div>
                <div>danger_weight:</div>
                <div className="text-cyan-300">{firebaseState.remoteParams.dangerWeight}</div>
                <div>mesh_base_cycle_sec:</div>
                <div className="text-cyan-300">{firebaseState.remoteParams.meshBaseCycleSec}s</div>
              </div>
            </div>

            {/* Firestore Persistence */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Database className="h-4 w-4 text-emerald-400" /> Firestore Offline Persistence
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Configured with <code className="text-cyan-300">persistentLocalCache</code> +{' '}
                <code className="text-cyan-300">persistentMultipleTabManager</code> alongside an
                explicit Pre-Departure Field Snapshot in IndexedDB/LocalStorage for zero-signal
                field deployments.
              </p>
              <button
                onClick={onResetDemoData}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:border-red-500/50 hover:text-red-300"
              >
                <RotateCcw className="h-3 w-3" /> Reset Scenario to Initial Demo State
              </button>
            </div>
          </div>

          {/* Runtime Firebase Config Override Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-white">
                <Cloud className="h-4 w-4 text-cyan-400" />
                Connect Your Firebase Project (Runtime Config or .env)
              </h3>
              {stored && (
                <button
                  onClick={handleClearConfig}
                  className="text-[11px] text-red-400 hover:underline"
                >
                  Clear Stored Config
                </button>
              )}
            </div>
            <p className="mb-3 text-[11px] text-slate-400">
              Paste your Firebase Web App credentials here (or set <code className="text-cyan-300">.env</code>) to activate live Cloud Gemini fallback, Firestore sync, Auth, Remote Config, and App Check debug tokens.
            </p>
            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder="apiKey *"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-white"
              />
              <input
                type="text"
                placeholder="projectId *"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-white"
              />
              <input
                type="text"
                placeholder="appId *"
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-white"
              />
              <input
                type="text"
                placeholder="App Check Debug Token (true or UUID)"
                value={form.appCheckDebugToken}
                onChange={(e) => setForm({ ...form, appCheckDebugToken: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-white"
              />
              <input
                type="text"
                placeholder="reCAPTCHA Site Key (optional)"
                value={form.recaptchaSiteKey}
                onChange={(e) => setForm({ ...form, recaptchaSiteKey: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-white"
              />
              <button
                type="submit"
                disabled={saving || !form.apiKey || !form.projectId || !form.appId}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{saving ? 'Connecting...' : 'Save & Connect Firebase'}</span>
              </button>
            </form>
          </div>

          {/* Live Inference Telemetry Log */}
          <div>
            <h3 className="mb-2 font-bold uppercase tracking-wider text-slate-400">
              Live Firebase AI Logic Inference Telemetry ({telemetry.length} calls)
            </h3>
            {telemetry.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-slate-400">
                No AI calls recorded yet. Ask the Field Assistant, query the Map, count CCTV beds,
                or run Conflict Resolution to see real-time ON_DEVICE vs IN_CLOUD telemetry.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto">
                {telemetry.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-cyan-300">{t.taskType}</span>
                      <span className="text-slate-500">mode={t.requestedMode}</span>
                      {t.multimodal && (
                        <span className="rounded bg-violet-500/20 px-1.5 text-[9.5px] text-violet-300">
                          IMAGE
                        </span>
                      )}
                    </div>
                    <InferenceBadge source={t.actualSource} latencyMs={t.latencyMs} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
