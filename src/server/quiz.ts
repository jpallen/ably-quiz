import * as Ably from 'ably/promises'

type QuizOptions = {
  realtime: Ably.Realtime
  quizChannelName: string
  answersChannelName: string
  clientIdsToNames: Record<string, string>
}

export class Quiz {
  // Quizes start in the 'waiting' state until there are at least
  // minPlayerCount clients in the channel's presence set.
  // It then transitions to the 'running' state, where it sends a question
  // to the clients every timePerQuestion ms.
  // Once all questions are sent, the quiz sends the scores to the clients
  // and transitions to the 'finished' state
  state: 'waiting' | 'running' | 'finished' = 'waiting'
  minPlayerCount = 2
  timePerQuestion = 5000 // ms
  clientIdsToNames: Record<string, string>
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

  constructor({
    realtime,
    quizChannelName,
    answersChannelName,
    clientIdsToNames
  }: QuizOptions) {
    this.clientIdsToNames = clientIdsToNames
    this.quizChannel = realtime.channels.get(quizChannelName)
    this.quizChannel.presence.subscribe('enter', () => {
      console.log('Player connected')
      this.startQuizIfEnoughPlayers()
    })

    this.answersChannel = realtime.channels.get(answersChannelName)
    this.answersChannel.subscribe('answer', (message) => {
      this.onAnswer(message)
    })
  }

  private async startQuizIfEnoughPlayers() {
    if (this.state !== 'waiting') return
    const presence = await this.quizChannel.presence.get()
    const playerCount = presence.length
    console.log(`${playerCount} players connected`)
    if (playerCount >= this.minPlayerCount) {
      this.startQuiz()
    }
  }

  private startQuiz() {
    if (this.state !== 'waiting') return
    console.log('Starting quiz')
    this.state = 'running'
    this.askNextQuestion()
  }

  private askNextQuestion() {
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

  private onAnswer(message: Ably.Types.Message) {
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

  private finishQuiz() {
    if (this.state !== 'running') return
    console.log('Finishing quiz')
    this.scoreQuiz()
    this.state = 'finished'
  }

  private scoreQuiz() {
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
      score,
      name: this.clientIdsToNames[clientId]
    }))
    leaderboard.sort((a, b) => a.score - b.score).reverse()

    this.quizChannel.publish('leaderboard', leaderboard)
  }
}
