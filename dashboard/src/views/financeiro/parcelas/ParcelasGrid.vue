<script setup>
import { onBeforeMount, onMounted, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import ParcelaItem from './ParcelaItem.vue';
import { useRoute } from 'vue-router';
import { formatCurrency } from '../../../global';
import moment from 'moment';

const route = useRoute();
// Props do template
const props = defineProps(['itemDataRoot', 'mode', 'uProf', 'totalLiquido'])
// Emit do template
const emit = defineEmits(['reloadItems', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-parcelas`);
// Mode do form (view, edit, new)
const mode = ref('grid');
const itemData = ref();
const missingValue = ref(0)
const setNewItem = () => {
    mode.value = 'new';
    itemData.value = { "id_fin_lancamentos": props.itemDataRoot.id };
}

// Dados das parcelas
const itemDataParcelas = ref([]);
// Carragamento de dados do form
const loadParcelas = async () => {
    const id = props.itemDataRoot.id || route.params.id;
    const url = `${urlBase.value}/${id}`;
    let itemPosition = 0;
    itemDataParcelas.value = [];
    itemDataParcelas.value = await axios.get(url)
        .then(res => {
            mode.value = 'grid';
            res.data.data.forEach(element => {
                element.itemPosition = String(itemPosition++);
            });
            emit('reloadItems', res.data || {});
            console.log(props.totalLiquido, res.data.total);

            if (props.totalLiquido && res.data.total) {
                const totalLiquido = Number(props.totalLiquido.replace(',', '.'));
                const totalParcelas = Number(res.data.total.replace(',', '.'))
                missingValue.value = totalParcelas - totalLiquido;
            } else {
                missingValue.value = 0;
            }
            return res.data;
        });
}
defineExpose({ loadParcelas }); // Expondo a função para o componente pai
const setAdicionalVencimentoClass = (item) => {
    let labelTo = 'Parcela ' + (item.parcela === 'U' ? 'Única' : item.parcela)
    let classTo = 'text-red-500';
    if (item.situacaoVencimento == '0') {
        labelTo += ' vencida em ';
    } else if (item.situacaoVencimento == '1') {
        labelTo += ' a vencer em ';
        classTo = 'text-yellow-500';
    } else if (item.situacaoVencimento == '2') {
        labelTo += ' vencendo em ';
        classTo = 'text-green-500';
    } else {
        labelTo += ' com vencimento em ';
        classTo = '';
    }
    labelTo += moment(item.data_vencimento).format('DD/MM/YYYY')
    return { class: classTo, label: labelTo };
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
        <Fieldset :toggleable="true" :collapsed="false" class="mb-1">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-bolt mr-2"></span>
                    <span class="font-bold text-lg">Planejamento Financeiro do Registro</span>
                </div>
            </template>
            <div class="flex justify-content-end mb-1">
                <Button outlined type="button" v-if="props.itemDataRoot.id" severity="warning" rounded size="small"
                    icon="fa-solid fa-plus fa-shake" label="Adicionar" @click="setNewItem()" />
            </div>
            <div v-if="missingValue || (itemDataParcelas.data && itemDataParcelas.data.length)">
                <h4 v-if="itemDataParcelas.data && itemDataParcelas.data.length" class="flex justify-content-end mt-1">Soma total das parcelas: {{ formatCurrency(itemDataParcelas.total) }}</h4>
                <h4 v-if="itemDataParcelas.emAtraso && itemDataParcelas.emAtraso != '0,00' && itemDataParcelas.data && itemDataParcelas.data.length" class="flex justify-content-end mt-1 text-red-500">Em atraso: {{ formatCurrency(itemDataParcelas.emAtraso) }}</h4>
                <h4 v-if="itemDataParcelas.estaSemana.length && itemDataParcelas.data && itemDataParcelas.data.length" class="flex justify-content-end mt-1 text-orange-500" v-for="item in itemDataParcelas.estaSemana" :key="item">{{ item.labelData }} esta semana: {{ item.data }} {{ formatCurrency(item.valor) }}</h4>
                <h4 v-if="itemDataParcelas.aVencer && itemDataParcelas.data.length" class="flex justify-content-end mt-1 text-green-500">Total das parcelas a vencer: {{ formatCurrency(itemDataParcelas.aVencer) }}</h4>
                <h4 v-if="itemDataParcelas.pago && itemDataParcelas.data.length" class="flex justify-content-end mt-1 text-primary-500">Total das parcelas pagas: {{ formatCurrency(itemDataParcelas.pago) }}</h4>

                <h4 v-if="missingValue && itemDataParcelas.data && itemDataParcelas.data.length"
                    class="flex justify-content-end border-bottom-1 mt-0">Valor liquido deste
                    registro: {{
                        formatCurrency(props.totalLiquido)
                    }}</h4>
                <h4 v-if="missingValue" class="flex justify-content-end mt-0 text-red-600">{{ missingValue < 0
                    ? 'Falta registrar o valor de' : 'Valor registrado a maior' }}: {{ formatCurrency(missingValue <
                            0 ? missingValue * -1 : missingValue) }}</h4>
            </div>
            <ParcelaItem v-if="mode == 'new'" :mode="mode" :itemData="itemData" @cancel="cancel"
                @reloadItems="loadParcelas" :uProf="props.uProf" :itemDataRoot="props.itemDataRoot" />
            <!-- colapssed = true = fechado -->
            <Fieldset :toggleable="true"
                :collapsed="!(item.itemPosition == '0' || (String(item.situacao) == '1' && ['0', '1'].includes(String(item.situacaoVencimento))))"
                :class="`mb-1${item.situacaoVencimento == '0' ? ' bg-red-100 hover:bg-red-200' : ''}`"
                v-for="item in itemDataParcelas.data" :key="item.id">
                <template #legend>
                    <div class="flex align-items-center text-primary">
                        <span class="fa-solid fa-bolt mr-2"></span>
                        <span :class="`font-bold text-lg ${setAdicionalVencimentoClass(item).class}`">{{
                            setAdicionalVencimentoClass(item).label }}. {{
                                item.situacaoLabel }}</span>
                    </div>
                </template>
                <ParcelaItem :itemData="item" @cancel="cancel" @reloadItems="loadParcelas" :uProf="props.uProf"
                    :itemDataRoot="props.itemDataRoot" />
                <!-- <p>{{ item.itemPosition == '0' }}{{ String(item.situacao) == '1' }}{{ ['0', '1'].includes(String(item.situacaoVencimento)) }}</p> -->
            </Fieldset>
            <div v-if="uProf.admin >= 2">
                <p>props.mode: {{ props.mode }}</p>
                <p>itemDataParcelas.total: {{ itemDataParcelas.total }}</p>
                <p>props.totalLiquido: {{ props.totalLiquido }}</p>
                <p>missingValue: {{ missingValue }}</p>
                <p>props.itemDataRoot.id_empresa: {{ props.itemDataRoot.id_empresa }}</p>
            </div>
        </Fieldset>
    </div>
</template>

<style lang="scss" scoped></style>