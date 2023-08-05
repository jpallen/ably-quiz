import dotenv from 'dotenv'
import * as Ably from 'ably/promises'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

dotenv.config()

const PORT = parseInt(process.env.PORT || '5000')
const HOST = process.env.HOST || 'localhost'

const main = async () => {
  const rl = readline.createInterface({ input, output })
  const name = await rl.question('What is your name?: ')
  rl.close()

  const realtime = new Ably.Realtime({
    authUrl: `http://${HOST}:${PORT}/client/token?name=${encodeURIComponent(
      name
    )}`,
    authMethod: 'POST'
  })
  const quizChannel = realtime.channels.get('quiz')
  const answerChannel = realtime.channels.get('answers')

  console.log(`Hi ${name}!`)
  console.log('Waiting for enough players...')

  let abortPreviousQuestion: null | (() => void) = null

  quizChannel.subscribe('question', async (message) => {
    if (abortPreviousQuestion) {
      abortPreviousQuestion()
    }

    const data = message.data as {
      questionId: number
      question: string
      options: string[]
    } // TODO: Validate message data is in expected format
    console.log()
    console.log(data.question)

    for (const [index, option] of data.options.entries()) {
      console.log(`${index}. ${option}`)
    }

    const rl = readline.createInterface({ input, output })

    abortPreviousQuestion = () => {
      console.log('Too slow!')
      rl.close()
    }
    const answerRaw = await rl.question('Your answer: ')
    abortPreviousQuestion = null
    rl.close()

    const answer = parseInt(answerRaw)

    answerChannel.publish('answer', {
      questionId: data.questionId,
      answer
    })
  })

  quizChannel.subscribe('leaderboard', (message) => {
    if (abortPreviousQuestion) {
      abortPreviousQuestion()
    }
    console.log()
    console.log('Results')
    console.table(message.data, ['name', 'score'])
    process.exit(0)
  })

  await quizChannel.presence.enter()
  process.on('exit', () => quizChannel.presence.leave())
}

main()
