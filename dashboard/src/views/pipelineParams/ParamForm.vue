<script setup>
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
    itensBreadcrumb.value.push({ label: 'Parâmetros do Pipeline', to: `/${uProf.value.schema_description}/pipeline-params` });
});

import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
import Uploads from '@/components/Uploads.vue';

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('new');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline-params`);
const itensBreadcrumb = ref([]);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                itensBreadcrumb.value.push({ label: itemData.value.descricao + (uProf.value.admin >= 1 ? `: (${itemData.value.id})` : ''), to: route.fullPath });
                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/pipeline-params` });
            }
        });
    }
    loading.value = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    if (obj.doc_venda != 1) delete obj.gera_baixa;
    if (obj.gera_baixa != 1) delete obj.tipo_secundario;
    if (obj.gera_baixa == 1 && !obj.tipo_secundario) {
        defaultWarn('Informe o tipo de documento para conversão');
        setTimeout(() => {
            defaultWarn('Ou troque "Converte em pedido" para "Não"');
        }, 1500);
        return;
    }
    await axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                // if (mode.value == 'new') router.push({ path: `/${uProf.value.schema_description}/pipeline-params/${itemData.value.id}` });
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};

const showUploadForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'pipeline_params',
            registro_id: itemData.value.id,
            schema: uProf.value.schema_name,
            field: 'id_uploads_logo',
            footerMsg: 'O tamanho máximo do arquivo é de 1MB e 250 x 250px.'
        },
        props: {
            header: `Alterar a logomarca da empresa`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '95vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            setTimeout(() => {
                defaultSuccess('Por favor aguarde! Atualizando imagem...');
                window.location.reload();
            }, 3000);
        }
    });
};
const showUploadFooterForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'pipeline_params',
            registro_id: itemData.value.id,
            schema: uProf.value.schema_name,
            field: 'id_uploads_rodape',
            footerMsg: 'O tamanho máximo do arquivo é de 1MB e 1090 x 160px.'
        },
        props: {
            header: `Alterar o rodapé do timbrado`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '95vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            setTimeout(
                () => {
                    defaultSuccess('Por favor aguarde! Recarregando dados...');
                    window.location.reload();
                },
                Math.random() * 1000 + 250
            );
        }
    });
};

const onImageRightClick = (event) => {
    menu.value.show(event);
};
const onImageFooterRightClick = (event) => {
    menuFooter.value.show(event);
};
const dropDownSN = [
    { value: 1, label: 'Sim' },
    { value: 0, label: 'Não' }
];
// Opções de DropDown do Form
const dropdownNovosItens = ref([
    { value: 10, label: 'Sim' },
    { value: 0, label: 'Não' },
    { value: 11, label: 'Apenas consulta' }
]);
const dropdownDocVenda = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'É proposta' },
    { value: 2, label: 'É pedido' },
    { value: 3, label: 'Assistência técnica' }
]);
const dropdownTipoSec = ref([]);

// Obter parâmetros do BD
const optionParams = async (query) => {
    const url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}`;
    return await axios.get(url);
};
const getUnidadesDescricao = async () => {
    // Unidades de negócio por tipo
    await optionParams({
        func: 'ubt',
        tipoDoc: '2'
    }).then((res) => {
        dropdownTipoSec.value = [];
        res.data.data.map((item) => {
            const label = item.descricao.toString().replaceAll(/_/g, ' ');
            dropdownTipoSec.value.push({
                value: item.id,
                label: label
            });
        });
    });
};
const dropdownObrigValor = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
// const dropdownGeraPasta = ref([
//     { value: 0, label: 'Não' },
//     { value: 1, label: 'Para o documento' },
//     { value: 2, label: 'Para o pedido' }
// ]);
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    errorMessages.value = {};
    await loadData();
    emit('cancel');
};
// Substituir espaços por underline
const updateTextWithUnderscores = (event) => {
    itemData.value.descricao = event.target.value.replace(/ /g, '_');
};
// Carregar dados do formulário
onMounted(async () => {
    await loadData();
    await getUnidadesDescricao();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
const menu = ref();
const preview = ref(false);
const items = ref([
    {
        label: 'Alterar a logomarca',
        icon: 'fa-solid fa-upload',
        command: () => {
            showUploadForm();
        }
    }
]);
const menuFooter = ref();
const itemsFooter = ref([
    {
        label: 'Alterar o rodapé',
        icon: 'fa-solid fa-upload',
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
onBeforeUnmount(() => {
    // Remova o ouvinte ao destruir o componente para evitar vazamento de memória
    window.removeEventListener('resize', () => {
        windowWidth.value = window.innerWidth;
        windowHeight.value = window.innerHeight;
    });
});
watch(itemData.value, () => {
    if (!itemData.value.url_logo) itemData.value.url_logo = '/assets/images/DefaultLogomarca.png';
    if (!itemData.value.url_rodape) itemData.value.url_rodape = '/assets/images/DefaultRodape.png';
});
</script>
<template>
    <Breadcrumb :items="itensBreadcrumb" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-4">
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
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
                                <div class="col-12 md:col-6">
                                    <label for="descricao">Nome (P.Ex.: Vivazul_Proposta)</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <InputText
                                        v-else
                                        autocomplete="no"
                                        :disabled="mode == 'view'"
                                        v-model="itemData.descricao"
                                        id="descricao"
                                        type="text"
                                        maxlength="50"
                                        @input="updateTextWithUnderscores"
                                        placeholder="Representada_Tipo_Documento..."
                                    />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="status">Aceita novos registros?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="status" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.status" :options="dropdownNovosItens" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="bi_index">Resultados no Dashboard?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="bi_index" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.bi_index" :options="dropDownSN" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="doc_venda">É documento de venda?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="doc_venda" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.doc_venda" :options="dropdownDocVenda" />
                                </div>
                                <div class="col-12 md:col-3" v-if="itemData.doc_venda == 1">
                                    <label for="gera_baixa">Converte em pedido?</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <Dropdown v-else id="gera_baixa" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_baixa" :options="dropDownSN" />
                                </div>
                                <div class="col-12 md:col-6" v-if="itemData.doc_venda == 1 && itemData.gera_baixa == 1">
                                    <label for="tipo_secundario">Convertido em?</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <Dropdown v-else id="tipo_secundario" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.tipo_secundario" :options="dropdownTipoSec" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="autom_nr">Numeracao automatica?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="autom_nr" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.autom_nr" :options="dropDownSN" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="obrig_valor">Valor é obrigatorio?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="obrig_valor" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.obrig_valor" :options="dropdownObrigValor" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="reg_agente">Obrigatório vendedor?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="reg_agente" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.reg_agente" :options="dropDownSN" />
                                </div>
                                <div class="col-12 md:col-3" v-if="itemData.doc_venda == 1">
                                    <label for="proposta_interna">Propostas com o Vivazul?</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="proposta_interna" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.proposta_interna" :options="dropDownSN" />
                                </div>
                                <!-- <div class="col-12 md:col-2">
                                    <label for="gera_pasta">Gera pasta</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="gera_pasta" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gera_pasta" :options="dropdownGeraPasta" />
                                </div> -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
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
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
                <div class="card bg-green-200 mt-3" v-if="uProf.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                </div>
            </div>
        </form>
    </div>
    <div v-if="uProf.admin >= 2">
        <p>mode: {{ mode }}</p>
        <p>itemData: {{ itemData }}</p>
        <p>uProf: {{ uProf }}</p>
    </div>
</template>
