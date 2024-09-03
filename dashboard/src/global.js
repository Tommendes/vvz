import { Mask } from 'maska';
import { jwtDecode } from "jwt-decode";
export const userKey = '__vivazul_user';
export const glKey = '__gl_user';
export const appName = 'Vivazul';
export const softwareHouse = 'Vivazul Smart';
export const dbPrefix = 'vivazul';
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

export function formatCurrency(value, locale = { place: 'pt-BR', currency: 'BRL', styleReturn: 'currency' }) {
    value = value || 0;
    // Remova todos os caracteres não numéricos e converta para double
    if (typeof value === 'string') value = parseFloat(value.replace(/\D/g, '')) / 100;

    // Opções de formatação
    const options = {
        style: locale.styleReturn,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    };

    // Adicionar a moeda apenas se o estilo for 'currency'
    if (locale.styleReturn === 'currency') {
        options.currency = locale.currency;
    }

    return value.toLocaleString(locale.place, options);
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
        return `<a href="https://api.whatsapp.com/send/?phone=55${telefoneMask.unmasked(conteudo.trim().replace(/\D/g, ''))}
        &text=Olá${options && options.to ? ', ' + options.to : ''}! ${saudation()}. ${options && options.from ? '%0A' + options.from + ' aqui!%0A%0A' : '%0A%0A'}&type=phone_number&app_absent=0
        " target="_blank" title="Clique para iniciar uma conversa">${telefoneMask.masked(conteudo)} <i class="fa-brands fa-whatsapp"></i></a>`;
    } else {
        return conteudo;
    }
}

// Remove as tags HTML
export function removeHtmlTags(str) {
    if (!str) return str;
    
    return str
        .toString()
        .replace(/<br\s*\/?>/gi, '\r\n') // Substitui <br> por \r\n
        .replace(/<\/?p>/gi, '\r\n') // Substitui <p> e </p> por \r\n
        .replace(/(<([^>]+)>)/gi, '') // Remove todas as tags HTML restantes
        .replace(/\s{2,}/g, ' ') // Substitui múltiplos espaços por um único espaço
        .replace(/&amp;/g, '&') // Substitui &amp; por &
        .replace(/&lt;/g, '<') // Substitui &lt; por <
        .replace(/&gt;/g, '>') // Substitui &gt; por >
        .replace(/&quot;/g, '"') // Substitui &quot; por "
        .replace(/&#39;/g, "'") // Substitui &#39; por '
        .replace(/&nbsp;/g, ' '); // Substitui &nbsp; por um espaço
}

// Formatar valor 0.00 para 0,00
export function formatValor(value, result = 'pt') {
    if (result == 'pt') {
        if (value && result == 'pt') return value.toString().replace('.', ',');
        else return '0,00';
    } else {
        if (value && result == 'en') return value.toString().replace(',', '.');
        else return '0.00';
    }
}

// Decodifica o token
export function decodeToken(token) {
    try {
        if (token) return jwtDecode(token);
    } catch (error) {
        console.log(error);
    }
    return token;
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

export const ufsSiglas = [
    { value: 'AC', label: 'AC' },
    { value: 'AL', label: 'AL' },
    { value: 'AP', label: 'AP' },
    { value: 'AM', label: 'AM' },
    { value: 'BA', label: 'BA' },
    { value: 'CE', label: 'CE' },
    { value: 'DF', label: 'DF' },
    { value: 'ES', label: 'ES' },
    { value: 'GO', label: 'GO' },
    { value: 'MA', label: 'MA' },
    { value: 'MT', label: 'MT' },
    { value: 'MS', label: 'MS' },
    { value: 'MG', label: 'MG' },
    { value: 'PA', label: 'PA' },
    { value: 'PB', label: 'PB' },
    { value: 'PR', label: 'PR' },
    { value: 'PE', label: 'PE' },
    { value: 'PI', label: 'PI' },
    { value: 'RJ', label: 'RJ' },
    { value: 'RN', label: 'RN' },
    { value: 'RS', label: 'RS' },
    { value: 'RO', label: 'RO' },
    { value: 'RR', label: 'RR' },
    { value: 'SC', label: 'SC' },
    { value: 'SP', label: 'SP' },
    { value: 'SE', label: 'SE' },
    { value: 'TO', label: 'TO' }
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

// Andamento do registro
export const andamentoRegistroPv = {
    STATUS_PENDENTE: 0,
    STATUS_REATIVADO: 1,
    STATUS_EM_ANDAMENTO: 60,
    STATUS_FINALIZADO: 80,
    STATUS_CANCELADO: 89,
    STATUS_EXCLUIDO: 99 // Apenas para informação. Se o registro tem esse status então não deve mais ser exibido
};

export const andamentoRegistroPvOat = {
    STATUS_OS: 10,
    STATUS_PROPOSTA: 30,
    STATUS_PEDIDO: 40,
    STATUS_EXECUTANDO: 60,
    STATUS_FATURADO: 80,
    STATUS_FINALIZADO: 90,
    STATUS_REATIVADO: 97,
    STATUS_CANCELADO: 98,
    STATUS_EXCLUIDO: 99 // Apenas para informação. Se o registro tem esse status então não deve mais ser exibido
};

export const andamentoRegistroPipeline = {
    STATUS_PENDENTE: 0,
    STATUS_REATIVADO: 1,
    STATUS_CONVERTIDO: 10,
    STATUS_PEDIDO: 20,
    STATUS_LIQUIDADO: 80,
    STATUS_CANCELADO: 89,
    STATUS_EXCLUIDO: 99 // Apenas para informação. Se o registro tem esse status então não deve mais ser exibido
};

export const colorsDashboard = [
    'blue-400',
    'blue-500',
    'blue-600',
    'blue-700',
    'blue-800',
    'blue-900',
    'green-400',
    'green-500',
    'green-600',
    'green-700',
    'green-800',
    'green-900',
    'yellow-400',
    'yellow-500',
    'yellow-600',
    'yellow-700',
    'yellow-800',
    'yellow-900',
    'cyan-400',
    'cyan-500',
    'cyan-600',
    'cyan-700',
    'cyan-800',
    'cyan-900',
    'pink-400',
    'pink-500',
    'pink-600',
    'pink-700',
    'pink-800',
    'pink-900',
    'indigo-400',
    'indigo-500',
    'indigo-600',
    'indigo-700',
    'indigo-800',
    'indigo-900',
    'teal-400',
    'teal-500',
    'teal-600',
    'teal-700',
    'teal-800',
    'teal-900',
    'orange-400',
    'orange-500',
    'orange-600',
    'orange-700',
    'orange-800',
    'orange-900',
    'bluegray-400',
    'bluegray-500',
    'bluegray-600',
    'bluegray-700',
    'bluegray-800',
    'bluegray-900',
    'purple-400',
    'purple-500',
    'purple-600',
    'purple-700',
    'purple-800',
    'purple-900',
    'red-400',
    'red-500',
    'red-600',
    'red-700',
    'red-800',
    'red-900',
    'primary-400',
    'primary-500',
    'primary-600',
    'primary-700',
    'primary-800',
    'primary-900'
];

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
    formatCurrency,
    saudation,
    renderizarHTML,
    removeHtmlTags,
    formatValor,
    decodeToken,
    STATUS_INACTIVE,
    STATUS_WAITING,
    STATUS_SUSPENDED_BY_TKN,
    STATUS_SUSPENDED,
    STATUS_ACTIVE,
    STATUS_PASS_EXPIRED,
    STATUS_DELETE,
    MINIMUM_KEYS_BEFORE_CHANGE,
    TOKEN_VALIDE_MINUTES,
    UFS,
    ufsSiglas,
    andamentoRegistroPv,
    andamentoRegistroPvOat,
    andamentoRegistroPipeline,
    colorsDashboard
};
