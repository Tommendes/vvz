<script setup>
import moment from 'moment';
import { onMounted, reactive, ref } from 'vue';
import { formatCurrency } from '@/global';
import axios from '@/axios-interceptor';
import { baseApiUrl } from '@/env';
import { useRouter } from 'vue-router';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const products = ref(null);
const lineData = reactive({
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [
        {
            label: 'First Dataset',
            data: [65, 59, 80, 81, 56, 55, 40],
            fill: false,
            backgroundColor: '#2f4860',
            borderColor: '#2f4860',
            tension: 0.4
        },
        {
            label: 'Second Dataset',
            data: [28, 48, 40, 19, 86, 27, 90],
            fill: false,
            backgroundColor: '#00bb7e',
            borderColor: '#00bb7e',
            tension: 0.4
        }
    ]
});
const items = ref([
    { label: 'Add New', icon: 'pi pi-fw pi-plus' },
    { label: 'Remove', icon: 'pi pi-fw pi-minus' }
]);
const lineOptions = ref(null);

const biPeriod = ref();
const applyBiParams = () => {
    if (biPeriod.value === null) {
        return;
    }
    const period = biPeriod.value.map((element, index) => {
        const date = moment(element).format('YYYY-MM-DD');
        return index === 0 ? { di: date } : { df: date };
    });
    localStorage.setItem('__biParams', JSON.stringify({ periodo: period }));
    loadStats();
};

const getBiPeriod = () => {
    let biParams = JSON.parse(localStorage.getItem('__biParams'));
    if (biParams && moment(biParams.periodo[0].di, 'YYYY-MM-DD', true).isValid() && moment(biParams.periodo[1].df, 'YYYY-MM-DD', true).isValid()) {
        const dateArray = [];
        let datesPt = 'entre ';
        let dataEn = { di: null, df: null };
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

const loadStats = () => {
    getBiPeriod();
    setTimeout(async () => {
        await getCadastrosBi();
        await getPropectosBi();
        await getPropostasBi();
        await getPedidosBi();
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
                            <router-link :to="`/${userData.cliente}/${userData.dominio}/cadastros`" v-tooltip.top="'Clique para seguir'">Cadastros</router-link>
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
                    <span v-else class="text-green-500 font-medium">{{ biData.cadastros.novos }} novos </span>
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
                            <router-link :to="`/${userData.cliente}/${userData.dominio}/prospeccoes`" v-tooltip.top="'Clique para seguir'">Visitas</router-link>
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
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.prospectos.noPeriodo }} prospectos </span>
                    <span v-if="!biData.prospectos.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>
        <div class="col-12 lg:col-6 xl:col-3">
            <div class="card mb-0" style="background-color: rgb(87 115 177 / 8%)">
                <div class="flex justify-content-between mb-3">
                    <div>
                        <span class="block text-500 font-medium mb-3">
                            <router-link :to="`/${userData.cliente}/${userData.dominio}/pipeline?tpd=1`" v-tooltip.top="'Clique para seguir'">Propostas</router-link>
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
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.propostas.noPeriodo }} propostas </span>
                    <span v-if="!biData.propostas.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>
        <div class="col-12 lg:col-6 xl:col-3">
            <div class="card mb-0" style="background-color: rgb(87 115 177 / 8%)">
                <div class="flex justify-content-between mb-3">
                    <div>
                        <span class="block text-500 font-medium mb-3">
                            <router-link :to="`/${userData.cliente}/${userData.dominio}/pipeline?tpd=2`" v-tooltip.top="'Clique para seguir'">Pedidos</router-link>
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
                    <span v-else class="text-green-500 font-ligth text-xs">{{ biData.pedidos.noPeriodo }} pedidos </span>
                    <span v-if="!biData.pedidos.loading" class="text-500 font-ligth text-xs">no período {{ biPeriod.dataPt }}</span>
                </div>
            </div>
        </div>

        <div class="col-12 xl:col-6">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>Vendas recentes</h5>
                    <div>
                        <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-plain p-button-rounded" @click="$refs.menu4.toggle($event)"></Button>
                        <Menu ref="menu4" :popup="true" :model="items"></Menu>
                    </div>
                </div>
                <DataTable :value="products" :rows="5" :paginator="true" responsiveLayout="scroll">
                    <Column style="width: 15%">
                        <template #header> Image </template>
                        <template #body="slotProps">
                            <img :src="'demo/images/product/' + slotProps.data.image" :alt="slotProps.data.image" width="50" class="shadow-2" />
                        </template>
                    </Column>
                    <Column field="name" header="Name" :sortable="true" style="width: 35%"></Column>
                    <Column field="price" header="Price" :sortable="true" style="width: 35%">
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.price) }}
                        </template>
                    </Column>
                    <Column style="width: 15%">
                        <template #header> View </template>
                        <template #body>
                            <Button icon="pi pi-search" type="button" class="p-button-text"></Button>
                        </template>
                    </Column>
                </DataTable>
            </div>
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>Produtos mais vendidos</h5>
                    <div>
                        <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-plain p-button-rounded" @click="$refs.menu2.toggle($event)"></Button>
                        <Menu ref="menu2" :popup="true" :model="items"></Menu>
                    </div>
                </div>
                <ul class="list-none p-0 m-0">
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Space T-Shirt</span>
                            <div class="mt-1 text-600">Clothing</div>
                        </div>
                        <div class="mt-2 md:mt-0 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-orange-500 h-full" style="width: 50%"></div>
                            </div>
                            <span class="text-orange-500 ml-3 font-medium">%50</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Portal Sticker</span>
                            <div class="mt-1 text-600">Accessories</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-cyan-500 h-full" style="width: 16%"></div>
                            </div>
                            <span class="text-cyan-500 ml-3 font-medium">%16</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Supernova Sticker</span>
                            <div class="mt-1 text-600">Accessories</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-pink-500 h-full" style="width: 67%"></div>
                            </div>
                            <span class="text-pink-500 ml-3 font-medium">%67</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Wonders Notebook</span>
                            <div class="mt-1 text-600">Office</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-green-500 h-full" style="width: 35%"></div>
                            </div>
                            <span class="text-green-500 ml-3 font-medium">%35</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Mat Black Case</span>
                            <div class="mt-1 text-600">Accessories</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-purple-500 h-full" style="width: 75%"></div>
                            </div>
                            <span class="text-purple-500 ml-3 font-medium">%75</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Robots T-Shirt</span>
                            <div class="mt-1 text-600">Clothing</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-teal-500 h-full" style="width: 40%"></div>
                            </div>
                            <span class="text-teal-500 ml-3 font-medium">%40</span>
                        </div>
                    </li>
                </ul>
            </div>
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-5">
                    <h5>Resultados por agente</h5>
                    <div>
                        <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-plain p-button-rounded" @click="$refs.menu3.toggle($event)"></Button>
                        <Menu ref="menu3" :popup="true" :model="items"></Menu>
                    </div>
                </div>
                <ul class="list-none p-0 m-0">
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Space T-Shirt</span>
                            <div class="mt-1 text-600">Clothing</div>
                        </div>
                        <div class="mt-2 md:mt-0 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-orange-500 h-full" style="width: 50%"></div>
                            </div>
                            <span class="text-orange-500 ml-3 font-medium">%50</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Portal Sticker</span>
                            <div class="mt-1 text-600">Accessories</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-cyan-500 h-full" style="width: 16%"></div>
                            </div>
                            <span class="text-cyan-500 ml-3 font-medium">%16</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Supernova Sticker</span>
                            <div class="mt-1 text-600">Accessories</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-pink-500 h-full" style="width: 67%"></div>
                            </div>
                            <span class="text-pink-500 ml-3 font-medium">%67</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Wonders Notebook</span>
                            <div class="mt-1 text-600">Office</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-green-500 h-full" style="width: 35%"></div>
                            </div>
                            <span class="text-green-500 ml-3 font-medium">%35</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Mat Black Case</span>
                            <div class="mt-1 text-600">Accessories</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-purple-500 h-full" style="width: 75%"></div>
                            </div>
                            <span class="text-purple-500 ml-3 font-medium">%75</span>
                        </div>
                    </li>
                    <li class="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4">
                        <div>
                            <span class="text-900 font-medium mr-2 mb-1 md:mb-0">Robots T-Shirt</span>
                            <div class="mt-1 text-600">Clothing</div>
                        </div>
                        <div class="mt-2 md:mt-0 ml-0 md:ml-8 flex align-items-center">
                            <div class="surface-300 border-round overflow-hidden w-10rem lg:w-6rem" style="height: 8px">
                                <div class="bg-teal-500 h-full" style="width: 40%"></div>
                            </div>
                            <span class="text-teal-500 ml-3 font-medium">%40</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <div class="col-12 xl:col-6">
            <div class="card">
                <h5>Visão geral de vendas</h5>
                <Chart type="line" :data="lineData" :options="lineOptions" />
            </div>
            <div class="card">
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
            </div>
            <div class="card">
                <div class="flex align-items-center justify-content-between mb-4">
                    <h5>Configurar Dashboard</h5>
                </div>
                <div class="flex justify-content-end mb-5">
                    <div class="flex flex-column gap-2">
                        <label for="biPeriod" style="text-align: end">Período de Exibição</label>
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
            </div>
            <!-- <div
                class="px-4 py-5 shadow-2 flex flex-column md:flex-row md:align-items-center justify-content-between mb-3"
                style="border-radius: 1rem; background: linear-gradient(0deg, rgba(0, 123, 255, 0.5), rgba(0, 123, 255, 0.5)), linear-gradient(92.54deg, #1c80cf 47.88%, #ffffff 100.01%)"
            >
                <div>
                    <div class="text-gray-100 font-medium text-xl mt-2 mb-3">TAKE THE NEXT STEP</div>
                    <div class="text-white font-medium text-5xl">Try PrimeBlocks</div>
                </div>
                <div class="mt-4 mr-auto md:mt-0 md:mr-0">
                    <a href="https://www.primefaces.org/primeblocks-vue" class="p-button font-bold px-5 py-3 p-button-warning p-button-rounded p-button-raised"> Get Started </a>
                </div>
            </div> -->
        </div>
    </div>
</template>
