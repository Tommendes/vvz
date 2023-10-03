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

// import { Mask } from 'maska';
// const masks = ref({
//     cpf_cnpj_empresa: new Mask({
//         mask: ['###.###.###-##', '##.###.###/####-##']
//     }),
//     telefone: new Mask({
//         mask: ['(##) ####-####', '(##) #####-####']
//     }),
//     cep: new Mask({
//         mask: '#####-###'
//     })
// });

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
    id_cadastros: "Id",
    email_destinatario: "Email",
    registro: "Registro",
    titulo: "Título",
    e_s: "Movimento",
    descricao: "Descrição"

    // razaosocial: 'Razão Social',
    // fantasia: 'Nome Fantasia',
    // cpf_cnpj_empresa: 'CPF',
    // ie: 'Inscrição Estadual',
    // ie_st: 'Inscrição Estadual do substituto tributário',
    // im: 'Inscrição Municipal',
    // cnae: 'CNAE',
    // cep: 'CEP',
    // logradouro: 'Logradouro',
    // nr: 'Número',
    // complnr: 'Complemento',
    // bairro: 'Bairro',
    // cidade: 'Cidade',
    // uf: 'UF',
    // contato: 'Contato da Empresa',
    // tel1: 'Telefone 1',
    // tel2: 'Telefone 2',
    // email: 'Email',
    // email_at: 'Email da atendente',
    // email_comercial: 'Email Comercial',
    // email_financeiro: 'Email Financeiro',
    // email_rh: 'Email do RH',
    // id_cadas_resplegal: 'Responsável legal perante a Receita Federal',
    // url_logo: 'Logomarca da Empresa'
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
const urlBase = ref(`${baseApiUrl}/protocolo`);
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
                // if (itemData.value.cpf_cnpj_empresa) itemData.value.cpf_cnpj_empresa = masks.value.cpf_cnpj_empresa.masked(itemData.value.cpf_cnpj_empresa);
                // if (itemData.value.cep) itemData.value.cep = masks.value.cep.masked(itemData.value.cep);
                // if (itemData.value.tel1) itemData.value.tel1 = masks.value.telefone.masked(itemData.value.tel1);
                // if (itemData.value.tel2) itemData.value.tel2 = masks.value.telefone.masked(itemData.value.tel2);
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/protocolo` });
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
        // if (itemData.value.cpf_cnpj_empresa) itemData.value.cpf_cnpj_empresa = masks.value.cpf_cnpj_empresa.unmasked(itemData.value.cpf_cnpj_empresa);
        // if (itemData.value.te1) itemData.value.tel1 = masks.value.telefone.unmasked(itemData.value.tel1);
        // if (itemData.value.te2) itemData.value.tel2 = masks.value.telefone.unmasked(itemData.value.tel2);
        // if (itemData.value.cep) itemData.value.cep = masks.value.cep.unmasked(itemData.value.cep);
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/protocolo/${itemData.value.id}` });
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
// // Validar a existência do nome do cliente
// const validateRazaoSocial = () => {
//     if (itemData.value.razaosocial && typeof itemData.value.razaosocial.trim() == 'string' && itemData.value.razaosocial.trim().length > 0) errorMessages.value.razaosocial = null;
//     else errorMessages.value.razaosocial = 'Nome ou razão social inválidos';
//     return !errorMessages.value.razaosocial;
// };
// // Validar CPF
// const validateCPFCNPJ = () => {
//     const toValidate = masks.value.cpf_cnpj_empresa.unmasked(itemData.value.cpf_cnpj_empresa);
//     if (cpf.isValid(toValidate) || cnpj.isValid(toValidate)) errorMessages.value.cpf_cnpj_empresa = null;
//     else errorMessages.value.cpf_cnpj_empresa = 'CPF/CNPJ informado é inválido';
//     return !errorMessages.value.cpf_cnpj_empresa;
// };
// // Validar Cep
// const validateCep = () => {
//     if (itemData.value.cep && itemData.value.cep.replace(/([^\d])+/gim, '').length == 8) errorMessages.value.cep = null;
//     else errorMessages.value.cep = 'Formato de cep inválido';
//     return !errorMessages.value.cep;
// };
// Validar email
const validateEmail = (field) => {
    if (itemData.value.email_destinatario && itemData.value.email_destinatario.trim().length > 0 && !isValidEmail(itemData.value.email_destinatario)) {
        errorMessages.value.email_destinatario = 'Formato de email inválido';
    } else errorMessages.value.email_destinatario = null;
    return !errorMessages.value.email_destinatario;
};
// // Validar telefone
// const validateTelefone = (field) => {
//     if (itemData.value[field] && itemData.value[field].trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value[field]).length)) {
//         errorMessages.value[field] = 'Formato de telefone inválido';
//     } else errorMessages.value[field] = null;
//     return !errorMessages.value[field];
// };
// const validator = () => {
//     let isValid = true;
//     [
//         { field: 'email', validator: 'email' },
//         { field: 'email_at', validator: 'email' },
//         { field: 'email_comercial', validator: 'email' },
//         { field: 'email_financeiro', validator: 'email' },
//         { field: 'email_rh', validator: 'email' },
//         { field: 'tel1', validator: 'telefone' },
//         { field: 'tel2', validator: 'telefone' }
//     ].forEach((element) => {
//         if (element.validator == 'email' && !validateEmail(element.field)) {
//             isValid = false;
//         } else if (element.validator == 'telefone' && !validateTelefone(element.field)) {
//             isValid = false;
//         }
//     });
//     return isValid;
// };
// Validar formulário
const formIsValid = () => {
    return validateEmail();
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
    // validateRazaoSocial();
    // validator();
    // validateCep();
});
// watch(
//     () => itemData.value.cpf_cnpj_empresa,
//     (newItemData) => {
//         // validateCPFCNPJ();
//         if (newItemData.replace(/([^\d])+/gim, '').length == 14) {
//             registroTipo.value = 'pj';
//             labels.value.razaosocial = 'Razão Social';
//             labels.value.fantasia = 'Nome Fantasia';
//             labels.value.cpf_cnpj_empresa = 'CNPJ';
//             labels.value.ie = 'Inscrição Estadual';
//         } else {
//             registroTipo.value = 'pf';
//             labels.value.razaosocial = 'Nome';
//             labels.value.fantasia = 'Nome Social';
//             labels.value.cpf_cnpj_empresa = 'CPF';
//             labels.value.ie = 'RG';
//         }
//     }
// );
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
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Protocolos', to: `/${userData.cliente}/${userData.dominio}/protocolos` }, { label: itemData.titulo + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-1">
                            <label for="id_cadastros">{{ labels.id_cadastros }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastros" id="id_cadastros" type="text" />
                        </div>
                        <div class="col-6">
                            <label for="titulo">{{ labels.titulo }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.titulo" id="titulo" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="registro">{{ labels.registro }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.registro" id="registro" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="email_destinatario">{{ labels.email_destinatario }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_destinatario" id="email_destinatario" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_destinatario">{{ errorMessages.email_destinatario || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="e_s">{{ labels.e_s }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.e_s" id="e_s" type="text" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="descricao">{{ labels.descricao }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao" id="descricao" type="text" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
