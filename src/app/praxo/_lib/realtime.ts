// Browser client for the OpenAI Realtime API over WebRTC.
//
// The backend mints an ephemeral client secret (with the teacher's
// instructions and tools baked in server-side); this class owns the peer
// connection, mic, model audio playback, and the tool-call loop. Tool
// execution lives in the caller via `onToolCall`.

export type ToolResult = {
  output: string
  // Optional screenshot to attach to the conversation after the tool output.
  imageDataUrl?: string
}

export interface RealtimeCallbacks {
  onStatus: (status: 'connecting' | 'live' | 'ended', detail?: string) => void
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<ToolResult>
  onCaption: (delta: string, done: boolean) => void
}

export class PraxoRealtimeSession {
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private mic: MediaStream | null = null
  private audioEl: HTMLAudioElement | null = null
  private handledCalls = new Set<string>()

  constructor(private callbacks: RealtimeCallbacks) {}

  async connect(clientSecret: string, model: string): Promise<void> {
    this.callbacks.onStatus('connecting')

    const pc = new RTCPeerConnection()
    this.pc = pc

    // Model speech playback
    const audioEl = document.createElement('audio')
    audioEl.autoplay = true
    this.audioEl = audioEl
    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0]
    }

    // Learner microphone
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mic = mic
    for (const track of mic.getTracks()) pc.addTrack(track, mic)

    // Events flow over the data channel
    const dc = pc.createDataChannel('oai-events')
    this.dc = dc
    dc.onmessage = (e) => {
      try {
        void this.handleEvent(JSON.parse(e.data))
      } catch {
        // non-JSON frames are ignored
      }
    }
    dc.onopen = () => this.callbacks.onStatus('live')

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.callbacks.onStatus('ended', 'Connection lost')
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const res = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
      body: offer.sdp,
    })
    if (!res.ok) {
      this.close()
      throw new Error(`Voice connection failed (${res.status}): ${await res.text()}`)
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
  }

  setMuted(muted: boolean) {
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !muted))
  }

  close() {
    this.dc?.close()
    this.pc?.close()
    this.mic?.getTracks().forEach((t) => t.stop())
    if (this.audioEl) this.audioEl.srcObject = null
    this.pc = null
    this.dc = null
    this.mic = null
    this.callbacks.onStatus('ended')
  }

  private send(event: Record<string, unknown>) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(event))
  }

  /** Attach a screenshot to the conversation as a user message. */
  sendImage(dataUrl: string) {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_image', image_url: dataUrl }],
      },
    })
  }

  private async handleEvent(event: Record<string, unknown> & { type?: string }) {
    switch (event.type) {
      // Live captions of the teacher's speech
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        this.callbacks.onCaption(String(event.delta ?? ''), false)
        break
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        this.callbacks.onCaption('', true)
        break

      // Streaming tool-call path
      case 'response.function_call_arguments.done': {
        const callId = String(event.call_id ?? '')
        const name = String(event.name ?? '')
        await this.dispatchTool(callId, name, String(event.arguments ?? '{}'))
        break
      }

      // Fallback: some tool calls only surface in the finished response
      case 'response.done': {
        const response = event.response as { output?: { type: string; call_id: string; name: string; arguments: string }[] }
        for (const item of response?.output ?? []) {
          if (item.type === 'function_call') {
            await this.dispatchTool(item.call_id, item.name, item.arguments)
          }
        }
        break
      }

      case 'error':
        console.error('Praxo realtime error:', event)
        break
    }
  }

  private async dispatchTool(callId: string, name: string, rawArgs: string) {
    if (!callId || this.handledCalls.has(callId)) return
    this.handledCalls.add(callId)

    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(rawArgs)
    } catch {
      // tolerate malformed arguments; the tool sees an empty object
    }

    let result: ToolResult
    try {
      result = await this.callbacks.onToolCall(name, args)
    } catch (error) {
      result = { output: `Tool failed: ${error instanceof Error ? error.message : String(error)}` }
    }

    this.send({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output: result.output },
    })
    if (result.imageDataUrl) this.sendImage(result.imageDataUrl)
    this.send({ type: 'response.create' })
  }
}
