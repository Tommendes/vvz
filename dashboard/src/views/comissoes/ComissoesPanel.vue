<script setup>
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComissoesResume from './ComissoesResume.vue';
import { defaultSuccess, defaultWarn } from '@/toast';
import { ref } from 'vue';
import moment from 'moment';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

const dataCorte = ref({});
const defineDataCorte = (value) => {
    dataCorte.value = value.parametros;
};

const printDiario = async (tpAgenteRep) => {
    defaultSuccess('Por favor aguarde...');
    let url = `${baseApiUrl}/printing/diarioComissionado`;
    const bodyRequest = {
        periodo: `Liquidações entre: ${dataCorte.value.dataInicio} e ${dataCorte.value.dataFim}`,
        ano: dataCorte.value.ano,
        mes: dataCorte.value.mes,
        dataInicio: dataCorte.value.dataInicio,
        dataFim: dataCorte.value.dataFim,
        reportTitle: 'Diário Auxiliar de Comissionado',
        tpAgenteRep: tpAgenteRep,
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
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
const printPosicaoMensal = async () => {
    defaultSuccess('Por favor aguarde...');
    let url = `${baseApiUrl}/printing/posicaoMensal`;
    const bodyRequest = {
        periodo: `Liquidações entre: ${dataCorte.value.dataInicio} e ${dataCorte.value.dataFim}`,
        dataInicio: dataCorte.value.dataInicio,
        dataFim: dataCorte.value.dataFim,
        reportTitle: 'Posição Mensal de Comissionado',
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
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
const confirmClose = ref(false);
const confirmBody = ref({});
const released = ref({
    "endDate": "",
    "quant": 0
});
const progressBar = ref(0);
const bodyRelease = {
    /*  
       Se for passada a data então que esteja no formato YYYY-MM-DD. Se não for passada, será considerada a data de hoje.
       Será executado o encerramento até o período anterior ao dOper. O período finaliza um dia antes de comis_corte em local_params.
    */
    // "dOper": "2024-06-05" 
}
const setStatusClosed = () => {
    let url = `${baseApiUrl}/comis-status/f-a/ssc`;
    axios.post(url, bodyRelease)
    // A cada segundo, verificar a quantidade que ainda não foi fechada e calcular o percentual para a barra de progresso alterando assim o valor em progressBar.value
    setInterval(() => {
        let url = `${baseApiUrl}/comis-status/f-a/gsr`;
        axios.post(url, bodyRelease)
            .then((res) => {
                const body = res.data;
                const quantInicial = released.value.quant;
                progressBar.value = Math.round(((quantInicial - body.quant) / quantInicial) * 100);
                confirmBody.value = {
                    header: 'Encerrar Liquidações',
                    message1: `ENCERRAMENTO iniciado. Por favor aguarde`,
                    message2: '<strong>Não feche esta aba e não atualize a página</strong>',
                    message3: 'Esta mensagem se fechará automaticamente ao finalizar o processo.'
                } 
                if (body.quant == 0) {
                    defaultSuccess('Liquidações encerradas com sucesso!');
                    confirmClose.value = false;
                    window.location.reload();
                }
            });
    }, 1000);

};
const getStatusReleased = async () => {
    let url = `${baseApiUrl}/comis-status/f-a/gsr`;
    axios.post(url, bodyRelease)
        .then((res) => {
            const body = res.data;
            released.value = body;
            confirmClose.value = true;
            confirmBody.value = {
                header: 'Encerrar Liquidações',
                message0: `Não há Liquidações para serem encerradas`,
                message1: `Confirma o ENCERRAMENTO DEFINITIVO de ${body.quant} liquidações até a data de ${moment(body.endDate).format('DD/MM/YYYY')}?`,
                message2: '<strong>Esta operação não poderá ser desfeita e as liquidações não poderão mais ser editadas</strong>',
                accept: async () => setStatusClosed(),
                reject: () => confirmClose.value = false
            } 
        })
};
</script>

<template>
    <Dialog v-model:visible="confirmClose" modal :header="confirmBody.header" :style="{ width: '50rem' }">
        <p v-if="!released.quant" class="font-semibold text-2xl text-center" v-html="confirmBody.message0"/>
        <p v-if="released.quant" class="font-semibold text-2xl text-center" v-html="confirmBody.message1"/>
        <p v-if="released.quant" class="font-semibold text-center" v-html="confirmBody.message2"/>
        <p class="font-semibold text-center" v-if="confirmBody.message3" v-html="confirmBody.message3"/>
        <div class="card" v-if="progressBar">
            <ProgressBar :value="progressBar" />
        </div>
        <div v-if="!progressBar" class="flex align-items-center justify-content-center gap-2 mt-4">
            <Button v-if="released.quant" label="Confirmar" @click="confirmBody.accept"></Button>
            <Button :label="released.quant ? 'Ainda não' : 'Fechar'" outlined @click="confirmBody.reject"></Button>
        </div>
    </Dialog>
    <div class="grid">
        <div class="col-12">
            <h3>Painel de Comissões</h3>
            <div class="grid">
                <div class="col-10">
                    <ComissoesResume @dataCorte="defineDataCorte" id="divChart" />
                </div>
                <div class="col-2">
                    <Fieldset :toggleable="true" class="mb-3">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-bolt mr-2"></span>
                                <span class="font-bold text-lg">Ações</span>
                            </div>
                        </template>
                        <Button label="Imprimir Diário - Representações" outlined severity="success" class="w-full m-2"
                            type="button" icon="fa-solid fa-print" @click="printDiario(0)" />
                        <Button label="Imprimir Diário - Representadas" outlined severity="warning" class="w-full m-2"
                            type="button" icon="fa-solid fa-print" @click="printDiario(1)" />
                        <Button label="Imprimir Diário - Agentes" outlined severity="Info" class="w-full m-2"
                            type="button" icon="fa-solid fa-print" @click="printDiario(2)" />
                        <Button label="Imprimir Diário - Terceiros" outlined severity="secondary" class="w-full m-2"
                            type="button" icon="fa-solid fa-print" @click="printDiario(3)" />
                        <Button label="Imprimir Posição Mensal" outlined severity="contrast" class="w-full m-2"
                            type="button" icon="fa-solid fa-print" @click="printPosicaoMensal()" />
                        <Button label="Encerrar Liquidações" outlined severity="danger" class="w-full m-2" type="button"
                            icon="fa-regular fa-calendar-check" @click="getStatusReleased()" />
                    </Fieldset>
                </div>
            </div>
        </div>
    </div>
    <p v-if="uProf.admin >= 2">dataCorte: {{ dataCorte }}</p>
</template>
