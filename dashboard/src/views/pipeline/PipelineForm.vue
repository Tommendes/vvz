<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
import Breadcrumb from '../../components/Breadcrumb.vue';
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
    status: 'Tipo (Ativo: S|N)',
    id_cadastros: 'Cliente',
    id_com_agentes: 'Agente',
    descricao: 'Descrição',
    valor_bruto: 'Valor Bruto',
    status_comissao: 'Status',
    documento: 'Data'
});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Dropdowns
const dropdownPaisNascim = ref([]);
const dropdownTipo = ref([]);
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
const urlBase = ref(`${baseApiUrl}/pipeline`);
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
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline` });
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
        // console.log(url);
        // console.log(JSON.stringify(itemData.value))
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    // if (mode.value != 'new') reload();
                    // else router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastro/${itemData.value.id}` });
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id}` });
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
// Converte 1 ou 0 para boolean
const isTrue = (value) => value === 1;
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        errorMessages.value = {};
    }
    return ret;
};
// Validar formulário
const formIsValid = () => {
    return true;
    // && validateCPF() && validateEmail() && validateTelefone();
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
const optionParams = async (query) => {
    itemData.value.id = route.params.id;
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    itemData.value.id = route.params.id;
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const loadOptions = async () => {
    // Tipo ativo
    // await optionParams({ field: 'meta', value: 'tipo_ativo', select: 'id,label' }).then((res) => {
    //     res.data.data.map((item) => {
    //         dropdownStatus.value.push({ value: item.id, label: item.label });
    //     });
    // });
    //     Sexo
    //     await optionParams({ field: 'meta', value: 'sexo', select: 'id,label' }).then((res) => {
    //         res.data.data.map((item) => {
    //             dropdownSexo.value.push({ value: item.id, label: item.label });
    //         });
    //     });
    // Pais nascimento
    await optionParams({ field: 'meta', value: 'pais', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownPaisNascim.value.push({ value: item.id, label: item.label });
        });
    });
    // Tipo Cadastro
    await optionLocalParams({ field: 'grupo', value: 'tipo_cadastro', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownTipo.value.push({ value: item.id, label: item.label });
        });
    });
    //     // Área Atuação
    //     await optionLocalParams({ field: 'grupo', value: 'id_atuacao', select: 'id,label' }).then((res) => {
    //         res.data.data.map((item) => {
    //             dropdownAtuacao.value.push({ value: item.id, label: item.label });
    //         });
    //     });
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
    // validateCPF();
    if (itemData.value.cpf_cnpj && itemData.value.cpf_cnpj.replace(/([^\d])+/gim, '').length == 14) {
        labels.value.status = 'Tipo (Ativo: S|N)';
        labels.value.id_cadastros = 'Cliente';
        labels.value.id_com_agentes = 'Agente';
        labels.value.descricao = 'Descrição';
        labels.value.valor_bruto = 'Valor Bruto';
        labels.value.status_comissao = 'Status';
        labels.value.documento = 'Data';
    } else {
        labels.value.status = 'Tipo (Ativo: S|N)';
        labels.value.id_cadastros = 'Cliente';
        labels.value.id_com_agentes = 'Agente';
        labels.value.descricao = 'Descrição';
        labels.value.valor_bruto = 'Valor Bruto';
        labels.value.status_comissao = 'Status';
        labels.value.documento = 'Data';
    }
});

const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
</script>

<template>
    <div class="card">
        <Breadcrumb :items="[{ label: 'Todo o Pipeline', to: `/${userData.cliente}/${userData.dominio}/pipeline` }, { label: itemData.documento }]" />
        <div class="grid">
            <form @submit.prevent="saveData">
                <div class="col-12">
                    <div class="p-fluid formgrid grid">
                        <div class="field col-12 md:col-3">
                            <label for="status">Tipo (Ativo: S|N)</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.status" id="status" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.status">{{ errorMessages.status || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_cadastros">Cadastro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastros" id="id_cadastros" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_cadastros">{{ errorMessages.id_cadastros || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_pipeline_params">Tipo</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pipeline_params" id="id_pipeline_params" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_pipeline_params">{{ errorMessages.id_pipeline_params || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_pai">Pai</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pai" id="id_pai" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_pai">{{ errorMessages.id_pai || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_filho">Filho</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_filho" id="id_filho" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_filho">{{ errorMessages.id_filho || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_com_agentes">Agente</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_com_agentes" id="id_com_agentes" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_com_agentes">{{ errorMessages.id_com_agentes || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao" id="descricao" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.descricao">{{ errorMessages.descricao || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="valor_bruto">Valor bruto</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_bruto" id="valor_bruto" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.valor_bruto">{{ errorMessages.valor_bruto || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="status_comissao">Status</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.status_comissao" id="status_comissao" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.status_comissao">{{ errorMessages.status_comissao || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="documento">Documento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.documento" id="documento" type="text" @input="validateDocumento()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.documento">{{ errorMessages.documento || '&nbsp;' }}</small>
                        </div>
                    </div>
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>
