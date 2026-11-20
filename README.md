# Crisis Connection — Closed-Loop Hybrid AI Humanitarian Aid Network

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-crisis--connection.web.app-06b6d4)](https://crisis-connection.web.app)

**Live Hosted Demo:** [https://crisis-connection.web.app](https://crisis-connection.web.app)

Built for **#BuildHybridAI** using the **Firebase AI Logic Hybrid Inference SDK** across **Web (Chrome PWA + Side Panel Extension)**, **Android (Gemini Nano 4)**, and **iOS (Apple Foundation Models)** — backed by **Firebase App Check**, **Cloud Firestore** (offline persistence), **Firebase Remote Config**, and **Firebase Authentication**.

---

## Value Proposition

When disasters knock out cell towers, humanitarian field workers lose cloud connectivity right when lives depend on fast CPR/trauma protocols, camp bed availability, and hazard-aware evacuation routing. Meanwhile, base camp coordinators returning to online coverage face conflicting offline field reports, CCTV ward feeds, and sector-wide resource shortages that require cloud-scale reasoning.

**Crisis Connection** closes the loop with one unified **Firebase AI Logic Hybrid Inference** architecture:

```
┌───────────────────────────┐   1. Pre-Departure Download   ┌───────────────────────────────┐
│  MAIN BASE CAMP (CLOUD)   │ ────────────────────────────► │   FIELD WORKER (ON-DEVICE)    │
│ • Firestore Ground Truth  │  Aid Camps, Beds, Protocols   │ • Gemini Nano 4 / Apple FM    │
│ • Multimodal CCTV Counter │  + initializeDeviceModel()    │ • Text + Voice + Camera RAG   │
│ • AI Conflict Resolution  │                               │ • Offline Map (dist × danger) │
│ • Uncertainty Audit Log   │ ◄──────────────────────────── │ • Adaptive X-Cycle Local Mesh │
│ • Shortage Forecasting    │   3. Reconnect & Reconcile    │ • Offline Outbox + Alerts     │
└───────────────────────────┘   (ONLY_IN_CLOUD Structured)  └───────────────────────────────┘
```

---

## Multi-Platform Coverage

| Platform | Directory | On-Device Model | Cloud Fallback & Runtime SDK |
| :--- | :--- | :--- | :--- |
| **Web (Chrome Desktop PWA)** | `src/` | **Gemini Nano 4** (Chrome Prompt API) | `firebase/ai` v13.4.0 (`getGenerativeModel`, `InferenceMode`, `initializeDeviceModel`, `generateContentStream`, `Schema`) |
| **Chrome Extension (Side Panel)** | `chrome-extension/` | **Gemini Nano 4** | Manifest V3 Side Panel packaging the compiled hybrid web app (`npm run build:extension`) |
| **Android (Kotlin + Compose)** | `android/` | **Gemini Nano 4** (AICore / ML Kit) | `com.google.firebase:firebase-ai` + `firebase-ai-ondevice` (`OnDeviceConfig`, `warmUp()`, `inferenceSource`) |
| **iOS (SwiftUI)** | `ios/` | **Apple Foundation Models** (`SystemLanguageModel`) | `FirebaseAILogic` (`geminiLanguageModel` bridged into Apple's native `LanguageModelSession`) |

---

## Core Features

- **Pre-Departure Field Pack:** Snapshots aid camps, open beds, safety ratings, hazard zones, and emergency protocols locally **and** invokes `model.initializeDeviceModel(onDownloadProgress)` to warm up Gemini Nano 4 before departing signal range.
- **Offline Tactical Map & Safest/Shortest Router (`distance × danger level`):** Interactive SVG tactical map computing Dijkstra optimal routes that avoid collapsed bridges, floods, and gas leaks (`X` hazard zones). Click anywhere to move the worker, drop new custom hazards, or report a camp **DESTROYED** for instant fleet-wide rerouting.
- **Multimodal In-Field AI Assistant:** Supports **text, live voice mic (Web Speech API), and live camera / photo capture** grounded in the downloaded local database & 6 offline emergency protocols (CPR, Severe Hemorrhage/Tourniquet, START Triage, Crush Injury, Burns, Water Purification), displaying live `ON_DEVICE` vs `IN_CLOUD` badges and latency.
- **Adaptive X-Cycle Local Mesh Sync:** Real cross-tab offline peer gossip via `BroadcastChannel` (`Open 2nd Field Handset Tab`) with an adaptive sync cycle algorithm (`4s EMERGENCY_BURST` on camp destruction, catch-up cadence under high DB uncertainty, battery-saver stretch on low battery) and Lamport version-vector merging.
- **Base Camp Cloud Command (`ONLY_IN_CLOUD`):**
  - **Sensory CCTV / Ward Photo Bed Counter:** Analyzes generated IR-optical ward CCTV feeds or uploaded/live camera photos via structured JSON (`Schema.object`) to count open vs. occupied beds, spot roof collapse or smoke occlusion, and quantify visual uncertainty.
  - **AI Conflict Resolution & Logged Uncertainty:** Reconciles conflicting offline field reports, mesh relays, and CCTV readings against prior Firestore state, explicitly logging residual uncertainty (`0–100%`) before committing back to Firestore and broadcasting to field units.
  - **Pattern Detection & Shortage Forecasting:** Long-context analysis of multi-hour camp history predicting depletion countdowns and generating a Base Reorganization Plan.
- **Built-in 3-Minute Demo Walkthrough:** Click **3-Min Demo Guide** (bottom-left) for a guided step-by-step walkthrough of the entire closed-loop experience.

---

## Runtime Firebase Integration Map

- **Firebase AI Logic (`firebase/ai`):** [src/services/hybridAI.ts](src/services/hybridAI.ts) — `getGenerativeModel` across `ONLY_ON_DEVICE`, `PREFER_ON_DEVICE`, `PREFER_IN_CLOUD`, and `ONLY_IN_CLOUD`, plus `initializeDeviceModel()`, `generateContentStream()` with `InlineDataPart`, `Schema.object()`, and `response.inferenceSource`.
- **Firebase App Check (`firebase/app-check`):** [src/services/firebase.ts](src/services/firebase.ts) — `initializeAppCheck()` with `ReCaptchaV3Provider` and debug token support (`FIREBASE_APPCHECK_DEBUG_TOKEN`).
- **Cloud Firestore (`firebase/firestore`):** [src/services/firebase.ts](src/services/firebase.ts), [src/services/localStorageDb.ts](src/services/localStorageDb.ts) — `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager`.
- **Firebase Remote Config (`firebase/remote-config`):** [src/services/firebase.ts](src/services/firebase.ts) — dynamically tunes `cloud_model_name`, `default_inference_mode`, `danger_weight`, `mesh_base_cycle_sec`, and `emergency_bed_threshold`.
- **Firebase Auth (`firebase/auth`):** [src/services/firebase.ts](src/services/firebase.ts) — `signInAnonymously()` for field worker & base coordinator sessions.

---

## Quick Start

### 1. Run the Web App Locally
```bash
npm install
cp .env.example .env   # Add your Firebase Web App credentials (or paste them live in-app under "Firebase & AI")
npm run dev
```

### 2. Run Automated Tests & Production Build
```bash
npm test               # Runs Vitest suite (pathfinding, adaptive mesh cycle, conflict resolution & forecasting)
npm run typecheck      # Strict TypeScript check against Firebase SDK v13.4.0
npm run build          # Builds production PWA bundle into dist/
npm run build:extension # Packages Chrome Manifest V3 Side Panel extension into chrome-extension/dist/
```

### 3. Enable Chrome Desktop On-Device Gemini Nano 4
1. Open **Google Chrome Desktop (v139+)**.
2. Enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and relaunch Chrome.
3. Click **Download Field Pack** in Crisis Connection to warm up Gemini Nano 4 via `model.initializeDeviceModel()`.
4. Switch to **In Field (Offline)** (or toggle Offline in Chrome DevTools) to run completely on-device!

### 4. Load the Chrome Side Panel Extension
1. Run `npm run build:extension`.
2. Open `chrome://extensions`, toggle **Developer mode**, click **Load unpacked**, and select `chrome-extension/dist`.

### 5. Deploy to Firebase Hosting
```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting,firestore:rules
```

See [docs/DEVPOST_SUBMISSION.md](docs/DEVPOST_SUBMISSION.md) for the complete Devpost submission write-up, 2:45 YouTube demo script, and original whiteboard architecture ([docs/whiteboard-architecture.jpeg](docs/whiteboard-architecture.jpeg)).

---

## License

Licensed under the [Apache License 2.0](./LICENSE).
