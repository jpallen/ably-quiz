import dotenv from 'dotenv'
import * as Ably from 'ably/promises'

dotenv.config()

const PORT = parseInt(process.env.PORT || '5000')
const HOST = process.env.HOST || 'localhost'

const main = async () => {
  const realtime = new Ably.Realtime({
    authUrl: `http://${HOST}:${PORT}/client/token`,
    authMethod: 'POST'
  })
  const channel = realtime.channels.get('quiz')
  await channel.presence.enter()
}

main()
