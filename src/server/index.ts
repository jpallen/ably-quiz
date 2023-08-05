import express from 'express'
import dotenv from 'dotenv'
import * as Ably from 'ably/promises'
import * as uuid from 'uuid'
import { Quiz } from './quiz'

dotenv.config()

const app = express()

const ABLY_API_KEY = process.env.ABLY_API_KEY
if (!ABLY_API_KEY) {
  console.error('Please set ABLY_API_KEY environment variable')
  process.exit(1)
}
const PORT = parseInt(process.env.PORT || '5000')
const HOST = process.env.HOST || 'localhost'
const QUIZ_CHANNEL_NAME = 'quiz'
const ANSWERS_CHANNEL_NAME = 'answers'

const ably = new Ably.Rest({ key: ABLY_API_KEY })

const clientIdsToNames: Record<string, string> = {}

app.post('/client/token', async (req, res) => {
  // Note that without any other auth mechanism, if a client's token expires it
  // will be considered a new client when it refreshes. Tokens are valid for an hour
  // which should be long enough for a quiz.
  const clientId = uuid.v4()
  clientIdsToNames[clientId] = String(req.query.name || 'Anonymous')
  const token = await ably.auth.requestToken({
    clientId,
    capability: {
      // Only the server can publish to the quiz channel
      [QUIZ_CHANNEL_NAME]: ['subscribe', 'presence'],
      // Clients can only publish to the answers channel so they can't see other client's answers
      [ANSWERS_CHANNEL_NAME]: ['publish']
    }
  })
  console.log('Token requested')
  res.json(token)
})

app.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`)
})

const realtime = new Ably.Realtime({ key: ABLY_API_KEY })

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const quiz = new Quiz({
  realtime,
  quizChannelName: QUIZ_CHANNEL_NAME,
  answersChannelName: ANSWERS_CHANNEL_NAME,
  clientIdsToNames,
  minPlayerCount: 2,
  timePerQuestion: 5000,
  questions: [
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
})
