<script setup>
import { ref, onMounted, watch } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { formatCurrency } from '@/global';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';
import { onBeforeMount } from 'vue';

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

// Andamento do registro        
const STATUS_ABERTO = 10
const STATUS_LIQUIDADO = 20
const STATUS_ENCERRADO = 30
const STATUS_CONFIRMADO = 50

const itemData = ref({});
const emit = defineEmits(['dataCorte']);
const monthPicker = ref(moment().toDate());
const dataCorte = ref({});
const loading = ref(true);
const gridData = ref([]);
const filters = ref({});
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        unidade: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        documento: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        cliente: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        cpf_cnpj: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
    };
};

const getLocalParams = async () => {
    await axios.get(`${baseApiUrl}/local-params/f-a/gbf?fld=grupo&vl=comis_corte&slct=id,parametro,label`).then(async (res) => {
        dataCorte.value = res.data.data[0];
        await setMonthPeriod();
    });
};

const loadData = async () => {
    loading.value = true;
    const dataInicio = (dataCorte.value.parametros && dataCorte.value.parametros.dataInicio) || '';
    const dataFim = (dataCorte.value.parametros && dataCorte.value.parametros.dataFim) || '';
    const url = `${baseApiUrl}/comissoes/f-a/gps?agId=${userData.agente_v}&dataInicio=${dataInicio}&dataFim=${dataFim}`;
    await axios.get(url).then((res) => {
        gridData.value = res.data;
        setAdjustGridData();
        loading.value = false;
    });
};

const setAdjustGridData = () => {
    gridData.value.forEach((element) => {
        switch (element.status_comiss) {
            case STATUS_ABERTO:
                element.status_comiss = { label: 'Pendentes', tipo: element.status_comiss };
                break;
            case STATUS_LIQUIDADO:
            case STATUS_ENCERRADO:
                element.status_comiss = { label: 'Liquidadas', tipo: element.status_comiss };
                break;
            case STATUS_CONFIRMADO:
                element.status_comiss = { label: 'Confirmadas', tipo: element.status_comiss };
                break;
            default:
                element.status_comiss;
                break;
        }
    });
};

const setMonthPeriod = async () => {
    const today = moment(); // Obtém a data de hoje
    const cutoffDay = 17; // Dia de corte

    let newMonth = today.month() + 1; // Mês atual + 1
    let newYear = today.year(); // Ano atual

    // Verifica se a data de hoje é maior ou igual ao dia de corte
    if (today.date() >= cutoffDay) {
        newMonth++; // Incrementa o mês
        if (newMonth > 12) {
            newMonth = 1; // Volta para janeiro se exceder dezembro
            newYear++; // Incrementa o ano
        }
    }

    // Atualiza os valores de dataCorte e monthPicker
    const startDate = moment(`${cutoffDay}/${newMonth < 10 ? '0' : ''}${newMonth}/${newYear}`, 'DD/MM/YYYY').subtract(1, 'months');
    const endDate = moment(startDate).add(1, 'months').subtract(1, 'days');

    dataCorte.value.parametros = {
        dataInicio: startDate.format('DD/MM/YYYY'),
        dataFim: endDate.format('DD/MM/YYYY'),
        ano: startDate.year(),
        mes: endDate.month() + 1
    };

    monthPicker.value = moment()
        .set({ year: newYear, month: newMonth - 1, date: 1 })
        .toDate();
    emit('dataCorte', dataCorte.value);

    // Executa a operação loadData()
    await loadData();
};

// Função para ajustar dataCorte.value e monthPicker.value quando o usuário alterar monthPicker.value manualmente
const adjustDates = async () => {
    const chosenDate = moment(monthPicker.value); // Obtém a data escolhida pelo usuário
    const cutoffDay = 17; // Dia de corte

    let newMonth = chosenDate.month() + 1; // Mês selecionado + 1
    let newYear = chosenDate.year(); // Ano selecionado

    // Verifica se a data escolhida é maior ou igual ao dia de corte
    if (chosenDate.date() >= cutoffDay) {
        newMonth++; // Incrementa o mês
        if (newMonth > 12) {
            newMonth = 1; // Volta para janeiro se exceder dezembro
            newYear++; // Incrementa o ano
        }
    }

    // Atualiza os valores de dataCorte e monthPicker
    const startDate = moment(`${cutoffDay}/${newMonth < 10 ? '0' : ''}${newMonth}/${newYear}`, 'DD/MM/YYYY').subtract(1, 'months');
    const endDate = moment(startDate).add(1, 'months').subtract(1, 'days');

    dataCorte.value.parametros = {
        dataInicio: startDate.format('DD/MM/YYYY'),
        dataFim: endDate.format('DD/MM/YYYY'),
        ano: startDate.year(),
        mes: endDate.month() + 1
    };

    monthPicker.value = chosenDate.toDate();
    // Atualiza o valor de dataCorte no componente pai
    emit('dataCorte', dataCorte.value);

    // Executa a operação loadData()
    await loadData();
};

const calculateCustomerTotal = (name) => {
    let total = 0;

    if (gridData.value) {
        for (let customer of gridData.value) {
            if (customer.status_comiss.label === name) {
                total++;
            }
        }
    }

    return total;
};
const calculateCustomerTotalValue = (name) => {
    let total = 0;

    if (gridData.value) {
        for (let customer of gridData.value) {
            if (customer.status_comiss.label === name) {
                total += customer.valor;
            }
        }
    }

    return { total };
};

const setStatusConfirm = (item) => {
    itemData.value = item;
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_CONFIRMADO,
        agente_v: userData.agente_v,
        confirm_date: itemData.value.created_at
    };
    setTimeout(() => {

        confirm.require({
            group: `comisStatusConfirm-${itemData.value.id}`,
            header: 'Confirmar COMISSÃO',
            message: 'Confirma os dados deste registro de sua comissão?',
            message2: '<strong>Esta operação não poderá ser desfeita, vale como <em>de acordo</em> e está protegida por sua senha pessoal</strong>',
            message3: 'A soma das comissões confirmadas será enviada para pagamento dentro do exercício de sua liquidação. Confirma?',
            icon: 'fa-solid fa-question fa-beat',
            acceptIcon: 'fa-solid fa-check',
            rejectIcon: 'fa-solid fa-xmark',
            acceptClass: 'p-button-danger',
            accept: async () => {
                await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                    item.status_comiss.tipo = STATUS_CONFIRMADO;
                    item.status_comiss.label = 'Confirmadas';
                    defaultSuccess('Comissão confirmada com sucesso!');
                    setAdjustGridData();

                    // Executa a operação loadData()
                    // await loadData();
                });
            },
            reject: () => {
                return false;
            }
        });
    }, 250);
};

const expandedRowGroups = ref();
const onRowGroupExpand = (event) => {
    defaultSuccess('Row Group Expanded: ' + 'Value: ' + event.data)
};
const onRowGroupCollapse = (event) => {
    defaultSuccess('Row Group Collapsed: ' + 'Value: ' + event.data)
};


onBeforeMount(() => {
    initFilters();
});

onMounted(async () => {
    setTimeout(async () => {
        await getLocalParams();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <ConfirmDialog :group="`comisStatusConfirm-${itemData.id}`">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div
                    class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="fa-solid fa-question text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-0" v-html="message.message" />
                <p class="mb-0" v-html="message.message2" />
                <p class="mb-0" v-html="message.message3" />
                <div class="flex align-items-center gap-2 mt-4">
                    <Button label="Confirmar" @click="acceptCallback"></Button>
                    <Button label="Ainda não" outlined @click="rejectCallback"></Button>
                </div>
            </div>
        </template>
    </ConfirmDialog>
    <div class="card">
        <h3>Minhas Comissões</h3>
        <DataTable v-model:filters="filters" v-model:expandedRowGroups="expandedRowGroups" :value="gridData" dataKey="id" filterDisplay="row" :loading="loading"
            :globalFilterFields="['unidade', 'documento', 'cliente', 'cpf_cnpj']" expandableRowGroups @rowgroup-expand="onRowGroupExpand" @rowgroup-collapse="onRowGroupCollapse"
            rowGroupMode="subheader" groupRowsBy="status_comiss.tipo" rowGroupHeader:class="p-row-even bg-primary"
            scrollable scrollHeight="450px" removableSort>
            <template #header>
                <div class="flex justify-content-between">
                    <div class="flex justify-content-start flex align-content-center flex-wrap">
                        <div class="flex align-items-center justify-content-center" v-if="dataCorte.parametros">
                            <p class="text-2xl text-orange-500">Liquidações entre: {{ dataCorte.parametros.dataInicio }}
                                e {{ dataCorte.parametros.dataFim }}</p>
                        </div>
                    </div>
                    <div class="flex justify-content-end">
                        <Calendar v-model="monthPicker" view="month" dateFormat="mm/yy" class="mr-2" showIcon
                            iconDisplay="input" @update:modelValue="adjustDates" />
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="fa-solid fa-magnifying-glass" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                        </IconField>
                        <Button type="button" icon="fa-solid fa-filter" label="Limpar" class="ml-2" outlined
                            @click="initFilters()" />
                    </div>
                </div>
            </template>
            <template #empty> Não há dados a apresentar. </template>
            <template #loading>
                <h3>Carregando dados. Por favor aguarde.</h3>
            </template>
            <template #groupheader="slotProps">
                <span class="vertical-align-middle ml-2 font-bold line-height-3">{{ slotProps.data.status_comiss.label }}</span>
            </template>
            <Column field="status_comiss.tipo" header="Tipo" class="text-center"></Column>
            <Column field="unidade" header="Documento">
                <template #body="{ data }">
                    {{ `${data.unidade.replace("_", " ")} ${data.documento}` }}
                </template>
            </Column>
            <Column field="parcela" header="Parcela">
                <template #body="{ data }">
                    {{ `${data.parcela}` }}
                </template>
            </Column>
            <Column field="cliente" header="Cliente" class="text-left">
                <template #body="slotProps">
                    {{ `${slotProps.data.cliente} ${slotProps.data.cpf_cnpj}` }}
                </template>
            </Column>
            <Column field="valor_base" header="Valor Base" class="text-right">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.valor_base) }}
                </template>
            </Column>
            <Column field="percentual" header="Percentual" class="text-right">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.percentual / 100, { place: 'pt-BR', styleReturn: 'percent' }) }}
                </template>
            </Column>
            <Column field="valor" header="Comissão" class="text-right">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.valor) }}
                </template>
            </Column>
            <Column field="id" header="Ações" class="text-right">
                <template #body="slotProps">
                    <Button v-if="slotProps.data.status_comiss.tipo == STATUS_LIQUIDADO" icon="fa-solid fa-check-double"
                        severity="info" v-tooltip:top="'Clique para confirmar estes dados'" rounded outlined
                        aria-label="Bookmark" @click="setStatusConfirm(slotProps.data)" />
                    <Button v-else-if="slotProps.data.status_comiss.tipo == STATUS_CONFIRMADO"
                        icon="fa-solid fa-check-double" severity="warning"
                        v-tooltip:top="'Comissão já encaminhada para pagamento'" rounded outlined
                        aria-label="Bookmark" />
                </template>
            </Column>
            <!-- <template #groupheader="slotProps">
                <div class="flex align-items-center gap-2 custom-groupheader">
                    <span>{{ slotProps.data.status_comiss.label }}</span>
                </div>
            </template> -->
            <template #groupfooter="slotProps">
                <div class="flex justify-content-end font-bold w-full">
                    <div class="flex align-items-start justify-content-start font-bold border-round m-2">{{
                        calculateCustomerTotal(slotProps.data.status_comiss.label) }} {{
                            slotProps.data.status_comiss.label }}</div>
                    <div class="flex align-items-end justify-content-end font-bold border-round m-2">{{
                        formatCurrency(calculateCustomerTotalValue(slotProps.data.status_comiss.label).total) }}</div>
                </div>
            </template>
        </DataTable>
    </div>
</template>
<style>
.p-rowgroup-header {
    background-color: var(--blue-300);
    top: 57px;
    color: rgb(0, 0, 0);
}
</style>
