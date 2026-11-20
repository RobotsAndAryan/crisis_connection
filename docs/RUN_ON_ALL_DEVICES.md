# Running Crisis Connection on Every Device

This guide walks step by step through running **Crisis Connection** on **Web (Desktop & Mobile PWA)**, **Chrome Side Panel Extension**, **Android (Gemini Nano 4)**, and **iOS / macOS (Apple Foundation Models)**.

---

## 0. Shared One-Time Firebase Setup (Optional for Sandbox, Required for Live Cloud)

Crisis Connection runs out of the box in **Local Sandbox** mode (offline routing, local mesh, CCTV schematic preview, and deterministic fallback). To activate live **Cloud Gemini**, **Firestore sync**, **App Check**, **Anonymous Auth**, and **Remote Config**:

1. Open the [Firebase Console](https://console.firebase.google.com/) and create or select a project.
2. Enable **Firebase AI Logic** (Gemini Developer API).
3. Enable **Cloud Firestore** (deploy the included rules with `npx firebase-tools deploy --only firestore:rules`).
4. Enable **Authentication → Sign-in method → Anonymous**.
5. Enable **App Check** (you will register each platform's debug token UUID under **App Check → Apps → Manage debug tokens**).
6. *(Optional)* Add **Remote Config** keys if you want live runtime tuning without redeploying:
   - `cloud_model_name` (default: `gemini-2.5-flash`)
   - `default_inference_mode` (default: `PREFER_ON_DEVICE`)
   - `danger_weight` (default: `0.45`)
   - `mesh_base_cycle_sec` (default: `15`)

---

## 1. Instant Access on Any Device (Hosted Web PWA, Zero Install)

Works on **Windows, macOS, Linux, Android, iPhone, and iPad**.

1. Open **[https://crisis-connection.web.app](https://crisis-connection.web.app)** in your browser.
2. *(Optional)* Install as an offline-ready app:
   - **Desktop Chrome / Edge:** Click the **Install** icon in the address bar.
   - **Android Chrome:** Tap **⋮ → Add to Home screen → Install**.
   - **iPhone / iPad Safari:** Tap **Share → Add to Home Screen → Add**.
3. Click **Download field pack** in the top bar before going offline.

---

## 2. Web App Locally (Desktop + Phone on Local Wi-Fi)

### Prerequisites
- **Node.js 20+** and **npm**
- **Google Chrome Desktop v139+** (required only if testing on-device Gemini Nano 4)

### Run on Your Computer
```bash
git clone https://github.com/RobotsAndAryan/crisis_connection.git
cd crisis_connection
npm install
cp .env.example .env
```

1. Fill in your Firebase Web App credentials in `.env` (from Firebase Console → Project Settings → Your apps → Web), **or** leave `.env` blank and paste them live inside the app under **Setup**.
2. Start the development server:
   ```bash
   npm run dev
   ```
   Open **http://localhost:5173** in your browser.
3. Or build and run the optimized production bundle:
   ```bash
   npm run build
   npm run preview
   ```
   Open **http://localhost:4173**.

### Open on a Phone or Tablet Over Your Local Wi-Fi
Because `vite.config.ts` binds `host: true`:
1. Run `npm run dev` and note the **Network** URL printed in the terminal (for example, `http://192.168.1.42:5173`).
2. Open that URL on any phone or tablet connected to the same Wi-Fi network.
   - *Note:* Browser camera and microphone APIs require a secure origin (`https://` or `localhost`). To test live camera/mic on a phone, use the hosted HTTPS URL (`https://crisis-connection.web.app`) or an HTTPS tunnel.

### Enable On-Device Gemini Nano 4 (Chrome Desktop v139+)
1. Open Chrome Desktop and go to `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → set to **Enabled**.
2. Go to `chrome://flags/#optimization-guide-on-device-model` → set to **Enabled BypassPerfRequirement** (if needed on laptops).
3. Relaunch Chrome and open Crisis Connection.
4. Click **Download field pack** in the top bar to warm up Gemini Nano 4 (`model.initializeDeviceModel()`).
5. Open **Setup** in the top bar and confirm **On-device Gemini Nano 4** reports `available`.
6. Toggle **Field offline** (or open DevTools → **Network** → **Offline**) to run local map queries and Field AI completely offline.

### Test 2-Handset Offline Local Mesh
1. Open the **Local mesh** tab (or press `3`).
2. Click **Open 2nd handset tab** and place both windows side by side.
3. Switch both windows to **Field offline**.
4. In Window 1, go to **Tactical map**, select a camp, click **Report camp destroyed → Confirm**, and watch Window 2 receive the alert over `BroadcastChannel`, tighten **Cycle X** to `4 s` (**Emergency burst**), and reroute automatically.

---

## 3. Chrome Extension (Manifest V3 Side Panel)

Works on **Desktop Google Chrome, Brave, and Edge**.

1. Build the production web bundle and package the Manifest V3 extension:
   ```bash
   npm install
   npm run build:extension
   ```
   This outputs the unpacked extension into `chrome-extension/dist/`.
2. Open `chrome://extensions` in Chrome (or `brave://extensions` / `edge://extensions`).
3. Toggle **Developer mode** ON (top right).
4. Click **Load unpacked** and select the `chrome-extension/dist` folder.
5. Pin **Crisis Connection** in your browser toolbar and click its icon to open the Side Panel.

---

## 4. Android Native App (Kotlin + Jetpack Compose + Gemini Nano 4)

The native Android companion lives in `android/` (`applicationId = "com.crisisconnection.android"`).

### Prerequisites
- **Android Studio Ladybug / Meerkat or newer**
- **JDK 17**, **Android Gradle Plugin 8.7.3**, **Kotlin 2.1.0**, **Android SDK 35** (`minSdk 26`)
- **For on-device Gemini Nano 4:** A physical Android device with **Google AICore** support (such as Pixel 9/10 series or Galaxy S24/S25 series). Devices without AICore and Android Emulators still run using automatic Cloud Gemini fallback (`InferenceMode.PREFER_ON_DEVICE`).

### Step-by-Step Setup
1. In the Firebase Console, add an **Android app** with package name `com.crisisconnection.android`.
2. Download `google-services.json` and save it to:
   ```text
   android/app/google-services.json
   ```
   *(This file is gitignored so your project credentials stay local.)*
3. Open the `android/` directory in **Android Studio**.
4. Wait for **Gradle Sync** to finish (pulls Firebase BoM `35.2.0`, `firebase-ai`, and `firebase-ai-ondevice:16.0.0-beta07`).
5. Connect an Android device (USB debugging enabled) or start an API 26–35 emulator, then click **Run (`app`)**.
6. Register the App Check debug token:
   - Open **Logcat** in Android Studio and search for `DebugAppCheckProvider`.
   - Copy the printed debug secret UUID and add it in **Firebase Console → App Check → Apps → Android → Manage debug tokens**.
7. Test hybrid inference:
   - Tap **Pre-Departure Warm-Up** online to prepare Gemini Nano 4 via `onDeviceExtension?.warmUp()`.
   - Enable **Airplane Mode** on the device to verify `ONLY_ON_DEVICE` inference and offline Firestore persistence.

---

## 5. iOS & macOS Native App (SwiftUI + Apple Foundation Models)

The native Apple companion lives in `ios/` as a Swift Package (`CrisisConnectionIOS`) using `firebase-ios-sdk` `12.19.0+` (`FirebaseAILogic`) and Apple's `FoundationModels` framework.

### Prerequisites
- **macOS** with **Xcode 26+** and **Swift 6.0**
- Target OS: **iOS 26+** or **macOS 26+**
- **For on-device Apple Foundation Models:** An Apple Intelligence-capable iPhone, iPad, or Apple Silicon Mac with **Apple Intelligence** turned on in **Settings**. On Simulators or older devices without `SystemLanguageModel`, the app automatically falls back to Cloud Gemini via `FirebaseAILogic`.

### Step-by-Step Setup
1. In the Firebase Console, add an **Apple (iOS/macOS) app** using your chosen Bundle Identifier (for example, `com.crisisconnection.ios`) and download `GoogleService-Info.plist`.
2. Open **Xcode** → **File → New → Project → App (SwiftUI)** (iOS or Multiplatform, deployment target iOS 26 / macOS 26).
3. Add the local Swift package:
   - **File → Add Package Dependencies → Add Local...** → select the `ios/` folder from this repo.
   - Link the `CrisisConnectionCore` library to your App target.
4. Drag `GoogleService-Info.plist` into your Xcode App target (check **Copy items if needed**; this file is gitignored).
5. Replace your generated `@main` entry file with `ios/Sources/CrisisConnectionApp.swift` (or instantiate `ContentView()` from `CrisisConnectionCore` after `FirebaseApp.configure()`).
6. Select a connected iPhone/iPad, Mac, or Simulator and press **Cmd + R** to build and run.
7. Register the App Check debug token:
   - Check the Xcode Debug Console for `Firebase App Check debug token: <UUID>` printed by `AppCheckDebugProviderFactory`.
   - Register that UUID in **Firebase Console → App Check → Apps → Apple → Manage debug tokens**.

---

## 6. Deploy Your Own Firebase Hosting Instance

```bash
npm run build
npx firebase-tools login
npx firebase-tools use <your-firebase-project-id>
npx firebase-tools deploy --only hosting,firestore:rules
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| **Nano 4** shows `Unavailable` on Web | Non-Chrome browser, Chrome `< 139`, or Prompt API flag disabled | Enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` in Chrome Desktop v139+ and relaunch |
| Cloud Gemini returns `403` / App Check error | Debug token not registered in Firebase Console | Open browser DevTools / Logcat / Xcode Console, copy the App Check debug UUID, and register it under **App Check → Manage debug tokens** |
| Camera or Mic blocked on mobile LAN IP | Browser requires HTTPS for `getUserMedia` / Speech API | Use the hosted HTTPS URL (`https://crisis-connection.web.app`) or localhost |
| Android Gradle sync complains `google-services.json` missing | Config file is gitignored | Download `google-services.json` from Firebase Console into `android/app/google-services.json` |
| iOS Simulator falls back to Cloud Gemini | Apple Foundation Models requires supported hardware | Run on an Apple Intelligence-enabled physical device or Mac, or test Cloud fallback on Simulator |
