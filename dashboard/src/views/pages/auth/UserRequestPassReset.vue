<script setup>
import axios from '@/axios-interceptor';
import { baseApiUrl } from '@/env';
import { defaultError, defaultSuccess, defaultWarn } from '@/toast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const email = ref('');
const click = ref(false);
const urlRequestEmail = ref(`${baseApiUrl}/request-password-reset/`);

const passRequest = async () => {
    if (email.value) {
        await axios
            .post(urlRequestEmail.value, { email: email.value })
            .then(async (body) => {
                if (body.data.id) {
                    router.push({ path: 'password-reset', query: { q: body.data.id } });
                    defaultSuccess(body.data.msg);
                } else defaultWarn('Ops! Parece que houve um erro ao executar sua solicitação. Por favor tente de novo');
            })
            .catch((error) => {
                defaultError(error);
            });
    }
};
</script>

<template>
    <div class="align-items-center justify-content-center">
        <Message v-for="item in wait" :key="item" severity="info">{{ item }}</Message>
        <div class="flex flex-column">
            <div
                style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full surface-card py-5 px-5" style="border-radius: 53px">
                    <div class="text-center mb-2">
                        <img src="/icon.png" alt="Vivazul logo" class="mb-4 w-20 shrink-0 mx-auto"
                            style="width: 10rem" />
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bem vindo ao
                            Vivazul!</div>
                        <span class="text-muted-color font-medium">Preencha abaixo para recuperar sua senha</span>
                    </div>

                    <div>
                        <label for="email"
                            class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                        <InputText id="email" type="text" placeholder="Seu e-mail" class="w-full md:w-[30rem] mb-2"
                            v-model="email" />

                        <div class="flex items-center justify-between mt-2 mb-2 gap-8">
                            <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                                @click="router.push({ name: 'signup' })">É novo por aqui 😀?</span>
                            <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                                @click="router.push({ name: 'signin' })">Acessar</span>
                        </div>
                        <Button label="Recuperar" icon="fa-solid fa-arrow-right-to-bracket" :loading="click"
                            :disabled="!email" @click="passRequest" class="w-full p-3 text-xl"></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
