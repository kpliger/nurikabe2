<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
// import bootstrap?
import PlaceholderPattern from '../../components/PlaceholderPattern.vue';
import Button from '@/components/ui/button/Button.vue';
import "./tictactoe.css"

// import 'bootstrap/dist/js/bootstrap.js';
// import 'bootstrap/dist/css/bootstrap.css';
// import 'bootstrap-vue/dist/bootstrap-vue.min.js';
// import 'bootstrap-vue/dist/bootstrap-vue.min.css';


// const script = document.createElement('script');
//   script.type = 'module';
//   script.src = 'https://code.jquery.com/jquery-3.6.3.min.js';
//   script.integrity = 'sha256-pvPw+upLPUjgMXY0G+8O0xUf+/Im1MZjXxxgOcBQBXU=';
//   script.crossOrigin = 'anonymous'; // JS property, not HTML attribute
//   document.head.appendChild(script);

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Tictactoe',
		href: '/tictactoe',
	},
];


// import * as kpl from  "./solver"
import { computed, onMounted, ref, watch } from 'vue';

const player = ref('X');
const squares = ref([
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
])
const winner = computed(() => calculateWinner(squares.value.flat()));
const calculateWinner = (squares: any) => {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ]
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i]
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a]
        }

    }
    return null
}
const move = (x: any, y: any) => {
    if (winner.value) return
	if (squares.value[x][y]) return;
    squares.value[x][y] = player.value
    player.value = player.value === 'O' ? 'X' : 'O'
}
const reset = () => {
    player.value = 'X'
    squares.value = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ]
}

const history = ref([])
watch(winner, (current, previous) => {
	// console.log([current, previous]);
    if (current && !previous) {
        history.value.push(current)
        localStorage.setItem('history', JSON.stringify(history.value))
    }
})

onMounted(() => {
    history.value = JSON.parse(localStorage.getItem('history') ?? [])
})
function clearhistory() {
    history.value = []
    localStorage.setItem('history', JSON.stringify(history.value))
}


</script>

<template>
	<Head title="Tictactoe" />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div id='tictactoe' class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
			<div class='container'>
				<h2 v-if="winner">Winner {{ winner }}</h2>
				<h2 v-else >Player Move: {{ player }}</h2>
			</div>
			<Button class='m-3' @click='reset()'>
				Reset
			</Button>
			<div>
				<div id='wrap_board' >
					<div v-for='(_,x) in 3' :key='x' class=''>
						<button v-for='(_, y) in 3' :key='y' class='square' @click='move(x,y)'>
							{{ squares[x][y] }}
						</button>
					</div>
				</div>
			</div>
			<h2>History</h2>
			<div v-for='(game, idx) in history' :key='idx'>
				Game:{{ game }} won
			</div>
			<Button @click='clearhistory()' class='clearhistory'>clear history</Button>
            <div class='btnkpl' style='width:2em; height:1em; background-color:blue;'></div>

		</div>
	</AppLayout>
</template>