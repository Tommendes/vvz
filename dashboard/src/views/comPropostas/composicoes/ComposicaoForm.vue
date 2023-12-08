<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

import moment from 'moment';

// Campos de formulário
const itemData = ref({
});
const dataRegistro = ref('');
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(false);
// Editar cadastro no autocomplete
const editCadastro = ref(false);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prop-compos`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;
            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
                    loading.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/proposta/${route.params.id}` });
                }
            });
        } else loading.value = false;
    }, Math.random() * 1000 + 250);
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
                    if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/proposta/${itemData.value.id}` });
                    dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
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

//DropDown
const dropdownCompValor = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
</script>

<template>
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-6">
                            <label for="id_com_propostas">Proposta</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'"
                                v-model="itemData.id_com_propostas" id="id_com_propostas" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="compoe_valor">Compõe Valor</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="compoe_valor" :disabled="mode == 'view'" placeholder="Selecione o período"
                                optionLabel="label" optionValue="value" v-model="itemData.compoe_valor"
                                :options="dropdownCompValor" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="ordem">Ordem de composições</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ordem"
                                id="ordem" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="compos_nr">Número da composição</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.compos_nr"
                                id="compos_nr" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="localizacao">Localização do produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.localizacao"
                                id="localizacao" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="tombamento">Tombamento do produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tombamento"
                                id="tombamento" type="text" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar"
                            icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text
                            raised :disabled="!formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text
                        raised @click="reload" />
                </div>
            </div>
        </div>
    </form>
    </div>
</template>
