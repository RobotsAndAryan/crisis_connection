package com.crisisconnection.android

import kotlin.math.hypot

data class AidCampRecord(
    val id: String,
    val code: String,
    val name: String,
    val x: Double,
    val y: Double,
    val availableBeds: Int,
    val totalBeds: Int,
    val safetyLevel: Int, // 1..10 (higher = safer)
    val status: String,   // ACTIVE | OVERCROWDED | DAMAGED | DESTROYED
    val uncertaintyScore: Int
)

data class RankedCampRoute(
    val camp: AidCampRecord,
    val distanceKm: Double,
    val dangerLevel: Int,
    val weightedScore: Double
)

/**
 * Shared Crisis Connection routing algorithm:
 * Finds the safest & shortest operational camp using `distance × (1 + dangerWeight × dangerLevel)`,
 * excluding DESTROYED camps and honoring Remote Config's `danger_weight`.
 */
object SafePathRouter {
    fun rankOperationalCamps(
        workerX: Double,
        workerY: Double,
        camps: List<AidCampRecord>,
        dangerWeight: Double = 0.45,
        minBeds: Int = 1
    ): List<RankedCampRoute> {
        return camps
            .filter { it.status != "DESTROYED" && it.availableBeds >= minBeds }
            .map { camp ->
                val distKm = hypot(camp.x - workerX, camp.y - workerY) / 110.0
                val danger = (11 - camp.safetyLevel).coerceIn(1, 10)
                val dangerMult = if (danger >= 7) danger * 2.0 else danger.toDouble()
                val damagedPenalty = if (camp.status == "DAMAGED") 1.5 else 1.0
                val score = distKm * (1.0 + dangerWeight * dangerMult) * damagedPenalty
                RankedCampRoute(
                    camp = camp,
                    distanceKm = (distKm * 100).toInt() / 100.0,
                    dangerLevel = danger,
                    weightedScore = (score * 100).toInt() / 100.0
                )
            }
            .sortedBy { it.weightedScore }
    }
}
