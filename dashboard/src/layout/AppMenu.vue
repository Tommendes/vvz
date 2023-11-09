<script setup>
import { ref } from 'vue';
import AppMenuItem from '.\/AppMenuItem.vue';
import { useUserStore } from '@/stores/user';
import { userKey } from '../global';
const json = localStorage.getItem(userKey);
const user = JSON.parse(json);

const model = ref([
    {
        // label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: `/${user.cliente}/${user.dominio}` }]
    },
    {
        label: 'Clientes',
        items: [
            { label: 'Gestão de Cadastros', icon: 'pi pi-fw pi-id-card', to: `/${user.cliente}/${user.dominio}/cadastros` },
            // { label: 'Gestão de Cadastros Lazy', icon: 'pi pi-fw pi-id-card', to: `/${user.cliente}/${user.dominio}/cadastros-l` },
            { label: 'Prospecção', icon: 'pi pi-fw pi-map-marker', to: `/${user.cliente}/${user.dominio}/prospeccoes` }
        ]
    },
    {
        label: 'Comercial',
        items: [
            { label: 'Pipeline', icon: 'pi pi-fw pi-paperclip', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Protocolos', icon: 'pi pi-fw pi-folder', to: `/${user.cliente}/${user.dominio}/protocolos` },
            { label: 'Propostas', icon: 'pi pi-fw pi-bars', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Produtos', icon: 'pi pi-fw pi-shopping-cart', to: `/${user.cliente}/${user.dominio}/pipeline` }
        ]
    },
    {
        label: 'Pós-vendas',
        items: [
            { label: 'Gestão de Pós-vendas', icon: 'pi pi-fw pi-briefcase', to: `/${user.cliente}/${user.dominio}/pos-vendas` },
            { label: 'Técnicos', icon: 'pi pi-fw pi-cog', to: `/${user.cliente}/${user.dominio}/tecnicos-pv` }
        ]
    },
    {
        label: 'Financeiro',
        items: [
            { label: 'Gestão de Financeiro', icon: 'pi pi-fw pi-money-bill', to: `/${user.cliente}/${user.dominio}/registros` },
            { label: 'Comissões', icon: 'pi pi-fw pi-dollar', to: `/${user.cliente}/${user.dominio}/comissoes` },
            { label: 'Retenção', icon: 'pi pi-fw pi-wallet', to: `/${user.cliente}/${user.dominio}/retencoes` }
        ]
    },
    {
        label: 'Gestão',
        items: [
            { label: 'Usuários', icon: 'pi pi-fw pi-users', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Empresa', icon: 'pi pi-fw pi-building', to: `/${user.cliente}/${user.dominio}/empresa` },
            { label: 'Parâmetros do Pipeline', icon: 'pi pi-fw pi-cog', to: `/${user.cliente}/${user.dominio}/pipeline_params` },
            { label: 'Eventos do sistema', icon: 'pi pi-fw pi-clock', to: `/${user.cliente}/${user.dominio}/pipeline` }
        ]
    },
    {
        label: `${user.name.split(' ')[0]}${user.name.split(' ')[1] ? ' ' + user.name.split(' ')[1] : ''}`,
        items: [
            { label: 'Perfil', icon: 'pi pi-fw pi-user', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Trocar senha', icon: 'pi pi-fw pi-key', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Sair', icon: 'pi pi-fw pi-sync', to: `/${user.cliente}/${user.dominio}/pipeline` }
        ]
    },
    {
        label: 'Administrar',
        items: [
            { label: 'Artigos', icon: 'pi pi-fw pi-bookmark', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Mensagens', icon: 'pi pi-fw pi-envelope', to: `/${user.cliente}/${user.dominio}/pipeline` },
            { label: 'Reviews', icon: 'pi pi-fw pi-sync', to: `/${user.cliente}/${user.dominio}/pipeline` }
        ]
    }
]);
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
