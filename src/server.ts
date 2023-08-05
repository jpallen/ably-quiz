import express from 'express'
import dotenv from 'dotenv'
import * as Ably from 'ably/promises'

dotenv.config()

const app = express()

const ABLY_API_KEY = process.env.ABLY_API_KEY
if (!ABLY_API_KEY) {
  console.error('Please set ABLY_API_KEY environment variable')
  process.exit(1)
}

const ably = new Ably.Rest({ key: ABLY_API_KEY })

app.post('/client/token', async (req, res) => {
  const token = await ably.auth.requestToken({ clientId: 'foo' })
  console.log('Token requested')
  res.json(token)
})

const PORT = parseInt(process.env.PORT || '5000')
const HOST = process.env.HOST || 'localhost'
app.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`)
})

class Quiz {
  minClientCount = 1
  quizChannelName = 'quiz'
  answersChannelName = 'answers'
  state: 'waiting' | 'running' | 'finished' = 'waiting'
  quizChannel: Ably.Types.RealtimeChannelPromise
  answersChannel: Ably.Types.RealtimeChannelPromise
  questions = [
    {
      question: 'Question 1',
      options: ['Correct', 'Wrong', 'Incorrect'],
      answer: 0
    },
    {
      question: 'Question 2',
      options: ['Wrong', 'Correct', 'Incorrect'],
      answer: 1
    }
  ]

  clientAnswers: Array<{
    clientId: string
    questionId: number
    answer: number
  }> = []

  currentQuestionId = 0
  timePerQuestion = 2000 // ms

  constructor() {
    const realtime = new Ably.Realtime({ key: ABLY_API_KEY })

    this.quizChannel = realtime.channels.get(this.quizChannelName)
    this.quizChannel.presence.subscribe('enter', () => {
      console.log('Client connected')
      this.startQuizIfEnoughClients()
    })

    this.answersChannel = realtime.channels.get(this.answersChannelName)
    this.answersChannel.subscribe('answer', (message) => {
      this.onAnswer(message)
    })
  }

  async startQuizIfEnoughClients() {
    if (this.state !== 'waiting') return
    const presence = await this.quizChannel.presence.get()
    const clientCount = presence.length
    console.log(`${clientCount} clients connected`)
    if (clientCount >= this.minClientCount) {
      this.startQuiz()
    }
  }

  startQuiz() {
    if (this.state !== 'waiting') return
    console.log('Starting quiz')
    this.state = 'running'
    this.askNextQuestion()
  }

  askNextQuestion() {
    if (this.state !== 'running') return

    const question = this.questions[this.currentQuestionId]

    if (!question) {
      // We've run out of questions
      this.finishQuiz()
      return
    }

    console.log('Asking question', this.currentQuestionId)
    this.quizChannel.publish('question', {
      questionId: this.currentQuestionId,
      question: question.question,
      options: question.options
    })

    setTimeout(() => {
      this.currentQuestionId++
      this.askNextQuestion()
    }, this.timePerQuestion)
  }

  onAnswer(message: Ably.Types.Message) {
    const { questionId, answer } = message.data as {
      questionId: number
      answer: number
    } // TODO: validate message has expected format

    if (questionId !== this.currentQuestionId) {
      console.log('Client responded too slowly or out of turn, ignoring')
    }

    console.log(
      `Got answer for client ${message.clientId}: ${questionId}: ${answer}`
    )

    this.clientAnswers.push({
      clientId: message.clientId,
      questionId,
      answer
    })
  }

  finishQuiz() {
    if (this.state !== 'running') return
    console.log('Finishing quiz')
    this.scoreQuiz()
    this.state = 'finished'
  }

  scoreQuiz() {
    const scores: Record<string, number> = {}
    for (const { clientId, questionId, answer } of this.clientAnswers) {
      const question = this.questions[questionId]
      const correct = question?.answer === answer
      scores[clientId] ||= 0
      if (correct) {
        scores[clientId] += 1
      }
    }

    const leaderboard = Object.entries(scores).map(([clientId, score]) => ({
      clientId,
      score
    }))
    leaderboard.sort((a, b) => a.score - b.score).reverse()

    this.quizChannel.publish('leaderboard', leaderboard)
  }
}

const quiz = new Quiz()
