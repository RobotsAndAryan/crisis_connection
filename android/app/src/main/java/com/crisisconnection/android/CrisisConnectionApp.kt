package com.crisisconnection.android

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.firestoreSettings
import com.google.firebase.firestore.persistentCacheSettings

/**
 * Initializes Firebase App Check (Debug Token for hackathon testing),
 * Firestore persistent offline cache, and Firebase AI Logic runtime.
 */
class CrisisConnectionApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)

        // Enforce Firebase App Check (debug token printed in Logcat for Firebase Console registration)
        val appCheck = FirebaseAppCheck.getInstance()
        appCheck.installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance())

        // Enable persistent local Firestore cache so aid camps & alerts remain readable offline
        val firestore = FirebaseFirestore.getInstance()
        firestore.firestoreSettings = firestoreSettings {
            setLocalCacheSettings(persistentCacheSettings { })
        }
    }
}
