<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultWarn } from '@/toast';
import ComissaoForm from './ComissaoForm.vue';
// import ContatosGrid from './contatos/ContatosGrid.vue';
// import EnderecosGrid from './enderecos/EnderecosGrid.vue';
// import PipelinesGrid from '../pipeline/PipelinesGrid.vue';
// import PosVendasGrid from '../posVendas/PosVendasGrid.vue';
// import ProspeccoesGrid from '../prospeccoes/ProspeccoesGrid.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

const itemData = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/comissao/${route.params.id}`);

const loadData = async () => {
    setTimeout(async () => {
        await axios.get(urlBase.value).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push(urlBase.value);
            }
        });
    }, Math.random() * 1000);
};
onBeforeMount(() => {
    loadData();
});
</script>

<template>
    <Breadcrumb
        v-if="itemData.id"
        :items="[
            { label: 'Todos as as Comissões', to: `/${userData.schema_description}/comissoes` },
            { label: itemData.nome + (userData.admin >= 1 ? `: (${itemData.id})` : ''), to: route.fullPath }
        ]"
    />
    <div class="grid" :style="route.name == 'cadastro' ? 'min-width: 100rem;' : ''">
        <div class="col-12">
            <div class="card">
                <TabView lazy>
                    <TabPanel>
                        <template #header>
                            <i class="fa-regular fa-address-card mr-2"></i>
                            <span>Dados básicos</span>
                        </template>
                        <ComissaoForm/>
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-at mr-2"></i>
                            <span>Contatos Adicionais</span>
                        </template>
                        <ContatosGrid v-if="itemData.id" :itemDataRoot="itemData" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-map-pin mr-2"></i>
                            <span>Endereços Adicionais</span>
                        </template>
                        <EnderecosGrid v-if="itemData.id" :itemDataRoot="itemData" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-paperclip mr-2"></i>
                            <span>Pipeline</span>
                        </template>
                        <PipelinesGrid v-if="itemData.id" :idCadastro="itemData.id" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-cart-plus mr-2"></i>
                            <span>Pós-vendas</span>
                        </template>
                        <PosVendasGrid v-if="itemData.id" :idCadastro="itemData.id" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-map-location-dot mr-2"></i>
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
