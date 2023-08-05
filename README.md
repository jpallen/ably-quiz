### Notes

- Clients aren't correctly leaving the presence set on exit
- There is only one quiz session per server instance, and the server needs restarting to reset the quiz
- If a client doesn't answer any questions they are not included in the scores
- There is no recovery logic if a client disconnects mid way through a quiz. They cannot reconnect
- All server state is in memory. If the server crashes, the state is lost
- Logging is just done via console.log, is not very consistent and also appears in tests
