<script setup>
import { inject, onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
// Dados do pipeline
const itemDataPipeline = inject('itemDataPipeline');
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prop-compos`);
// Carragamento de dados do form
const loadData = () => {
    loading.value = true;
    if (itemData.id) {
        if (itemData.telefone_contato) itemData.telefone_contato = masks.value.telefone.masked(itemData.telefone_contato);
        itemDataComparision.value = { ...itemData };
    }
    loading.value = false;
};
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;        
        axios[method](url, itemData.value)
            .then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemDataComparision.value = { ...itemData };
                    emit('changed');
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((error) => {
                if (typeof error.response.data == 'string') defaultWarn(error.response.data);
                else if (typeof error.response == 'string') defaultWarn(error.response);
                else if (typeof error == 'string') defaultWarn(error);
                else {
                    console.log(error);
                    defaultWarn('Erro ao carregar dados!');
                }
            });
    }
};
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData) !== JSON.stringify(itemDataComparision.value);
    return ret;
};
//DropDown Copõe Valor
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
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
});
</script>

<template>
    <form @submit.prevent="saveData">
        <div class="grid">
            <div class="col-12">
                <div class="p-fluid grid">
                    <div class="col-12 md:col-6">
                            <label for="id_com_propostas">Proposta</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_com_propostas" id="id_com_propostas" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="compoe_valor">Compõe Valor</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="compoe_valor" :disabled="mode == 'view'" placeholder="Selecione a opção" optionLabel="label" optionValue="value" v-model="itemData.compoe_valor" :options="dropdownCompValor" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="ordem">Ordem de composições</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ordem" id="ordem" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="compos_nr">Número da composição</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.compos_nr" id="compos_nr" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="localizacao">Localização do produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.localizacao" id="localizacao" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="tombamento">Tombamento do produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tombamento" id="tombamento" type="text" />
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
            <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                <h5>FormData</h5>
                <p>mode: {{ mode }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>itemDataPipeline: {{ itemDataPipeline }}</p>
            </div>
        </div>
    </form>
</template>

<!-- <script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';

// Campos de formulário
const itemData = ref({
});
const dataRegistro = ref('');
const gridDatProtoDocs = ref([]);
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
const urlBaseProtoDocs = ref(`${baseApiUrl}/com-prop-compos`);
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
                    await loadDataProtoDocs();
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
const loadDataProtoDocs = async () => {
    setTimeout(() => {
        loading.value = true;
        axios.get(`${urlBaseProtoDocs.value}/${itemData.value.id}`).then(async (axiosRes) => {
            gridDatProtoDocs.value = axiosRes.data.data;
            if (gridDatProtoDocs.value.descricao) itemDataProtDocs.value.items = gridDatProtoDocs.value.descricao.split(',');
            loading.value = false;
        });
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

const itemDataProtDocs = ref({});
const saveDataProtDocs = async () => {
    const method = itemDataProtDocs.value.id ? 'put' : 'post';
    const id = itemDataProtDocs.value.id ? `/${itemDataProtDocs.value.id}` : '';
    const url = `${urlBaseProtoDocs.value}/${itemData.value.id}${id}`;
    // Remover os colchetes do array itemDataProtDocs.value.descricao
    itemDataProtDocs.value.descricao = itemDataProtDocs.value.items.join(',');
    itemDataProtDocs.value.tp_documento = selectedTitulo.value;
    await axios[method](url, itemDataProtDocs.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Documentos registrados com sucesso');
                itemDataProtDocs.value = body;
                loadDataProtoDocs();
                itemDataProtDocs.value = { id_protocolos: itemData.value.id };
                selectedTitulo.value = undefined;
                document.getElementById('tp_documento').focus();
            } else {
                defaultWarn('Erro ao salvar documentos');
            }
        })
        .catch((err) => {
            console.log(err);
            defaultWarn(err.response.data);
        });
    if (itemDataProtDocs.value.descricao) itemDataProtDocs.value.descricao = itemDataProtDocs.value.descricao.split(',');
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
// Editar item da lista de documentos
const editItem = (item) => {
    itemDataProtDocs.value = item;
    selectedTitulo.value = { code: itemDataProtDocs.value.tp_documento, name: itemDataProtDocs.value.tp_documento };
    // transform itemDataProtDocs.value.descricao em array
    itemDataProtDocs.value.items = itemDataProtDocs.value.descricao.split(',');
};
// Excluir item da lista de documentos
const deleteItem = (item) => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBaseProtoDocs.value}/${itemData.value.id}/${item.id}`).then(() => {
                defaultSuccess('Lista de itens excluída com sucesso!');
                loadDataProtoDocs();
            });
        },
        reject: () => {
            return false;
        }
    });
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Composições', to: `/${userData.schema_description}/propostas` }, { label: itemData.id_com_propostas + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-6">
                            <label for="id_com_propostas">Proposta</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_com_propostas" id="id_com_propostas" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="compoe_valor">Compõe Valor</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="compoe_valor" :disabled="mode == 'view'" placeholder="Selecione o período" optionLabel="label" optionValue="value" v-model="itemData.compoe_valor" :options="dropdownCompValor" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="ordem">Ordem de composições</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ordem" id="ordem" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="compos_nr">Número da composição</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.compos_nr" id="compos_nr" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="localizacao">Localização do produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.localizacao" id="localizacao" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="tombamento">Tombamento do produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tombamento" id="tombamento" type="text" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
        <form @submit.prevent="saveDataProtDocs" v-if="itemData.id">
            <div class="grid">
                <div class="col-12">
                    <Card class="bg-blue-200">
                        <template #title> Documentos do protocolo </template>
                        <template #content>
                            <div class="col-12">
                                <div class="p-fluid grid">
                                    <div class="col-6">
                                        <div class="col-12 md:col-12">
                                            <label for="tp_documento">Tipo de Documento</label>
                                            <AutoComplete v-model="selectedTitulo" id="tp_documento" optionLabel="name" :suggestions="filteredTitulos" @complete="searchTitulos" />
                                        </div>
                                        <div class="col-12 md:col-12">
                                            <label for="descricao">Lista de Documentos (pressione Enter ou vírgula para novos itens)</label>
                                            <Chips v-model="itemDataProtDocs.items" separator="," />
                                        </div>
                                        <div class="col-12 md:col-12">
                                            <Button type="button" v-if="(itemDataProtDocs.tp_documento || selectedTitulo) && itemDataProtDocs.items" label="Salvar documentos" severity="success" text raised @click="saveDataProtDocs" />
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <h4>Itens do protocolo</h4>
                                        <ol>
                                            <li v-for="(item, index) in gridDatProtoDocs" :key="item.id">
                                                {{ item.tp_documento }} - {{ item.descricao.replaceAll(',', ', ') }}
                                                <i class="fa-solid fa-pencil fa-shake" style="font-size: 1rem; color: slateblue" @click="editItem(item)" v-tooltip.top="'Clique para alterar'"></i>
                                                <i class="fa-solid fa-trash ml-2" style="color: #fa0000; font-size: 1rem" @click="deleteItem(item)" v-tooltip.top="'Clique para excluir toda a lista'"></i>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </form>
        <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
            <p>{{ route.name }}</p>
            <p>mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
        </div>
    </div>
</template> -->
