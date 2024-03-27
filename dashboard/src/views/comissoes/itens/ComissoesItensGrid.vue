<script setup>
import { ref, onBeforeMount } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
// import ComissaotemForm from './ComissaotemForm.vue';
const confirm = useConfirm();
const gridData = ref(null);
const editingRows = ref([]);
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
const urlBase = ref(`${baseApiUrl}/comissoes`);
const mode = ref('grid');
// Dropdowns
const dropdownAgentes = ref([]);
// Cookies de usuário
import { userKey } from '@/global';
import moment from 'moment';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Props do template
// Ref do gridData
const dt = ref(null);
// Carrega os dados da grid
const loadData = async () => {
    mode.value = 'grid';
    const url = `${urlBase.value}?field:id_pipeline=equals:${props.itemDataRoot.id}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        // loadOptions();
        // gridData.value.forEach((element) => {
        //     if (['telefone', 'celular'].includes(element.tipo.toLowerCase())) element.meioRenderizado = renderizarHTML(element.meio, { to: props.itemDataRoot.pessoa, from: userData.name });
        //     else element.meioRenderizado = renderizarHTML(element.meio);
        // });
    });
};
const onRowEditInit = () => {};
const onRowEditSave = (event) => {
    // Se o formulário não for válido, não salva
    let { newData, index } = event;
    if (!formIsValid(newData)) {
        return;
    } else {
        gridData.value[index] = newData;
        saveData(newData);
    }
};
const onRowEditCancel = () => {
    loadData();
};
// Salvar dados do formulário
const saveData = async (data) => {
    const method = data.id ? 'put' : 'post';
    const id = data.id ? `/${data.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...data };
    delete obj.id_pipeline;
    delete obj.agente;
    delete obj.unidade;
    delete obj.documento;
    delete obj.last_status_comiss;
    if (obj.liquidar_aprox) obj.liquidar_em = moment(obj.liquidar_aprox, 'DD/MM/YYYY').format('YYYY-MM-DD');
    else obj.liquidar_em = null;
    delete obj.liquidar_aprox;
    axios[method](url, obj)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                data = body;
            } else {
                defaultWarn('Erro ao salvar registro');
            }
            loadData();
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
// Validar formulário
const formIsValid = (data) => {
    const liquidarEmIsValid = data.liquidar_aprox ? moment(data.liquidar_aprox, 'DD/MM/YYYY', true).isValid() : true;
    if (!liquidarEmIsValid) {
        defaultWarn('Data de liquidação inválida');
        return false;
    }
    return liquidarEmIsValid;
};
// Exclui o registro
const deleteRow = (data) => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${data.id}`).then(async () => {
                defaultSuccess('Registro excluído com sucesso!');
                await loadData();
            });
        },
        reject: () => {
            return false;
        }
    });
};
// Listar unidades de negócio
const listAgentesComissionamento = async () => {
    let url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name&order=name`;
    if (mode.value == 'new') url += '&status=10';
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
    });
};
const setNewItem = () => {
    mode.value = 'grid';
    setTimeout(() => {
        mode.value = 'new';
    }, 100);
};
// Carrega as operações básicas do formulário
onBeforeMount(async () => {
    await loadData();
    // Agentes de negócio
    await listAgentesComissionamento();
});
</script>

<template>
    <div class="card">
        <!-- <ComissaotemForm
            @newItem="
                loadData();
                setNewItem();
            "
            :itemDataRoot="props.itemDataRoot"
            v-if="mode == 'new'"
        /> -->
        <DataTable
            ref="dt"
            v-model:editingRows="editingRows"
            :value="gridData"
            editMode="row"
            dataKey="id"
            @row-edit-init="onRowEditInit"
            @row-edit-save="onRowEditSave"
            @row-edit-cancel="onRowEditCancel"
            :pt="{
                table: { style: 'min-width: 50rem' },
                column: {
                    bodycell: ({ state }) => ({
                        style: state['d_editing'] && 'padding-top: 0.6rem; padding-bottom: 0.6rem'
                    })
                }
            }"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Nova Comissão" outlined @click="setNewItem()" />
                </div>
            </template>
            <Column v-if="userData.admin >= 2" field="id" header="ID" style="width: 5%">
                <template #editor="{ data, field }">
                    <span v-html="data[field]" />
                </template>
            </Column>
            <Column field="agente" header="Agente" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field]" />
                </template>
                <template #editor="{ data, field }">
                    <Dropdown id="id_comis_agentes" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="data.id_comis_agentes" :options="dropdownAgentes" placeholder="Selecione..." />
                </template>
            </Column>
            <Column field="valor" header="Valor" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field]" />
                </template>
                <template #editor="{ data, field }">
                    <InputText v-model="data[field]" id="valor" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                </template>
            </Column>
            <Column field="liquidar_aprox" header="Liquidação Aproximada" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field]" />
                </template>
                <template #editor="{ data, field }">
                    <div class="p-inputgroup">
                        <InputText v-model="data[field]" id="liquidar_aprox" v-maska data-maska="##/##/####" type="text" />
                        <Button icon="pi pi-times" severity="danger" @click="data[field] = null" />
                    </div>
                </template>
            </Column>
            <Column :rowEditor="true" style="width: 5%; min-width: 8rem" bodyStyle="text-align:center" />
            <Column style="width: 5%; min-width: 8rem" bodyStyle="text-align:center">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-trash" rounded class="p-button-outlined" severity="danger" v-tooltip.top="'Clique para excluir o contato'" @click="deleteRow(data)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
