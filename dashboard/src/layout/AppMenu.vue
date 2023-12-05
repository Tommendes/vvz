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
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: `/${userData.schema_description}` }]
    },
    {
        label: 'Clientes',
        items: [
            { label: 'Gestão de Cadastros', icon: 'pi pi-fw pi-id-card', to: `/${userData.schema_description}/cadastros` },
            // { label: 'Gestão de Cadastros Lazy', icon: 'pi pi-fw pi-id-card', to: `/${userData.schema_description}/cadastros-l` },
            { label: 'Prospecção', icon: 'pi pi-fw pi-map-marker', to: `/${userData.schema_description}/prospeccoes` }
        ]
    },
    {
        label: 'Comercial e Documentos',
        items: [
            { label: 'Pipeline', icon: 'pi pi-fw pi-paperclip', to: `/${userData.schema_description}/pipeline` },
            { label: 'Propostas', icon: 'pi pi-fw pi-bars', to: `/${userData.schema_description}/propostas` },
            { label: 'Protocolos', icon: 'pi pi-fw pi-folder', to: `/${userData.schema_description}/protocolos` },
            { label: 'Produtos', icon: 'pi pi-fw pi-shopping-cart', to: `/${userData.schema_description}/produtos` }
        ]
    },
    {
        label: 'Pós-vendas',
        items: [
            { label: 'Gestão de Pós-vendas', icon: 'pi pi-fw pi-briefcase', to: `/${userData.schema_description}/pos-vendas` },
            { label: 'Técnicos', icon: 'pi pi-fw pi-cog', to: `/${userData.schema_description}/tecnicos-pv` }
        ]
    },
    {
        label: 'Financeiro',
        items: [
            { label: 'Gestão de Financeiro', icon: 'pi pi-fw pi-money-bill', to: `/${userData.schema_description}/registros` },
            { label: 'Comissões', icon: 'pi pi-fw pi-dollar', to: `/${userData.schema_description}/comissoes` },
            { label: 'Retenção', icon: 'pi pi-fw pi-wallet', to: `/${userData.schema_description}/retencoes` }
        ]
    },
    {
        label: 'Gestão',
        items: [
            { label: 'Usuários', icon: 'pi pi-fw pi-users', to: `/${userData.schema_description}/pipeline` },
            { label: 'Empresa', icon: 'pi pi-fw pi-building', to: `/${userData.schema_description}/empresa` },
            { label: 'Parâmetros do Pipeline', icon: 'pi pi-fw pi-cog', to: `/${userData.schema_description}/pipeline-params` },
            { label: 'Eventos do sistema', icon: 'pi pi-fw pi-clock', to: `/${userData.schema_description}/pipeline` }
        ]
    },
    {
        label: `${userData.name.split(' ')[0]}${userData.name.split(' ')[1] ? ' ' + userData.name.split(' ')[1] : ''}`,
        items: [
            { label: 'Perfil', icon: 'pi pi-fw pi-user', to: `/${userData.schema_description}/pipeline` },
            { label: 'Trocar senha', icon: 'pi pi-fw pi-key', to: `/${userData.schema_description}/pipeline` },
            { label: 'Sair', icon: 'pi pi-fw pi-sync', to: `/${userData.schema_description}/pipeline` }
        ]
    },
    {
        label: 'Suporte',
        items: [
            { label: 'Artigos', icon: 'pi pi-fw pi-bookmark', to: `/${userData.schema_description}/pipeline` },
            { label: 'Mensagens', icon: 'pi pi-fw pi-envelope', to: `/${userData.schema_description}/pipeline` },
            { label: 'Reviews', icon: 'pi pi-fw pi-sync', to: `/${userData.schema_description}/pipeline` },
            // { label: 'Uploads', icon: 'pi pi-fw pi-cloud-upload', to: `/${userData.schema_description}/uploads` }
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
