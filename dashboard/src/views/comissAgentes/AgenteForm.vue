<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(false);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/comis-agentes`);
const props = defineProps(['itemDataRoot']);

// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (route.params.id || (props.itemDataRoot && props.itemDataRoot.id)) {
        setTimeout(async () => {
            const id = route.params.id || props.itemDataRoot.id;
            const url = `${urlBase.value}/${id}`;

            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    itemData.value.agente_representante = body.agente_representante ? 1 : 0;
                    itemData.value.dsr = body.dsr ? 1 : 0;
                    itemData.value.ordem = body.ordem.padStart(3, '0').toString();
                    await getNomeCliente();
                    loading.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/comiss-agentes` });
                }
            });
        }, Math.random() * 1000 + 250);
    } else {
        loading.value = false;
        mode.value = 'new';
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
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                emit('changed');
                itemData.value = body;
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
// Excluir o item depois de confirmado
const deleteItem = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmação de exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            const url = `${urlBase.value}/${itemData.value.id}`;
            axios
                .delete(url)
                .then(() => {
                    defaultSuccess('Registro excluído com sucesso');
                    emit('changed');
                    router.push({ path: `/${userData.schema_description}/comiss-agentes` });
                })
                .catch((err) => {
                    defaultWarn(err.response.data);
                });
        },
        reject: () => {
            return false;
        }
    });
};
//DropDowns
const dropdownSN = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
const dropdownTiposAR = ref([
    { value: 0, label: 'Agente' },
    { value: 1, label: 'Representação' },
    { value: 2, label: 'Representada' },
    { value: 3, label: 'Terceiro' }
]);
// Validar formulário
const formIsValid = () => {
    return true;
};

/**
 * Autocomplete de cadastros
 */
const cadastros = ref([]);
const editCadastro = ref(false);
const filteredCadastros = ref([]);
const selectedCadastro = ref();
const nomeCliente = ref();
const getNomeCliente = async () => {
    if (itemData.value.id_cadastros) {
        try {
            const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&literal=1&slct=nome,cpf_cnpj`;
            setTimeout(async () => {
                const response = await axios.get(url);
                if (response.data.data.length > 0) {
                    nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
                }
            }, Math.random() * 1000 + 250);
        } catch (error) {
            console.error('Erro ao buscar cadastros:', error);
        }
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
            filteredCadastros.value = cadastros.value.filter((cadastro) => {
                return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
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
/**
 * Fim de autocomplete de cadastros
 */
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
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
    }
});
</script>

<template>
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-7">
                            <label for="id_cadastros">Nome</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="editCadastro || mode == 'new'" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button icon="fa-solid fa-pencil" severity="primary" @click="confirmEditCadastro()" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="apelido">Nome curto</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else class="uppercase" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.apelido" id="apelido" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="ordem">Ordem</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else class="uppercase" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ordem" id="ordem" type="text" v-maska data-maska="###" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="agente_representante">Tipo</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="agente_representante" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.agente_representante" :options="dropdownTiposAR" placeholder="Selecione..." />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="dsr">Destacar o "Descanso semanal remunerado" (DSR)</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="dsr" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.dsr" :options="dropdownSN" placeholder="Selecione..." />
                        </div>
                        <div class="col-12">
                            <label for="observacao">Observações</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else class="uppercase" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.apelido" id="observacao" type="text" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode == 'view'" label="Excluir" icon="fa-solid fa-trash" severity="danger" text raised @click="deleteItem" />
                        <Button type="button" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
        <div class="col-12" v-if="userData.admin >= 2">
            <div class="card bg-green-200 mt-3">
                <p>Mode: {{ mode }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>itemDataRoot: {{ itemDataRoot }}</p>
            </div>
        </div>
    </div>
</template>
