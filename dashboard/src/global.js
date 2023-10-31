export const userKey = '__vivazul_user';
export const glKey = '__gl_user';
export const appName = 'Vivazul';
export const softwareHouse = 'Vivazul Smart';
export const dbPrefix = 'vivazul';
import { Mask } from 'maska';
export const noPermissAccess = 'Ops!!! Parece que seu perfil não dá acesso a essa operação';

export function isValidEmail(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegexp.test(email);
}

export function highlight(value, markTxt) {
    let target = value;
    let targetMark = markTxt.toString().trim().replace(/\s\s+/g, ' ').split(' ');
    targetMark.forEach((elementMark) => {
        if (!['m', 'M'].includes(elementMark.toString().substring(0))) target = target.replaceAll(elementMark, `<mark class="foundMark">${elementMark}</mark>`);
    });
    return target;
}

export function removeMark(text) {
    return text.toString().replaceAll('<mark class="foundMark">', '').replaceAll('</mark>', '');
}

export function downloadFile(linkSource, fileName) {
    const linkUrl = linkSource.replaceAll(' ', '%20');
    const file = fileName.replaceAll(' ', '%20');
    const downloadLink = document.createElement('a');
    downloadLink.href = linkUrl;
    downloadLink.download = file;
    downloadLink.click();
}

export function setValidCep(cep) {
    const res = {
        cepClass: undefined,
        isCep: false
    };
    if (cep && cep.length > 0) {
        if (cep.length == 8) {
            res.cepClass = 'is-valid';
            res.isCep = true;
        } else {
            res.cepClass = 'is-invalid';
            res.isCep = false;
        }
    } else {
        res.cepClass = undefined;
        res.isCep = false;
    }
    return res;
}

export function capitalizeFirst(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function titleCase(str) {
    if (str) {
        let splitStr = str.toLowerCase().split(' ');
        const pular = ['de', 'da', 'do', 'e'];
        for (var i = 0; i < splitStr.length; i++) {
            if (!pular.includes(splitStr[i])) splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        return splitStr.join(' ');
    } else return str;
}

// TODO: criar uma função que converta de string "0" ou "1" para booleano
export function stringToBoolean(string) {
    switch (string.toLowerCase().trim()) {
        case '1':
            return true;
        case '0':
            return false;
        default:
            return undefined;
    }
}

import { parse, isValid } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export function validarDataPTBR(data) {
    // Use o locale 'ptBR' para interpretar datas em português
    if (data.length == 10) {
        const parsedDate = parse(data, 'dd/MM/yyyy', new Date(), { locale: ptBR });

        // Verifique se a data é válida
        return isValid(parsedDate);
    }
}

// Verifique o horario e informe: Bom dia, boa tarde ou boa noite
export const saudation = () => {
    const hora = new Date().getHours();
    if (hora >= 0 && hora < 12) return 'Bom dia';
    else if (hora >= 12 && hora < 18) return 'Boa tarde';
    else return 'Boa noite';
};

// Renderiza o HTML
export function renderizarHTML(conteudo, options) {
    const telefoneMask = new Mask({ mask: '(##) #####-####' });

    // Verifique se o conteúdo parece ser um link da web ou um endereço de e-mail
    if (conteudo.includes('http') || conteudo.includes('https')) {
        return `<a href="${conteudo}" target="_blank" title="Clique para acessar a página">${conteudo}</a>`;
    } else if (conteudo.includes('www') && !conteudo.includes('https')) {
        return `<a href="https://${conteudo}" target="_blank" title="Clique para acessar a página">${conteudo}</a>`;
    } else if (conteudo.includes('@')) {
        return `<a href="mailto:${conteudo}" title="Clique para iniciar um email">${conteudo}</a>`;
    } else if (telefoneMask.completed(conteudo.replace(/\D/g, '')) && options) {
        // Verifique o horario e informe: Bom dia, boa tarde ou boa noite
        return `<a href="https://api.whatsapp.com/send/?phone=55${telefoneMask.unmasked(conteudo.replace(/\D/g, ''))}
        &text=Olá${options && options.to ? ', ' + options.to : ''}! ${saudation()}. ${options && options.from ? '%0A' + options.from + ' aqui!%0A%0A' : '%0A%0A'}&type=phone_number&app_absent=0
        " target="_blank" title="Clique para iniciar uma conversa">${telefoneMask.masked(conteudo)} <i class="fa-brands fa-whatsapp"></i></a>`;
    } else {
        return conteudo;
    }
}

// Remove as tags HTML
export function removeHtmlTags(str) {
    if (str === null || str === '') return str;
    else
        return str
            .toString()
            .replace(/(<([^>]+)>)/gi, '')
            .replaceAll('  ', ' ')
            .replace(/&nbsp;/g, '')
            .replace(/\r?\n|\r/g, '');
}

// Um array com todos os estados do Brasil
export const UFS = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'AC', label: 'Acre-AC' },
    { value: 'AL', label: 'Alagoas-AL' },
    { value: 'AM', label: 'Amazonas-AM' },
    { value: 'AP', label: 'Amapa-AP' },
    { value: 'BA', label: 'Bahia-BA' },
    { value: 'CE', label: 'Ceara-CE' },
    { value: 'DF', label: 'Distrito Federal-DF' },
    { value: 'ES', label: 'Espirito Santo-ES' },
    { value: 'GO', label: 'Goias-GO' },
    { value: 'MA', label: 'Maranhao-MA' },
    { value: 'MG', label: 'Minas Gerais-MG' },
    { value: 'MS', label: 'Mato Grosso do Sul-MS' },
    { value: 'MT', label: 'Mato Grosso-MT' },
    { value: 'PA', label: 'Para-PA' },
    { value: 'PB', label: 'Paraiba-PB' },
    { value: 'PE', label: 'Pernambuco-PE' },
    { value: 'PI', label: 'Piaui-PI' },
    { value: 'PR', label: 'Parana-PR' },
    { value: 'RJ', label: 'Rio de Janeiro-RJ' },
    { value: 'RN', label: 'Rio Grande do Norte-RN' },
    { value: 'RO', label: 'Rondonia-RO' },
    { value: 'RR', label: 'Roraima-RR' },
    { value: 'RS', label: 'Rio Grande do Sul-RS' },
    { value: 'SC', label: 'Santa Catarina-SC' },
    { value: 'SE', label: 'Sergipe-SE' },
    { value: 'SP', label: 'Sao Paulo-SP' },
    { value: 'TO', label: 'Tocantins-TO' }
];

/**
 * Tipos possívels de status de usuários
 */
export const STATUS_INACTIVE = 0;
export const STATUS_WAITING = 1;
export const STATUS_SUSPENDED_BY_TKN = 8;
export const STATUS_SUSPENDED = 9;
export const STATUS_ACTIVE = 10;
export const STATUS_PASS_EXPIRED = 19;
export const STATUS_DELETE = 99;
export const MINIMUM_KEYS_BEFORE_CHANGE = 3; // Não pode repetiar a últimas X senhas
export const TOKEN_VALIDE_MINUTES = 10; // 10 minutos de validade

export default {
    userKey,
    glKey,
    appName,
    dbPrefix,
    noPermissAccess,
    isValidEmail,
    highlight,
    removeMark,
    downloadFile,
    setValidCep,
    titleCase,
    stringToBoolean,
    validarDataPTBR,
    saudation,
    renderizarHTML,
    removeHtmlTags,
    STATUS_INACTIVE,
    STATUS_WAITING,
    STATUS_SUSPENDED_BY_TKN,
    STATUS_SUSPENDED,
    STATUS_ACTIVE,
    STATUS_PASS_EXPIRED,
    STATUS_DELETE,
    MINIMUM_KEYS_BEFORE_CHANGE,
    TOKEN_VALIDE_MINUTES,
    UFS
};
