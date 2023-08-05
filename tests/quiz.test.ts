import { Quiz } from '../src/server/quiz'
import * as Ably from 'ably/promises'
import { expect, jest, describe, it } from '@jest/globals'

describe('Quiz', () => {
  it('should not start until there are enough players', async () => {
    const presenceSet: string[] = []

    const quiz = new Quiz({
      // TODO: This is bit of an ugly mock. Might consider creating
      // a cleaner abstraction layer that is easier to mock, but that would
      // be overkill for now.
      realtime: {
        channels: {
          get: jest.fn(() => {
            return {
              publish: jest.fn(),
              subscribe: jest.fn(),
              presence: {
                subscribe: jest.fn(),
                get: jest.fn(() => presenceSet)
              }
            }
          })
        }
      } as unknown as Ably.Realtime,
      quizChannelName: 'quiz',
      answersChannelName: 'answers',
      clientIdsToNames: {},
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

    await quiz.startQuizIfEnoughPlayers()
    expect(quiz.state).toBe('waiting')

    presenceSet.push('Alice')
    await quiz.startQuizIfEnoughPlayers()
    expect(quiz.state).toBe('waiting')

    presenceSet.push('Bob')
    await quiz.startQuizIfEnoughPlayers()
    expect(quiz.state).toBe('running')

    clearTimeout(quiz.nextQuestionTimeout)
  })
})
