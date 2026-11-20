// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CrisisConnectionIOS",
    platforms: [
        .iOS(.v26),
        .macOS(.v26)
    ],
    products: [
        .library(name: "CrisisConnectionCore", targets: ["CrisisConnectionCore"])
    ],
    dependencies: [
        // Firebase Apple SDK v12.19+ with FirebaseAILogic + Apple Foundation Models bridge
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.19.0")
    ],
    targets: [
        .target(
            name: "CrisisConnectionCore",
            dependencies: [
                .product(name: "FirebaseAILogic", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAppCheck", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseRemoteConfig", package: "firebase-ios-sdk")
            ],
            path: "Sources"
        )
    ]
)
