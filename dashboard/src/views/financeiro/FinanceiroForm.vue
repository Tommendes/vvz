<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EditorComponent from '@/components/EditorComponent.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import Eventos from '@/components/Eventos.vue';
import RetencoesGrid from './retencoes/RetencoesGrid.vue';
import NotasGrid from './notas/NotasFiscaisGrid.vue';
import ParcelasGrid from './parcelas/ParcelasGrid.vue';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import { guide } from '@/guides/notasFiscaisFormGuide.js';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    data_emissao: new Mask({
        mask: '##/##/####'
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';

const ANIMATION_CLASS = 'animation-color animation-fill-none'
const animationLblCadas = ref('');
const animationVlrLiq = ref('');
// Campos de formulário
const itemData = ref({});
// Tipo de centro
const credorDevedor = ref('Destinatário');
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(false);
// Editar cadastro no autocomplete
const editCadastro = ref(false);
const dropdownCentro = ref([
    { value: 1, label: 'Receita' },
    { value: 2, label: 'Despesa' }
]);
const dropdownEmpresas = ref([]); // Itens do dropdown de Empresas
// Props do template
const props = defineProps({
    mode: { type: String, default: 'view' },
    idRegistro: { type: Number, default: 0 },
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-lancamentos`);
// Itens do breadcrumb
const breadItems = ref([]);
const loadData = async () => {
    loading.value = true;
    const id = props.idRegistro || route.params.id;
    const url = `${urlBase.value}/${id}`;
    if (mode.value != 'new')
        await axios
            .get(url)
            .then(async (res) => {
                const body = res.data;
                body.id = String(body.id);
                itemData.value = body;
                selectedCadastro.value = {
                    code: itemData.value.id_cadastros,
                    name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
                };
                if (itemData.value.data_emissao) itemData.value.data_emissao = masks.value.data_emissao.masked(moment(itemData.value.data_emissao).format('DD/MM/YYYY'));
                await getNomeCadastro();
                credorDevedor.value = itemData.value.centro == 1 ? 'Devedor' : 'Credor';
                breadItems.value = [{ label: 'Todos os Registros', to: `/${uProf.value.schema_description}/financeiro` }];
                if (itemData.value.id_cadastros) breadItems.value.push({ label: `Ir ao ${credorDevedor.value}`, to: `/${uProf.value.schema_description}/cadastro/${itemData.value.id_cadastros}` });
            })
            .catch((error) => {
                defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
                if (error.response && error.response.status == 401) router.push('/');
                toGrid();
            });
    else if (props.idCadastro) {
        itemData.value.id_cadastros = props.idCadastro;
        itemData.value.valor_bruto = 0;
        itemData.value.valor_liquido = 0;
        selectedCadastro.value = {
            code: itemData.value.id_cadastros,
            name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
        };
        await getNomeCadastro();
    }
    if (!itemData.value.valor_bruto) itemData.value.valor_bruto = 0;
    if (!itemData.value.valor_liquido) itemData.value.valor_liquido = 0;
    loading.value = false;
};

defineExpose({ loadData }); // Expondo a função para o componente pai

// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    editCadastro.value = false;
    loadData();
};
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;

    let preparedBody = {
        ...itemData.value
    };

    axios[method](url, preparedBody)
        .then(async (res) => {
            editCadastro.value = false;
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value.id = body.id;
                emit('changed');
                if (route.name != 'cadastro' && ['new', 'clone'].includes(mode.value)) {
                    router.push({
                        path: `/${uProf.value.schema_description}/financeiro/${itemData.value.id}`
                    });
                    await loadData();
                } else if (route.name != 'cadastro' && id != itemData.value.id) {
                    router.push({
                        path: `/${uProf.value.schema_description}/financeiro/${itemData.value.id}`
                    });
                    const animation = animationDocNr.value;
                    animationDocNr.value = '';
                    await loadData();
                    animationDocNr.value = animation;
                } else reload();
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            console.log(error);
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            // if (error.response && error.response.status == 401) router.push('/');
        });
};
// Dados das retenções
const itemDataRetencoes = ref([]);
// Carragamento de dados do form
const loadRetencoes = async (parcelas) => {
    itemDataRetencoes.value = parcelas
    const valorBruto = parseFloat(itemData.value.valor_bruto.replace(',', '.'));
    itemData.value.valor_liquido = parseFloat(valorBruto - (itemDataRetencoes.value.total || 0)).toFixed(2).replace('.', ',');
    animationVlrLiq.value = '';
    setTimeout(() => {
        animationVlrLiq.value = ANIMATION_CLASS;
    }, 150);
    //     });
}

// Dados dados das parcelas
const itemDataParcelas = ref([]);
const loadParcelas = async (parcelas) => {
    itemDataParcelas.value = parcelas
}
// Dados das notas fiscais
const itemDataNotas = ref([]);
const loadNotas = async (notas) => {
    itemDataNotas.value = notas
}
/**
 * Autocomplete de cadastros
 */
const cadastros = ref([]);
const filteredCadastro = ref();
const selectedCadastro = ref();
const nomeCadastro = ref();
// Busca e exibe o nome do cadastros caso exista
const getNomeCadastro = async () => {
    if (itemData.value.id_cadastros) {
        try {
            const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&literal=1&slct=nome,cpf_cnpj`;
            const response = await axios.get(url);
            if (response.data.data.length > 0) {
                nomeCadastro.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
            }
        } catch (error) {
            console.error('Erro ao buscar cadastros:', error);
        }
    }
};
// Busca de cadastros enquanto digitado
const searchCadastro = (event) => {
    setTimeout(() => {
        filteredCadastro.value = []; // Limpa a lista antes de cada busca
        if (!event.query.trim().length) {
            // Se estiver vazio, exiba todas as sugestões
            filteredCadastro.value = [...cadastros.value];
        } else {
            // Se não estiver vazio, filtre dentre as opções em cadastros.value
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastro.value = cadastros.value.filter((cadastro) => {
                return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
            });
            // Se não houver resultados, carregue os cadastros da API
            if (filteredCadastro.value.length === 0) {
                getCadastroBySearchedId(event.query.toLowerCase());
            }
        }
    }, 150);
};
// Se não houver resultados, carregue os cadastros da API
const getCadastroBySearchedId = async (idCadastro) => {
    const qry = idCadastro ? `fld=nome&vl=${idCadastro}` : 'fld=1&vl=1';
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?${qry}&slct=id,nome,cpf_cnpj`;
        const response = await axios.get(url);
        // Limpe a lista de cadastros para evitar duplicatas
        cadastros.value = [];
        cadastros.value = response.data.data.map((element) => {
            return {
                code: element.id,
                name: element.nome + ' - ' + element.cpf_cnpj
            };
        });
        // Atualize a lista filtrada
        filteredCadastro.value = [...cadastros.value];
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
// Questiona se deseja mesmo editar o cadastros
const confirmEditCadastro = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirma que deseja editar o cadastro?',
        message: 'Você tem certeza que deseja editar este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            selectedCadastro.value = undefined;
            editCadastro.value = true;
        },
        reject: () => {
            return false;
        }
    });
};
// Obter Cadastro
const getCadastro = async () => {
    const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id_params_tipo&vl=5&literal=1&slct=id,nome,cpf_cnpj`;
    cadastros.value = []; // Limpa a lista antes de popular
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            cadastros.value.push({
                code: item.id,
                name: item.nome + ' - ' + item.cpf_cnpj
            });
        });
    });
};
// Refaz a lista removendo inclusive as duplicatas
computed(() => {
    return [...new Set(filteredCadastro.value)];
});
/**
 * Fim de autocomplete de cadastros
 */

const registroIdentico = async () => {
    itemData.value = {
        id_cadastros: itemData.value.id_cadastros,
        valor_bruto: "0",
        valor_liquido: 0
    };
    mode.value = 'clone';
};
/**
 * Fim de ferramentas do registro
 */
const toGrid = () => {
    mode.value = 'grid';
    emit('cancel');
    router.push({ path: `/${uProf.value.schema_description}/financeiro` });
};

// Obter Empresas
const getEmpresas = async () => {
    const url = `${baseApiUrl}/empresas`;
    dropdownEmpresas.value = [];
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            dropdownEmpresas.value.push({
                value: item.id,
                label: `${item.razaosocial} - ${masks.value.cpf_cnpj.masked(item.cpf_cnpj_empresa)}`
            });
        });
    });
};

const getCredorDevedor = () => {
    credorDevedor.value = itemData.value.centro == 1 ? 'Devedor' : 'Credor';
    animationLblCadas.value = '';
    setTimeout(() => {
        animationLblCadas.value = ANIMATION_CLASS;
    }, 150);
};

onBeforeMount(() => {
    // Empresas do usuário
    getEmpresas();
    // Agentes de negócio
    getCadastro();
});

// Carregar dados do formulário
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    // Carrega os dados do formulário
    await loadData();
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
    }
});
watch(route, (value) => {
    if (value !== itemData.value.id) {
        reload();
    }
});
</script>

<template>
    <Breadcrumb :items="breadItems" v-if="!(props.idCadastro || mode == 'new')" />
    <div>
        <form @submit.prevent="saveData">
            <div class="grid">
                <div :class="`${['new', 'clone'].includes(mode) ? 'col-12' : 'col-12 lg:col-8'}`">
                    <div class="p-fluid grid">
                        <div :class="`col-12`">
                            <label for="id_empresa">Empresa <span class="text-base" style="color: red">*</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else placeholder="Selecione..." :showClear="!!itemData.id_empresa"
                                id="id_empresa" optionLabel="label" optionValue="value" v-model="itemData.id_empresa"
                                :options="dropdownEmpresas" :disabled="['view'].includes(mode)" />
                        </div>
                        <div class="col-12 lg:col-2">
                            <label for="centro">Centro <span class="text-base" style="color: red">*</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else placeholder="Selecione..." id="centro" optionLabel="label"
                                optionValue="value" v-model="itemData.centro" :options="dropdownCentro"
                                :disabled="['view'].includes(mode)" @change="getCredorDevedor()" />
                        </div>
                        <div :class="`col-10`">
                            <label for="id_cadastros" :class="`${animationLblCadas}`">{{ credorDevedor }} <span
                                    class="text-base" style="color: red">*</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="route.name != 'cadastro' && (editCadastro || mode == 'new')"
                                v-model="selectedCadastro" dropdown optionLabel="name" :suggestions="filteredCadastro"
                                @complete="searchCadastro" forceSelection @keydown.enter.prevent />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCadastro" />
                                <Button
                                    v-if="(route.name != 'cadastro' && (!itemData.status || itemData.status < 80) && uProf.fiscal >= 4) || mode == 'clone'"
                                    icon="fa-solid fa-pencil" severity="primary" @click="confirmEditCadastro()"
                                    :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="data_emissao">Data Emissão <small id="text-error"
                                    class="p-error">*</small></label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputGroup v-else>
                                <InputText autocomplete="no" required :disabled="mode == 'view'" v-maska
                                    data-maska="##/##/####" v-model="itemData.data_emissao" id="data_emissao" />
                                <Button v-tooltip.top="'Data de hoje'" icon="fa-solid fa-calendar-day"
                                    @click="itemData.data_emissao = moment().format('DD/MM/YYYY')" text raised
                                    :disabled="mode == 'view'" />
                            </InputGroup>
                        </div>
                        <div :class="`col-12 lg:col-3`">
                            <label for="valor_bruto">Valor Bruto <span class="text-base"
                                    style="color: red">*</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div v-else-if="!['view', 'expandedFormMode'].includes(mode)" class="p-inputgroup flex-1"
                                style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="['view', 'expandedFormMode'].includes(mode)"
                                    v-model="itemData.valor_bruto" id="valor_bruto" type="text" v-maska
                                    data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                            </div>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <span disabled v-html="itemData.valor_bruto" id="valor_bruto"
                                    class="p-inputtext p-component p-filled p-variant-filled" />
                            </div>
                        </div>
                        <div :class="`col-12 lg:col-3`">
                            <label for="valor_liquido" :class="`${animationVlrLiq}`">Valor Liquido</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <span disabled v-html="itemData.valor_liquido" id="valor_liquido"
                                    class="p-inputtext p-component p-filled p-variant-filled" />
                            </div>
                        </div>
                        <div class="col-12 lg:col-3">
                            <label for="pedido">Pedido</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="['view'].includes(mode)"
                                v-model="itemData.pedido" id="pedido" type="text" maxlength="20" />
                        </div>
                        <div class="col-12 lg:col12">
                            <label for="descricao">Descrição do registro</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <EditorComponent v-else :readonly="['view'].includes(mode)" v-model="itemData.descricao"
                                id="descricao" :editorStyle="{ height: '160px' }" aria-describedby="editor-error" />
                            <!-- <p v-else v-html="itemData.descricao || ''" class="p-inputtext p-component p-filled"></p> -->
                            <!-- <Textarea disabled v-else v-model="itemData.descricao" rows="5" class="p-inputtext p-component p-filled"></Textarea> -->
                        </div>
                    </div>
                    <div class="card flex justify-content-center flex-wrap gap-3"
                        v-if="['new', 'clone'].includes(mode)">
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk"
                            severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban"
                            severity="danger" text raised
                            @click="mode == 'edit' || route.params.id ? reload() : toGrid()" />
                    </div>
                </div>
                <div class="col-12 md:col-4" v-if="itemData.id">
                    <Fieldset :toggleable="true" class="mb-3">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-bolt mr-2"></span>
                                <span class="font-bold text-lg">Ações do Registro</span>
                            </div>
                        </template>

                        <div
                            v-if="(['new', 'clone'].includes(mode) || (!itemData.status || itemData.status < 80)) && !itemData.id_filho">
                            <Button label="Editar" outlined class="w-full" type="button" v-if="mode == 'view'"
                                icon="fa-regular fa-pen-to-square fa-shake" @click="mode = 'edit'" />
                            <Button label="Salvar" outlined class="w-full mb-3" type="submit" v-if="mode != 'view'"
                                icon="fa-solid fa-floppy-disk" severity="success" />
                            <Button label="Cancelar" outlined class="w-full" type="button" v-if="mode != 'view'"
                                icon="fa-solid fa-ban" severity="danger"
                                @click="mode == 'edit' ? reload() : toGrid()" />
                        </div>
                        <div v-if="mode != 'edit'">
                            <hr class="w-full mb-3" v-if="!itemData.id_filho" />
                            <Button v-if="route.name == 'pipeline-one'" label="Ir ao Fornecedor" type="button"
                                class="w-full mb-3" :icon="`fa-regular fa-address-card fa-shake`" style="color: #a97328"
                                text raised
                                @click="router.push(`/${uProf.schema_description}/cadastro/${itemData.id_cadastros}`)" />
                            <Button label="Novo Registro para o Cadastro" v-if="itemData.id" type="button"
                                class="w-full mb-3" icon="fa-solid fa-plus fa-shake" severity="primary" text raised
                                @click="registroIdentico" />
                            <Button label="Cancelar Registro" v-tooltip.top="`Cancelar não exclui o registro`"
                                v-if="(!itemData.status || itemData.status < 80)" type="button"
                                :disabled="!(uProf.fiscal >= 3 && (itemData.status == 0 || itemData.status == 10))"
                                class="w-full mb-3" :icon="`fa-solid fa-ban`" severity="warning" text raised
                                @click="defaultWarn('Cancelar registro')" />
                            <Button label="Reativar Registro" v-tooltip.top="`Reative o registro cancelado`"
                                v-else-if="uProf.fiscal >= 4 && itemData.status >= 89" type="button" class="w-full mb-3"
                                :icon="`fa-solid fa-file-invoice ${itemData.status == 0 ? 'fa-shake' : ''}`"
                                severity="warning" text raised @click="defaultWarn('Reativar registro')" />
                            <Button v-if="uProf.fiscal >= 4 && itemData.status == 10" label="Excluir Registro"
                                v-tooltip.top="`Não pode ser desfeito! Se excluir, excluirá o documento relacionado e os registros financeiros ficarão órfãos, caso haja algum!`"
                                type="button" :disabled="!(uProf.fiscal >= 4 && itemData.status == 10)"
                                class="w-full mb-3" :icon="`fa-solid fa-fire`" severity="danger" text raised
                                @click="defaultWarn('Excluir registro')" />
                        </div>
                    </Fieldset>
                    <RetencoesGrid v-if="itemData.id" :idRegistro="itemData.id" @reloadItems="loadRetencoes"
                        :uProf="uProf" :mode="mode" />
                    <NotasGrid v-if="itemData.id" :idRegistro="itemData.id" @reloadItems="loadNotas" :uProf="uProf"
                        :mode="mode" />
                </div>
                <div class="col-12" v-if="itemData.id">
                    <ParcelasGrid v-if="itemData.id" :idRegistro="itemData.id" @reloadItems="loadParcelas"
                        :totalLiquido="itemData.valor_liquido" :uProf="uProf" :mode="mode" :idEmpresa="itemData.id_empresa" />
                    <Eventos :tabelaBd="'fin_lancamentos'" :idRegistro="Number(itemData.id)" v-if="itemData.id" />
                    <Fieldset class="bg-green-200" toggleable :collapsed="true" v-if="mode != 'expandedFormMode'">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">Instruções</span>
                            </div>
                        </template>
                        <p class="mb-3" v-if="itemData.old_id">
                            <span>Para acessar o registro no lynkos.com.br acesse <a
                                    :href="`https://lynkos.com.br/ged/${itemData.old_id}`" target="_blank">aqui</a>.
                                Edições e inclusões não são mais permitidas no LynkOs</span>
                            <span style="font-size: 20px">&#128521;</span>
                        </p>
                        <p class="m-0">
                            <span v-html="guide" />
                        </p>
                    </Fieldset>
                </div>
            </div>
        </form>
    </div>
    <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="false" v-if="uProf.admin >= 2">
        <template #legend>
            <div class="flex align-items-center text-primary">
                <span class="fa-solid fa-circle-info mr-2"></span>
                <span class="font-bold text-lg">FormData</span>
            </div>
        </template>
        <p>route: {{ route.name }}</p>
        <p>breadItems: {{ breadItems }}</p>
        <p>mode: {{ mode }}</p>
        <p>itemData: {{ itemData }}</p>
        <p>editCadastro {{ editCadastro }}</p>
        <p>selectedCadastro {{ selectedCadastro }}</p>
        <p>itemDataRetencoes {{ itemDataRetencoes }}</p>
        <p>itemDataParcelas {{ itemDataParcelas }}</p>
        <p>itemDataNotas {{ itemDataNotas }}</p>
    </Fieldset>
</template>

<style scoped>
@keyframes animation-color {
    0% {
        background-color: var(--blue-500);
        color: var(--gray-50);
    }

    50% {
        background-color: var(--yellow-500);
        color: var(--gray-900);
    }

    100% {
        background-color: var(--surface-200);
        color: var(--gray-900);
    }
}

.animation-color {
    animation: animation-color 5s linear;
}
</style>
