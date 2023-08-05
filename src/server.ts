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
  console.log('Token requested', token)
  res.json(token)
})

const PORT = parseInt(process.env.PORT || '5000')
const HOST = process.env.HOST || 'localhost'
app.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`)
})

const realtime = new Ably.Realtime({ key: ABLY_API_KEY })
const channel = realtime.channels.get('quiz')
channel.presence.subscribe('enter', (member) => {
  console.log(member)
})
