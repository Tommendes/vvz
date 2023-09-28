<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import moment from 'moment';

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

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

// Validar o cpf_cnpj
import { cpf, cnpj } from 'cpf-cnpj-validator';

// Campos de formulário
const itemData = ref({});
const labels = ref({
    razaosocial: 'Razão Social',
    fantasia: 'Nome Fantasia',
    cpf_cnpj_empresa: 'CPF',
    ie: 'Inscrição Estadual',
    ie_st: 'Inscrição Estadual do substituto tributário',
    im: 'Inscrição Municipal',
    cnae: 'CNAE',
    cep: 'CEP',
    logradouro: 'Logradouro',
    nr: 'Número',
    complnr: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    uf: 'UF',
    // ibge: '',
    // geo_ltd: '',
    // geo_lng: '',
    contato: 'Contato da Empresa',
    tel1: 'Telefone 1',
    tel2: 'Telefone 2',
    email: 'Email',
    emailAt: 'Email da atendente',
    emailComercial: 'Email Comercial',
    emailFinanceiro: 'Email Financeiro',
    emailRH: 'Email do RH',
    id_cadas_resplegal: 'Responsável legal perante a Receita Federal',
    url_logo: 'Logomarca da Empresa'
});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
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
const urlBase = ref(`${baseApiUrl}/empresa`);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        // console.log('loadData',url);
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);

                itemData.value = body;
                if (itemData.value.cpf_cnpj_empresa) itemData.value.cpf_cnpj_empresa = masks.value.cpf_cnpj_empresa.masked(itemData.value.cpf_cnpj_empresa);
                if (itemData.value.cep) itemData.value.cep = masks.value.cep.masked(itemData.value.cep);
                if (itemData.value.tel1) itemData.value.tel1 = masks.value.telefone.masked(itemData.value.tel1);
                if (itemData.value.tel2) itemData.value.tel2 = masks.value.telefone.masked(itemData.value.tel2);
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/empresa` });
            }
        });
    } else loading.value.form = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        // console.log(url);
        // console.log(JSON.stringify(itemData.value))
        if (itemData.value.cpf_cnpj_empresa) itemData.value.cpf_cnpj_empresa = masks.value.cpf_cnpj_empresa.unmasked(itemData.value.cpf_cnpj_empresa);
        if (itemData.value.te1) itemData.value.tel1 = masks.value.telefone.unmasked(itemData.value.tel1);
        if (itemData.value.te2) itemData.value.tel2 = masks.value.telefone.unmasked(itemData.value.tel2);
        if (itemData.value.cep) itemData.value.cep = masks.value.cep.unmasked(itemData.value.cep);
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    // if (itemData.value.documento) itemData.value.documento = moment(itemData.value.documento).format('DD/MM/YYYY');
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    // if (mode.value != 'new') reload();
                    // else router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastro/${itemData.value.id}` });
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/empresa/${itemData.value.id}` });
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((err) => {
                defaultWarn(err.response.data);
            });
    }
};
// Converte 1 ou 0 para boolean
const isTrue = (value) => value === 1;
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        errorMessages.value = {};
    }
    return ret;
};
// Validar CPF
const validateCPF = () => {
    if (cpf.isValid(itemData.value.cpf_cnpj_empresa) || cnpj.isValid(itemData.value.cpf_cnpj_empresa)) errorMessages.value.cpf_cnpj_empresa = null;
    else errorMessages.value.cpf_cnpj_empresa = 'CPF/CNPJ informado é inválido';
    return !errorMessages.value.cpf_cnpj_empresa;
};
// Validar email
const validateEmail = () => {
    if (itemData.value.email && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
    } else errorMessages.value.email = null;
    return !errorMessages.value.email;
};
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.tel2 && itemData.value.tel2.length > 0 && ![10, 11].includes(itemData.value.tel2.replace(/([^\d])+/gim, '').length)) {
        errorMessages.value.tel2 = 'Formato de telefone inválido';
    } else errorMessages.value.tel2 = null;
    return !errorMessages.value.tel2;
};
// Validar formulário
const formIsValid = () => {
    return validateCPF() && validateTelefone() && validateEmail() && validateEmail(itemData.value.email, 'Formato de email do campo "email" inválido') &&
        validateEmail(itemData.value.emailAt, 'Formato de email do campo "emailAt" inválido') &&
        validateEmail(itemData.value.emailComercial, 'Formato de email do campo "emailComercial" inválido') &&
        validateEmail(itemData.value.emailFinanceiro, 'Formato de email do campo "emailFinanceiro" inválido') &&
        validateEmail(itemData.value.emailRH, 'Formato de email do campo "emailRH" inválido');
    // return validateDocumento();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
    validateCPF();
    if (itemData.value.cpf_cnpj_empresa && itemData.value.cpf_cnpj_empresa.replace(/([^\d])+/gim, '').length == 14) {
        labels.value.razaosocial = 'Razão Social';
        labels.value.fantasia = 'Nome Fantasia';
        labels.value.cpf_cnpj_empresa = 'CNPJ';
        labels.value.ie = 'Inscrição Estadual';
        labels.value.valor_bruto = 'Valor Bruto';
        labels.value.status_comissao = 'Status'
        labels.value.documento = 'Data'
    } else {
        labels.value.razaosocial = 'Razão Social';
        labels.value.fantasia = 'Nome Fantasia';
        labels.value.cpf_cnpj_empresa = 'CPF';
        labels.value.ie = 'Inscrição Estadual';
        labels.value.valor_bruto = 'Valor Bruto';
        labels.value.status_comissao = 'Status'
        labels.value.documento = 'Data'
    }
});
</script>

<template>
    <div class="grid">
        <form @submit.prevent="saveData">
            <div class="col-12">
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-5">
                        <label for="razaosocial">Razão Social</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.razaosocial" id="razaosocial" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.razaosocial">{{ errorMessages.razaosocial || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="fantasia">Nome Fantasia</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.fantasia" id="fantasia" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.fantasia">{{ errorMessages.fantasia || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cpf_cnpj_empresa">{{labels.cpf_cnpj_empresa}}</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['###.###.###-##', '##.###.###/####-##']" v-model="itemData.cpf_cnpj_empresa" id="cpf_cnpj_empresa" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.cpf_cnpj_empresa">{{ errorMessages.cpf_cnpj_empresa || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="ie">Inscrição Estadual</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ie" id="ie" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.ie">{{ errorMessages.ie || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="ie_st">I.E. do Substituto Tributário</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ie_st" id="ie_st" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.ie_st">{{ errorMessages.ie_st || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="im">Inscrição Municipal</label>
                        <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.im" id="im" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.im">{{ errorMessages.im || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cnae">CNAE</label>
                        <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cnae" id="cnae" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.cnae">{{ errorMessages.cnae || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cep">CEP</label>
                        <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="#####-###" v-model="itemData.cep" id="cep" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.cep">{{ errorMessages.cep || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="nr">Número</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nr" id="nr" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.nr">{{ errorMessages.nr || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="complnr">Cmplemento</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.complnr" id="complnr" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.complnr">{{ errorMessages.complnr || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="logradouro">Logradouro</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.logradouro" id="logradouro" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.logradouro">{{ errorMessages.logradouro || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="bairro">Bairro</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.bairro" id="bairro" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.bairro">{{ errorMessages.bairro || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="cidade">Cidade</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cidade" id="cidade" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.cidade">{{ errorMessages.cidade || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-1">
                        <label for="uf">UF</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.uf" id="uf" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.uf">{{ errorMessages.uf || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="contato">Contato da Empresa</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato" id="contato" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.contato">{{ errorMessages.contato || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="url_logo">Logomarca</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.url_logo" id="url_logo" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.url_logo">{{ errorMessages.url_logo || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="tel1">Telefone 1</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.tel1" id="tel1" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.tel1">{{ errorMessages.tel1 || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="tel2">Telefone 2</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.tel2" id="tel2" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.tel2">{{ errorMessages.tel2 || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="email">Email</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="email" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="emailAt">Email da Atendente</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.emailAt" id="emailAt" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.emailAt">{{ errorMessages.emailAt || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="emailComercial">Email Comercial</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.emailComercial" id="emailComercial" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.emailComercial">{{ errorMessages.emailComercial || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="emailFinanceiro">Email Financeiro</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.emailFinanceiro" id="emailFinanceiro" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.emailFinanceiro">{{ errorMessages.emailFinanceiro || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="emailRH">Email do RH</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.emailRH" id="emailRH" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.emailRH">{{ errorMessages.emailRH || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="id_cadas_resplegal">Responsável legal perante a Receita Federal</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadas_resplegal" id="id_cadas_resplegal" type="text"/>
                        <small id="text-error" class="p-error" v-if="errorMessages.id_cadas_resplegal">{{ errorMessages.id_cadas_resplegal || '&nbsp;' }}</small>
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="pi pi-pencil" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                </div>
            </div>
        </form>
    </div>
</template>