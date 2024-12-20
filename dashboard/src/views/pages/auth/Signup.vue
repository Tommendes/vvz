<script setup>
import axios from '@/axios-interceptor';
import { baseApiUrl } from '@/env';
import { defaultSuccess, defaultWarn } from '@/toast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const itemData = ref({
    fantasia: undefined,
    name: undefined,
    email: undefined,
    password: undefined,
    confirmPassword: undefined,
    telefone: undefined,
    admin: 0,
    gestor: 1,
    multiCliente: 0,
    empresas: 4,
    cadastros: 4,
    pipeline: 4,
    pipeline_params: 4,
    pv: 4,
    comercial: 4,
    fiscal: 4,
    financeiro: 4,
    comissoes: 4,
    prospeccoes: 4,
    at: 4,
    protocolo: 4,
    uploads: 4,
    whats_groups: 4,
    whats_msgs: 4,
    agente_v: 0,
    agente_arq: 0,
    agente_at: 0,
    time_to_pas_expires: 999999
});
const url = ref(`${baseApiUrl}/signup`);

// Validar telefone
const validatePhone = () => {
    if (itemData.value.telefone && itemData.value.telefone.length > 0 && ![10, 11].includes(itemData.value.telefone.replace(/([^\d])+/gim, '').length)) {
        return false;
    }
    return true;
};

const signup = async () => {
    // Se preencheu todos os dados obrigatórios
    if (!!itemData.value.name && !!itemData.value.email && !!itemData.value.telefone && !!itemData.value.password && !!itemData.value.confirmPassword) {
        const obj = { ...itemData.value };
        if (obj.telefone) obj.telefone = obj.telefone.replace(/([^\d])+/gim, '');
        await axios
            .post(url.value, itemData.value)
            .then((body) => {
                const user = body.data;
                if (user.data.id) {
                    defaultSuccess(user.msg, true);
                    router.push({ path: `/user-unlock/${user.data.id}?` });
                }
            })
            .catch((error) => {
                console.log(error);

                defaultWarn(error.response.data.msg, true);
            });
    } else {
        defaultWarn('Preencha todos os campos obrigatórios!', true);
    }
};
</script>

<template>
    <div class="align-items-center justify-content-center">
        <div class="flex flex-column">
            <div
                style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full surface-card py-5 px-5" style="border-radius: 53px">
                    <div class="text-center mb-2">
                        <img src="/icon.png" alt="Vivazul logo" class="mb-4 w-20 shrink-0 mx-auto"
                            style="width: 10rem" />
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bem vindo ao
                            Vivazul!</div>
                        <span class="text-muted-color font-medium">Para iniciar, informe os dados abaixo</span>
                    </div>

                    <label for="name"
                        class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Nome</label>
                    <InputText id="name" type="text" placeholder="Seu nome" class="w-full md:w-[30rem] mb-4"
                        v-model="itemData.name" />

                    <label for="fantasia"
                        class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Sua marca</label>
                    <InputText id="fantasia" v-keyfilter="{ pattern: /^[a-zA-Z0-9 ]{1,20}$/, validateOnly: true }"
                        placeholder="Sua marca até 20 caracteres" class="w-full md:w-[30rem] mb-4"
                        v-model="itemData.fantasia" />

                    <label for="email"
                        class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                    <InputText id="email" type="text" placeholder="Seu e-mail"
                        class="w-full md:w-[30rem] mb-4 lowercase" v-model="itemData.email" />

                    <label for="password"
                        class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Senha</label>
                    <Password id="password" v-model="itemData.password" placeholder="Sua senha" :toggleMask="true"
                        :inputClass="'w-full'" class="w-full mb-4" fluid :feedback="true"></Password>

                    <label for="confirmPassword"
                        class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Confirme</label>
                    <Password id="confirmPassword" v-model="itemData.confirmPassword" placeholder="Confirme sua senha"
                        :toggleMask="true" :inputClass="'w-full'" class="w-full mb-4" fluid :feedback="true"></Password>

                    <label for="telefone"
                        class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">WhatsApp</label>
                    <InputText id="telefone" v-maska data-maska="['(##) ####-####', '(##) #####-####']"
                        placeholder="Seu número de WhatsApp" class="w-full md:w-[30rem] mb-4"
                        v-model="itemData.telefone" />

                    <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                        <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                            @click="router.push({ name: 'signin' })">Acessar</span>
                        <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                            @click="router.push({ name: 'request-password-reset' })">Esqueceu sua senha?</span>
                    </div>
                    <Button label="Começar a usar o sistema 😉" class="w-full"
                        :disabled="!(itemData.name && itemData.email && itemData.password && itemData.confirmPassword && validatePhone())"
                        @click="signup"></Button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
