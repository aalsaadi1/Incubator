//
//  PraxoModels.swift
//  Praxo
//
//  Codable models mirroring the Praxo backend API
//  (src/app/api/praxo/* in the Incubator repo).
//

import Foundation

struct PraxoCourse: Codable, Identifiable, Hashable {
    let id: String
    let slug: String
    let title: String
    let description: String
    let coverEmoji: String?
    let survey: PraxoSurvey
}

struct PraxoSurvey: Codable, Hashable {
    let intro: String
    let questions: [PraxoSurveyQuestion]
}

struct PraxoSurveyQuestion: Codable, Identifiable, Hashable {
    let id: String
    let question: String
    let type: QuestionType
    let options: [String]?
    let required: Bool

    enum QuestionType: String, Codable {
        case singleChoice = "single_choice"
        case multiChoice = "multi_choice"
        case text
    }
}

struct PraxoPlan: Codable, Identifiable, Hashable {
    let id: String
    let status: String // ACTIVE | COMPLETED | ABANDONED
    let steps: [PraxoStep]
    let course: PraxoPlanCourseRef?
}

struct PraxoPlanCourseRef: Codable, Hashable {
    let slug: String
    let title: String
    let coverEmoji: String?
}

struct PraxoStep: Codable, Identifiable, Hashable {
    let id: String
    let order: Int
    let title: String
    let goal: String
    let instructions: String
    let gate: String
    let status: String // LOCKED | CURRENT | PASSED
}

struct PraxoKbHit: Codable {
    let id: String
    let title: String
    let content: String
    let score: Double
}

struct PraxoRealtimeToken: Codable {
    let clientSecret: String
    let expiresAt: Int?
    let sessionId: String
    let model: String?
    let currentStep: PraxoStep?
}

// Wrappers for backend response envelopes.
struct PraxoCoursesResponse: Codable { let courses: [PraxoCourse] }
struct PraxoPlansResponse: Codable { let plans: [PraxoPlan] }
struct PraxoPlanResponse: Codable { let plan: PraxoPlan }
struct PraxoKbSearchResponse: Codable { let hits: [PraxoKbHit] }
struct PraxoStepActionResponse: Codable {
    let step: PraxoStep
    let nextStepId: String?
    let planCompleted: Bool?
}
