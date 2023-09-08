<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import router from '../../router';
import { defaultSuccess, defaultWarn } from '@/toast';
import CadastroForm from './CadastroForm.vue';
import ContatosGrid from './contatos/ContatosGrid.vue';
import EnderecosGrid from './enderecos/EnderecosGrid.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useUserStore } from '@/stores/user';
const store = useUserStore();

const itemData = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cadastros/${route.params.id}`);

const loadData = async () => {
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
};

onBeforeMount(() => {
    loadData();
});
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <h5>{{ itemData.nome + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }}</h5>
                <TabView>
                    <TabPanel>
                        <template #header>
                            <i class="pi pi-fw pi-id-card mr-2"></i>
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
                        <EnderecosGrid v-if="itemData.id" :itemDataRoot="itemData"/>
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-paperclip mr-2"></i>
                            <span>Pipeline</span>
                        </template>
                        <p class="line-height-3 m-0">
                            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
                            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto
                            beatae vitae dicta sunt explicabo. Nemo
                            enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur
                            magni dolores eos qui ratione voluptatem sequi nesciunt. Consectetur, adipisci velit, sed quia
                            non numquam eius modi.
                        </p>
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="pi pi-cart-plus mr-2"></i>
                            <span>Pós-vendas</span>
                        </template>
                        <p class="line-height-3 m-0">
                            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
                            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto
                            beatae vitae dicta sunt explicabo. Nemo
                        enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur
                        magni dolores eos qui ratione voluptatem sequi nesciunt. Consectetur, adipisci velit, sed quia
                        non numquam eius modi.
                    </p>
                </TabPanel>
            </TabView>
        </div>
    </div>
</div></template>
