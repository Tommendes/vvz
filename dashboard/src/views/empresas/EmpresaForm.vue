<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import Breadcrumb from '@/components/Breadcrumb.vue';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj_empresa: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    }),
    cep: new Mask({
        mask: '#####-###'
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Validar o cpf_cnpj
import { cpf, cnpj } from 'cpf-cnpj-validator';

// Campos de formulário
const itemData = ref({});
const registroTipo = ref('pf');
const labels = ref({
    razaosocial: 'Razão Social',
    fantasia: 'Nome Fantasia',
    cpf_cnpj_empresa: 'CPF',
    ie: 'Inscrição Estadual',
    ie_st: 'Inscrição Estadual do substituto tributário',
    im: 'Inscrição Municipal',
    cnae: 'CNAE',
    contato: 'Contato da Empresa',
    id_cadas_resplegal: 'Responsável legal perante a Receita Federal',
    url_logo: 'Logomarca da Empresa'
});
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref({
    form: true,
    accepted: null,
    email: null,
    telefone: null
});
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/empresas`);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;

        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);

                itemData.value = body;
                if (itemData.value.cpf_cnpj_empresa) itemData.value.cpf_cnpj_empresa = masks.value.cpf_cnpj_empresa.masked(itemData.value.cpf_cnpj_empresa);
                if (itemData.value.cep) itemData.value.cep = masks.value.cep.masked(itemData.value.cep);
                if (itemData.value.tel1) itemData.value.tel1 = masks.value.telefone.masked(itemData.value.tel1);
                if (itemData.value.tel2) itemData.value.tel2 = masks.value.telefone.masked(itemData.value.tel2);

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/empresas` });
            }
        });
    } else loading.value.form = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    if (itemData.value.cpf_cnpj_empresa) itemData.value.cpf_cnpj_empresa = masks.value.cpf_cnpj_empresa.unmasked(itemData.value.cpf_cnpj_empresa);
    if (itemData.value.tel1) itemData.value.tel1 = masks.value.telefone.unmasked(itemData.value.tel1);
    if (itemData.value.tel2) itemData.value.tel2 = masks.value.telefone.unmasked(itemData.value.tel2);
    if (itemData.value.cep) itemData.value.cep = masks.value.cep.unmasked(itemData.value.cep);
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                if (itemData.value.id) emit('changed', itemData.value.id);
                else reload();
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
// Validar a existência do nome do cliente
const validateRazaoSocial = () => {
    errorMessages.value.razaosocial = null;
    if (itemData.value.razaosocial && typeof itemData.value.razaosocial.trim() == 'string' && itemData.value.razaosocial.trim().length > 0) return true;
    else {
        errorMessages.value.razaosocial = 'Nome ou razão social inválidos';
        return false;
    }
};
// Validar CPF
const validateCPFCNPJ = () => {
    const inputValue = itemData.value.cpf_cnpj_empresa || '';

    if (inputValue.trim().length > 0) {
        const toValidate = masks.value.cpf_cnpj_empresa.unmasked(inputValue);
        if (cpf.isValid(toValidate) || cnpj.isValid(toValidate)) {
            errorMessages.value.cpf_cnpj_empresa = null;
        } else {
            errorMessages.value.cpf_cnpj_empresa = 'CPF/CNPJ informado é inválido';
        }
    } else {
        errorMessages.value.cpf_cnpj_empresa = 'CPF/CNPJ não pode estar vazio';
    }

    return !errorMessages.value.cpf_cnpj_empresa;
};
// Preencher campos de endereço com base no CEP
const buscarCEP = async () => {
    const cep = itemData.value.cep.replace(/[^0-9]/g, '');

    if (cep !== '') {
        try {
            // Limpar os campos enquanto aguarda a resposta
            itemData.value.logradouro = '...';
            itemData.value.bairro = '...';
            itemData.value.cidade = '...';
            itemData.value.uf = '...';
            itemData.value.ibge = '...';

            const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

            if (!response.data.erro) {
                // Atualizar os campos com os valores da consulta.
                itemData.value.logradouro = response.data.logradouro;
                itemData.value.bairro = response.data.bairro;
                itemData.value.cidade = response.data.localidade;
                itemData.value.uf = response.data.uf;
                itemData.value.ibge = response.data.ibge;
            } else {
                // CEP pesquisado não foi encontrado.
                limparFormularioCEP();
                defaultWarn('CEP não encontrado.');
            }
        } catch (error) {
            console.error('Erro ao buscar informações do CEP', error);
            limparFormularioCEP();
            defaultWarn('Erro ao buscar informações do CEP');
        }
    } else {
        // CEP sem valor, limpar formulário.
        limparFormularioCEP();
    }
};
const limparFormularioCEP = () => {
    itemData.value.logradouro = '';
    itemData.value.bairro = '';
    itemData.value.cidade = '';
    itemData.value.uf = '';
    itemData.value.ibge = '';
};
// Validar Cep
const validateCep = () => {
    errorMessages.value.cep = null;
    if (itemData.value.cep && itemData.value.cep.replace(/([^\d])+/gim, '').length == 8) return true;
    else {
        errorMessages.value.cep = 'Formato de cep inválido';
        return false;
    }
};
// Validar email
const validateEmail = (field) => {
    errorMessages.value[field] = null;
    if (itemData.value[field] && itemData.value[field].trim().length > 0 && !isValidEmail(itemData.value[field])) {
        errorMessages.value[field] = 'Formato de email inválido';
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = (field) => {
    errorMessages.value[field] = null;
    if (itemData.value[field] && itemData.value[field].trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value[field]).length)) {
        errorMessages.value[field] = 'Formato de telefone inválido';
        return false;
    }
    return true;
};
const validator = () => {
    let isValid = true;
    [
        { field: 'email', validator: 'email' },
        { field: 'email_at', validator: 'email' },
        { field: 'email_comercial', validator: 'email' },
        { field: 'email_financeiro', validator: 'email' },
        { field: 'email_rh', validator: 'email' },
        { field: 'tel1', validator: 'telefone' },
        { field: 'tel2', validator: 'telefone' }
    ].forEach((element) => {
        if (element.validator == 'email' && !validateEmail(element.field)) {
            isValid = false;
        } else if (element.validator == 'telefone' && !validateTelefone(element.field)) {
            isValid = false;
        }
    });
    return isValid;
};

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const dadosPublicos = ref({});
const buscarCNPJ = async () => {
    if (!validateCPFCNPJ()) return;
    const cnpj = itemData.value.cpf_cnpj_empresa.replace(/[^0-9]/g, '');
    if (cnpj.length != 14) return;

    confirm.require({
        group: 'templating',
        header: 'Dados públicos',
        message: 'Gostaria de baixar os dados públicos do CNPJ?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                // Consultar API externa
                const url = `${baseApiUrl}/cad-dados-publicos/f-a/gCnpj`;
                const response = await axios.post(url, { cnpj: cnpj });
                if (response.data.cnpj) {
                    delete response.data.qsa;
                    delete response.data.extra;
                    delete response.data.billing;
                    dadosPublicos.value = response.data;
                    // dadosPublicos.value = { "abertura": "15/11/2012", "situacao": "ATIVA", "tipo": "MATRIZ", "nome": "17.170.694 TOM MENDES PEREIRA", "porte": "MICRO EMPRESA", "natureza_juridica": "213-5 - Empresário (Individual)", "atividade_principal": 
                    // [ { "code": "82.19-9-99", "text": "Preparação de documentos e serviços especializados de apoio administrativo não especificados anteriormente" } ], 
                    // "atividades_secundarias": [ { "code": "95.11-8-00", "text": "Reparação e manutenção de computadores e de equipamentos periféricos" }, { "code": "61.90-6-99", "text": "Outras atividades de telecomunicações não especificadas anteriormente" }, 
                    // { "code": "43.21-5-00", "text": "Instalações elétricas" }, { "code": "85.99-6-03", "text": "Treinamento em informática" }, { "code": "95.12-6-00", "text": "Reparação e manutenção de equipamentos de comunicação" } ], 
                    // "logradouro": "RUA DESEMBARGADOR JOSE ANTONIO DE SOUZA", "numero": "55", "municipio": "GRAVATA", "bairro": "COHAB-LL", "uf": "PE", "cep": "55.643-704", "email": "contato@tommendes.com.br", "telefone": "(82) 8149-9024", "data_situacao": "15/11/2012", 
                    // "cnpj": "17.170.694/0001-08", "ultima_atualizacao": "2024-08-10T23:59:59.000Z", "status": "OK", "fantasia": "", "complemento": "", "efr": "", "motivo_situacao": "", "situacao_especial": "", "data_situacao_especial": "", "capital_social": "1.00", 
                    // "simples": { "optante": true, "data_opcao": "15/11/2012", "data_exclusao": null, "ultima_atualizacao": "2024-08-10T23:59:59.000Z" }, "simei": { "optante": true, "data_opcao": "15/11/2012", "data_exclusao": null, "ultima_atualizacao": "2024-08-10T23:59:59.000Z" } }

                    try {
                        itemData.value.razaosocial = response.data.nome;
                        itemData.value.cep = response.data.cep;
                        itemData.value.logradouro = response.data.logradouro;
                        itemData.value.bairro = response.data.bairro;
                        itemData.value.cidade = response.data.municipio;
                        itemData.value.uf = response.data.uf;
                        itemData.value.nr = response.data.numero;
                        itemData.value.tel1 = response.data.telefone;
                        itemData.value.email = response.data.email;

                        // await axios.post(`${baseApiUrl}/cad-dados-publicos/${itemData.value.id}`, { dados: formatarDadosParaHTML(response.data) });
                        // emit('dadosPublicos', dadosPublicos.value);
                        // searched.value = true;
                        // atualizarDados();
                    } catch (error) {
                        console.error('Erro ao salvar dados públicos', error);
                        defaultWarn('Erro ao salvar dados públicos');
                    }
                } else {
                    // CNPJ pesquisado não foi encontrado.
                    defaultWarn(response.data);
                }
            } catch (error) {
                console.error('Erro ao buscar informações do CNPJ', error);
                defaultWarn('Erro ao buscar informações do CNPJ');
            }
        },
        reject: () => {
            return;
        }
    });
};

// Validar formulário
const formIsValid = () => {
    return validateRazaoSocial() && validateCPFCNPJ() && validateCep() && validator();
    // return validateDocumento();
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    errorMessages.value = {};
    await loadData();
    emit('cancel');
};
// Carregar dados do formulário
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    await loadData();
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    validateRazaoSocial();
    validator();
    validateCep();
});
watch(
    () => itemData.value.cpf_cnpj_empresa,
    (newItemData) => {
        validateCPFCNPJ();
        if (newItemData.replace(/([^\d])+/gim, '').length == 14) {
            registroTipo.value = 'pj';
            labels.value.razaosocial = 'Razão Social';
            labels.value.fantasia = 'Nome Fantasia';
            labels.value.cpf_cnpj_empresa = 'CNPJ';
            labels.value.ie = 'Inscrição Estadual';
        } else {
            registroTipo.value = 'pf';
            labels.value.razaosocial = 'Nome';
            labels.value.fantasia = 'Nome Social';
            labels.value.cpf_cnpj_empresa = 'CPF';
            labels.value.ie = 'RG';
        }
    }
);
const menu = ref();
const preview = ref(false);
const items = ref([
    {
        label: 'Alterar a logomarca',
        icon: 'fa-solid fa-upload',
        command: () => {
            showUploadForm();
        }
    }
]);
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
import Uploads from '@/components/Uploads.vue';

const showUploadForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'empresa',
            registro_id: itemData.value.id,
            schema: uProf.value.schema_name,
            field: 'id_uploads_logo',
            footerMsg: 'O tamanho máximo do arquivo é de 1MB e 250 x 250px.'
        },
        props: {
            header: `Alterar a logomarca da empresa`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '95vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            setTimeout(() => {
                defaultSuccess('Por favor aguarde! Atualizando imagem...');
                window.location.reload();
            }, 3000);
        }
    });
};

const onImageRightClick = (event) => {
    menu.value.show(event);
};
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[
        { label: 'Todas as Empresas', to: `/${uProf.schema_description}/empresas` },
        { label: itemData.razaosocial + (uProf.admin >= 2 ? `: (${itemData.id})` : ''), to: route.fullPath }
    ]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-3">
                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                    <Image v-else
                        :src="`${itemData.url_logo ? itemData.url_logo : '/assets/images/DefaultLogomarca.png'}`"
                        width="250" alt="Logomarca" :preview="preview" id="url_logo" @contextmenu="onImageRightClick" />
                    <ContextMenu ref="menu" :model="items" />
                </div>
                <div class="col-9">
                    <div class="p-fluid grid">
                        <div class="col-12">
                            <label for="razaosocial">{{ labels.razaosocial }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'"
                                v-model="itemData.razaosocial" id="razaosocial" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.razaosocial">{{
                                errorMessages.razaosocial }}</small>
                        </div>
                        <div class="col-12 md:col-5">
                            <label for="fantasia">{{ labels.fantasia }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.fantasia"
                                id="fantasia" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="cpf_cnpj_empresa">{{ labels.cpf_cnpj_empresa }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <InputText autocomplete="no" :disabled="mode == 'view'" v-maska
                                    data-maska="['###.###.###-##', '##.###.###/####-##']"
                                    v-model="itemData.cpf_cnpj_empresa" id="cpf_cnpj_empresa" type="text" />
                                <Button v-if="registroTipo == 'pj'" :disabled="mode == 'view'"
                                    :icon="`fa-solid fa-arrows-rotate${!(mode == 'view') ? ' fa-spin' : ''}`"
                                    v-tooltip.top="'Clique para buscar os dados públicos'" class="bg-blue-500"
                                    @click="buscarCNPJ()" />
                            </div>
                            <small id="text-error" class="p-error" v-if="errorMessages.cpf_cnpj_empresa">{{
                                errorMessages.cpf_cnpj_empresa }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="cep">CEP</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cep"
                                id="cep" type="text" @blur="buscarCEP" />
                            <small id="text-error" class="p-error" v-if="errorMessages.cep">{{ errorMessages.cep
                                }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="nr">Número</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nr" id="nr"
                                type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.nr">{{ errorMessages.nr
                                }}</small>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-2">
                            <label for="complnr">Complemento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.complnr"
                                id="complnr" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="logradouro">Logradouro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.logradouro"
                                id="logradouro" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="bairro">Bairro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.bairro"
                                id="bairro" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="cidade">Cidade</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cidade"
                                id="cidade" type="text" />
                        </div>
                        <div class="col-12 md:col-1">
                            <label for="uf">UF</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.uf" id="uf"
                                type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="ie">{{ labels.ie }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ie" id="ie"
                                type="text" />
                        </div>
                        <!-- <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="ie_st">I.E. do Substituto Tributário</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ie_st" id="ie_st" type="text" />
                        </div> -->
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="im">Inscrição Municipal</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.im" id="im"
                                type="text" />
                        </div>
                        <!-- <div class="col-12 md:col-2" v-if="registroTipo == 'pj'">
                            <label for="cnae">CNAE</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cnae" id="cnae" type="text" />
                        </div> -->
                        <div class="col-12 md:col-2" v-if="registroTipo == 'pj'">
                            <label for="contato">Contato da Empresa</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato"
                                id="contato" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="tel1">Telefone 1</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska
                                data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.tel1" id="tel1"
                                type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.tel1">{{ errorMessages.tel1
                                }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="tel2">Telefone 2</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska
                                data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.tel2" id="tel2"
                                type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.tel2">{{ errorMessages.tel2
                                }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="email">Email</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email"
                                id="email" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email
                                }}</small>
                        </div>
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="email_at">Email da Assistência Técnica</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_at"
                                id="email_at" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_at">{{
                                errorMessages.email_at }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="email_comercial">Email Comercial</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'"
                                v-model="itemData.email_comercial" id="email_comercial" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_comercial">{{
                                errorMessages.email_comercial }}</small>
                        </div>
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="email_financeiro">Email Financeiro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'"
                                v-model="itemData.email_financeiro" id="email_financeiro" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_financeiro">{{
                                errorMessages.email_financeiro }}</small>
                        </div>
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="email_rh">Email do RH</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_rh"
                                id="email_rh" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_rh">{{
                                errorMessages.email_rh }}</small>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar"
                            icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk"
                            severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban"
                            severity="danger" text raised @click="reload" />
                    </div>
                </div>
                <div class="card bg-green-200 mt-3" v-if="uProf.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                    <p>dadosPublicos: {{ dadosPublicos }}</p>
                </div>
            </div>
        </form>
    </div>
</template>
