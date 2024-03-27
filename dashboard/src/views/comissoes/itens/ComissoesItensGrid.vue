<script setup>
import { ref, onBeforeMount } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { renderizarHTML } from '@/global';
import { useConfirm } from 'primevue/useconfirm';
import ContatoItemForm from './ContatoItemForm.vue';
const confirm = useConfirm();
import { isValidEmail } from '@/global';
const gridData = ref(null);
const editingRows = ref([]);
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
const urlBase = ref(`${baseApiUrl}/cad-contatos-itens/${props.itemDataRoot.id}`);
const mode = ref('grid');
// Dropdowns
const dropdownTipo = ref([]);
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Props do template
// Ref do gridData
const dt = ref(null);
// Carrega os dados da grid
const loadData = async () => {
    mode.value = 'grid';
    const url = `${urlBase.value}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        loadOptions();
        gridData.value.forEach((element) => {
            if (['telefone', 'celular'].includes(element.tipo.toLowerCase())) element.meioRenderizado = renderizarHTML(element.meio, { to: props.itemDataRoot.pessoa, from: userData.name });
            else element.meioRenderizado = renderizarHTML(element.meio);
        });
    });
};
const onRowEditInit = () => {};
const onRowEditSave = (event) => {
    // Se o formulário não for válido, não salva
    let { newData, index } = event;
    if (!formIsValid(newData)) {
        defaultWarn('Verifique os campos obrigatórios');
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
// Validar e-mail
const validateEmail = (value) => {
    if (value && !isValidEmail(value)) {
        defaultWarn('Formato de e-mail inválido');
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = (value) => {
    if (value && value.length > 0 && ![10, 11].includes(value.replace(/([^\d])+/gim, '').length)) {
        defaultWarn(`Formato de Telefone/Celular inválido`);
        return false;
    }
    return true;
};
// Validar formulário
const formIsValid = (data) => {
    // Se o valor do dropdown dropdownTipo que contém o data.id_params_tipo for do tipo 'celular' ou 'telefone', então o campo data.meio deve ser validado pelo maska telefone
    // Mas se o valor do dropdown dropdownTipo que contém o data.id_params_tipo for do tipo 'e-mail', então o campo data.meio deve ser validado pelo isValidEmail
    let label = getDropdownLabel(data.id_params_tipo);
    if (label) label = label.toString().toLowerCase();
    if (label == 'e-mail') return validateEmail(data.meio);
    if (label == 'telefone' || label == 'celular') return validateTelefone(data.meio);
    return true;
};
const getDropdownLabel = (value) => {
    if (!value) return undefined;
    const selectedOption = dropdownTipo.value.find((option) => option.value === value);
    return selectedOption.label || undefined;
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
const setNewItem = () => {
    mode.value = 'grid';
    setTimeout(() => {
        mode.value = 'new';
    }, 100);
};
// Carrega as operações básicas do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
});
</script>

<template>
    <div class="card">
        <ContatoItemForm
            @newItem="
                loadData();
                setNewItem();
            "
            :itemDataRoot="props.itemDataRoot"
            v-if="mode == 'new'"
        />
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
                    <Button type="button" icon="fa-solid fa-plus" label="Novo meio de contato" outlined @click="setNewItem()" />
                </div>
            </template>
            <Column v-if="userData.admin >= 3" header="Object do contato" style="width: 20%">
                <template #body="{ data }">
                    {{ data }}
                </template>
            </Column>
            <Column v-if="userData.admin >= 3" field="id" header="ID" style="width: 5%">
                <template #editor="{ data, field }">
                    <span v-html="data[field]" />
                </template>
            </Column>
            <Column field="tipo" header="Tipo de Contato" style="width: 20%; min-width: 8rem">
                <template #body="{ data, field }">
                    <span v-html="data[field]" />
                </template>
                <template #editor="{ data, field }">
                    <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="data.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..." />
                </template>
            </Column>
            <Column field="meio" header="Meio de Contato" style="width: 40%; min-width: 8rem">
                <template #body="{ data }">
                    <span v-html="data.meioRenderizado" />
                </template>
                <template #editor="{ data, field }">
                    <InputText v-if="getDropdownLabel(data.id_params_tipo) && getDropdownLabel(data.id_params_tipo).toLowerCase() == 'e-mail'" v-model="data[field]" autocomplete="no" id="meio" type="text" @blur="validateEmail(data[field])" />
                    <InputText
                        v-else-if="getDropdownLabel(data.id_params_tipo) && ['telefone', 'celular'].includes(getDropdownLabel(data.id_params_tipo).toLowerCase())"
                        v-model="data[field]"
                        autocomplete="no"
                        v-maska
                        data-maska="['(##) ####-####', '(##) #####-####']"
                        id="meio"
                        type="text"
                        @blur="validateTelefone(data[field])"
                    />
                    <InputText v-else v-model="data[field]" autocomplete="no" :disabled="mode == 'view'" id="meio" type="text" />
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
