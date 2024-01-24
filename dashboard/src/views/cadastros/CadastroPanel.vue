<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultWarn } from '@/toast';
import CadastroForm from './CadastroForm.vue';
import ContatosGrid from './contatos/ContatosGrid.vue';
import EnderecosGrid from './enderecos/EnderecosGrid.vue';
import PipelinesGrid from '../pipeline/PipelinesGrid.vue';
import PosVendasGrid from '../posVendas/PosVendasGrid.vue';
import ProspeccoesGrid from '../prospeccoes/ProspeccoesGrid.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute, useRouter } from 'vue-router';
import CadasDadosPublicos from './CadasDadosPublicos.vue';
const route = useRoute();
const router = useRouter();

const itemData = ref({});
const itemDataDadosPublicos = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cadastros/${route.params.id}`);

const loadData = async () => {
    setTimeout(async () => {
        await axios.get(urlBase.value).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                loading.value = false;
                await loadDataDadosPublicos();
            } else {
                defaultWarn('Registro não localizado');
                router.push(urlBase.value);
            }
        });
    }, Math.random() * 1000);
};

const flashDadosPublicos = () => {
    classFlashDadosPublicos.value = 'animation-color animation-fill-none flex align-items-center justify-content-center font-bold border-round px-5';
}
const classFlashDadosPublicos = ref('');
// Carragamento de dados públicos
const loadDataDadosPublicos = async () => {
    if (!itemData.value.id) return;
    // Url base do form action
    setTimeout(async () => {
        if (itemData.value && itemData.value.id) {
            const url = `${baseApiUrl}/cad-dados-publicos/${itemData.value.id}`;
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemDataDadosPublicos.value = body;
                    flashDadosPublicos.value = 'animation-color animation-fill-none flex align-items-center justify-content-center font-bold border-round px-5';
                } else {
                    itemDataDadosPublicos.value = {};
                }
            });
        }
    }, Math.random() * 1000);
};

onBeforeMount(() => {
    loadData();
});
</script>

<template>
    <Breadcrumb v-if="itemData.id" :items="[{ label: 'Todos os cadastros', to: `/${userData.schema_description}/cadastros` }, { label: itemData.nome + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="grid" :style="route.name == 'cadastro' ? 'min-width: 100rem;' : ''">
        <div class="col-12">
            <div class="card">
                <TabView>
                    <TabPanel>
                        <template #header>
                            <i class="fa-regular fa-address-card mr-2"></i>
                            <span>Dados básicos</span>
                        </template>
                        <CadastroForm @dadosPublicos="loadDataDadosPublicos(); flashDadosPublicos()" />
                    </TabPanel>
                    <TabPanel v-if="itemDataDadosPublicos.id">
                        <template #header>
                            <div :class="classFlashDadosPublicos">
                                <i class="fa-regular fa-address-card mr-2"></i>
                                <span>Dados públicos</span>
                            </div>
                        </template>
                        <CadasDadosPublicos :itemData="itemDataDadosPublicos" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-at mr-2"></i>
                            <span>Contatos Adicionais</span>
                        </template>
                        <ContatosGrid v-if="itemData.id" :itemDataRoot="itemData" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-map mr-2"></i>
                            <span>Endereços Adicionais</span>
                        </template>
                        <EnderecosGrid v-if="itemData.id" :itemDataRoot="itemData" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-paperclip mr-2"></i>
                            <span>Pipeline</span>
                        </template>
                        <PipelinesGrid v-if="itemData.id" :idCadastro="itemData.id" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-cart-plus mr-2"></i>
                            <span>Pós-vendas</span>
                        </template>
                        <PosVendasGrid v-if="itemData.id" :idCadastro="itemData.id" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-map-marker mr-2"></i>
                            <span>Prospecções e visitas ao cliente</span>
                        </template>
                        <ProspeccoesGrid v-if="itemData.id" :idCadastro="itemData.id" />
                    </TabPanel>
                </TabView>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes animation-color {
    0% {
        background-color: var(--blue-500);
        color: var(--gray-50);
    }
    50% {
        background-color: var(--yellow-500);
        color: var(--gray-900);
    }
    100% {
        background-color: var(--surface-200);
        color: var(--gray-900);
    }
}

.animation-color {
    animation: animation-color 5s linear;
}
</style>
