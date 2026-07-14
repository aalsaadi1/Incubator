//
//  PraxoSettingsView.swift
//  Praxo
//
//  First-run / settings sheet: backend URL and device token, stored in
//  UserDefaults (read by PraxoConfig). Replaces `defaults write` in Terminal.
//

import SwiftUI

struct PraxoSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var backendURL: String =
        UserDefaults.standard.string(forKey: "PraxoBackendURL") ?? "http://localhost:3000"
    @State private var deviceToken: String =
        UserDefaults.standard.string(forKey: "PraxoDeviceToken") ?? ""
    @State private var testResult: String?
    @State private var testing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Praxo Settings").font(.title2.bold())

            VStack(alignment: .leading, spacing: 6) {
                Text("Server address").font(.headline)
                TextField("https://your-app.vercel.app", text: $backendURL)
                    .textFieldStyle(.roundedBorder)
                Text("Where your Praxo backend is deployed.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Device token").font(.headline)
                SecureField("Paste the PRAXO_DEVICE_TOKEN value", text: $deviceToken)
                    .textFieldStyle(.roundedBorder)
                Text("Must match PRAXO_DEVICE_TOKEN on the server.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            if let testResult {
                Text(testResult).font(.callout)
            }

            HStack {
                Button("Test connection") { Task { await testConnection() } }
                    .disabled(testing || deviceToken.isEmpty)
                Spacer()
                Button("Cancel") { dismiss() }
                Button("Save") {
                    save()
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .disabled(URL(string: backendURL) == nil || deviceToken.isEmpty)
            }
        }
        .padding(24)
        .frame(width: 460)
    }

    private func save() {
        UserDefaults.standard.set(
            backendURL.trimmingCharacters(in: .whitespaces), forKey: "PraxoBackendURL"
        )
        UserDefaults.standard.set(
            deviceToken.trimmingCharacters(in: .whitespaces), forKey: "PraxoDeviceToken"
        )
    }

    private func testConnection() async {
        testing = true
        testResult = nil
        save()
        do {
            let courses = try await PraxoAPIClient.shared.fetchCourses()
            testResult = "✅ Connected — \(courses.count) course(s) available."
        } catch {
            testResult = "❌ \(error.localizedDescription)"
        }
        testing = false
    }
}
