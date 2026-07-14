'use client'

// The live voice-teacher panel: connects to OpenAI Realtime via WebRTC,
// executes the teacher's tools (screen capture, pointing, KB search, step
// gates), and shows captions + the shared-screen frame with a pointer.

import { useCallback, useEffect, useRef, useState } from 'react'
import { PraxoRealtimeSession, ToolResult } from '../_lib/realtime'
import { praxoFetch, WebPlan } from '../_lib/types'

interface Props {
  plan: WebPlan
  onStepPassed: () => void
}

type Status = 'idle' | 'connecting' | 'live' | 'ended'

export default function TeacherSession({ plan, onStepPassed }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [caption, setCaption] = useState('')
  const [sharing, setSharing] = useState(false)
  const [frame, setFrame] = useState<string | null>(null)
  const [marker, setMarker] = useState<{ x: number; y: number; label: string } | null>(null)

  const sessionRef = useRef<PraxoRealtimeSession | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captionRef = useRef('')

  // --- screen share -------------------------------------------------------

  const startSharing = useCallback(async (): Promise<boolean> => {
    if (displayStreamRef.current?.active) return true
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      })
      displayStreamRef.current = stream
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()
      videoRef.current = video
      stream.getVideoTracks()[0].addEventListener('ended', () => setSharing(false))
      setSharing(true)
      return true
    } catch {
      setSharing(false)
      return false
    }
  }, [])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || !displayStreamRef.current?.active) return null
    const maxWidth = 1280
    const scale = Math.min(1, maxWidth / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setFrame(dataUrl)
    return dataUrl
  }, [])

  // --- the teacher's tools ------------------------------------------------

  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
      switch (name) {
        case 'look_at_screen': {
          const ok = await startSharing()
          if (!ok) {
            return {
              output:
                'The learner declined screen sharing. Ask them to click "Share screen" in the Praxo panel, or to describe what they see.',
            }
          }
          const dataUrl = captureFrame()
          if (!dataUrl) return { output: 'Screen capture failed — ask the learner to re-share.' }
          setMarker(null)
          return { output: 'Screenshot of the shared screen attached.', imageDataUrl: dataUrl }
        }

        case 'point_at': {
          const x = Math.min(1, Math.max(0, Number(args.x ?? 0.5)))
          const y = Math.min(1, Math.max(0, Number(args.y ?? 0.5)))
          const label = String(args.label ?? '')
          if (!frame) captureFrame()
          setMarker({ x, y, label })
          return {
            output: `Pointer shown on the learner's Praxo panel at "${label}". Tell them to look at the highlighted spot in the panel.`,
          }
        }

        case 'kb_search': {
          const { hits } = await praxoFetch<{ hits: { title: string; content: string }[] }>(
            '/api/praxo/kb/search',
            { method: 'POST', body: JSON.stringify({ planId: plan.id, query: String(args.query ?? '') }) }
          )
          return {
            output: hits.length
              ? hits.map((h) => `## ${h.title}\n${h.content}`).join('\n\n')
              : 'No knowledge base results.',
          }
        }

        case 'complete_step': {
          const currentId = plan.steps.find((s) => s.status === 'CURRENT')?.id
          const stepId = String(args.step_id || currentId || '')
          const result = await praxoFetch<{ nextStepId: string | null; planCompleted: boolean }>(
            `/api/praxo/steps/${stepId}`,
            { method: 'POST', body: JSON.stringify({ action: 'complete', evidence: String(args.evidence ?? '') }) }
          )
          onStepPassed()
          return {
            output: result.planCompleted
              ? 'Step passed. That was the final step — the course is COMPLETE. Congratulate the learner!'
              : 'Step passed. The next step is unlocked — introduce it briefly.',
          }
        }

        case 'flag_stuck': {
          const currentId = plan.steps.find((s) => s.status === 'CURRENT')?.id
          const stepId = String(args.step_id || currentId || '')
          await praxoFetch(`/api/praxo/steps/${stepId}`, {
            method: 'POST',
            body: JSON.stringify({ action: 'flag_stuck', reason: String(args.reason ?? '') }),
          })
          return { output: 'Noted. Try a different approach with the learner.' }
        }

        default:
          return { output: `Unknown tool: ${name}` }
      }
    },
    [plan, frame, startSharing, captureFrame, onStepPassed]
  )

  // --- session lifecycle ----------------------------------------------------

  const start = useCallback(async () => {
    setError(null)
    setStatus('connecting')
    try {
      const token = await praxoFetch<{ clientSecret: string; model: string; sessionId: string }>(
        '/api/praxo/realtime/token',
        { method: 'POST', body: JSON.stringify({ planId: plan.id }) }
      )
      sessionIdRef.current = token.sessionId

      const session = new PraxoRealtimeSession({
        onStatus: (s, detail) => {
          setStatus(s === 'connecting' ? 'connecting' : s === 'live' ? 'live' : 'ended')
          if (detail) setError(detail)
        },
        onToolCall: handleToolCall,
        onCaption: (delta, done) => {
          if (done) {
            captionRef.current = ''
          } else {
            captionRef.current += delta
            setCaption(captionRef.current)
          }
        },
      })
      sessionRef.current = session
      await session.connect(token.clientSecret, token.model)
    } catch (e) {
      setStatus('ended')
      setError(e instanceof Error ? e.message : 'Could not start the session.')
    }
  }, [plan.id, handleToolCall])

  const endSession = useCallback(() => {
    sessionRef.current?.close()
    sessionRef.current = null
    displayStreamRef.current?.getTracks().forEach((t) => t.stop())
    displayStreamRef.current = null
    setSharing(false)
    if (sessionIdRef.current) {
      navigator.sendBeacon(`/api/praxo/sessions/${sessionIdRef.current}/end`, '{}')
      sessionIdRef.current = null
    }
  }, [])

  useEffect(() => {
    const onUnload = () => endSession()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      endSession()
    }
  }, [endSession])

  // --- UI -------------------------------------------------------------------

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${
              status === 'live' ? 'animate-pulse bg-green-400' : status === 'connecting' ? 'bg-yellow-400' : 'bg-slate-600'
            }`}
          />
          <span className="font-semibold text-white">
            {status === 'live' ? 'Teacher is listening' : status === 'connecting' ? 'Connecting…' : 'Voice teacher'}
          </span>
        </div>
        <div className="flex gap-2">
          {status === 'live' && (
            <>
              <button
                onClick={() => {
                  sessionRef.current?.setMuted(!muted)
                  setMuted(!muted)
                }}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
              >
                {muted ? '🔇 Unmute' : '🎙️ Mute'}
              </button>
              {!sharing && (
                <button
                  onClick={() => void startSharing()}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
                >
                  🖥️ Share screen
                </button>
              )}
              <button
                onClick={() => {
                  endSession()
                  setStatus('ended')
                }}
                className="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm text-white hover:bg-red-600"
              >
                End session
              </button>
            </>
          )}
          {(status === 'idle' || status === 'ended') && (
            <button
              onClick={() => void start()}
              className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              ▶ Start session
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {status === 'live' && (
        <p className="mt-3 min-h-5 text-sm italic text-slate-300">{caption || '…'}</p>
      )}

      {frame && (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frame} alt="Your shared screen" className="w-full" />
          {marker && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
            >
              <div className="h-6 w-6 animate-ping rounded-full bg-indigo-400/60" />
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500" />
              <span className="absolute left-5 top-4 whitespace-nowrap rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                {marker.label}
              </span>
            </div>
          )}
        </div>
      )}

      {status === 'live' && !sharing && (
        <p className="mt-3 text-xs text-slate-400">
          Tip: click “Share screen” so your teacher can see what you’re working on and check your steps.
        </p>
      )}
    </div>
  )
}
