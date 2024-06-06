<script setup>
import { inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
import { usePrimeVue } from 'primevue/config';
const primevue = usePrimeVue();

import { defaultSuccess, defaultWarn } from '@/toast';
import axios from '@/axios-interceptor';
import { baseApiUrl } from '@/env';

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const totalSize = ref(0);
const totalSizePercent = ref(0);
const files = ref([]);

const onRemoveTemplatingFile = (file, removeFileCallback, index) => {
    console.log(file, removeFileCallback, index);
    removeFileCallback(index);
    totalSize.value -= parseInt(formatSize(file.size));
    totalSizePercent.value = totalSize.value / 10;
};

const onClearTemplatingUpload = (file, index) => {
    defaultWarn('Enviar unlink para o servidor apagar o arquivo após confirmação do usuário');
    console.log(file, index);
    totalSize.value -= parseInt(formatSize(file.size));
    totalSizePercent.value = totalSize.value / 10;
};

const onSelectedFiles = (event) => {
    files.value = event.files;
    files.value.forEach((file) => {
        totalSize.value += parseInt(formatSize(file.size));
    });
};

const uploadEvent = (callback) => {
    totalSizePercent.value = totalSize.value / 10;
    callback();
};

const onTemplatedUpload = async (event) => {
    const resp = JSON.parse(event.xhr.response);
    if (event.xhr.status !== 200) {
        defaultWarn(resp.message);
        return;
    }
    filesData.value = resp.files[0];
    await saveData();
    // defaultSuccess(resp.message);
};
const urlBase = ref(`${baseApiUrl}/uploads`);
const itemData = ref({});
const filesData = ref([]);

const props = defineProps({
    multiple: {
        type: Boolean,
        default: false
    },
    accept: {
        type: String,
        default: 'image/*'
    },
    maxFileSize: {
        type: Number,
        default: 1000000
    },
    tabela: {
        type: String,
        default: ''
    },
    registro_id: {
        type: Number,
        default: 0
    },
    schema: {
        type: String,
        default: ''
    },
    field: {
        type: String,
        default: ''
    },
    footerMsg: {
        type: String,
        default: ''
    }
});
const dialogRef = inject('dialogRef');
const closeDialog = () => {
    dialogRef.value.close();
};
// Salvar dados dos arquivos
const saveData = async () => {
    // itemData.value.width = filesData.value.width;
    // itemData.value.height = filesData.value.height;
    filesData.value.itemData = itemData.value;
    const url = `${urlBase.value}/f-a/sown`;
    await axios
        .post(url, filesData.value)
        .then(() => {
            defaultSuccess('Upload executado com sucesso');
            closeDialog();
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
// Formatar tamanho do arquivo
const formatSize = (bytes) => {
    const k = 1024;
    const dm = 3;
    const sizes = primevue.config.locale.fileSizeTypes;

    if (bytes === 0) {
        return `0 ${sizes[0]}`;
    }

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    return `${formattedSize} ${sizes[i]}`;
};
onMounted(() => {
    setTimeout(() => {
        itemData.value = {
            registro_id: props.registro_id || dialogRef.value.data.registro_id || 1,
            tabela: props.tabela || dialogRef.value.data.tabela || 'empresa',
            field: props.field || dialogRef.value.data.field || 'id_uploads_logo',
            schema: props.schema || dialogRef.value.data.schema || `${userData.schema_name}`
        };
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <div class="card">
        <FileUpload name="arquivos" :url="`${urlBase}/f/hfl?tkn=${userData.id}_${userData.exp}`" @upload="onTemplatedUpload($event)" :multiple="props.multiple" :accept="props.accept" :maxFileSize="props.maxFileSize" @select="onSelectedFiles">
            <template #header="{ chooseCallback, uploadCallback, clearCallback, files }">
                <div class="flex flex-wrap justify-content-between align-items-center flex-1 gap-2">
                    <div class="flex gap-2">
                        <Button @click="chooseCallback()" icon="fa-solid fa-image" rounded outlined></Button>
                        <Button @click="uploadEvent(uploadCallback)" icon="fa-solid fa-cloud" rounded outlined severity="success" :disabled="!files || files.length === 0"></Button>
                        <Button @click="clearCallback()" icon="fa-solid fa-x" rounded outlined severity="danger" :disabled="!files || files.length === 0"></Button>
                    </div>
                    <ProgressBar :value="totalSizePercent" :showValue="false" :class="['md:w-20rem h-1rem w-full md:ml-auto', { 'exceeded-progress-bar': totalSizePercent > 100 }]">
                        <span class="white-space-nowrap">{{ totalSize }}B / 1Mb</span></ProgressBar
                    >
                </div>
            </template>
            <template #content="{ files, uploadedFiles, removeUploadedFileCallback, removeFileCallback }">
                <div v-if="files.length > 0">
                    <h5>Pendente</h5>
                    <div class="flex flex-wrap p-0 sm:p-5 gap-5">
                        <div v-for="(file, index) of files" :key="file.name + file.type + file.size" class="card m-0 px-6 flex flex-column border-1 surface-border align-items-center gap-3">
                            <div>
                                <img role="presentation" :alt="file.name" :src="file.objectURL" width="100" height="50" class="shadow-2" />
                            </div>
                            <span class="font-semibold">{{ file.name }}</span>
                            <div>{{ formatSize(file.size) }}</div>
                            <Badge value="Pendente" severity="warning" />
                            <Button icon="fa-solid fa-x" @click="onRemoveTemplatingFile(file, removeFileCallback, index)" outlined rounded severity="danger" />
                        </div>
                    </div>
                </div>
                <div v-if="uploadedFiles.length > 0">
                    <h5>Completo</h5>
                    <div class="flex flex-wrap p-0 sm:p-5 gap-5">
                        <div v-for="(file, index) of uploadedFiles" :key="file.name + file.type + file.size" class="card m-0 px-6 flex flex-column border-1 surface-border align-items-center gap-3">
                            <div>
                                <img role="presentation" :alt="file.name" :src="file.objectURL" width="100" height="50" class="shadow-2" />
                            </div>
                            <span class="font-semibold">{{ file.name }}</span>
                            <div>{{ formatSize(file.size) }}</div>
                            <Badge value="Completo" class="mt-3" severity="success" />
                            <Button
                                icon="fa-solid fa-x"
                                @click="
                                    removeUploadedFileCallback(index);
                                    onClearTemplatingUpload(file, removeFileCallback, index);
                                "
                                outlined
                                rounded
                                severity="danger"
                            />
                        </div>
                    </div>
                </div>
            </template>
            <template #empty>
                <div class="flex align-items-center justify-content-center flex-column">
                    <i class="fa-solid fa-cloud border-2 border-circle p-5 text-8xl text-400 border-400" />
                    <p class="mt-4 mb-0">Arraste e solte arquivos para aqui para fazer o upload.</p>
                </div>
            </template>
        </FileUpload>
        <div class="card bg-green-200 mt-3">
            <p>{{ dialogRef.data.footerMsg }}</p>
        </div>
        <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
            <p>itemData: {{ itemData }}</p>
            <p>filesData: {{ filesData }}</p>
        </div>
    </div>
</template>
