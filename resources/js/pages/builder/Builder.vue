
<script setup lang="ts">

import axios from 'axios';
import AppLayout from '@/layouts/AppLayout.vue';
import { SharedData, type BreadcrumbItem, type User } from '@/types';
import { Head, Link, router, useForm, usePage, } from '@inertiajs/vue3';
import {onMounted, ref, watch, toRaw, useTemplateRef, useId, onUnmounted, onBeforeUnmount} from 'vue';

import Loading, {useLoading} from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css';

import "https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"

// https://kamranahmed.info/toast
import "https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js"

//VueDatePicker: https://vue3datepicker.com/
import '@vuepic/vue-datepicker/dist/main.css';
import 'bootstrap';
import Input from '@/components/ui/input/Input.vue';
import { useDark } from '@vueuse/core';

import "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
import { pasteClipboard } from './pasteclipboard';


const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Builder',
		href: '/builder',
	},
];

const isDark = useDark()
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
const page = usePage<SharedData>();

const board = ref([
	["","","","","",""],
	["","", 5,"","",""],
	["", 1,"", 2,"",""],
	["","","","","", 4],
	[ 5,"","","","",""],
	["","", 2,"", 1,""],
	["","","","","", 3],
	["","","","","",""],
])

const boardZoom = ref(30);
const maxZoom = ref(40);
const minZoom = ref(6);
const newPageLoader = ref();

const rowInt = ref(5);
const colInt = ref(5);

$(document).on('show.bs.modal', '.modal', async (event) =>{
	await sleep(1)
	$('.modal-backdrop').attr(`data-${scopeId}`,"")
})

let cvReady = ref(true);


onMounted( async()=>{

	if(window.cv==null){
		const script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = 'https://docs.opencv.org/4.13.0/opencv.js';
		script.onload = () => {
			cvReady.value = false;
		}
		document.body.appendChild(script);
	}else{
		cvReady.value = false;
	}


	let imgElement = document.getElementById('imageSrc');
	let inputElement = document.getElementById('fileInput');
	inputElement.addEventListener('change', (e) => {
		imgElement.src = URL.createObjectURL(e.target.files[0]);

		const img = document.createElement("img");
		img.src = URL.createObjectURL(e.target.files[0]);
		img.onload = () => {
			processImage(img);
		};
	}, false);
	// imgElement.onload = async function(event) {
	// 	// processImage(imgElement);
	// };


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

	scopeId = Object.keys($("#nurikabe").data()).find(elem => elem.includes('v-'));
	$('.modal-backdrop').remove()

	if(localStorage.getItem('custom_board') !== null){
		board.value = JSON.parse(localStorage.getItem('custom_board')??"[[ ]]");
	}
	rowInt.value = board.value.length;
	colInt.value = board.value[0].length;

})
onUnmounted(()=>{
	if(newPageLoader.value === undefined) return
	newPageLoader.value.hide()

})

watch(boardZoom, (val)=>{
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
watch(colInt, (val)=>{
	updateDimension(val, rowInt.value);
});
watch(rowInt, (val)=>{
	updateDimension(colInt.value, val);
});

function updateDimension(column:any, row:any){

	let tempBoard:(string|number)[][]=[[]];
	for (let x = 0; x < row; x++) {
		tempBoard[x] = [];
		for (let y = 0	; y < column; y++) {
			if(board.value[x] === undefined){
				tempBoard[x][y] = "";
			}else{
				tempBoard[x][y] = board.value[x][y]??"";
			}
		}
	}
	board.value = tempBoard;


	let boardWidth = $('#wrap_board').css('width'); // get board width
	boardWidth = boardWidth.slice(0,-2); // remove the unit PX
	let zoom = ((boardWidth - 16)/column)/1.8;
	zoom = Math.min(zoom, 30);
	zoom = parseFloat(zoom.toFixed(1))
	boardZoom.value =	minZoom.value = zoom;

	// const boardWrap:number = parseFloat($('#wrap_board').css('width').slice(0,-2));
	// const gameboard:number = parseFloat($('#gameboard').css('width').slice(0,-2));
	// if(gameboard<=boardWrap){
	// 	$('#gameboard').removeClass('zoomed')
	// 	zoomed = false;
	// }else{
	// 	$('#gameboard').addClass('zoomed')

	// 	if(!zoomed){
	// 		zoomed = true;
	// 		$('#wrap_board').get(0).scrollBy({left:50})
	// 	}
	// }
}

function goPlayCustom(){
	localStorage.setItem('custom_board', JSON.stringify(board.value));
	router.visit(route('Board', ['custom']))
}

function clearBoard(){
	let tempBoard:(string|number)[][]=[[]];

	for (let x = 0; x < rowInt.value; x++) {
		tempBoard[x] = [];
		for (let y = 0; y < colInt.value; y++) {
				tempBoard[x][y] = "";
		}
	}
	board.value = tempBoard;
}

function scrollZoom(ev){
	if(ev.deltaY>0 && minZoom.value < boardZoom.value){
		boardZoom.value-=2;
		boardZoom.value = Math.max(minZoom.value, boardZoom.value)
	}else if(ev.deltaY<0 && boardZoom.value < maxZoom.value){
		boardZoom.value+=2;
		boardZoom.value = Math.min(boardZoom.value,maxZoom.value)
	}
}

function moveCell(direction: string) {
	const activeElement = document.activeElement as HTMLElement;
	if(!activeElement.classList.contains('cellInput')) return;

	const id = activeElement.parentElement?.id;
	if(id === undefined) return;
	const [x,y] = id.replace('item-','').split('_').map(Number);

	let newX = x;
	let newY = y;
	if(direction === "up") newX--;
	else if(direction === "down") newX++;
	else if(direction === "left") newY--;
	else if(direction === "right") newY++;

	if(newX<0 || newX>=board.value.length || newY<0 || newY>=board.value[0].length) return;

	const nextInput = document.getElementById(`item-${newX}_${newY}`)?.querySelector('input') as HTMLInputElement;
	nextInput.focus();
	nextInput.select();
}


async function getOpenCv() {
  let cv;
  if (cvModule instanceof Promise) {
    cv = await cvModule;
  } else {
    if (cvModule.Mat) {
      // already initialized
      cv = cvModule;
    } else {
      await new Promise((resolve) => {
        cvModule.onRuntimeInitialized = () => {
					resolve();
				}
      });
      cv = cvModule;
    }
  }
	// console.log("OpenCV.js is ready.");
  return  {cv} ;
}

function recognizeImageToText(cell:any) {
	return new Promise(async (resolve)=> {
		let canvas = document.createElement("canvas");
		cv.imshow(canvas, cell.img);

		const worker = await Tesseract.createWorker('eng');// Language code (e.g., 'eng' for English);
		await worker.setParameters({
			tessedit_char_whitelist: '0123456789',
			tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
		});

		let result=null;
		const retry = 5;
		for(let i=0; i<retry; i++){
			const ret = await worker.recognize(canvas);
			result = ret.data.text;

			if(result.length==0){
				result = "";
				break
			}
			result = result.slice(0,-1)// remove tailing \n
			if(!isNaN(result)) break; //exit loop if number
		}

		await worker.terminate();

		resolve({
			row: cell.row,
			col: cell.col,
			text: result
		});
	})
}
const processImage = async (imgElement:any)=>{
	const loader = $loading.show();

	// 1. Load image and preprocess
	let src = cv.imread(imgElement);

	// Resize (scale up 2x)
	// let dsize = new cv.Size(src.cols * 2, src.rows * 2);
	// cv.resize(src, src, dsize, 0, 0, cv.INTER_CUBIC);

	let darkMode = isImageDarkMode(src);

	let gray = new cv.Mat();
	cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY,0);

	if(darkMode){
		cv.bitwise_not(gray, gray);
	}
	// cv.GaussianBlur(gray, gray, new cv.Size(5,5), 0);


	let thresh = new cv.Mat();
	cv.adaptiveThreshold(
			gray,
			thresh,
			255,
			cv.ADAPTIVE_THRESH_GAUSSIAN_C,
			// cv.ADAPTIVE_THRESH_MEAN_C,
			cv.THRESH_BINARY_INV,
			11,
			2
	);


	// 4. Extract grid lines
	let vertical = new cv.Mat();
	let horizontal = new cv.Mat();
	let verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 45)	);
	let horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(45, 1)	);
	cv.erode(thresh, vertical, verticalKernel);
	cv.dilate(vertical, vertical, verticalKernel);
	cv.erode(thresh, horizontal, horizontalKernel);
	cv.dilate(horizontal, horizontal, horizontalKernel);


	// 5. Find grid intersections
	let intersections = new cv.Mat();
	cv.bitwise_and(horizontal, vertical, intersections);
	// cv.addWeighted(horizontal, 1, vertical, 1, 0, intersections);

	let contours = new cv.MatVector();
	let hierarchy = new cv.Mat();
	cv.findContours(
			intersections,
			contours,
			hierarchy,
			// cv.RETR_LIST,
			cv.RETR_TREE,
			cv.CHAIN_APPROX_SIMPLE
	);

	let points = [];
	for (let i = 0; i < contours.size(); i++) {
		let rect = cv.boundingRect(contours.get(i));
		points.push({
			x: rect.x + rect.width/2,
			y: rect.y + rect.height/2
		});
	}

	let rows = clusterRows(points);
	if(rows.length<2 || rows[0].length<2){
		console.log("Failed to detect grid");
		return;
	}

	let numRows = rows.length - 1;
	let numCols = rows[0].length - 1;

	let cells = [];

	for(let r=0;r<numRows;r++){
		for(let c=0;c<numCols;c++){

			let x1 = rows[r][c].x;
			let y1 = rows[r][c].y;

			let x2 = rows[r+1][c+1].x;
			let y2 = rows[r+1][c+1].y;

			let rect = new cv.Rect(
					x1+2,
					y1+2,
					x2-x1-4,
					y2-y1-4
			);

			let cell = src.roi(rect);

			cells.push({
					row:r,
					col:c,
					img:cell
			});
		}
	}

	// 9. OCR the numbers
	let board = Array(numRows)
		.fill()
		.map(()=>Array(numCols).fill(""));

	const promises = [];
	for(let cell of cells){
		if(!hasNumber(cell.img)) continue
		promises.push(recognizeImageToText(cell));
	}
	const results = await Promise.all(promises);
	for(let res of results){
		board[res.row][res.col] = res.text;
	}

	applyImageData(board);

	loader.hide();
	$("#uploadModal .btn-close").click();// workaround to close modal

	// Cleanup
	src.delete(); gray.delete(); thresh.delete();
	vertical.delete(); horizontal.delete(); intersections.delete();
	contours.delete(); hierarchy.delete();
}
function hasNumber(cell:any){

	let gray = new cv.Mat();
	cv.cvtColor(cell, gray, cv.COLOR_RGBA2GRAY);

	let th = new cv.Mat();
	cv.threshold(gray, th, 120, 255, cv.THRESH_BINARY_INV);

	let pixels = cv.countNonZero(th);

	return pixels > 100;
}
function clusterRows(points:any[], tolerance = 10){
	points.sort((a,b)=>a.y-b.y);

	let x1 = Math.min(...points.map(p=>p.x));
	let x2 = Math.max(...points.map(p=>p.x));
	let y1 = Math.min(...points.map(p=>p.y));
	let y2 = Math.max(...points.map(p=>p.y));

	let rows = [];
	for(let p of points){
		let row = rows.find(r =>
			Math.abs(r[0].y - p.y) < tolerance
		);

		if(row){
				row.push(p);
		}else{
				rows.push([p]);
		}
	}

	rows.forEach(r => r.sort((a,b)=>a.x-b.x));

	// Remove points that are close to each other
	const tolerance2 = 10;
	for(let row=0; row<rows.length; row++){
		let curCol = rows[row][0];
		let col = 1;
		while(col<rows[row].length){
			let distance = Math.sqrt( Math.pow(curCol.x - rows[row][col].x,2) + Math.pow(curCol.y - rows[row][col].y,2) );
			if(distance<tolerance2){
				rows[row].splice(col,1);
			}else{
				curCol = rows[row][col];
				col++;
			}
		}
	}

	const colLen = Math.max(...rows.map(row => row.length));
	const rowLen = rows.length;
	const width = x2-x1;
	const height = y2-y1;
	const cellWidth = width/(colLen-1);
	const cellHeight = height/(rowLen-1);
	let rows2 = rows.map(row => [
		...Array(colLen).fill(0) // change 0 to any value you want
	]);
	for(let r=0; r<rowLen; r++){
		for(let c=0; c<colLen; c++){
			rows2[r][c] = {
				x: Number((x1 + c*cellWidth).toFixed(1)),
				y: Number((y1 + r*cellHeight).toFixed(1))
			}
		}
	}

	return rows2;
}
function isImageDarkMode(mat:any) {
    // mat: cv.Mat (RGBA or RGB)

    let gray = new cv.Mat();

    // Convert to grayscale
    if (mat.channels() === 4) {
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    } else {
        cv.cvtColor(mat, gray, cv.COLOR_RGB2GRAY);
    }

    // Calculate mean brightness
    let mean = cv.mean(gray);
    let brightness = mean[0];

    gray.delete();

    // threshold (adjustable)
    return brightness < 128;
}
function displayImage(cvMat:any){
	let canvas = document.createElement("canvas");
	cv.imshow(canvas, cvMat);
	document.getElementById("canvasgroup")?.append(canvas);
}
function applyImageData(data){
	const rowLen = data.length;
	const colLen = data[0].length;

	colInt.value = colLen;
	rowInt.value = rowLen;

	board.value = data;
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
			mainWrapper?.scrollBy({top: -yDiff})
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


// import 'bootstrap/dist/css/bootstrap.min.css'

</script>
<style lang='css' scoped>
	@import url('bootstrap/dist/css/bootstrap.min.css');
	@import url('https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css');
	@import url('./builder.css');

</style>

<template >

	<Head title="Builder" />

	<AppLayout :breadcrumbs="breadcrumbs"
		tabindex='0'
		@wheel.keyup.ctrl.stop.prevent="scrollZoom($event)"

	>
		<div id='nurikabe' class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4"
			ref="loadingContainer"
		>
			<div id='wrap_gameactions'>
				<div id='fullboardchange' style='margin: 1em auto; text-align: center;'>
					<label style="display: inline-flex; align-items: center; width: 10em;">
						Column&nbsp;
						<Input type="number" placeholder="Column" v-model="colInt" min="5"/>
					</label>
					<br>
					<label style="display: inline-flex; align-items: center; width: 10em;">
						Row&nbsp;
						<Input type="number" placeholder="Row" v-model="rowInt" min="5"/>
					</label>
					<br><br>
					<button type="button" class="btn btn-success"
						@click="goPlayCustom()"
					>Play</button>
					&nbsp;&nbsp;&nbsp;&nbsp;
					<button type="button" class="btn btn-warning" @click="clearBoard">Clear</button>
					<div style="display:inline-block;width:3em">
						<!-- spacer -->
					</div>
					<button type="button" class="btn btn-primary"
						data-bs-toggle="modal" data-bs-target="#uploadModal"
						:disabled="cvReady"
					>Upload</button>
				</div>
				<div style="margin-bottom: .25em;">
					<div style='width: 20em; display:flex; margin:auto; align-items: center; justify-content: space-around;'>

					</div>
				</div>
				<!-- <input type="range" name="" id="rangeZoom" v-model='boardZoom' :min="minZoom" :max='maxZoom'
					step=".1" disabled style="width:100%;" > -->
			</div>
			<div>
				<div id="wrap_board">
					<table id='gameboard' class="">
						<tr v-for='(_,x) in board.length' :key='x' class=''>
							<td v-for='(_, y) in board[x].length' :key='y' class='square'
								:id="'item-'+x+'_'+y"
								:title="x+','+y"
							>
								<Input type='number' class='cellInput'
									min="1"
									v-model:model-value='board[x][y]' @value='board[x][y]'

									@keyup.up.exact.prevent="moveCell('up')"
									@keyup.down.exact.prevent="moveCell('down')"
									@keyup.left.exact.prevent="moveCell('left')"
									@keyup.right.exact.prevent="moveCell('right')"

									@keyup.w.exact.prevent="moveCell('up')"
									@keyup.s.exact.prevent="moveCell('down')"
									@keyup.a.exact.prevent="moveCell('left')"
									@keyup.d.exact.prevent="moveCell('right')"

									@keydown.up.exact.prevent=""
									@keydown.down.exact.prevent=""
									@keydown.w.exact.prevent=""
									@keydown.s.exact.prevent=""
									@keydown.a.exact.prevent=""
									@keydown.d.exact.prevent=""
								/>
							</td>
						</tr>
					</table>
				</div>
			</div>

			<!-- Modal -->
			<div class="modal fade" id="uploadModal" tabindex="-1" aria-labelledby="uploadModalLabel" aria-hidden="true"
				:data-bs-theme="isDark?'dark':'light'"
			>
				<div class="modal-dialog">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="uploadModalLabel">Upload Image</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<i style="font-size: .8em;">Note: Image recognition is inaccurate and slow. Bigger image will yield better results. Speed depends on the board size and your device.</i>

							<div id="pastingArea" tabindex="0"
								@paste="pasteClipboard($event, 'imageSrc', processImage)"
								style="border: 1px solid white; border-radius: .5em; padding:.5em;"
							>Paste image from clipboard here.</div>
							<div>OR</div>
							<input type="file" id="fileInput" name="file"
								accept="image/*"
								style="border: 1px solid white; border-radius: .5em; padding:.5em;"/>

							<img id="imageSrc" alt="No Image"
								style="border:1px solid white; max-height: 20em; margin:auto;"/>

						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
							<!-- <button type="button" class="btn btn-primary">Save changes</button> -->
						</div>
					</div>
				</div>
			</div><!-- end Modal-->


		</div>
	</AppLayout>
</template>

