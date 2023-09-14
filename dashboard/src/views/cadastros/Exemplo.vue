<script setup>
import { ref, onMounted } from 'vue';
import { CarService } from '@/service/CarService';

onMounted(() => {
    cars.value = Array.from({ length: 100000 }).map((_, i) => CarService.generateCar(i + 1));
});

const cars = ref();
const virtualCars = ref(Array.from({ length: 100000 }));
const lazyLoading = ref(false);
const loadLazyTimeout = ref();

const loadCarsLazy = (event) => {
    !lazyLoading.value && (lazyLoading.value = true);

    if (loadLazyTimeout.value) {
        clearTimeout(loadLazyTimeout.value);
    }

    //simulate remote connection with a timeout
    loadLazyTimeout.value = setTimeout(() => {
        let _virtualCars = [...virtualCars.value];
        let { first, last } = event;

        //load data of required page
        const loadedCars = cars.value.slice(first, last);

        //populate page of virtual cars
        Array.prototype.splice.apply(_virtualCars, [...[first, last - first], ...loadedCars]);

        virtualCars.value = _virtualCars;
        lazyLoading.value = false;
    }, Math.random() * 1000 + 250);
};
</script>

<template>
    <div class="card">
        <DataTable
            :value="virtualCars"
            scrollable
            scrollHeight="400px"
            tableStyle="min-width: 50rem"
            :virtualScrollerOptions="{ lazy: true, onLazyLoad: loadCarsLazy, itemSize: 46, delay: 200, showLoader: true, loading: lazyLoading, numToleratedItems: 10 }"
        >
            <Column field="id" header="Id" style="width: 20%">
                <template #loading>
                    <div class="flex align-items-center" :style="{ height: '17px', 'flex-grow': '1', overflow: 'hidden' }">
                        <Skeleton width="60%" height="1rem" />
                    </div>
                </template>
            </Column>
            <Column field="vin" header="Vin" style="width: 20%">
                <template #loading>
                    <div class="flex align-items-center" :style="{ height: '17px', 'flex-grow': '1', overflow: 'hidden' }">
                        <Skeleton width="40%" height="1rem" />
                    </div>
                </template>
            </Column>
            <Column field="year" header="Year" style="width: 20%">
                <template #loading>
                    <div class="flex align-items-center" :style="{ height: '17px', 'flex-grow': '1', overflow: 'hidden' }">
                        <Skeleton width="30%" height="1rem" />
                    </div>
                </template>
            </Column>
            <Column field="brand" header="Brand" style="width: 20%">
                <template #loading>
                    <div class="flex align-items-center" :style="{ height: '17px', 'flex-grow': '1', overflow: 'hidden' }">
                        <Skeleton width="40%" height="1rem" />
                    </div>
                </template>
            </Column>
            <Column field="color" header="Color" style="width: 20%">
                <template #loading>
                    <div class="flex align-items-center" :style="{ height: '17px', 'flex-grow': '1', overflow: 'hidden' }">
                        <Skeleton width="60%" height="1rem" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
