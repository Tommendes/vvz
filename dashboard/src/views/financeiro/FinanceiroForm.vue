<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EditorComponent from '@/components/EditorComponent.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import Eventos from '@/components/Eventos.vue';

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

const animationDocNr = ref('');
// Campos de formulário
const itemData = ref({});
// Tipo de centro
const credorDevedor = ref('Destinatário');
// Listagem de arquivos na pasta do registro
const listFolder = ref(null);
// O registro tem pasta?
const hasFolder = ref(false);
// O servidor está acessível?
const hostAccessible = ref(false);
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

// Carragamento de dados do form
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
                // if (route.name != 'cadastro' && mode.value == 'new') {
                //     router.push({
                //         path: `/${uProf.value.schema_description}/fin-lancamentos/${itemData.value.id}`
                //     });
                //     loadData();
                // } else if (route.name != 'cadastro' && id != itemData.value.id) {
                //     router.push({
                //         path: `/${uProf.value.schema_description}/fin-lancamentos/${itemData.value.id}`
                //     });
                //     const animation = animationDocNr.value;
                //     animationDocNr.value = '';
                //     loadData();
                //     animationDocNr.value = animation;
                // } else reload();
                mode.value = 'view';
                const folterRoot = itemData.value.cadastros.replaceAll(' ', '_');
                const bodyTo = { id_fis_notas: itemData.value.id, path: `${folterRoot}/${itemData.value.numero}` };
                setTimeout(async () => {
                    await mkFolder(bodyTo);
                }, Math.random() * 2000 + 250);
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
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    editCadastro.value = false;
    loadData();
    emit('cancel');
};
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
import { computed } from 'vue';
// Refaz a lista removendo inclusive as duplicatas
computed(() => {
    return [...new Set(filteredCadastro.value)];
});
/**
 * Fim de autocomplete de cadastros
 */

const registroIdentico = async () => {
    itemData.value = {
        id_cadastros: itemData.value.id_cadastros
    };
    mode.value = 'clone';
};

const lstFolder = async () => {
    const id = props.idFisNotas || route.params.id;
    const url = `${baseApiUrl}/fiscal-notas/f-a/lfd`;
    await axios
        .post(url, { id_fis_notas: id })
        .then((res) => {
            if (res.data && res.data.length) {
                const itensToNotList = ['.', '..', '.DS_Store', 'Thumbs.db'];
                listFolder.value = res.data;
                // remover de listFolder os itensToNotList
                if (typeof listFolder.value == 'object' && listFolder.value.length > 0) {
                    listFolder.value = listFolder.value.filter((item) => {
                        return !itensToNotList.includes(item.name);
                    });
                    hasFolder.value = true;
                }
            }
            if (listFolder.value && typeof listFolder.value == 'object' && listFolder.value.length == 0) hasFolder.value = true;
            hostAccessible.value = true;
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
            hostAccessible.value = false;
        });
};

const mkFolder = async (body) => {
    const url = `${baseApiUrl}/fiscal-notas/f-a/mfd`;
    defaultWarn('Tentando entrar em contato com o servidor de pastas. Por favor aguarde...');

    const folterRoot = body.data.cadastros.replaceAll(' ', '_');
    const bodyTo = body || { id_fis_notas: itemData.value.id, path: `${folterRoot}/${itemData.value.numero}` };
    await axios
        .post(url, bodyTo)
        .then(async (res) => {
            // const msgDone = `Pasta criada com sucesso`;
            defaultSuccess(res.data);
            await lstFolder();
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
/**
 * Fim de ferramentas do registro
 */
const toGrid = () => {
    mode.value = 'grid';
    emit('cancel');
    router.push({ path: `/${uProf.value.schema_description}/fiscal-notas` });
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
    // TODO: animation deve ser uma classe CSS e ao fim o valor deve ser resetado
    const animation = 'animation-color animation-fill-forwards '
    setTimeout(() => {
        animationDocNr.value = animation;
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
    <Breadcrumb :items="breadItems" v-if="!(props.idCadastro || mode == 'expandedFormMode')" />
    <div>
        <form @submit.prevent="saveData">
            <div class="grid">
                <div :class="`${['new'].includes(mode) ? 'col-12' : 'col-12 lg:col-9'}`">
                    <div class="p-fluid grid">
                        <div :class="`col-12`">
                            <label for="id_empresa">Empresa</label>
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
                            <label for="id_cadastros" :class="`${animationDocNr}`">{{ credorDevedor }}</label>
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
                            <label for="data_emissao">Data Emissão<small id="text-error" class="p-error">*</small></label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" required :disabled="mode == 'view'" v-maska
                                data-maska="##/##/####" v-model="itemData.data_emissao" id="data_emissao" />
                        </div>
                        <div :class="`col-12 lg:col-3`">
                            <label for="valor_bruto">Valor Bruto</label>
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
                                    class="p-inputtext p-component" />
                            </div>
                        </div>
                        <div :class="`col-12 lg:col-3`">
                            <label for="valor_liquido">Valor Liquido</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <!-- <div v-else-if="!['view', 'expandedFormMode'].includes(mode)" class="p-inputgroup flex-1"
                                style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="['view', 'expandedFormMode'].includes(mode)"
                                    v-model="itemData.valor_liquido" id="valor_liquido" type="text" v-maska
                                    data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                            </div> -->
                            <div class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <span disabled v-html="itemData.valor_liquido" id="valor_liquido"
                                    class="p-inputtext p-component" />
                            </div>
                        </div>
                        <div class="col-12 lg:col-3">
                            <label for="pedido">Pedido</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="['view'].includes(mode)"
                                v-model="itemData.pedido" id="pedido" type="text" maxlength="20" />
                        </div>
                        <div class="col-12 lg:col12" v-if="['new', 'edit'].includes(mode) || itemData.descricao">
                            <label for="descricao">Descrição do registro</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <EditorComponent v-else-if="!(loading.form || ['view'].includes(mode))"
                                v-model="itemData.descricao" id="descricao" :editorStyle="{ height: '160px' }"
                                aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao || ''" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12" style="text-align: center">
                            <div
                                class="flex-grow-1 flex align-items-center justify-content-center font-bold m-2 px-5 py-3 surface-200 border-round">
                                <i class="fa-solid fa-angles-down fa-shake"></i>&nbsp;&nbsp;Retenções e descontos do documento&nbsp;&nbsp;<i class="fa-solid fa-angles-down fa-shake" />
                            </div>
                        </div>
                        <div class="col-12" style="text-align: center">
                            <div
                                class="flex-grow-1 flex align-items-center justify-content-center font-bold m-2 px-5 py-3 surface-200 border-round">
                                <i class="fa-solid fa-angles-down fa-shake"></i>&nbsp;&nbsp;Notas fiscais do documento&nbsp;&nbsp;<i class="fa-solid fa-angles-down fa-shake" />
                            </div>
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
                <div class="col-12 md:col-3" v-if="!['new'].includes(mode)">
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
                            <Button :disabled="!hostAccessible || hasFolder" label="Criar Pasta" type="button"
                                class="w-full mt-3 mb-3"
                                :icon="`fa-solid fa-folder ${hostAccessible && !hasFolder ? 'fa-shake' : ''}`"
                                severity="success" text raised @click="mkFolder()" />
                        </div>
                    </Fieldset>
                    <Fieldset :toggleable="true" :collapsed="true" v-if="itemData.id">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-clock mr-2"></span>
                                <span class="font-bold text-lg">Conteúdo da Pasta</span>
                            </div>
                        </template>
                        <ul class="list-decimal"
                            v-if="listFolder && typeof listFolder == 'object' && listFolder.length">
                            <li v-for="item in listFolder" :key="item.id">{{ item.name }}</li>
                        </ul>
                        <p v-else-if="!hostAccessible">O servidor de pastas/arquivos está inacessível no momento</p>
                        <p v-else>Não há conteúdo na pasta</p>
                    </Fieldset>
                </div>
                <div class="col-12">
                    <div class="grid">
                        <div class="col-12" style="text-align: center">
                            <div
                                class="flex-grow-1 flex align-items-center justify-content-center font-bold m-2 px-5 py-3 surface-200 border-round">
                                <i class="fa-solid fa-angles-down fa-shake"></i>&nbsp;&nbsp;Programação financeira&nbsp;&nbsp;<i class="fa-solid fa-angles-down fa-shake" />
                            </div>
                        </div>
                        <!-- <div :class="`col-12 lg:col-2`" v-for="item in itemsInputsList" :key="item">
                            <label :for="item.field">{{ item.label }}<span v-if="item.required" class="text-base"
                                    style="color: red">
                                    *</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div v-else-if="!['view'].includes(mode)" class="p-inputgroup flex-1"
                                style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="['view'].includes(mode)"
                                    v-model="itemData[item.field]" :id="item.field" type="text" v-maska
                                    data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                            </div>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <span disabled v-html="itemData[item.field]" :id="item.field"
                                    class="p-inputtext p-component" />
                            </div>
                        </div> -->
                    </div>

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
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                        <p v-if="props.idFisNotas">idPipeline: {{ props.idFisNotas }}</p>
                        <p>hasFolder {{ hasFolder }}</p>
                        <p>editCadastro {{ editCadastro }}</p>
                        <p>listFolder: {{ typeof listFolder == 'object' ? listFolder : '' }}</p>
                    </Fieldset>
                </div>
            </div>
        </form>
    </div>
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
