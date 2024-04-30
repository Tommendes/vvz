<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { formatCurrency } from '@/global';
import { defaultSuccess, defaultWarn } from '@/toast';
import moment from 'moment';
import { onBeforeMount } from 'vue';

const emit = defineEmits(['dataCorte']);
const monthPicker = ref(moment().add(1, 'month').toDate());
const dataCorte = ref({});
const loading = ref(true);
const gridData = ref([]);
const filters = ref({});
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        nome_comum: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        ordem: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
    };
};

const getLocalParams = async () => {
    await axios.get(`${baseApiUrl}/local-params/f-a/gbf?fld=grupo&vl=comis_corte&slct=id,parametro,label`).then(async (res) => {
        dataCorte.value = res.data.data[0];
        // Data inínio é igual a data de corte considerando o mês em monthPicker.value
        // Por exemplo: Se monthPicker está em qualquer data de abril de 2024 então concatene os valores e retorne a data de corte
        const dataInicio = moment().set('date', dataCorte.value.parametro).set('month', monthPicker.value.getMonth()).set('year', monthPicker.value.getFullYear()).add(-1, 'months').format('DD/MM/YYYY');
        // Data final é igual a dataInicio + 1 mês
        const dataFinal = moment(dataInicio, 'DD/MM/YYYY').add(1, 'months').add(-1, 'days').format('DD/MM/YYYY');
        const ano = Number(moment(dataFinal, 'DD/MM/YYYY').format('YYYY'));
        const mes = Number(moment(dataFinal, 'DD/MM/YYYY').format('MM'));
        dataCorte.value.parametros = { dataInicio, dataFinal, ano, mes };
        emit('dataCorte', dataCorte.value);
        await loadData();
    });
};

const loadData = async () => {
    loading.value = true;
    const dataInicio = (dataCorte.value.parametros && dataCorte.value.parametros.dataInicio) || '';
    const dataFinal = (dataCorte.value.parametros && dataCorte.value.parametros.dataFinal) || '';
    const url = `${baseApiUrl}/comissoes/f-a/gps?dataInicio=${dataInicio}&dataFinal=${dataFinal}`;
    await axios.get(url).then((res) => {
        gridData.value = res.data;
        gridData.value.forEach((element) => {
            switch (element.agente_representante) {
                case 0:
                    element.agente_representante = { label: 'Representaçoes', tipo: element.agente_representante };
                    break;
                case 1:
                    element.agente_representante = { label: 'Representadas', tipo: element.agente_representante };
                    break;
                case 2:
                    element.agente_representante = { label: 'Agentes', tipo: element.agente_representante };
                    break;
                case 3:
                    element.agente_representante = { label: 'Terceiros', tipo: element.agente_representante };
                    break;
                default:
                    element.agente_representante;
                    break;
            }
        });
        loading.value = false;
    });
};
const calculateCustomerTotal = (name) => {
    let total = 0;

    if (gridData.value) {
        for (let customer of gridData.value) {
            if (customer.agente_representante.label === name) {
                total++;
            }
        }
    }

    return total;
};
const calculateCustomerTotalValue = (name) => {
    let totalPendente = 0;
    let totalLiquidado = 0;

    if (gridData.value) {
        for (let customer of gridData.value) {
            if (customer.agente_representante.label === name) {
                totalPendente += customer.total_pendente;
                totalLiquidado += customer.total_liquidado;
            }
        }
    }

    return { totalPendente, totalLiquidado };
};

const printOnly = async (idAgente, tpAgenteRep) => {
    defaultSuccess('Por favor aguarde...');
    let url = `${baseApiUrl}/printing/diarioComissionado`;
    const bodyRequest = {
        periodo: `Liquidações entre: ${dataCorte.value.parametros.dataInicio} e ${dataCorte.value.parametros.dataFinal}`,
        ano: dataCorte.value.parametros.ano,
        mes: dataCorte.value.parametros.mes,
        dataInicio: dataCorte.value.dataInicio,
        dataFinal: dataCorte.value.dataFinal,
        reportTitle: 'Diário Auxiliar de Comissionado',
        tpAgenteRep: tpAgenteRep,
        idAgente: idAgente,
        exportType: 'pdf',
        encoding: 'base64' // <- Adicionar à requisição para obter a impressão com o método do frontend
    };
    await axios
        .post(url, bodyRequest)
        .then((res) => {
            const body = res.data;
            let pdfWindow = window.open('');
            pdfWindow.document.write(`<iframe width='100%' height='100%' src='data:application/pdf;base64, ${encodeURI(body)} '></iframe>`);
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
    <div class="card">
        <DataTable
            v-model:filters="filters"
            :value="gridData"
            dataKey="id"
            filterDisplay="row"
            :loading="loading"
            :globalFilterFields="['ordem', 'nome_comum']"
            rowGroupMode="subheader"
            groupRowsBy="agente_representante.tipo"
            rowGroupHeader:class="p-row-even bg-primary"
            scrollable
            scrollHeight="400px"
            tableStyle="min-width: 80rem"
            removableSort
        >
            <template #header>
                <!-- <div class="flex align-content-center flex-wrap"> -->
                <div class="flex justify-content-between">
                    <div class="flex justify-content-start flex align-content-center flex-wrap">
                        <div class="flex align-items-center justify-content-center" v-if="dataCorte.parametros">
                            <p class="text-2xl text-orange-500">Liquidações entre: {{ dataCorte.parametros.dataInicio }} e {{ dataCorte.parametros.dataFinal }}</p>
                        </div>
                    </div>
                    <div class="flex justify-content-end">
                        <Calendar v-model="monthPicker" view="month" dateFormat="mm/yy" class="mr-2" showIcon iconDisplay="input" @update:modelValue="getLocalParams" />
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                        </IconField>
                        <Button type="button" icon="pi pi-filter-slash" label="Limpar" class="ml-2" outlined @click="initFilters()" />
                    </div>
                    <!-- </div> -->
                </div>
            </template>
            <template #empty> Não há dados a apresentar. </template>
            <template #loading>
                <h3>Carregando dados. Por favor aguarde.</h3>
            </template>
            <Column field="agente_representante.tipo" header="Tipo" class="text-center"></Column>
            <Column field="nome_comum" header="Nome">
                <template #body="{ data }">
                    {{ data.nome_comum }}
                </template>
            </Column>
            <Column field="ordem" header="Nº Ordem" class="text-center">
                <template #body="slotProps">
                    {{ slotProps.data.ordem }}
                </template>
            </Column>
            <Column field="total_pendente" header="Pendente" class="text-right">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.total_pendente) }}
                </template>
            </Column>
            <Column field="total_liquidado" header="Liquidado" class="text-right">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.total_liquidado) }}
                </template>
            </Column>
            <Column field="id" header="Ações" class="text-right">
                <template #body="slotProps">
                    <Button icon="fa-solid fa-print" severity="info" v-tooltip:top="'Clique para imprimir este Diário'" rounded outlined aria-label="Bookmark" @click="printOnly(slotProps.data.id, slotProps.data.agente_representante.tipo)" />
                </template>
            </Column>
            <template #groupheader="slotProps">
                <div class="flex align-items-center gap-2 custom-groupheader">
                    <span>{{ slotProps.data.agente_representante.label }}</span>
                </div>
            </template>
            <template #groupfooter="slotProps">
                <div class="flex justify-content-end font-bold w-full">
                    <div class="flex align-items-start justify-content-start font-bold border-round m-2">{{ calculateCustomerTotal(slotProps.data.agente_representante.label) }} {{ slotProps.data.agente_representante.label }}</div>
                    <div class="flex align-items-end justify-content-end font-bold border-round m-2">{{ formatCurrency(calculateCustomerTotalValue(slotProps.data.agente_representante.label).totalPendente) }}</div>
                    <div class="flex align-items-end justify-content-end font-bold border-round m-2">{{ formatCurrency(calculateCustomerTotalValue(slotProps.data.agente_representante.label).totalLiquidado) }}</div>
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
