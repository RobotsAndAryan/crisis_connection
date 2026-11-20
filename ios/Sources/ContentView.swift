import SwiftUI

public struct ContentView: View {
    @StateObject private var service = HybridAiService()
    @State private var offlineMode = false
    @State private var query = "Tell me where the closest safe aid camp with open beds is"
    @State private var answer = "Ready for hybrid on-device Apple Foundation Models + Cloud Gemini inference."
    @State private var telemetry = "Idle"
    @State private var isLoading = false

    private let seedCamps: [AidCampRecord] = [
        AidCampRecord(id: "camp-hq", code: "BASE-HQ", name: "Meridian Central Base", x: 140, y: 120, availableBeds: 28, totalBeds: 60, safetyLevel: 9, status: "ACTIVE", uncertaintyScore: 8),
        AidCampRecord(id: "camp-north", code: "CAMP-01", name: "St. Jude Field Hospital", x: 520, y: 110, availableBeds: 9, totalBeds: 32, safetyLevel: 8, status: "ACTIVE", uncertaintyScore: 22),
        AidCampRecord(id: "camp-east", code: "CAMP-02", name: "Harbor Bridge Relief", x: 830, y: 265, availableBeds: 14, totalBeds: 24, safetyLevel: 5, status: "ACTIVE", uncertaintyScore: 64),
        AidCampRecord(id: "camp-west", code: "CAMP-03", name: "Highland Ridge Shelter", x: 255, y: 455, availableBeds: 21, totalBeds: 35, safetyLevel: 9, status: "ACTIVE", uncertaintyScore: 14),
        AidCampRecord(id: "camp-south", code: "CAMP-04", name: "Valley Clinic Annex", x: 645, y: 485, availableBeds: 6, totalBeds: 20, safetyLevel: 3, status: "DAMAGED", uncertaintyScore: 71)
    ]

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Firebase AI Logic + Apple Foundation Models")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Toggle("In-Field Offline Mode (Strict On-Device)", isOn: $offlineMode)
                        .tint(.orange)

                    HStack {
                        Label(
                            service.appleFoundationModelsReady ? "Apple Foundation Models Ready" : "Cloud Gemini Fallback Ready",
                            systemImage: service.appleFoundationModelsReady ? "cpu" : "cloud"
                        )
                        .font(.caption.bold())
                        .foregroundStyle(service.appleFoundationModelsReady ? .green : .purple)
                        Spacer()
                    }

                    TextField("Ask about nearest safe camp or CPR protocol...", text: $query, axis: .vertical)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        Task {
                            isLoading = true
                            do {
                                let res = try await service.askFieldAssistant(
                                    query: query,
                                    camps: seedCamps,
                                    offlineStrict: offlineMode
                                )
                                answer = res.text
                                telemetry = "\(res.ranOnDevice ? "ON_DEVICE" : "IN_CLOUD") · \(res.modelVersion) · \(res.latencyMs)ms"
                            } catch {
                                answer = "Inference error: \(error.localizedDescription)"
                            }
                            isLoading = false
                        }
                    } label: {
                        HStack {
                            Spacer()
                            Text(isLoading ? "Running Hybrid AI..." : "Run Hybrid Inference")
                                .bold()
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(telemetry)
                            .font(.caption2.monospaced())
                            .foregroundStyle(.cyan)
                        Text(answer)
                            .font(.callout)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding()
            }
            .navigationTitle("Crisis Connection")
            .task {
                await service.bootstrapFirebaseConfig()
            }
        }
    }
}
