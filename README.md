# Ably Realtime Quiz

This repo implements a realtime quiz app with a central server and clients that connect to join the quiz.

Communication between server and client happens primarly using Ably channels. There are two channels used:
* `quiz` - Used to broadcast the questions and results to all clients. Clients can only subscribe to this channel.
* `answers` - Used by clients to respond with their answers. Clients can only publish to this channel, so cannot see other client's answers

## Installation

You will need Node installed, and then run:

```bash
$ npm install
```

## Set up

You will need an Ably API key with the `subscribe`, `publish` and `presence` capabilities.

You can expose your API key to the server with the `ABLY_API_KEY` environment variable, or by putting it in a `.env` file in the root directory:

```
# ./.env
ABLY_API_KEY=...
```

## Running the server

You can run the server with:

```sh
$ npm run server
```

Note that the server currently only support one quiz and session. You will need to restart the server to restart the quiz.

## Running a client

Clients are simple CLIs. You can run a client to connect to the server and quiz with:

```sh
$ npm run client
```

## Tests

There is the beginning of a simple test suite which you can run with:

```sh
$ npm run test
```

## Notes / Limitations

- Clients don't correctly leaving the presence set on exit
- There is only one quiz session per server instance, and the server needs restarting to reset the quiz
- If a client doesn't answer any questions they are not included in the scores
- There is no recovery logic if a client disconnects mid way through a quiz. They cannot reconnect
- All server state is in memory. If the server crashes, the state is lost
- Logging is just done via console.log, is not very consistent and also appears in tests
