package com.crisisconnection.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val repo = HybridAiRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                CrisisConnectionAndroidScreen(repo)
            }
        }
    }
}

@Composable
fun CrisisConnectionAndroidScreen(repo: HybridAiRepository) {
    val scope = rememberCoroutineScope()
    var offlineMode by remember { mutableStateOf(false) }
    var nanoReady by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("Tell me the safest & shortest aid camp with open beds") }
    var answer by remember { mutableStateOf("Tap 'Warm Up Nano 4' before entering the field, then ask any triage or routing query.") }
    var telemetry by remember { mutableStateOf("Idle") }
    var loading by remember { mutableStateOf(false) }

    val seedCamps = remember {
        listOf(
            AidCampRecord("camp-hq", "BASE-HQ", "Meridian Central Base", 140.0, 120.0, 28, 60, 9, "ACTIVE", 8),
            AidCampRecord("camp-north", "CAMP-01", "St. Jude Field Hospital", 520.0, 110.0, 9, 32, 8, "ACTIVE", 22),
            AidCampRecord("camp-east", "CAMP-02", "Harbor Bridge Relief", 830.0, 265.0, 14, 24, 5, "ACTIVE", 64),
            AidCampRecord("camp-west", "CAMP-03", "Highland Ridge Shelter", 255.0, 455.0, 21, 35, 9, "ACTIVE", 14),
            AidCampRecord("camp-south", "CAMP-04", "Valley Clinic Annex", 645.0, 485.0, 6, 20, 3, "DAMAGED", 71)
        )
    }

    LaunchedEffect(Unit) {
        repo.bootstrapCloudConfig()
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("CRISIS CONNECTION · ANDROID", style = MaterialTheme.typography.titleLarge)
            Text(
                "Firebase AI Logic Hybrid Inference (Gemini Nano 4 via AICore + Cloud Gemini fallback)",
                style = MaterialTheme.typography.bodySmall
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = !offlineMode,
                    onClick = { offlineMode = false },
                    label = { Text("Base Camp (Hybrid)") }
                )
                FilterChip(
                    selected = offlineMode,
                    onClick = { offlineMode = true },
                    label = { Text("In Field (ONLY_ON_DEVICE)") }
                )
            }

            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        nanoReady = repo.warmUpOnDeviceNano()
                        telemetry = if (nanoReady) "Gemini Nano 4 Warmed & Ready" else "Nano 4 unavailable — Cloud fallback active"
                        loading = false
                    }
                },
                enabled = !loading
            ) {
                Text(if (nanoReady) "Field Pack & Nano 4 Ready ✓" else "Download Field Pack & Warm Up Nano 4")
            }

            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Field Query (Routing / CPR / Triage)") },
                modifier = Modifier.fillMaxWidth()
            )

            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        runCatching {
                            val res = repo.askFieldAssistant(query, seedCamps, offlineStrict = offlineMode)
                            answer = res.text
                            telemetry = "Source: ${res.inferenceSource} · ${res.latencyMs}ms"
                        }.onFailure { err ->
                            answer = "Inference error: ${err.message}"
                        }
                        loading = false
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (loading) "Running Hybrid AI..." else "Run Hybrid Inference")
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(telemetry, style = MaterialTheme.typography.labelMedium)
                    Text(answer, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
