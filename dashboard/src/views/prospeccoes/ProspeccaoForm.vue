<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey, isValidEmail } from '@/global';
import moment from 'moment';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

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

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

// Campos de formulário
const itemData = ref({
});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref({
    form: true,
    accepted: null,
    email: null,
    telefone: null
});
// DropDown
const dropdownAgentes = ref([]);
const dropdownEnderecos = ref([]);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prospeccoes`);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                body.id_cad_end = String(body.id_cad_end);
                if (itemData.value.data_visita) itemData.value.data_visita = masks.value.data_visita.masked(moment(itemData.value.data_visita).format('DD/MM/YYYY'));
                await getNomeCliente();
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}prospeccao` });
            }
        });
    } else loading.value.form = false;
    await listAgentes();
    await loadEnderecos();
    await getNomeCliente();
};
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        if (itemData.value.data_visita) itemData.value.data_visita = moment(itemData.value.data_visita, 'DD/MM/YYYY').format('YYYY-MM-DD');
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    if (itemData.value.data_visita) itemData.value.data_visita = moment(itemData.value.data_visita).format('DD/MM/YYYY');
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}prospeccao/${itemData.value.id}` });
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
/**
 * Autocomplete de cadastros e pipeline
 */
 const cadastros = ref([]);
const filteredCadastros = ref([]);
const selectedCadastro = ref();
const nomeCliente = ref();
const getNomeCliente = async () => {
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&slct=nome,cpf_cnpj`;
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
    }, 250);
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
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
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
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        // errorMessages.value = {};
    }
    return ret;
};
const dropdownPeriodo = ref([
    { value: 0, label: 'Manhã' },
    { value: 1, label: 'Tarde' }
]);
// Validação do primeiro dígito do campo Contato
const validateContato = () => {
    const valorContato = itemData.value.contato;

    // Verificar se o valor é um número ou letra
    if (valorContato) {
        const primeiroCaractere = valorContato.charAt(1);
        if (!isNaN(primeiroCaractere)) {
            // Aplicar a máscara de telefone
            itemData.value.contato = valorContato.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
            
            // Validação para Telefone
            if (itemData.value.contato && itemData.value.contato.length > 0 && ![10, 11].includes(itemData.value.contato.replace(/([^\d])+/gim, '').length)) {
                errorMessages.value.contato = 'Formato de telefone inválido';
            } else errorMessages.value.contato = null;
            return !errorMessages.value.contato;
        } else {
            // Validação para E-mail
            if (itemData.value.contato && itemData.value.contato.trim().length > 0 && !isValidEmail(itemData.value.contato)) {
                errorMessages.value.contato = 'Formato de email inválido';
            } else errorMessages.value.contato = null;
            return !errorMessages.value.contato;
        }
    } else {
        // Se o campo foi esvaziado, resetar as mensagens de erro
        errorMessages.value.contato = null;
        return !errorMessages.value.contato;
    }
};
const validateDataVisita = () => {
    errorMessages.value.data_visita = null;
    // Testa o formato da data
    if (itemData.value.data_visita && itemData.value.data_visita.length > 0 && !masks.value.data_visita.completed(itemData.value.data_visita)) {
        errorMessages.value.data_visita = 'Formato de data inválido';
    } else {
        // Verifica se a data é válida
        const momentDate = moment(itemData.value.data_visita, 'DD/MM/YYYY', true);
        if (!momentDate.isValid()) {
            errorMessages.value.data_visita = 'Data inválida';
        }
    }
    // Atualiza o estado do botão "Salvar"
    accept.value = !errorMessages.value.data_visita;

    return !errorMessages.value.data_visita;
};
// Validar formulário
const formIsValid = () => {
        return validateContato() && validateDataVisita();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Obter parâmetros do BD
//  Parâmetros Agente
const listAgentes = async () => {
    const url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
    });
};
const loadEnderecos = async () => {
    const url = `${baseApiUrl}/cad-enderecos/${itemData.value.id_cadastros}`;
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            const label = `${item.logradouro}${item.nr ? ', ' + item.nr : ''}${item.complnr ? ' ' + item.complnr : ''}${item.bairro ? ' - ' + item.bairro : ''}${userData.admin >= 2 ? ` (${item.id})` : ''}`;
            dropdownEnderecos.value.push({ value: String(item.id), label: label });
        });
    });
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
watchEffect(() => {
    isItemDataChanged();
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
        loadEnderecos();
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Prospecções', to: `/${userData.cliente}/${userData.dominio}/prospeccoes` }, { label: itemData.nome + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-3">
                            <label for="id_agente">Agente</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown 
                            v-else
                            id="id_agente"
                            :disabled="mode == 'view'"
                            :showClear="!!itemData.id_agente"
                            optionLabel="label"
                            placeholder="Selecione um agente"
                            optionValue="value"
                            v-model="itemData.id_agente"
                            :options="dropdownAgentes"
                        />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="data_visita">Data da Visita</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##/##/####" v-model="itemData.data_visita" id="data_visita" type="text" @input="validateDataVisita()"/>
                            <small id="text-error" class="p-error" if>{{ errorMessages.data_visita || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="periodo">Período da Visita</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="periodo" :disabled="mode == 'view'" placeholder="Selecione o período" optionLabel="label" optionValue="value" v-model="itemData.periodo" :options="dropdownPeriodo" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="pessoa">Pessoa Contatada</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa" type="text" />
                        </div>
                        <div class="col-12 md:col-3 contato">
                            <label for="contato">Contato</label> 
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.contato" id="contato" type="text" placeholder="Email ou Telefone" @input="validateContato()"/>
                            <small id="text-error" class="p-error" if>{{ errorMessages.contato || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_cadastros">Cadastro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="mode == 'new'" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button icon="pi pi-pencil" severity="primary" @click="confirmEditAutoSuggest('cadastro')" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_cad_end">Endereço</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown
                            v-else
                            id="id_cad_end"
                            :disabled="mode == 'view'"
                            :showClear="!!itemData.id_cad_end"
                            optionLabel="label"
                            placeholder="Selecione um endereço"
                            optionValue="value"
                            v-model="itemData.id_cad_end"
                            :options="dropdownEnderecos" />
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.observacoes || mode != 'view'">
                            <label for="observacoes">Observações</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.observacoes" id="observacoes" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.observacoes" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
