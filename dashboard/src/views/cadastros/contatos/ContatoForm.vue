<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
const router = useRouter();
// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
// Dropdowns
const dropdownTipo = ref([]);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/cad-contatos/${props.itemDataRoot.id}`);
// Carragamento de dados do form
const loadData = async () => {
    if (itemData && itemData.id) {
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastros` });
            }
        });
    }
};
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                mode.value = 'view';
                emit('changed');
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const loadOptions = async () => {
    // Tipo Contato
    await optionLocalParams({ field: 'grupo', value: 'tipo_contato', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownTipo.value.push({ value: item.id, label: item.label });
        });
    });
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
});
</script>

<template>
    <div class="grid">
        <form @submit.prevent="saveData">
            <div class="col-12">
                <h5>{{ store.userStore.admin >= 1 ? `Registro: (${props.itemDataRoot.id})` : '' }}</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo de Contato</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="pessoa">Pessoa</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa" type="text" />
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="departamento">Departamento</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.departamento" id="departamento" type="text" />
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="meio">Meio de Contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.meio" id="meio" type="text" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="obs">Observação</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.obs" id="obs" type="text" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="mode = 'view'" />
                </div>
            </div>
        </form>
    </div>
</template>
