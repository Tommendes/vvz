<script setup>
import moment from 'moment';
import { onMounted, reactive, ref } from 'vue';
import { formatCurrency } from '@/global';
import axios from '@/axios-interceptor';
import { baseApiUrl } from '@/env';
import { colorsDashboard } from '@/global';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const biPeriod = ref();
const applyBiParams = () => {
    if (biPeriod.value) {
        const period = biPeriod.value.map((element, index) => {
            const date = moment(element).format('YYYY-MM-DD');
            return index === 0 ? { di: date } : { df: date };
        });
        let biParams = JSON.parse(localStorage.getItem('__biParams'));
        localStorage.setItem('__biParams', JSON.stringify({ ...biParams, periodo: period }));
    } else setDefaultBiParams();
    if (biPeriod.value) loadStats();
};
const biPeriodVG = ref();
const applyBiParamsVG = () => {
    if (biPeriodVG.value) {
        const period = biPeriodVG.value.map((element, index) => {
            const date = moment(element).format('YYYY-MM-DD');
            return index === 0 ? { di: date } : { df: date };
        });
        let biParams = JSON.parse(localStorage.getItem('__biParams'));
        localStorage.setItem('__biParams', JSON.stringify({ ...biParams, periodoVG: period }));
    } else setDefaultBiParams();
    if (biPeriodVG.value) loadStats();
};

const setDefaultBiParams = () => {
    biPeriod.value = [moment().subtract(1, 'month').toDate(), moment().toDate()];
    biPeriod.value.dataPt = 'entre ' + moment().subtract(1, 'month').format('DD/MM/YYYY') + ' e ' + moment().format('DD/MM/YYYY');
    biPeriod.value.dataEn = { di: moment().subtract(1, 'month').format('YYYY-MM-DD'), df: moment().format('YYYY-MM-DD') };
    localStorage.setItem(
        '__biParams',
        JSON.stringify({
            periodo: [{ di: biPeriod.value.dataEn.di }, { df: biPeriod.value.dataEn.df }],
            periodoVG: [{ di: biPeriod.value.dataEn.di }, { df: biPeriod.value.dataEn.df }],
            recentSales: { rows: biData.value.recentSales.rows },
            topSellings: { rows: biData.value.topSellings.rows },
            topSellers: { rows: biData.value.topSellers.rows },
            topProposals: { rows: biData.value.topProposals.rows },
            salesOverview: { rows: biData.value.salesOverview.rows }
        })
    );
};

const getBiPeriod = () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    if (biParams && moment(biParams.periodo[0].di, 'YYYY-MM-DD', true).isValid() && moment(biParams.periodo[1].df, 'YYYY-MM-DD', true).isValid()) {
        const dateArray = [];
        let datesPt = 'entre ';
        let dataEn = { di: new Date(), df: new Date() };
        biParams.periodo.forEach((element) => {
            if (element.di) {
                dateArray.push(moment(element.di).toDate());
                datesPt += moment(element.di).format('DD/MM/YYYY');
                dataEn.di = moment(element.di).format('YYYY-MM-DD');
            }
            if (element.df) {
                dateArray.push(moment(element.df).toDate());
                datesPt += ' e ' + moment(element.df).format('DD/MM/YYYY');
                dataEn.df = moment(element.df).format('YYYY-MM-DD');
            }
        });
        biPeriod.value = dateArray;
        biPeriod.value.dataPt = datesPt;
        biPeriod.value.dataEn = dataEn;
    } else {
        applyBiParams();
    }
};

const getBiPeriodVG = () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    if (biParams && moment(biParams.periodoVG[0].di, 'YYYY-MM-DD', true).isValid() && moment(biParams.periodoVG[1].df, 'YYYY-MM-DD', true).isValid()) {
        const dateArray = [];
        let datesPt = 'entre ';
        let dataEn = { di: new Date(), df: new Date() };
        biParams.periodoVG.forEach((element) => {
            if (element.di) {
                dateArray.push(moment(element.di).toDate());
                datesPt += moment(element.di).format('DD/MM/YYYY');
                dataEn.di = moment(element.di).format('YYYY-MM-DD');
            }
            if (element.df) {
                dateArray.push(moment(element.df).toDate());
                datesPt += ' e ' + moment(element.df).format('DD/MM/YYYY');
                dataEn.df = moment(element.df).format('YYYY-MM-DD');
            }
        });
        biPeriodVG.value = dateArray;
        biPeriodVG.value.dataPt = datesPt;
        biPeriodVG.value.dataEn = dataEn;
    } else {
        applyBiParamsVG();
    }
};

const biData = ref({
    cadastros: {
        total: 0,
        novos: 0,
        noPeriodo: 0,
        loading: true
    },
    prospectos: {
        total: 0,
        novos: 0,
        noPeriodo: 0,
        loading: true
    },
    propostas: {
        total: 0,
        novos: 0,
        noPeriodo: 0,
        loading: true
    },
    pedidos: {
        total: 0,
        novos: 0,
        noPeriodo: 0,
        loading: true
    },
    recentSales: {
        rows: 5,
        data: [],
        loading: true
    },
    topSellings: {
        rows: 5,
        totalSell: 0,
        totalSellQuantity: 0,
        data: [],
        dataRepresentacoes: [],
        loading: true
    },
    topSellers: {
        rows: 5,
        totalSell: 0,
        totalSellQuantity: 0,
        data: [],
        loading: true
    },
    topProposals: {
        rows: 5,
        totalProposed: 0,
        totalProposedQuantity: 0,
        data: [],
        loading: true
    },
    salesOverview: {
        rows: 5,
        labels: [],
        datasets: [],
        loading: true
    }
});

const getCadastrosBi = async () => {
    const url = `${baseApiUrl}/cadastros/f-a/gbi?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}`;
    biData.value.cadastros.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        biData.value.cadastros.total = data.total;
        biData.value.cadastros.noPeriodo = data.noPeriodo;
        biData.value.cadastros.novos = data.novos;
    });
    biData.value.cadastros.loading = false;
};

const getPropectosBi = async () => {
    const url = `${baseApiUrl}/com-prospeccoes/f-a/gbi?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}`;
    biData.value.prospectos.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        biData.value.prospectos.total = data.total;
        biData.value.prospectos.noPeriodo = data.noPeriodo;
        biData.value.prospectos.novos = data.novos;
    });
    biData.value.prospectos.loading = false;
};

const getPropostasBi = async () => {
    const url = `${baseApiUrl}/pipeline/f-a/gbi?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}&periodDv=1`;
    biData.value.propostas.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        biData.value.propostas.total = data.total;
        biData.value.propostas.noPeriodo = data.noPeriodo;
        biData.value.propostas.novos = data.novos;
    });
    biData.value.propostas.loading = false;
};

const getPedidosBi = async () => {
    const url = `${baseApiUrl}/pipeline/f-a/gbi?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}&periodDv=2`;
    biData.value.pedidos.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        biData.value.pedidos.total = data.total;
        biData.value.pedidos.noPeriodo = data.noPeriodo;
        biData.value.pedidos.novos = data.novos;
    });
    biData.value.pedidos.loading = false;
};

const getPedidosLastBi = async () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    biData.value.recentSales.rows = biParams.recentSales.rows || biData.value.recentSales.rows;
    const url = `${baseApiUrl}/pipeline/f-a/grs?rows=${biData.value.recentSales.rows}`;
    biData.value.recentSales.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        biData.value.recentSales.data = data;
    });
    biData.value.recentSales.loading = false;
};

const irRecentSale = (id) => {
    window.open(`/${userData.schema_description}/pipeline/${id}`, '_blank');
};

const applyBiRecentSales = (moreOrLess) => {
    if (moreOrLess === 'plus' && biData.value.recentSales.rows < 10) biData.value.recentSales.rows++;
    else if (moreOrLess === 'less' && biData.value.recentSales.rows > 1) biData.value.recentSales.rows--;
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    localStorage.setItem('__biParams', JSON.stringify({ ...biParams, recentSales: { rows: biData.value.recentSales.rows } }));
    getPedidosLastBi();
};

const applyBiTopSeilling = async (moreOrLess) => {
    if (moreOrLess === 'plus') biData.value.topSellings.rows++;
    else if (moreOrLess === 'less' && biData.value.topSellings.rows > 1) biData.value.topSellings.rows--;
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    localStorage.setItem('__biParams', JSON.stringify({ ...biParams, topSellings: { rows: biData.value.topSellings.rows } }));
    await getTopSellingBi();
    getSalesOverviewBi();
};

const applyBiTopSellers = (moreOrLess) => {
    if (moreOrLess === 'plus') biData.value.topSellers.rows++;
    else if (moreOrLess === 'less' && biData.value.topSellers.rows > 1) biData.value.topSellers.rows--;
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    localStorage.setItem('__biParams', JSON.stringify({ ...biParams, topSellers: { rows: biData.value.topSellers.rows } }));
    getTopSellersBi();
};

const applyBiTopProposals = (moreOrLess) => {
    if (moreOrLess === 'plus') biData.value.topProposals.rows++;
    else if (moreOrLess === 'less' && biData.value.topProposals.rows > 1) biData.value.topProposals.rows--;
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    localStorage.setItem('__biParams', JSON.stringify({ ...biParams, topProposals: { rows: biData.value.topProposals.rows } }));
    getTopProposalsBi();
};

const getTopSellingBi = async () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    biData.value.topSellings.rows = biParams.topSellings.rows || biData.value.topSellings.rows;
    const url = `${baseApiUrl}/pipeline/f-a/gts?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}&rows=${biData.value.topSellings.rows}`;
    biData.value.topSellings.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        // colorsDashboard é um array de cores. Adicione a cada elemento uma cor utilizando a propriedade element.color
        data.data.forEach((element) => {
            element.color = colorsDashboard[Math.floor(Math.random() * colorsDashboard.length)];
        });
        biData.value.topSellings.data = data.data;
        biData.value.topSellings.dataRepresentacoes = [];
        biData.value.topSellings.data.forEach((element) => {
            biData.value.topSellings.dataRepresentacoes.push(element.id);
        });
        biData.value.topSellings.totalSell = data.totalSell;
        biData.value.topSellings.totalSellQuantity = data.totalSellQuantity;
    });
    biData.value.topSellings.loading = false;
};

const getTopSellersBi = async () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    biData.value.topSellers.rows = biParams.topSellers.rows || biData.value.topSellers.rows;
    const url = `${baseApiUrl}/pipeline/f-a/gtss?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}&rows=${biData.value.topSellers.rows}`;
    biData.value.topSellers.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        // colorsDashboard é um array de cores. Adicione a cada elemento uma cor utilizando a propriedade element.color
        data.data.forEach((element) => {
            element.color = colorsDashboard[Math.floor(Math.random() * colorsDashboard.length)];
        });
        biData.value.topSellers.data = data.data;
        biData.value.topSellers.totalSell = data.totalSell;
        biData.value.topSellers.totalSellQuantity = data.totalSellQuantity;
    });
    biData.value.topSellers.loading = false;
};

const getTopProposalsBi = async () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    biData.value.topProposals.rows = biParams.topProposals.rows || biData.value.topProposals.rows;
    const url = `${baseApiUrl}/pipeline/f-a/gtp?periodDi=${biPeriod.value.dataEn.di}&periodDf=${biPeriod.value.dataEn.df}&rows=${biData.value.topProposals.rows}`;
    biData.value.topProposals.loading = true;
    await axios.get(url).then((axiosRes) => {
        const data = axiosRes.data;
        // colorsDashboard é um array de cores. Adicione a cada elemento uma cor utilizando a propriedade element.color
        data.data.forEach((element) => {
            element.color = colorsDashboard[Math.floor(Math.random() * colorsDashboard.length)];
        });
        biData.value.topProposals.data = data.data;
        biData.value.topProposals.totalProposed = data.totalProposed;
        biData.value.topProposals.totalProposedQuantity = data.totalProposedQuantity;
    });
    biData.value.topProposals.loading = false;
};

const getSalesOverviewBi = async () => {
    if (biPeriodVG.value.dataEn.di && biPeriodVG.value.dataEn.df) {
        let biParams = JSON.parse(localStorage.getItem('__biParams'));
        biData.value.salesOverview.rows = biParams.salesOverview.rows || biData.value.salesOverview.rows;
        const url = `${baseApiUrl}/pipeline/f-a/gso?periodDi=${biPeriodVG.value.dataEn.di}&periodDf=${biPeriodVG.value.dataEn.df}&rows=${biData.value.topSellings.dataRepresentacoes.join(',')}`;
        biData.value.salesOverview.loading = true;
        await axios.get(url).then((axiosRes) => {
            const data = axiosRes.data;
            lineData.labels = data.labels;
            lineData.datasets = data.datasets;
        });
        biData.value.salesOverview.loading = false;
    }
};
const lineData = reactive({
    labels: [],
    datasets: []
});
const lineOptions = ref(null);

const loadStats = () => {
    getBiPeriod();
    getBiPeriodVG();
    setTimeout(async () => {
        getCadastrosBi();
        getPropectosBi();
        getPropostasBi();
        getPedidosBi();
        getPedidosLastBi();
        getTopSellersBi();
        getTopProposalsBi();
        await getTopSellingBi();
        getSalesOverviewBi();
    }, Math.random() * 1000 + 250);
};

onMounted(() => {
    loadStats();
});
</script>

<template>
    <div class="grid">
        <div class="col-12 lg:col-6 xl:col-3">
            <div class="card mb-0" style="background-color: rgb(87 115 177 / 8%)">
                <div class="flex justify-content-between mb-3">
                    <div>
                        <span class="block text-500 font-medium mb-3">
                            <router-link :to="`/${userData.schema_description}/cadastros`" v-tooltip.top="'Clique para seguir'">Cadastros</router-link>
                        </span>
                        <Skeleton v-if="biData.cadastros.loading" width="20rem" height="2rem"></Skeleton>
                        <div v-else class="text-900 font-medium text-xl">{{ biData.cadastros.total }}</div>
                    </div>
                    <div class="flex align-items-center justify-content-center bg-gray-100 border-round" style="width: 2.5rem; height: 2.5rem">
                        <i class="fa fa-users text-gray-500 text-xl"></i>
                    </div>
                </div>
                <div>
                    <Skeleton v-if="biData.cadastros.loading" width="20rem" height="2rem"></Skeleton>
                    <span v-else class="text-green-500 font-medium">{{ biData.cadastros.novos }} cadastros </span>
                    <span v-if="!biData.cadastros.loading" class="text-500">neste mês</span>
                </div>
                <div>
                    <Skeleton v-if="biData.cadastros.loading" width="20rem" height="1rem"></Skeleton>
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.cadastros.noPeriodo }} novos </span>
                    <span v-if="!biData.cadastros.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>
        <div class="col-12 lg:col-6 xl:col-3">
            <div class="card mb-0" style="background-color: rgb(87 115 177 / 8%)">
                <div class="flex justify-content-between mb-3">
                    <div>
                        <span class="block text-500 font-medium mb-3">
                            <router-link :to="`/${userData.schema_description}/prospeccoes`" v-tooltip.top="'Clique para seguir'">Visitas</router-link>
                        </span>
                        <Skeleton v-if="biData.prospectos.loading" width="20rem" height="2rem"></Skeleton>
                        <div v-else class="text-900 font-medium text-xl">{{ biData.prospectos.total }}</div>
                    </div>
                    <div class="flex align-items-center justify-content-center bg-gray-100 border-round" style="width: 2.5rem; height: 2.5rem">
                        <i class="fa fa-comments-o text-gray-500 text-xl"></i>
                    </div>
                </div>
                <div>
                    <Skeleton v-if="biData.prospectos.loading" width="20rem" height="2rem"></Skeleton>
                    <span v-else class="text-green-500 font-medium">{{ biData.prospectos.novos }} prospectos </span>
                    <span v-if="!biData.prospectos.loading" class="text-500">neste mês</span>
                </div>
                <div>
                    <Skeleton v-if="biData.prospectos.loading" width="20rem" height="1rem"></Skeleton>
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.prospectos.noPeriodo }} novos </span>
                    <span v-if="!biData.prospectos.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>
        <div class="col-12 lg:col-6 xl:col-3">
            <div class="card mb-0" style="background-color: rgb(87 115 177 / 8%)">
                <div class="flex justify-content-between mb-3">
                    <div>
                        <span class="block text-500 font-medium mb-3">
                            <router-link :to="`/${userData.schema_description}/pipeline?tpd=1`" v-tooltip.top="'Clique para seguir'">Propostas</router-link>
                        </span>
                        <Skeleton v-if="biData.propostas.loading" width="20rem" height="2rem"></Skeleton>
                        <div v-else class="text-900 font-medium text-xl">{{ biData.propostas.total }}</div>
                    </div>
                    <div class="flex align-items-center justify-content-center bg-gray-100 border-round" style="width: 2.5rem; height: 2.5rem">
                        <i class="fa fa-list-alt text-gray-500 text-xl"></i>
                    </div>
                </div>
                <div>
                    <Skeleton v-if="biData.propostas.loading" width="20rem" height="2rem"></Skeleton>
                    <span v-else class="text-green-500 font-medium">{{ biData.propostas.novos }} propostas </span>
                    <span v-if="!biData.propostas.loading" class="text-500">neste mês</span>
                </div>
                <div>
                    <Skeleton v-if="biData.propostas.loading" width="20rem" height="1rem"></Skeleton>
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.propostas.noPeriodo }} novos </span>
                    <span v-if="!biData.propostas.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>
        <div class="col-12 lg:col-6 xl:col-3">
            <div class="card mb-0" style="background-color: rgb(87 115 177 / 8%)">
                <div class="flex justify-content-between mb-3">
                    <div>
                        <span class="block text-500 font-medium mb-3">
                            <router-link :to="`/${userData.schema_description}/pipeline?tpd=2`" v-tooltip.top="'Clique para seguir'">Pedidos</router-link>
                        </span>
                        <Skeleton v-if="biData.pedidos.loading" width="20rem" height="2rem"></Skeleton>
                        <div v-else class="text-900 font-medium text-xl">{{ biData.pedidos.total }}</div>
                    </div>
                    <div class="flex align-items-center justify-content-center bg-gray-100 border-round" style="width: 2.5rem; height: 2.5rem">
                        <i class="fa fa-pie-chart text-gray-500 text-xl"></i>
                    </div>
                </div>
                <div>
                    <Skeleton v-if="biData.pedidos.loading" width="20rem" height="2rem"></Skeleton>
                    <span v-else class="text-green-500 font-medium">{{ biData.pedidos.novos }} pedidos </span>
                    <span v-if="!biData.pedidos.loading" class="text-500">neste mês</span>
                </div>
                <div>
                    <Skeleton v-if="biData.pedidos.loading" width="20rem" height="1rem"></Skeleton>
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.pedidos.noPeriodo }} novos </span>
                    <span v-if="!biData.pedidos.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>
        <div class="col-12 xl:col-6 xl:col-3">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>
                        Vendas recentes<br /><span v-if="!biData.recentSales.loading" class="text-green-500 font-ligth text-xs"> Últimas {{ biData.recentSales.rows }} vendas</span>
                    </h5>
                    <div>
                        <Button icon="pi pi-minus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiRecentSales('less')" v-tooltip.top="'Clique para reduzir'" v-if="biData.recentSales.rows > 1" />
                        <Button icon="pi pi-plus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiRecentSales('plus')" v-tooltip.top="'Clique para adicionar'" v-if="biData.recentSales.rows < 10" />
                    </div>
                </div>
                <DataTable :value="biData.recentSales.data" :rows="biData.recentSales.rows" :paginator="false" responsiveLayout="scroll">
                    <Column style="width: 10%">
                        <template #header> Representação </template>
                        <template #body="slotProps">
                            <img :src="`${slotProps.data.url_logo ? slotProps.data.url_logo : '/assets/images/AddressBook.jpg'}`" :alt="slotProps.data.representacao" width="50" class="shadow-2" />
                        </template>
                    </Column>
                    <Column style="width: 45%">
                        <template #header> Documento </template>
                        <template #body="slotProps"> {{ slotProps.data.representacao }} {{ slotProps.data.documento }} </template>
                    </Column>
                    <Column style="width: 15%">
                        <template #header> Bruto </template>
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.valor_bruto) }}
                        </template>
                    </Column>
                    <Column field="agente" header="Agente" style="width: 25%"></Column>
                    <Column style="width: 5%">
                        <template #header> Ir </template>
                        <template #body="slotProps">
                            <Button icon="pi pi-search" type="button" class="p-button-text" @click="irRecentSale(slotProps.data.id)" v-tooltip.left="'Clique para seguir'" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
        <div class="col-12 xl:col-6 xl:col-3">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>
                        Resultados por agente
                        <br /><span v-if="!biData.topSellers.loading" class="text-green-500 font-ligth text-xs"> No período {{ biPeriod.dataPt }}</span> <br /><span v-if="!biData.topSellers.loading" class="text-green-500 font-ligth text-xs">
                            {{ biData.topSellers.rows }} primeiro{{ `${biData.topSellers.rows > 1 ? 's' : ''}` }} no ranking</span
                        >
                    </h5>
                    <div>
                        <Button icon="pi pi-minus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiTopSellers('less')" v-tooltip.top="'Clique para reduzir'" />
                        <Button icon="pi pi-plus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiTopSellers('plus')" v-tooltip.top="'Clique para adicionar'" />
                    </div>
                </div>
                <ul class="list-none p-0 m-0" v-for="(item, index) in biData.topSellers.data" :key="item.id">
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">{{ item.agente }}</span>
                            <div class="mt-1 text-600">{{ item.quantidade }} fechamentos ({{ formatCurrency(item.valor_bruto) }})</div>
                        </div>
                        <div class="mt-2 md:mt-0 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div :class="`bg-${item.color} h-full`" :style="`width: ${item.percentual}%`"></div>
                            </div>
                            <span :class="`text-${item.color} ml-3 font-medium`">%{{ item.percentual }}</span>
                        </div>
                    </li>
                </ul>
                <div class="flex justify-content-end align-items-center mb-5">
                    <span v-if="!biData.topSellers.loading" class="text-green-500 font-ligth text-base">
                        Fechamento total no período: {{ formatCurrency(biData.topSellers.totalSell) }}, proveniente de {{ biData.topSellers.totalSellQuantity }} venda{{ `${biData.topSellers.totalSellQuantity > 1 ? 's' : ''}` }}</span
                    >
                </div>
            </div>
        </div>
        <div class="col-12 xl:col-6 xl:col-3">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>
                        {{ biData.topSellings.rows > 1 ? biData.topSellings.rows : 'Único' }} produto{{ `${biData.topSellings.rows > 1 ? 's mais' : ''}` }} vendido{{ `${biData.topSellings.rows > 1 ? 's' : ''}` }} <br /><span
                            v-if="!biData.topSellings.loading"
                            class="text-green-500 font-ligth text-xs"
                        >
                            No período {{ biPeriod.dataPt }}</span
                        >
                    </h5>
                    <div>
                        <Button icon="pi pi-minus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiTopSeilling('less')" v-tooltip.top="'Clique para reduzir'" />
                        <Button icon="pi pi-plus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiTopSeilling('plus')" v-tooltip.top="'Clique para adicionar'" />
                    </div>
                </div>
                <ul class="list-none p-0 m-0" v-for="(item, index) in biData.topSellings.data" :key="item.id">
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">{{ item.representacao }}</span>
                            <div class="mt-1 text-600">{{ item.quantidade }} fechamentos ({{ formatCurrency(item.valor_bruto) }})</div>
                        </div>
                        <div class="mt-2 md:mt-0 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div :class="`bg-${item.color} h-full`" :style="`width: ${item.percentual}%`"></div>
                            </div>
                            <span :class="`text-${item.color} ml-3 font-medium`">%{{ item.percentual }}</span>
                        </div>
                    </li>
                </ul>
                <div class="flex justify-content-end align-items-center mb-5">
                    <span v-if="!biData.topSellings.loading" class="text-green-500 font-ligth text-base">
                        Fechamento total no período: {{ formatCurrency(biData.topSellings.totalSell) }}, proveniente de {{ biData.topSellings.totalSellQuantity }} venda{{ `${biData.topSellings.totalSellQuantity > 1 ? 's' : ''}` }}</span
                    >
                </div>
            </div>
        </div>
        <div class="col-12 xl:col-6 xl:col-3">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>
                        {{ biData.topProposals.rows > 1 ? biData.topProposals.rows : 'Único' }} produto{{ `${biData.topProposals.rows > 1 ? 's mais' : ''}` }} proposto{{ `${biData.topProposals.rows > 1 ? 's' : ''}` }} <br /><span
                            v-if="!biData.topProposals.loading"
                            class="text-green-500 font-ligth text-xs"
                        >
                            No período {{ biPeriod.dataPt }}</span
                        >
                    </h5>
                    <div>
                        <Button icon="pi pi-minus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiTopProposals('less')" v-tooltip.top="'Clique para reduzir'" />
                        <Button icon="pi pi-plus" class="p-button-text p-button-plain p-button-rounded" @click="applyBiTopProposals('plus')" v-tooltip.top="'Clique para adicionar'" />
                    </div>
                </div>
                <ul class="list-none p-0 m-0" v-for="(item, index) in biData.topProposals.data" :key="item.id">
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">{{ item.representacao }}</span>
                            <div class="mt-1 text-600">{{ item.quantidade }} propostas ({{ formatCurrency(item.valor_bruto) }})</div>
                        </div>
                        <div class="mt-2 md:mt-0 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div :class="`bg-${item.color} h-full`" :style="`width: ${item.percentual}%`"></div>
                            </div>
                            <span :class="`text-${item.color} ml-3 font-medium`">%{{ item.percentual }}</span>
                        </div>
                    </li>
                </ul>
                <div class="flex justify-content-end align-items-center mb-5">
                    <span v-if="!biData.topProposals.loading" class="text-green-500 font-ligth text-base">
                        Total no período: {{ formatCurrency(biData.topProposals.totalProposed) }}, proveniente de {{ biData.topProposals.totalProposedQuantity }} proposta{{ `${biData.topProposals.totalProposedQuantity > 1 ? 's' : ''}` }}</span
                    >
                </div>
            </div>
        </div>
        <div class="col-12" v-if="lineData.labels.length > 0">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>Visão geral de vendas sobre os produtos mais vendidos</h5>
                    <Calendar
                        aria-describedby="username-help"
                        showIcon
                        dateFormat="dd/mm/yy"
                        v-model="biPeriodVG"
                        selectionMode="range"
                        :numberOfMonths="2"
                        :manualInput="true"
                        showButtonBar
                        class="custom-calendar"
                        @update:modelValue="applyBiParamsVG()"
                    />
                </div>
                <Chart type="line" :data="lineData" :options="lineOptions" />
            </div>
        </div>

        <div class="col-12 xl:col-6 xl:col-3">
            <!-- <div class="card">
            <div class="flex align-items-center justify-content-between mb-4">
                <h5>Notificações</h5>
                <div>
                    <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-plain p-button-rounded" @click="$refs.menu1.toggle($event)"></Button>
                    <Menu ref="menu1" :popup="true" :model="items"></Menu>
                </div>
            </div>

            <span class="block text-600 font-medium mb-3">TODAY</span>
            <ul class="p-0 mx-0 mt-0 mb-4 list-none">
                <li class="flex align-items-center py-2 border-bottom-1 surface-border">
                    <div class="w-3rem h-3rem flex align-items-center justify-content-center bg-gray-100 border-circle mr-3 flex-shrink-0">
                        <i class="pi pi-dollar text-xl text-blue-500"></i>
                    </div>
                    <span class="text-900 line-height-3"
                        >Richard Jones
                        <span class="text-700">has purchased a blue t-shirt for <span class="text-blue-500">79$</span></span>
                    </span>
                </li>
                <li class="flex align-items-center py-2">
                    <div class="w-3rem h-3rem flex align-items-center justify-content-center bg-orange-100 border-circle mr-3 flex-shrink-0">
                        <i class="pi pi-download text-xl text-orange-500"></i>
                    </div>
                    <span class="text-700 line-height-3">Your request for withdrawal of <span class="text-blue-500 font-medium">2500$</span> has been initiated.</span>
                </li>
            </ul>

            <span class="block text-600 font-medium mb-3">YESTERDAY</span>
            <ul class="p-0 m-0 list-none">
                <li class="flex align-items-center py-2 border-bottom-1 surface-border">
                    <div class="w-3rem h-3rem flex align-items-center justify-content-center bg-gray-100 border-circle mr-3 flex-shrink-0">
                        <i class="pi pi-dollar text-xl text-blue-500"></i>
                    </div>
                    <span class="text-900 line-height-3"
                        >Keyser Wick
                        <span class="text-700">has purchased a black jacket for <span class="text-blue-500">59$</span></span>
                    </span>
                </li>
                <li class="flex align-items-center py-2 border-bottom-1 surface-border">
                    <div class="w-3rem h-3rem flex align-items-center justify-content-center bg-pink-100 border-circle mr-3 flex-shrink-0">
                        <i class="pi pi-question text-xl text-pink-500"></i>
                    </div>
                    <span class="text-900 line-height-3"
                        >Jane Davis
                        <span class="text-700">has posted a new questions about your product.</span>
                    </span>
                </li>
            </ul>
        </div> -->
            <div class="card">
                <div class="flex align-items-center justify-content-between mb-4">
                    <h5>Padrões do Dashboard</h5>
                </div>
                <div class="flex justify-content-end mb-5">
                    <div class="flex flex-column gap-2">
                        <label for="biPeriod" style="text-align: end">Período de Exibição Geral</label>
                        <Calendar
                            aria-describedby="username-help"
                            showIcon
                            dateFormat="dd/mm/yy"
                            v-model="biPeriod"
                            selectionMode="range"
                            :numberOfMonths="2"
                            :manualInput="true"
                            showButtonBar
                            class="custom-calendar"
                            @update:modelValue="applyBiParams()"
                        />
                        <small id="username-help">Selecione acima o período desejado para apresentar os resultados nesta tela.</small>
                    </div>
                </div>
                <div class="flex justify-content-end mb-5" v-if="lineData.labels.length == 0">
                    <div class="flex flex-column gap-2">
                        <label for="biPeriodVG" style="text-align: end">Período de Exibição do Gráfico</label>
                        <Calendar
                            aria-describedby="username-help"
                            showIcon
                            dateFormat="dd/mm/yy"
                            v-model="biPeriodVG"
                            selectionMode="range"
                            :numberOfMonths="2"
                            :manualInput="true"
                            showButtonBar
                            class="custom-calendar"
                            @update:modelValue="applyBiParamsVG()"
                        />
                        <small id="username-help">Selecione acima o período desejado para apresentar os resultados no gráfico.</small>
                    </div>
                </div>
                <!-- <div class="flex justify-content-end mb-5">
                <div class="flex flex-column gap-2">
                    <label for="recent_sales_rows" style="text-align: end">Vendas Recentes</label>
                    <div class="p-inputgroup justify-content-end">
                        <Button icon="pi pi-minus" outlined severity="warning" @click="applyBiRecentSales('less')" />
                        <span disabled v-html="biData.recentSales.rows" class="p-inputtext p-component max-w-max" />
                        <Button icon="pi pi-plus" outlined severity="success" @click="applyBiRecentSales('plus')" />
                    </div>
                    <small id="username-help">Selecione acima a quantidade de vendas recentes a serem apresentadas nesta tela.</small>
                </div>
            </div>
            <div class="flex justify-content-end mb-5">
                <div class="flex flex-column gap-2">
                    <label for="recent_sales_rows" style="text-align: end">Produtos mais vendidos</label>
                    <div class="p-inputgroup justify-content-end">
                        <Button icon="pi pi-minus" outlined severity="warning" @click="applyBiTopSeilling('less')" />
                        <span disabled v-html="biData.recentSales.rows" class="p-inputtext p-component max-w-max" />
                        <Button icon="pi pi-plus" outlined severity="success" @click="applyBiTopSeilling('plus')" />
                    </div>
                    <small id="username-help">Selecione acima a quantidade de produtos mais vendidos a serem apresentadas nesta tela.</small>
                </div>
            </div> -->
            </div>
        </div>
    </div>
</template>
