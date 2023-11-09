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

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

// Campos de formulário
const itemData = ref({});
const registroTipo = ref('pf');
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
// Opções de DropDown de Movimento
const dropdownMovimento = ref([
    { value: 'e', label: 'Entrada' },
    { value: 's', label: 'Saída'}
]);
// Validar email
const validateEmail = (field) => {
    if (itemData.value.email_destinatario && itemData.value.email_destinatario.trim().length > 0 && !isValidEmail(itemData.value.email_destinatario)) {
        errorMessages.value.email_destinatario = 'Formato de email inválido';
    } else errorMessages.value.email_destinatario = null;
    return !errorMessages.value.email_destinatario;
};
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Protocolos', to: `/${userData.cliente}/${userData.dominio}/protocolos` }, { label: itemData.registro + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12" v-if="itemData.registro" style="margin: 0">
                            <h3>Número do Registro: {{ itemData.registro }}</h3>
                        </div>
                        <!-- <div class="col-12 md:col-9">
                            <label for="id_cadastros">Cliente</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="(editCadastro || mode == 'new')" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button icon="pi pi-pencil" severity="primary" @click="confirmEditAutoSuggest('cadastro')" :disabled="mode == 'view'" />
                            </div>
                        </div> -->
                        <!-- primeiro: -->
                        <div class="col-12 md:col-6">
                            <label for="id_cadastros">Registro do Destinatário no Cadastro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastros" id="id_cadastros" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="titulo">Título do Protocolo</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.titulo" id="titulo" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="email_destinatario">Email do Destinatário</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_destinatario" id="email_destinatario" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_destinatario">{{ errorMessages.email_destinatario || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="e_s">Movimento</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Dropdown v-else id="e_s" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.e_s" :options="dropdownMovimento" />
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.descricao || ['edit', 'new'].includes(mode)">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                        <p>{{ route.name }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
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
