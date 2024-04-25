<script setup>
import ComissoesResume from './ComissoesResume.vue';
</script>

<template>
    <Card>
        <template #title>Simple Card</template>
        <template #content>
            <div class="grid">
                <div class="col-12 md:col-8">
                    <ComissoesResume />
                </div>
                <div class="col-12 md:col-4">
                    <p>Painel de botões</p>
                </div>
            </div>
        </template>
    </Card>
</template>
