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
  channelName = 'quiz'
  state: 'waiting' | 'running' | 'finished' = 'waiting'
  channel: Ably.Types.RealtimeChannelPromise
  questions = [
    {
      question: 'Question 1',
      options: ['Correct', 'Wrong', 'Incorrect'],
      answerIndex: 0
    },
    {
      question: 'Question 2',
      options: ['Wrong', 'Correct', 'Incorrect'],
      answerIndex: 1
    }
  ]

  nextQuestionIndex = 0
  timePerQuestion = 5000 // ms

  constructor() {
    const realtime = new Ably.Realtime({ key: ABLY_API_KEY })
    this.channel = realtime.channels.get(this.channelName)
    this.channel.presence.subscribe('enter', () => {
      console.log('Client connected')
      this.startQuizIfEnoughClients()
    })
  }

  async startQuizIfEnoughClients() {
    if (this.state !== 'waiting') return
    const presence = await this.channel.presence.get()
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

    const currentQuestionIndex = this.nextQuestionIndex
    const question = this.questions[this.nextQuestionIndex]
    this.nextQuestionIndex++

    if (!question) {
      // We've run out of questions
      this.finishQuiz()
      return
    }

    console.log('Asking question', question)
    this.channel.publish('question', {
      questionId: currentQuestionIndex,
      question: question.question,
      options: question.options
    })

    setTimeout(() => {
      this.askNextQuestion()
    }, this.timePerQuestion)
  }

  finishQuiz() {
    if (this.state !== 'running') return
    console.log('finishing quiz')
    this.state = 'finished'
  }
}

const quiz = new Quiz()
