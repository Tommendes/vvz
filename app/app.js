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

// Adicionando manipulador de exceção não capturada
const logError = fs.createWriteStream("./logs/uncaughtException.txt", { flags: 'a' });
const logInfo = fs.createWriteStream("./logs/info.txt", { flags: 'a' });

process.on('uncaughtException', async (err) => {
    // Adicione lógica aqui para lidar com a exceção, como registrar em logs
    logError.write(`[${new Date().toISOString()}] Exceção não detectada/tratada: ${err.message}\n`);
    
    // Reinicia a aplicação usando PM2
    try {
        await restartApp();
        logInfo.write(`[${new Date().toISOString()}] Aplicação reiniciada após exceção não detectada/tratada\n`);
    } catch (error) {
        logError.write(`[${new Date().toISOString()}] Falha ao reiniciar a aplicação: ${error}\n`);

        process.exit(1); // Encerra a aplicação após a exceção não tratada
    }
    try {
        logError.end();        
    } catch (error) {
        logError.write(`[${new Date().toISOString()}] Falha ao finalizar a gravação do log de erro: ${error}\n`);
    }
});

async function restartApp() {
    return new Promise((resolve, reject) => {
        // Use o módulo child_process para executar o comando pm2 restart
        const { exec } = require('child_process');
        exec('pm2 restart vivazul-api', (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Erro ao reiniciar a aplicação: ${stderr || error.message}`));
            } else {
                resolve();
            }
        });
    });
}

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