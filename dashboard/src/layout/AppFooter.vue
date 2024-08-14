<script setup>
import { useLayout } from '@/layout/composables/layout';
import { computed, ref, onBeforeMount, onMounted, onUnmounted } from 'vue';
import { softwareHouse } from '@/global';

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});

onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

// Computed property para calcular o tempo restante
const timeRemaining = ref(0);

const updateTimeRemaining = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const timePassed = currentTime - store.timeLogged;
    timeRemaining.value = Math.max(store.timeToLogOut - timePassed, 0); // Garante que não seja negativo  
    // aPRESENTAR timeRemaining.value EM MM:SS
    const days = Math.floor(timeRemaining.value / 86400);
    const hours = Math.floor((timeRemaining.value % 86400) / 3600);
    const minutes = Math.floor((timeRemaining.value % 3600) / 60);
    const seconds = timeRemaining.value % 60;
    return `${days ? days + ' dias, ' : ''}${hours ? hours + ':' : ''}${String(minutes)}:${String(seconds).padStart(2, '0')}`;
};

onMounted(() => {
    updateTimeRemaining(); // Atualiza imediatamente
    const interval = setInterval(updateTimeRemaining, 1000); // Atualiza a cada segundo  
    onUnmounted(() => {
        clearInterval(interval); // Limpa o intervalo quando o componente for destruído
    });
});

const logoUrl = computed(() => {
    return `/assets/images/logo-app.png`;
});
</script>

<template>
    <div class="layout-footer">
        <img :src="logoUrl" alt="Logo" height="20" class="mr-2" />
        by
        <span class="font-medium ml-2">{{ softwareHouse }}</span>
        <span>&nbsp;- Tempo restante de sessão: {{ updateTimeRemaining() }} segundos <i class="fa-solid fa-hourglass-half"></i></span>
    </div>
</template>

<style lang="scss" scoped></style>
