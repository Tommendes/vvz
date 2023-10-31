<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
import moment from 'moment';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { Mask } from 'maska';
const masks = ref({
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

// Campos de formulário
const itemData = ref({});
const labels = ref({
    id_agente: 'Agente',
    id_cadastros: 'Cadastro',
    id_cad_end: 'Endereço',
    pessoa: 'Pessoa Contatada',
    contato: 'Forma de Contato',
    periodo: 'Período da Visita',
    data_visita: 'Data da Visita',
    observacoes: 'Observações'
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
// DropDown
const dropdownAgentes = ref([]);
// const dropdownCadastros = ref([]);
const cadastro = ref("");
// const cadastros = ref([]);
const dropdownEnderecos = ref([]);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prospeccoes`);
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
                if (itemData.value.data_visita) itemData.value.data_visita = masks.value.data_visita.masked(moment(itemData.value.data_visita).format('DD/MM/YYYY'));
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}prospeccao` });
            }
        });
    } else loading.value.form = false;
    await listAgentes();
    await listCadastros();
    await listEnderecos();
};
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        if (itemData.value.data_visita) itemData.value.data_visita = moment(itemData.value.data_visita, 'DD/MM/YYYY').format('YYYY-MM-DD');
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    if (itemData.value.data_visita) itemData.value.data_visita = moment(itemData.value.data_visita).format('DD/MM/YYYY');
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
// Obter parâmetros do BD
// const optionParams = async (query) => {
//     const url = `${baseApiUrl}/users/f-a/${query.func}?fld=agente_v&vl=${query.dropdownAgentes ? query.dropdownAgentes : ''}&slct=${query.id , query.name}`;
//     return await axios.get(url);
// };
const dropdownPeriodo = ref([
    { value: 0, label: 'Manhã' },
    { value: 1, label: 'Tarde' }
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
// Obter parâmetros do BD
//  Parâmetros Agente
const listAgentes = async (query) => {
    const url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
    });
};
//  Parâmetros Endereços
const listEnderecos = async (query) => {
    const url = `${baseApiUrl}/cad-enderecos/f-a/glf?fld=id_cadastros&vl=${id_cadastros}&slct=id,logradouro,nr,complnr,bairro,cidade,uf`;
    await axios.get(url).then((res) => {
        dropdownEnderecos.value = [];
        res.data.data.map((item) => {
            dropdownEnderecos.value.push({ value: item.id, label: item.name });
        });
    });
};
//  Parâmetros Cadastros
const listCadastros = async (query) => {
    const url = `${baseApiUrl}/cadastros/f-a/glf?fld=nome&vl=tom&slct=id,nome`;
    await axios.get(url).then((res) => {
        dropdownCadastros.value = [];
        res.data.data.map((item) => {
            dropdownCadastros.value.push({ value: item.id, label: item.name });
        });
    });
};
// Carregar opções do formulário
// const loadOptions = async () => {
    // Agente
    // await optionParams({ field: 'meta', value: 'id_agente', select: 'id,label' }).then((res) => {
    //     res.data.data.map((item) => {
    //         dropdownAgentes.value.push({ value: item.id, label: item.label });
    //     });
    // });

    // Área Atuação
    //     await optionLocalParams({ field: 'grupo', value: 'id_atuacao', select: 'id,label' }).then((res) => {
    //         res.data.data.map((item) => {
    //             dropdownAtuacao.value.push({ value: item.id, label: item.label });
    //         });
    //     });
// };
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
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Prospecções', to: `/${userData.cliente}/${userData.dominio}/prospeccoes` }, { label: itemData.nome + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-8">
                            <label for="id_agente">{{ labels.id_agente }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown 
                            v-else
                            id="id_agente"
                            :disabled="mode == 'view'"
                            :showClear="!!itemData.id_agente"
                            optionLabel="label"
                            placeholder="Selecione um agente"
                            optionValue="value"
                            v-model="itemData.id_agente"
                            :options="dropdownAgentes"
                        />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="periodo">{{ labels.periodo }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="periodo" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.periodo" :options="dropdownPeriodo" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="data_visita">{{ labels.data_visita }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <!-- <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##/##/####" v-model="itemData.data_visita" id="data_visita" type="text" /> -->
                            <Calendar v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.data_visita" id="data_visita" :numberOfMonths="2" showIcon />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="id_cadastros">{{ labels.id_cadastros }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <!-- <Dropdown 
                            v-else
                            id="id_cadastros"
                            :disabled="mode == 'view'"
                            :showClear="!!itemData.id_cadastros"
                            optionLabel="label"
                            placeholder="Selecione um cadastro"
                            optionValue="value"
                            v-model="itemData.id_cadastros"
                            :options="dropdownCadastros"/> -->

                            <AutoComplete
                            v-else id="id_cadastros"
                            :disabled="mode == 'view'"
                            :showClear="!!itemData.id_cadastros"
                            optionLabel="label"
                            optionValue="value"
                            v-model="itemData.id_cadastros"
                            :suggestions="cadastros"
                            @complete="search" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="id_cad_end">{{ labels.id_cad_end }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown
                            v-else
                            id="id_cad_end"
                            :disabled="mode == 'view'"
                            :showClear="!!itemData.id_cad_end"
                            optionLabel="label"
                            placeholder="Selecione um endereço"
                            optionValue="value"
                            v-model="itemData.id_cad_end"
                            :options="dropdownEnderecos" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="pessoa">{{ labels.pessoa }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="contato">{{ labels.contato }}</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato" id="contato" type="text" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="observacoes">{{ labels.observacoes }}</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.observacoes" id="observacoes" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.observacoes" class="p-inputtext p-component p-filled"></p>
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
