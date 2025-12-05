<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import PlaceholderPattern from '../components/PlaceholderPattern.vue';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Dashboard ',
		href: '/dashboard ',
	},
	// {
	// 	title: 'Dashboard ',
	// 	href: '/dashboard ',
	// },
];
</script>
<style lang='css' scoped>
	#overview{
		ul{
			padding-left:1em;
			li::marker{
				content:"•  ";
			}
		}
	}
</style>

<template>
	<Head title="Dashboard " />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
			<div v-if="false" class="grid auto-rows-min gap-4 md:grid-cols-3" >
				<div class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
					<PlaceholderPattern />
				</div>
				<div class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
					<PlaceholderPattern />
				</div>
				<div class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
					<PlaceholderPattern />
				</div>
			</div>
			<div class="relative min-h-[100vh] flex-1 rounded-xl border border-sidebar-border/70 dark:border-sidebar-border md:min-h-min">
				<div id='overview' style="padding:.5em;">
					<p>The project is about to implement helper function to solve the nurikabe</p>
					<br>
					<p>Features</p>
					<ul>
						<li>Vue</li>
						<li>Database to store user and history</li>
						<li>Dark mode theme. Tested on Firefox, Chrome and Edge</li>
						<li>Board is taken from an API from https://puzzlemadness.co.uk</li>
					</ul>
				</div>
			</div>
		</div>
	</AppLayout>
</template>
