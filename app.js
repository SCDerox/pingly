const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const html_sanitize = require('html_sanitize')
const db = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});
const onlineCache = [];
const User = db.define('User', {
    username: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    token: {
        type: DataTypes.STRING,
        unique: true
    },
    permissions: {
        type: DataTypes.JSON,
        defaultValue: ['WRITE']
    },
    color: DataTypes.STRING,
    description: DataTypes.STRING,
    banned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    // Other model options go here
});
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = 'debug';
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const { Session } = require('inspector');
const io = new Server(server);
app.set('trust proxy', 1);
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const username = socket.handshake.auth.username;
    console.log(token, username)
    const user = await User.findOne({
        where: {
            token,
            username
        }
    })
    if (!user) {
        const err = new Error('Wrong token - please try reauthenficating');
        next(err);
        return;
    }
    if (user.banned) {
        const err = new Error('This user was banned by an administrator');
        next(err);
        return;
    }
    socket.user = user;
    next();
});
io.on('connection', (socket) => {
    socket.on('message', async (data) => {
        if (data.content.startsWith('/')) {
            let command = data.content.split('/').join('').split(' ')[0];
            const args = data.content.split('/' + command).join('').split(' ');
            args.shift();
            console.log(command, args)
            switch (command) {
                case 'color':
                    const user = await User.findOne({
                        where: {
                            username: args[0]
                        }
                    })
                    user.color = args[1];
                    await user.save();
                    socket.send({ content: 'Changed color', system: true })
                    break;
                case 'ban':
                    const userToBan = await User.findOne({
                        where: {
                            username: args[0]
                        }
                    })
                    userToBan.banned = true;
                    await userToBan.save();
                    socket.emit('refresh', { username: userToBan.username })
                    socket.send({ content: 'Saved successuflly', system: true });
                    break;
                case 'help':
                    socket.send({ content: 'SOON™', system: true });
                    break;
                case 'unban':
                    const userToUnBan = await User.findOne({
                        where: {
                            username: args[0]
                        }
                    })
                    userToUnBan.banned = false;
                    await userToUnBan.save();
                    socket.send({ content: 'Saved successuflly', system: true });
                    break;
                default:
                    console.log(data.content)
                    socket.send({ content: 'Command not found. Use<b>/help</b> to see all availible commands.', system: true })
            }
            return;
        }
        io.emit('message', { content: html_sanitize.escape(data.content), author: { username: socket.user.username, color: socket.user.color } })
    })
    socket.on('connected', () => {
        io.emit('message', {
            content: `<b ${socket.user.color ? `style="color: ${socket.user.color}"` : ''}>${socket.user.username}</b> connected to this chat`,
            system: true
        })
        io.emit('userConnect', {
            username: socket.user.username,
            color: socket.user.color
        })
        if (!onlineCache.includes(socket.user.username)) onlineCache.push(socket.user.username)
        onlineCache.forEach(name => {
            socket.emit('userConnect', ({ username: name, color: null }))
        })
    })
    socket.on('disconnect', () => {
        io.emit('message', {
            content: `<b ${socket.user.color ? `style="color: ${socket.user.color}"` : ''}>${socket.user.username}</b> disconnected`,
            system: true
        });
        io.emit('userDisconnect', {
            username: socket.user.username
        })
        onlineCache.splice(onlineCache.indexOf(socket.user.username), 1);
    });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    req.models = { User }
    next();
})

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

db.sync({ force: false }).then(() => {
    server.listen(config.port, () => {
        logger.info(`Listening on port ${config.port}`);
    });
});
