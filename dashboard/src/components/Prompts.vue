<script setup>
import { inject, onBeforeMount, ref } from 'vue';

const dialogRef = inject('dialogRef');
const itemData = ref({});
onBeforeMount(() => {
    itemData.value = dialogRef.value.data.message;
});
const closeDialog = () => {
    dialogRef.value.close();
};
</script>

<template>
    <!-- <h3 class="text-center mb-5">{{ itemData.label }}</h3> -->
    <p class="text-xl text-center" v-html="itemData.message" />
    <div class="flex align-items-center gap-2 mt-4">
        <Button label="Ok" @click="closeDialog()"></Button>
    </div>
</template>
