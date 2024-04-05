<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComissaoItemForm from './ComissaoItemForm.vue';
import { defaultWarn, defaultSuccess } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const gridData = ref(null);
const commissioningValues = ref(null);
const itemData = ref({});
const itemDataGroup = ref({});
const props = defineProps({
    itemDataRoot: Object, // O próprio Pipeline
    itemDataComissionamento: Object // O próprio Comissionamento
});
const urlBase = ref(`${baseApiUrl}/comissoes`);
const mode = ref('grid');

import { guide } from '@/guides/comissoesGrid.js';

//Scrool to top
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
// Dropdowns
const dropdownAgentes = ref([]);
// Lista de status

// Andamento do registro
const STATUS_NAO_PROGRAMADO = 10;
const STATUS_EM_PROGRAMACAO_LIQUIDACAO = 20;
const STATUS_LIQUIDADO = 30;
const dropdownStatus = ref([
    { label: 'Não programado', value: '10', severity: 'danger' },
    { label: 'Programado para liquidação', value: '20', severity: 'warning' },
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
const comissionamento = ref({ R: { M: 0, S: 0 }, A: { M: 0, S: 0 } });
const canAddCommission = ref(false);
// Carrega os dados da grid
const reload = async () => {
    mode.value = 'grid';
    loadData();
};
// Carrega os dados da grid
const loadData = async () => {
    const url = `${urlBase.value}?field:id_pipeline=equals:${props.itemDataRoot.id}`;
    setTimeout(async () => {
        // resete comissionamento
        comissionamento.value = { R: { M: 0, S: 0 }, A: { M: 0, S: 0 } };
        getMaxCommissioningValue();
        await axios.get(url).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.map((item) => {
                const situacao = item.last_status_comiss;
                item.situacao = getStatusField(situacao, 'label');
            });
        });
    }, Math.random() * 1000 + 250);
};
// Carrega os valores máximos de comissionamento
const getMaxCommissioningValue = async () => {
    setTimeout(async () => {
        const url = `${urlBase.value}/f-a/gmc?id_pipeline=${props.itemDataRoot.id}`;
        // resete comissionamento
        comissionamento.value = { R: { M: 0, S: 0 }, A: { M: 0, S: 0 } };
        await axios.get(url).then((axiosRes) => {
            commissioningValues.value = axiosRes.data;
            commissioningValues.value.forEach((element) => {
                switch (element.repres_sum) {
                    case 'repres_sum':
                        comissionamento.value.R = { ...comissionamento.value.R, S: Number(element.valor) };
                        break;
                    case 'repres_max':
                        comissionamento.value.R = { ...comissionamento.value.R, M: Number(element.valor) };
                        break;
                    case 'agentes_sum':
                        comissionamento.value.A = { ...comissionamento.value.A, S: Number(element.valor) };
                        break;
                    case 'agentes_max':
                        comissionamento.value.A = { ...comissionamento.value.A, M: Number(element.valor) };
                        break;
                }
            });
            canAddCommission.value = comissionamento.value.R.M > comissionamento.value.R.S || comissionamento.value.A.M > comissionamento.value.A.S;
        });
    }, Math.random() * 1000 + 250);
};
defineExpose({ loadData }); // Expondo a função para o componente pai
// Visualizar item
const viewItem = (data) => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = { ...data };
        mode.value = 'view';
        scrollToTop();
    }, 100);
};
// Adicionar novo item
const newItem = () => {
    if (canAddCommission.value) {
        mode.value = 'grid';
        setTimeout(() => {
            itemData.value = { id_comis_pipeline: props.itemDataRoot.id };
            mode.value = 'new';
            scrollToTop();
        }, 100);
    } else {
        defaultWarn('Não há margem para mais comissionamento');
    }
};
// Agendar liquidação em grupo
const scheduleGroupSettlement = () => {
    confirm.require({
        group: 'comisGroupLiquidateConfirm',
        header: 'Programar liquidação dos pendentes',
        message: [
            `Confirma a programação de liquidação deste${pendingCommissionsQuantity() > 1 ? 's' : ''} ${pendingCommissionsQuantity()} registros pendentes?`,
            'Essa operação ainda poderá ser revertida enquanto não houver a liquidação total.',
            'Informe abaixo a data prevista para liquidação.'
        ],
        isCalendar: true,
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            scheduleGroup();
        },
        reject: () => {
            return;
        }
    });
};
// Executar liquidação em grupo
const executeGroupSettlement = () => {
    confirm.require({
        group: 'comisGroupLiquidateConfirm',
        header: 'Liquidação total dos pendentes',
        message: [`Confirma a liquidação deste${pendingCommissionsQuantity() > 1 ? 's' : ''} ${pendingCommissionsQuantity()} registros?`, 'Essa operação <strong>NÃO PODERÁ SER REVERTIDA</strong>.', 'Informe abaixo a data prevista para liquidação.'],
        isCalendar: false,
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

// Programar liquidação em grupo
const scheduleGroup = () => {
    if (!formIsValid()) return;
    const url = `${urlBase.value}`;
    let obj = [];
    const dateToLiquidate = moment(itemDataGroup.value.liquidar_em).format('YYYY-MM-DD');
    gridData.value.forEach((element) => {
        if (element.last_status_comiss < 30) {
            const newItem = { id: element.id, liquidar_em: dateToLiquidate, last_status_comiss: element.last_status_comiss };
            obj.push(newItem);
        }
    });
    axios.patch(url, obj).then((res) => {
        defaultSuccess(res.data);
        loadData();
    });
};
// Liquidar em grupo
const liquidateGroup = async () => {
    if (!formIsValid()) return;
    let shouldLoadData = true;
    for (const element of gridData.value) {
        if (element.last_status_comiss < 30) {
            if (element.last_status_comiss < 20) {
                infoDialogisVisible.value = true;
                shouldLoadData = false;
                break;
            }
            const bodyStatus = {
                id_comissoes: element.id,
                status_comis: STATUS_LIQUIDADO
            };
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus);
        }
    }
    if (shouldLoadData) {
        await loadData();
    }
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
const pendingCommissionsQuantity = () => {
    return gridData.value.filter((item) => item.last_status_comiss < 30).length;
};
const hasPendingCommissions = () => {
    return gridData.value.some((item) => item.last_status_comiss < 30);
};
const infoDialogisVisible = ref(false);
// Carrega as operações básicas do formulário
onBeforeMount(async () => {
    setTimeout(async () => {
        await loadData();
        await listAgentesComissionamento();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <Dialog
        id="InfoDialog"
        v-model:visible="infoDialogisVisible"
        modal
        :pt="{
            root: 'border-none',
            mask: {
                style: 'backdrop-filter: blur(5px)'
            }
        }"
    >
        <template #container="{ closeCallback }">
            <div class="flex flex-column px-5 py-5 gap-4" style="border-radius: 12px; background-image: radial-gradient(circle at left top, var(--blue-400), var(--blue-700), var(--blue-400)); color: #fff">
                <div class="block mx-auto text-8xl">
                    <i class="fa-solid fa-circle-info fa-fade"></i>
                </div>
                <div class="block mx-auto text-2xl">
                    <p class="mb-3 text-center text-white">Ainda resta informar a data de liquidação de um ou mais registros</p>
                    <p class="mb-3 text-center text-white">Favor informar primeiro</p>
                    <p class="mb-3 text-center text-white">Se desejar, pode programar em grupo com o botão abaixo<br />e depois executar a liquidação total novamente</p>
                </div>

                <div class="flex justify-content-center align-items-center gap-3">
                    <Button label="Ok" @click="closeCallback" text class="w-10rem p-button-lg text-primary-50 border-1 border-white-alpha-30 hover:bg-white-alpha-10"></Button>
                    <Button
                        type="button"
                        icon="fa-solid fa-file-invoice-dollar fa-fade"
                        label="Programar liquidação em grupo"
                        v-on:click="closeCallback"
                        @click="scheduleGroupSettlement()"
                        text
                        v-tooltip.top="'Clique para liquidar todas as comissões pendentes'"
                        class="p-button-lg text-primary-50 border-1 border-white-alpha-30 hover:bg-white-alpha-10"
                    />
                </div>
            </div>
        </template>
    </Dialog>
    <ConfirmDialog group="comisGroupLiquidateConfirm">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="pi pi-question text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-1" v-for="(item, index) in message.message" :key="index" v-html="item" />
                <Calendar v-if="message.isCalendar" v-model="itemDataGroup.liquidar_em" showButtonBar dateFormat="dd/mm/yy" />
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
            @updatedItem="loadData"
            @reload="reload"
            :parentMode="mode"
            :itemDataRoot="itemData"
            :itemDataComissionamento="itemDataComissionamento"
            :itemDataPipeline="itemDataRoot"
            v-if="['new', 'view', 'edit'].includes(mode)"
        />
        <DataTable ref="dt" :value="gridData" dataKey="id">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button
                        type="button"
                        icon="fa-solid fa-plus"
                        label="Nova Comissão"
                        :outlined="canAddCommission"
                        @click="newItem()"
                        v-tooltip.top="canAddCommission ? 'Clique para registrar uma nova comissão' : 'Não há margem para comissionamento'"
                    />
                    <Button
                        v-if="gridData && gridData.length > 0"
                        type="button"
                        icon="fa-solid fa-file-invoice-dollar fa-fade"
                        label="Programar liquidação em grupo"
                        :outlined="hasPendingCommissions"
                        @click="scheduleGroupSettlement()"
                        v-tooltip.top="'Clique para informar a data de liquidação de todas as comissões pendentes'"
                    />
                    <Button
                        v-if="gridData && gridData.length > 0"
                        type="button"
                        icon="fa-solid fa-bolt fa-fade"
                        label="Liquidar os pendentes"
                        :outlined="hasPendingCommissions"
                        @click="executeGroupSettlement()"
                        v-tooltip.top="'Clique para liquidar todas as comissões pendentes'"
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
        <div class="col-12">
            <Fieldset class="bg-green-200" toggleable :collapsed="true">
                <template #legend>
                    <div class="flex align-items-center text-primary">
                        <span class="fa-solid fa-circle-info mr-2"></span>
                        <span class="font-bold text-lg">Instruções</span>
                    </div>
                </template>
                <p class="m-0">
                    <span v-html="guide" />
                </p>
            </Fieldset>
        </div>
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
            <p>Comissionamento Representantes: {{ comissionamento.R.M }} > {{ comissionamento.R.S }} = {{ comissionamento.R.M > comissionamento.R.S }}</p>
            <p>Comissionamento Agentes: {{ comissionamento.A.M }} > {{ comissionamento.A.S }} = {{ comissionamento.A.M > comissionamento.A.S }}</p>
            <p>canAddCommission: {{ canAddCommission }}</p>
        </Fieldset>
    </div>
</template>
