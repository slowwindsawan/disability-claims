import { useState, useRef, useEffect } from 'react';
import { Upload, Play, Mic } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { useQuestionEngine } from '../../../lib/questionEngine'


export default function VoiceAgentScreen() {
  const { goToStep, voiceResponses, setVoiceResponses } = useOnboarding();
  const { getCurrent, getQueue, pointer, goToIndex, applyAnswer } = useQuestionEngine()
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [useTextInput, setUseTextInput] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceFiles, setVoiceFiles] = useState<Array<File | null>>(() => Array(getQueue().length).fill(null))
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null)
  const interimRef = useRef<string>('')
  const finalRef = useRef<string>('')
  const timerRef = useRef<number | null>(null)

  const elapsedLabel = (() => {
    const m = Math.floor(elapsedSeconds / 60)
    const s = elapsedSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  })()

  // Ensure voiceFiles array grows when engine queue expands
  useEffect(() => {
    const qlen = getQueue().length
    setVoiceFiles(prev => {
      if (prev.length >= qlen) return prev.slice(0, qlen)
      return [...prev, ...Array(qlen - prev.length).fill(null)]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getQueue().length])

  // feature-detect SpeechRecognition
  const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null

  useEffect(() => {
    return () => {
      // cleanup: stop any ongoing recognition or media recorder when unmounting
      try {
        if (recognitionRef.current) {
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
          recognitionRef.current.stop()
          recognitionRef.current = null
        }
      } catch (e) {}
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop()
      } catch (e) {}
      if (timerRef.current) {
        clearInterval(timerRef.current as any)
        timerRef.current = null
      }
    }
  }, [])

  // When the question changes, speak it and (if in voice mode) begin listening automatically.
  useEffect(() => {
    // when moving to a new question, prefill transcript if we have a saved response
    const idx = pointer()
    const existing = (voiceResponses && voiceResponses[idx]) || ''
    setTranscript(existing)
    interimRef.current = ''
    finalRef.current = ''

    // speak question if we're in voice mode and it's not a document-only question
    const currentQ = getCurrent()
    const isDocOnlyNow = currentQ?.docRequirement === 'document-only'
    if (!useTextInput && !isDocOnlyNow && currentQ) {
      speakQuestion(idx)
    } else if (!useTextInput && isDocOnlyNow && currentQ) {
      // still speak the question for document-only to instruct the user, but don't auto-start listening
      const text = currentQ.text
      try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)) } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointer(), voiceResponses])

  // compute how far the user is allowed to navigate: they can go back anywhere
  // and can go forward up to the first unanswered index (highestAnsweredIndex + 1)
    const highestAnsweredIndex = (() => {
      if (!voiceResponses || voiceResponses.length === 0) return -1
      let hi = -1
      for (let i = 0; i < voiceResponses.length; i++) {
        if (voiceResponses[i] && String(voiceResponses[i]).trim()) hi = i
      }
      return hi
    })()
    const maxAllowedIndex = Math.min(highestAnsweredIndex + 1, getQueue().length - 1)

    const goToQuestion = (index: number) => {
      const qlen = getQueue().length
      const clampedToBounds = Math.max(0, Math.min(index, qlen - 1))
      // Allow going back anywhere (index < current pointer)
      if (index < pointer()) {
        goToIndex(clampedToBounds)
        return
      }
      // Moving forward: do not allow past the max allowed index
      const target = Math.max(0, Math.min(index, maxAllowedIndex))
      goToIndex(target)
    }

  // Speak the given question index, then start listening automatically if voice mode is active
  const speakQuestion = (index: number) => {
    try {
      if (isListening) {
        // already listening - stop first
        stopListeningAndSetTranscript()
      }
      const text = getQueue()[index]?.text || ''
      const utter = new SpeechSynthesisUtterance(text)
      setIsPlayingAudio(true)
      utter.onend = () => {
        setIsPlayingAudio(false)
        // if user prefers typing, don't auto-listen; also don't auto-listen for document-only questions
        const q = getQueue()[index]
        const isDocOnlyNow = q?.docRequirement === 'document-only'
        if (!useTextInput && !isDocOnlyNow) {
          // start recognition/fallback
          startListening()
        }
      }
      speechSynthesis.cancel()
      speechSynthesis.speak(utter)
    } catch (err) {
      console.error('Speech synthesis failed', err)
    }
  }

  const startListening = async () => {
    // Start speech recognition if available, otherwise start media recorder fallback
    if (SpeechRecognition) {
      try {
        const recog = new SpeechRecognition()
        recog.lang = 'en-US'
        recog.interimResults = true
        recog.continuous = true
        recog.maxAlternatives = 1
        recognitionRef.current = recog

        recog.onstart = () => {
          setTranscript('')
          interimRef.current = ''
          finalRef.current = ''
          setIsListening(true)
          setElapsedSeconds(0)
          if (timerRef.current) { clearInterval(timerRef.current as any) }
          timerRef.current = window.setInterval(() => setElapsedSeconds(s => s + 1), 1000)
        }

        recog.onresult = (event: any) => {
          let interimAccum = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            try {
              const res = event.results[i]
              const text = res[0]?.transcript || ''
              if (res.isFinal) {
                finalRef.current = (finalRef.current ? finalRef.current + ' ' : '') + text
              } else {
                interimAccum += text
              }
            } catch (e) {}
          }
          interimRef.current = interimAccum
          setTranscript((finalRef.current + (interimAccum ? ' ' + interimAccum : '')).trim())
        }

        recog.onerror = (e: any) => {
          console.warn('SpeechRecognition error', e)
          setIsListening(false)
          try { recog.stop() } catch (err) {}
        }

        recog.onend = () => {
          setIsListening(false)
          const finalText = (finalRef.current + (interimRef.current ? ' ' + interimRef.current : '')).trim()
          if (finalText) setTranscript(finalText)
          recognitionRef.current = null
          if (timerRef.current) { clearInterval(timerRef.current as any); timerRef.current = null }
          // Auto-submit captured response if we have text
          setTimeout(() => { if (finalText) handleSubmitResponse() }, 250)
        }

        recog.start()
      } catch (err) {
        console.error('SpeechRecognition start failed', err)
      }
      return
    }

    // Fallback: MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.onstart = () => {
        setTranscript('')
        finalRef.current = ''
        interimRef.current = ''
        setIsRecording(true)
        setElapsedSeconds(0)
        if (timerRef.current) { clearInterval(timerRef.current as any) }
        timerRef.current = window.setInterval(() => setElapsedSeconds(s => s + 1), 1000)
      }

      mediaRecorder.onstop = () => {
        const simulatedText = `Response to: ${getCurrent()?.text || ''}`
        setTranscript(prev => (prev ? prev + ' ' + simulatedText : simulatedText))
        setIsRecording(false)
        if (timerRef.current) { clearInterval(timerRef.current as any); timerRef.current = null }
        stream.getTracks().forEach(track => track.stop())
        setTimeout(() => { handleSubmitResponse() }, 250)
      }

      mediaRecorder.start()
      // auto-stop after 10s
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop()
      }, 10000)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const stopListeningAndSetTranscript = () => {
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
        const finalText = (finalRef.current + (interimRef.current ? ' ' + interimRef.current : '')).trim()
        if (finalText) setTranscript(finalText)
        recognitionRef.current = null
      }
    } catch (e) {}
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop() } catch (e) {}
      }
    } catch (e) {}
    setIsListening(false)
    setIsRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current as any); timerRef.current = null }
  }

  const switchToTextInput = () => {
    // stop mic if active and transfer recorded text into textarea
    stopListeningAndSetTranscript()
    setUseTextInput(true)
  }

  const switchToVoice = () => {
    setUseTextInput(false)
    // speak current question and auto-listen
    speakQuestion(pointer())
  }

  const handleMicClick = async () => {
    // If this question is document-only, ignore mic interactions
    const isDocOnlyNow = getCurrent()?.docRequirement === 'document-only'
    if (isDocOnlyNow) return
    // toggle listening: if currently listening, stop and keep transcript; otherwise speak and then listen
    if (isListening || isRecording) {
      stopListeningAndSetTranscript()
      return
    }

    // if already playing audio, ignore
    if (isPlayingAudio) return

    // speak question which will auto-start listening on end
    speakQuestion(pointer())
  }

  const handleSubmitResponse = () => {
    const idx = pointer()
    const q = getQueue()[idx]
    const fileForQ = voiceFiles[idx]
    const hasText = !!transcript.trim()
    const hasFile = !!fileForQ

    // Determine requirement
    const req = q.docRequirement || 'none'
    let allowed = false
    if (req === 'document-only') allowed = hasFile
    else if (req === 'document-required') allowed = hasFile && hasText
    else if (req === 'document-optional') allowed = hasFile || hasText
    else allowed = hasText

    if (!allowed) return

    const newResponses = [...voiceResponses]
    newResponses[idx] = transcript
    setVoiceResponses(newResponses)
    // keep file state in voiceFiles; clear transcript for next question
    setTranscript('')

    const pointerBefore = idx
    applyAnswer(q.id, transcript)
    // If we were at the last question and engine didn't advance (no follow-ups), finish
    if (pointerBefore >= getQueue().length - 1) {
      goToStep('analysis')
    }
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    // Simulate audio playback
    const utterance = new SpeechSynthesisUtterance(getCurrent()?.text || '');
    speechSynthesis.speak(utterance);
    setTimeout(() => setIsPlayingAudio(false), 3000);
  };

  const currentQ = getCurrent()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    const arr = [...voiceFiles]
    arr[pointer()] = f
    setVoiceFiles(arr)
  }

  // compute whether the user can proceed from this question
  const fileForQ = voiceFiles[pointer()]
  const hasText = !!transcript.trim()
  const req = currentQ?.docRequirement || 'none'
  const canProceed = req === 'document-only' ? !!fileForQ : req === 'document-required' ? (!!fileForQ && hasText) : req === 'document-optional' ? (hasText || !!fileForQ) : hasText

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Voice assessment</h1>
          <p className="text-xs text-gray-600">Answer a few questions about your medical condition. You can speak or type.</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-700">
              Question {pointer() + 1} of {getQueue().length}
            </span>
              <span className="text-xs text-gray-600">
              {Math.round(((pointer() + 1) / getQueue().length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-orange-600 h-1.5 rounded-full transition-all"
              style={{ width: `${((pointer() + 1) / getQueue().length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          {/* Question */}
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-sm font-semibold text-gray-900">{currentQ?.text}</p>
            {currentQ.docRequirement === 'document-only' && (
              <p className="text-xs text-gray-600 mt-2">This question requires a document upload to proceed.</p>
            )}
            {currentQ.docRequirement === 'document-required' && (
              <p className="text-xs text-gray-600 mt-2">This question requires both a written/speech response and a document upload.</p>
            )}
            {currentQ.docRequirement === 'document-optional' && (
              <p className="text-xs text-gray-600 mt-2">You may optionally upload a supporting document for this question.</p>
            )}
          </div>

          {/* Microphone or Text Input */}
          {currentQ.docRequirement === 'document-only' ? (
            <div className="text-center mb-6">
              {/* Play Question Audio */}
              <button
                onClick={handlePlayAudio}
                className="mb-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition text-sm"
              >
                <Play size={16} />
                {isPlayingAudio ? 'Playing...' : 'Play question'}
              </button>
              <p className="text-sm text-gray-700">This question requires a document and the agent will not record or accept typed answers.</p>
            </div>
          ) : !useTextInput ? (
            <div className="text-center mb-6">
              {/* Play Question Audio */}
              <button
                onClick={handlePlayAudio}
                className="mb-6 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition text-sm"
              >
                <Play size={16} />
                {isPlayingAudio ? 'Playing...' : 'Play question'}
              </button>

              {/* Mic Button - fancy animated wave */}
              <div className="flex flex-col items-center">
                <button
                  onClick={handleMicClick}
                  className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 transition relative overflow-visible bg-transparent`}
                  aria-label={(isListening || isRecording) ? 'Stop listening' : 'Start listening'}
                >
                  {/* Show mic when idle; show rings+waveform only when active */}
                  {!isListening && !isRecording ? (
                    <span className={`mic-center absolute z-30 flex items-center justify-center`}>
                      <span className={`mic-bg rounded-full flex items-center justify-center w-16 h-16 shadow-lg`}></span>
                      <Mic size={28} className={`z-40 text-gray-700`} />
                    </span>
                  ) : (
                    <span className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                      <div className="relative flex items-center justify-center">
                        <div className="ring-wrap z-0 pointer-events-none" aria-hidden>
                          <span className="ring r1" />
                          <span className="ring r2" />
                          <span className="ring r3" />
                        </div>

                        {/* Waveform (above rings) */}
                        <svg className="waveform absolute z-20" width="280" height="80" viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          {[...Array(24)].map((_, i) => {
                            const x = 6 + i * 11
                            return (
                              <rect key={i} x={x} y={20} width={8} height={40} rx={0} className={`bar bar-${i}`} fill="#FF7A3C" />
                            )
                          })}
                        </svg>
                      </div>
                    </span>
                  )}
                </button>

                <p className="text-xs text-gray-600 mb-1">
                  {isListening ? `Listening • ${elapsedLabel}` : isRecording ? `Recording (fallback) • ${elapsedLabel}` : 'Click to speak your answer'}
                </p>
                <div className="h-1" />
                <style>{`
                  .ring-wrap { position: relative; width: 260px; height: 220px; display: flex; align-items: center; justify-content: center; }
                  .ring { position: absolute; border-radius: 50%; box-shadow: 0 8px 40px rgba(255,90,40,0.12); }
                  .ring.r1 { width: 110px; height: 110px; background: radial-gradient(circle at center, rgba(255,120,70,0.18), rgba(255,120,70,0.04)); animation: ringPulse 1400ms ease-out infinite; }
                  .ring.r2 { width: 180px; height: 180px; background: radial-gradient(circle at center, rgba(255,140,60,0.14), rgba(255,140,60,0.03)); animation: ringPulse 2000ms ease-out infinite; }
                  .ring.r3 { width: 240px; height: 240px; background: radial-gradient(circle at center, rgba(255,180,100,0.10), rgba(255,180,100,0.02)); animation: ringPulse 2600ms ease-out infinite; }
                  @keyframes ringPulse {
                    0% { transform: scale(0.6); opacity: 0.8; }
                    60% { transform: scale(1.05); opacity: 0.12; }
                    100% { transform: scale(1.25); opacity: 0; }
                  }
                  .waveform { transform: translateY(6px); }
                  .bar { transform-origin: center bottom; opacity: 1; }
                  @keyframes barWave {
                    0% { transform: scaleY(0.3); opacity: 0.8 }
                    50% { transform: scaleY(1.15); opacity: 1 }
                    100% { transform: scaleY(0.3); opacity: 0.8 }
                  }
                  ${[...Array(24)].map((_,i)=>`.bar-${i}{animation: barWave 900ms ease-in-out ${i*45}ms infinite;}`).join('\n')}

                  /* Mic center styling */
                  .mic-center { width: 100%; height: 100%; pointer-events: none; }
                  .mic-bg { background: rgba(255,255,255,0.96); }
                  .mic-bg.listening { background: linear-gradient(180deg,#FF7A3C,#FF9B5A); }
                  .mic-bg { transition: background 220ms ease; }
                `}</style>
              </div>

              {/* Transcript (transparent background, scrollable when tall) */}
              {transcript && (
                <div className="p-3 border border-blue-100 rounded-lg mb-4 max-h-[150px] overflow-auto">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Your response:</p>
                  <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">{transcript}</p>
                </div>
              )}

              {/* Switch to text input */}
              <button
                onClick={switchToTextInput}
                className="text-orange-600 hover:text-orange-700 text-xs font-medium transition"
              >
                Prefer to type your answer?
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20 text-sm"
              />
              <button
                onClick={switchToVoice}
                className="text-orange-600 hover:text-orange-700 text-xs font-medium transition mt-2"
              >
                Switch back to voice?
              </button>
            </div>
          )}

          {/* File Upload Option - show when question requires or allows documents */}
          {currentQ.docRequirement && currentQ.docRequirement !== 'none' && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium hover:text-gray-900 text-sm">
                <Upload size={16} />
                {currentQ.docRequirement === 'document-only' ? 'Upload required document' : 'Attach supporting document'}
                <input onChange={handleFileChange} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
              </label>
              {voiceFiles[pointer()] && (
                <p className="text-xs text-gray-600 mt-2">Selected: {voiceFiles[pointer()]?.name}</p>
              )}
              {currentQ.docRequirement === 'document-required' && (
                <p className="text-xs text-red-600 mt-2">Document required to proceed.</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => (pointer() > 0 ? goToQuestion(pointer() - 1) : goToStep('signup'))}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 transition text-sm"
          >
            {pointer() > 0 ? 'Previous' : 'Back'}
          </button>
          <button
            onClick={handleSubmitResponse}
            disabled={!canProceed}
            className={`flex-1 font-semibold py-2 px-3 rounded-lg transition text-sm ${
              canProceed
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {pointer() === getQueue().length - 1 ? 'Finish assessment' : 'Next question'}
          </button>
        </div>
      </div>
    </div>
  );
}
