<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

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

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

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
    cep: 'CEP',
    logradouro: 'Logradouro',
    nr: 'Número',
    complnr: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    uf: 'UF',
    contato: 'Contato da Empresa',
    tel1: 'Telefone 1',
    tel2: 'Telefone 2',
    email: 'Email',
    email_at: 'Email da atendente',
    email_comercial: 'Email Comercial',
    email_financeiro: 'Email Financeiro',
    email_rh: 'Email do RH',
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
                    itemDataComparision.value = { ...itemData.value };
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
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        // errorMessages.value = {};
    }
    return ret;
};
// Validar a existência do nome do cliente
const validateRazaoSocial = () => {
    if (itemData.value.razaosocial && typeof itemData.value.razaosocial.trim() == 'string' && itemData.value.razaosocial.trim().length > 0) errorMessages.value.razaosocial = null;
    else errorMessages.value.razaosocial = 'Nome ou razão social inválidos';
    return !errorMessages.value.razaosocial;
};
// Validar CPF
const validateCPFCNPJ = () => {
    const toValidate = masks.value.cpf_cnpj_empresa.unmasked(itemData.value.cpf_cnpj_empresa);
    if (cpf.isValid(toValidate) || cnpj.isValid(toValidate)) errorMessages.value.cpf_cnpj_empresa = null;
    else errorMessages.value.cpf_cnpj_empresa = 'CPF/CNPJ informado é inválido';
    return !errorMessages.value.cpf_cnpj_empresa;
};
// Validar Cep
const validateCep = () => {
    if (itemData.value.cep && itemData.value.cep.replace(/([^\d])+/gim, '').length == 8) errorMessages.value.cep = null;
    else errorMessages.value.cep = 'Formato de cep inválido';
    return !errorMessages.value.cep;
};
// Validar email
const validateEmail = (field) => {
    if (itemData.value[field] && itemData.value[field].trim().length > 0 && !isValidEmail(itemData.value[field])) {
        errorMessages.value[field] = 'Formato de email inválido';
    } else errorMessages.value[field] = null;
    return !errorMessages.value[field];
};
// Validar telefone
const validateTelefone = (field) => {
    if (itemData.value[field] && itemData.value[field].trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value[field]).length)) {
        errorMessages.value[field] = 'Formato de telefone inválido';
    } else errorMessages.value[field] = null;
    return !errorMessages.value[field];
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
// Validar formulário
const formIsValid = () => {
    return validateRazaoSocial() && validateCPFCNPJ() && validateCep() && validator();
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
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
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
        label: 'View',
        icon: 'pi pi-fw pi-search',
        command: () => {
            alert('Enviar nova imagem');
        }
    },
    {
        label: 'Delete',
        icon: 'pi pi-fw pi-trash',
        command: () => {
            alert('Excluir imagem');
        }
    }
]);

const onImageRightClick = (event) => {
    menu.value.show(event);
};
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Empresas', to: `/${userData.cliente}/${userData.dominio}/empresa` }, { label: itemData.razaosocial + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-3">
                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                    <Image v-else :src="`${itemData.url_logo ? itemData.url_logo : '/assets/images/AddressBook.jpg'}`" width="250" alt="Logomarca" :preview="preview" id="url_logo" @contextmenu="onImageRightClick" />
                    <ContextMenu ref="menu" :model="items" />
                </div>
                <div class="col-9">
                    <div class="p-fluid grid">
                        <div class="col-12">
                            <label for="razaosocial">{{ labels.razaosocial }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.razaosocial" id="razaosocial" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.razaosocial">{{ errorMessages.razaosocial || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-5">
                            <label for="fantasia">{{ labels.fantasia }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.fantasia" id="fantasia" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="cpf_cnpj_empresa">{{ labels.cpf_cnpj_empresa }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['###.###.###-##', '##.###.###/####-##']" v-model="itemData.cpf_cnpj_empresa" id="cpf_cnpj_empresa" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.cpf_cnpj_empresa">{{ errorMessages.cpf_cnpj_empresa || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="cep">CEP</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="#####-###" v-model="itemData.cep" id="cep" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.cep">{{ errorMessages.cep || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="nr">Número</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nr" id="nr" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.nr">{{ errorMessages.nr || '&nbsp;' }}</small>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-2">
                            <label for="complnr">Complemento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.complnr" id="complnr" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="logradouro">Logradouro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.logradouro" id="logradouro" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="bairro">Bairro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.bairro" id="bairro" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="cidade">Cidade</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cidade" id="cidade" type="text" />
                        </div>
                        <div class="col-12 md:col-1">
                            <label for="uf">UF</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.uf" id="uf" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="ie">{{ labels.ie }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ie" id="ie" type="text" />
                        </div>
                        <!-- <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="ie_st">I.E. do Substituto Tributário</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ie_st" id="ie_st" type="text" />
                        </div> -->
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="im">Inscrição Municipal</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.im" id="im" type="text" />
                        </div>
                        <!-- <div class="col-12 md:col-2" v-if="registroTipo == 'pj'">
                            <label for="cnae">CNAE</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cnae" id="cnae" type="text" />
                        </div> -->
                        <div class="col-12 md:col-2" v-if="registroTipo == 'pj'">
                            <label for="contato">Contato da Empresa</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato" id="contato" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="tel1">Telefone 1</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.tel1" id="tel1" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.tel1">{{ errorMessages.tel1 || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="tel2">Telefone 2</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.tel2" id="tel2" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.tel2">{{ errorMessages.tel2 || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="email">Email</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="email" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="email_at">Email da Assistência Técnica</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_at" id="email_at" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_at">{{ errorMessages.email_at || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="email_comercial">Email Comercial</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_comercial" id="email_comercial" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_comercial">{{ errorMessages.email_comercial || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="email_financeiro">Email Financeiro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_financeiro" id="email_financeiro" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_financeiro">{{ errorMessages.email_financeiro || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3" v-if="registroTipo == 'pj'">
                            <label for="email_rh">Email do RH</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_rh" id="email_rh" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_rh">{{ errorMessages.email_rh || '&nbsp;' }}</small>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
