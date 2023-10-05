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
    // cpf_cnpj_empresa: new Mask({
    //     mask: ['###.###.###-##', '##.###.###/####-##']
    // }),
    // telefone: new Mask({
    //     mask: ['(##) ####-####', '(##) #####-####']
    // }),
    data_visita: new Mask({
        mask: '##/##/####'
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
    id_agente: "Identificador Agente",
    id_cadastros: "Identificador Cadastro",
    id_cad_end: " Identificador do Endereço",
    pessoa: "Pessoa Contatada",
    contato: "Forma de Contato",
    periodo: "Período da Visita",
    data_visita: "Data da Visita",
    observacoes: "Observações"
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
const urlBase = ref(`${baseApiUrl}/com-prospeccoes`);
// function convertNumberToTurno(value) {
//     switch (value) {
//         case 0:
//             return 'Manhã';
//         case 1:
//             return 'Tarde';
//         case 2:
//             return 'Noite';
//         default:
//             return '';
//     }
// };
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
                // itemData.periodo = convertNumberToTurno(body.periodo);
                if (itemData.value.data_visita) itemData.value.data_visita = masks.value.data_visita.masked(itemData.value.data_visita);
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}prospeccao` });
            }
        });
    } else loading.value.form = false;
};
// Função para converter o nome do turno para o valor numérico
// function convertTurnoToNumber(turno) {
//     switch (turno) {
//         case 'Manhã':
//             return 0;
//         case 'Tarde':
//             return 1;
//         case 'Noite':
//             return 2;
//         default:
//             return -1; // Valor inválido
//     }
// };
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        // itemData.periodo = convertTurnoToNumber(itemData.periodo);
        if (itemData.value.data_visita) itemData.value.data_visita = masks.value.data_visita.unmasked(itemData.value.data_visita);
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}prospeccao/${itemData.value.id}` });
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
// Validar a existência de pessoa contatada
const validatePessoa = () => {
    if (itemData.value.pessoa && typeof itemData.value.pessoa.trim() == 'string' && itemData.value.pessoa.trim().length > 0) errorMessages.value.pessoa = null;
    else errorMessages.value.pessoa = 'Nome ou razão social inválidos';
    return !errorMessages.value.pessoa;
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
// const validateEmail = (field) => {
//     if (itemData.value.email_destinatario && itemData.value.email_destinatario.trim().length > 0 && !isValidEmail(itemData.value.email_destinatario)) {
//         errorMessages.value.email_destinatario = 'Formato de email inválido';
//     } else errorMessages.value.email_destinatario = null;
//     return !errorMessages.value.email_destinatario;
// };
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
    return validatePessoa();
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Prospecções', to: `/${userData.cliente}/${userData.dominio}/prospeccoes` }, { label: itemData.titulo + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-4">
                            <label for="id_agente">{{ labels.id_agente }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_agente" id="id_agente" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="id_cadastros">{{ labels.id_cadastros }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastros" id="id_cadastros" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="id_cad_end">{{ labels.id_cad_end }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cad_end" id="id_cad_end" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="pessoa">{{ labels.pessoa }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="contato">{{ labels.contato }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato" id="contato" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="periodo">{{ labels.periodo }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.periodo" id="periodo" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="data_visita">{{ labels.data_visita }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska='##/##/####' v-model="itemData.data_visita" id="data_visita" type="text" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="observacoes">{{ labels.observacoes }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.observacoes" id="observacoes" type="text" />
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
