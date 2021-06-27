const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const db = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});
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
    color: DataTypes.STRING
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
const io = new Server(server);
app.set('trust proxy', 1);
io.on('connection', (socket) => {
    console.log('a user connected');
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

db.sync().then(() => {
    server.listen(config.port, () => {
        logger.info(`Listening on port ${config.port}`);
    });
});
