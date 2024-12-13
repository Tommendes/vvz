
const { dbPrefix } = require("../.env")

module.exports = app => {
    const bcrypt = require('bcrypt')

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Converte a primeira letra de cada palavra para maiúscula
    function titleCase(str) {
        let splitStr = str.toLowerCase().split(' ');
        const pular = ['de', 'da', 'do', 'das', 'dos', '']
        for (var i = 0; i < splitStr.length; i++) {
            if (!(pular.includes(splitStr[i])))
                splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        return splitStr.join(' ');
    }

    function numbersOrZero(value) {
        let ret = value || "0"
        ret = ret.toString().replace(/([^\d])+/gim, "")
        if (ret.length = 0) ret = "0"
        return ret
    }

    // TODO: Normalize a string removendo acentos e caracteres especiais e deixando apenas letras, números e espaços em branco e sem alterar a caixa das letras
    function removeAccents(value) {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        // return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')        
        //     let ret = value || ""
        //     ret = ret.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        //     ret = ret.replace('/[áàãâä]/ui', 'a');
        //     ret = ret.replace('/[éèêë]/ui', 'e');
        //     ret = ret.replace('/[íìîï]/ui', 'i');
        //     ret = ret.replace('/[óòõôö]/ui', 'o');
        //     ret = ret.replace('/[úùûü]/ui', 'u');
        //     ret = ret.replace('/[ç]/ui', 'c');
        //     ret = ret.replace('/[^a-z0-9]/i', '_');
        //     ret = ret.replace('/_+/', '_');
        //     // ret = ret.replaceAll('º', 'o')
        //     return ret
    }

    function removeAccentsObj(key, value) {
        return key != 'email' && typeof value === 'string'
            ? Array.from(value, removeAccents).join('')
            : value
    }

    function uc(objeto) {
        return objeto >= 'a' && objeto <= 'z'
            ? String.fromCharCode(objeto.charCodeAt() - 32)
            : objeto
    }

    function changeUpperCase(key, value) {
        return key != 'email' && typeof value === 'string'
            ? Array.from(value, uc).join('')
            : value
    }

    function diffInDays(dateStr, days) {
        // Converte a string em uma instância de Date
        const date = new Date(dateStr);

        // Obtem a diferença de tempo em milissegundos entre as duas datas
        const diffTime = Math.abs(Date.now() - date.getTime());

        // Converte a diferença de tempo em dias
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Retorna `true` se a diferença em dias for maior ou igual a `days` ou apenas a diferença se days não for declarado
        if (!days) return diffDays;
        else return diffDays >= days;
    }

    function encryptPassword(password) {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    function comparePassword(password, comparePassword) {
        return bcrypt.compareSync(password, comparePassword)
    }

    function convertESocialTextToJson(body) {
        const querystring = require('querystring');
        const jsonData = querystring.parse(body, '\r\n', '=');
        return JSON.parse(JSON.stringify(jsonData))
    }

    const getIdParam = async (meta, value) => {
        const tabelaDomain = `${dbPrefix}_app.params`
        let body = { id: 0 }
        const param = await app.db(tabelaDomain).select('id').where({ 'meta': meta, 'value': value }).first()
        if (param) return param.id
        else undefined
    }

    const getIdCidade = async (ibge) => {
        const tabelaDomain = `${dbPrefix}_app.cad_cidades`
        const param = await app.db(tabelaDomain).select('id').where({ 'municipio_id': ibge }).first()
        if (param) return param.id
        else undefined
    }

    const getIdCargos = async (nome) => {
        const tabelaDomain = `${dbPrefix}_cliente_ativos.aux_cargos`
        const param = await app.db(tabelaDomain).select('id').where({ 'nome': nome }).first()
        if (param) return param.id
        else undefined
    }

    function countOccurrences(str, term) { return str.split(term).length - 1 }

    function formatCurrency(value, locale = { place: 'pt-BR', currency: 'BRL', styleReturn: 'currency' }) {
        value = value || 0;
        // remova todos os caracteres não numéricos e converta para double
        if (typeof value === 'string') value = parseFloat(value.replace(/\D/g, '')) / 100;
        // Mostrar opçõe style: 'currency', 'decimal', 'percent'
        return value.toLocaleString(locale.place, { style: locale.styleReturn, currency: locale.currency });
    }

    function ceilTwoDecimals(num) {
        return Math.ceil(num * 100) / 100;
    }

    // Remove tags html e formata texto para o padrão do WhatsApp
    function convertHtmlToWhatsappFormat(html) {
        return html
            .replace(/<strong>(.*?)<\/strong>/g, '*$1*') // Negrito
            .replace(/<em>(.*?)<\/em>/g, '_$1_') // Itálico
            .replace(/<p>(.*?)<\/p>/g, '$1\n') // Parágrafo
            .replace(/<br>/g, '\n') // Parágrafo
    }

    // Substitui tags whastapp por tags html
    function convertWhatsappFormattoHtml(html, limit = 0, removeParagraph = false) {
        if (!html) return '';
        html = html.trim().toString();
        if (limit > 0) {
            html = html.substring(0, limit) + '...';
        }
        // Escapa caracteres especiais HTML
        // html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        // Substitui marcações de negrito e itálico
        html = html
            .replace(/\*(.*?)\*/g, '<strong>$1</strong>') // Negrito
            .replace(/_(.*?)_/g, '<em>$1</em>'); // Itálico
        // Substitui quebras de linha simples por <p>
        html = html
            .split('\\n')
            .map((line) => {
                if (removeParagraph) return ` ${line} `;
                else return `<p>${line}</p>`;
            })
            .join('')
            .trim();
    
        return html;
    }

    return {
        capitalizeFirstLetter, titleCase, removeAccents, removeAccentsObj,
        numbersOrZero, changeUpperCase, diffInDays, encryptPassword, comparePassword,
        convertESocialTextToJson, getIdParam, getIdCidade, getIdCargos, countOccurrences,
        formatCurrency, ceilTwoDecimals, convertHtmlToWhatsappFormat, convertWhatsappFormattoHtml
    }
}