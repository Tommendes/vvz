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
    descricao: "Descrição abreviada do parâmetro",
    bi_index: "Apresentação em BI",
    doc_venda: "É documento de venda",
    autom_nr: "Numeracao automatica  ",
    gera_baixa: "Pode ser convertido em pedido  ",
    tipo_secundario: "Tipo secundário",
    obrig_valor: "Obrigatorio declarar valor",
    reg_agente: "Obrigatório agente",
    id_logo: "logomarca representada",
    gera_pasta: "Gera pasta", // (0=Não, 1=Documento, 2=documento_baixa)
    proposta_interna: "Utiliza o sistema de proposta interna"
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
const urlBase = ref(`${baseApiUrl}/pipeline-params`);
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
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline_params` });
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
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline_params/${itemData.value.id}` });
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
const dropdownGeraPasta = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Documento'},
    { value: 2, label: "Documento Baixa"}
]);
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Parâmetros', to: `/${userData.cliente}/${userData.dominio}/pipeline_params` }, { label: itemData.registro + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-4">
                            <label for="descricao">{{ labels.descricao }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao" id="descricao" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="bi_index">{{ labels.bi_index }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.bi_index" id="bi_index" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="doc_venda">{{ labels.doc_venda }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.doc_venda" id="doc_venda" type="text" />
                            <!-- <small id="text-error" class="p-error" v-if="errorMessages.doc_venda">{{ errorMessages.doc_venda || '&nbsp;' }}</small> -->
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="autom_nr">{{ labels.autom_nr }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.autom_nr" id="autom_nr" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="gera_baixa">{{ labels.gera_baixa }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.gera_baixa" id="gera_baixa" type="text" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="tipo_secundario">{{ labels.tipo_secundario }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tipo_secundario" id="tipo_secundario" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="obrig_valor">{{ labels.obrig_valor }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.obrig_valor" id="obrig_valor" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="reg_agente">{{ labels.reg_agente }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.reg_agente" id="reg_agente" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_logo">{{ labels.id_logo }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_logo" id="id_logo" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="gera_pasta">{{ labels.gera_pasta }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="gera_pasta" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_pasta" :options="dropdownGeraPasta" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="proposta_interna">{{ labels.proposta_interna }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.proposta_interna" id="proposta_interna" type="text" />
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
