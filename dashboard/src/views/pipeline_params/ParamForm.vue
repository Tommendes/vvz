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

import { useToast } from "primevue/usetoast";
const toast = useToast();

// Envio da logo com componente PrimeVue
const onUpload = (event) => {
    const uploadedFile = event.files[0]; // Envio do arquivo URL
    if (uploadedFile) {
        // Atualize o campo id_logo com a URL do arquivo carregado
        itemData.id_logo = uploadedFile.objectURL;
    }
};
// Campos de formulário
const itemData = ref({});
const registroTipo = ref('pf');
const labels = ref({
    descricao: "Descrição abreviada do parâmetro",
    bi_index: "Apresentação em BI",
    doc_venda: "É documento de venda",
    autom_nr: "Numeracao automatica  ",
    gera_baixa: "Pode ser solicitado",
    tipo_secundario: "Tipo secundário",
    obrig_valor: "Obrigatorio declarar valor",
    reg_agente: "Obrigatório agente",
    id_logo: "logomarca representada",
    gera_pasta: "Gera pasta", // (0=Não, 1=Documento, 2=documento_baixa)
    proposta_interna: "Usa sistema interno"
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
// Opções de DropDown do Form
const dropdownApresentacaoBi = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não'}
]);
const dropdownDocVenda = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'É proposta'},
    { value: 2, label: 'É pedido'}
]);
const dropdownAutomNum = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não'}
]);
const dropdownGeraBaixa = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não'}
]);
const dropdownTipoSec = ref([
    { value: 0, label: 'Não há' }
]);
const dropdownObrigValor = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não'}
]);
const dropdownObrigAgente = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não'}
]);
const dropdownGeraPasta = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Para o documento'},
    { value: 2, label: "Para o pedido"}
]);
const dropdownPropInterna = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não'}
]);
// Validar formulário
const formIsValid = () => {
    return true;
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Parâmetros', to: `/${userData.cliente}/${userData.dominio}/pipeline_params` }, { label: itemData.registro + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-12">
                            <label for="descricao">{{ labels.descricao }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao" id="descricao" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="bi_index">{{ labels.bi_index }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="bi_index" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.bi_index" :options="dropdownApresentacaoBi" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="doc_venda">{{ labels.doc_venda }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="doc_venda" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.doc_venda" :options="dropdownDocVenda" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="autom_nr">{{ labels.autom_nr }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="autom_nr" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.autom_nr" :options="dropdownAutomNum" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="gera_baixa">{{ labels.gera_baixa }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Dropdown v-else id="gera_baixa" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_baixa" :options="dropdownGeraBaixa" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="tipo_secundario">{{ labels.tipo_secundario }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Dropdown v-else id="tipo_secundario" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.tipo_secundario" :options="dropdownTipoSec" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="obrig_valor">{{ labels.obrig_valor }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="obrig_valor" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.obrig_valor" :options="dropdownObrigValor" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="reg_agente">{{ labels.reg_agente }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="reg_agente" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.reg_agente" :options="dropdownObrigAgente" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="gera_pasta">{{ labels.gera_pasta }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="gera_pasta" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_pasta" :options="dropdownGeraPasta" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="proposta_interna">{{ labels.proposta_interna }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="proposta_interna" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.proposta_interna" :options="dropdownPropInterna" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="id_logo">{{ labels.id_logo }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_logo" id="id_logo" type="text" />
                        </div>

                        <!-- logo carregada -->
                        <!-- <div class="col-12 md:col-4">
                            <label for="id_logo">{{ labels.id_logo }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <FileUpload
                                v-else
                                mode="basic"
                                name="logo"
                                url="./upload.php"
                                accept="image/*"
                                :disabled="mode == 'view'"
                                :maxFileSize="1000000"
                                @upload="onUpload"
                                chooseLabel="Carregar"
                            />
                        </div> -->
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
