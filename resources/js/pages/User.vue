<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import PlaceholderPattern from '../components/PlaceholderPattern.vue';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Leaderboard',
		href: '/leaderboard',
	},
];

defineProps({
	id: Number

})

function getParams(){
	const urlString = window.location.search; // gets the query string part of the URL
    const urlParams = new URLSearchParams(urlString);

    const myParam = urlParams.get('paramName'); // gets the value of the 'paramName' parameter
    console.log(myParam);

    // To get all values of a parameter if it appears multiple times:
    const allValues = urlParams.getAll('paramName');
    console.log(allValues);
	return allValues;
}

let kpl = getParams();
console.log(kpl);


</script>

<template>
	<Head title="Leaderboard" />


	<AppLayout :breadcrumbs="breadcrumbs">
		<div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
			<div class="grid auto-rows-min gap-4 md:grid-cols-3">
				{{ id }}
				<div class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
					<PlaceholderPattern />
				</div>
				<div class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
					<PlaceholderPattern />
				</div>
			</div>
			<div class="relative min-h-[100vh] flex-1 rounded-xl border border-sidebar-border/70 dark:border-sidebar-border md:min-h-min">
				<PlaceholderPattern />
			</div>
		</div>
	</AppLayout>
</template>
