//
//  PraxoSurveyView.swift
//  Praxo
//
//  Runs a course's survey, submits answers, and hands back the generated
//  plan. One question per screen keeps it fast and phone-onboarding-like.
//

import SwiftUI

struct PraxoSurveyView: View {
    let course: PraxoCourse
    /// Called with the created plan, or nil if the user backed out.
    let onFinish: (PraxoPlan?) -> Void

    @State private var index = 0
    @State private var answers: [String: String] = [:]
    @State private var textDraft = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private var questions: [PraxoSurveyQuestion] { course.survey.questions }
    private var question: PraxoSurveyQuestion? {
        questions.indices.contains(index) ? questions[index] : nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Button("← Back") {
                    if index > 0 { index -= 1 } else { onFinish(nil) }
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                Spacer()
                Text("\(min(index + 1, questions.count)) / \(questions.count)")
                    .foregroundStyle(.secondary)
            }

            if isSubmitting {
                Spacer()
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Your teacher is building your plan…").font(.headline)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else if let question {
                if index == 0 {
                    Text(course.survey.intro).foregroundStyle(.secondary)
                }
                Text(question.question).font(.title2.bold())

                switch question.type {
                case .singleChoice, .multiChoice:
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(question.options ?? [], id: \.self) { option in
                            Button {
                                answers[question.id] = option
                                advance()
                            } label: {
                                HStack {
                                    Text(option)
                                    Spacer()
                                    if answers[question.id] == option {
                                        Image(systemName: "checkmark")
                                    }
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(.background.secondary, in: RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                case .text:
                    TextField("Type your answer…", text: $textDraft, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...6)
                        .onSubmit(submitText)
                    Button("Next") { submitText() }
                        .buttonStyle(.borderedProminent)
                        .disabled(textDraft.trimmingCharacters(in: .whitespaces).count < 3)
                }
                Spacer()
            }

            if let errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.triangle")
                    .foregroundStyle(.red)
            }
        }
        .padding(24)
    }

    private func submitText() {
        guard let question else { return }
        let trimmed = textDraft.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 3 else { return }
        answers[question.id] = trimmed
        textDraft = ""
        advance()
    }

    private func advance() {
        if index + 1 < questions.count {
            index += 1
        } else {
            submitSurvey()
        }
    }

    private func submitSurvey() {
        isSubmitting = true
        errorMessage = nil
        Task {
            do {
                let plan = try await PraxoAPIClient.shared.createPlan(
                    courseSlug: course.slug, surveyAnswers: answers
                )
                onFinish(plan)
            } catch {
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}
