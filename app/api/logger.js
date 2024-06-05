const fs = require('fs')
const moment = require('moment');

module.exports = app => {
    const logInfo = async (req, res) => {
        const log = { ...req.log }
        stream = fs.createWriteStream("./logs/info.txt", { flags: 'a' });

        // Usar moment para obter a data no fuso horário GMT-3
        const timestamp = moment().utcOffset('-03:00').format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");    
        const line = `[${timestamp}] ${req.user ? req.user.name : ''}: ${log.line}`;
        stream.write(line + "\n");
        stream.end();
        if (log.sConsole) return console.log(line);
    }

    const logError = async (req, res) => {
        const log = { ...req.log }
        stream = fs.createWriteStream("./logs/errors.txt", { flags: 'a' });

        // Usar moment para obter a data no fuso horário GMT-3
        const timestamp = moment().utcOffset('-03:00').format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");    
        const line = `[${timestamp}] ${req.user ? req.user.name : ''}: ${log.line}`;
        stream.write(line + "\n");
        stream.end();
        if (log.sConsole) return console.log(line);
    }

    return { logInfo, logError }
}