<script setup>
import { useLayout } from '@/layout/composables/layout';
import { computed, ref, onBeforeMount, onMounted, onUnmounted } from 'vue';
import { softwareHouse } from '@/global';

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});

// Recupera o perfil do usuário na montagem
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

// Computed property para o tempo restante de sessão
const timeRemainingFormatted = ref("00:00");

// Função para calcular o tempo restante com base na última atividade
const updateTimeRemaining = () => {
    const lastActivity = parseInt(localStorage.getItem('lastActivity'), 10) || Math.floor(Date.now() / 1000);
    const currentTime = Math.floor(Date.now() / 1000);
    const timePassed = currentTime - lastActivity;

    // Calcula o tempo restante com base no timeToLogOut
    const timeRemaining = Math.max(store.timeToLogOut - timePassed, 0); // Garante que o tempo não seja negativo

    // Formata o tempo restante em MM:SS
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timeRemainingFormatted.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Atualiza o tempo restante periodicamente (a cada segundo)
onMounted(() => {
    updateTimeRemaining(); // Atualiza imediatamente ao montar
    const interval = setInterval(updateTimeRemaining, 1000); // Atualiza a cada segundo
    
    // Limpa o intervalo quando o componente for desmontado
    onUnmounted(() => {
        clearInterval(interval);
    });
});

// Computed property para o logo
const logoUrl = computed(() => {
    return `/assets/images/logo-app.png`;
});
</script>

<template>
    <div class="layout-footer">
        <img :src="logoUrl" alt="Logo" height="20" class="mr-2" />
        by
        <span class="font-medium ml-2">{{ softwareHouse }}</span>
        <span>&nbsp;- Tempo restante de sessão: {{ timeRemainingFormatted }} <i class="fa-solid fa-hourglass-half"></i></span>
    </div>
</template>

<style lang="scss" scoped></style>
