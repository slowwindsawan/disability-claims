import { QUESTION_CATALOG, START_SEQUENCE } from './questionCatalog'

type Answers = Record<string, any>

export class QuestionEngine {
  questions: any[]
  qById: Record<string, any>
  queue: string[]
  answers: Answers
  pointer: number

  constructor(startIds: string[] = START_SEQUENCE) {
    this.qById = QUESTION_CATALOG
    this.queue = [...startIds]
    this.questions = this.queue.map(id => this.qById[id]).filter(Boolean)
    this.answers = {}
    this.pointer = 0
  }

  getQueue() {
    return this.queue.map(id => this.qById[id])
  }

  getCurrentQuestion() {
    const id = this.queue[this.pointer]
    return id ? this.qById[id] : null
  }

  goToIndex(i: number) {
    if (i < 0) i = 0
    if (i >= this.queue.length) i = this.queue.length - 1
    this.pointer = i
    return this.getCurrentQuestion()
  }

  applyAnswer(questionId: string, value: any) {
    this.answers[questionId] = value
    // Evaluate simple follow-ups: if a question maps to required doc question (example rule)
    // Example rule: if mechanism == 'chemical' add C2_documents_proof
    if (questionId === 'B3_mechanism' && String(value).toLowerCase() === 'chemical') {
      this._ensureQueued('C2_documents_proof')
    }
    // If user indicates hospitalisation via description text, add a doc request (simplified)
    if (questionId === 'B2_description' && typeof value === 'string' && /hospital|er|admit|discharge/i.test(value)) {
      this._ensureQueued('C2_documents_proof')
    }
    // move pointer to next unanswered
    const next = this._findNextIndex(this.pointer + 1)
    if (next !== -1) this.pointer = next
    return this.getCurrentQuestion()
  }

  _ensureQueued(qid: string) {
    if (!this.qById[qid]) return
    if (!this.queue.includes(qid)) {
      this.queue.push(qid)
      this.questions = this.queue.map(id => this.qById[id])
    }
  }

  _findNextIndex(from: number) {
    for (let i = from; i < this.queue.length; i++) {
      const id = this.queue[i]
      // skip if answered and required? we allow revisit
      return i
    }
    return -1
  }
}

// React hook wrapper (lightweight) to use the engine inside components
import { useRef, useState } from 'react'

export function useQuestionEngine() {
  const ref = useRef<QuestionEngine | null>(null)
  if (!ref.current) ref.current = new QuestionEngine()
  const engine = ref.current
  const [, setTick] = useState(0)

  const refresh = () => setTick(t => t + 1)

  return {
    engine,
    getCurrent: () => engine.getCurrentQuestion(),
    getQueue: () => engine.getQueue(),
    pointer: () => engine.pointer,
    answers: engine.answers,
    goToIndex: (i: number) => { engine.goToIndex(i); refresh() },
    applyAnswer: (qid: string, value: any) => { engine.applyAnswer(qid, value); refresh() },
    ensureQueued: (qid: string) => { engine._ensureQueued(qid); refresh() }
  }
}

export default { QuestionEngine, useQuestionEngine }
