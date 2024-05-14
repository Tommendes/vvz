<script setup>
import { onMounted, ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const model = ref([
    {
        // label: 'Home',
        items: [{ label: 'Dashboard', icon: 'fa-solid fa-home', to: `/${userData.schema_description}` }]
    }
]);

import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
const urlBase = ref(`${baseApiUrl}/users`);
const itemUserData = ref({});
const loadUserData = async () => {
    setTimeout(async () => {
        const url = `${urlBase.value}/${userData.id}`;
        await axios.get(url).then(async (res) => {
            const body = res.data;
            itemUserData.value = body;
            await setMenuByUser();
        });
    }, Math.random() * 1000 + 250);
};

const setMenuByUser = async () => {
    if (itemUserData.value.cadastros >= 1 || itemUserData.value.prospeccoes >= 1) {
        const itemMenu = { label: 'Clientes', items: [] };
        if (itemUserData.value.cadastros >= 1) itemMenu.items.push({ label: 'Cadastros', icon: 'fa-solid fa-id-card', to: `/${userData.schema_description}/cadastros` });
        if (itemUserData.value.prospeccoes >= 1) itemMenu.items.push({ label: 'Prospecção', icon: 'fa-solid fa-map-location-dot', to: `/${userData.schema_description}/prospeccoes` });
        model.value.push(itemMenu);
    }
    if (itemUserData.value.comercial >= 1 || itemUserData.value.pipeline >= 1 || itemUserData.value.protocolos >= 1) {
        const itemMenu = { label: 'Comercial e Documentos', items: [] };
        if (itemUserData.value.comercial >= 1 || itemUserData.value.pipeline >= 1) itemMenu.items.push({ label: 'Pipeline', icon: 'fa-solid fa-paperclip', to: `/${userData.schema_description}/pipeline` });
        if (itemUserData.value.comercial >= 1 || itemUserData.value.pipeline >= 1) itemMenu.items.push({ label: 'Parâmetros do Pipeline', icon: 'fa-solid fa-cog', to: `/${userData.schema_description}/pipeline-params` });
        if (itemUserData.value.comercial >= 1 || itemUserData.value.pipeline >= 1) itemMenu.items.push({ label: 'Propostas', icon: 'fa-solid fa-bars', to: `/${userData.schema_description}/propostas` });
        if (itemUserData.value.comercial >= 1) itemMenu.items.push({ label: 'Produtos', icon: 'fa-solid fa-shopping-cart', to: `/${userData.schema_description}/produtos` });
        if (itemUserData.value.protocolo >= 1) itemMenu.items.push({ label: 'Protocolos', icon: 'fa-solid fa-folder', to: `/${userData.schema_description}/protocolos` });
        model.value.push(itemMenu);
    }
    if (itemUserData.value.pv >= 1 || itemUserData.value.at >= 1) {
        const itemMenu = { label: 'Pós-vendas', items: [] };
        if (itemUserData.value.pv >= 1) itemMenu.items.push({ label: 'Pós-vendas', icon: 'fa-solid fa-briefcase', to: `/${userData.schema_description}/pos-vendas` });
        if (itemUserData.value.at >= 1) itemMenu.items.push({ label: 'Técnicos', icon: 'fa-solid fa-cog', to: `/${userData.schema_description}/tecnicos-pv` });
        model.value.push(itemMenu);
    }
    if (itemUserData.value.financeiro >= 1) {
        const itemMenu = { label: 'Financeiro', items: [] };
        if (itemUserData.value.financeiro >= 1) itemMenu.items.push({ label: 'Movimentação Financeira', icon: 'fa-solid fa-money-bill', to: `/${userData.schema_description}/registros` });
        model.value.push(itemMenu);
    }
    if (itemUserData.value.financeiro >= 1 || itemUserData.value.comissoes >= 1) {
        // if (itemUserData.value.admin >= 2) {
        const itemMenu = { label: 'Comissionamento', items: [] };
        if (itemUserData.value.comissoes >= 1) itemMenu.items.push({ label: 'Comissões', icon: 'fa-solid fa-dollar', to: `/${userData.schema_description}/comissoes` });
        if (itemUserData.value.comissoes >= 1) itemMenu.items.push({ label: 'Agentes', icon: 'fa-solid fa-users', to: `/${userData.schema_description}/comiss-agentes` });
        model.value.push(itemMenu);
    }
    if (itemUserData.value.gestor >= 1) {
        const itemMenu = { label: 'Gestão', items: [] };
        itemMenu.items.push({ label: 'Empresa', icon: 'fa-solid fa-building', to: `/${userData.schema_description}/empresa` });
        itemMenu.items.push({ label: 'Usuários', icon: 'fa-solid fa-users', to: `/${userData.schema_description}/usuarios` });
        itemMenu.items.push({ label: 'Eventos do sistema', icon: 'fa-solid fa-clock', to: `/${userData.schema_description}/eventos` });
        model.value.push(itemMenu);
    }
    if (itemUserData.value.admin >= 1) {
        const itemMenu = { label: 'Suporte', items: [] };
        // itemMenu.items.push({ label: 'Artigos', icon: 'fa-solid fa-bookmark', to: `/${userData.schema_description}/suporte/articles` });
        itemMenu.items.push({ label: 'Mensagens', icon: 'fa-solid fa-envelope', to: `/${userData.schema_description}/messages` });
        // itemMenu.items.push({ label: 'Reviews', icon: 'fa-solid fa-sync', to: `/${userData.schema_description}/suporte/reviews` });
        model.value.push(itemMenu);
    }
};

//     // {
//     //     label: 'Suporte',
//     //     items: [
//     //         { label: 'Artigos', icon: 'fa-solid fa-bookmark', to: `/${userData.schema_description}/suporte/articles` }
//     //         { label: 'Mensagens', icon: 'fa-solid fa-envelope', to: `/${userData.schema_description}/messages` }
//     //         { label: 'Reviews', icon: 'fa-solid fa-sync', to: `/${userData.schema_description}/suporte/reviews` }
//     //     ]
//     }
// ]);
onMounted(async () => {
    await loadUserData();
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
