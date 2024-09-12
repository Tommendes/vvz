<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRoute } from 'vue-router';
const route = useRoute();
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';
import EditorComponent from '@/components/EditorComponent.vue';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    data_vencimento: new Mask({
        mask: '##/##/####'
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

const SITUACAO_ABERTO = '1'
const SITUACAO_PAGO = '2'
const SITUACAO_CONCILIADO = '3'
const SITUACAO_CANCELADO = '99'

// Props do template
const props = defineProps(['itemData', 'mode', 'uProf', 'itemDataRoot']);
// Emits do template
const emit = defineEmits(['reloadItems', 'cancel']);
const mode = ref('view');
const itemData = ref([]);
// Até 12 parcelas
const dropdownParcelas = ref([
    { value: 'U', label: `Unica` },
    { value: '1', label: `1` },
    { value: '2', label: `2` },
    { value: '3', label: `3` },
    { value: '4', label: `4` },
    { value: '5', label: `5` },
    { value: '6', label: `6` },
    { value: '7', label: `7` },
    { value: '8', label: `8` },
    { value: '9', label: `9` },
    { value: '10', label: `10` },
    { value: '11', label: `11` },
    { value: '12', label: `12` }
]);
// Situação da parcela 1: Aberto; 2: Pago; 3: Conciliado; 99: Cancelado
const dropdownSituacao = ref([
    { value: '1', label: `Aberto`, verbose: 'em Aberto' },
    { value: '2', label: `Pago`, verbose: 'a Pagar' },
    { value: '3', label: `Conciliado`, verbose: 'Conciliada' },
    { value: '99', label: `Cancelado`, verbose: 'Cancelada' }
]);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-parcelas/${route.params.id}`);

const loadData = async () => {
    const id = props.itemData.id;
    const url = `${urlBase.value}/${id}`;
    itemData.value = { ...props.itemData }
    if (itemData.value.data_vencimento) itemData.value.data_vencimento = masks.value.data_vencimento.masked(moment(itemData.value.data_vencimento).format('DD/MM/YYYY'));
}

const saveData = async () => {
    const id = props.itemData.id ? `/${props.itemData.id}` : '';
    const url = `${urlBase.value}${id}`;

    const method = id ? 'put' : 'post';
    const data = { ...itemData.value, centro: props.itemDataRoot.centro };
    try {
        const res = await axios[method](url, data)
            .then(res => {
                emit('reloadItems');
                mode.value = 'view';
                defaultSuccess('Parcela salva com sucesso!');
            });
    } catch (error) {
        console.log('error', error);
        defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
    }
}

// Exclui o registro
const deleteItem = () => {
    const id = props.itemData.id;
    const url = `${urlBase.value}/${id}`;
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Confirma que deseja EXCLUIR este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await axios.delete(url)
                    .then(res => {
                        emit('reloadItems');
                        defaultSuccess('Parcela excluída com sucesso!');
                    });
            } catch (error) {
                console.log('error', error);
                defaultWarn(error);
            }
        },
        reject: () => {
            return false;
        }
    });
};

const dropdownContas = ref([]);
const getContas = async () => {
    // if (props.itemDataRoot) {
    let url = `${baseApiUrl}/fin-contas/f-a/glf?fld=id_empresa&vl=${props.itemDataRoot.id_empresa}&slct=nome,id`;
    await axios.get(url).then((res) => {
        dropdownContas.value = [];
        res.data.data.map((item) => {
            const label = item.nome.toString().replaceAll(/_/g, ' ') + (props.uProf.admin >= 2 ? ` (${item.id})` : '');
            const itemList = { value: item.id, label: label };
            dropdownContas.value.push(itemList);
        });
    });
    // }
};
// Operações para multiplicar parcelas

const bodyMultiplicate = ref({
    parcelas: 1
});
const multiplicateItem = (event) => {
    bodyMultiplicate.value.parcelas = 1;
    // bodyMultiplicate.value.id_comissoes = itemData.value.id;
    confirm.require({
        group: `comisMultiplicateConfirm-${itemData.value.id}`,
        target: event.currentTarget,
        message: `Selecione abaixo a quantidade de parcelas.<br />O valor desta parcela será dividido entre elas`,
        icon: 'fa-solid fa-circle-exclamation',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptLabel: 'Confirmar',
        rejectLabel: 'Ainda não',
        rejectClass: 'p-button-outlined p-button-sm',
        acceptClass: 'p-button-sm',
        accept: async () => {
            itemData.value.bodyMultiplicate = bodyMultiplicate.value;
            await saveData();
        },
        reject: () => {
            return false;
        }
    });
};
// Fim das operações para multiplicar parcelas
const cancel = () => {
    mode.value = 'view';
    emit('cancel');
}

onMounted(async () => {
    await loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;

    await getContas();
})
// Calcule bodyMultiplicate.valor_vencimento_um e bodyMultiplicate.valor_vencimento_demais considerando que o resultado não pode ser uma dízima. Considere que o usuário pode digitar uma quantidade em bodyMultiplicate.parcelas
// que faça com que o valor da primeira parcela possa ser alguns centavos a mais ou a menos do que o valor base dividido pela quantidade de parcelas. Daí, calcule o valor das demais parcelas
watchEffect(() => {
});
</script>

<template>
    <ConfirmPopup :group="`comisMultiplicateConfirm-${itemData.id}`">
        <template #message="slotProps">
            <div class="flex flex-column align-items-center w-full gap-3 border-bottom-1 surface-border p-3 mb-3 pb-0">
                <i :class="slotProps.message.icon" class="text-6xl text-primary-500"></i>
                <div class="text-center text-xl" v-html="slotProps.message.message" />
                <InputText :class="`mb-${bodyMultiplicate.parcelas > 1 ? '0' : '3'}`" autocomplete="no"
                    v-model="bodyMultiplicate.parcelas" id="parcelas" type="number" v-maska data-maska="##"
                    placeholder="Parcelas" min="1" max="60" @keydown.enter.prevent />
                <div class="text-center mb-3 text-xl" v-if="bodyMultiplicate.parcelas > 1">
                    O valor da parcela 1 será atualizado para {{ formatCurrency(bodyMultiplicate.valor_vencimento_um)
                    }}<br />e {{ bodyMultiplicate.parcelas > 2 ? `as seguintes` : 'a próxima' }} para
                    {{ formatCurrency(bodyMultiplicate.valor_vencimento_demais) }}.<br />Se estiver de acordo, clique em
                    confirmar, abaixo
                </div>
            </div>
        </template>
    </ConfirmPopup>
    <form @submit.prevent="saveData">
        <div class="formgrid grid">
            <div class="field col-12 md:col-2">
                <label for="data_vencimento">Vencimento <span class="text-base" style="color: red">*</span></label>
                <InputGroup>
                    <InputText autocomplete="no" required :disabled="mode == 'view'" v-maska data-maska="##/##/####"
                        v-model="itemData.data_vencimento" id="data_vencimento" placeholder="Vencimento"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-10" />
                    <Button v-tooltip.top="'Data de hoje'" icon="fa-solid fa-calendar-day"
                        @click="itemData.data_vencimento = moment().format('DD/MM/YYYY')" text raised
                        :disabled="mode == 'view'"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-2" />
                </InputGroup>
            </div>
            <div class="field col-12 md:col-2">
                <label for="valor_vencimento">R$ Valor Parcela <span class="text-base"
                        style="color: red">*</span></label>
                <InputGroup>
                    <InputText autocomplete="no" :disabled="['view'].includes(mode)" v-model="itemData.valor_vencimento"
                        id="valor_vencimento" type="text" v-maska data-maska="0,99"
                        data-maska-tokens="0:\d:multiple|9:\d:optional"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
                    <Button v-tooltip.top="'Copiar valor BRUTO do registro'"  
                        @click="itemData.valor_vencimento = props.itemDataRoot.valor_bruto" text raised
                        :disabled="mode == 'view'"  icon="fa-solid fa-dollar-sign"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary" />
                    <Button v-tooltip.top="'Copiar valor LÍQUIDO do registro'"
                        @click="itemData.valor_vencimento = props.itemDataRoot.valor_liquido" text raised
                        :disabled="mode == 'view'"  icon="fa-solid fa-filter-circle-dollar"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary" />
                </InputGroup>
            </div>
            <div class="field col-12 md:col-2">
                <label for="parcela">Parcela <span class="text-base" style="color: red">*</span></label>
                <Dropdown placeholder="Parcela" id="parcela" optionLabel="label" optionValue="value"
                    v-model="itemData.parcela" :options="dropdownParcelas" :disabled="['view'].includes(mode)"
                    class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
            </div>
            <div class="field col-12 md:col-2">
                <label for="duplicata">Duplicata</label>
                <InputText autocomplete="no" :disabled="['view'].includes(mode)" v-model="itemData.duplicata"
                    id="duplicata" type="text" placeholder="Duplicata"
                    class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
            </div>
            <div class="field col-12 md:col-2">
                <label for="data_pagto">Situação <span class="text-base" style="color: red">*</span></label>
                <Dropdown placeholder="Situação" id="situacao" optionLabel="label" optionValue="value"
                    v-model="itemData.situacao" :options="dropdownSituacao" :disabled="['view'].includes(mode)"
                    class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
            </div>
            <div class="field col-12 md:col-2">
                <label for="data_pagto">Pagamento <span v-if="!(itemData.situacao == '1')" class="text-base"
                        style="color: red">*</span></label>
                <InputGroup>
                    <InputText autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##/##/####"
                        v-model="itemData.data_pagto" id="data_pagto" placeholder="Pagamento"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-10" />
                    <Button v-tooltip.top="'Data de hoje'" icon="fa-solid fa-calendar-day"
                        @click="itemData.data_pagto = moment().format('DD/MM/YYYY')" text raised
                        :disabled="mode == 'view'"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-2" />
                </InputGroup>
            </div>
            <div class="field col-12 md:col-2">
                <label for="id_fin_constas">Conta de pagamento <span v-if="!(itemData.situacao == '1')"
                        class="text-base" style="color: red">*</span></label>
                <Dropdown filter placeholder="Conta" id="id_fin_contas" optionLabel="label" optionValue="value"
                    v-model="itemData.id_fin_contas" :options="dropdownContas" :disabled="['view'].includes(mode)"
                    class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
            </div>
            <div class="field col-12 md:col-2">
                <label for="documento">Documento <span v-if="!(itemData.situacao == '1') && props.itemDataRoot.centro == '2'" class="text-base"
                        style="color: red">*</span></label>
                <InputText autocomplete="no" :disabled="['view'].includes(mode)" v-model="itemData.documento"
                    id="documento" type="text" placeholder="Documento"
                    class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
            </div>
            <div class="field col-12 md:col-8">
                <label for="descricao">Descrição (curta) do vencimento</label>
                <InputGroup>
                    <InputText autocomplete="no" :disabled="['view'].includes(mode)" v-model="itemData.descricao"
                        id="descricao" type="text" maxlength="255" placeholder="Descrição"
                        class="text-base text-color surface-overlay border-1 border-solid surface-border border-round appearance-none outline-none focus:border-primary w-full" />
                    <Button type="submit" :disabled="!(props.uProf.financeiro >= 2)"
                        v-if="['edit', 'new'].includes(mode) || mode == 'new'" v-tooltip.top="'Salvar parcela'"
                        icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" :disabled="!(props.uProf.financeiro >= 3)" v-if="mode == 'view'"
                        v-tooltip.top="'Editar parcela'" icon="fa-regular fa-pen-to-square" text raised
                        @click="mode = 'edit'" />
                    <Button type="button" v-if="['new', 'edit'].includes(mode)" v-tooltip.top="'Cancelar edição'"
                        icon="fa-solid fa-ban" severity="danger" text raised @click="cancel()" />
                    <Button type="button" :disabled="!(props.uProf.financeiro >= 4)" v-if="['view'].includes(mode)"
                        v-tooltip.top="'Excluir parcela'" icon="fa-solid fa-trash" severity="danger" text raised
                        @click="deleteItem" />
                    <Button type="button" :disabled="!(props.uProf.financeiro >= 2)"
                        v-if="itemData.situacao == SITUACAO_ABERTO && itemData.parcela == 'U' && ['view'].includes(mode)"
                        v-tooltip.top="props.itemDataRoot.centro == 1 ? 'Parcelar recebimento' : 'Parcelar pagamento'"
                        icon="fa-solid fa-ellipsis-vertical" severity="success" text raised @click="multiplicateItem" />
                </InputGroup>
            </div>
        </div>
    </form>

    <Fieldset class="bg-green-200 mb-1" toggleable :collapsed="true" v-if="props.uProf.admin >= 2">
        <template #legend>
            <div class="flex align-items-center text-primary">
                <span class="fa-solid fa-circle-info mr-2"></span>
                <span class="font-bold text-lg">FormData</span>
            </div>
        </template>
        <p>mode: {{ mode }}</p>
        <p>itemData: {{ itemData }}</p>
        <p>dropdownContas: {{ dropdownContas }}</p>
        <p>props.uProf: {{ props.uProf }}</p>
        <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
    </Fieldset>
</template>


<style lang="scss" scoped></style>