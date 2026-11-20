import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getAI, GoogleAIBackend, AI } from 'firebase/ai';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  AppCheck,
} from 'firebase/app-check';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, User } from 'firebase/auth';
import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  RemoteConfig,
} from 'firebase/remote-config';
import { RemoteConfigParams } from '../types/crisis';

export interface FirebaseConfigValues {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  recaptchaSiteKey?: string;
  appCheckDebugToken?: string;
}

const RUNTIME_CONFIG_STORAGE_KEY = 'crisis_connection_firebase_config_v1';

export const DEFAULT_REMOTE_CONFIG: RemoteConfigParams = {
  cloudModelName: import.meta.env.VITE_CLOUD_GEMINI_MODEL || 'gemini-2.5-flash',
  defaultInferenceMode: 'prefer_on_device',
  dangerWeight: 0.45,
  meshBaseCycleSec: 15,
  emergencyBedThreshold: 5,
  fetchedFromCloud: false,
};

export interface FirebaseRuntimeState {
  configured: boolean;
  app: FirebaseApp | null;
  ai: AI | null;
  db: Firestore | null;
  auth: Auth | null;
  user: User | null;
  appCheck: AppCheck | null;
  appCheckActive: boolean;
  appCheckDebugMode: boolean;
  remoteConfig: RemoteConfig | null;
  remoteParams: RemoteConfigParams;
  initError: string | null;
  projectId: string;
}

let runtimeState: FirebaseRuntimeState = {
  configured: false,
  app: null,
  ai: null,
  db: null,
  auth: null,
  user: null,
  appCheck: null,
  appCheckActive: false,
  appCheckDebugMode: false,
  remoteConfig: null,
  remoteParams: { ...DEFAULT_REMOTE_CONFIG },
  initError: null,
  projectId: '',
};

export function loadStoredFirebaseConfig(): FirebaseConfigValues | null {
  try {
    const raw = localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirebaseConfigValues;
    if (parsed.apiKey && parsed.projectId && parsed.appId) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigValues | null): void {
  if (!config) {
    localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
    return;
  }
  localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function resolveFirebaseConfig(): FirebaseConfigValues | null {
  const stored = loadStoredFirebaseConfig();
  if (stored) return stored;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (
    apiKey &&
    projectId &&
    appId &&
    !apiKey.includes('your_api_key') &&
    !projectId.includes('your_project_id')
  ) {
    return {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId,
      recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
      appCheckDebugToken: import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN || 'true',
    };
  }

  return null;
}

export async function initFirebaseServices(): Promise<FirebaseRuntimeState> {
  const config = resolveFirebaseConfig();

  // Clean up any existing apps on re-init
  for (const existing of getApps()) {
    try {
      await deleteApp(existing);
    } catch {
      // ignore cleanup failures
    }
  }

  // Even without cloud credentials, initialize a local FirebaseApp + Firebase AI instance
  // so `InferenceMode.ONLY_ON_DEVICE` can still execute Chrome's built-in Gemini Nano 4
  // via the official `firebase/ai` SDK runtime!
  if (!config) {
    try {
      const localApp = initializeApp(
        {
          apiKey: 'local-on-device-mode',
          projectId: 'crisis-connection-local',
          appId: '1:000000000000:web:local',
        },
        'crisis-local-ai'
      );
      const localAi = getAI(localApp, { backend: new GoogleAIBackend() });

      runtimeState = {
        configured: false,
        app: localApp,
        ai: localAi,
        db: null,
        auth: null,
        user: null,
        appCheck: null,
        appCheckActive: false,
        appCheckDebugMode: true,
        remoteConfig: null,
        remoteParams: { ...DEFAULT_REMOTE_CONFIG },
        initError: null,
        projectId: 'local-sandbox',
      };
    } catch (err) {
      runtimeState = {
        ...runtimeState,
        configured: false,
        initError: err instanceof Error ? err.message : 'Local AI initialization error',
      };
    }
    return runtimeState;
  }

  try {
    // Configure Firebase App Check Debug Token before initializeAppCheck
    // (Hackathon rules explicitly accept App Check debug tokens!)
    const debugTokenSetting = config.appCheckDebugToken ?? 'true';
    const useDebug = debugTokenSetting !== 'false' && debugTokenSetting !== '';
    if (useDebug && typeof self !== 'undefined') {
      (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
        debugTokenSetting === 'true' ? true : debugTokenSetting;
    }

    const app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });

    // 1. Firebase App Check (Required for Firebase AI Logic cloud endpoints)
    let appCheck: AppCheck | null = null;
    let appCheckActive = false;
    try {
      const siteKey = config.recaptchaSiteKey || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckActive = true;
    } catch (err) {
      console.warn('[CrisisConnection] App Check warning:', err);
    }

    // 2. Firebase AI Logic (Hybrid on-device + Cloud Gemini SDK)
    const ai = getAI(app, { backend: new GoogleAIBackend() });

    // 3. Firestore with Offline Persistent Local Cache (multi-tab ready)
    let db: Firestore;
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = getFirestore(app);
    }

    // 4. Firebase Auth (Anonymous Field Worker / Coordinator session)
    const auth = getAuth(app);
    let user: User | null = null;
    try {
      const cred = await signInAnonymously(auth);
      user = cred.user;
    } catch (err) {
      console.warn('[CrisisConnection] Anonymous Auth skipped/disabled in console:', err);
    }

    // 5. Firebase Remote Config (Dynamic cloud model, danger weight & mesh cycle control)
    let remoteConfig: RemoteConfig | null = null;
    let remoteParams: RemoteConfigParams = { ...DEFAULT_REMOTE_CONFIG };
    try {
      remoteConfig = getRemoteConfig(app);
      remoteConfig.settings.minimumFetchIntervalMillis = 60_000;
      remoteConfig.defaultConfig = {
        cloud_model_name: DEFAULT_REMOTE_CONFIG.cloudModelName,
        default_inference_mode: DEFAULT_REMOTE_CONFIG.defaultInferenceMode,
        danger_weight: DEFAULT_REMOTE_CONFIG.dangerWeight,
        mesh_base_cycle_sec: DEFAULT_REMOTE_CONFIG.meshBaseCycleSec,
        emergency_bed_threshold: DEFAULT_REMOTE_CONFIG.emergencyBedThreshold,
      };
      await fetchAndActivate(remoteConfig);
      const modeVal = getValue(remoteConfig, 'default_inference_mode').asString();
      const validMode =
        modeVal === 'prefer_on_device' ||
        modeVal === 'only_on_device' ||
        modeVal === 'prefer_in_cloud' ||
        modeVal === 'only_in_cloud'
          ? modeVal
          : DEFAULT_REMOTE_CONFIG.defaultInferenceMode;

      remoteParams = {
        cloudModelName:
          getValue(remoteConfig, 'cloud_model_name').asString() ||
          DEFAULT_REMOTE_CONFIG.cloudModelName,
        defaultInferenceMode: validMode,
        dangerWeight:
          getValue(remoteConfig, 'danger_weight').asNumber() ||
          DEFAULT_REMOTE_CONFIG.dangerWeight,
        meshBaseCycleSec:
          getValue(remoteConfig, 'mesh_base_cycle_sec').asNumber() ||
          DEFAULT_REMOTE_CONFIG.meshBaseCycleSec,
        emergencyBedThreshold:
          getValue(remoteConfig, 'emergency_bed_threshold').asNumber() ||
          DEFAULT_REMOTE_CONFIG.emergencyBedThreshold,
        fetchedFromCloud: true,
      };
    } catch (err) {
      console.warn('[CrisisConnection] Remote Config fallback to defaults:', err);
    }

    runtimeState = {
      configured: true,
      app,
      ai,
      db,
      auth,
      user,
      appCheck,
      appCheckActive,
      appCheckDebugMode: useDebug,
      remoteConfig,
      remoteParams,
      initError: null,
      projectId: config.projectId,
    };
  } catch (err) {
    runtimeState = {
      ...runtimeState,
      configured: false,
      initError: err instanceof Error ? err.message : 'Failed to initialize Firebase',
    };
  }

  return runtimeState;
}

export function getFirebaseRuntime(): FirebaseRuntimeState {
  return runtimeState;
}
