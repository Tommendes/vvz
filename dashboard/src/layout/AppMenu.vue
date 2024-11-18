<script setup>
import { onBeforeMount, ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
    await setMenuByUser();
});

const model = ref([
    {
        // label: 'Home',
        items: [{ label: 'Dashboard', icon: 'fa-solid fa-home', to: `/${uProf.value.schema_description}` }]
    }
]);

const setMenuByUser = async () => {
    if (uProf.value.cadastros >= 1 || uProf.value.prospeccoes >= 1) {
        const itemMenu = { label: 'Clientes', items: [] };
        if (uProf.value.cadastros >= 1) itemMenu.items.push({ label: 'Cadastros', icon: 'fa-solid fa-id-card', to: `/${uProf.value.schema_description}/cadastros` });
        if (uProf.value.prospeccoes >= 1) itemMenu.items.push({ label: 'Prospecção', icon: 'fa-solid fa-map-location-dot', to: `/${uProf.value.schema_description}/prospeccoes` });
        model.value.push(itemMenu);
    }
    if (uProf.value.comercial >= 1 || uProf.value.pipeline >= 1 || uProf.value.protocolos >= 1 || (uProf.value.chat_account_id && uProf.value.chat_status && uProf.value.chat_operator_access_token)) {
        const itemMenu = { label: 'Comercial e Documentos', items: [] };
        if (uProf.value.comercial >= 1 || uProf.value.pipeline >= 1) itemMenu.items.push({ label: 'Pipeline', icon: 'fa-solid fa-paperclip', to: `/${uProf.value.schema_description}/pipeline` });
        if (uProf.value.comercial >= 1 || uProf.value.pipeline >= 1) itemMenu.items.push({ label: 'Parâmetros', icon: 'fa-solid fa-cog', to: `/${uProf.value.schema_description}/pipeline-params` });
        if (uProf.value.comercial >= 1 || uProf.value.pipeline >= 1) itemMenu.items.push({ label: 'Propostas', icon: 'fa-solid fa-bars', to: `/${uProf.value.schema_description}/propostas` });
        if (uProf.value.comercial >= 1) itemMenu.items.push({ label: 'Produtos', icon: 'fa-solid fa-shopping-cart', to: `/${uProf.value.schema_description}/produtos` });
        if (uProf.value.protocolo >= 1) itemMenu.items.push({ label: 'Protocolos', icon: 'fa-solid fa-folder', to: `/${uProf.value.schema_description}/protocolos` });
        if (uProf.value.chat_operator_access_token) itemMenu.items.push({ label: 'Vivazul', icon: 'fa-brands fa-whatsapp', to: `/${uProf.value.schema_description}/azul-bot` });
        model.value.push(itemMenu);
    }
    if (uProf.value.pv >= 1 || uProf.value.at >= 1) {
        const itemMenu = { label: 'Pós-vendas', items: [] };
        if (uProf.value.pv >= 1) itemMenu.items.push({ label: 'Registros', icon: 'fa-solid fa-briefcase', to: `/${uProf.value.schema_description}/pos-vendas` });
        if (uProf.value.at >= 1) itemMenu.items.push({ label: 'Técnicos', icon: 'fa-solid fa-cog', to: `/${uProf.value.schema_description}/tecnicos-pv` });
        model.value.push(itemMenu);
    }
    if ((uProf.value.financeiro >= 1 && uProf.value.comissoes >= 1) || uProf.value.comissoes >= 1 || uProf.value.agente_v >= 1) {
        const itemMenu = { label: 'Comissionamento', items: [] };
        if ((uProf.value.comissoes >= 1 && (!uProf.value.agente_v || uProf.value.gestor >= 1)) || (uProf.value.agente_v >= 1 && uProf.value.gestor >= 1))
            itemMenu.items.push({ label: 'Comissões', icon: 'fa-solid fa-dollar', to: `/${uProf.value.schema_description}/comissoes` });
        if ((uProf.value.comissoes >= 1 && (!uProf.value.agente_v || uProf.value.gestor >= 1)) || (uProf.value.agente_v >= 1 && uProf.value.gestor >= 1))
            itemMenu.items.push({ label: 'Agentes', icon: 'fa-solid fa-users', to: `/${uProf.value.schema_description}/comiss-agentes` });
        if (uProf.value.agente_v >= 1) itemMenu.items.push({ label: 'Minhas Comissões', icon: 'fa-solid fa-hand-holding-dollar', to: `/${uProf.value.schema_description}/comissoes-agente` });
        model.value.push(itemMenu);
    }
    if (uProf.value.financeiro >= 1) {
        const itemMenu = { label: 'Financeiro', items: [] };
        itemMenu.items.push({ label: 'Lançamentos', icon: 'fa-solid fa-cash-register', to: `/${uProf.value.schema_description}/financeiro` });
        model.value.push(itemMenu);
    }
    if (uProf.value.admin >= 2)
        if (uProf.value.fiscal >= 1) {
            const itemMenu = { label: 'Fiscal', items: [] };
            if (uProf.value.fiscal >= 1) itemMenu.items.push({ label: 'Notas', icon: 'fa-solid fa-file-lines', to: `/${uProf.value.schema_description}/notas-fiscais` });
            model.value.push(itemMenu);
        }
    if (uProf.value.gestor >= 1) {
        const itemMenu = { label: 'Gestão', items: [] };
        itemMenu.items.push({ label: 'Empresa', icon: 'fa-solid fa-building', to: `/${uProf.value.schema_description}/empresas` });
        itemMenu.items.push({ label: 'Usuários', icon: 'fa-solid fa-users', to: `/${uProf.value.schema_description}/usuarios` });
        itemMenu.items.push({ label: 'Logs do sistema', icon: 'fa-solid fa-clock', to: `/${uProf.value.schema_description}/eventos` });
        model.value.push(itemMenu);
    }
    if (uProf.value.admin >= 1) {
        const itemMenu = { label: 'Suporte', items: [] };
        // itemMenu.items.push({ label: 'Artigos', icon: 'fa-solid fa-bookmark', to: `/${uProf.value.schema_description}/suporte/articles` });
        itemMenu.items.push({ label: 'Mensagens', icon: 'fa-solid fa-envelope', to: `/${uProf.value.schema_description}/messages` });
        // itemMenu.items.push({ label: 'Reviews', icon: 'fa-solid fa-sync', to: `/${uProf.value.schema_description}/suporte/reviews` });
        model.value.push(itemMenu);
    }
};

//     // {
//     //     label: 'Suporte',
//     //     items: [
//     //         { label: 'Artigos', icon: 'fa-solid fa-bookmark', to: `/${uProf.value.schema_description}/suporte/articles` }
//     //         { label: 'Mensagens', icon: 'fa-solid fa-envelope', to: `/${uProf.value.schema_description}/messages` }
//     //         { label: 'Reviews', icon: 'fa-solid fa-sync', to: `/${uProf.value.schema_description}/suporte/reviews` }
//     //     ]
//     }
// ]);
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
