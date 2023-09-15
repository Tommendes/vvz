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
        label: 'Cadastros',
        items: [
            { label: 'Gestão de Cadastros', icon: 'pi pi-fw pi-id-card', to: `/${user.cliente}/${user.dominio}/cadastros` },
            { label: 'Prospecção', icon: 'pi pi-fw pi-id-card', to: `/${user.cliente}/${user.dominio}/pv` }
        ]
    },
    {
        label: 'Comercial',
        items: [
            { label: 'Pipeline', icon: 'pi pi-fw pi-paperclip', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Propostas', icon: 'pi pi-fw pi-bars', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Produtos', icon: 'pi pi-fw pi-shopping-cart', to: `/${user.cliente}/${user.dominio}/ged` }
        ]
    },
    {
        label: 'Pós-vendas',
        items: [
            { label: 'Assistência Técnica', icon: 'pi pi-fw pi-wrench', to: `/${user.cliente}/${user.dominio}/pv` },
            { label: 'Montagem', icon: 'pi pi-fw pi-box', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Pós-vendas', icon: 'pi pi-fw pi-briefcase', to: `/${user.cliente}/${user.dominio}/ged` }
        ]
    },
    {
        label: 'Financeiro',
        items: [
            { label: 'Registros', icon: 'pi pi-fw pi-money-bill', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Comissões', icon: 'pi pi-fw pi-dollar', to: `/${user.cliente}/${user.dominio}/ged` }
        ]
    },
    {
        label: 'Gestão',
        items: [
            { label: 'Usuários', icon: 'pi pi-fw pi-users', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Empresa', icon: 'pi pi-fw pi-building', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Parâmetros', icon: 'pi pi-fw pi-cog', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Eventos do sistema', icon: 'pi pi-fw pi-clock', to: `/${user.cliente}/${user.dominio}/ged` }
        ]
    },
    {
        label: 'Administrar',
        items: [
            { label: 'Artigos', icon: 'pi pi-fw pi-bookmark', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Mensagens', icon: 'pi pi-fw pi-envelope', to: `/${user.cliente}/${user.dominio}/ged` },
            { label: 'Reviews', icon: 'pi pi-fw pi-sync', to: `/${user.cliente}/${user.dominio}/ged` }
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
