import Foundation

public struct AidCampRecord: Identifiable, Sendable {
    public let id: String
    public let code: String
    public let name: String
    public let x: Double
    public let y: Double
    public let availableBeds: Int
    public let totalBeds: Int
    public let safetyLevel: Int
    public let status: String // ACTIVE | OVERCROWDED | DAMAGED | DESTROYED
    public let uncertaintyScore: Int

    public init(
        id: String,
        code: String,
        name: String,
        x: Double,
        y: Double,
        availableBeds: Int,
        totalBeds: Int,
        safetyLevel: Int,
        status: String,
        uncertaintyScore: Int
    ) {
        self.id = id
        self.code = code
        self.name = name
        self.x = x
        self.y = y
        self.availableBeds = availableBeds
        self.totalBeds = totalBeds
        self.safetyLevel = safetyLevel
        self.status = status
        self.uncertaintyScore = uncertaintyScore
    }
}

public struct RankedCampRoute: Sendable {
    public let camp: AidCampRecord
    public let distanceKm: Double
    public let dangerLevel: Int
    public let weightedScore: Double
}

/// Shared Crisis Connection offline routing algorithm (`distance × danger level`).
public enum SafePathRouter {
    public static func rankOperationalCamps(
        workerX: Double,
        workerY: Double,
        camps: [AidCampRecord],
        dangerWeight: Double = 0.45,
        minBeds: Int = 1
    ) -> [RankedCampRoute] {
        camps
            .filter { $0.status != "DESTROYED" && $0.availableBeds >= minBeds }
            .map { camp in
                let distKm = hypot(camp.x - workerX, camp.y - workerY) / 110.0
                let danger = max(1, min(10, 11 - camp.safetyLevel))
                let dangerMult = danger >= 7 ? Double(danger * 2) : Double(danger)
                let damagedPenalty = camp.status == "DAMAGED" ? 1.5 : 1.0
                let score = distKm * (1.0 + dangerWeight * dangerMult) * damagedPenalty
                return RankedCampRoute(
                    camp: camp,
                    distanceKm: (distKm * 100).rounded() / 100,
                    dangerLevel: danger,
                    weightedScore: (score * 100).rounded() / 100
                )
            }
            .sorted { $0.weightedScore < $1.weightedScore }
    }
}
