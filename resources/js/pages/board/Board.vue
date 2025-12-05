<script setup lang="ts">
import axios from 'axios';
import AppLayout from '@/layouts/AppLayout.vue';
import { SharedData, type BreadcrumbItem, type User } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/vue3';
import PlaceholderPattern from '../../components/PlaceholderPattern.vue';
import {onMounted, ref, watch, toRaw, useTemplateRef, useId, onUnmounted} from 'vue';
import { useDark, useToggle } from '@vueuse/core'

import "https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"

import {useLoading} from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css';

//VueDatePicker: https://vue3datepicker.com/
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

// import 'bootstrap';
import {Tooltip} from 'bootstrap';


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
// console.log(curUser);

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
let hints = [];
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
const move:any = ref([]);// :number[][] = [];
const move_r:any = ref([]);// :number[][] = [];

const difficulty = ref('');
const date = ref();

const newDifficulty = ref();
const dateFilter = ref();

const gameTimer = ref("00:00");
const timerval1 = ref(0);
let timerRunning = false;
let interval1 = null;//setInterval(()=>{timerval1.value++}, 1000);

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

const boardClass:any = ref([]);
const boardZoom = ref(30);
const maxZoom = ref(40);
const minZoom = ref(6);
const newPageLoader = ref();

const isDark = useDark()
// const toggleDark = useToggle(isDark)

const minDate = new Date("2005/01/01").getTime();
const maxDate = Date.now();
const difficulties = ref(['small', 'medium', 'large', 'mixed']);

$(document).on('show.bs.modal', '.modal', async (event) =>{
	await sleep(1)
	$('.modal-backdrop').attr(`data-${scopeId}`,"")
})
$(document).on('show.bs.tooltip', '[data-bs-title]', async (event) =>{
	await sleep(1)
	$('.bs-tooltip-auto').attr('data-'+scopeId,"");
	$('.bs-tooltip-auto').attr('data-bs-theme',isDark?"dark":"light");
	$('.tooltip-arrow').attr('data-'+scopeId,"");
	$('.tooltip-inner').attr('data-'+scopeId,"");
})

onMounted(()=>{
	difficulty.value = 'small';
	if(difficulties.value.includes(props.size)){
		difficulty.value = props.size;

	}
	const timezoneoffset = getTimezoneOffset();
	let initMonth = props.month||'';
	let initDay  = props.day||'';
	let initDate = '';

	if(initMonth.length<2) initMonth = '0'+initMonth;
	if(initDay.length<2) initDay = '0'+initDay;
	initDate = `${props.year||''}-${initMonth}-${initDay}T00:00:00${timezoneoffset}`
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

	el = document.getElementById("wrap_board");
	el.onpointerdown = pointerdownHandler;
	el.onpointermove = pointermoveHandler;

	// Use same handler for pointer{up,cancel,out,leave} events since
	// the semantics for these events - in this app - are the same.
	el.onpointerup = pointerupHandler;
	el.onpointercancel = pointerupHandler;
	// el.onpointerout = pointerupHandler; kpl(2025-11-07): commented because it's firing too much
	el.onpointerleave = pointerupHandler;

	$('main').css('overflow', 'auto')
	$('main').css('height', 'calc(100vh - 1em)')
	$('#btnNew').focus();

	scopeId = Object.keys($("#nurikabe").data()).find(elem => elem.includes('v-'));
	// console.log(scopeId)
	$('.modal-backdrop').remove()

	new Tooltip(document.body, {
      selector: "[data-bs-toggle='tooltip']",
    })
	// $('#flag_pb').tooltip('show');
	// $('#flag_pb').tooltip('hide');


	findPuzzleByDate();
	getPersonalBest();
})
onUnmounted(()=>{
	if(newPageLoader.value === undefined) return
	newPageLoader.value.hide()
})

watch(board, (newBoard)=>{
	$("#gameboard").removeClass('won');

	$('#btnReset').prop('disabled', false);
	$('#btnUndo').prop('disabled', false);
	$('#btnRedo').prop('disabled', false);
	$('#btnSave').prop('disabled', false);
	// $('#btnLoad').prop('disabled', false);
	$('#rangeZoom').prop('disabled', false);

	clearBoard(newBoard)

})
watch(timerval1, (newVal)=>{
	let second =  String(newVal%60).padStart(2,'0');
	let minute =  String(parseInt(newVal/60)).padStart(2,'0');
	gameTimer.value = minute+":"+second;
})
watch(boardZoom, (val)=>{
	// console.log(val);
	// $('#gameboard').css('transform', 'scale('+val+')');
	$('#nurikabe').css('--sqr_size', val+'px');

	const boardWrap:number = parseFloat($('#wrap_board').css('width').slice(0,-2));
	const gameboard:number = parseFloat($('#gameboard').css('width').slice(0,-2));

	if(gameboard<=boardWrap){
		$('#gameboard').removeClass('zoomed')
		zoomed = false;
	}else{
		$('#gameboard').addClass('zoomed')

		if(!zoomed){
			zoomed = true;
			$('#wrap_board').get(0).scrollBy({left:50})
		}
	}
})

clearBoard(board.value)

function saveBoard(){
    localStorage.setItem('board', JSON.stringify(board.value??[[' ']]));
    localStorage.setItem('move', JSON.stringify(move.value??[[' ']]));
	$("#btnLoad").prop('disabled', false)
}
function loadBoard(){
	board.value = JSON.parse(localStorage.getItem('board')??"[[ ]]");
	move.value = JSON.parse(localStorage.getItem('move')??"[[ ]]");
	move_r.value = [];
}

function clearBoard(newBoard:any){
	totalClue = 0;
	boardSize = 0;
	hints = [];
	boardClass.value = [[]]
	newBoard.forEach((row:any,indexX:number) => {
		boardClass.value[indexX] = [];
		row.forEach((column:any, indexY:number) =>{
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
				"roothint": "",
				hint: isNumber(column)
			}
			if(isNumber(column)){
				hints.push([indexX,indexY])
				totalClue+=parseInt(column);
			}
		});
	});
	boardSize = (newBoard.length)*(newBoard[0].length)
	isHighlighting = false;
	autofill();
}
function resetHighlighting(){
	if(!isHighlighting) return;

	clearHighlight();
	isHighlighting = false;
}

async function setSquare(x:number, y:number, state=''){
	const value = board.value[x][y];
	let validateDelay = null;

	clearTimeout(validateDelay);
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

	event.preventDefault();
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
		move.value.push([x,y]);
		move_r.value= [];
	}
	// console.log(move.value);

	boardClass.value[x][y]['wall'] = board.value[x][y] == ' ■'
	setTimeout(validateBoard,1);
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
			element['roothint']="";
		});
	});
}
async function highlightEntity(x:number,y:number){
	event.preventDefault();

	clearHighlight();

	isHighlighting = true;

	if(boardClass.value[x][y]['wall']){
		highlightWall([x,y])
	}
	if(isNumber(board.value[x][y]) || board.value[x][y] == " ●"){
		await highlightIsland([x,y])
	}

}
function highlightWall(square:number[]) {
	const queue = [square];

	for (let i = 0; i < queue.length; i++) {
		const value = queue[i];

		boardClass.value[value[0]][value[1]].visited = true;
		let neighboringSquare = [];

		Object.entries(directions).forEach(async([direction,coord]) => {
			boardClass.value[value[0]][value[1]]['wall_highlighted-'+direction] = true;
			if(boardClass.value[value[0]+coord[0]] == undefined) return;

			neighboringSquare = boardClass.value[value[0]+coord[0]][value[1]+coord[1]];
			if(neighboringSquare== undefined) return;
			if(neighboringSquare.visited){
				boardClass.value[value[0]][value[1]]['wall_highlighted-'+direction]=false;
				boardClass.value[value[0]+coord[0]][value[1]+coord[1]]['wall_highlighted-'+inverseDirections[direction]]=false;
				return;
			}

			// hightlight possible moves excluding corners
			if(
				board.value[value[0]+coord[0]][value[1]+coord[1]] == '  ' &&
				!neighboringSquare.corner_checked
			){
				neighboringSquare.corner_checked = true;
				if(!await isCorner(value[0]+coord[0],value[1]+coord[1])){
					boardClass.value[value[0]+coord[0]][value[1]+coord[1]].island_highlighted = true;
				}
			}


			if(!neighboringSquare.wall) return;

			queue.push([value[0]+coord[0],value[1]+coord[1]])
		});
	}
}
async function highlightIsland(square:number[], isIgnoreIsles = false) {
	return new Promise(async (resolve)=>{
		try{
			let queue = [square.toString()];
			const blankQueue:number[][] = [];
			let remainder = 0;
			let hintVal;
			let hintCells = [];


			//highlight the hint square and isle squares
			for (let i = 0; i < queue.length; i++) {
				const value = queue[i].split(',');
				value[0] = parseInt(value[0]);
				value[1] = parseInt(value[1]);

				boardClass.value[value[0]][value[1]].visited = true;
				boardClass.value[value[0]][value[1]].island_highlighted = true;
				// boardClass.value[value[0]][value[1]].roothint = square.toString();

				if(isNumber( board.value[value[0]][value[1]] )){
					hintCells.push(queue[i]);
				}

				Object.values(directions).forEach((coord:number[]) => {
					if(boardClass.value[value[0]+coord[0]] == undefined) return; //edge
					const neighboringSquare = boardClass.value[value[0]+coord[0]][value[1]+coord[1]];
					const newCoord = [value[0]+coord[0],value[1]+coord[1]];

					if(queue.includes(newCoord.toString())) return;
					if(neighboringSquare== undefined) return; //edge

					if(neighboringSquare.wall) return;
					// if(neighboringSquare.roothint !== "" && neighboringSquare.roothint !== square.toString()){
					// 	throw 1;
					// }
					if(neighboringSquare.visited) return;

					if(board.value[value[0]+coord[0]][value[1]+coord[1]]== "  " || isIgnoreIsles){
						boardClass.value[value[0]+coord[0]][value[1]+coord[1]].visited=true
						blankQueue.push([value[0]+coord[0],value[1]+coord[1]])
					}else{
						queue.push(newCoord.toString());
					}
				});

				remainder++;
				// if(isIgnoreIsles) break;
				// if(remainder==0) break;
			}

			$(`#item-${square[0]}_${square[1]}`).css('--count', "'"+(remainder)+"'")
			boardClass.value[square[0]][square[1]].root_highlight = true;

			if(hintCells.length!==1) throw 1;

			let value = hintCells[0].split(',');
			hintVal = board.value[value[0]][value[1]];
			remainder = hintVal-remainder;

			// assign island with hint
			queue.map((v,k)=>{
				let cellCoord = v.split(',');
				boardClass.value[cellCoord[0]][cellCoord[1]].roothint = hintCells[0];
			})

			if(remainder <= 0){
				resolve(remainder);
				return;
			}


			// Highlight possible moves//

			blankQueue.forEach((value) => {
				value.push(remainder)
				boardClass.value[value[0]][value[1]]['visited'] = false;
			});

			queue = blankQueue;

			let spaceCtr = 0;

			//highlight blank squares
			for (let i = 0; i < queue.length; i++) {
				const value = queue[i];

				if(boardClass.value[value[0]][value[1]].visited) continue;
				if(!isValidBlank(value, isIgnoreIsles)) continue;

				boardClass.value[value[0]][value[1]].visited = true;
				boardClass.value[value[0]][value[1]]['island_highlighted'] = true;
				boardClass.value[value[0]][value[1]].roothint = hintCells[0];

				Object.values(directions).forEach((coord:number[]) => {
					if(boardClass.value[value[0]+coord[0]] == undefined) return;
					const neighboringSquare = boardClass.value[value[0]+coord[0]][value[1]+coord[1]];
					const newCoord = [value[0]+coord[0],value[1]+coord[1]];
					if(neighboringSquare== undefined) return;

					if(neighboringSquare.wall) return;
					if(neighboringSquare.roothint !== "" && neighboringSquare.roothint !== hintCells[0]){
						throw 1;
					}
					if(neighboringSquare.visited) return;
					if(isNumber(board.value[value[0]+coord[0]][value[1]+coord[1]])) return;


					if(value[2]==1) return;
					const r = value[2]-1

					queue.push([value[0]+coord[0],value[1]+coord[1], r])
				});
				spaceCtr++
			}
			remainder-=spaceCtr;
			resolve(remainder)

		}catch(ex){
			resolve(ex);
		}
	})
}
function isValidBlank(value:number[], isIgnoreIsles = false){
	let response = true;

	Object.values(directions).forEach((coord:number[]) => {
		if(boardClass.value[value[0]+coord[0]] == undefined) return;

		const neighboringSquare = boardClass.value[value[0]+coord[0]][value[1]+coord[1]];
		if(neighboringSquare== undefined) return;
		if(neighboringSquare.visited) return;
		if(neighboringSquare.wall) return;
		if(board.value[value[0]+coord[0]][value[1]+coord[1]] == "  ") return;
		if(isIgnoreIsles && board.value[value[0]+coord[0]][value[1]+coord[1]] == " ●") return;

		response = false;
		return 0;
	});

	return response;
}

function reset(){
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
	timerval1.value=0;
	timerRunning = false;
	clearInterval(interval1);
}

async function validateBoard(){
	let wallCount = 0;
	let root:number[] = [];

	board.value.forEach((row:any, x:number) => {
		row.forEach((column:any, y:number) =>{
			if(column != " ■") return;
			wallCount++;
			if(root.length==0) root = [x,y]
		});
	});
	if(boardSize !== wallCount+totalClue) return;

	// console.log('validating...')
	let result:any = false;

	// console.log('checkHas1Wall')
	result = await checkHas1Wall(root);
	clearHighlight()
	// console.log(result)
	if(! result) return

	// console.log('checkFor2By2')
	result = await checkFor2By2()
	// clearHighlight()
	// console.log(result)
	if(! result) return

	// clearHighlight()
	// console.log('checkHintsSatified')
	result = await checkHintsSatified()
	clearHighlight()
	// console.log(result)
	if(! result) return


	$("#gameboard").addClass('won');
	$('#btnUndo').prop('disabled', true);
	$('#btnRedo').prop('disabled', true);
	$('#btnSave').prop('disabled', true);
	$('#btnLoad').prop('disabled', true);
	$('#rangeZoom').prop('disabled', true);
	boardZoom.value = minZoom.value;

	timerRunning = false;
	clearInterval(interval1);
	// alert("You WON!");
	$("#exampleModal").modal('show')
	// console.log("You Won");

	// don't record if no user login
	if(user === null) return;
	recordWin();
}

function checkHas1Wall(square:number[]){
	return new Promise(async(resolve)=>{
		const queue = [square];
		let qString:string[] = [];

		for (let i = 0; i < queue.length; i++) {
			const value = queue[i];
			boardClass.value[value[0]][value[1]].visited = true;
			// boardClass.value[value[0]][value[1]].wall_highlighted = true;
			let neighboringSquare = [];


			Object.values(directions).forEach((coord) => {
				const newCoord = [value[0]+coord[0],value[1]+coord[1]];
				if(qString.includes(newCoord.toString())) return;

				if(boardClass.value[value[0]+coord[0]] == undefined) return;
				neighboringSquare = boardClass.value[value[0]+coord[0]][value[1]+coord[1]];
				if(neighboringSquare== undefined) return;
				if(neighboringSquare.visited) return
				if(!neighboringSquare.wall) return;

				queue.push(newCoord)
				qString.push(newCoord.toString());
			});
		}
		resolve((queue.length === boardSize-totalClue))
	})
}
function checkFor2By2(){
	return new Promise((resolve)=>{
		for (let i = 0; i < board.value.length - 1; i++) {
			for (let j = 0; j < board.value[i].length - 1; j++) {
				const cell1 = board.value[i][j];
				const cell2 = board.value[i][j + 1];
				const cell3 = board.value[i + 1][j];
				const cell4 = board.value[i + 1][j + 1];

				if ([cell1, cell2, cell3, cell4].every(cell => cell==" ■")) {
					resolve(false);
				}
			}
		}
		resolve(true);
	})
}
function checkHintsSatified(){
	return new Promise(async (resolve)=>{
		let ctr:number=0;
		for (let index = 0; index < hints.length; index++) {
			const element = hints[index];
			ctr = await highlightIsland(element, true)

			if(ctr==0) continue;

			resolve(false);
			return;
		}
		resolve(ctr==0)
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
	const newUrl = route('Board', [
		newDifficulty.value,
		date.value.getFullYear(),
		date.value.getMonth()+1,
		date.value.getDate(),
	])
	$('.modal').modal('hide')
	newPageLoader.value = $loading.show()
	router.visit(newUrl)
}

async function findPuzzleByDate(){
	let slashDate = date.value.getFullYear()+"/"+
		(date.value.getMonth()+1)+"/"+
		date.value.getDate();
	dateFilter.value = slashDate;
	newDifficulty.value = difficulty.value;

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
		// const h = data.gridHeight;
		const w = data.gridWidth;
		const g = data.data.startingGrid;

		ogboard =[[]]

		// update scale
		// const sqrSize = $('#nurikabe').css('--sqr_size').slice(0,-2);;
		let boardWidth = $('#wrap_board').css('width'); // get board width
		boardWidth = boardWidth.slice(0,-2); // remove the unit PX

		let zoom = ((boardWidth - 16)/w)/1.8;
		zoom = Math.min(zoom, 30);
		zoom = parseFloat(zoom.toFixed(1))
		minZoom.value = zoom;
		$('#nurikabe').css('--col_count', w);

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
const pb = ref('');
async function getPersonalBest(){
	try {
		$("#flag_pb").hide();
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
			throw "No Personal Best";
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
	const cell:number[] = move_r.value.pop()??[];
	if(cell.length==0) return;
	move.value.push(cell);
	setSquare(cell[0], cell[1], 'up');
}
function undo(){
	// console.log('undo')
	const cell:number[] = move.value.pop()??[];
	if(cell.length==0) return;
	move_r.value.push(cell);
	setSquare(cell[0], cell[1], 'down');
}
function autofill(){
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
		day = (Math.floor(Math.random() * 2)+30).toString().padStart(2, '0');
		the_date = new Date(`${year}/${month}/${day}`);

	}while(the_date.getTime() > Date.now())

	newDifficulty.value = difficulties.value[the_difficulty]
	date.value = the_date

	gotoNewPage()

	// findPuzzleByDate()
}
async function recordWin(){
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
		console.log(err);
	} finally {
	}

}
function focusPage(){
	// Code to execute when the tab gains focus
	// console.log('Tab is now focused');

	const tagName = document.activeElement
	if(timerRunning && interval1 === null){
		interval1 = setInterval(()=>{timerval1.value++}, 1000);
	}
}
function unfocusPage(event){
	// Code to execute when the tab loses focus
	// console.log('Tab is now blurred');
	const tagName = document.activeElement.tagName
	if(tagName === "BODY" ) return; // dont stop clock if focused element is part of the newPageLoader
	clearInterval(interval1);
	interval1 = null
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
	//
	// This function sets the target element's border to "dashed" to visually
	// indicate the pointer's target received a move event.
	//   ev.target.style.border = "dashed";

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

	//   ev.target.style.background = "white";
	//   ev.target.style.border = "1px solid black";

	// If the number of pointers down is less than two then reset diff tracker
	if (evCache.length < 2) {
		prevDiff = 100000;
	}
	if (evCache.length < 1) {
		prevCoord = [100000,100000, true];
		// console.log('boo', ev.type)
	}
}

// ------PINCH ACTION


// import 'bootstrap/dist/css/bootstrap.min.css'

</script>
<!-- <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script> -->
<style lang='css' scoped>
	@import url('bootstrap/dist/css/bootstrap.min.css');
	@import url('./board.css');

</style>

<template >

	<Head title="Board" />

	<AppLayout :breadcrumbs="breadcrumbs"
		tabindex='0'
		@blur='unfocusPage' @focus='focusPage()'
		@keyup.ctrl.z.exact='undo()'
		@keyup.ctrl.shift.z.exact='redo()' @keyup.ctrl.y.exact='redo()'
		@wheel.keyup.ctrl.stop.prevent="scrollZoom($event)"
		@keyup.shift.alt.r.exact="randomFetch"
	>
		<!-- style="max-width: calc(100vw + 300px);" -->
		<div id='nurikabe' class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4"
			@click.exact='resetHighlighting()'
			ref="loadingContainer"
		>
			<div class="d-flex justify-between items-baseline">
				<h4>{{ ucfirst(difficulty) }}: {{ dateFilter }} </h4>
				<button type="button" class="btn btn-outline-primary" @click="showHelp" style="font-size:1.5em">&#9432;</button>
			</div>
			<div id='wrap_gameactions'>
				<div id='fullboardchange' style='margin: 1em auto; text-align: center;'>
					<button type="button" class='btn btn-primary' @click="showNewBoard" id='btnNew'>New</button>
					<button type="button" class='btn btn-success' @click='reset()'	 id="btnReset" disabled>Reset</button>
					<button type="button" class='btn btn-success' @click='saveBoard()' id="btnSave" disabled>Save</button>
					<button type="button" class='btn btn-success' @click='loadBoard()' id="btnLoad" disabled>Load</button>
				</div>
				<div style="margin-bottom: .25em;">
					<div style='width: 20em; display:flex; margin:auto; align-items: center; justify-content: space-around;'>
						<div style='font-family: monospace; font-size: 1.5em; opacity: .6;'>{{gameTimer}}</div>
						<div id="flag_pb" data-bs-toggle="tooltip" :data-bs-theme="isDark?'dark':'light'" :data-bs-title=pb>
							PB
						</div>
						<div>
							<input type='button' id="btnUndo" class="btn btn-primary" value="<<" title='Undo' @click="undo()" disabled>
							<input type='button' id="btnRedo" class="btn btn-primary" value=">>" title='Redo' @click="redo()" disabled>
						</div>
					</div>
				</div>
				<!-- <input type="range" name="" id="rangeZoom" v-model='boardZoom' :min="minZoom" :max='maxZoom' step=".1" disabled style="width:100%;" > -->
			</div>
			<div>
				<div id="wrap_board">
					<table id='gameboard' class="won">
						<tr v-for='(_,x) in board.length' :key='x' class=''>
							<td v-for='(_, y) in board[x].length' :key='y' class='square'
								@click="setSquare(x, y)"
								@contextmenu="highlightEntity(x,y)"
								:class='boardClass[x][y]'
								:id="'item-'+x+'_'+y"
								:title="x+','+y"
							>
								{{ board[x][y] }}
							</td>
						</tr>
					</table>
				</div>
				<!-- <div style="display: inline-block; width: 150px; vertical-align: top; padding:.5em;">
					<table id="tbl_moves">
						<thead>
							<tr>
								<th>Move</th>
								<th style='padding:.25em .75em;'>X</th>
								<th style='padding:.25em .75em;'>Y</th>
							</tr>
						</thead>
						<tbody style="max-height:300px;">
							<tr v-for='(_,x) in move' :key='x' class=''>
								<td>{{move.length -1 - x}}</td>
								<td>{{move[move.length -1 - x][0]}}</td>
								<td>{{move[move.length -1 - x][1]}}</td>
							</tr>
						</tbody>
					</table>
				</div> -->
				<!-- <div style="display: inline-block; width: 150px; vertical-align: top; padding:.5em;">
					<table id="tbl_moves">
						<tbody style="max-height:300px;">
							<tr v-for='(_,x) in boardClass.length' :key='x' class=''>
								<td v-for='(_, y) in boardClass[x].length' :key='y' class='square'
								>
									{{ boardClass[x][y].roothint }}
								</td>
							</tr>
						</tbody>
					</table>
				</div> -->
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
							<ul>
								<li>Wall cells are full filled cell</li>
								<li>Hint cells are cell with a number.</li>
								<li>Island cells are cell with a dot.</li>
								<li>Click/tap a cell to fill a wall. Click/tap again to turn it to island. Click/tap again to return it to empty.</li>
								<li>HINT cell + rightclick/longpress = show possible move and count island size. </li>
								<li>WALL cell + rightclick/longpress = highlight contigous wall. </li>
								<li>Ctrl+Z = Undo</li>
								<li>Ctrl+Y or Ctrl+Shft+Z = Redo</li>
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
				<div class="modal-dialog">
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
										<div class="wrap_option ml-auto mr-auto">
											<label v-for="(difficulty) in difficulties">
												<input type="radio" name="" :value="difficulty" v-model="newDifficulty">
												{{ ucfirst(difficulty) }}
												  <!-- adsfadsf -->
											</label>
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
						<button type='button' class='btn btn-primary' @click='gotoNewPage()' >Submit</button>
						<input type='button' value='Random' class='btn btn-primary' @click='randomFetch()' />
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
						<!-- <button type="button" class="btn btn-primary">Save changes</button> -->
					</div>
					</div>
				</div>
			</div><!-- end Modal-->
		</div>
	</AppLayout>
</template>

