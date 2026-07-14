//
//  PraxoRealtimeTeacher.swift
//  Praxo
//
//  M1 spike: speech-to-speech teacher session over the OpenAI Realtime API
//  (WebSocket transport). Replaces clicky's AssemblyAI → Claude → ElevenLabs
//  chain with one connection. The ephemeral client secret is minted by the
//  Praxo backend so no long-lived API key ships in the app.
//
//  Tool calls the model makes mid-conversation:
//    look_at_screen             → executed here via CompanionScreenCapture
//    point_at(x, y, label)      → posted as .praxoPointAt for the cursor overlay
//    kb_search / complete_step / flag_stuck → relayed to the Praxo backend
//

import AVFoundation
import Foundation

extension Notification.Name {
    /// userInfo: ["x": Double 0-1, "y": Double 0-1, "label": String]
    static let praxoPointAt = Notification.Name("PraxoPointAt")
    static let praxoStepPassed = Notification.Name("PraxoStepPassed")
}

@MainActor
final class PraxoRealtimeTeacher: NSObject, ObservableObject {
    enum State: Equatable {
        case idle, connecting, live, ended(String?)
    }

    @Published private(set) var state: State = .idle
    @Published private(set) var currentStep: PraxoStep?

    private let plan: PraxoPlan
    private var socket: URLSessionWebSocketTask?
    private let audioEngine = AVAudioEngine()
    private var playerNode = AVAudioPlayerNode()

    /// Realtime audio format: 24 kHz mono PCM16.
    private let sampleRate: Double = 24_000

    init(plan: PraxoPlan) {
        self.plan = plan
        self.currentStep = plan.steps.first { $0.status == "CURRENT" }
    }

    // MARK: - Session lifecycle

    func start() async {
        guard state == .idle || state != .live else { return }
        state = .connecting
        do {
            let token = try await PraxoAPIClient.shared.mintRealtimeToken(planId: plan.id)
            if let step = token.currentStep { currentStep = step }
            try connectSocket(clientSecret: token.clientSecret)
            try startMicrophone()
            state = .live
        } catch {
            state = .ended(error.localizedDescription)
        }
    }

    func stop() {
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()
        socket?.cancel(with: .normalClosure, reason: nil)
        socket = nil
        if case .ended = state {} else { state = .ended(nil) }
    }

    private func connectSocket(clientSecret: String) throws {
        var request = URLRequest(url: URL(string: "wss://api.openai.com/v1/realtime")!)
        request.setValue("Bearer \(clientSecret)", forHTTPHeaderField: "Authorization")

        let task = URLSession.shared.webSocketTask(with: request)
        socket = task
        task.resume()
        receiveLoop()
    }

    // MARK: - Audio out (model speech)

    private func startMicrophone() throws {
        let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: true
        )!

        audioEngine.attach(playerNode)
        audioEngine.connect(playerNode, to: audioEngine.mainMixerNode,
                            format: AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1))

        let input = audioEngine.inputNode
        let inputFormat = input.inputFormat(forBus: 0)
        let converter = AVAudioConverter(from: inputFormat, to: format)!

        input.installTap(onBus: 0, bufferSize: 2048, format: inputFormat) { [weak self] buffer, _ in
            guard let self else { return }
            let ratio = format.sampleRate / inputFormat.sampleRate
            let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
            guard let converted = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return }
            var error: NSError?
            var consumed = false
            converter.convert(to: converted, error: &error) { _, status in
                if consumed {
                    status.pointee = .noDataNow
                    return nil
                }
                consumed = true
                status.pointee = .haveData
                return buffer
            }
            guard error == nil, let channel = converted.int16ChannelData else { return }
            let data = Data(bytes: channel[0], count: Int(converted.frameLength) * 2)
            Task { @MainActor in
                self.send(event: [
                    "type": "input_audio_buffer.append",
                    "audio": data.base64EncodedString(),
                ])
            }
        }

        audioEngine.prepare()
        try audioEngine.start()
        playerNode.play()
    }

    private func playAudioChunk(base64: String) {
        guard let data = Data(base64Encoded: base64) else { return }
        let frameCount = AVAudioFrameCount(data.count / 2)
        let outFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        guard let buffer = AVAudioPCMBuffer(pcmFormat: outFormat, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount
        data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            let samples = raw.bindMemory(to: Int16.self)
            let channel = buffer.floatChannelData![0]
            for i in 0..<Int(frameCount) {
                channel[i] = Float(samples[i]) / Float(Int16.max)
            }
        }
        playerNode.scheduleBuffer(buffer)
    }

    // MARK: - Event loop

    private func receiveLoop() {
        socket?.receive { [weak self] result in
            guard let self else { return }
            Task { @MainActor in
                switch result {
                case .failure(let error):
                    self.state = .ended(error.localizedDescription)
                case .success(let message):
                    if case .string(let text) = message,
                       let json = try? JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any] {
                        await self.handle(event: json)
                    }
                    self.receiveLoop()
                }
            }
        }
    }

    private func send(event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event),
              let text = String(data: data, encoding: .utf8) else { return }
        socket?.send(.string(text)) { error in
            if let error { print("⚠️ Praxo realtime send failed: \(error)") }
        }
    }

    private func handle(event: [String: Any]) async {
        switch event["type"] as? String {
        case "response.output_audio.delta", "response.audio.delta":
            if let delta = event["delta"] as? String { playAudioChunk(base64: delta) }

        case "response.function_call_arguments.done":
            let name = event["name"] as? String ?? ""
            let callId = event["call_id"] as? String ?? ""
            let args = (event["arguments"] as? String)
                .flatMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) as? [String: Any] } ?? [:]
            await dispatchTool(name: name, callId: callId, args: args)

        case "error":
            print("⚠️ Praxo realtime error event: \(event)")

        default:
            break
        }
    }

    // MARK: - Tool dispatch

    private func dispatchTool(name: String, callId: String, args: [String: Any]) async {
        var output = "ok"
        var followUpImage: Data?

        do {
            switch name {
            case "look_at_screen":
                let captures = try await CompanionScreenCaptureUtility.captureAllScreensAsJPEG()
                followUpImage = (captures.first { $0.isCursorScreen } ?? captures.first)?.imageData
                output = "Screenshot attached (\(captures.count) screen(s))."

            case "point_at":
                let x = args["x"] as? Double ?? 0.5
                let y = args["y"] as? Double ?? 0.5
                let label = args["label"] as? String ?? ""
                NotificationCenter.default.post(
                    name: .praxoPointAt, object: nil,
                    userInfo: ["x": x, "y": y, "label": label]
                )
                output = "Pointing at \(label)."

            case "kb_search":
                let query = args["query"] as? String ?? ""
                let hits = try await PraxoAPIClient.shared.searchKb(planId: plan.id, query: query)
                output = hits.map { "## \($0.title)\n\($0.content)" }.joined(separator: "\n\n")
                if output.isEmpty { output = "No knowledge base results." }

            case "complete_step":
                let stepId = args["step_id"] as? String ?? currentStep?.id ?? ""
                let evidence = args["evidence"] as? String ?? ""
                let result = try await PraxoAPIClient.shared.completeStep(stepId: stepId, evidence: evidence)
                currentStep = nil
                NotificationCenter.default.post(name: .praxoStepPassed, object: nil)
                output = result.planCompleted == true
                    ? "Step passed. That was the final step — the course is COMPLETE. Congratulate the learner."
                    : "Step passed. Next step unlocked (id \(result.nextStepId ?? "?")). Introduce it briefly."

            case "flag_stuck":
                let stepId = args["step_id"] as? String ?? currentStep?.id ?? ""
                let reason = args["reason"] as? String ?? ""
                try await PraxoAPIClient.shared.flagStuck(stepId: stepId, reason: reason)
                output = "Noted. Try a different approach with the learner."

            default:
                output = "Unknown tool \(name)."
            }
        } catch {
            output = "Tool failed: \(error.localizedDescription)"
        }

        send(event: [
            "type": "conversation.item.create",
            "item": [
                "type": "function_call_output",
                "call_id": callId,
                "output": output,
            ],
        ])

        // Screenshots ride along as a user message the model sees next turn.
        if let imageData = followUpImage {
            send(event: [
                "type": "conversation.item.create",
                "item": [
                    "type": "message",
                    "role": "user",
                    "content": [[
                        "type": "input_image",
                        "image_url": "data:image/jpeg;base64,\(imageData.base64EncodedString())",
                    ]],
                ],
            ])
        }

        send(event: ["type": "response.create"])
    }
}
