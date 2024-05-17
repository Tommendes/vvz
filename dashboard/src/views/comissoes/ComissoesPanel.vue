<script setup>
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComissoesResume from './ComissoesResume.vue';
import { defaultSuccess, defaultWarn } from '@/toast';
import { ref } from 'vue';

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
            if (typeof error.response.data == 'string') defaultWarn(error.response.data);
            else if (typeof error.response == 'string') defaultWarn(error.response);
            else if (typeof error == 'string') defaultWarn(error);
            else {
                defaultWarn('Erro ao carregar dados!');
            }
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
            if (typeof error.response.data == 'string') defaultWarn(error.response.data);
            else if (typeof error.response == 'string') defaultWarn(error.response);
            else if (typeof error == 'string') defaultWarn(error);
            else {
                defaultWarn('Erro ao carregar dados!');
            }
        });
};
const closeAll = () => {
    defaultSuccess('Implementar encerramento de liquidações');
};
</script>

<template>
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
                        <Button label="Imprimir Diário - Representações" outlined severity="success" class="w-full m-2" type="button" icon="fa-solid fa-print" @click="printDiario(0)" />
                        <Button label="Imprimir Diário - Representadas" outlined severity="warning" class="w-full m-2" type="button" icon="fa-solid fa-print" @click="printDiario(1)" />
                        <Button label="Imprimir Diário - Agentes" outlined severity="Info" class="w-full m-2" type="button" icon="fa-solid fa-print" @click="printDiario(2)" />
                        <Button label="Imprimir Diário - Terceiros" outlined severity="secondary" class="w-full m-2" type="button" icon="fa-solid fa-print" @click="printDiario(3)" />
                        <Button label="Imprimir Posição Mensal" outlined severity="contrast" class="w-full m-2" type="button" icon="fa-solid fa-print" @click="printPosicaoMensal()" />
                        <Button label="Encerrar Liquidações" outlined severity="danger" class="w-full m-2" type="button" icon="fa-regular fa-calendar-check" @click="closeAll()" />
                    </Fieldset>
                </div>
            </div>
        </div>
    </div>
    <p>{{ dataCorte }}</p>
</template>
