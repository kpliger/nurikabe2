<script setup lang="ts">
import axios from 'axios';
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
// import bootstrap?
import PlaceholderPattern from '../../components/PlaceholderPattern.vue';
import Button from '@/components/ui/button/Button.vue';
import "./tictactoe.css"
import "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
import { defineAsyncComponent, computed, onMounted, onUnmounted, ref, watch } from 'vue';
// import {Module, opencvfn} from './opencv';
// import cvModule from './opencv';
import cvModule from "@techstark/opencv-js";
import { ImageClipBoard } from './pasteclipboard';
// import * as solver from  "./solver"


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
let cv:any=null;


watch(winner, (current, previous) => {
	// console.log([current, previous]);
	if (current && !previous) {
		history.value.push(current)
		localStorage.setItem('history', JSON.stringify(history.value))
	}
})

onMounted(async () => {
	history.value = JSON.parse(localStorage.getItem('history') ?? []);

	({cv}  = await getOpenCv());

	let imgElement = document.getElementById('imageSrc');
	let inputElement = document.getElementById('fileInput');
	inputElement.addEventListener('change', (e) => {
		imgElement.src = URL.createObjectURL(e.target.files[0]);
		// recognizeImageToText(e);
		// console.log(e.target)
	}, false);

	imgElement.onload = async function(event) {
		processImage2(imgElement);
	};

	// const imageClipboard = new ImageClipBoard("pastingArea", "imageSrc");
	document.getElementById("pastingArea")?.addEventListener('paste', async (e) => {
		e.preventDefault();
		const clipboardItems = typeof navigator?.clipboard?.read === 'function' ? await navigator.clipboard.read() : e.clipboardData.files;

		for (const clipboardItem of clipboardItems) {
			let blob;
			if (clipboardItem.type?.startsWith('image/')) {
				// For files from `e.clipboardData.files`.
				blob = clipboardItem
				// Do something with the blob.
				appendImage(blob);
			} else {
				// For files from `navigator.clipboard.read()`.
				const imageTypes = clipboardItem.types?.filter(type => type.startsWith('image/'))
				for (const imageType of imageTypes) {
					blob = await clipboardItem.getType(imageType);
					// Do something with the blob.
					appendImage(blob);
				}
			}
		}
	});
	// let solver = import("./solver");
	// let {kpl} = await import("./solver");
	// kpl();

});
onUnmounted(()=>{

});

const appendImage = (blob:any)=>{
	const img = document.getElementById("imageSrc");
	img.src = URL.createObjectURL(blob);
	// document.body.append(img);
};
function clearhistory() {
	history.value = []
	localStorage.setItem('history', JSON.stringify(history.value))
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
	document.getElementById("status").innerHTML = "OpenCV.js is ready.";
  return  {cv} ;
}

function recognizeImageToText(imageFile:any) {
	return new Promise(async (resolve)=> {
			let canvas

			// console.log(imageFile instanceof HTMLElement)
			if(imageFile instanceof HTMLElement){
				canvas = imageFile
			}else{
				canvas = document.createElement("canvas");
				cv.imshow(canvas, imageFile);
			}

		// let files = event.target.files;
		// const imageFile = files[0];
		// console.log(imageFile)
		// console.log("Processing Image...");
		const worker = await Tesseract.createWorker('eng');// Language code (e.g., 'eng' for English);
		await worker.setParameters({
			tessedit_char_whitelist: '0123456789',
			tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
		});

		// const ret = await worker.recognize(canvasId);
		let result=null;
		const retry = 5;

		for(let i=0; i<retry; i++){
			const ret = await worker.recognize(canvas);
			// console.log(ret.data.text);
			result = ret.data.text;

			if(result.length==0){
				result = "";
				break
			}
			result = result.slice(0,-1)// remove tailing \n
			if(!isNaN(result)) break; //exit loop if number
		}

		await worker.terminate();
		resolve(result);

		// const { data: { text } } = await Tesseract.recognize(
		// 	imageFile,
		// 	'eng',
		// 	{ logger: m => console.log(m) } // Optional: logs progress to console
		// );
		// console.log("Extracted Text:", text);
		// // Update a DOM element with the result
		// document.getElementById("convertedText").value = text;
	})
}
async function processImage(imgSrc:any){
	// console.log(imgSrc)
	// const { cv } = await getOpenCv();
	// const img = cv.imread(imgSrc);
	document.getElementById("canvasgroup")?.replaceChildren();
	let src  = cv.imread(imgSrc);
	let darkMode = isImageDarkMode(src);

	// 1. Convert to gray and threshold
	let gray = new cv.Mat();
	cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
	let blur = new cv.Mat();
	cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
	if(darkMode){
			cv.bitwise_not(blur);
	}
	let bin = new cv.Mat();
	cv.adaptiveThreshold(blur, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

	cv.imshow("grayImgRef", bin);

	// 2. Detect Horizontal and Vertical Lines using Morphology
	let hKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(40, 1));
	let vKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 40));
	let hLines = new cv.Mat();
	let vLines = new cv.Mat();
	cv.morphologyEx(bin, hLines, cv.MORPH_OPEN, hKernel);
	cv.morphologyEx(bin, vLines, cv.MORPH_OPEN, vKernel);


	// 3. Combine Lines to find grid structure
	let tableMask = new cv.Mat();
	cv.addWeighted(hLines, 0.5, vLines, 0.5, 0, tableMask);

	// cv.Canny(tableMask, tableMask, 100, 100);

	// 4. Find Contours (cells)
	let contours = new cv.MatVector();
	let hierarchy = new cv.Mat();
	// cv.findContours(tableMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
	cv.findContours(tableMask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

	// console.log([src.size().height, cv.boundingRect(contours.get(0)).height]);
	// console.log("Number of cells: " + contours.size());
	// cv.imshow("grayImgRef", tableMask);


	let boxes = [];

	// Loop through contours to get ROIs (cells)
	for (let i = 0; i < contours.size(); ++i) {
		let rect = cv.boundingRect(contours.get(i));
		// console.log(rect)

		rect.x = rect.x+4;
		rect.y = rect.y+4;
		rect.width = rect.width-8;
		rect.height = rect.height-8;


		// console.log(rect)

		if(rect.height<10 || rect.width<10){
			continue;
		}
		if(rect.height>src.size().height/2){
			continue;
		}

		boxes.push(rect);

		// let cellROI = src.roi(rect);
		// cv.imshow(`grayImgRef${i}`, cellROI);
		// // recognizeImageToText(cellROI)
		// // Send cellROI to Tesseract.js

	}

	console.log("Number of cells(filterd): " + boxes.length);

	boxes.sort((a, b) => {
		let diff = Math.abs(a.x - b.x);
		if(diff<=3) return 0;
		return a.x - b.x;
	});
	boxes.sort((a, b) => {
		let diff = Math.abs(a.y-b.y);
		if(diff<=3) return 0;
		return a.y - b.y;
	});

	let cells:any[][] = [[]];


	let row = 0;
	let prevRect = null;
	for (let i = 0; i < boxes.length; ++i) {
		let rect= boxes[i];

		// console.log(rect)
		let cellROI = bin.roi(rect);

		displayImage(cellROI);
		let canvas = document.createElement("canvas");

		const text = await recognizeImageToText(canvas)

		// cells[i-1] = text;

		if(prevRect && rect.x<prevRect.x){
			++row;
		}
		if(cells[row] == undefined){
			cells[row] = [];
		}
		cells[row].push(text);

		prevRect = rect;

	}
	console.log(cells);


	// Cleanup
	src.delete(); gray.delete(); blur.delete(); bin.delete();
	hLines.delete(); vLines.delete(); tableMask.delete();
	contours.delete(); hierarchy.delete();

}
async function processImage2(imgElement:any){

	document.getElementById("canvasgroup")?.replaceChildren();

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

	// displayImage(gray);

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

	// displayImage(thresh);

	// 4. Extract grid lines
	let vertical = new cv.Mat();
	let horizontal = new cv.Mat();
	let verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 45)	);
	let horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(45, 1)	);
	cv.erode(thresh, vertical, verticalKernel);
	cv.dilate(vertical, vertical, verticalKernel);
	cv.erode(thresh, horizontal, horizontalKernel);
	cv.dilate(horizontal, horizontal, horizontalKernel);

	// displayImage(horizontal);
	// return;

	// 5. Find grid intersections
	// let grid = new cv.Mat();
	// cv.add(horizontal, vertical, grid);
	let intersections = new cv.Mat();
	cv.bitwise_and(horizontal, vertical, intersections);

	// cv.addWeighted(horizontal, 1, vertical, 1, 0, intersections);
	displayImage(intersections);

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

	// console.log(points)


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

			// displayImage(cell)

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
		.map(()=>Array(numCols).fill(" "));

	for(let cell of cells){
		if(!hasNumber(cell.img)) continue
		let digit = await recognizeImageToText(cell.img);
		board[cell.row][cell.col] = digit;

	}

	console.log(board)
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
	// console.log({x1,x2,y1,y2})

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


	// Remove points are close to each other
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
	// console.log(rows)

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

	// console.log(rows2)


	// let row2 = rows.map(row => [
	// 	...Array(maxLen).fill(0) // change 0 to any value you want
	// ]);

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
	// canvas.classList.add('adf');
	// canvas.classList.add('qwerqwe');
	cv.imshow(canvas, cvMat);
	document.getElementById("canvasgroup")?.append(canvas);
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



			<div id="imageToBoard" style="display:none;">
				<p id="status">OpenCV.js is loading...</p>
				<div class="inputoutput">
					<img id="imageSrc" alt="No Image"
						style="border:1px solid white;"/>
					<div class="caption">
						<br>
						<div>imageSrc</div>

						<div id="pastingArea" tabindex="0"
						>Paste image from clipboard here.</div>
						<div>OR</div>
						<input type="file" id="fileInput" name="file"
							accept="image/*"
						/>
					</div>
				</div>
				<div class="inputoutput">
					<canvas id="canvasOutput" ></canvas>
					<div class="caption">canvasOutput</div>
				</div>


					<div className="image-card">
						<div style='margin: 10px'>↓↓↓ The gray scale image ↓↓↓</div>
						<canvas id='grayImgRef' />
					</div>
					<div id="canvasgroup"></div>
				<div>
					<span>Text Output</span>
					<div id="textOutput"></div>
				</div>

			</div>



		</div>
	</AppLayout>
	<!-- <AsyncModal /> -->
</template>