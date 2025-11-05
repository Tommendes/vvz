<script setup>
import { onMounted, ref } from 'vue';
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRoute } from 'vue-router';
const route = useRoute();

// Props do template
const props = defineProps(['itemData', 'mode', 'uProf', 'itemDataRoot', 'encargoTotal']);
// Emits do template
const emit = defineEmits(['reloadItems', 'cancel']);
const mode = ref('view');
const itemData = ref([]);
const itemDataUnmuted = ref([]);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-encargos/${route.params.id}`);

const loadData = async () => {
    const id = props.itemData.id;
    const url = `${urlBase.value}/${id}`;
    itemData.value = { ...props.itemData };
    itemDataUnmuted.value = { ...props.itemData };
};

const getFormIsValid = async () => {
    // Verificar se o valor em itemData.valor_encargo é menor ou igual a props.itemDataRoot.valir_liquido
    // let valorLiquido = Math.ceil((props.itemDataRoot.valor_bruto.replace(',', '.') - props.encargoTotal) * 100) / 100;
    // let valorEncargo = itemData.value.valor_encargo.replace(',', '.') - (itemDataUnmuted.value && itemDataUnmuted.value.valor_encargo ? itemDataUnmuted.value.valor_encargo.replace(',', '.') : 0);
    // console.log('valorEncargo', valorEncargo, 'valorLiquido', valorLiquido, props.itemDataRoot.valor_bruto, props.encargoTotal);
    // const res = valorEncargo >= valorLiquido;
    // if (!res) {
    //     defaultWarn('Valor do encargo é maior que o líquido');
    //     return;
    // }
    // return res;
    return true;
};

const saveData = async () => {
    if (await getFormIsValid()) {
        const id = props.itemData.id ? `/${props.itemData.id}` : '';
        const url = `${urlBase.value}${id}`;

        const method = id ? 'put' : 'post';
        const data = { ...itemData.value };
        try {
            const res = await axios[method](url, data).then((res) => {
                emit('reloadItems');
                mode.value = 'view';
                defaultSuccess('Encargo salvo com sucesso!');
            });
        } catch (error) {
            console.log('error', error);
            defaultWarn(error.response.data);
        }
    }
};

const deleteItem = async () => {
    const id = props.itemData.id;
    const url = `${urlBase.value}/${id}`;
    try {
        await axios.delete(url).then((res) => {
            emit('reloadItems');
            defaultSuccess('Encargo excluído com sucesso!');
        });
    } catch (error) {
        console.log('error', error);
        defaultWarn(error);
    }
};

const cancel = () => {
    mode.value = 'view';
    emit('cancel');
};

onMounted(() => {
    loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
</script>

<template>
    <form @submit.prevent="saveData">
        <InputGroup class="w-full gap-1">
            <InputText autocomplete="no" :disabled="mode == 'view'" id="descricao" v-model="itemData.descricao" type="text" placeholder="Descrição" class="uppercase" />
            <InputText
                autocomplete="no"
                :disabled="mode == 'view'"
                id="valor_encargo"
                v-model="itemData.valor_encargo"
                type="text"
                placeholder="Valor"
                v-maska
                data-maska="0,99"
                data-maska-tokens="0:\d:multiple|9:\d:optional"
                @keydown.enter.prevent
                class="uppercase"
            />
            <Button type="submit" :disabled="!(props.uProf.financeiro >= 2)" v-if="['edit', 'new'].includes(mode) || mode == 'new'" v-tooltip.top="'Salvar encargo'" icon="fa-solid fa-floppy-disk" severity="success" text raised />
            <Button type="button" :disabled="!(props.uProf.financeiro >= 3)" v-if="mode == 'view'" v-tooltip.top="'Editar encargo'" icon="fa-regular fa-pen-to-square" text raised @click="mode = 'edit'" />
            <Button type="button" v-if="['new', 'edit'].includes(mode)" v-tooltip.top="'Cancelar edição'" icon="fa-solid fa-ban" severity="danger" text raised @click="cancel()" />
            <Button type="button" :disabled="!(props.uProf.financeiro >= 4)" v-if="['view'].includes(mode)" v-tooltip.top="'Excluir encargo'" icon="fa-solid fa-trash" severity="danger" text raised @click="deleteItem" />
        </InputGroup>
        <Fieldset class="bg-green-200 mb-1" toggleable :collapsed="true" v-if="props.uProf.admin >= 2">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-circle-info mr-2"></span>
                    <span class="font-bold text-lg">FormData</span>
                </div>
            </template>
            <p>mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
            <p>itemDataRoot: {{ props.itemDataRoot }}</p>
            <p>encargoTotal: {{ props.encargoTotal }}</p>
            <p>uProf: {{ props.uProf }}</p>
        </Fieldset>
    </form>
</template>

<style lang="scss" scoped></style>
