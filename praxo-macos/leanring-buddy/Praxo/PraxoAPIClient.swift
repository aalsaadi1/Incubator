//
//  PraxoAPIClient.swift
//  Praxo
//
//  Thin client for the Praxo backend (Next.js API in the Incubator repo).
//  Auth is the M0 scheme: a shared device token plus a per-install user key.
//

import Foundation

struct PraxoConfig {
    /// Backend base URL. Override with the PraxoBackendURL user default;
    /// defaults to a local dev server.
    static var backendBaseURL: URL {
        if let raw = UserDefaults.standard.string(forKey: "PraxoBackendURL"),
           let url = URL(string: raw) {
            return url
        }
        return URL(string: "http://localhost:3000")!
    }

    /// Shared device token — must match PRAXO_DEVICE_TOKEN on the backend.
    static var deviceToken: String {
        UserDefaults.standard.string(forKey: "PraxoDeviceToken") ?? ""
    }

    /// Stable per-install identifier; stands in for user accounts until M4.
    static var userKey: String {
        if let existing = UserDefaults.standard.string(forKey: "PraxoUserKey") {
            return existing
        }
        let fresh = UUID().uuidString
        UserDefaults.standard.set(fresh, forKey: "PraxoUserKey")
        return fresh
    }
}

enum PraxoAPIError: LocalizedError {
    case badStatus(Int, String)
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .badStatus(let code, let body): return "Praxo backend error \(code): \(body)"
        case .notConfigured: return "Set PraxoDeviceToken in user defaults before using Praxo."
        }
    }
}

final class PraxoAPIClient {
    static let shared = PraxoAPIClient()

    private let decoder = JSONDecoder()

    private func request(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> Data {
        guard !PraxoConfig.deviceToken.isEmpty else { throw PraxoAPIError.notConfigured }

        var req = URLRequest(url: PraxoConfig.backendBaseURL.appending(path: path))
        req.httpMethod = method
        req.setValue("Bearer \(PraxoConfig.deviceToken)", forHTTPHeaderField: "Authorization")
        req.setValue(PraxoConfig.userKey, forHTTPHeaderField: "X-Praxo-User-Key")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw PraxoAPIError.badStatus(status, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }

    func fetchCourses() async throws -> [PraxoCourse] {
        let data = try await request("/api/praxo/courses")
        return try decoder.decode(PraxoCoursesResponse.self, from: data).courses
    }

    func fetchPlans() async throws -> [PraxoPlan] {
        let data = try await request("/api/praxo/plans")
        return try decoder.decode(PraxoPlansResponse.self, from: data).plans
    }

    func createPlan(courseSlug: String, surveyAnswers: [String: String]) async throws -> PraxoPlan {
        let data = try await request(
            "/api/praxo/plans",
            method: "POST",
            body: ["courseSlug": courseSlug, "surveyAnswers": surveyAnswers]
        )
        return try decoder.decode(PraxoPlanResponse.self, from: data).plan
    }

    func searchKb(planId: String, query: String) async throws -> [PraxoKbHit] {
        let data = try await request(
            "/api/praxo/kb/search",
            method: "POST",
            body: ["planId": planId, "query": query]
        )
        return try decoder.decode(PraxoKbSearchResponse.self, from: data).hits
    }

    func completeStep(stepId: String, evidence: String) async throws -> PraxoStepActionResponse {
        let data = try await request(
            "/api/praxo/steps/\(stepId)",
            method: "POST",
            body: ["action": "complete", "evidence": evidence]
        )
        return try decoder.decode(PraxoStepActionResponse.self, from: data)
    }

    func flagStuck(stepId: String, reason: String) async throws {
        _ = try await request(
            "/api/praxo/steps/\(stepId)",
            method: "POST",
            body: ["action": "flag_stuck", "reason": reason]
        )
    }

    func mintRealtimeToken(planId: String) async throws -> PraxoRealtimeToken {
        let data = try await request(
            "/api/praxo/realtime/token",
            method: "POST",
            body: ["planId": planId]
        )
        return try decoder.decode(PraxoRealtimeToken.self, from: data)
    }
}
