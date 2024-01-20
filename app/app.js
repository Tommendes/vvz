const express = require('express')
const cors = require('cors')
const app = express()
const consign = require('consign')
const db = require('./config/db')
const fs = require('fs')
const path = require('path')
const logsDir = 'logs'
const tempDir = path.join(__dirname, '../', 'temp-files')
const port = process.env.PORT || 55596

app.use(express.static(tempDir))
app.use(express.static(logsDir))
app.use(cors())
app.db = db
app.tempDir = tempDir
app.logsDir = logsDir

Object.defineProperty(global, '__stack', {
    get: function () {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function (_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
    get: function () {
        return __stack[1].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
    get: function () {
        return __stack[1].getFunctionName();
    }
});

consign()
    .include('./config/passport.js')
    .then('./config/middlewares.js')
    .then('./api/facilities.js')
    .then('./api/validation.js')
    .then('./api/mailer.js')
    .then('./api/mailerCli.js')
    .then('./api/user.js')
    .then('./api/sisEvents.js')
    .then('./api/uploads.js')
    .then('./api')
    .then('./config/routes.js')
    .into(app)

app.listen(port, async () => {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(path.join(__dirname, logsDir), (error) => {
            if (error) {
                app.api.logger.logError({ log: { line: `Directory logs create error! Error: ${error}`, sConsole: true } })
                return console.error(error);
            }
        });
        app.api.logger.logInfo({ log: { line: `Directory logs created successfully!`, sConsole: true } })
    }

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true }, (error) => {
            if (error) {
                app.api.logger.logError({ log: { line: `Directory temp create error! Error: ${error}`, sConsole: true } })
                return console.error(error);
            }
        });
        app.api.logger.logInfo({ log: { line: `Directory temp created successfully!`, sConsole: true } })
    }

    app.api.logger.logInfo({ log: { line: `Backend executando na porta ${port}`, sConsole: true } })
})