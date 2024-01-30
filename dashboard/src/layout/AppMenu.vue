<script setup>
import { onMounted, ref } from 'vue';
import AppMenuItem from '.\/AppMenuItem.vue';
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const model = ref([
    {
        // label: 'Home',
        items: [{ label: 'Dashboard', icon: 'fa-solid fa-home', to: `/${userData.schema_description}` }]
    },
    {
        label: 'Clientes',
        items: [
            { label: 'Gestão de Cadastros', icon: 'fa-solid fa-id-card', to: `/${userData.schema_description}/cadastros` },
            { label: 'Prospecção', icon: 'fa-solid fa-map-location-dot', to: `/${userData.schema_description}/prospeccoes` }
        ]
    },
    {
        label: 'Comercial e Documentos',
        items: [
            { label: 'Pipeline', icon: 'fa-solid fa-paperclip', to: `/${userData.schema_description}/pipeline` },
            { label: 'Propostas', icon: 'fa-solid fa-bars', to: `/${userData.schema_description}/propostas` },
            { label: 'Protocolos', icon: 'fa-solid fa-folder', to: `/${userData.schema_description}/protocolos` },
            { label: 'Produtos', icon: 'fa-solid fa-shopping-cart', to: `/${userData.schema_description}/produtos` },
            { label: 'Parâmetros do Pipeline', icon: 'fa-solid fa-cog', to: `/${userData.schema_description}/pipeline-params` }
        ]
    },
    {
        label: 'Pós-vendas',
        items: [
            { label: 'Gestão de Pós-vendas', icon: 'fa-solid fa-briefcase', to: `/${userData.schema_description}/pos-vendas` },
            { label: 'Técnicos', icon: 'fa-solid fa-cog', to: `/${userData.schema_description}/tecnicos-pv` }
        ]
    },
    // {
    //     label: 'Financeiro',
    //     items: [
    //         { label: 'Gestão de Financeiro', icon: 'fa-solid fa-money-bill', to: `/${userData.schema_description}/registros` },
    //         { label: 'Comissões', icon: 'fa-solid fa-dollar', to: `/${userData.schema_description}/comissoes` },
    //         { label: 'Retenção', icon: 'fa-solid fa-wallet', to: `/${userData.schema_description}/retencoes` }
    //     ]
    // },
    {
        label: 'Gestão',
        items: [
            { label: 'Empresa', icon: 'fa-solid fa-building', to: `/${userData.schema_description}/empresa` },
            { label: 'Usuários', icon: 'fa-solid fa-users', to: `/${userData.schema_description}/usuarios` },
            { label: 'Eventos do sistema', icon: 'fa-solid fa-clock', to: `/${userData.schema_description}/eventos` }
        ]
    // },
    // {
    //     label: 'Suporte',
    //     items: [
    //         { label: 'Artigos', icon: 'fa-solid fa-bookmark', to: `/${userData.schema_description}/suporte/articles` },
    //         { label: 'Mensagens', icon: 'fa-solid fa-envelope', to: `/${userData.schema_description}/messages` },
    //         { label: 'Reviews', icon: 'fa-solid fa-sync', to: `/${userData.schema_description}/suporte/reviews` }
    //     ]
    }
]);
onMounted(() => {
    setTimeout(() => {
        // Se userAdmin.admin < 2, remover a última propriedade de model
        if (userData.admin < 2) model.value.pop();
    }, Math.random() * 1000);
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
        <!-- <li>
            <a href="https://www.primefaces.org/primeblocks-vue/#/" target="_blank">
                <img src="/layout/images/banner-primeblocks.png" alt="Prime Blocks" class="w-full mt-3" />
            </a>
        </li> -->
    </ul>
</template>

<style lang="scss" scoped></style>
