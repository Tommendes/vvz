<script setup>
import { onMounted, ref, watch } from 'vue';
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EditorComponent from '@/components/EditorComponent.vue';

import { guide } from '@/guides/propostasItemFormGuide.js';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
import { formatValor } from '@/global';

import moment from 'moment';

const form = ref();

// Campos de formulário
const itemData = ref({});
const dataRegistro = ref('');
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(false);
// Props do template
const props = defineProps(['idItem', 'modeParent', 'idComposicao']);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prop-itens/${route.params.id}`);
// Carragamento de dados do form
const loadData = async () => {
    if (props.idItem) {
        loading.value = true;
        const url = `${urlBase.value}/${props.idItem}`;
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                convertFloatFields();
                itemData.value.item_ativo = isTrue(itemData.value.item_ativo);
                itemData.value.compoe_valor = isTrue(itemData.value.compoe_valor);
                itemData.value.desconto_ativo = Number(itemData.value.desconto_ativo) || 0;
                dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
                await getNomeProduto();
                if (props.modeParent == 'clone') {
                    mode.value = 'new';
                    delete itemData.value.id;
                    delete itemData.value.item;
                    delete itemData.value.updated_at;
                    delete itemData.value.old_id;
                    itemData.value.item_ativo = true;
                    itemData.value.compoe_valor = true;
                    itemData.value.desconto_total = '0,00';
                    itemData.value.desconto_ativo = 0;
                }
                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/proposta/${route.params.id}` });
            }
        });
        loading.value = false;
    } else {
        itemData.value = {
            id_com_propostas: route.params.id,
            id_com_prop_compos: props.idComposicao,
            item_ativo: true,
            compoe_valor: true,
            quantidade: 1,
            valor_unitario: '0,00',
            desconto_total: '0,00',
            desconto_ativo: 0
        };
        mode.value = 'new';
        loading.value = false;
    }
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
    obj.valor_unitario = obj.valor_unitario.replace(',', '.');
    obj.desconto_total = obj.desconto_total.replace(',', '.');
    obj.quantidade = obj.quantidade.replace(',', '.');
    // Importante para o backend
    // convertFloatFields('en');
    axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                // Caso a operação seja resultado de uma duplicação de item em uma composição diferente da original
                if (props.modeParent == 'clone' && props.idComposicao != itemData.value.id_com_prop_compos) emit('cancel');
                else {
                    itemData.value.id = body.id;

                    await getNomeProduto();
                    // convertFloatFields();
                    mode.value = 'view';
                    editProduto.value = false;
                    emit('changed');
                }
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};

// Verifica se o valor é 1
const isTrue = (value) => [1].includes(value);
//DropDown
const dropdownDescAtivo = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
const dropdownComposicoes = ref([]);

// Composições da proposta
const getComposicoes = async () => {
    loading.value = true;
    const url = `${baseApiUrl}/com-prop-compos/f-a/glf?fld=id_com_propostas&vl=${route.params.id}&slct=id,comp_ativa,localizacao,tombamento&order=comp_ativa,localizacao,tombamento`;
    await axios
        .post(url)
        .then((res) => {
            const itensAtivos = [];
            const itensInativos = [];
            res.data.data.map((item) => {
                if (item.comp_ativa == 1) itensAtivos.push({ value: item.id, label: `${item.localizacao}${item.tombamento ? ' - ' + item.tombamento : ''}` });
                else itensInativos.push({ value: item.id, label: `${item.localizacao}${item.tombamento ? ' - ' + item.tombamento : ''}` });
            });
            if (itensAtivos.length > 0) dropdownComposicoes.value.push({ label: 'Ativas ', comp_ativa: 1, items: itensAtivos });
            if (itensInativos.length > 0) dropdownComposicoes.value.push({ label: 'Inativas ', comp_ativa: 0, items: itensInativos });
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
    loading.value = false;
};
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    emit('cancel');
};

/**
 * Autocomplete de produtos
 */
// Editar cadastro no autocomplete
const editProduto = ref(false);
const produtos = ref([]);
const filteredProdutos = ref([]);
const selectedProduto = ref();
const nomeProduto = ref('');
const valorVendaProduto = ref(0);
const getNomeProduto = async () => {
    if (itemData.value.id_com_produtos) {
        try {
            const url = `${baseApiUrl}/com-produtos/f-a/glf?fld=tbl1.id&vl=${itemData.value.id_com_produtos}&slct=tbl1.id,tbl1.nome_comum,tbl1.descricao`;
            const response = await axios.get(url);
            if (response.data.data.length > 0) {
                // remover tags html de descricao
                nomeProduto.value = response.data.data[0].nome_comum;
                valorVendaProduto.value = formatValor(response.data.data[0].valor_venda, 'pt');
            }
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        }
    }
};
const searchProdutos = (event) => {
    setTimeout(async () => {
        // Verifique se o campo de pesquisa não está vazio
        if (!event.query.trim().length) {
            // Se estiver vazio, exiba todas as sugestões
            filteredProdutos.value = [...produtos.value];
        } else {
            // Se não estiver vazio, faça uma solicitação à API (ou use dados em cache)
            // Filtrar os produtos com base na consulta do usuário
            filteredProdutos.value = produtos.value.filter((produto) => {
                return produto.name.toLowerCase().includes(event.query.toLowerCase());
            });
            // Se não houver resultados, carregue os cadastros da API
            if (filteredProdutos.value.length === 0) {
                // Carregue os produtos da API (ou de onde quer que você os obtenha)
                getProdutoBySearchedId();
            }
        }
    }, 150);
};
// Se não houver resultados, carregue os cadastros da API
const getProdutoBySearchedId = async (idProduto) => {
    const qry = idProduto ? `fld=tbl1.id&vl=${idProduto}` : 'fld=1&vl=1';
    try {
        const url = `${baseApiUrl}/com-produtos/f-a/glf?${qry}&slct=tbl1.id,tbl1.nome_comum,tbl1.descricao`;
        const response = await axios.get(url);
        produtos.value = response.data.data.map((element) => {
            return {
                code: element.id,
                name:
                    element.nome_comum +
                    ' - ' +
                    element.descricao
                        .replace(/(<([^>]+)>)/gi, '')
                        .replace('&nbsp;', ' ')
                        .trim(),
                valor_venda: formatValor(element.valor_venda, 'pt')
            };
        });
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
    }
};
// Obter Principais Produtos
const getProdutos = async () => {
    const url = `${baseApiUrl}/com-produtos/f-a/glf?fld=tbl1.status&vl=10&literal=1&slct=tbl1.id,tbl1.nome_comum,tbl1.descricao`;
    produtos.value = []; // Limpa a lista antes de popular
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            produtos.value.push({
                code: item.id,
                name:
                    item.nome_comum +
                    ' - ' +
                    item.descricao
                        .replace(/(<([^>]+)>)/gi, '')
                        .replace('&nbsp;', ' ')
                        .trim(),
                valor_venda: formatValor(item.valor_venda, 'pt')
            });
        });
    });
};
import { computed } from 'vue';
// Refaz a lista removendo inclusive as duplicatas
computed(() => {
    return [...new Set(filteredFornecedores.value)];
});
/**
 * Fim de autocomplete de produtos
 */
const confirmEditProduto = () => {
    selectedProduto.value = nomeProduto.value;
    editProduto.value = true;
};
const convertFloatFields = (result = 'pt') => {
    itemData.value.valor_unitario = formatValor(itemData.value.valor_unitario, result);
    itemData.value.desconto_total = formatValor(itemData.value.desconto_total, result);
    itemData.value.quantidade = formatValor(itemData.value.quantidade, result);
};

// Observar alterações na propriedade selectedProduto
watch(selectedProduto, (value) => {
    if (value) {
        itemData.value.id_com_produtos = value.code;
        itemData.value.descricao = value.name;
        if (!(itemData.value.valor_unitario && itemData.value.valor_unitario > 0)) itemData.value.valor_unitario = value.valor_venda;
    }
});
// Carregar dados do formulário
onMounted(async () => {
    getProdutos();
    loadData();
    getComposicoes();
    form.value.scrollIntoView({ behavior: 'smooth' });
});
</script>

<template>
    <div class="card" ref="form">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-8">
                            <div class="flex justify-content-start gap-5">
                                <div class="switch-label" v-if="itemData.item">Número do item: {{ itemData.item }}</div>
                                <div class="switch-label">
                                    Item ativo
                                    <InputSwitch id="item_ativo" :disabled="mode == 'view'" v-model="itemData.item_ativo" />
                                </div>
                                <div class="switch-label">
                                    Compõe valor
                                    <InputSwitch id="compoe_valor" :disabled="mode == 'view'" v-model="itemData.compoe_valor" />
                                </div>
                            </div>
                        </div>
                        <div class="col-12">
                            <label for="id_com_prop_compos">Composição</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown
                                v-else
                                v-model="itemData.id_com_prop_compos"
                                :options="dropdownComposicoes"
                                id="id_com_prop_compos"
                                showClear
                                filter
                                :disabled="mode == 'view'"
                                placeholder="Selecione a composição"
                                optionLabel="label"
                                optionValue="value"
                                optionGroupLabel="label"
                                optionGroupChildren="items"
                                :loading="loading"
                            >
                                <template #optiongroup="slotProps">
                                    <div class="flex align-items-center">
                                        <i v-if="slotProps.option.comp_ativa == 10" class="fa-solid fa-toggle-on"> </i>
                                        <i v-else class="fa-solid fa-toggle-off"> </i>
                                        <div>{{ slotProps.option.label }}</div>
                                    </div>
                                </template>
                            </Dropdown>
                        </div>
                        <div class="col-12 md:col-10">
                            <label for="id_com_produtos">Produto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete
                                v-else-if="editProduto || (mode == 'new' && props.modeParent != 'clone')"
                                v-model="selectedProduto"
                                :dropdown="false"
                                optionLabel="name"
                                :suggestions="filteredProdutos"
                                @complete="searchProdutos"
                                forceSelection
                                @keydown.enter.prevent
                                panelClass="p-autocomplete-panel-red"
                            />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeProduto" />
                                <Button icon="fa-solid fa-pencil" severity="primary" @click="confirmEditProduto()" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="quantidade">Quantidade</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <!-- <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.quantidade" id="quantidade" type="text" /> -->
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon" @click="['new', 'edit'].includes(mode) ? itemData.quantidade++ : true">+</span>
                                <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.quantidade" id="quantidade" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                                <span class="p-inputgroup-addon" @click="['new', 'edit'].includes(mode) && itemData.quantidade > 0 ? itemData.quantidade-- : true">-</span>
                            </div>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_unitario">Valor Unitário (Valor de venda do registro: R$ {{ valorVendaProduto }})</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_unitario" id="valor_unitario" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                            </div>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="desconto_total">Desconto Item</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto_total" id="desconto_total" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                            </div>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="desconto_ativo">Desconto Ativo</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="desconto_ativo" :disabled="mode == 'view'" placeholder="Selecione ..." optionLabel="label" optionValue="value" v-model="itemData.desconto_ativo" :options="dropdownDescAtivo" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <EditorComponent v-else :readonly="loading || mode == 'view'" v-model="itemData.descricao" id="descricao" :editorStyle="{ height: '160px' }" aria-describedby="editor-error" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="button" v-if="mode == 'view'" label="Fechar" icon="fa-solid fa-xmark" severity="secondary" text raised @click="reload()" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload()" />
                    </div>
                </div>
                <div class="col-12">
                    <Fieldset class="bg-green-200" toggleable :collapsed="true">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">Instruções</span>
                            </div>
                        </template>
                        <p class="m-0">
                            <span v-html="guide" />
                        </p>
                    </Fieldset>
                </div>
                <div class="card bg-green-200 mt-3" v-if="uProf.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>modeParent: {{ props.modeParent }}</p>
                    <p>itemData: {{ itemData }}</p>
                    <p>props.idComposicao: {{ props.idComposicao }}</p>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.p-autocomplete-panel-red {
    max-width: 70vh;
}

.switch-label {
    font-size: 1.75rem;
    font-family: inherit;
    font-weight: 500;
    line-height: 1.2;
    color: var(--surface-900);
}
</style>
