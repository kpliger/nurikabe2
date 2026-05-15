<script setup lang="ts">

/**
 * TODO:
 * 	- leave page prompt when history back/forward(popstate) event
 * 		- router.on(before) dont work
 * 		- handleBeforeUnload works but half of the story
 * 		- atm, this don't work
 *
 */


import axios from 'axios';
import AppLayout from '@/layouts/AppLayout.vue';
import { SharedData, type BreadcrumbItem, type User } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/vue3';
import PlaceholderPattern from '../../components/PlaceholderPattern.vue';
import {onMounted, ref, watch, toRaw, useTemplateRef, useId, onUnmounted, onBeforeUnmount, compileToFunction} from 'vue';

import "https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"

// https://kamranahmed.info/toast
import "https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js"

import Loading, {useLoading} from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css';

//VueDatePicker: https://vue3datepicker.com/
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import 'bootstrap';
import TooltipBase from '@/components/TooltipBase.vue';
import { ToastRoot } from 'reka-ui';
import { set } from '@vueuse/core';
import * as Cheat from './cheatOps';

/**
 * Note
 * - auto validate when total hint == flagged
 * 		or board - hint == blank
 *
 * - reset is working the way I want it. I want to ogboard to store the prestine board but some ogboard is updating too when I change board
 *
 */
const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Board',
		href: '/board',
	},
];
const $loading = useLoading({});
const overlayContinue = ref(false);
const isDark = ref(true);

let scopeId:string = "";
let zoomed = false;

const props = defineProps({
	user:Object,
	size: String,
	year: String,
	month: String,
	day: String,
})



// const curUser = toRaw(prompt.user);
const page = usePage<SharedData>();
const user = page.props.auth.user as User;
// const curUser = toRaw(user);

interface CellClass {
	wall: boolean,
	visited:boolean,
	wall_highlighted: boolean,
	"wall_highlighted-left": boolean,
	"wall_highlighted-top": boolean,
	"wall_highlighted-right": boolean,
	"wall_highlighted-bottom": boolean,
	[key: `wall_highlighted-${string}`]: boolean,
	island_highlighted: boolean,
	root_highlight:boolean,
	corner_checked:boolean,
	recentMove:boolean,
	recentUndo:boolean,
	invalid:boolean,
	root_hints: number[][],
	hint: boolean,
	island_size: number,
	possible_roots: number[][],
	wall_id:number,
	islet_id:number,
	// [key: string]: any, // fallback : workaround for the wall highlights
}

const directions = {
	"left":[0,-1],
	"top":[-1,0],
	"right":[0,1],
	"bottom":[1,0],
}
const inverseDirections:object = {
	"left":'right',
	"top":'bottom',
	"right": 'left',
	"bottom":'top',
}
const CORNERS = {
	"tl":[-1,-1],
	"tr":[-1, 1],
	"bl":[ 1,-1],
	"br":[ 1, 1],
}
let isHighlighting = false;
let totalClue:number = 0;
let boardSize:number = 0;
const hints = ref<any[]>([]);
let ogboard:string[][] = [
	["  ","  ","  ","  ","  ","  "],
	["  ","  "," 5","  ","  ","  "],
	["  "," 1","  "," 2","  ","  "],
	["  ","  ","  ","  ","  "," 4"],
	[" 5","  ","  ","  ","  ","  "],
	["  ","  "," 2","  "," 1","  "],
	["  ","  ","  ","  ","  "," 3"],
	["  ","  ","  ","  ","  ","  "],
];
const move = ref<any[]>([]);
const move_r = ref<any[]>([]);

const difficulty = ref<string>('');
const date = ref();

const newDifficulty = ref();
const dateFilter = ref();

const gameTimer = ref("00:00");
const timerval1 = ref(0);
let timerRunning = false;
let interval1:number;
let validateDelay:number = 0;
let debouncer_updateRootReable:number = 0;
let wallNextId = 0;
let isletNextId= 0;


const hasUnsavedChanges = ref(false); // Track changes, e.g., in a form

const board = ref([
	["  ","  ","  ","  ","  ","  "],
	["  ","  "," 5","  ","  ","  "],
	["  "," 1","  "," 2","  ","  "],
	["  ","  ","  ","  ","  "," 4"],
	[" 5","  ","  ","  ","  ","  "],
	["  ","  "," 2","  "," 1","  "],
	["  ","  ","  ","  ","  "," 3"],
	["  ","  ","  ","  ","  ","  "],
])

const boardClass = ref<CellClass[][]>([]);
const boardZoom = ref(30);
const maxZoom = ref(40);
const minZoom = ref(6);
const newPageLoader = ref();
const rulerH_fixed = ref({
	rulerH_fixed:false
})


const minDate = new Date("2005/01/01").getTime();
const maxDate = Date.now();
const difficulties = ref(['small', 'medium', 'large', 'mixed']);

const pb = ref('');
const completedSizes = ref<string[]>([]);
const preventLeaveForm = useForm({preventLeave: true});

$(document).on('show.bs.modal', '.modal', async (event) =>{
	await sleep(1)
	$('.modal-backdrop').attr(`data-${scopeId}`,"")
})
window.onfocus = focusPage;
window.onblur = unfocusPage;

$(document).on('change',".dropdownAction", event => {
	const element = event.target;
	$(element).children(":first-child").prop('selected',true);
})

// window.addEventListener("beforeunload", (e) => {
// 	// conso
//     e.preventDefault()
//     // chrome requires returnValue to be set
//     const message = "You have unsaved changes. Are you sure you wish to leave?"
//     e.returnValue = message`
//     return message
// })

onMounted( async()=>{
	$(document).on('scroll', "main", (event)=> {
		event.stopPropagation();
		console.log(event.target)
			// if ($(this).scrollTop() > 100) {
			//     console.log("User scrolled down more than 100px");
			// }
	});

	Cheat.setProps({
		board:board,
		boardClass:boardClass,
		move:move,
		move_r:move_r,
		hints:hints
	})

	// window.addEventListener('beforeunload', handleBeforeUnload);
	// window.addEventListener('popstate', handlePopstateEvent);
	// document.addEventListener('inertia:before', handleInertiaBefore);
	observeDarkMode();
	addTouchListeners()


	$('main').css('overflow', 'auto');
	$('main').css('height', 'calc(100vh - 1em)');
	// $('main').css('position', 'relative');
	$('#btnRedo').focus();

	scopeId = Object.keys($("#nurikabe").data()).find(elem => elem.includes('v-'));
	$('.modal-backdrop').remove()


	difficulty.value = 'small';
	if(difficulties.value.includes(props.size)){
		difficulty.value = props.size;
	}else if(props.size == 'custom'){
		difficulty.value = props.size;
	}
	const timezoneoffset = getTimezoneOffset();
	let initMonth = props.month||'';
	let initDay  = props.day||'';
	let initDate = '';

	if(initMonth.length<2) initMonth = '0'+initMonth;
	if(initDay.length<2) initDay = '0'+initDay;
	initDate = `${props.year||''}-${initMonth}-${initDay}T01:00:00${timezoneoffset}`
	date.value = new Date(initDate);
	if(date.value == 'Invalid Date'){
		if(props.day!==null){
			router.get(`/board/${difficulty.value}`)
			return;
		}else{
			date.value = new Date();
		}

	}else if(date.value.getTime()<minDate || date.value.getTime()>maxDate){
		router.get(`/board/${difficulty.value}`)
		return;
	}

	let slashDate = date.value.getFullYear()+"/"+
		(date.value.getMonth()+1)+"/"+
		date.value.getDate();
	dateFilter.value = slashDate;
	newDifficulty.value = difficulty.value;


	if(localStorage.getItem('board_det') == difficulty.value+"/"+dateFilter.value
		&& localStorage.getItem('board_continue') != null
		&& localStorage.getItem('timer_continue') != "0"
	){
		continueBoard();
		if(difficulty.value!='custom'){
			getPersonalBest();
		}
	}else if(difficulty.value=='custom' && localStorage.getItem('custom_board') != null){
		constructCustomBoard();
		$("#flag_pb").hide();
	}else{
		findPuzzleByDate(slashDate);
		getPersonalBest();
	}
})
// onBeforeUnmount(()=>{
	// console.log("before unmount");
	// let tof = confirm("Are you sure you want to leave this page?");

	// // chrome requires returnValue to be set
	// const message = "You have unsaved changes. Are you sure you wish to leave?"
	// event.returnValue = message
	// return message
// })
// onBeforeUnmount((event:any)=>{
// 	console.log("before unmount");
// 	console.log(event)
// })
onUnmounted(()=>{
	// let tof = confirm("Are you sure you want to leave this page?");
	// if(!tof){
	// 	event?.preventDefault();
	// 	return;
	// }

	// window.removeEventListener('beforeunload', handleBeforeUnload);
	// window.removeEventListener('popstate', 	 handlePopstateEvent);
	if(newPageLoader.value === undefined) return
	newPageLoader.value.hide()

})

watch(board,  (newBoard)=>{
	$("#gameboard").removeClass('won');

	$('#btnReset').prop('disabled', false);
	$('#btnUndo').prop('disabled', false);
	$('#btnRedo').prop('disabled', false);
	$('#btnSave').prop('disabled', false);
	$('#rangeZoom').prop('disabled', false);
	// console.log(newBoard)

	clearBoard(newBoard)

})
watch(timerval1, (newVal)=>{
	let second =  String(newVal%60).padStart(2,'0');
	let minute =  String(parseInt(newVal/60)).padStart(2,'0');
	gameTimer.value = minute+":"+second;
})
watch(boardZoom, (val)=>{
	// $('#gameboard').css('transform', 'scale('+val+')');
	$('#nurikabe').css('--sqr_size', val+'px');

	const boardWrap:number = parseFloat($('#wrap_board').css('width').slice(0,-2));
	const gameboard:number = parseFloat($('#gameboard').css('width').slice(0,-2));

	if(gameboard+(100)<=boardWrap || $("#gameboard").hasClass("won")){
	// if(gameboard-(val*-1.8)<=boardWrap){
		$('#wrap_board').removeClass('zoomed')
		zoomed = false;
	}else{
		$('#wrap_board').addClass('zoomed')

		if(!zoomed){
			zoomed = true;

			$('#wrap_board').get(0).scrollBy({left:((val*-1.2)+50)})
		}
	}

})
watch(move,val=>{
	for(const row of boardClass.value){
		for(const cell of row){
			cell.recentMove = false;
			cell.recentUndo = false;
		}
	}

	const moves = toRaw(val);
	const lastMove = moves.at(-1)
	if(lastMove){
		for(const [x,y] of lastMove.changes){
			boardClass.value[x][y].recentMove = true;
		}
	}

	const undos = toRaw(move_r.value);
	const lastUndo = undos.at(-1);
	if(lastUndo){
		for(const [x,y] of lastUndo.changes){
			boardClass.value[x][y].recentUndo = true;
		}
	}


},  { deep: true })
watch(date, async (val,prev)=>{
	try {
		if(prev != undefined && val != undefined && val.getTime() == prev.getTime()) return;
		if(user === null) return;

		let slashDate = val.getFullYear()+ '-'+
			('0'+(val.getMonth()+1)).slice(-2)+ '-'+
			('0'+val.getDate()).slice(-2)

			// console.log(slashDate)


		const v = await axios.post(
			"/history/fetchDateCompletedSizes",
			{
				date: slashDate,
			}
		)
		if(v.data.code > 0 || typeof v.data.data === "string"){
			// console.log(v.data.data)
			// throw "No Personal Best";
			throw v.data.data;
			// return;
		}
		completedSizes.value = v.data.data;

	}catch(ex){
		console.log(ex)
	}finally{

	}
})

clearBoard(board.value)

// seems to only work with refresh, not history back/forward(popstate) event
const handleBeforeUnload = (event:any) => {
    event.preventDefault()
    // chrome requires returnValue to be set
    const message = "You have unsaved changes. Are you sure you wish to leave?kpl"
    event.returnValue = message
    return message
};
const handlePopstateEvent = (event) =>{
	console.log('pop event');

	// history.pushState(null, null, window.location.href);

	// history.go()
	// // if (hasUnsavedChanges.value) {
	// 	// if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
			// event.preventDefault(); // Cancel the Inertia visit
			// event.stopPropagation();
	// 	// }
		// preventLeaveForm.cancel();
	// }
};

async function findPuzzleByDate(slashDate:any){
	const loader = $loading.show();
	try {
		const v = await axios.post(
			"/fetchapi",
			{
				difficulty: difficulty.value,
				date: slashDate,
			}
		)

		if(v.data == ""){
			throw "No record found";
		}

		move.value = [];

		const data = v.data.puzzleData;
		const h = data.gridHeight;
		const w:number = data.gridWidth;
		const g = data.data.startingGrid;

		ogboard =[[]]

		minZoom.value = calculateMinZoom(w,h);
		$('#nurikabe').css('--col_count', w);
		$('#nurikabe').css('--row_count', h);

		Object.entries(g).forEach(([k,v]) => {
			const x = parseInt(k/w);
			const y = k%w;
			if(ogboard[x] == undefined) ogboard[x] = [];

			if(v == 0){
				ogboard[x][y]= "  ";
			}else{
				ogboard[x][y]= " "+v;
			}
		});
		board.value = ogboard;
		boardZoom.value = minZoom.value;

		localStorage.setItem('board_det', difficulty.value+"/"+dateFilter.value);
		localStorage.setItem('board_data', JSON.stringify({
			startingGrid: g,
			gridWidth: data.gridWidth,
			gridHeight: data.gridHeight,
		}));


		timerval1.value=0;
		timerRunning = false;
		clearInterval(interval1);
	} catch (err) {
		console.log(err);
		alert(`API Error: Fetching board failed. `);
	} finally {
		// $('#newBoardModal').modal('hide');
		loader.hide();
	}
}
function constructCustomBoard(){
	// overlayContinue.value = true;

	let tempBoard:(string|number)[][]=[[]];
	const customBoard = JSON.parse(localStorage.getItem('custom_board')??"[[ ]]");

	for (let x = 0; x < customBoard.length; x++) {
		tempBoard[x] = [];
		for (let y = 0; y < customBoard[x].length; y++) {

				tempBoard[x][y] = " "+(customBoard[x][y]||" ");
		}
	}
	board.value = tempBoard;
	ogboard = tempBoard;

	try {


		localStorage.setItem('board_det', difficulty.value+"/"+dateFilter.value);

		// const h = data.gridHeight;
		const h = board.value.length;
		const w = board.value[0].length;

		// ogboard =[[]]

		// update scale

		minZoom.value = calculateMinZoom(w,h);
		$('#nurikabe').css('--col_count', w);
		$('#nurikabe').css('--row_count', h);

		boardZoom.value = minZoom.value;

		timerval1.value=0;
		timerRunning = false;
		clearInterval(interval1);
		// interval1 = setInterval(()=>{timerval1.value++}, 1000);

	} catch (err) {
		console.log(err);
		alert(`API Error: Fetching board failed. `);
	} finally {
		// $('#newBoardModal').modal('hide');
		// loader.hide();
	}
}
function continueBoard(){
	overlayContinue.value = true;

	board.value = JSON.parse(localStorage.getItem('board_continue')??"[[ ]]");
	move.value = JSON.parse(localStorage.getItem('move_continue')??"[[ ]]");
	const timer = JSON.parse(localStorage.getItem('timer_continue')??"[[ ]]");
	const board_data = JSON.parse(localStorage.getItem('board_data')??"[[ ]]");

	try {

		let h = board.value.length;
		let w = board.value[0].length;
		let g = board_data.startingGrid;


		ogboard =[[]]

		if(g){
			Object.entries(g).forEach(([k,v]) => {
				const x = parseInt(k/w);
				const y = k%w;
				if(ogboard[x] == undefined) ogboard[x] = [];

				if(v == 0){
					ogboard[x][y]= "  ";
				}else{
					ogboard[x][y]= " "+v;
				}
			});
		}else if(localStorage.getItem('custom_board')){
			let tempBoard:(string|number)[][]=[[]];
			const customBoard = JSON.parse(localStorage.getItem('custom_board')??"[[ ]]");

			for (let x = 0; x < customBoard.length; x++) {
				tempBoard[x] = [];
				for (let y = 0; y < customBoard[x].length; y++) {

						tempBoard[x][y] = " "+(customBoard[x][y]||" ");
				}
			}
			ogboard = tempBoard;
		}

		// update scale
		// const sqrSize = $('#nurikabe').css('--sqr_size').slice(0,-2);
		minZoom.value = calculateMinZoom(w,h);
		$('#nurikabe').css('--col_count', w);
		$('#nurikabe').css('--row_count', h);




		boardZoom.value = minZoom.value;

		timerval1.value=timer;
		timerRunning = false;
		clearInterval(interval1);
		// interval1 = setInterval(()=>{timerval1.value++}, 1000);

	} catch (err) {
		console.log(err);
		alert(`API Error: Fetching board failed. `);
	} finally {
		// $('#newBoardModal').modal('hide');
		// loader.hide();
	}
}
function calculateMinZoom(w,h){
	let boardWidth = $('#wrap_board').css('width'); // get board width
	boardWidth = parseFloat(boardWidth.slice(0,-2)); // remove the unit PX
	let boardActionHeight = $('#wrap_gameactions').css('height'); // get board width
	boardActionHeight = parseFloat(boardActionHeight.slice(0,-2)); // remove the unit PX
	let screenHeight = $('main').css('height'); // get board width
	screenHeight = parseFloat(screenHeight.slice(0,-2)); // remove the unit PX
	let boardHeight = screenHeight-boardActionHeight;

	let zoom = 0;
	if(boardWidth<boardHeight){
		zoom = ((boardWidth - 16)/(w+1))/1.8;
	}else{
		zoom = ((boardHeight - 16)/(h+1))/1.8;
	}
	zoom = Math.min(zoom, 30);
	zoom = parseFloat(zoom.toFixed(1))
	return zoom;
}

async function saveBoard(){
	$.toast({
		text: 'Saved!',
		icon: 'success',
		showHideTransition: 'fade',
		position: 'bottom-right',
		loader:false,
		hideAfter: 2000,
	})

    localStorage.setItem('board', JSON.stringify(board.value??[[' ']]));
    localStorage.setItem('move', JSON.stringify(move.value??[[' ']]));
	$("#btnLoad").prop('disabled', false);
	// $('#btnLoad').addClass('breathe');
	// await sleep(1000);
	// $('#btnLoad').removeClass('breathe');
}
function loadBoard(){
	const curMove = toRaw(move.value);
	const oldMoves = JSON.parse(localStorage.getItem('move')??"[[ ]]");

	oldMoves.forEach(()=>{ curMove.shift(); })

	const diffMove = curMove.reverse();

	board.value = JSON.parse(localStorage.getItem('board')??"[[ ]]");
	move.value = oldMoves;
	move_r.value = diffMove;
}

function clearBoard(newBoard:any){
	totalClue = 0;
	boardSize = 0;
	hints.value = [];
	boardClass.value = [[]]
	newBoard.forEach((row:any,indexX:number) => {
		boardClass.value[indexX] = [];
		row.forEach((column:any, indexY:number) =>{
			if(isNumber(column)){
				hints.value.push([indexX,indexY])
				totalClue+=parseInt(column);
			}
			boardClass.value[indexX][indexY] = {
				wall: column==" ■",
				visited:false,
				"wall_highlighted": false,
				"wall_highlighted-left": false,
				"wall_highlighted-top": false,
				"wall_highlighted-right": false,
				"wall_highlighted-bottom": false,
				"island_highlighted": false,
				'root_highlight':false,
				"corner_checked":false,
				"recentMove":false,
				"recentUndo":false,
				"invalid":false,
				"root_hints": [],
				hint: isNumber(column),
				island_size: -1,
				possible_roots: [],
				wall_id:-1,
				islet_id:-1,
			}
		});
	});
	boardSize = (newBoard.length)*(newBoard[0].length)
	isHighlighting = false;
	// autofill();

	if(difficulty.value.length==0) return //check if mounted
	calculateIslandSizeOnStart();
	updateRootReachable();
}
function resetHighlighting(){
	if(!isHighlighting) return;

	clearHighlight();
	isHighlighting = false;
}

async function setSquare(x:number, y:number, state=''){
	const value = board.value[x][y];
	let tof = false;

	clearTimeout(validateDelay);
	clearTimeout(debouncer_updateRootReable);
	clearHighlight();

	if(isHighlighting){
		isHighlighting = false;
		if(state.length===0){
			return;
		}
	}

	if(isNumber(value)) return;
	if(!timerRunning){
		timerRunning = true;
		interval1 = setInterval(()=>{timerval1.value++}, 1000);
	}

	// event.preventDefault();
	if(state=='down'){
		if(value== '  ') board.value[x][y] = ' ●';
		else if(value== ' ■')  board.value[x][y] = '  ';
		else if(value== ' ●')  board.value[x][y] = ' ■';
	}else{
		if(value== '  ') board.value[x][y] = ' ■';
		else if(value== ' ■')  board.value[x][y] = ' ●';
		else if(value== ' ●')  board.value[x][y] = '  ';
	}
	if(state == ''){
		move.value.push({action: 'userInput', changes:[[x,y]]});
		move_r.value= [];
	}

	boardClass.value[x][y]['wall'] = board.value[x][y] == ' ■'

	const curValue = board.value[x][y];

	//if turn into land or inverse
	if(value == ' ●' || curValue == ' ●'){
		updateRootHint(x, y);
	}

	if(value == ' ■' || curValue == ' ■'){
		updateWallId(x, y)
	}


	//reset invalid status
	for(const row of boardClass.value){
		for(const cell of row){
			cell.invalid = false;
		}
	}


	debouncer_updateRootReable = setTimeout(async ()=>{
		await updateRootReachable();
		await isNotInViolation();
		await validateBoard();
	}, 200);


	// validateDelay = setTimeout(,100);
}
function clearHighlight(){
	boardClass.value.forEach((row:any) => {
		row.forEach((element:any) => {
			element['visited']=false;
			element['wall_highlighted-left']=false;
			element['wall_highlighted-top']=false;
			element['wall_highlighted-right']=false;
			element['wall_highlighted-bottom']=false;
			element['island_highlighted']=false;
			element['root_highlight']=false;
			element['corner_checked']=false;
		});
	});
}
async function highlightEntity(x:number,y:number){
	event.preventDefault();

	clearHighlight();

	isHighlighting = true;

	if(boardClass.value[x][y]['wall']){
		await highlightWall([x,y])
	}
	if(boardClass.value[x][y].root_hints.length > 0){
		await highlightIsland([x,y]).catch((e) =>{})
	}else if(board.value[x][y] == ' ●'){
		await highlightIslet([x,y]).catch((e) =>{})
	}

	// if(board.value[x][y] == ' ●' || boardClass.value[x][y].hint){
	// 	await highlightIsland([x,y]).catch((e) =>{})
	// }
}
function highlightWall(square:number[]) {

	return new Promise<number[][]>(async (resolve, reject)=>{
		const queue = [square];
		let possibleMoves:any[][] = []

		for (let i = 0; i < queue.length; i++) {
			const value = queue[i];

			boardClass.value[value[0]][value[1]].visited = true;
			let neighboringSquare = [];

			Object.entries(directions).forEach(async([direction,coord]) => {
				const near = [value[0]+coord[0], value[1]+coord[1]];
				boardClass.value[value[0]][value[1]]['wall_highlighted-'+direction] = true;

				if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) return;

				neighboringSquare = boardClass.value[near[0]][near[1]];

				if(neighboringSquare.visited){
					boardClass.value[value[0]][value[1]]['wall_highlighted-'+direction]=false;
					boardClass.value[near[0]][near[1]]['wall_highlighted-'+inverseDirections[direction]]=false;
					return;
				}

				// hightlight possible moves excluding corners
				if(
					board.value[near[0]][near[1]] == '  ' &&
					!neighboringSquare.corner_checked
				){
					neighboringSquare.corner_checked = true;
					if(!await isCorner(near[0],near[1])){
						boardClass.value[near[0]][near[1]].island_highlighted = true;
						possibleMoves.push(near)
					}
				}

				if(neighboringSquare == undefined) return;// not sure why I need this but remove this give me error. issue in mid/2026/02/28
				if(!neighboringSquare.wall) return;

				queue.push([near[0],near[1]])
			});
		}
		resolve(possibleMoves);
	});
}
async function highlightIsland(square:number[]) {
	return new Promise(async (resolve, reject)=>{
		try{
			let queue:number[][] = [square];
			const blankQueue:number[][] = [];
			let blanks:number[][] = [];
			let remainder = 0;
			let hintVal;
			let hintCells = [];


			//highlight the hint square and isle squares. also count hints
			for (let i = 0; i < queue.length; i++) {
				const value = queue[i];

				boardClass.value[value[0]][value[1]].island_highlighted = true;

				if(isNumber( board.value[value[0]][value[1]] )){
					hintCells.push(queue[i]);
				}

				Object.values(directions).forEach((coord:number[]) => {
					const near = [value[0]+coord[0],value[1]+coord[1]];

					if( !(boardClass.value[near[0]] &&  boardClass.value[near[0]][near[1]]) ) return; //edge

					const neighboringSquare = boardClass.value[near[0]][near[1]];

					if(neighboringSquare.wall) return;

					if(board.value[near[0]][near[1]]== "  " ){
						if(blankQueue.some( v=>v[0]==near[0] && v[1]==near[1] )) return;
						blankQueue.push([near[0],near[1]])
					}else{
						if(queue.some( v=>v[0]==near[0] && v[1]==near[1] )) return;
						queue.push(near);
					}
				});

				remainder++;
			}

			$(`#item-${square[0]}_${square[1]}`).css('--count', "'"+(remainder)+"'")
			boardClass.value[square[0]][square[1]].root_highlight = true;

			if(hintCells.length!==1) throw 1;

			let value = hintCells[0];
			hintVal = parseInt(board.value[value[0]][value[1]]);
			remainder = hintVal-remainder;

			if(remainder < 0){
				throw remainder;
			}
			if(remainder == 0){
				resolve(0);
				return;
			}

			// Highlight possible moves//

			blankQueue.forEach((value) => {
				if( !isValidBlank([...value, remainder], square, queue) ) return
				blanks.push([...value, remainder]);
			});

			let spaceCtr = 0;

			//highlight blank squares
			for (let i = 0; i < blanks.length; i++) {
				const value = blanks[i];

				boardClass.value[value[0]][value[1]]['island_highlighted'] = true;

				spaceCtr++;
				if(value[2]==1) continue;

				Object.values(directions).forEach((coord:number[]) => {
					const near = [value[0]+coord[0],value[1]+coord[1]];
					if(queue.some( v=>v[0]==near[0] && v[1]==near[1] )) return;
					if(blanks.some( v=>v[0]==near[0] && v[1]==near[1] )) return;

					if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) return; //edge

					const nearClass = boardClass.value[near[0]][near[1]];

					if(nearClass.wall) return;
					if(isNumber(board.value[near[0]][near[1]])) return;
					if( !isValidBlank([...near, value[2]-1], square, queue, blanks) ) return

					blanks.push([...near, value[2]-1])
				});
			}

			remainder-=spaceCtr;
			if(remainder==0) {resolve(0); return;}
			reject(remainder);
		}catch(ex){
			reject(ex);
		}
	})
}
async function highlightIsland2(square:number[]) {
	return new Promise(async (resolve, reject)=>{
		try{
			let queue:number[][] = [square];
			const blankQueue:number[][] = [];
			let blanks:number[][] = [];
			let remainder = 0;
			let hintVal;
			let hintCells = [];
			let visitedSet:Set<string> = new Set(square.toString());


			//highlight the hint square and isle squares. also count hints
			for (let i = 0; i < queue.length; i++) {
				const value = queue[i];

				boardClass.value[value[0]][value[1]].island_highlighted = true;

				if(isNumber( board.value[value[0]][value[1]] )){
					hintCells.push(queue[i]);
				}

				Object.values(directions).forEach((coord:number[]) => {
					const near = [value[0]+coord[0],value[1]+coord[1]];

					if( !(boardClass.value[near[0]] &&  boardClass.value[near[0]][near[1]]) ) return; //edge

					const neighboringSquare = boardClass.value[near[0]][near[1]];

					if(neighboringSquare.wall) return;

					if(board.value[near[0]][near[1]]== "  " ){
						if(blankQueue.some( v=>v[0]==near[0] && v[1]==near[1] )) return;
						blankQueue.push([near[0],near[1]])
					}else{
						if(queue.some( v=>v[0]==near[0] && v[1]==near[1] )) return;
						queue.push(near);
						visitedSet.add(near.toString())
					}
				});

			}

			$(`#item-${square[0]}_${square[1]}`).css('--count', "'"+(queue.length)+"'")
			boardClass.value[square[0]][square[1]].root_highlight = true;

			if(hintCells.length!==1) throw 1;

			let hintCell = hintCells[0];
			hintVal = parseInt(board.value[hintCell[0]][hintCell[1]]);
			remainder = hintVal-queue.length;

			if(remainder < 0){
				throw remainder;
			}
			if(remainder == 0){
				resolve(0);
				return;
			}

			// Highlight possible moves//

			blankQueue.forEach((value) => {
				let curCell = boardClass.value[value[0]][value[1]];
				if( !curCell.possible_roots.some( v=> v[0]==hintCell[0] && v[1]==hintCell[1]) ) return
				blanks.push([...value, remainder]);
			});

			let spaceCtr = 0;

			let paths = [];

			//highlight blank squares
			function dfs(r:number, c:number, stepsLeft:number, visited:Set<string>, path:number[][]) {
				visited.add(`${r},${c}`);
				path.push([r, c]);



				if (stepsLeft === 0) {
					if (isDot(r, c)) {
						path.forEach(([pr, pc]) => {
							validCells.add(`${pr},${pc}`);
						});
					}
				} else {
					for (let [nr, nc] of getNeighbors(r, c)) {
						let nextKey = `${nr},${nc}`;
						if (!visited.has(nextKey)) {
							dfs(nr, nc, stepsLeft - 1, new Set(visited), [...path]);
						}
					}
				}



			}
			blanks.forEach(blank =>{
				dfs(blank[0], blank[1], blank[2], visitedSet, []);
			})


			remainder-=spaceCtr;
			if(remainder==0) {resolve(0); return;}
			reject(remainder);
		}catch(ex){
			reject(ex);
		}
	})
}


// kinda like highlightIsland but the island has no hint and we highlight the island that can reach the islet
function highlightIslet(square:number[]) {
	return new Promise(async resolve=>{
		let queue:number[][] = [square];
		let blanks:number[][] = [];
		let islandSize = boardClass.value[square[0]][square[1]].island_size;
		let hintsReachable:number[][]=[];

		//highlight the land and find blanks around the land
		for (let i = 0; i < queue.length; i++) {
			const value = queue[i];

			if(boardClass.value[value[0]][value[1]].visited) continue;
			boardClass.value[value[0]][value[1]].visited = true;
			boardClass.value[value[0]][value[1]].island_highlighted = true;

			Object.values(directions).forEach((coord:number[]) => {
				const near = [value[0]+coord[0],value[1]+coord[1]]
				if(blanks.some(v=>v[0]==near[0] && v[1]==near[1])) return;
				if(queue.some(v=>v[0]==near[0] && v[1]==near[1])) return;
				if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) return;

				const nearClass = boardClass.value[near[0]][near[1]];

				if(nearClass.visited) return;

				if(board.value[near[0]][near[1]] == "  "){
					blanks.push(near);
				}else if(board.value[near[0]][near[1]] == " ●"){
					queue.push(near);
				}
			});
		}
		$(`#item-${square[0]}_${square[1]}`).css('--count', "'"+(queue.length)+"'")
		boardClass.value[square[0]][square[1]].root_highlight = true;


		queue = [];
		blanks.forEach(q=>{
			if(!isValidBlank([...q,islandSize+1], square) ) return;
			for(const direction of Object.values(directions)){
				const near = [q[0]+direction[0],q[1]+direction[1]]
				if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;
				if(boardClass.value[near[0]][near[1]].root_hints.length!=1) continue;
				const hint = toRaw(boardClass.value[near[0]][near[1]].root_hints[0])
				if(hintsReachable.some(v=>v[0]==hint[0] && v[1]==hint[1])) continue;
				hintsReachable.push(hint);
			}
			queue.push([...q, islandSize+1]);
		})

		for(let i=0; i<queue.length; i++){
			const value = queue[i];

			if(boardClass.value[value[0]][value[1]].visited) continue;

			boardClass.value[value[0]][value[1]].visited = true;
			boardClass.value[value[0]][value[1]].island_highlighted = true;

			for(const direction of Object.values(directions)){
				const near = [value[0]+direction[0],value[1]+direction[1]]
				if(queue.some(v=>v[0]==near[0] && v[1]==near[1])) continue;
				if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;

				const nearClass = boardClass.value[near[0]][near[1]];

				if(nearClass.visited) continue;
				if(nearClass.wall) continue;
				// if(board.value[near[0]][near[1]] != "  ") continue;
				if(!isValidBlank([...near,value[2]], square) ) continue;

				for(const direction of Object.values(directions)){
					const near = [value[0]+direction[0],value[1]+direction[1]]
					if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;
					if(boardClass.value[near[0]][near[1]].root_hints.length!=1) continue;
					const hint = toRaw(boardClass.value[near[0]][near[1]].root_hints[0])
					if(hintsReachable.some(v=>v[0]==hint[0] && v[1]==hint[1])) continue;
					hintsReachable.push(hint);
				}

				queue.push([...near, value[2]+1]);

			}
		}

		for(const hint of hintsReachable){
			boardClass.value[hint[0]][hint[1]].island_highlighted = true;
		}

		resolve(hintsReachable);
	})
}
function isValidBlank(value:number[], island:number[], queue:number[][]=[[]], blanks:number[][]=[[]]){
	const board_l = board.value;
	const boardClass_l = boardClass.value;

	let response = true;

	if(board_l[value[0]][value[1]] != "  ") return response;//skip if not blank. for precaution

	for( const coord of Object.values(directions)){
		const near = {x: value[0]+coord[0], y: value[1]+coord[1]};
		if( !(boardClass_l[near.x] && boardClass_l[near.x][near.y]) ) continue;

		const neighboringSquare = boardClass_l[near.x][near.y];

		if(neighboringSquare.wall) continue;
		if(neighboringSquare.visited) continue;
		if(queue.some( v=>v[0]==near.x && v[1]==near.y )) continue; // for operation that don't use 'visited'
		if(blanks.some( v=>v[0]==near.x && v[1]==near.y )) continue; // for operation that don't use 'visited'
		if(board_l[near.x][near.y] == "  ") continue;
		if(neighboringSquare.root_hints.toString() == boardClass_l[island[0]][island[1]].root_hints.toString() ) continue; // same root hints mean same island

		//island has root, neighbor is not island and remaining land bigger than islet size.
		//	we dont check if remaider and islet to be equal because current cell is not included.
		if(
			boardClass_l[island[0]][island[1]].root_hints.length==1 && neighboringSquare.root_hints.length==0 &&
			value[2] > neighboringSquare.island_size
		) continue;

		if(	boardClass_l[island[0]][island[1]].root_hints.length==0  &&	neighboringSquare.root_hints.length==1){
			const hint = neighboringSquare.root_hints[0];
			const hintVal = parseInt(board_l[hint[0]][hint[1]]);
			const hintSize = boardClass_l[hint[0]][hint[1]].island_size;
			if(value[2] < hintVal-hintSize) continue;
		}

		response = false;
		break;

	}

	return response;
}

function resetBoard(){
	ogboard.forEach((row:any,indexX:number) => {
		row.forEach((column:any, indexY:number) =>{
			if([" ●", " ■"].includes(column)){
				ogboard[indexX][indexY] = "  "
			}
		});
	});
	board.value = [...ogboard];
	move.value = [];
	move_r.value = [];

	$('#btnLoad').prop('disabled', true);
	boardZoom.value = minZoom.value;

	const boardWrap:number = parseFloat($('#wrap_board').css('width').slice(0,-2));
	const boardwidth = minZoom.value * ogboard[0].length * 1.7;
	const sizePadding = 20;
	const scroll2left = 50-((boardWrap-sizePadding-boardwidth)/2);
	$('#wrap_board').get(0).scrollTo({left:scroll2left,})

	timerval1.value=0;
	timerRunning = false;
	clearInterval(interval1);
	localSaveReset();
}

async function validateBoard(isToRecord = true){
	let wallCount = 0;
	let root:number[] = [];

	board.value.forEach((row:any, x:number) => {
		row.forEach((column:any, y:number) =>{
			if(column != " ■") return;
			wallCount++;
			if(root.length==0) root = [x,y]
		});
	});
	if(boardSize !== wallCount+totalClue) return false;

	let result:any = false;

	try{
		for(const [x, row] of boardClass.value.entries()){
			for(const [y, cell] of row.entries()){
				if(cell.invalid) return false;
			}
		}
		const boardClass_copy = [...boardClass.value];
		await Promise.all([
			checkHintsSatified(),
			// checkFor2By2(),
			checkHas1Wall(root,boardClass_copy),
		]);
		clearHighlight();


		$("#gameboard").addClass('won');
		$('#btnUndo').prop('disabled', true);
		$('#btnRedo').prop('disabled', true);
		$('#btnSave').prop('disabled', true);
		$('#btnLoad').prop('disabled', true);
		$('#rangeZoom').prop('disabled', true);
		boardZoom.value = minZoom.value;


		timerRunning = false;
		clearInterval(interval1);
		$("#exampleModal").modal('show')

		localSaveReset();

		// don't record if no user login
		if(user === null) return true;
		if(isToRecord){
			recordWin();
			if(!completedSizes.value.includes(difficulty.value)){
				let ogValue = toRaw(completedSizes.value);
				ogValue.push(difficulty.value)
				completedSizes.value = ogValue;
			}
		}


		return true;
	}catch(ex){
		console.log(ex)
		clearHighlight();
		return false;
	}

}

function checkHas1Wall(square:number[], boardClass_copy){
	return new Promise(async(resolve, reject)=>{
		const queue = [square];
		let qString:string[] = [];

		for (let i = 0; i < queue.length; i++) {
			const value = queue[i];
			boardClass_copy[value[0]][value[1]].visited = true;
			let neighboringSquare = [];

			Object.values(directions).forEach((coord) => {
				const newCoord = [value[0]+coord[0],value[1]+coord[1]];
				if(qString.includes(newCoord.toString())) return;

				if(boardClass_copy[value[0]+coord[0]] == undefined) return;
				neighboringSquare = boardClass_copy[value[0]+coord[0]][value[1]+coord[1]];
				if(neighboringSquare== undefined) return;
				if(neighboringSquare.visited) return
				if(!neighboringSquare.wall) return;

				queue.push(newCoord)
				qString.push(newCoord.toString());
			});
		}
		if(queue.length === boardSize-totalClue){
			resolve('checkHas1Wall');
		}else{
			reject('checkHas1Wall');
		}
	})
}
function checkFor2By2(){
	return new Promise((resolve, reject)=>{
		try{

			for (let i = 0; i < board.value.length - 1; i++) {
				for (let j = 0; j < board.value[i].length - 1; j++) {
					const cell1 = board.value[i][j];
					const cell2 = board.value[i][j + 1];
					const cell3 = board.value[i + 1][j];
					const cell4 = board.value[i + 1][j + 1];

					if ([cell1, cell2, cell3, cell4].every(cell => cell==" ■")) {
						throw false;
					}
				}
			}
			resolve('checkFor2By2');
		}catch(ex){
			reject('checkFor2By2')
		}
	})
}
function checkHintsSatified(){
	return new Promise(async (resolve,reject)=>{
		let ctr:number=0;
		let promiseArr = [];
		for (let index = 0; index < toRaw(hints.value).length; index++) {
			const element = hints.value[index];
			// console.log('a ',element)
			promiseArr.push(highlightIsland(element))
		}

		Promise.all(promiseArr)
			.then((v)=>{ resolve('checkHintsSatified') })
			.catch((v)=>{ reject('checkHintsSatified') });
	})
}

function isCorner(x:number,y:number){
	return new Promise(async (resolve)=>{
		try{
			Object.entries(CORNERS).forEach(([name, coord]) => {
				if(board.value[x+coord[0]] == undefined) return;
				const corner = board.value[x+coord[0]][y+coord[1]]
				if(corner !=' ■') return;
				const horizontal = board.value[x][y+coord[1]]
				if(horizontal!=' ■') return;
				const vertical = board.value[x+coord[0]][y]
				if(vertical!=' ■') return;

				throw true;
			});
			resolve(false)
		}catch(ex){
			resolve(ex)
		}
	})
}
function gotoNewPage(){
	try{
		const newUrl = route('Board', [
			newDifficulty.value,
			date.value.getFullYear(),
			date.value.getMonth()+1,
			date.value.getDate(),
		])
		$('.modal').modal('hide')
		newPageLoader.value = $loading.show()
		router.visit(newUrl);
		localSaveReset();
	}catch(ex){
		console.error(ex)
		throw ex
	}
}

async function getPersonalBest(){
	try {

		$("#flag_pb").hide();
		if(user === null) return;
		let slashDate = date.value.getFullYear()+ '-'+
			('0'+(date.value.getMonth()+1)).slice(-2)+ '-'+
			('0'+date.value.getDate()).slice(-2)

		const v = await axios.post(
			"/history/getPersonalsBest",
			{
				difficulty: difficulty.value,
				date: slashDate,
			}
		)
		if(v.data.code > 0 || v.data.data === null || v.data.data.length===0){
			// throw "No Personal Best";
			return;
		}
		pb.value = formatGameTime(v.data.data.win_second);
		$("#flag_pb").show();

	}catch(ex){
		console.log(ex)
	}finally{

	}
}


function redo(){
	// console.log('redo')
	const cells:any = toRaw(move_r.value.pop());
	if(cells == undefined) return;
	move.value.push(cells);

	for(const cell of cells.changes){
		setSquare(cell[0], cell[1], cell[2]??'up');
	}
}
function undo(){
	// console.log('undo')
	const cells:any = toRaw(move.value.pop());
	if(cells == undefined) return;
	move_r.value.push(cells);

	for(const cell of cells.changes){
		setSquare(cell[0], cell[1], cell[2]=='down'?'up':'down');
	}
}
function autofill(){
	console.log(difficulty.value)
	if(difficulty.value.length>0) return //skip if mounted

	let corners = {
		'tl':[-1,-1],
		'tr':[-1, 1],
		'bl':[ 1,-1],
		'br':[ 1, 1],
	};
	let directions2 = {
		"left"	:[ 0,-2],
		"top"	:[-2, 0],
		"right"	:[ 0, 2],
		"bottom":[ 2, 0],
	};

	hints.forEach(element => {
		const value = board.value[element[0]][element[1]];
		// console.log(value);
		if(value==1){
			boardClass.value[element[0]][element[1]].island_size = 1;
			boardClass.value[element[0]][element[1]].root_hints = [element];

			Object.values(directions).forEach(direction => {
				if(board.value[element[0]+direction[0]] == undefined) return;
				if(board.value[element[0]+direction[0]][element[1]+direction[1]] == undefined) return;
				board.value[element[0]+direction[0]][element[1]+direction[1]]= " ■";
				boardClass.value[element[0]+direction[0]][element[1]+direction[1]].wall = true;
			});
			return
		}
		Object.values(corners).forEach(corner => {
			if(board.value[element[0]+corner[0]] == undefined) return;
			if(board.value[element[0]+corner[0]][element[1]+corner[1]] == undefined) return;

			const cell = board.value[element[0]+corner[0]][element[1]+corner[1]];
			if(!isNumber(cell)) return;

			if(typeof board.value[element[0]+corner[0]][element[1]] != undefined){
				board.value[element[0]+corner[0]][element[1]] = " ■";
				boardClass.value[element[0]+corner[0]][element[1]].wall = true;
			}
			if(typeof board.value[element[0]][element[1]+corner[1]] != undefined){
				board.value[element[0]][element[1]+corner[1]] = " ■";
				boardClass.value[element[0]][element[1]+corner[1]].wall = true;
			}
		});
		Object.entries(directions2).forEach(([direction,coord]) => {
			if(board.value[element[0]+coord[0]] == undefined) return;
			if(board.value[element[0]+coord[0]][element[1]+coord[1]] == undefined) return;

			const cell = board.value[element[0]+coord[0]][element[1]+coord[1]];
			if(!isNumber(cell)) return;

			if(typeof board.value[element[0]+directions[direction][0]] == undefined) return;
			if(typeof board.value[element[0]+directions[direction][0]][element[1]+directions[direction][1]] == undefined) return;

			board.value[element[0]+directions[direction][0]][element[1]+directions[direction][1]]= " ■";
			boardClass.value[element[0]+directions[direction][0]][element[1]+directions[direction][1]].wall = true;
		});


	});
}
function randomFetch(){
	// 2005 to present
	let minYr = 2005;

	let the_difficulty = Math.floor(Math.random() * difficulties.value.length);

	let maxYr;
	let year;
	let month;
	let day;
	let the_date;

	do{
		maxYr = new Date().getFullYear();
		year = Math.floor(Math.random() * (maxYr-minYr+1))+minYr;
		month = (Math.floor(Math.random() * 12)+1).toString().padStart(2, '0');
		day = (Math.floor(Math.random() * 31)+1).toString().padStart(2, '0');
		the_date = new Date(`${year}/${month}/${day}`);
	}while(the_date.getTime() > Date.now())

	newDifficulty.value = difficulties.value[the_difficulty]
	date.value = the_date

	gotoNewPage()

}
async function recordWin(){
	if(difficulty.value == 'custom') return;// dont save custom board

	const winDate = date.value.getFullYear()+ '-'+
		('0'+(date.value.getMonth()+1)).slice(-2)+ '-'+
		('0'+date.value.getDate()).slice(-2)
	let formData ={
		difficulty: difficulty.value,
		date: winDate,
		time: timerval1.value
	}

	// console.log(formData);return;

	try {
		const v = await axios.post(
			"/history/recordWin",
			formData
		)
		// console.log(v.data)
	} catch (err) {
		console.error(err);
	} finally {
	}

}


function focusPage(){
	// Code to execute when the tab gains focus
	// console.log('Tab is now focused');
	// console.log(timerRunning, interval1)

	// const tagName = document.activeElement
	if(timerRunning && (interval1 === undefined || interval1 === 0)){
		interval1 = setInterval(()=>{timerval1.value++}, 1000);
	}
}
function unfocusPage(){
	// Code to execute when the tab loses focus
	const tagName = document.activeElement?.tagName
	// console.log('Tab is now blurred', tagName);

	if(tagName === "BODY" ) return; // dont stop clock if focused element is part of the newPageLoader
	clearInterval(interval1);
	interval1 = 0;

	const gameTimer = (timerval1.value||0).toString();
	if(gameTimer === "0") return;

	localStorage.setItem('board_continue', JSON.stringify(board.value??[[' ']]));
	localStorage.setItem('move_continue', JSON.stringify(move.value??[[' ']]));
	localStorage.setItem('timer_continue', gameTimer);
}
function scrollZoom(ev){
	if($("#gameboard").hasClass('won')) return;

	if(ev.deltaY>0 && minZoom.value < boardZoom.value){
		boardZoom.value-=2;
		boardZoom.value = Math.max(minZoom.value, boardZoom.value)
	}else if(ev.deltaY<0 && boardZoom.value < maxZoom.value){
		boardZoom.value+=2;
		boardZoom.value = Math.min(boardZoom.value,maxZoom.value)
	}
}
function showNewBoard(ev){
	$("#newBoardModal").modal('show');
	// $('.modal-backdrop').attr(`data-${scopeId}`,"")
}
function showHelp(ev){
	$("#helpModal").modal('show', {});
	// $('.modal-backdrop').attr(`data-${scopeId}`,"")
}
function formatGameTime(time){
	let second =  String(time%60).padStart(2,'0');
	let minute =  String(parseInt(time/60)).padStart(2,'0');
	return minute+":"+second;
}
function localSaveReset(){
	localStorage.removeItem('board_det');
	localStorage.removeItem('board_data');
	localStorage.removeItem('board_continue');
	localStorage.removeItem('move_continue');
	localStorage.removeItem('timer_continue');
}
async function handleContinueLoader(){
	timerRunning = true;
	$('body').focus();
	await sleep(1);
	$('#btnRedo').focus();
}

async function updateRootHint(x:number, y:number){
	const rootHints = removeAndCountRootHints(x,y);
	rootHints.forEach(async (hint:number[]) => {
		await new Promise( resolve=>{
			const res = setRootHints(hint[0], hint[1], {root:hint});
			resolve(res)
		})
	})

	if(board.value[x][y] == " ●" && boardClass.value[x][y].root_hints.length == 0){
		setRootHints(x,y, {isletId:isletNextId++});
	}else if(board.value[x][y] == "  " || board.value[x][y] == " ■"){
		boardClass.value[x][y].island_size=0;

		Object.values(directions).forEach((coord:number[]) => {
			const near = [x+coord[0], y+coord[1]];
			if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]] ) ) return;
			if(board.value[near[0]][near[1]] != " ●") return;

			setRootHints(near[0],near[1], {isletId:isletNextId++});
		});
	}

}
function removeAndCountRootHints(x:number,y:number){
	let rootHints: number[][] = [];
	let queue = [x+","+y];

	for (let i = 0; i < queue.length; i++) {
		const value:number[] = queue[i].split(',').map(v=>parseInt(v));

		boardClass.value[value[0]][value[1]].root_hints = [];
		boardClass.value[value[0]][value[1]].island_size = -1;
		boardClass.value[value[0]][value[1]].islet_id = -1;

		if(isNumber(board.value[value[0]][value[1]])){
			rootHints.push([value[0],value[1]])
		}

		Object.values(directions).forEach((coord:number[]) => {
			const near = [value[0]+coord[0], value[1]+coord[1]];
			if(queue.includes(near.toString())) return;
			if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]] ) ) return;
			if( boardClass.value[near[0]][near[1]].island_size == -1 ) return;

			if(board.value[near[0]][near[1]] == " ●" || isNumber(board.value[near[0]][near[1]]) ){
				queue.push(near.toString());
			}
		});
	}
	return rootHints;

}
function setRootHints(x:number,y:number, option:any={}){
	let queue = [x+","+y];
	for (let i = 0; i < queue.length; i++) {
		const value:any = queue[i].split(',').map(v=>parseInt(v));

		if(option.root?.length>0){
			if(boardClass.value[value[0]][value[1]].root_hints.some(v=>v[0]==option.root[0] && v[1]==option.root[1])) continue
			boardClass.value[value[0]][value[1]].root_hints.push(option.root);
		}else if(option.isletId!==undefined && option.isletId>=0){
			boardClass.value[value[0]][value[1]].islet_id = option.isletId;
		}

		Object.values(directions).forEach((coord:number[]) => {
			const near = [value[0]+coord[0], value[1]+coord[1]];
			if( queue.includes( near.toString()) ) return
			if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]] ) ) return;

			if(board.value[near[0]][near[1]] == " ●" || isNumber(board.value[near[0]][near[1]])){
				queue.push( near.toString() );
			}
		});
	}
	queue.forEach((v,k)=>{
		let cellCoord = v.split(',').map(v=>parseInt(v));
		boardClass.value[cellCoord[0]][cellCoord[1]].island_size = queue.length;
	});
}

async function calculateIslandSizeOnStart(){
	const boardLocal = toRaw(boardClass.value);
	if(difficulty.value.length==0) return //check if mounted

	wallNextId=0;
	isletNextId=0;

	for(const hint of toRaw(hints.value)){
		// await new Promise(resolve=>{
			updateRootHint(...hint);
		// 	resolve(true);
		// })
	}

	boardLocal.forEach( (row,x) =>{
		row.forEach( (cell,y) => {
			if(board.value[x][y] == ' ■' || board.value[x][y] == '  '){
				if(board.value[x][y] == ' ■'){
					updateWallId(x, y)
				}
				cell.island_size=0;
				return;
			}
			if(board.value[x][y] == ' ●' && boardClass.value[x][y].root_hints.length==0){
				updateRootHint(x,y);
			}
		});
	})
}
function cellStatus(x:number,y:number){
	let status = `${x},${y}\n`;

	Object.entries(boardClass.value[x][y]).forEach(([key, value]) => {
		status+= key + ": " + value.toString() + "\n";
	});
	return status;
}
function updateRootReachable(){
	return new Promise( resolve => {
		// console.log('updateRootReachable')
		for(const row of boardClass.value){
			for(const cell of row){
				if(cell.wall){
					cell.possible_roots = [[-1, -1]];
				}else{
					cell.possible_roots = [];
				}
			}
		}

		for(const hint of toRaw(hints.value)){
			let queue:number[][] = [ [hint[0], hint[1]] ];
			let blankQueue:number[][] = [];
			let blanks:number[][] = [];
			let hintCtr = 0;

			// update the island's possible root
			for(let i = 0; i<queue.length; i++){
				const cell = queue[i];

				boardClass.value[cell[0]][cell[1]].possible_roots.push(hint);
				// boardClass.value[cell[0]][cell[1]].island_highlighted = true;
				if(isNumber(board.value[cell[0]][cell[1]])) hintCtr++;

				for(const direction of Object.values(directions)){
					const near:number[] = [ cell[0]+direction[0], cell[1]+direction[1] ];
					if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;

					const nearClass = boardClass.value[near[0]][near[1]];
					const nearValue = board.value[near[0]][near[1]];

					if(nearClass.wall) continue;

					if(nearValue == " ●"  || isNumber(nearValue)){
						if( queue.some(v => v[0]==near[0] && v[1]==near[1] ) ) continue;
						queue.push(near);
					}else if( nearValue == "  "){
						if( blankQueue.some(v => v[0]==near[0] && v[1]==near[1] ) ) continue;
						blankQueue.push(near)
					}
				}
			}

			if(hintCtr>1) continue;

			let islandSize = queue.length;
			let remainder = parseInt(board.value[hint[0]][hint[1]]) - islandSize
			if(remainder==0) continue;

			blankQueue.forEach(element => {
				if(!isValidBlank([...element, remainder], hint, queue, blanks)) return;
				blanks.push([...element, remainder]);
			});

			for(let i=0; i<blanks.length; i++){
				const cell = blanks[i];

				if(boardClass.value[cell[0]][cell[1]].root_hints.length>0) continue
				boardClass.value[cell[0]][cell[1]].possible_roots.push(hint);
				// boardClass.value[cell[0]][cell[1]].island_highlighted = true;

				if(cell[2]==1) continue;

				for(const direction of Object.values(directions)){
					const near:number[] = [ cell[0]+direction[0], cell[1]+direction[1] ];
					if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;

					const nearClass = boardClass.value[near[0]][near[1]];
					const nearValue = board.value[near[0]][near[1]];

					if(nearClass.wall) continue; // skip wall
					if( boardClass.value[cell[0]][cell[1]].root_hints.length>0 ) continue; // skip is in queue already. processed or not
					if( blanks.some(v => v[0]==near[0] && v[1]==near[1]) ) continue; // skip is in queue already. processed or not
					if(!isValidBlank([...near, cell[2]-1], hint, queue, blanks)) continue;

					blanks.push([...near, cell[2]-1])
				}
			}
		}// for hints


		resolve(true);
	})
}


function updateWallId(x, y){
	if(board.value[x][y] == ' ■'){
		let id = wallNextId;
		for(const d of Object.values(directions)){
			const near = [x+d[0],y+d[1]];
			if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;// edge
			if(!boardClass.value[near[0]][near[1]].wall)continue;
			if(boardClass.value[near[0]][near[1]].wall_id == -1) continue;
			id = Math.min(id, boardClass.value[near[0]][near[1]].wall_id);
		}

		if(id == wallNextId){
			updateWallIdOfSegment(wallNextId++, x, y)
		}else{
			updateWallIdOfSegment(id, x, y)
		}
	}else{
		boardClass.value[x][y].wall_id=-1
		for(const d of Object.values(directions)){
			const near = [x+d[0],y+d[1]];
			if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue;// edge
			if(!boardClass.value[near[0]][near[1]].wall)continue;

			updateWallIdOfSegment(wallNextId++, near[0], near[1]);
		}
	}
}
function updateWallIdOfSegment(id, x, y){
	return new Promise<any>(async resolve=>{
		const boardClass_l = boardClass.value;
		const board_l = board.value;
		let queue = [[x,y]];

		for(let i=0; i<queue.length; i++){
			const curCell = queue[i];
			boardClass_l[curCell[0]][curCell[1]].wall_id = id;

			for(const d of Object.values(directions)){
				const near = [curCell[0]+d[0],curCell[1]+d[1]];
				if( !(boardClass_l[near[0]] && boardClass_l[near[0]][near[1]]) ) continue;// edge

				if(!boardClass_l[near[0]][near[1]].wall) continue;
				if(boardClass_l[near[0]][near[1]].wall_id == id) continue;
				queue.push(near);
			}
		}
		resolve(true)
	});
}


function observeDarkMode(){
	isDark.value = document.documentElement.classList.contains('dark');
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.attributeName === 'class') {
				const element = mutation.target;
				isDark.value = element.classList.contains('dark');
			}
		});
	});
	observer.observe(document.documentElement, { attributes: true });
}
function addTouchListeners(){
	el = document.getElementById("wrap_board");
	el.onpointerdown = pointerdownHandler;
	el.onpointermove = pointermoveHandler;

	// Use same handler for pointer{up,cancel,out,leave} events since
	// the semantics for these events - in this app - are the same.
	el.onpointerup = pointerupHandler;
	el.onpointercancel = pointerupHandler;
	// el.onpointerout = pointerupHandler; kpl(2025-11-07): commented because it's firing too much
	el.onpointerleave = pointerupHandler;
}


async function doCheatAction(event){
	const value = event.target.value;
	$("#dropdownAction").prop('disable', true);


	// let boardLocal = toRaw(board.value).map(row => [...row]);

	let board_l = toRaw(board.value).map(row => [...row]);
	let boardClass_l = toRaw(boardClass.value).map(row => [...row]);

	console.time('Execution Time');
	if(typeof Cheat[value] == 'function'){
			console.log(`Processing: ${value}`)
			const res = await Cheat[value](board_l, boardClass_l).catch((e) =>{});
			console.log(res);

			if(res?.changes?.length>0){
				res.changes.forEach(value=>{
					board_l[value[0]][value[1]] = value[2]=="up"?" ■":" ●";
				})
				board.value = board_l;
				move.value.push(res);
				move_r.value=[];
			}
			await sleep(1)
			await isNotInViolation();
			await validateBoard();
	}

	console.timeEnd('Execution Time');

	$("#dropdownAction").prop('disable', false);
}
async function cycleCheat(){
	try{
		console.clear();
		const simpleCheats:string[] = [
			"completeIsland",
			"fillUnreachable",
			"fillSingleOptions",
			"edgeExit",

			// "fillThreatenedCell",
			// "hiddenIslandExpansion",
			// "hiddenWallExpansion",
			// "hiddenIsletExpansion",
		];
		const midCheats:string[] = [
			// "completeIsland",
			// "fillUnreachable",
			// "fillSingleOptions",
			// "edgeExit",

			"fillThreatenedCell",
			"hiddenIslandExpansion",
			"hiddenWallExpansion",
			"hiddenIsletExpansion",
		];


		$("#btnFillUnreachable").prop('disabled', true);

		let board_l:any[][] = [];
		let boardClass_l:any[][] = [];

		let sentry = 2000;
		// sentry = 10;

		let cheatOp={value:""};
		let promises:any[] = [];
		let res = [];

		let isValid:boolean = true;
		let isSolved = false;

		let taeList:number[][] = [];
		let taeIndex = -1;
		let ordinal=1;
		let wallOrIsland = "wall";
		let firstGuess = true; // first guess is always wall then land
		let guessCtr=0;
		let checkpoint:{board:string[][],	move:any[]} = {
			board:[],
			move:[],
		};

		const fnStart = performance.now();
		do{
			sentry--;

			res = [];
			promises = [];
			isValid=true;
			isSolved=true;
			board_l = toRaw(board.value).map(row => [...row]);
			boardClass_l = toRaw(boardClass.value).map(row => [...row]);

			const opStart = performance.now();

			await sleep(5);
			for(const cheat of simpleCheats){
				promises.push(Cheat[cheat]( board_l, boardClass_l  ))
			}
			res = await Promise.any(promises).catch(ex=>{});

			if(res?.changes == undefined){
				for(const cheat of midCheats){
					res = await Cheat[cheat]( board_l, boardClass_l ).catch((e) =>{});
					if(res?.changes.length>0){break;}
				}
			}
			if(res?.changes?.length>0){
				res.changes.forEach((value:any[])=>{
					board_l[value[0]][value[1]] = value[2]=="up"?" ■":" ●";
				})
				cheatOp.value = res.action;
				board.value = board_l;
				move.value.push(res);
				move_r.value=[];


				console.log(`%c${sentry} ${cheatOp.value}: ${(performance.now()-opStart).toLocaleString()}ms`, 'color:palegoldenrod');
				await sleep(5);

				isValid = await isNotInViolation()
				isSolved = await validateBoard(false);
				if(isSolved) break;
			}


			if(!isValid){
				if(taeList.length>0){
					//BACKTRACK
					move.value = checkpoint.move
					board.value = checkpoint.board

					await sleep(5);
					//Set opposite of the test
					const taePt = {x: taeList[taeIndex][0], y: taeList[taeIndex][1]};
					console.log(`%cCONTRADICTION! SET [${taePt.x},${taePt.y}] to ${firstGuess?'■':'●'}`, 'color:pink')

					setSquare(taePt.x, taePt.y, firstGuess?'up':'down');
					move.value.push( {action:'guess', changes:[ [taePt.x, taePt.y, firstGuess?'up':'down'] ]}  )

					// reset
					taeList = [];
					ordinal=1;
					wallOrIsland='wall';
					firstGuess = true;
					guessCtr=0;
				}else{
					// console.log("there is violation")
					break;
				}
			}else	if(res==undefined){
				if(taeList.length>0){
					//BACKTRACK
					move.value = [...checkpoint.move]
					board.value = checkpoint.board.map(row => [...row])

					if(!firstGuess){
						taeIndex++;
					}
					firstGuess = !firstGuess
					if(taeIndex>=taeList.length){
						ordinal++;
						// console.log('GUESSING....');
						if(wallOrIsland == 'wall'){
							taeList = await getPossibleWallMoves(ordinal);
							if(taeList.length==0){
								ordinal=1;
								wallOrIsland='island';
								firstGuess = true;
							}
						}
						if(wallOrIsland == 'island'){
							taeList = await getPossibleIslandMoves(ordinal);
							// console.log(ordinal , taeList)
							if(taeList.length==0){
								console.log('Nothing else to test')
								break;
							}
						}

						checkpoint = {
							move: [...toRaw(move.value)],
							board: toRaw(board.value).map(row => [...row])
						}
						taeIndex = 0;
					}

				}else{
					// console.log('GUESSING....');
					taeList = await getPossibleWallMoves();
					checkpoint = {
						move: [...toRaw(move.value)],
						board: toRaw(board.value).map(row => [...row])
					}
					taeIndex = 0;
				}

				await sleep(5);
				guessCtr++;
				const taePt = {x: taeList[taeIndex][0], y: taeList[taeIndex][1]};
				console.log(`%cTest ${guessCtr}: Set [${taePt.x},${taePt.y}] to ${firstGuess?'●':'■'}`, "color:aqua");
				setSquare(taePt.x, taePt.y, firstGuess?'down':'up');
				move.value.push( {action:'guess', changes:[[taePt.x, taePt.y, firstGuess?'down':'up']]})

			}

		}while(sentry>0);


		if(!isValid) console.log("In Violation")
		console.log(`TOTAL time to solve: ${(performance.now()-fnStart).toLocaleString()}ms`)
		console.log('COMPLETE')
	}catch(ex){
		throw ex;
	}finally{
		$("#btnFillUnreachable").prop('disabled', false);
	}

}
async function nextStep(){
	try{
		const simpleCheats:string[] = [
			"completeIsland",
			"fillUnreachable",
			"fillSingleOptions",
			"edgeExit",

			// "fillThreatenedCell",
			// "hiddenIslandExpansion",
			// "hiddenWallExpansion",
			// "hiddenIsletExpansion",
		];
		const midCheats:string[] = [
			// "completeIsland",
			// "fillUnreachable",
			// "fillSingleOptions",
			// "edgeExit",

			"fillThreatenedCell",
			"hiddenIslandExpansion",
			"hiddenWallExpansion",
			"hiddenIsletExpansion",
		];


		$("#btnNextStep").prop('disabled', true);


		let cheatOp={value:""};
		let promises:any[] = [];


		const opStart = performance.now();

		let board_l:any[][] = toRaw(board.value).map(row => [...row]);
		let boardClass_l:any[][] = toRaw(boardClass.value).map(row => [...row]);

		for(const cheat of simpleCheats){
			promises.push(Cheat[cheat]( board_l, boardClass_l ))
		}
		let res = await Promise.any(promises).catch(ex=>{});

		if(res?.changes == undefined){
			for(const cheat of midCheats){
				res = await Cheat[cheat]( board_l, boardClass_l ).catch((e) =>{});
				if(res?.changes.length>0){

					cheatOp.value = res.action;
					break;
				}
			}
		}

		if(res?.changes?.length>0){
			res.changes.forEach((value:any[])=>{
				board_l[value[0]][value[1]] = value[2]=="up"?" ■":" ●";
			})
			cheatOp.value = res.action;
			board.value = board_l;
			move.value.push(res);
			move_r.value=[];

			console.log(`%c${cheatOp.value}: ${(performance.now()-opStart).toLocaleString()}ms`, 'color:palegoldenrod');
			await sleep(5)

			let isValid = await isNotInViolation()
			let isSolved = await validateBoard(false);

			$.toast({
				text: res.action,
				icon: 'success',
				showHideTransition: 'fade',
				position: 'bottom-right',
				loader:false,
				hideAfter: 2000,
			})
		}else{
			$.toast({
				text: 'No changes',
				icon: 'success',
				showHideTransition: 'fade',
				position: 'bottom-right',
				loader:false,
				hideAfter: 2000,
			})
		}

	}catch(ex){
		throw ex;
	}finally{
		$("#btnNextStep").prop('disabled', false);
	}
}
async function getPossibleWallMoves(ordinal=1){
	const boardClass_l = boardClass.value;
	const board_l = board.value;

	let wallVisited:number[] = [];
	let allMoves = [];
	let ctr = 0;

	for(const [x, row] of board_l.entries()){
		for( const [y, cell] of row.entries()){
			if(cell != " ■") continue;

			const wallId = boardClass_l[x][y].wall_id;
			if(wallVisited.includes(wallId)) continue;
			wallVisited.push(wallId);
			const possibleMoves = await highlightWall([x,y]);
			allMoves.push(possibleMoves);
			clearHighlight()

			if(possibleMoves.length!=2) continue;
			ctr++
			if(ctr != ordinal) continue;
			return possibleMoves;

		}
	}
	let movesSize = 3;
	const movesSizeLmit = 10;
	do{
		ctr=0;
		for(const moves of allMoves){
			if(moves.length!=movesSize) continue;
			ctr++
			if(ctr != ordinal) continue;
			return moves;
		}
		movesSize++;
	}while(movesSize<movesSizeLmit);

	return [];
}
async function getPossibleIslandMoves(ordinal=1){
	let allMoves:any = [];
	let ctr = 0;

	for(const hint of hints.value){
		const possibleMoves = await getIslandMoves(hint);
		if(possibleMoves.length==0) continue;
		if(allMoves[possibleMoves.length] == undefined) allMoves[possibleMoves.length]=[];
		allMoves[possibleMoves.length].push(possibleMoves);
		clearHighlight()

		if(possibleMoves.length!=2) continue;
		ctr++
		if(ctr != ordinal) continue;
		return possibleMoves;
	}
	allMoves = allMoves.flat()
	for(const [i,moves] of allMoves.entries()){
		if(i+1 != ordinal) continue;
		return moves;
	}

	return [];
}
function getIslandMoves(square:number[]){
	const boardClass_l = boardClass.value;
	const board_l = board.value;
	let moves = [];

	for(const [x, row] of boardClass_l.entries()){
		for( const [y, cell] of row.entries()){
			if(board_l[x][y] != "  ") continue;
			if( !cell.possible_roots.some(v=>v[0]==square[0] && v[1]==square[1]) ) continue;

			// remove because of situation with island with islet
			// let isPerimeter = false;
			// for(const d of Object.values(directions)){
			// 	const near = [x+d[0],y+d[1]];
			// 		if( !(boardClass.value[near[0]] && boardClass.value[near[0]][near[1]]) ) continue; //edge
			// 		const nearClass = boardClass.value[near[0]][near[1]];
			// 		if( !nearClass.possible_roots.some(v=>v[0]==square[0] && v[1]==square[1]) )  { isPerimeter=true; break;} //edge;
			// }
			// if(!isPerimeter) continue;

			moves.push([x,y])
		}
	}
	return moves;
}


// ++++++UTIL

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
function isNumber(value:any) {
	return !isNaN(parseFloat(value)) && isFinite(value);
}
function ucfirst(str) {
	if (!str) return str; // Handle empty or null strings
	return str.charAt(0).toUpperCase() + str.slice(1);
}
function getTimezoneOffset():string{
	let offset = (new Date).getTimezoneOffset();
	let sign = offset<0?'+':'-';
	let hour = ('0'+Math.abs(offset/60)).slice(-2);
	let minute = ('0'+offset%60).slice(-2);
	return `${sign}${hour}:${minute}`;
}

// ------UTIL

// ++++++PINCH

// Global vars to cache event state
const evCache = [];
let prevDiff = 100000;
let prevCoord = [100000,100000, true];
// Install event handlers for the pointer target
let el;


function pointerdownHandler(ev) {
	// The pointerdown event signals the start of a touch interaction.
	// This event is cached to support 2-finger gestures
	evCache.push(ev);
}
function pointermoveHandler(ev) {
	// This function implements a 2-pointer horizontal pinch/zoom gesture.
	//
	// If the distance between the two pointers has increased (zoom in),
	// the target element's background is changed to "pink" and if the
	// distance is decreasing (zoom out), the color is changed to "lightblue".

	// Find this event in the cache and update its record with this event
	const index = evCache.findIndex(
		(cachedEv) => cachedEv.pointerId === ev.pointerId,
	);
	evCache[index] = ev;

  	// If two pointers are down, check for pinch gestures
	if (evCache.length === 2) {
		if($("#gameboard").hasClass('won')) return;

		// Calculate the distance between the two pointers
		const curDiff = Math.sqrt(Math.pow(evCache[0].clientX - evCache[1].clientX,2)+Math.pow(evCache[0].clientY - evCache[1].clientY,2));

		if(prevDiff !== 100000){
			// console.log(curDiff-prevDiff)
			let newZoom = parseFloat(boardZoom.value) + ((curDiff-prevDiff)/8);
			newZoom = Math.min(newZoom, maxZoom.value);
			newZoom = Math.max(minZoom.value, newZoom);
			boardZoom.value = newZoom.toFixed(1);
		}

		// Cache the distance for the next move event
		prevDiff = curDiff;
	}
	else if(evCache.length === 1){
		let xCoord = evCache[0].clientX;
		let yCoord = evCache[0].clientY;
		if(prevCoord[0] !== 100000){
			let xDiff = xCoord - prevCoord[0];
			let yDiff = yCoord - prevCoord[1];

			//make less sensitive
			const moveDiff = Math.sqrt(Math.pow(xDiff,2) + Math.pow(yDiff,2));
			if(prevCoord[2]){
				if(moveDiff<20) return;
				prevCoord[2] = false;
			}

			const boardWrapper = document.getElementById('wrap_board');
			const mainWrapper = document.querySelector('main');
			mainWrapper.scrollBy({top: -yDiff})
			boardWrapper?.scrollBy({left: -xDiff})
		}
		prevCoord[0] = xCoord;
		prevCoord[1] = yCoord;
	}
}
function pointerupHandler(ev) {
	// Remove this pointer from the cache and reset the target's
	// background and border

	// Remove this event from the target's cache
	const index = evCache.findIndex(
		(cachedEv) => cachedEv.pointerId === ev.pointerId,
	);
	evCache.splice(index, 1);


	// If the number of pointers down is less than two then reset diff tracker
	if (evCache.length < 2) {
		prevDiff = 100000;
	}
	if (evCache.length < 1) {
		prevCoord = [100000,100000, true];
	}
}

// ------PINCH ACTION


// ++++++ Restrictions

function isNotInViolation(){
	return new Promise<boolean>(async resolve => {
		// console.log('checking violation')

		let isValid = true;;
		if(!isNotContainMultiHint()){resolve(false); return;}
		if(!isIsletReachable()){resolve(false); return;}

		let promises = [];
		for(const hint of toRaw(hints.value)){
			promises.push( isValidIsland(hint[0],hint[1]));
		}
		// let wallIdTally:any[] = [];
		for(const [x, row] of boardClass.value.entries()){
			for(const [y, cell] of row.entries()){
				if(!boardClass.value[x][y].wall) continue;

				// const wallId = cell.wall_id;
				// if(wallIdTally.includes(wallId)) continue;
				// wallIdTally.push(wallId);
				promises.push(isValidWall(x,y));

				if(x<boardClass.value.length-1 || y<row.length-1){
					promises.push(is2x2Wall(x,y));
				}
			}
		}
		isValid = (await Promise.all(promises)).reduce(
			(accumulator:any, currentValue:any) => accumulator && currentValue,
			isValid,
		);

		resolve(isValid)
	});
}

function is2x2Wall(x:number, y:number){
	return new Promise<boolean>( resolve =>{
		const boardClass_l = boardClass.value;
		const board_l = board.value;
		let queue:any[] = [];
		for(let i=0; i<2; i++){
			for(let j=0; j<2; j++){
				if(boardClass_l[x+i] && boardClass_l[x+i][y+j] && board_l[x+i][y+j] == " ■"){
					queue.push({x:x+i, y:y+j})
				}
			}
		}
		if(queue.length!=4){
			resolve(true);
		}else{
			queue.forEach(value => boardClass.value[value.x][value.y].invalid = true);
			console.log("2x2 wall");
			resolve(false);
		}
	})
}
function isValidIsland(x:number, y:number){
	return new Promise<boolean>( (resolve, reject) =>{

		const boardClass_l = boardClass.value;
		const board_l = board.value;

		const rootCell = boardClass_l[x][y].root_hints[0];
		const hintVal = parseInt(board_l[rootCell[0]][rootCell[1]]);
		const islandSize = boardClass_l[x][y].island_size;

		let queue:any[] = [{x:rootCell[0],y:rootCell[1]}];
		let blanks:any[] = [];

		for(let i=0; i<queue.length; i++){
			const cell = queue[i];

			for(const direction of Object.values(directions)){
				const near = {x:cell.x+direction[0], y:cell.y+direction[1]};
				if( !(boardClass_l[near.x] && boardClass_l[near.x][near.y]) ) continue;


				if(board_l[near.x][near.y] == "  "){
					if(blanks.some(b=>b.x==near.x && b.y==near.y)) continue;
					blanks.push(near);
				}else if(board_l[near.x][near.y] == " ●"){
					if(queue.some(q=>q.x==near.x && q.y==near.y)) continue;
					queue.push(near);
				}
			}
		}
		// island is too big;
		if(hintVal<islandSize){
			console.log(`island [${x}, ${y}] is too big`)
			queue.forEach(value => boardClass.value[value.x][value.y].invalid = true);
			resolve(false); return;
		}
		// island is too small and no expansion option
		if(hintVal>islandSize && blanks.length==0){
			console.log(`island [${x}, ${y}] is too small`, hintVal, islandSize)
			queue.forEach(value => boardClass.value[value.x][value.y].invalid = true);
			resolve(false); return;
		};

		resolve(true); return;
	})
}
function isValidWall(x:number, y:number){
	return new Promise<boolean>(resolve => {
		const boardClass_l = boardClass.value;
		const board_l = board.value;

		let queue:any[] = [{x:x,y:y}];
		let blanks:any[] = [];


		for(let i=0; i<queue.length; i++){
			const cell = queue[i];


			for(const direction of Object.values(directions)){
				const near = {x:cell.x+direction[0], y:cell.y+direction[1]};
				if( !(boardClass_l[near.x] && boardClass_l[near.x][near.y]) ) continue;

				if(board_l[near.x][near.y] == "  "){
					if(blanks.some(b=>b.x==near.x && b.y==near.y)) continue;
					blanks.push(near);
				}else if(board_l[near.x][near.y] == " ■"){
					if(queue.some(q=>q.x==near.x && q.y==near.y)) continue;
					queue.push(near);
				}
			}
		}

		if(blanks.length>0){ resolve(true); return;}// wall with adjacent blank, can still be expanded

		// check if there is more wall not connected to this wall. If there is,
		// 		then this wall is not valid because it should be one connected wall
		for(const [x,row] of boardClass.value.entries()){
			for(const [y,cell] of row.entries()){
				if(!cell.wall) continue;
				if(queue.some(q=>q.x==x && q.y==y)) continue;
				queue.forEach(value => boardClass.value[value.x][value.y].invalid = true);
				// console.log('Isolated wall' )
				resolve(false);
				return;
			}
		}

		resolve(true);
	});
}
function isNotContainMultiHint():boolean{
	let violationCtr = 0;
	for(const [x, row] of boardClass.value.entries()){
		for(const [y, cell] of row.entries()){
			if(cell.root_hints.length<=1) continue;
			violationCtr++;
			cell.invalid = true;
		}
	}
	if(violationCtr!=0){
		console.log("island contains multiple hint")
	}

	return (violationCtr==0)
}
function isIsletReachable():boolean{
	let violationCtr = 0;
	for(const [x, row] of boardClass.value.entries()){
		for(const [y, cell] of row.entries()){
			if(cell.possible_roots.length>0) continue;
			if(board.value[x][y] != " ●") continue
			violationCtr++;
			cell.invalid = true;
		}
	}
	if(violationCtr!=0){
		console.log("islet is not reachable")
	}
	return (violationCtr==0)
}

// ------ Restrictions




// import 'bootstrap/dist/css/bootstrap.min.css'

function fixHorizontalRuler(event){
	let gameActionHeight = $('#wrap_gameactions').height();
	let scrollY = $('main').scrollTop()-100;
	rulerH_fixed.value.rulerH_fixed = scrollY>gameActionHeight;
	console.log("top", scrollY, gameActionHeight)

}
// window.addEventListener('scroll', (event)=>{

// 	let scrollY = $('main').scrollTop();
// 	console.log('scroll', scrollY)
// })
$(document).on('scroll', "*", (event)=> {
	event.stopPropagation();
	console.log(event.target)
    // if ($(this).scrollTop() > 100) {
    //     console.log("User scrolled down more than 100px");
    // }
});
// $(document).on('click', "*", (event)=> {
// 	event.stopPropagation();
// 	console.log(event.target)
//     // if ($(this).scrollTop() > 100) {
//     //     console.log("User scrolled down more than 100px");
//     // }
// });

</script>
<!-- <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script> -->
<style lang='css' scoped>
	@import url('bootstrap/dist/css/bootstrap.min.css');
	@import url('https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css');
	@import url('./board.css');

</style>

<template >

	<Head title="Board" />

	<AppLayout :breadcrumbs="breadcrumbs"
		tabindex='0'
		@blur='unfocusPage()' @focus='focusPage()'
		@keyup.ctrl.z.exact='undo()'
		@keyup.ctrl.shift.z.exact='redo()' @keyup.ctrl.y.exact='redo()'
		@wheel.keyup.ctrl.stop.prevent="scrollZoom($event)"
		@keyup.shift.alt.r.exact="randomFetch"
		@keyup.alt.q.exact="getIslandMoves([10,0])"
		@scroll="fixHorizontalRuler"
		>
		<!-- @wheel.exact="fixHorizontalRuler" -->
		<div id='nurikabe' class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4"
			@click.exact='resetHighlighting()'
			ref="loadingContainer"
		>
			<loading id="continueLoader" v-model:active="overlayContinue" :can-cancel="true"
				:on-cancel="handleContinueLoader"
			>
				<div class="loaderText">Click to continue</div>
			</loading>
			<div class="d-flex justify-between items-baseline">
				<h4>{{ ucfirst(difficulty) }}: {{ dateFilter }} </h4>
				<button type="button" class="btn btn-outline-primary" @click="showHelp" style="font-size:1.5em">&#9432;</button>
			</div>
			<div id='wrap_gameactions'>
				<div id='fullboardchange' style='margin: 1em auto; text-align: center;'>
					<button type="button" class='btn btn-primary' @click="showNewBoard" id='btnNew'>New</button>
					<button type="button" class='btn btn-success' @click='resetBoard()'	 id="btnReset" disabled>Reset</button>
					<button type="button" class='btn btn-success' @click='saveBoard()' id="btnSave" disabled>Save</button>
					<button type="button" class='btn btn-success' @click='loadBoard()' id="btnLoad" disabled>Load</button>
					<!-- | -->
					<!-- <div class="form-check form-switch form-check-inline " :data-bs-theme="isDark?'dark':'light'"
						onchange="$('#wrap_cheat').toggle()"
					>
						<label><input type="checkbox" class="form-check-input">Cheat</label>
					</div> -->
					<!-- <button type="button" class='btn btn-primary'  id='btnTest' @click="getPossibleWallMoves">Test fn</button> -->
					<!-- <div id="wrap_cheat" style="display: none;"> -->
						<br>
						<br>
						<select name="" id="ddlCheatOps" class="dropdownAction" @change="doCheatAction($event)"
							style="width:6em;"
						>
							<option>Cheat op</option>
							<option value="completeIsland">Complete Island</option>
							<option value="fillSingleOptions">Single options</option>
							<option value="fillThreatenedCell">Threatened Cells</option>
							<option value="fillUnreachable">Unreachable</option>
							<option value="edgeExit">Edge Exit</option>
							<option value="hiddenIslandExpansion">Hidden Island Expansion</option>
							<option value="hiddenWallExpansion">Hidden Wall Expansion</option>
							<option value="hiddenIsletExpansion">Hidden Islet Expansion</option>

						</select>
						<button type="button" class='btn btn-primary'  id='btnNextStep' @click="nextStep">Assist</button>
						<button type="button" class='btn btn-primary'  id='btnFillUnreachable' @click="cycleCheat">Solve</button>

					<!-- </div> -->

				</div>
				<div style="margin-bottom: .25em;">
					<div style='width: 20em; display:flex; margin:auto; align-items: center; justify-content: space-around;'>
						<div style='font-family: monospace; font-size: 1.5em; opacity: .6;'>{{gameTimer}}</div>
						<TooltipBase :tooltip=pb as-child>
							<div id="flag_pb">PB</div>
						</TooltipBase>
						<div>
							<input type='button' id="btnUndo" class="btn btn-primary" value="<<" title='Undo' @click="undo()" disabled>
							<input type='button' id="btnRedo" class="btn btn-primary" value=">>" title='Redo' @click="redo()" disabled>
						</div>
					</div>
				</div>
				<!-- <input type="range" name="" id="rangeZoom" v-model='boardZoom' :min="minZoom" :max='maxZoom' step=".1" disabled style="width:100%;" > -->
			</div>
			<div id='wrap_main'>
				<div id="wrap_board">
					<!-- <div id="board_ruler_horizontal" :class="rulerH_fixed">
						< !-- <div class="ruler_item"></div> -- >
						<div class="ruler_item" v-for='(_, y) in board[0].length' :key='y'>
							{{ y }}
						</div>
					</div> -->

					<table id='gameboard' class="won">
						<!-- <thead>
							<tr>
								<td class='board_ruler'	style=" width: 0px; "></td>
								<td v-for='(_, y) in board[0].length' :key='y' class='board_ruler ruler_horizontal' :class="rulerH_fixed">
									{{ y }}
								</td>
							</tr>
						</thead> -->
						<tbody>
							<tr v-for='(_,x) in board.length' :key='x' class=''>
								<!-- <td class='board_ruler ruler_vertical'>
									{{ x}}
								</td> -->
								<td v-for='(_, y) in board[x].length' :key='y' class='square'
									@click="setSquare(x, y)"
									@contextmenu="highlightEntity(x,y)"
									:class='boardClass[x][y]'
									:id="'item-'+x+'_'+y"
									:title="cellStatus(x,y)"
								>
									<!-- :title="x+','+y+'\naaa'" -->
									{{ board[x][y] }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div id="wrap_moves" style="height:200px; overflow-y:auto; display: none;">
					<table>
						<tr>
							<td>#</td>
							<th>Moves</th>
						</tr>
						<tr v-for='(_,x) in move.length' :key="x">
							<td style="vertical-align: top;padding-right:.5em;">{{move.length - x-1}}</td>

							<td>
								<div style="font-weight: bold;">{{move[move.length - x-1].action}}</div>
								{{move[move.length - x-1].changes}}
							</td>
						</tr>

					</table>
					<!-- <ol>
						<li v-for='(_,x) in move.length' :key="x">
							{{move.length - x-1}}: {{move[move.length - x-1]}} <br><br>
						</li>
					</ol> -->
				</div>
			</div>

			<!-- Modal -->
			<div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true"
				:data-bs-theme="isDark?'dark':'light'"
			>
				<div class="modal-dialog">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="exampleModalLabel">Congratulation</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							You Won!
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
							<!-- <button type="button" class="btn btn-primary">Save changes</button> -->
						</div>
					</div>
				</div>
			</div><!-- end Modal-->
			<!-- Modal -->
			<div class="modal fade" id="helpModal" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true"
				:data-bs-theme="isDark?'dark':'light'"
			>
				<div class="modal-dialog">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="helpModalLabel">Help</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							Definition
							<ul>
								<li>Wall cells are full filled cell</li>
								<li>Hint cells are cell with a number.</li>
								<li>Island cells are cell with a dot.</li>
							</ul>
							<span>Controls</span>
							<ul>
								<li>Click/tap a cell to fill a wall. Click/tap again to turn it to island. Click/tap again to return it to empty.</li>
								<li>HINT cell + rightclick/longpress = show possible move and count island size. </li>
								<li>WALL cell + rightclick/longpress = highlight contigous wall. </li>
								<li>Ctrl+Z = Undo</li>
								<li>Ctrl+Y or Ctrl+Shft+Z = Redo</li>
							</ul>
							<span>Quality of Life</span>
							<ul>
								<li>The first few walls are filled in.</li>
							</ul>

						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
							<!-- <button type="button" class="btn btn-primary">Save changes</button> -->
						</div>
					</div>
				</div>
			</div><!-- end Modal-->
			<!-- Modal -->
			<div class="modal fade" id="newBoardModal" tabindex="-1" aria-labelledby="newBoardModal" aria-hidden="true"
				:data-bs-theme="isDark?'dark':'light'"
			>
				<form class="modal-dialog" @submit.prevent="gotoNewPage()" @keyup.enter.exact="gotoNewPage()" >
					<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="newBoardModalLabel">New Board</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<table id='tbl_filter' style="width:100%;">
							<!-- <input type='file' id='inputFile' value="F:\Porfolio\Nurikabe Solver\puzzles\puzzle001.csv">
							<input type='button' value='Submit' class="btn btn-primary" onclick="$('#inputFile').change()"> -->
							<select name='' id='ddlPuzzle' autocomplete="off" style='display: none;'>
								<option value=''>Select item</option>
								<!-- <?php foreach ($files1 as $key => $value) {
									if (in_array($value,array(".",".."))) continue;
									echo "<option>$value</option>";
								}?> -->
							</select>
							<tr>
								<td>
									Size <br>
									<div class="flex">
										<div class="wrap_option">
											<div v-for="(difficulty) in difficulties"><label>
												<input type="radio" name="difficulty" :value="difficulty" v-model="newDifficulty">
												{{ ucfirst(difficulty) }}
												<template v-if="completedSizes.includes(difficulty)">✓</template>
											</label></div>
										</div>
									</div>
								</td>
							</tr>
							<tr>
								<td>
									Date
									<VueDatePicker id='api_date' v-model="date" inline auto-apply :enable-time-picker="false"
										class="justify-center"
										:dark="isDark" week-start="0"
										:min-date="new Date('2005/01/01')"
										:max-date="new Date()"
									></VueDatePicker>
								</td>
							</tr>
						</table>
					</div>
					<div class="modal-footer">
						<button type='button' class='btn btn-primary' @click="gotoNewPage()">Submit</button>
						<input  type='button' value='Random' class='btn btn-primary' @click='randomFetch()' />
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
					</div>
					</div>
				</form>
			</div><!-- end Modal-->
		</div>
	</AppLayout>
	<!-- <ToastRoot>


	</ToastRoot> -->
</template>

