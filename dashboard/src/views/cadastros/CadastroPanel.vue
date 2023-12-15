<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import router from '../../router';
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

import { useRoute } from 'vue-router';
const route = useRoute();

const itemData = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cadastros/${route.params.id}`);

const loadData = async () => {
    setTimeout(async () => {
        await axios.get(urlBase.value).then((res) => {
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
    }, Math.random() * 1000 + 250);
};

onBeforeMount(() => {
    loadData();
});
</script>

<template>
    <Breadcrumb v-if="itemData.id" :items="[{ label: 'Todos os cadastros', to: `/${userData.schema_description}/cadastros` }, { label: itemData.nome + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <TabView>
                    <TabPanel>
                        <template #header>
                            <i class="fa-regular fa-address-card mr-2"></i>
                            <span>Dados básicos</span>
                        </template>
                        <CadastroForm />
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
                            <span>Endereços</span>
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
