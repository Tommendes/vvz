<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComissaoItemForm from './ComissaoItemForm.vue';
import { defaultWarn, defaultSuccess } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const gridData = ref(null);
const itemData = ref({});
const itemDataGroup = ref({});
const props = defineProps({
    itemDataRoot: Object, // O próprio Pipeline
    itemDataComissionamento: Object // O próprio Comissionamento
});
const urlBase = ref(`${baseApiUrl}/comissoes`);
const mode = ref('grid');
// Dropdowns
const dropdownAgentes = ref([]);
// Lista de status
// STATUS_NAO_PROGRAMADO = 10
// STATUS_EM_PROGRAMACAO_LIQUIDACAO = 20
// STATUS_LIQUIDADO = 30
const dropdownStatus = ref([
    { label: 'Não programado', value: '10', severity: 'danger' },
    { label: 'Em programação de liquidação', value: '20', severity: 'warning' },
    { label: 'Liquidado', value: '30', severity: 'success' }
]);
// Cookies de usuário
import { userKey } from '@/global';
import moment from 'moment';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Props do template
// Ref do gridData
const dt = ref(null);
const comissionamento = ref({ R: 0, A: 0 });
const canAddCommission = ref(false);
// Carrega os dados da grid
const loadData = async () => {
    mode.value = 'grid';
    const url = `${urlBase.value}?field:id_pipeline=equals:${props.itemDataRoot.id}`;
    setTimeout(async () => {
        // resete comissionamento
        comissionamento.value = { R: 0, A: 0 };
        await axios.get(url).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.map((item) => {
                const valor = item.valor ? Number(item.valor.replace(',', '.')) : 0;
                if (item.agente_representante == 1) comissionamento.value.R += valor;
                else comissionamento.value.A += valor;
                const situacao = item.last_status_comiss;
                item.situacao = getStatusField(situacao, 'label');
            });
            canAddCommission.value = comissionamento.value.R < Number(props.itemDataRoot.valor_representacao.replace(',', '.')) || comissionamento.value.A < Number(props.itemDataRoot.valor_agente.replace(',', '.'));
        });
    }, Math.random() * 1000 + 250);
};
defineExpose({ loadData }); // Expondo a função para o componente pai
const viewItem = (data) => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = { ...data };
        mode.value = 'view';
    }, 100);
};
const newItem = () => {
    if (canAddCommission.value) {
        mode.value = 'grid';
        setTimeout(() => {
            itemData.value = { id_comis_pipeline: props.itemDataRoot.id };
            mode.value = 'new';
        }, 100);
    } else {
        defaultWarn('Não há margem para mais comissionamento');
    }
};
const liquidateCommissions = () => {
    confirm.require({
        group: 'headless',
        header: 'Confirmar liquidação total',
        message: `Confirma a programação de liquidação deste${gridData.value.length > 1 ? 's' : ''} ${gridData.value.length} registros?`,
        message2: 'Essa operação ainda poderá ser revertida enquanto não houver a liquidação total.',
        message3: 'Informe abaixo a data prevista para liquidação.',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            liquidateGroup();
        },
        reject: () => {
            return;
        }
    });
};
// Listar agentes de negócio
const listAgentesComissionamento = async () => {
    let url = `${baseApiUrl}/comis-agentes/f-a/gag?agente_representante`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: `${item.nome} (${item.ordem})` });
        });
    });
};

// Validar formulário
const formIsValid = () => {
    const liquidarEmIsValid = itemDataGroup.value.liquidar_em ? moment(itemDataGroup.value.liquidar_em, 'DD/MM/YYYY', true).isValid() : true;
    if (!liquidarEmIsValid) {
        defaultWarn('Data de liquidação inválida');
        return false;
    }
    return liquidarEmIsValid;
};

const liquidateGroup = () => {
    if (!formIsValid()) return;
    const url = `${urlBase.value}`;
    // const obj = { itemData: moment(itemData.value.liquidar_em, 'DD/MM/YYYY').format('YYYY-MM-DD') };
    let obj = [];
    const dateToLiquidate = moment(itemDataGroup.value.liquidar_em).format('YYYY-MM-DD');
    gridData.value.forEach((element) => {
        const newItem = { id: element.id, liquidar_em: dateToLiquidate };
        obj.push(newItem);
    });
    axios.patch(url, obj).then((res) => {
        defaultSuccess(res.data);
        loadData();
    });
};

// Retornar o label de acordo com o value do DropDown
const getAgentesLabel = (value) => {
    const item = dropdownAgentes.value.find((item) => item.value == value);
    return item ? item.label : '';
};
const getStatusField = (value, field = 'label') => {
    const item = dropdownStatus.value.find((item) => item.value == value);
    return item ? item[field] : '';
};
// Carrega as operações básicas do formulário
onBeforeMount(async () => {
    setTimeout(async () => {
        await loadData();
        await listAgentesComissionamento();
    }, Math.random() * 100 + 250);
});
</script>

<template>
    <ConfirmDialog group="headless">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="pi pi-question text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-1">{{ message.message }}</p>
                <p class="mb-1">{{ message.message2 }}</p>
                <p class="mb-1">{{ message.message3 }}</p>
                <Calendar v-model="itemDataGroup.liquidar_em" showButtonBar dateFormat="dd/mm/yy" />
                <p>{{ itemDataGroup.liquidar_em }}</p>
                <div class="flex align-items-center gap-2 mt-4">
                    <Button label="Confirmar" @click="acceptCallback"></Button>
                    <Button label="Ainda não" outlined @click="rejectCallback"></Button>
                </div>
            </div>
        </template>
    </ConfirmDialog>
    <div class="card">
        <ComissaoItemForm
            @newItem="loadData"
            @reload="loadData"
            @cancel="loadData"
            :parentMode="mode"
            :itemDataRoot="itemData"
            :itemDataComissionamento="itemDataComissionamento"
            :itemDataPipeline="itemDataRoot"
            :comissionamento="comissionamento"
            v-if="['new', 'view', 'edit'].includes(mode)"
        />
        <DataTable ref="dt" :value="gridData" dataKey="id">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Nova Comissão" outlined @click="newItem()" v-tooltip.top="canAddCommission ? 'Clique para registrar uma nova comissão' : 'Não há margem para comissionamento'" />
                    <Button
                        type="button"
                        icon="fa-solid fa-file-invoice-dollar fa-fade"
                        label="Programar liquidação em grupo"
                        outlined
                        @click="liquidateCommissions()"
                        v-tooltip.top="'Clique para informar a data de liquidação de todas as comissões abaixo'"
                    />
                </div>
            </template>
            <Column v-if="userData.admin >= 2" field="id" header="ID" style="width: 5%">
                <template #editor="{ data, field }">
                    <span v-html="data[field]" />
                </template>
            </Column>
            <Column field="agente_representante" header="Tipo" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field] == '1' ? 'Representante' : 'Agente'" />
                </template>
            </Column>
            <Column field="id_comis_agentes" header="Agente" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="getAgentesLabel(data[field])" />
                </template>
            </Column>
            <Column field="valor" header="Valor" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field]" />
                </template>
            </Column>
            <Column field="liquidar_aprox" header="Liquidação em" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field]" v-tooltip.top="'Se informada uma data, o registro será liberado para pagamento nesta data'" />
                </template>
            </Column>
            <Column field="situacao" header="Situação" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <tag :severity="getStatusField(data.last_status_comiss, 'severity')" :value="data[field]" />
                </template>
            </Column>
            <Column style="width: 5%; min-width: 3rem">
                <template #body="{ data }">
                    <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="viewItem(data)" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
        <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="false" v-if="userData.admin >= 2">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-circle-info mr-2"></span>
                    <span class="font-bold text-lg">FormData</span>
                </div>
            </template>
            <p>mode: {{ mode }}</p>
            <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
            <p>props.itemDataComissionamento: {{ props.itemDataComissionamento }}</p>
            <p>gridData: {{ gridData }}</p>
            <p>Comissionamento Representantes: {{ comissionamento.R }} = {{ comissionamento.R < Number(props.itemDataRoot.valor_representacao.replace(',', '.')) }}</p>
            <p>Comissionamento Agentes: {{ comissionamento.A }} = {{ comissionamento.A < Number(props.itemDataRoot.valor_agente.replace(',', '.')) }}</p>
            <p>canAddCommission: {{ canAddCommission }}</p>
        </Fieldset>
    </div>
</template>
