<script setup lang="ts">
import axios from 'axios';
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head, router, Link } from '@inertiajs/vue3';
// import bootstrap?
import PlaceholderPattern from '../../components/PlaceholderPattern.vue';
import Button from '@/components/ui/button/Button.vue';
// import "./calendar.css"
import { defineAsyncComponent, computed, onMounted, onUnmounted, ref, watch, toRaw } from 'vue';

import "https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js"



const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Calendar',
		href: '/calendar',
	},
];

const props = defineProps({
	user:Object,
	year: String,
	month: String,
	history: Object,
	prevMonth: String,
	nextMonth: String,
})
const maxYear = ref<number>((new Date).getFullYear());
const curYear = ref<number>(parseInt(props.year??"2005"));
const curMonth = ref<number>(parseInt(props.month??"0"));
const inputYear = ref<number>(parseInt(props.year??"2005"));
const inputMonth = ref<number>(parseInt(props.month??"0"));


const MONTHS = {
	1:"January",
	2:"February",
	3:"March",
	4:"April",
	5:"May",
	6:"June",
	7:"July",
	8:"August",
	9:"September",
	10:"October",
	11:"Novermber",
	12:"December",
}
const DIFFICULTIES = {
	'small':"Small",
	'medium':"Medium",
	'large':"Large",
	'mixed':"Mixed",
}
const date = new Date();
const lastDate = new Date(curYear.value, curMonth.value, 0).getDate();
const firstDay = new Date(curYear.value, curMonth.value-1).getDay();

onMounted(async () => {

});
onUnmounted(()=>{

});

function gotoNewPage(){
	try{
		const newUrl = route('Calendar', [
			inputYear.value,
			inputMonth.value,
		]);
		router.visit(newUrl);
	}catch(ex){
		console.error(ex)
		throw ex
	}
}
function isValidDate(year:number, month:number, day:number):boolean{
	const TODAY = new Date();
	const minDate = new Date(2005,0,0);
	const curDate = new Date(year,month-1,day);
	return minDate<curDate && curDate<TODAY;
}
function isBoardComplete(difficulty:string, year:number, month:number, day:number):boolean{
	const curDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	return props.history.some(v=>v.difficulty == difficulty && v.game_date == curDate);
}

</script>
<style lang='css' scoped>
	@import url('bootstrap/dist/css/bootstrap.min.css');
	@import url('https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css');
	@import url('./calendar.css');

</style>

<template>

	<Head title="Calendar" />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div id='tictactoe' class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
			<form class='container' @submit.prevent="gotoNewPage()">
				<select  v-model="inputMonth">
					<option v-for="(month,key) in MONTHS" :value=key>{{ month }}</option>
				</select>
				<select v-model="inputYear">
					<option v-for='(_,x) in maxYear-2005+1' :value="maxYear-x">{{ maxYear-x }}</option>
				</select>
				<button type="submit" class='btn btn-primary m-3' @click='gotoNewPage()'>
					GO
				</button>
			</form>
			<div class="container text-center inline-block">
				<div style="margin-bottom:1em; ">
					<h2 class="inline-flex">
						<Link class="btn btn-primary" :href="route('Calendar', [props.prevMonth.year, props.prevMonth.month])"><<</Link>
						<div style="display:inline-block; width: 8em;">
							{{ MONTHS[curMonth]}} {{ curYear }}
						</div>
						<Link class="btn btn-primary" :href="route('Calendar', [props.nextMonth.year, props.nextMonth.month])">>></Link>
					</h2>
				</div>
				<div id="wrap_calendar">
					<table id="tbl_calendar">
						<thead>
							<tr>
								<th>Su</th>
								<th>Mo</th>
								<th>Tu</th>
								<th>We</th>
								<th>Th</th>
								<th>Fr</th>
								<th>Sa</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(_,x) in Math.ceil((lastDate+firstDay)/7)">
								<td v-for="(_,y) in 7"
									:class="[!isValidDate( curYear, curMonth, (x*7)+(y+1)-firstDay)?'disabled':'']"
								>
									<template v-if="(x*7)+(y+1)-firstDay>=1 && (x*7)+(y+1)-firstDay<=lastDate">
										<div style="font-size: 1.2em;">{{ (x*7)+(y+1)-firstDay }}</div>

										<Link v-for="(difficulty, key) in DIFFICULTIES"
											:href="route('Board', [key, curYear, curMonth, (x*7)+(y+1)-firstDay])"
											class='page-link '
										>
												<div class="difficulty-label">{{ difficulty }}</div>
												<div v-if="isBoardComplete(key, curYear, curMonth, (x*7)+(y+1)-firstDay)">✓</div>
											</Link>
									</template>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>


		</div >
	</AppLayout>
</template>