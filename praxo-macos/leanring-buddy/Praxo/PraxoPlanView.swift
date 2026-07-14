//
//  PraxoPlanView.swift
//  Praxo
//
//  The learner's step plan with gates, plus session start/stop for the
//  Realtime voice teacher.
//

import SwiftUI

struct PraxoPlanView: View {
    let onBack: () -> Void

    @StateObject private var teacher: PraxoRealtimeTeacher
    @State private var plan: PraxoPlan

    init(plan: PraxoPlan, onBack: @escaping () -> Void) {
        self.onBack = onBack
        _plan = State(initialValue: plan)
        _teacher = StateObject(wrappedValue: PraxoRealtimeTeacher(plan: plan))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Button("← Courses", action: onBack)
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                Spacer()
                sessionButton
            }

            Text(plan.course?.title ?? "Your plan").font(.largeTitle.bold())

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(plan.steps.sorted { $0.order < $1.order }) { step in
                        StepRow(step: step)
                    }
                }
            }
        }
        .padding(24)
        .onReceive(NotificationCenter.default.publisher(for: .praxoStepPassed)) { _ in
            Task { await refresh() }
        }
        .onDisappear { teacher.stop() }
    }

    private var sessionButton: some View {
        Group {
            switch teacher.state {
            case .idle, .ended:
                Button {
                    Task { await teacher.start() }
                } label: {
                    Label("Start session", systemImage: "waveform.circle.fill")
                }
                .buttonStyle(.borderedProminent)
            case .connecting:
                ProgressView().controlSize(.small)
            case .live:
                Button {
                    teacher.stop()
                } label: {
                    Label("End session", systemImage: "stop.circle.fill")
                }
                .tint(.red)
            }
        }
    }

    private func refresh() async {
        guard let updated = try? await PraxoAPIClient.shared.fetchPlans()
            .first(where: { $0.id == plan.id }) else { return }
        plan = updated
    }
}

private struct StepRow: View {
    let step: PraxoStep

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .font(.title3)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text("\(step.order). \(step.title)")
                    .font(.headline)
                    .foregroundStyle(step.status == "LOCKED" ? .secondary : .primary)
                if step.status == "CURRENT" {
                    Text(step.instructions).font(.subheadline)
                    Text("Done when: \(step.gate)")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }
            Spacer()
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            step.status == "CURRENT" ? AnyShapeStyle(.background.secondary) : AnyShapeStyle(.clear),
            in: RoundedRectangle(cornerRadius: 10)
        )
    }

    private var icon: String {
        switch step.status {
        case "PASSED": return "checkmark.circle.fill"
        case "CURRENT": return "arrow.right.circle.fill"
        default: return "lock.circle"
        }
    }

    private var color: Color {
        switch step.status {
        case "PASSED": return .green
        case "CURRENT": return .accentColor
        default: return .secondary
        }
    }
}
