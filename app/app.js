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
const nodemailer = require('nodemailer');
const { mailer } = require('./.env')
const transporter = nodemailer.createTransport(mailer);
const { appName } = require('./config/params')


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
    const log = `[${new Date().toISOString()}] Exceção não detectada/tratada: ${err.message}\n`;
    console.log(log);
    logError.write(log);

    try {
        // Enviar e-mail com detalhes da exceção
        await transporter.sendMail({
            from: `"${appName}" <contato@vivazul.com.br>`, // sender address
            to: `contato@tommendes.com.br`, // list of receivers
            subject: 'Erro na Aplicação Vivazul API - Exceção não detectada/tratada',
            text: `Exceção não detectada/tratada: ${err.message}\nDetalhes: ${err.stack}`
        });
        console.log(`[${new Date().toISOString()}] Email enviado com sucesso com exceção não detectada/tratada`);
    } catch (error) {
        const log = `[${new Date().toISOString()}] Falha ao tentar enviar email com exceção não detectada/tratada: ${error}\n`;
        console.log(log);
        logError.write(log);
    }

    // Reinicia a aplicação usando PM2
    try {
        await restartApp();
        const log = `[${new Date().toISOString()}] Aplicação reiniciada após exceção não detectada/tratada\n`;
        console.log(log);
        logInfo.write(log);
    } catch (error) {
        const log = `[${new Date().toISOString()}] Falha ao reiniciar a aplicação após exceção não detectada/tratada: ${error}\n`;
        console.log(log);
        logError.write(log);

        process.exit(1); // Encerra a aplicação após a exceção não tratada
    }
    try {
        logError.end();
    } catch (error) {
        const log = `[${new Date().toISOString()}] Falha ao finalizar a gravação do log de erro: ${error}\n`;
        console.log(log);
        logError.write(log);
    }
});

async function restartApp() {
    return new Promise((resolve, reject) => {
        // Use o módulo child_process para executar o comando pm2 restart
        const { exec } = require('child_process');
        exec('pm2 restart vivazul-api', (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`[${new Date().toISOString()}] Erro ao reiniciar a aplicação: ${stderr || error.message}`));
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