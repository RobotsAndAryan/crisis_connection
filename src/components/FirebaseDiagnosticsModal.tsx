import React, { useEffect, useState } from 'react';
import { CheckIcon, RefreshIcon, RotateCcwIcon, XIcon } from './icons';
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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apiKey.trim() || !form.projectId.trim() || !form.appId.trim()) {
      setFormError('Enter apiKey, projectId, and appId before connecting.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      saveStoredFirebaseConfig({
        ...form,
        apiKey: form.apiKey.trim(),
        projectId: form.projectId.trim(),
        appId: form.appId.trim(),
        authDomain: form.authDomain || `${form.projectId.trim()}.firebaseapp.com`,
        storageBucket: form.storageBucket || `${form.projectId.trim()}.firebasestorage.app`,
      });
      await onReinitFirebase();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to initialize Firebase with these values.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClearConfig = async () => {
    setFormError(null);
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-control bg-surface shadow-overlay">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div>
            <h2 id="diagnostics-modal-title" className="text-[15px] font-semibold text-ink-primary">
              Firebase AI Logic diagnostics
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Runtime status for Gemini Nano 4, Cloud Gemini fallback, App Check, Firestore, Auth, and Remote Config
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink-primary"
            aria-label="Close diagnostics"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          {/* Status Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* On-Device Nano 4 */}
            <div className="rounded-lg border border-hairline bg-recessed p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink-primary">On-device Gemini Nano 4</span>
                <button
                  onClick={onRefreshNano}
                  className="btn-secondary inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-secondary sm:h-7"
                >
                  <RefreshIcon size={12} />
                  <span>Re-check</span>
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 font-mono text-xs text-ink-primary">
                <span
                  className={`h-2 w-2 rounded-full ${
                    nanoStatus.availability === 'available'
                      ? 'bg-safe'
                      : nanoStatus.availability === 'downloadable'
                        ? 'bg-accent'
                        : 'bg-caution'
                  }`}
                />
                <span>{nanoStatus.availability}</span>
              </div>
              <p className="mt-2 leading-relaxed text-ink-secondary">{nanoStatus.detail}</p>
            </div>

            {/* Firebase Cloud & App Check */}
            <div className="rounded-lg border border-hairline bg-recessed p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink-primary">Firebase project and App Check</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      firebaseState.configured ? 'bg-safe' : 'bg-caution'
                    }`}
                  />
                  {firebaseState.configured ? 'Connected' : 'Local sandbox'}
                </span>
              </div>
              <dl className="mt-2.5 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">Project</dt>
                  <dd className="truncate text-ink-primary">
                    {firebaseState.projectId || 'Not configured'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">App Check</dt>
                  <dd className="text-ink-primary">
                    {firebaseState.appCheckActive ? 'Active' : 'Inactive'}
                    {firebaseState.appCheckDebugMode ? ' (debug token)' : ''}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">Auth UID</dt>
                  <dd className="text-ink-primary">
                    {firebaseState.user ? `${firebaseState.user.uid.slice(0, 14)}…` : 'Offline guest'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Remote Config */}
            <div className="rounded-lg border border-hairline bg-recessed p-4">
              <div className="font-medium text-ink-primary">Firebase Remote Config</div>
              <dl className="mt-2.5 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">cloud_model_name</dt>
                  <dd className="text-ink-primary">{firebaseState.remoteParams.cloudModelName}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">default_inference_mode</dt>
                  <dd className="text-ink-primary">
                    {firebaseState.remoteParams.defaultInferenceMode}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">danger_weight</dt>
                  <dd className="tabular text-ink-primary">
                    {firebaseState.remoteParams.dangerWeight}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-muted">mesh_base_cycle_sec</dt>
                  <dd className="tabular text-ink-primary">
                    {firebaseState.remoteParams.meshBaseCycleSec} s
                  </dd>
                </div>
              </dl>
            </div>

            {/* Firestore Persistence */}
            <div className="rounded-lg border border-hairline bg-recessed p-4">
              <div className="font-medium text-ink-primary">Firestore offline persistence</div>
              <p className="mt-2 leading-relaxed text-ink-secondary">
                Configured with{' '}
                <code className="font-mono text-ink-primary">persistentLocalCache</code> and{' '}
                <code className="font-mono text-ink-primary">persistentMultipleTabManager</code>{' '}
                paired with the pre-departure snapshot in local storage.
              </p>
              <button
                onClick={onResetDemoData}
                className="btn-secondary mt-3 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-ink-secondary sm:h-8"
              >
                <RotateCcwIcon size={14} className="text-ink-muted" />
                <span>Reset demo scenario</span>
              </button>
            </div>
          </div>

          {/* Runtime Firebase Override Form */}
          <div className="rounded-lg border border-hairline bg-recessed p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-ink-primary">
                Connect Firebase project (runtime config or .env)
              </h3>
              {stored && (
                <button
                  onClick={handleClearConfig}
                  className="text-xs font-medium text-hazard transition-colors duration-150 hover:text-ink-primary"
                >
                  Clear stored config
                </button>
              )}
            </div>
            <p className="mb-3 text-ink-secondary">
              Enter your Firebase Web App credentials to enable live Cloud Gemini fallback, Firestore sync, Auth, Remote Config, and App Check debug tokens.
            </p>
            {formError && (
              <div
                role="alert"
                className="mb-3 rounded-md border border-hazard/35 bg-hazard-dim/70 px-3 py-2 text-xs text-ink-primary"
              >
                {formError}
              </div>
            )}
            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                aria-label="Firebase API key"
                placeholder="apiKey *"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="h-10 rounded-md border border-control bg-surface px-3 font-mono text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
              />
              <input
                type="text"
                aria-label="Firebase Project ID"
                placeholder="projectId *"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="h-10 rounded-md border border-control bg-surface px-3 font-mono text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
              />
              <input
                type="text"
                aria-label="Firebase App ID"
                placeholder="appId *"
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                className="h-10 rounded-md border border-control bg-surface px-3 font-mono text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
              />
              <input
                type="text"
                aria-label="App Check debug token"
                placeholder="App Check debug token"
                value={form.appCheckDebugToken}
                onChange={(e) => setForm({ ...form, appCheckDebugToken: e.target.value })}
                className="h-10 rounded-md border border-control bg-surface px-3 font-mono text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
              />
              <input
                type="text"
                aria-label="reCAPTCHA site key"
                placeholder="reCAPTCHA site key (optional)"
                value={form.recaptchaSiteKey}
                onChange={(e) => setForm({ ...form, recaptchaSiteKey: e.target.value })}
                className="h-10 rounded-md border border-control bg-surface px-3 font-mono text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
              />
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50 sm:h-9"
              >
                <CheckIcon size={14} />
                <span>{saving ? 'Connecting...' : 'Save and connect'}</span>
              </button>
            </form>
          </div>

          {/* Inference Telemetry Log */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-ink-primary">Inference telemetry</h3>
              <span className="tabular font-mono text-[11px] text-ink-muted">
                {telemetry.length} calls
              </span>
            </div>
            {telemetry.length === 0 ? (
              <p className="rounded-lg border border-hairline bg-recessed p-4 text-ink-secondary">
                No inference calls recorded yet. Query the map, ask Field AI, run CCTV bed counting, or reconcile conflicts to log live latency and routing.
              </p>
            ) : (
              <div className="max-h-[200px] divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline bg-recessed">
                {telemetry.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-medium text-ink-primary">{t.taskType}</span>
                      <span className="text-ink-muted">{t.requestedMode}</span>
                      {t.multimodal && (
                        <span className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-[11px] text-ink-secondary">
                          Image
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
