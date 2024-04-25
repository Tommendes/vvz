<script setup>
import { ref, onBeforeMount } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';
import { useRoute } from 'vue-router';
const route = useRoute();
import { userKey, formatCurrency } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const gridData = ref([]);

const loadData = async () => {
    await axios.get(`${baseApiUrl}/comissoes/f-a/gps?agGroup=&agId=`).then((res) => {
        gridData.value = res.data;
    });
};
onBeforeMount(async () => {
    setTimeout(async () => {
        await loadData();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <div class="card">
        <DataTable :value="gridData" tableStyle="min-width: 50rem">
            <template #header>
                <div class="flex flex-wrap align-items-center justify-content-between gap-2">
                    <span class="text-xl text-900 font-bold">Products</span>
                    <Button icon="pi pi-refresh" rounded raised />
                </div>
            </template>
            <Columnn field="nome_comum" header="Nome" />
            <Columnn field="ordem" header="Nº Ordem" />
            <Column field="total_pendente" header="Price">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.total_pendente) }}
                </template>
            </Column>
            <Column field="total_liquidado" header="Price">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.total_liquidado) }}
                </template>
            </Column>
        </DataTable>
    </div>
</template>
