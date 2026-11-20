plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.crisisconnection.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.crisisconnection.android"
        minSdk = 26 // Required by firebase-ai-ondevice (Gemini Nano 4 via AICore)
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Firebase BoM — manages core Firebase AI Logic & ecosystem libraries
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))

    // Firebase AI Logic Hybrid Inference (Cloud Gemini + On-Device Gemini Nano 4 via AICore)
    implementation("com.google.firebase:firebase-ai")
    implementation("com.google.firebase:firebase-ai-ondevice:16.0.0-beta07")

    // Firebase App Check (required for Firebase AI Logic; debug token accepted for #BuildHybridAI)
    implementation("com.google.firebase:firebase-appcheck-debug")
    implementation("com.google.firebase:firebase-appcheck-playintegrity")

    // Shared Crisis Connection Cloud + Offline Persistence Ecosystem
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-config")

    // Jetpack Compose Material 3
    implementation(platform("androidx.compose:compose-bom:2025.01.00"))
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
