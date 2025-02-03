<template>
    <iframe :src="src" :width="width" :height="height" frameborder="0"></iframe>
</template>

<script setup>
defineProps({
    src: {
        type: String,
        required: true,
    },
    width: {
        type: String,
        default: '100%',
    },
    height: {
        type: String,
        default: '100%',
    },
});
</script>

<style scoped>
iframe {
    display: block;
    width: 100%;
    /* Garante que o iframe seja responsivo */
    height: 100%;
    /* Adapta o iframe à altura passada */
    border: none;
    /* Remove bordas para um visual limpo */
}
</style>