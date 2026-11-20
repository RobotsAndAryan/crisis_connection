import SwiftUI
import FirebaseCore
import FirebaseAppCheck
import FirebaseFirestore

@main
public struct CrisisConnectionApp: App {
    public init() {
        // Configure App Check debug token provider before FirebaseApp.configure()
        let providerFactory = AppCheckDebugProviderFactory()
        AppCheck.setAppCheckProviderFactory(providerFactory)
        FirebaseApp.configure()

        // Enable persistent offline Firestore cache
        let settings = FirestoreSettings()
        settings.cacheSettings = PersistentCacheSettings()
        Firestore.firestore().settings = settings
    }

    public var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
