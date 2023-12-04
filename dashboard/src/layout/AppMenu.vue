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
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: `/${userData.cliente}` }]
    },
    {
        label: 'Clientes',
        items: [
            { label: 'Gestão de Cadastros', icon: 'pi pi-fw pi-id-card', to: `/${userData.cliente}/cadastros` },
            // { label: 'Gestão de Cadastros Lazy', icon: 'pi pi-fw pi-id-card', to: `/${userData.cliente}/cadastros-l` },
            { label: 'Prospecção', icon: 'pi pi-fw pi-map-marker', to: `/${userData.cliente}/prospeccoes` }
        ]
    },
    {
        label: 'Comercial e Documentos',
        items: [
            { label: 'Pipeline', icon: 'pi pi-fw pi-paperclip', to: `/${userData.cliente}/pipeline` },
            { label: 'Propostas', icon: 'pi pi-fw pi-bars', to: `/${userData.cliente}/propostas` },
            { label: 'Protocolos', icon: 'pi pi-fw pi-folder', to: `/${userData.cliente}/protocolos` },
            { label: 'Produtos', icon: 'pi pi-fw pi-shopping-cart', to: `/${userData.cliente}/produtos` }
        ]
    },
    {
        label: 'Pós-vendas',
        items: [
            { label: 'Gestão de Pós-vendas', icon: 'pi pi-fw pi-briefcase', to: `/${userData.cliente}/pos-vendas` },
            { label: 'Técnicos', icon: 'pi pi-fw pi-cog', to: `/${userData.cliente}/tecnicos-pv` }
        ]
    },
    {
        label: 'Financeiro',
        items: [
            { label: 'Gestão de Financeiro', icon: 'pi pi-fw pi-money-bill', to: `/${userData.cliente}/registros` },
            { label: 'Comissões', icon: 'pi pi-fw pi-dollar', to: `/${userData.cliente}/comissoes` },
            { label: 'Retenção', icon: 'pi pi-fw pi-wallet', to: `/${userData.cliente}/retencoes` }
        ]
    },
    {
        label: 'Gestão',
        items: [
            { label: 'Usuários', icon: 'pi pi-fw pi-users', to: `/${userData.cliente}/pipeline` },
            { label: 'Empresa', icon: 'pi pi-fw pi-building', to: `/${userData.cliente}/empresa` },
            { label: 'Parâmetros do Pipeline', icon: 'pi pi-fw pi-cog', to: `/${userData.cliente}/pipeline-params` },
            { label: 'Eventos do sistema', icon: 'pi pi-fw pi-clock', to: `/${userData.cliente}/pipeline` }
        ]
    },
    {
        label: `${userData.name.split(' ')[0]}${userData.name.split(' ')[1] ? ' ' + userData.name.split(' ')[1] : ''}`,
        items: [
            { label: 'Perfil', icon: 'pi pi-fw pi-user', to: `/${userData.cliente}/pipeline` },
            { label: 'Trocar senha', icon: 'pi pi-fw pi-key', to: `/${userData.cliente}/pipeline` },
            { label: 'Sair', icon: 'pi pi-fw pi-sync', to: `/${userData.cliente}/pipeline` }
        ]
    },
    {
        label: 'Suporte',
        items: [
            { label: 'Artigos', icon: 'pi pi-fw pi-bookmark', to: `/${userData.cliente}/pipeline` },
            { label: 'Mensagens', icon: 'pi pi-fw pi-envelope', to: `/${userData.cliente}/pipeline` },
            { label: 'Reviews', icon: 'pi pi-fw pi-sync', to: `/${userData.cliente}/pipeline` },
            // { label: 'Uploads', icon: 'pi pi-fw pi-cloud-upload', to: `/${userData.cliente}/uploads` }
        ]
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
