const socket   = io.connect('https://integration-test-rubio.herokuapp.com/')
const messages = []

socket.on('chat', function(data) {
  receiveChat(data)
}) 

socket.on('typing', function(data) {

})

function receiveChat(data) {
  console.log(data)
}