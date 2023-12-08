const path = require('path')
const fs = require('fs');

module.exports = app => {
    const { isMatchOrError, noAccessMsg, existsOrError } = app.api.validation

    const getAsset = async(req, res) => {
        const body = {...req.body }
        const root = body.root || undefined
        const asset = body.asset || undefined
        const extension = body.extension || undefined
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams, `${noAccessMsg} "Exibição de arquivo do sistema"`)
            existsOrError(root, "Endereço do arquivo não informado")
            existsOrError(asset, "Nome do arquivo não informado")
            existsOrError(extension, "Extensão do arquivo não informado")
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const mime = {
            html: 'text/html',
            pdf: 'application/pdf',
            txt: 'text/plain',
            css: 'text/css',
            gif: 'image/gif',
            jpg: 'image/jpeg',
            png: 'image/png',
            svg: 'image/svg+xml',
            js: 'application/javascript'
        };

        const dir = path.join(__dirname, "../assets")
        var file = path.join(dir, `${root}/${asset}.${extension}`);
        if (file.indexOf(dir + path.sep) !== 0) {
            return res.status(403).end('Forbidden');
        }
        var type = mime[path.extname(file).slice(1)] || 'text/plain';
        var s = fs.createReadStream(file, { encoding: 'base64' });
        s.on('open', function() {
            res.set('Content-Type', type);
            s.pipe(res);
        });
        s.on('error', function() {
            res.set('Content-Type', 'text/plain');
            res.status(404).end('File not found');
        });

    }
    return { getAsset }
}