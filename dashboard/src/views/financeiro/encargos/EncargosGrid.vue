<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EncargoItem from './EncargoItem.vue';
import { useRoute } from 'vue-router';
import { formatCurrency } from '../../../global';

const route = useRoute();
// Props do template
const props = defineProps(['mode', 'uProf', 'itemDataRoot']);
// Emit do template
const emit = defineEmits(['reloadItems', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-encargos`);
// Mode do form (view, edit, new)
const mode = ref('grid');
const itemData = ref();
const setNewItem = () => {
    mode.value = 'new';
    itemData.value = { id_fin_lancamentos: props.itemDataRoot.id_empresa };
};

// Dados das retenções
const itemDataEncargos = ref([]);
// Carragamento de dados do form
const loadEncargos = async () => {
    const id = props.itemDataRoot.id || route.params.id;
    const url = `${urlBase.value}/${id}`;
    itemDataEncargos.value = [];
    itemDataEncargos.value = await axios.get(url).then((res) => {
        mode.value = 'grid';
        emit('reloadItems', res.data || {});
        return res.data;
    });
};
defineExpose({ loadEncargos }); // Expondo a função para o componente pai
const cancel = () => {};
onBeforeMount(async () => {
    await loadEncargos();
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
                    <span class="font-bold text-lg">Acréscimos e Encargos do Registro</span>
                </div>
            </template>
            <div class="flex justify-content-end mb-3">
                <Button
                    outlined
                    type="button"
                    v-if="props.itemDataRoot.id_empresa"
                    :disabled="Number(props.itemDataRoot.valor_liquido.replace(',', '.')) <= 0"
                    severity="warning"
                    rounded
                    size="small"
                    icon="fa-solid fa-plus fa-shake"
                    label="Adicionar"
                    @click="setNewItem()"
                />
            </div>
            <EncargoItem v-if="mode == 'new'" :mode="mode" :itemData="itemData" @cancel="cancel" @reloadItems="loadEncargos" :uProf="uProf" :itemDataRoot="props.itemDataRoot" :encargoTotal="itemDataEncargos.total" />
            <EncargoItem v-for="item in itemDataEncargos.data" :key="item.id" :itemData="item" @cancel="cancel" @reloadItems="loadEncargos" :uProf="uProf" :itemDataRoot="props.itemDataRoot" :encargoTotal="itemDataEncargos.total" />
            <div v-if="itemDataEncargos.data && itemDataEncargos.data.length">
                <h4 class="flex justify-content-end">Acréscimo total sobre o valor bruto: {{ formatCurrency(itemDataEncargos.total) }}</h4>
            </div>
        </Fieldset>
        <div v-if="uProf.admin >= 2">
            <p>props.mode: {{ props.mode }}</p>
            <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
