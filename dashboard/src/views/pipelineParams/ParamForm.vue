<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Campos de formulário
const itemData = ref({});
const registroTipo = ref('pf');
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref({
    form: true,
    accepted: null,
    email: null,
    telefone: null
});
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline-params`);
// Carragamento de dados do form
const loadData = async () => {
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);

                    itemData.value = body;

                    loading.value.form = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/pipeline-params` });
                }
            });
        }
    }, Math.random() * 100);
    loading.value.form = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/pipeline-params/${itemData.value.id}` });
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((err) => {
                defaultWarn(err.response.data);
            });
    }
};
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
import Uploads from '@/components/Uploads.vue';

const showUploadForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'pipeline_params',
            registro_id: itemData.value.id,
            schema: userData.schema_name,
            field: 'id_uploads_logo',
            footerMsg: 'O tamanho máximo do arquivo é de 1MB e 250 x 250px.'
        },
        props: {
            header: `Alterar a logomarca da empresa`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            reload();
        }
    });
};
const showUploadFooterForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'pipeline_params',
            registro_id: itemData.value.id,
            schema: userData.schema_name,
            field: 'id_uploads_rodape',
            footerMsg: 'O tamanho máximo do arquivo é de 1MB e 1090 x 160px.'
        },
        props: {
            header: `Alterar o rodapé do timbrado`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            reload();
        }
    });
};

const onImageRightClick = (event) => {
    menu.value.show(event);
};
const onImageFooterRightClick = (event) => {
    menuFooter.value.show(event);
};
// Opções de DropDown do Form
const dropdownApresentacaoBi = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
const dropdownDocVenda = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'É proposta' },
    { value: 2, label: 'É pedido' }
]);
const dropdownAutomNum = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
const dropdownGeraBaixa = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
const dropdownTipoSec = ref([{ value: 0, label: 'Não há' }]);
const dropdownObrigValor = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
const dropdownObrigAgente = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
const dropdownGeraPasta = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Para o documento' },
    { value: 2, label: 'Para o pedido' }
]);
const dropdownPropInterna = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
// Observar alterações nos dados do formulário
watchEffect(() => {});
const menu = ref();
const preview = ref(false);
const items = ref([
    {
        label: 'Alterar a logomarca',
        icon: 'pi pi-fw pi-cloud-upload',
        command: () => {
            showUploadForm();
        }
    }
]);
const menuFooter = ref();
const itemsFooter = ref([
    {
        label: 'Alterar o rodapé',
        icon: 'pi pi-fw pi-cloud-upload',
        command: () => {
            showUploadFooterForm();
        }
    }
]);
const windowWidth = ref(window.innerWidth);
const windowHeight = ref(window.innerHeight);
window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
});
</script>
<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Parâmetros', to: `/${userData.schema_description}/pipeline-params` }, { label: itemData.descricao + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-4">
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Image
                                v-else
                                :src="`${itemData.url_logo ? itemData.url_logo : '/assets/images/DefaultLogomarca.png'}`"
                                :width="Math.floor(windowWidth * 0.2)"
                                alt="Logomarca"
                                :preview="preview"
                                id="url_logo"
                                @contextmenu="onImageRightClick"
                            />
                            <ContextMenu ref="menu" :model="items" />
                        </div>
                        <div class="col-8">
                            <div class="p-fluid grid">
                                <div class="col-12 md:col-12">
                                    <label for="descricao">Descrição abreviada do parâmetro</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao" id="descricao" type="text" />
                                </div>
                                <div class="col-12 md:col-4">
                                    <label for="bi_index">Apresentação em BI</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <Dropdown v-else id="bi_index" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.bi_index" :options="dropdownApresentacaoBi" />
                                </div>
                                <div class="col-12 md:col-4">
                                    <label for="doc_venda">É documento de venda</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <Dropdown v-else id="doc_venda" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.doc_venda" :options="dropdownDocVenda" />
                                </div>
                                <div class="col-12 md:col-4">
                                    <label for="autom_nr">Numeracao automatica</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <Dropdown v-else id="autom_nr" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.autom_nr" :options="dropdownAutomNum" />
                                </div>
                            </div>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="gera_baixa">Pode ser solicitado</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Dropdown v-else id="gera_baixa" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_baixa" :options="dropdownGeraBaixa" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="tipo_secundario">Tipo secundário</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Dropdown v-else id="tipo_secundario" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.tipo_secundario" :options="dropdownTipoSec" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="obrig_valor">Obrigatorio declarar valor</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="obrig_valor" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.obrig_valor" :options="dropdownObrigValor" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="reg_agente">Obrigatório agente</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="reg_agente" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.reg_agente" :options="dropdownObrigAgente" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="gera_pasta">Gera pasta</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="gera_pasta" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_pasta" :options="dropdownGeraPasta" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="proposta_interna">Usa sistema interno</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="proposta_interna" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.proposta_interna" :options="dropdownPropInterna" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                    <Image
                        v-else
                        :src="`${itemData.url_rodape ? itemData.url_rodape : '/assets/images/DefaultRodape.png'}`"
                        alt="Rodapé"
                        :preview="preview"
                        id="url_rodape"
                        @contextmenu="onImageFooterRightClick"
                        :width="Math.floor(windowWidth * 0.65)"
                    />
                    <ContextMenu ref="menuFooter" :model="itemsFooter" />
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                </div>
            </div>
        </form>
    </div>
</template>
