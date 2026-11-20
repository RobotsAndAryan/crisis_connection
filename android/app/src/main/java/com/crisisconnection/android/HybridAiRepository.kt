package com.crisisconnection.android

import android.graphics.Bitmap
import com.google.firebase.Firebase
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.ai
import com.google.firebase.ai.annotations.PublicPreviewAPI
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.content
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import kotlinx.coroutines.tasks.await

data class HybridResponse(
    val text: String,
    val inferenceSource: String,
    val latencyMs: Long
)

/**
 * Android Hybrid AI Repository powered by Firebase AI Logic (`firebase-ai` + `firebase-ai-ondevice`).
 * - Offline Field Mode: InferenceMode.ONLY_ON_DEVICE (Gemini Nano 4 via AICore)
 * - Hybrid Mode: InferenceMode.PREFER_ON_DEVICE (Nano 4 first, seamless Cloud Gemini fallback)
 * - Base Camp Cloud Command: InferenceMode.ONLY_IN_CLOUD (CCTV bed counting & conflict resolution)
 */
@OptIn(PublicPreviewAPI::class)
class HybridAiRepository {
    private val ai = Firebase.ai(backend = GenerativeBackend.googleAI())
    private val firestore = FirebaseFirestore.getInstance()
    private val remoteConfig = FirebaseRemoteConfig.getInstance()
    private val auth = FirebaseAuth.getInstance()

    private var cloudModelName: String = "gemini-2.5-flash"

    suspend fun bootstrapCloudConfig() {
        runCatching {
            if (auth.currentUser == null) {
                auth.signInAnonymously().await()
            }
            remoteConfig.setDefaultsAsync(
                mapOf(
                    "cloud_model_name" to "gemini-2.5-flash",
                    "danger_weight" to 0.45,
                    "mesh_base_cycle_sec" to 15L
                )
            ).await()
            remoteConfig.fetchAndActivate().await()
            val remoteModel = remoteConfig.getString("cloud_model_name")
            if (remoteModel.isNotBlank()) cloudModelName = remoteModel
        }
    }

    /**
     * Pre-departure warm-up: prepares Android Gemini Nano 4 before the aid worker leaves Base Camp.
     */
    suspend fun warmUpOnDeviceNano(): Boolean = runCatching {
        val model = ai.generativeModel(
            modelName = cloudModelName,
            onDeviceConfig = OnDeviceConfig(mode = InferenceMode.ONLY_ON_DEVICE)
        )
        model.onDeviceExtension?.warmUp()
        true
    }.getOrDefault(false)

    /**
     * Field Worker Hybrid Query: queries downloaded aid camp state & emergency protocols.
     */
    suspend fun askFieldAssistant(
        query: String,
        camps: List<AidCampRecord>,
        offlineStrict: Boolean,
        attachedPhoto: Bitmap? = null
    ): HybridResponse {
        val start = System.currentTimeMillis()
        val mode = if (offlineStrict) InferenceMode.ONLY_ON_DEVICE else InferenceMode.PREFER_ON_DEVICE
        val model = ai.generativeModel(
            modelName = cloudModelName,
            onDeviceConfig = OnDeviceConfig(mode = mode)
        )

        val ranked = SafePathRouter.rankOperationalCamps(450.0, 265.0, camps)
        val campContext = ranked.joinToString("\n") { r ->
            "- [${r.camp.code}] ${r.camp.name}: Status=${r.camp.status}, Beds=${r.camp.availableBeds}/${r.camp.totalBeds}, Safety=${r.camp.safetyLevel}/10, Dist=${r.distanceKm}km, Score=${r.weightedScore}"
        }

        val promptText = """
            YOU ARE CRISIS CONNECTION ANDROID FIELD AI.
            Use the downloaded local aid camp database below to provide concise, actionable triage & evacuation guidance.
            LOCAL CAMPS (sorted by safest & shortest distance × danger score):
            $campContext

            FIELD WORKER QUERY:
            $query
        """.trimIndent()

        val response = if (attachedPhoto != null) {
            model.generateContent(
                content {
                    image(attachedPhoto)
                    text(promptText)
                }
            )
        } else {
            model.generateContent(promptText)
        }

        return HybridResponse(
            text = response.text ?: "No response generated.",
            inferenceSource = response.inferenceSource.name,
            latencyMs = System.currentTimeMillis() - start
        )
    }

    /**
     * Broadcasts a Camp Destroyed emergency alert to Firestore (automatically queued offline & synced on reconnect).
     */
    fun broadcastCampDestroyed(camp: AidCampRecord) {
        val nowIso = java.time.Instant.now().toString()
        firestore.collection("aidCamps").document(camp.id).update(
            mapOf(
                "status" to "DESTROYED",
                "availableBeds" to 0,
                "safetyLevel" to 1,
                "lastUpdated" to nowIso
            )
        )
        firestore.collection("emergencyAlerts").document("alert-android-${System.currentTimeMillis()}").set(
            mapOf(
                "severity" to "CRITICAL",
                "title" to "CAMP DESTROYED: ${camp.name} (${camp.code})",
                "message" to "Reported destroyed via Android Field Handset. Diverting all units.",
                "campId" to camp.id,
                "timestamp" to nowIso,
                "source" to "Android Field Unit",
                "acknowledged" to false,
                "propagatedViaMesh" to true
            )
        )
    }
}
