import Foundation
import FirebaseCore
import FirebaseAILogic
import FirebaseAuth
import FirebaseFirestore
import FirebaseRemoteConfig
import FoundationModels

public struct HybridFieldResponse: Sendable {
    public let text: String
    public let modelVersion: String
    public let ranOnDevice: Bool
    public let latencyMs: Int
}

/// iOS Hybrid AI Service bridging Apple's on-device `FoundationModels` (`SystemLanguageModel.default`)
/// with Cloud Gemini via `FirebaseAILogic` (`geminiLanguageModel`) over the unified `LanguageModelSession` API.
@MainActor
public final class HybridAiService: ObservableObject {
    @Published public private(set) var appleFoundationModelsReady: Bool = false
    @Published public private(set) var cloudModelName: String = "gemini-2.5-flash"

    private let firestore = Firestore.firestore()
    private let remoteConfig = RemoteConfig.remoteConfig()

    public init() {
        refreshOnDeviceAvailability()
    }

    public func refreshOnDeviceAvailability() {
        appleFoundationModelsReady = SystemLanguageModel.default.isAvailable
    }

    public func bootstrapFirebaseConfig() async {
        do {
            if Auth.auth().currentUser == nil {
                _ = try await Auth.auth().signInAnonymously()
            }
            remoteConfig.setDefaults([
                "cloud_model_name": "gemini-2.5-flash" as NSObject,
                "danger_weight": 0.45 as NSObject,
                "mesh_base_cycle_sec": 15 as NSObject
            ])
            _ = try await remoteConfig.fetchAndActivate()
            let configuredModel = remoteConfig.configValue(forKey: "cloud_model_name").stringValue
            if !configuredModel.isEmpty {
                cloudModelName = configuredModel
            }
        } catch {
            // Offline or sandbox — keep resilient local defaults
        }
    }

    /// Executes hybrid inference:
    /// - When Apple Foundation Models is available (or in strict offline field mode): runs locally on-device.
    /// - When unavailable on older hardware & online: seamlessly routes to Cloud Gemini via `FirebaseAILogic`.
    public func askFieldAssistant(
        query: String,
        camps: [AidCampRecord],
        offlineStrict: Bool
    ) async throws -> HybridFieldResponse {
        let start = Date()
        let ranked = SafePathRouter.rankOperationalCamps(workerX: 450, workerY: 265, camps: camps)
        let campContext = ranked.map { r in
            "- [\(r.camp.code)] \(r.camp.name): Status=\(r.camp.status), Beds=\(r.camp.availableBeds)/\(r.camp.totalBeds), Safety=\(r.camp.safetyLevel)/10, Dist=\(r.distanceKm)km, Score=\(r.weightedScore)"
        }.joined(separator: "\n")

        let instructions = """
        YOU ARE CRISIS CONNECTION iOS FIELD AI.
        Answer concisely using the downloaded aid camp database below. Prioritize human safety and CPR/triage accuracy.
        LOCAL CAMPS (sorted by distance × danger):
        \(campContext)
        """

        // Prefer Apple Foundation Models on-device when available or strictly offline
        if SystemLanguageModel.default.isAvailable || offlineStrict {
            let localSession = LanguageModelSession(
                model: SystemLanguageModel.default,
                instructions: instructions
            )
            let response = try await localSession.respond(to: query)
            let elapsed = Int(Date().timeIntervalSince(start) * 1000)
            return HybridFieldResponse(
                text: response.content,
                modelVersion: "apple-foundation-models-system-language-model",
                ranOnDevice: true,
                latencyMs: elapsed
            )
        }

        // Cloud Gemini Fallback via Firebase AI Logic + App Check
        let ai = FirebaseAI.firebaseAI(backend: .googleAI())
        let geminiModel = ai.geminiLanguageModel(name: cloudModelName)
        let cloudSession = LanguageModelSession(
            model: geminiModel,
            instructions: instructions
        )
        let response = try await cloudSession.respond(to: query)
        let elapsed = Int(Date().timeIntervalSince(start) * 1000)
        return HybridFieldResponse(
            text: response.content,
            modelVersion: cloudModelName,
            ranOnDevice: false,
            latencyMs: elapsed
        )
    }

    /// Broadcasts a Camp Destroyed emergency alert to shared Firestore (queued offline automatically).
    public func broadcastCampDestroyed(_ camp: AidCampRecord) {
        let nowIso = ISO8601DateFormatter().string(from: Date())
        firestore.collection("aidCamps").document(camp.id).setData([
            "status": "DESTROYED",
            "availableBeds": 0,
            "safetyLevel": 1,
            "lastUpdated": nowIso
        ], merge: true)

        firestore.collection("emergencyAlerts").document("alert-ios-\(Int(Date().timeIntervalSince1970))").setData([
            "severity": "CRITICAL",
            "title": "CAMP DESTROYED: \(camp.name) (\(camp.code))",
            "message": "Reported destroyed via iOS Field Handset. All nearby routes recalculated.",
            "campId": camp.id,
            "timestamp": nowIso,
            "source": "iOS Field Unit",
            "acknowledged": false,
            "propagatedViaMesh": true
        ])
    }
}
