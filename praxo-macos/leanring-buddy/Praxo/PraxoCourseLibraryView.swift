//
//  PraxoCourseLibraryView.swift
//  Praxo
//
//  The course library: a grid of cards. Picking a card runs its survey,
//  which generates a personalized plan; an existing plan opens directly.
//

import SwiftUI

@MainActor
final class PraxoLibraryModel: ObservableObject {
    enum Route: Hashable {
        case survey(PraxoCourse)
        case plan(PraxoPlan)
    }

    @Published var courses: [PraxoCourse] = []
    @Published var plans: [PraxoPlan] = []
    @Published var route: Route?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let courses = PraxoAPIClient.shared.fetchCourses()
            async let plans = PraxoAPIClient.shared.fetchPlans()
            self.courses = try await courses
            self.plans = try await plans
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func activePlan(for course: PraxoCourse) -> PraxoPlan? {
        plans.first { $0.course?.slug == course.slug && $0.status == "ACTIVE" }
    }

    func open(_ course: PraxoCourse) {
        if let plan = activePlan(for: course) {
            route = .plan(plan)
        } else {
            route = .survey(course)
        }
    }
}

struct PraxoCourseLibraryView: View {
    @StateObject private var model = PraxoLibraryModel()

    private let columns = [GridItem(.adaptive(minimum: 220), spacing: 16)]

    var body: some View {
        Group {
            switch model.route {
            case .survey(let course):
                PraxoSurveyView(course: course) { plan in
                    model.route = plan.map { .plan($0) }
                    Task { await model.load() }
                }
            case .plan(let plan):
                PraxoPlanView(plan: plan) { model.route = nil }
            case nil:
                library
            }
        }
        .frame(minWidth: 720, minHeight: 480)
        .task { await model.load() }
    }

    private var library: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("What do you want to get done?")
                    .font(.largeTitle.bold())
                Text("Pick a course. Your teacher builds the plan around you, then coaches you through it on your real screen.")
                    .foregroundStyle(.secondary)

                if let error = model.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                }

                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(model.courses) { course in
                        CourseCard(
                            course: course,
                            inProgress: model.activePlan(for: course) != nil
                        )
                        .onTapGesture { model.open(course) }
                    }
                }

                if model.isLoading { ProgressView().frame(maxWidth: .infinity) }
            }
            .padding(24)
        }
    }
}

private struct CourseCard: View {
    let course: PraxoCourse
    let inProgress: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(course.coverEmoji ?? "🎓").font(.system(size: 40))
            Text(course.title).font(.headline)
            Text(course.description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(3)
            Spacer(minLength: 0)
            Text(inProgress ? "Continue →" : "Start →")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(inProgress ? Color.orange : Color.accentColor)
        }
        .padding(16)
        .frame(height: 190, alignment: .topLeading)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(.quaternary))
        .contentShape(RoundedRectangle(cornerRadius: 14))
    }
}
