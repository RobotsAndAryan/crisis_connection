# Crisis Connection — #BuildHybridAI Devpost Submission Package

> Copy-paste the sections below directly into your **Devpost submission form** before **Nov 30, 2026 at 2:00 PM PST**.

---

## Project Title
**Crisis Connection — Closed-Loop Hybrid AI Humanitarian Aid Network**

## Tagline (≤ 120 chars)
Offline-first crisis triage, safe routing & cloud conflict resolution across Web, Android & iOS via Firebase AI Logic.

---

## Devpost Description

### Inspiration
When earthquakes, flash floods, or grid collapses strike, cellular towers fail precisely when field medics and rescue coordinators need real-time answers the most: *Which aid camp still has open beds? What is the safest route around collapsed bridges? What are the exact crush-injury or tourniquet protocols right now?*

Pure cloud AI fails completely the moment a responder leaves signal range. Pure on-device AI fails when multiple responders return with conflicting bed counts, damaged camp statuses, and CCTV ward feeds that require multi-source reasoning and long-context shortage forecasting. **Crisis Connection** solves both sides as a single **closed-loop hybrid AI system** built on **Firebase AI Logic**.

### What It Does
Crisis Connection links **Main Base Camp (Cloud)** and **Field Responders (On-Device)** in a continuous 5-stage loop:

1. **Pre-Departure Field Pack (Online at Base Camp):** Before departing into a zero-signal zone, workers click **Download Field Pack** to cache Firestore aid camps (locations, open beds, safety levels, hazard zones, tactical map graph, and CPR/trauma/triage protocols) locally **and** warm up on-device AI (`model.initializeDeviceModel()` on Chrome / `onDeviceExtension?.warmUp()` on Android).
2. **Offline Safest & Shortest Path Map (`distance × danger level`):** A 100% offline interactive tactical map computes optimal evacuation routes using a danger-weighted Dijkstra engine (`distance × danger level`), automatically contrasting risky shortcuts through collapsed bridges (`X` hazard zones) against safer corridors. Workers can drop new hazards live or report a camp **DESTROYED** to trigger immediate fleet-wide rerouting.
3. **In-Field Multimodal AI Assistant & Emergency Protocols (`ONLY_ON_DEVICE` / `PREFER_ON_DEVICE`):** Field workers query their downloaded database via **text, voice (Web Speech API), or camera photos** for instant camp guidance and step-by-step CPR, hemorrhage/tourniquet, START mass-casualty triage, crush syndrome, burn care, and water purification protocols — with live `ON_DEVICE` vs `IN_CLOUD` inference badges and latency telemetry.
4. **Adaptive X-Cycle Local Mesh Sync:** Because offline devices fall out of sync in the field, handsets gossip database updates and emergency alerts locally via peer-to-peer `BroadcastChannel` (testable live across two offline browser tabs). An **Adaptive X-Cycle algorithm** automatically tightens sync intervals from `15s` → `4s EMERGENCY_BURST` when a camp is destroyed, or stretches intervals to conserve handset battery during calm periods.
5. **Base Camp Cloud Command (`ONLY_IN_CLOUD`):** When responders reconnect, Cloud Gemini executes three heavy reasoning workloads using structured JSON (`Schema.object`):
   - **Multimodal CCTV / Ward Photo Bed Counter:** Inspects ward camera feeds or uploaded photos to count open vs. occupied beds, spot roof collapse or smoke occlusion, and quantify visual uncertainty.
   - **Multi-Source Conflict Resolution & Logged Uncertainty:** Reconciles previous Firestore state, conflicting offline field/mesh reports, and CCTV counts into one unified ground truth — explicitly logging residual uncertainty (`0–100%`) in an audit trail before committing back to Firestore and broadcasting to field units.
   - **Long-Context Pattern Detection & Shortage Forecasting:** Analyzes multi-hour camp history across all bases to predict bed, trauma kit, water, and generator depletion countdowns and output an actionable Base Reorganization Plan.

### How We Built It — Multi-Platform Firebase AI Logic Architecture
- **Web (Chrome Desktop PWA + Manifest V3 Side Panel Extension):** Uses `firebase/ai` v13.4.0 (`getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode`, `InferenceSource`, `Schema`, `initializeDeviceModel`, `generateContentStream` with multimodal `InlineDataPart`) routing to **Gemini Nano 4** locally with seamless **Cloud Gemini** fallback.
- **Android Companion (`android/`):** Native Kotlin + Jetpack Compose app using `com.google.firebase:firebase-ai` + `com.google.firebase:firebase-ai-ondevice` (`OnDeviceConfig`, `InferenceMode.PREFER_ON_DEVICE` / `ONLY_ON_DEVICE`, `onDeviceExtension?.warmUp()`).
- **iOS Companion (`ios/`):** Native SwiftUI app bridging Apple's on-device **Foundation Models** (`SystemLanguageModel.default`) with **Cloud Gemini** (`FirebaseAI.firebaseAI().geminiLanguageModel(...)`) through Apple's unified `LanguageModelSession` API via `FirebaseAILogic`.
- **Supporting Firebase Ecosystem:**
  - **Firebase App Check** (enforced with debug token support across Web, Android, and iOS).
  - **Cloud Firestore** with persistent multi-tab offline cache (`persistentLocalCache`) syncing `aidCamps`, `fieldReports`, `emergencyAlerts`, and `uncertaintyLogs`.
  - **Firebase Remote Config** dynamically tuning `cloud_model_name`, `default_inference_mode`, `danger_weight`, and `mesh_base_cycle_sec` without redeploying.
  - **Firebase Authentication** (anonymous field-session auth securing Firestore rules).

### Value Proposition
- **Zero-Signal Resilience:** Life-saving medical protocols, danger-aware evacuation routing, and local AI triage keep working when towers and cloud APIs are dark.
- **Zero Cloud Cost for Routine Field Queries:** High-frequency local lookups run free and privately on Gemini Nano 4 / Apple Foundation Models; Cloud Gemini is reserved for high-value multi-source conflict resolution, optical bed counting, and sector-wide forecasting.
- **Honest Uncertainty Engineering:** Instead of hallucinating certainty from stale disaster data, Crisis Connection quantifies and logs uncertainty across every camp, sensor, and conflict resolution decision.

---

## 2:45 YouTube Demo Video Shot List (Strict ≤ 3:00 Limit)

> Tip: Use the in-app **"3-Min Demo Guide"** button (bottom-left) while screen recording so every click is smooth and fast!

- **0:00 – 0:25 | Hook & Problem**
  - Show Crisis Connection Tactical Map online at Base Camp.
  - Explain: *"In disaster zones, towers go down when aid workers need AI most — yet base camp still needs cloud reasoning to reconcile conflicting field reports and CCTV feeds. Crisis Connection closes the loop using Firebase AI Logic."*
- **0:25 – 0:50 | Pre-Departure Pack & Gemini Nano 4 Warm-Up**
  - Click **Download Field Pack** → show `model.initializeDeviceModel()` progress + cached snapshot checksum.
  - Briefly open **Firebase & AI** modal showing live **App Check**, **Remote Config**, **Firestore**, and **Gemini Nano 4: AVAILABLE**.
- **0:50 – 1:30 | Go Offline: Local Map + Safest Path + On-Device Field AI**
  - Toggle **In Field (Offline)** (or Chrome DevTools → Network → Offline!).
  - Click **Ask Local AI** on the map → show `ON_DEVICE · Gemini Nano 4` badge + how `distance × danger level` avoids the red `X` Collapsed Hwy-4 Overpass.
  - Switch to **Field AI & Protocols** → ask a voice/text CPR or tourniquet query (or attach a photo) → show streaming **ON_DEVICE** response grounded in downloaded protocols + log an offline field report.
- **1:30 – 2:00 | Live 2-Tab Offline Local Mesh Sync + Camp Destroyed Alert**
  - Put two browser windows side-by-side (both in **In Field Offline**).
  - On Window 1, click **Report Camp Destroyed · Broadcast Alert** → watch Window 2 receive the critical alert over Local Mesh `BroadcastChannel`, accelerate the Adaptive X-Cycle to `4s EMERGENCY_BURST`, and instantly divert evacuation routes!
- **2:00 – 2:40 | Reconnect to Base Camp Cloud Command**
  - Toggle back to **Base Camp (Online)** → open **Cloud Command**.
  - Click **Count Beds & Assess Hazards with Cloud Gemini** on the Ward CCTV feed → show `IN_CLOUD` multimodal JSON count + smoke occlusion uncertainty.
  - Click **Resolve Conflicts & Log Uncertainty** → show reconciled beds, logged uncertainty, and **Commit to Cloud DB**.
  - Click **Run Cloud Forecast** → show depletion countdowns and Base Reorganization Plan.
- **2:40 – 2:55 | Multi-Platform Close**
  - Briefly show `android/` (Gemini Nano 4 via `firebase-ai-ondevice`) + `ios/` (Apple Foundation Models via `FirebaseAILogic`) + Chrome Side Panel Extension in VS Code/editor. End cleanly under 3:00!

---

## Final Pre-Submission Checklist (User Actions Requiring Your Accounts)

- [ ] **Create/Select Firebase Project** in [Firebase Console](https://console.firebase.google.com/):
  - Enable **Firebase AI Logic** (Gemini Developer API)
  - Enable **Firestore Database** and deploy rules (`firebase deploy --only firestore:rules`)
  - Enable **Authentication → Anonymous**
  - Enable **App Check** → register the debug token UUID printed in Chrome DevTools console under *Apps → Manage debug tokens*
  - Optional: add Remote Config keys (`cloud_model_name`, `danger_weight`, `mesh_base_cycle_sec`)
- [ ] **Connect Config**: Copy `.env.example` → `.env` with your Firebase Web config (or paste directly in the in-app **Firebase & AI** settings modal).
- [ ] **Deploy Hosted Demo URL** (strongly encouraged by judges!):
  ```bash
  npm run build
  npx firebase-tools login
  npx firebase-tools use <your-project-id>
  npx firebase-tools deploy --only hosting,firestore:rules
  ```
- [ ] **Push to Public GitHub/GitLab Repo** (Apache 2.0 `LICENSE` is already at repo root so GitHub auto-detects it in the About sidebar).
- [ ] **Record & Upload ≤ 3:00 Public YouTube Demo Video** (English or English subtitles).
- [ ] **Submit on Devpost** (`https://firebasehybridaihackathon.devpost.com`) before **Nov 30, 2026 at 2:00 PM PST**.
