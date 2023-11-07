<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import moment from 'moment';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { useToast } from "primevue/usetoast";
const toast = useToast();

// Campos de formulário
const itemData = ref({});
const registroTipo = ref('pf');
const labels = ref({
    id_pv: "ID do pv",
    id_cadastro_endereco: "Endereço do atendimento",
    id_tecnico: "Técnico responsável",
    nr_oat: "OAT",
    int_ext: "Interno/Externo",
    garantia: "Garantia",
    nf_garantia: "Nota fiscal do produto",
    pessoa_contato: "Contato no cliente",
    telefone_contato: "Telefone do contato",
    email_contato: "Email do contato",
    valor_total: "Valor dos serviços",
    aceite_do_cliente: "Data do aceite",
    descricao: "Descrição dos serviços"
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
const urlBase = ref(`${baseApiUrl}/pv-oat`);
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
                itemDataComparision.value = { ...itemData.value };
                if (itemData.value.telefone_contato) itemData.value.telefone_contato = masks.value.telefone.masked(itemData.value.telefone_contato);
                if (itemData.value.aceite_do_cliente) itemData.value.aceite_do_cliente = masks.value.aceite_do_cliente.masked(moment(itemData.value.aceite_do_cliente).format('DD/MM/YYYY'));
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/montagens` });
            }
        });
    } else loading.value.form = false;
};
// DropDown
const dropdownIntExt = ref([
    { value: 0, label: 'Interno' },
    { value: 1, label: 'Externo' }
]);
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        if (itemData.value.telefone_contato) itemData.value.telefone_contato = masks.value.telefone.unmasked(itemData.value.telefone_contato);
        if (itemData.value.aceite_do_cliente) itemData.value.aceite_do_cliente = moment(itemData.value.aceite_do_cliente, 'DD/MM/YYYY').format('YYYY-MM-DD');
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    if (itemData.value.aceite_do_cliente) itemData.value.aceite_do_cliente = moment(itemData.value.aceite_do_cliente).format('DD/MM/YYYY');
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/montagem/${itemData.value.id}` });
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
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.telefone_contato && itemData.value.telefone_contato.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone_contato).length)) {
        errorMessages.value.telefone_contato = 'Formato de telefone inválido';
    } else errorMessages.value.telefone_contato = null;
    return !errorMessages.value.telefone_contato;
};
// Validar email
const validateEmail = (field) => {
    if (itemData.value.email_contato && itemData.value.email_contato.trim().length > 0 && !isValidEmail(itemData.value.email_contato)) {
        errorMessages.value.email_contato = 'Formato de email inválido';
    } else errorMessages.value.email_contato = null;
    return !errorMessages.value.email_contato;
};
// Validar formulário
const formIsValid = () => {
    return validateTelefone() && validateEmail();
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
});
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Montagem', to: `/${userData.cliente}/${userData.dominio}/montagens` }, { label: itemData.id_pv + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-3">
                            <label for="id_pv">{{ labels.id_pv }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pv" id="id_pv" type="text" />
                        </div>
                        <div class="col-12 md:col-5">
                            <label for="id_cadastro_endereco">{{ labels.id_cadastro_endereco }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastro_endereco" id="id_cadastro_endereco" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="id_tecnico">{{ labels.id_tecnico }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_tecnico" id="id_tecnico" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="nr_oat">{{ labels.nr_oat }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nr_oat" id="nr_oat" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="int_ext">{{ labels.int_ext }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="int_ext" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.int_ext" :options="dropdownIntExt" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="garantia">{{ labels.garantia }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.garantia" id="garantia" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="nf_garantia">{{ labels.nf_garantia }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nf_garantia" id="nf_garantia" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="pessoa_contato">{{ labels.pessoa_contato }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa_contato" id="pessoa_contato" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="telefone_contato">{{ labels.telefone_contato }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']"  v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="email_contato">{{ labels.email_contato }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="valor_total">{{ labels.valor_total }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_total" id="valor_total" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="aceite_do_cliente">{{ labels.aceite_do_cliente }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Calendar v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.aceite_do_cliente" id="aceite_do_cliente" :numberOfMonths="2" showIcon />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="descricao">{{ labels.descricao }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao" class="p-inputtext p-component p-filled"></p>
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