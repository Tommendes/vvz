<script setup>
import { onMounted, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import EditorComponent from '@/components/EditorComponent.vue';
import moment from 'moment';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import Breadcrumb from '@/components/Breadcrumb.vue';

import { Mask } from 'maska';
const masks = ref({
    data_visita: new Mask({
        mask: '##/##/####'
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    }),
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// DropDown
const dropdownAgentes = ref([]);
const dropdownEnderecos = ref([]);
// Props do template
const props = defineProps(['mode', 'idRegs', 'idCadastro']);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prospeccoes`);
// Itens do breadcrumb
const breadItems = ref([{ label: 'Todas as Prospecções', to: `/${uProf.value.schema_description}/prospeccoes` }]);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    const id = props.idRegs || route.params.id;
    const url = `${urlBase.value}/${id}`;
    if (mode.value != 'new' && route.name != 'cadastro' && id) {
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                body.id_cad_end = String(body.id_cad_end);
                if (itemData.value.data_visita) itemData.value.data_visita = masks.value.data_visita.masked(moment(itemData.value.data_visita).format('DD/MM/YYYY'));
                breadItems.value = [{ label: 'Todas as Prospecções', to: `/${uProf.value.schema_description}/prospeccoes` }];
                breadItems.value.push({ label: itemData.value.nome + (uProf.value.admin >= 2 ? `: (${itemData.value.id})` : ''), to: route.fullPath });
                if (itemData.value.id_cadastros) breadItems.value.push({ label: 'Ir ao Cadastro', to: `/${uProf.value.schema_description}/cadastro/${itemData.value.id_cadastros}` });
                await loadEnderecos();
                await getNomeCliente();
                editCadastro.value = false;
                selectedCadastro.value = {
                    code: itemData.value.id_cadastros,
                    name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
                };
            }
        });
    } else if (props.idCadastro) {
        itemData.value.id_cadastros = props.idCadastro;
        selectedCadastro.value = {
            code: itemData.value.id_cadastros,
            name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
        };
        await loadEnderecos();
        await getNomeCliente();
    }
    await listAgentes();
    loading.value = false;
};
const saveData = async () => {
    const formIsValid = validateContato();
    if (formIsValid) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        const obj = { ...itemData.value };
        if (obj.data_visita) obj.data_visita = moment(obj.data_visita, 'DD/MM/YYYY').format('YYYY-MM-DD');
        axios[method](url, obj)
            .then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemData.value.data_visita = moment(itemData.value.data_visita, 'DD/MM/YYYY');
                    emit('changed');
                    if (route.name != 'cadastro' && mode.value == 'new') {
                        router.push({
                            path: `/${uProf.value.schema_description}/prospeccao/${itemData.value.id}`
                        });
                        await loadData();
                    } else if (route.name != 'cadastro' && id != itemData.value.id) {
                        router.push({
                            path: `/${uProf.value.schema_description}/prospeccao/${itemData.value.id}`
                        });
                        await loadData();
                    } else reload();
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((error) => {
                defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
                if (error.response && error.response.status == 401) router.push('/');
            });
    }
};
/**
 * Autocomplete de cadastros e pipeline
 */
const cadastros = ref([]);
const filteredCadastros = ref([]);
const selectedCadastro = ref();
const nomeCliente = ref();
// Editar cadastro no autocomplete
const editCadastro = ref(false);
const getNomeCliente = async () => {
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&literal=1&slct=nome,cpf_cnpj`;
        const response = await axios.get(url);
        if (response.data.data.length > 0) {
            nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj) + (itemData.value.pv_nr ? ' - PV: ' + itemData.value.pv_nr : '');
        }
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
const searchCadastros = (event) => {
    setTimeout(async () => {
        itemData.value.id_cad_end = undefined;
        // Verifique se o campo de pesquisa não está vazio
        if (!event.query.trim().length) {
            // Se estiver vazio, exiba todas as sugestões
            filteredCadastros.value = [...cadastros.value];
        } else {
            // Se não estiver vazio, faça uma solicitação à API (ou use dados em cache)
            if (cadastros.value.length === 0) {
                // Carregue os cadastros da API (ou de onde quer que você os obtenha)
                getCadastroBySearchedId();
            }
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastros.value = cadastros.value.filter((registro) => {
                return registro.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 150);
};
const getCadastroBySearchedId = async (idCadastro) => {
    const qry = idCadastro ? `fld=id&vl=${idCadastro}` : 'fld=1&vl=1';
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?${qry}&slct=id,nome,cpf_cnpj`;
        const response = await axios.get(url);
        cadastros.value = response.data.data.map((element) => {
            return {
                code: element.id,
                name: element.nome + ' - ' + element.cpf_cnpj
            };
        });
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
const confirmEditAutoSuggest = (tipo) => {
    confirm.require({
        group: 'templating',
        header: `Corfirmar edição`,
        message: `Corfirma que deseja editar o ${tipo}?`,
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            if (tipo == 'cadastro') {
                selectedCadastro.value = undefined;
                editCadastro.value = true;
            }
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de autocomplete de cadastros
 */
const dropdownPeriodo = ref([
    { value: 0, label: 'Manhã' },
    { value: 1, label: 'Tarde' }
]);
// Validação do primeiro dígito do campo Contato
const validateContato = () => {
    const valorContato = itemData.value.contato;
    errorMessages.value.contato = null;

    // Verificar se o valor é um número ou letra
    if (valorContato) {
        const primeiroCaractere = valorContato.charAt(1);
        if (!isNaN(primeiroCaractere)) {
            // Aplicar a máscara de telefone
            itemData.value.contato = valorContato.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');

            // Validação para Telefone
            if (itemData.value.contato && itemData.value.contato.length > 0 && ![10, 11].includes(itemData.value.contato.replace(/([^\d])+/gim, '').length)) {
                errorMessages.value.contato = 'Formato de telefone inválido';
                return false;
            }
        } else {
            // Validação para E-mail
            if (itemData.value.contato && itemData.value.contato.trim().length > 0 && !isValidEmail(itemData.value.contato)) {
                errorMessages.value.contato = 'Formato de email inválido';
                return false;
            }
        }
    }
    return true;
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    errorMessages.value = {};
    await loadData();
    emit('cancel');
};
// Obter parâmetros do BD
//  Parâmetros Agente
const listAgentes = async () => {
    const url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&oper=4&vl=1&slct=id,name`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
    });
};
const loadEnderecos = async () => {
    dropdownEnderecos.value = [];
    if (itemData.value.id_cadastros) {
        const url = `${baseApiUrl}/cad-enderecos/${itemData.value.id_cadastros}`;
        await axios.get(url).then((res) => {
            res.data.data.map((item) => {
                const label = `${item.logradouro}${item.nr ? ', ' + item.nr : ''}${item.complnr ? ' ' + item.complnr : ''}${item.bairro ? ' - ' + item.bairro : ''}${uProf.value.admin >= 2 ? ` (${item.id})` : ''}`;
                dropdownEnderecos.value.push({ value: String(item.id), label: label });
            });
        });
    }
};
// Carregar dados do formulário
onMounted(async () => {
    await loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, async (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
        await loadEnderecos();
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="breadItems" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-3">
                            <label for="id_agente">Agente</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="id_agente" :disabled="mode == 'view'" :showClear="!!itemData.id_agente"
                                optionLabel="label" placeholder="Selecione um agente" optionValue="value"
                                v-model="itemData.id_agente" :options="dropdownAgentes" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="data_visita">Data da Visita</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska
                                data-maska="##/##/####" v-model="itemData.data_visita" id="data_visita" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="periodo">Período da Visita</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="periodo" :disabled="mode == 'view'" placeholder="Selecione o período"
                                optionLabel="label" optionValue="value" v-model="itemData.periodo"
                                :options="dropdownPeriodo" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="pessoa">Pessoa Contatada</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa"
                                id="pessoa" type="text" />
                        </div>
                        <div class="col-12 md:col-3 contato">
                            <label for="contato">Contato</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato"
                                id="contato" type="text" placeholder="Email ou Telefone" @blur="validateContato()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.contato">{{ errorMessages.contato
                                }}</small>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_cadastros">Cadastro</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete
                                v-else-if="route.name != 'cadastro' && mode != 'expandedFormMode' && (editCadastro || mode == 'new')"
                                v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros"
                                @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button v-if="!route.name == 'cadastro'" icon="fa-solid fa-pencil" severity="primary"
                                    @click="confirmEditAutoSuggest('cadastro')" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_cad_end">Endereço</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="id_cad_end" :disabled="mode == 'view'"
                                :showClear="!!itemData.id_cad_end" optionLabel="label"
                                placeholder="Selecione um endereço" optionValue="value" v-model="itemData.id_cad_end"
                                :options="dropdownEnderecos" />
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.observacoes || mode != 'view'">
                            <label for="observacoes">Observações</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.observacoes"
                                id="observacoes" :editorStyle="{ height: '160px' }" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.observacoes" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card bg-green-200 mt-3" v-if="uProf.admin >= 2">
                        <p>route.name {{ route.name }}</p>
                        <p>editCadastro {{ editCadastro }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                        <p v-if="props.idRegs">idRegs: {{ props.idRegs }}</p>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar"
                            icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk"
                            severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban"
                            severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
