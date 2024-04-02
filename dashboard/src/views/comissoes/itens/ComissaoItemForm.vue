<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

import { formatCurrency } from '@/global';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);

import { Mask } from 'maska';
const masks = ref({
    data: new Mask({
        mask: '##/##/####'
    })
});

// Url base do form action
const userData = JSON.parse(json);
const loading = ref(false);
// Campos de formulário
const itemData = ref({});
const canAddCommission = ref(false);
// Emit do template
const emit = defineEmits(['newItem', 'cancel', 'reload']);
const props = defineProps({
    itemDataPipeline: Object, // O próprio pipeline
    itemDataRoot: Object, // O próprio registro
    itemDataComissionamento: Object,
    parentMode: String,
    comissionamento: Object
});
const maxCommission = ref(0);
const urlBase = ref(`${baseApiUrl}/comissoes`);
// Dropdowns
const dropdownAgentes = ref([]);
const mode = ref('view');

// Carrega os dados do form
const loadData = async () => {
    loading.value = true;
    if (props.itemDataRoot.id) {
        const url = `${urlBase.value}/${props.itemDataRoot.id}`;
        await axios.get(url).then((axiosRes) => {
            itemData.value = axiosRes.data;
            if (itemData.value.liquidar_em) itemData.value.liquidar_em = masks.value.data.masked(moment(itemData.value.liquidar_em).format('DD/MM/YYYY'));
        });
    } else itemData.value.id_comis_pipeline = props.itemDataComissionamento.id;
    setMaxCommissioning();
    loading.value = false;
};

// Validar formulário
const formIsValid = () => {
    const liquidarEmIsValid = itemData.value.liquidar_em ? moment(itemData.value.liquidar_em, 'DD/MM/YYYY', true).isValid() : true;
    if (!liquidarEmIsValid) {
        defaultWarn('Data de liquidação inválida');
        return false;
    }
    return liquidarEmIsValid;
};

// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) return;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    if (obj.liquidar_em) obj.liquidar_em = moment(obj.liquidar_em, 'DD/MM/YYYY').format('YYYY-MM-DD');
    else obj.liquidar_em = null;
    axios[method](url, obj)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                if (mode.value == 'new') emit('newItem');
                else emit('reload');
            } else {
                defaultWarn('Erro ao salvar registro');
            }
            loadData();
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
// Exclui o registro
const deleteItem = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${itemData.value.id}`).then(async () => {
                defaultSuccess('Registro excluído com sucesso!');
                emit('reload');
            });
        },
        reject: () => {
            return false;
        }
    });
};
// Listar agentes de negócio
const listAgentesComissionamento = async () => {
    let url = `${baseApiUrl}/comis-agentes/f-a/gag?agente_representante`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: `${item.nome} (${item.ordem})`, ar: item.agente_representante });
        });
    });
};
const getAgentesField = (value, field) => {
    const item = dropdownAgentes.value.find((item) => item.value == value);
    return item ? item[field] : '';
};
const setAR = () => {
    itemData.value.agente_representante = getAgentesField(itemData.value.id_comis_agentes, 'ar');
    setMaxCommissioning();
};
const setMaxCommissioning = () => {
    if ([0, 1].includes(itemData.value.agente_representante)) {
        let maxValue = 0.0;
        if (itemData.value.agente_representante == 1) maxValue = (Number(props.itemDataPipeline.valor_representacao.replace(',', '.')) - props.comissionamento.R).toFixed(2);
        else maxValue = (Number(props.itemDataPipeline.valor_agente.replace(',', '.')) - props.comissionamento.A).toFixed(2);
        canAddCommission.value = maxValue > 0;
        if (mode.value != 'new') maxValue = Number(maxValue) + Number(itemData.value.valor.replace(',', '.'));
        maxCommission.value = formatCurrency(((maxValue / 100) * 100).toFixed(2));
    }
};
// Recarregar dados do formulário
const reload = () => {
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    mode.value = props.parentMode;
    setTimeout(async () => {
        await loadData();
        await listAgentesComissionamento();
    }, Math.random() * 100 + 250);
});
</script>

<template>
    <form @submit.prevent="saveData" @keydow.enter.prevent>
        <div class="grid">
            <div class="col-12">
                <h5 v-if="itemData.id">{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <!-- <div class="field col-12 md:col-6">
                        <label for="agente_representante">Agente Representante</label>
                        <InputText autocomplete="no" v-model="itemData.agente_representante" id="agente_representante" type="text" />
                    </div> -->
                    <!-- <div class="field col-12 md:col-3">
                        <label for="alterar_agente_representante">Alterar Agente Representante</label>
                        <InputText autocomplete="no" v-model="itemData.alterar_agente_representante" id="alterar_agente_representante" type="text" />
                    </div> -->
                    <div class="field col-12 md:col-12">
                        <label for="id_comis_agentes">Agente/Representante Comissionado</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown
                            v-else
                            filter
                            placeholder="Selecione..."
                            :showClear="!!itemData.id_comis_agentes"
                            id="unidade_tipos"
                            optionLabel="label"
                            optionValue="value"
                            v-model="itemData.id_comis_agentes"
                            :options="dropdownAgentes"
                            :disabled="['view'].includes(mode)"
                            @change="setAR()"
                        />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="valor">Valor Máximo da Comissão ({{ maxCommission }})</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor" id="valor" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="desconto">Descontar</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto" id="desconto" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="liquidar_em">Liquidar em</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Calendar v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.liquidar_em" showIcon :showOnFocus="false" showButtonBar dateFormat="dd/mm/yy" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="observacao">Observação</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.observacao" id="observacao" type="text" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="mode == 'view'" label="Excluir" icon="fa-solid fa-trash" severity="danger" text raised @click="deleteItem" />
                    <Button type="button" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                </div>
                <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="false" v-if="userData.admin >= 2">
                    <template #legend>
                        <div class="flex align-items-center text-primary">
                            <span class="fa-solid fa-circle-info mr-2"></span>
                            <span class="font-bold text-lg">FormData</span>
                        </div>
                    </template>
                    <p>parentMode: {{ parentMode }}</p>
                    <p>mode: {{ mode }}</p>
                    <p>itemDataPipeline: {{ props.itemDataPipeline }}</p>
                    <p>itemData: {{ itemData }}</p>
                    <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
                    <p>props.itemDataComissionamento: {{ props.itemDataComissionamento }}</p>
                    <p>Comissionamento Representantes: {{ comissionamento.R }} = {{ comissionamento.R < Number(props.itemDataPipeline.valor_representacao.replace(',', '.')) }}</p>
                    <p>Comissionamento Agentes: {{ comissionamento.A }} = {{ comissionamento.A < Number(props.itemDataPipeline.valor_agente.replace(',', '.')) }}</p>
                    <p>canAddCommission: {{ canAddCommission }}</p>
                    <p>maxCommission: {{ maxCommission }}</p>
                </Fieldset>
            </div>
        </div>
    </form>
</template>
