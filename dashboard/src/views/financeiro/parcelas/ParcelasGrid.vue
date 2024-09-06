<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import ParcelaItem from './ParcelaItem.vue';
import { useRoute } from 'vue-router';
import { formatCurrency } from '../../../global';

const route = useRoute();
// Props do template
const props = defineProps(['idRegistro', 'mode', 'uProf'])
// Emit do template
const emit = defineEmits(['reloadItems', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-retencoes`);
// Mode do form (view, edit, new)
const mode = ref('grid');
const itemData = ref();
const setNewItem = () => {
    mode.value = 'new';
    itemData.value = { "id_fin_lancamentos": props.idRegistro };
}

// Dados das retenções
const itemDataParcelas = ref([]);
// Carragamento de dados do form
const loadParcelas = async () => {
    const id = props.idRegistro || route.params.id;
    const url = `${urlBase.value}/${id}`;
    itemDataParcelas.value = [];
    itemDataParcelas.value = await axios.get(url)
        .then(res => {
            mode.value = 'grid';
            emit('reloadItems', res.data || {});
            return res.data;
        });
}
const cancel = () => { }
onBeforeMount(async () => {
    await loadParcelas();
});
watch(props, (value) => {
    if (value.mode && value.mode != mode.value) mode.value = value.mode;
})
</script>

<template>
    <div>
        <Fieldset :toggleable="true" :collapsed="true" class="mb-3">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-bolt mr-2"></span>
                    <span class="font-bold text-lg">Programação Financeira do Registro</span>
                </div>
            </template>
            <div class="flex justify-content-end mb-3">
                <Button outlined type="button" v-if="props.idRegistro" severity="warning" rounded size="small"
                    icon="fa-solid fa-plus fa-shake" label="Adicionar" @click="setNewItem()" />
            </div>
            <ParcelaItem v-if="mode == 'new'" :mode="mode" :itemData="itemData" @cancel="cancel"
                @reloadItems="loadParcelas" />
            <ParcelaItem v-for="item in itemDataParcelas.data" :key="item.id" :itemData="item" @cancel="cancel"
                @reloadItems="loadParcelas" />
            <div v-if="itemDataParcelas.data && itemDataParcelas.data.length">
                <h4 class="flex justify-content-end">Retenção total sobre o valor bruto: {{
                    formatCurrency(itemDataParcelas.total)
                    }}</h4>
            </div>
        </Fieldset>
        <div v-if="uProf.admin >= 2">
            <p>props.mode: {{ props.mode }}</p>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>