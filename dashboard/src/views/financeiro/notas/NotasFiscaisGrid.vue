<script setup>
import { onBeforeMount, ref, watch } from 'vue';
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import NotaFiscalItem from './NotaFiscalItem.vue';
import { useRoute } from 'vue-router';
import { formatCurrency } from '../../../global';

const route = useRoute();
// Props do template
const props = defineProps(['itemDataRoot', 'mode', 'uProf']);
// Emit do template
const emit = defineEmits(['reloadItems', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-retencoes`);
// Mode do form (view, edit, new)
const mode = ref('grid');
const itemData = ref();
const setNewItem = () => {
    mode.value = 'new';
    itemData.value = { id_fin_lancamentos: props.itemDataRoot.id_empresa };
};
// Dados das retenções
const itemDataNotas = ref([]);
// Carragamento de dados do form
const loadNotas = async () => {
    const id = props.itemDataRoot.id_empresa || route.params.id;
    const url = `${urlBase.value}/${id}`;
    itemDataNotas.value = [];
    itemDataNotas.value = await axios.get(url).then((res) => {
        mode.value = 'grid';
        emit('reloadItems', res.data || {});
        return res.data;
    });
};
defineExpose({ loadNotas }); // Expondo a função para o componente pai
const cancel = () => {};
onBeforeMount(async () => {
    await loadNotas();
});
watch(props, (value) => {
    if (value.mode && value.mode != mode.value) mode.value = value.mode;
});
</script>

<template>
    <div>
        <Fieldset :toggleable="true" :collapsed="true" class="mb-3">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-bolt mr-2"></span>
                    <span class="font-bold text-lg">Notas Fiscais do Registro</span>
                </div>
            </template>
            <div class="flex justify-content-end mb-3">
                <Button outlined type="button" v-if="props.itemDataRoot.id_empresa" severity="warning" rounded size="small" icon="fa-solid fa-plus fa-shake" label="Adicionar" @click="setNewItem()" />
            </div>
            <NotaFiscalItem v-if="mode == 'new'" :mode="mode" :itemData="itemData" @cancel="cancel" @reloadItems="loadNotas" :uProf="uProf" />
            <NotaFiscalItem v-for="item in itemDataNotas.data" :key="item.id" :itemData="item" @cancel="cancel" @reloadItems="loadNotas" :uProf="uProf" />
            <div v-if="itemDataNotas.data && itemDataNotas.data.length">
                <h4 class="flex justify-content-end">Retenção total sobre o valor bruto: {{ formatCurrency(itemDataNotas.total) }}</h4>
            </div>
        </Fieldset>
        <div v-if="uProf.admin >= 2">
            <p>props.mode: {{ props.mode }}</p>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
