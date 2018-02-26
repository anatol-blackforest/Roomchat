const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname, '../public');
const socketIo = require('socket.io');
const http = require('http');
var server = http.createServer(app);
const io = socketIo(server);
const Message = require('./utils/message');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');
app.use(express.static(publicPath));
var users = new Users();

io.on('connection', (socket) => {
    console.log('новое соединение ');

    socket.on('join', (params, callback) => {

        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('заполните поля.')
        }

        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUsersList', users.getUserList(params.room));

        socket.emit('newMessage', Message.generateMessage('Админ', `добро пожаловать в чат ${params.name}`));
        console.log(params.room);
        socket.broadcast.to(params.room).emit('newMessage', Message.generateMessage('Админ', `${params.name} вошел`));
        callback();

    });




    socket.on('disconnect', () => {

        var user = users.removeUser(socket.id);
        console.log('A User left the chat');
        if (user) {
            io.to(user.room).emit('updateUserList', users);
            io.to(user.room).emit('newMessage', Message.generateMessage('Админ', `${user.name} покинул чат`));

        }

    });

    socket.on('createMessage', (data, callback) => {
        var user = users.getUser(socket.id);

        try {
            if (user && isRealString(data.text)) { io.to(user.room).emit('newMessage', Message.generateMessage(user.name, data.text)); } else { throw new Error('текст не найден') }
            callback('Працюэ!');
        } catch (e) { callback(`error ${e.message}`) }


    });
    socket.on('createLocation', (data, callback) => {
        var user = users.getUser(socket.id);

        try {
            if (data.location) {
                io.to(user.room).emit('newLocationMessage', Message.generateLocationMessage(user.name, data.location.latitude, data.location.longitude));
            } else { throw new Error('месторасположение не найдено') }
            callback('Worked!');
        } catch (e) { callback(`error ${e.message}`) }


    })


});




server.listen(port, () => {
    console.log('server is running on port number : ' + port);
})