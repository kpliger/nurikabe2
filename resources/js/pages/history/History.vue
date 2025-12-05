<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head, router, Link, useForm} from '@inertiajs/vue3';

// import bootstrap?
import PlaceholderPattern from '../../components/PlaceholderPattern.vue';
import Button from '@/components/ui/button/Button.vue';
import { computed, onMounted, ref, toRaw, watch } from 'vue';
// import "./tictactoe.css"

import Input from '@/components/ui/input/Input.vue';

// const script = document.createElement('script');
//   script.type = 'module';
//   script.src = 'https://code.jquery.com/jquery-3.6.3.min.js';
//   script.integrity = 'sha256-pvPw+upLPUjgMXY0G+8O0xUf+/Im1MZjXxxgOcBQBXU=';
//   script.crossOrigin = 'anonymous'; // JS property, not HTML attribute
//   document.head.appendChild(script);

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'History',
		href: '/history',
	},
];

const props = defineProps({
	history:Object,
	search:String,
	sort:String,
	direction: String
})

// const histories = toRaw(props.history);
const histories = props.history;
// console.log(toRaw(histories));

const filter = useForm({
	search:props.search
})

function handleSort(field:string){
	const newDirection = props.sort === field && props.direction === 'asc'?'desc':'asc';
	router.get('history', {
		search: props.search,
		sort: field,
		direction: newDirection
	},{
		// preserveState: true,
		// replace: true
	})
}

function renderSortArror(field){
	if(props.sort !==field) return "<span style='font-size:.7em; display:inline-block; line-height:.8em;'>▲<br>▼<span>";
	return props.direction === 'asc'?"▲":"▼";
}
function formatGameTime(time){
	let second =  String(time%60).padStart(2,'0');
	let minute =  String(parseInt(time/60)).padStart(2,'0');
	return minute+":"+second;
}

</script>
<style lang='css' scoped>


</style>

<template>
	<Head title="History" />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div id='tictactoe' class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
			Record of games that the user completed.

			<form  @submit.prevent="filter.get('/history')" class="flex" style="max-width: 300px;margin-left:auto;">
				<Input type="text" name="search" id="" placeholder="Search date" v-model="filter.search"/>
				&nbsp;
				<Button type="submit" class="btn btn-success" :disabled="filter.processing">GO</Button>
			</form>
			<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
				<table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
					<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
						<tr>
							<th scope="col" class="p-4">
								<div class="flex items-center">
									<input id="checkbox-all-search" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
									<label for="checkbox-all-search" class="sr-only">checkbox</label>
								</div>
							</th>
							<th scope="col" class="px-6 py-3 cursor-pointer" @click="handleSort('game_date')">
								Date
								<span v-html="renderSortArror('game_date')" ></span>
							</th>
							<th scope="col" class="px-6 py-3 cursor-pointer" @click="handleSort('difficulty')">
								Difficulty
								<span v-html="renderSortArror('difficulty')" ></span>
							</th>
							<th scope="col" class="px-6 py-3">
								Time (mm:ss)
							</th>
							<th scope="col" class="px-6 py-3">
								Action
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for='history in histories.data' class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
							<td class="w-4 p-4">
								<div class="flex items-center">
									<input id="checkbox-table-search-1" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
									<label for="checkbox-table-search-1" class="sr-only">checkbox</label>
								</div>
							</td>
							<th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
								{{ history.game_date}}
							</th>
							<td class="px-6 py-4">
								{{ history.difficulty}}
							</td>
							<td class="px-6 py-4">
								{{ formatGameTime(history.win_second) }}
							</td>
							<td class="px-6 py-4">
								<Link :href="route('Board', [history.difficulty,...history.game_date.split('-')])" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">Replay</Link>
							</td>
						</tr>

					</tbody>
				</table>
					<!-- {{ histories->links()}} -->


				<nav class="flex items-center flex-column flex-wrap md:flex-row justify-between p-1 pt-4" aria-label="Table navigation">
					<span class="text-sm font-normal text-gray-500 dark:text-gray-400 mb-4 md:mb-0 block w-full md:inline md:w-auto">
						Showing <span class="font-semibold text-gray-900 dark:text-white">{{ histories.from }}-{{ histories.to }}</span> of
						<span class="font-semibold text-gray-900 dark:text-white">{{ histories.total }}</span>
					</span>
					<ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
						<!-- <li>
							<a :href="histories.first_page_url" class="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
							> << </a>
						</li> -->
						<template v-for='link in histories.links'>
							<template v-if='link.url==null && link.label!="..."'></template>
							<li v-else-if='link.active' class='paginator-link'>
								<Link :href="link.url" aria-current="page" class="flex items-center justify-center px-3 h-8 text-blue-600 border border-gray-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
								><span v-html='link.label'></span></Link>
							</li>
							<li v-else class='paginator-link'>
								<Link :href="link.url" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
								><span v-html='link.label'></span></Link>
							</li>
						</template>
						<!-- <li>
							<a :href="histories.last_page_url" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
							> >> </a>
						</li> -->
					</ul>
				</nav>
			</div>

		</div>
	</AppLayout>
</template>