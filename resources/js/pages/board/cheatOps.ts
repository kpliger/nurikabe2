import { toRaw } from "vue";


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
interface BoardClass{
	// value: any[][];
	value: CellClass[][];
}
interface BoardValue{
	value: string[][];
}
interface Move {
	0:number,
	1:number,
	2?:string
}
interface Moves{
	// value: Move[][]
	value: any[][]
}
interface Coord{
	x:number,
	y:number,
}


const props:{
	board:BoardValue,
	boardClass:BoardClass,
	move:Moves,
	move_r:Moves,
	hints:{value:any[][]};
	[key: string]: any, // fallback
}= {
	board:{value:[[]]},
	boardClass:{value:[[]]},
	move:{value:[[[0,0,""]]]},
	move_r:{value:[[[0,0,""]]]},
	hints:{value:[[]]},

}

const directions = {
	"left":[0,-1],
	"top":[-1,0],
	"right":[0,1],
	"bottom":[1,0],
}
const inverseDirections:any = {
	left:'right',
	top:'bottom',
	right: 'left',
	bottom:'top',
}
const CORNERS = {
	"tl":[-1,-1],
	"tr":[-1, 1],
	"bl":[ 1,-1],
	"br":[ 1, 1],
}

export function setProps(args:any){
	for( const element in args){
		props[element] = args[element]
	}
}

function isNumber(value:any) {
	return !isNaN(parseFloat(value)) && isFinite(value);
}
function sleep(ms:number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}


function isCorner(x:number,y:number, board_l:string[][]){
	for(const coord of Object.values(CORNERS)){
		if(board_l[x+coord[0]] == undefined) continue;

		const corner = board_l[x+coord[0]][y+coord[1]]
		if(corner !=' ■') continue;
		const horizontal = board_l[x][y+coord[1]]
		if(horizontal!=' ■') continue;
		const vertical = board_l[x+coord[0]][y]
		if(vertical!=' ■') continue;

		return true;
	};
	return(false)
}


export function fillUnreachable(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{
		// const board_l = props.board.value;
		// const boardClass_l = props.boardClass.value;

		// const boardLocal = toRaw(props.boardClass.value).map(row => [...row]);
		let changes = [];

		for(const x in board_l){
			for( const y in board_l[x]){
				if(board_l[x][y] == "  " && boardClass_l[x][y].possible_roots.length==0){
					changes.push([parseInt(x),parseInt(y), "up"])
				}else{
				}
			}
		}

		if(changes.length>0){
			resolve({action: "fillUnreachable", changes:changes});
		}else{
			reject({})
		}
	})

}
// return all reachable blanks
function highlightIsland(square:number[], board_l:string[][], boardClass_l:CellClass[][]) {
	return new Promise<number[][]>(async (resolve, reject)=>{
		try{
			square[0] = parseInt(square[0]+"");
			square[1] = parseInt(square[1]+"");

			// const boardClass_l = props.boardClass.value;
			// const board_l = props.board.value;

			const sqrClass = boardClass_l[square[0]][square[1]];
			const sqrVal = parseInt(board_l[square[0]][square[1]]);

			if( sqrClass.root_hints.length!=1 ){
				resolve([]); return;
			}
			if(sqrVal == sqrClass.island_size){
				resolve([]); return;
			}

			let queue = [square];
			const blankQueue:number[][] = [];

			//highlight the hint square and isle squares
			for (let i = 0; i < queue.length; i++) {
				let [x,y]:any[] = queue[i];

				// boardClass_l[x][y].island_highlighted = true;

				Object.values(directions).forEach(([dX, dY]:number[]) => {
					const [nearX, nearY] = [x+dX,y+dY];
					if( !(boardClass_l[nearX] && boardClass_l[nearX][nearY]) ) return; //edge

					const neighboringSquare = boardClass_l[nearX][nearY];

					if(neighboringSquare.wall) return;

					if(board_l[nearX][nearY]== "  "){
						if(blankQueue.some( v=>v[0]==nearX  && v[1]==nearY )) return;
						blankQueue.push([nearX,nearY])
					}else{
						if(queue.some( v=>v[0]==nearX && v[1]==nearY )) return;
						queue.push([nearX,nearY]);
					}
				});
			}

			const remainder = sqrVal - sqrClass.island_size;

			let blanks:number[][] = [];

			blankQueue.forEach((value) => {
				if(!isValidBlank([...value, remainder], square, queue, blanks, board_l, boardClass_l ) ) return;
				blanks.push([value[0], value[1], remainder])
			});

			let options:number[][] = [];

			for (let i = 0; i < blanks.length; i++) {
				const [x,y, remainder] = blanks[i];

				// boardClass_l[x][y].island_highlighted = true;
				options.push([x,y]);

				if(remainder == 1) continue;

				Object.values(directions).forEach((coord:number[]) => {
					const [nearX, nearY] = [x+coord[0], y+coord[1]];
					if( !(boardClass_l[nearX] && boardClass_l[nearX][nearY] ) ) return;
					const nearCell = boardClass_l[nearX][nearY];

					if(nearCell.wall) return;
					if(isNumber(board_l[nearX][nearY])) return;
					if(blanks.some( v=>v[0]==nearX && v[1]==nearY )) return;
					if(queue.some( v=>v[0]==nearX && v[1]==nearY )) return;
					if(!isValidBlank([nearX, nearY, remainder-1], square, queue, blanks, board_l, boardClass_l)) return;

					blanks.push([nearX, nearY, remainder-1]);
				});
			}
			resolve(options);
		}catch(ex){
			reject(ex);
		}
	})
}
// kinda like highlightIsland but the island has no hint and we highlight the island that can reach the islet
function highlightIslet(square:number[], board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise<any>(async resolve=>{

		let queue:number[][] = [square];
		let blanks:number[][] = [];
		let islandSize = boardClass_l[square[0]][square[1]].island_size;
		let hints:number[][]=[];

		//highlight the land and find blanks around the land
		for (let i = 0; i < queue.length; i++) {
			const value = queue[i];

			Object.values(directions).forEach((coord:number[]) => {
				const near:number[] = [value[0]+coord[0],value[1]+coord[1]];
				if(blanks.some(v=>v[0]==near[0] && v[1]==near[1])) return;
				if(queue.some(v=>v[0]==near[0] && v[1]==near[1])) return;
				if( !(boardClass_l[near[0]] && boardClass_l[near[0]][near[1]]) ) return;

				if(board_l[near[0]][near[1]] == "  "){
					blanks.push(near);
				}else if(board_l[near[0]][near[1]] == " ●"){
					queue.push(near);
				}
			});
		}


		let blankQueue:number[][] = [];
		blanks.forEach(q=>{
			if( !isValidBlank([...q, islandSize], square, queue, blankQueue, board_l, boardClass_l) ) return;

			Object.values(directions).forEach(d=>{
				const n = [q[0]+d[0], q[1]+d[1]];
				if( !(boardClass_l[n[0]] && boardClass_l[n[0]][n[1]]) ) return;
				if(boardClass_l[n[0]][n[1]].root_hints.length!=1 ) return;
				const root:number[] = boardClass_l[n[0]][n[1]].root_hints[0]
				if(hints.some(v=>v[0]==root[0] && v[1]==root[1])) return;
				hints.push( toRaw(boardClass_l[root[0]][root[1]].root_hints[0]));
			})

			blankQueue.push([...q, islandSize+1]);
		})


		for(let i=0; i<blankQueue.length; i++){
			const value = blankQueue[i];

			// props.boardClass.value[value[0]][value[1]].island_highlighted = true;

			for(const direction of Object.values(directions)){
				const near = [value[0]+direction[0],value[1]+direction[1]]

				if(queue.some(q=>q[0]==near[0] && q[1]==near[1])) continue;
				if(blankQueue.some(q=>q[0]==near[0] && q[1]==near[1])) continue;
				if( !(boardClass_l[near[0]] && boardClass_l[near[0]][near[1]]) ) continue;

				const nearClass = boardClass_l[near[0]][near[1]];

				if(nearClass.wall) continue;
				// if(board_l[near[0]][near[1]] != "  ") continue;

				if( !isValidBlank([...near, value[2]], square, queue, blankQueue, board_l, boardClass_l) ) continue;

				Object.values(directions).forEach(d=>{
					const n = [near[0]+d[0], near[1]+d[1]];
					if( !(boardClass_l[n[0]] && boardClass_l[n[0]][n[1]]) ) return;
					if(boardClass_l[n[0]][n[1]].root_hints.length!=1 ) return;
					const root:number[] = boardClass_l[n[0]][n[1]].root_hints[0]
					if(hints.some(v=>v[0]==root[0] && v[1]==root[1])) return;
					hints.push( toRaw(boardClass_l[root[0]][root[1]].root_hints[0]));
				})
				blankQueue.push([...near, value[2]+1]);
			}
		}

		let res:number[][] = [];
		blankQueue.forEach(v=>{
			if(board_l[v[0]][v[1]]=="  "){
				res.push(v)
			}
		})


		resolve({'queue':res, 'hints':hints});
	})
}
function isValidBlank(value:number[], island:number[], queue:number[][], blanks:number[][],	board_l:string[][],	boardClass_l:CellClass[][] ){

	let response = true;

	if(board_l[value[0]][value[1]] != "  ") return response;

	for( const coord of Object.values(directions)){
		const near = {x: value[0]+coord[0], y: value[1]+coord[1]};
		if(queue.some( v=>v[0]==near.x && v[1]==near.y )) continue;
		if(blanks.some( v=>v[0]==near.x && v[1]==near.y )) continue;
		if( !(boardClass_l[near.x] && boardClass_l[near.x][near.y]) ) continue;

		const neighboringSquare = boardClass_l[near.x][near.y];

		if(neighboringSquare.wall) continue;
		if(board_l[near.x][near.y] == "  ") continue;
		if(neighboringSquare.root_hints.toString() == boardClass_l[island[0]][island[1]].root_hints.toString() ) continue;

		if(	boardClass_l[island[0]][island[1]].root_hints.length==1 && neighboringSquare.root_hints.length==0 &&
			value[2] > neighboringSquare.island_size
		) continue;

		if(	boardClass_l[island[0]][island[1]].root_hints.length==0 && neighboringSquare.root_hints.length==1){
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


export async function fillSingleOptions(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{
		let options:any[] = [];
		let changes:any[] = [];

		options = await findOptionOfEntity(board_l, boardClass_l);

		for(const coord of options){
			const [x,y, v] = coord;
			changes.push([x,y, v==' ■'?'up':'down'])
		}

		//remove duplicates
		changes = changes.filter((option, index, self) =>
			index === self.findIndex((v) => v[0] === option[0] && v[1] === option[1])
		);


		if(changes.length>0){
			resolve({action: "fillSingleOptions", changes:changes});
		}else{
			reject({})
		}
	})

}
async function findOptionOfEntity(board_l:string[][], boardClass_l:CellClass[][]){

	// const boardClass_l = props.boardClass.value;
	// const board_l = props.board.value;
	let options:any[]=[];

	for(let x=0; x<boardClass_l.length; x++){
		for(let y=0; y<boardClass_l[0].length; y++){
			if(props.board.value[x][y] != "  ")continue;
			if(!isCorner(x,y, board_l)) continue;
			options.push([x, y, " ●"]);
		}
	}
	let promises:any[] = [];
	let wallVisited:number[] = [];
	for(let x=0; x<boardClass_l.length; x++){
		for(let y=0; y<boardClass_l[0].length; y++){
			if(!boardClass_l[x][y].wall) continue;
			const wallId = boardClass_l[x][y].wall_id;
			if(wallVisited.includes(wallId)) continue;
			wallVisited.push(wallId);
			promises.push(findOptionsOfWall([x,y], board_l.map(row => [...row]), boardClass_l.map(row => [...row])))
		}
	}
	for(const hint of toRaw(props.hints.value)){
		promises.push(findOptionsOfIsland([hint[0],hint[1]], board_l.map(row => [...row]), boardClass_l.map(row => [...row])));
	}
	let isletVisited:number[] = [];
	for(let x=0; x<boardClass_l.length; x++){
		for(let y=0; y<boardClass_l[0].length; y++){
			if(board_l[x][y] != " ●" || boardClass_l[x][y].islet_id == -1) continue;
			const isletId = boardClass_l[x][y].islet_id;
			if(isletVisited.includes(isletId)) continue;
			isletVisited.push(isletId);
			promises.push(findOptionsOfIsland([x,y], board_l.map(row => [...row]), boardClass_l.map(row => [...row])))

		}
	}


	const responses = await Promise.all(promises);
	let moves_l:any[] = [];
	for(const res of responses){
		if(res && res.length==1){
			if( moves_l.some(v=>v[0]==res[0][0] && v[1]==res[0][1] )) continue;
			options.push([parseInt(res[0][0]), parseInt(res[0][1]), res[0][2]]);
			moves_l.push([parseInt(res[0][0]), parseInt(res[0][1])])
		}
	}
	return options
}
function findOptionsOfWall(square:number[], board_l:string[][], boardClass_l:CellClass[][]) {
	return new Promise( async resolve =>{
		const queue:number[][] = [square];
		let blanks:any[] = [];
		let blankVisited:string[] = [];
		let neighboringSquare:CellClass;
		// const boardClass_l = props.boardClass.value;
		// const board_l = props.board.value;

		for (let i = 0; i < queue.length; i++) {
			const value = queue[i];

			for( const coord of Object.values(directions)){
				const near = [value[0]+coord[0], value[1]+coord[1]];
				if( queue.some(v=> v[0]==near[0] && v[1]==near[1]) ) continue;
				if(blankVisited.includes(near.toString())) continue;
				if( !(boardClass_l[near[0]] && boardClass_l[near[0]][near[1]] ) ) continue;

				neighboringSquare = boardClass_l[near[0]][near[1]];

				// hightlight possible moves excluding corners
				if(	board_l[near[0]][near[1]] == '  '){
					blankVisited.push(near.toString());
					if(isCorner(near[0],near[1], board_l)) continue;
					blanks.push([...near, " ■"]);
				}else if(neighboringSquare.wall){
					queue.push([near[0],near[1]])
				}
			}
		}
		resolve(blanks);
	})
}
// return the adjacent blanks. like highlishIsland but again, just the adjadent blanks
async function findOptionsOfIsland(square:number[], board_l:string[][], boardClass_l:CellClass[][]) {
	return new Promise(async (resolve, reject)=>{

		// let boardClass = props.boardClass.value;
		// let board = props.board.value;

		let queue = [square];
		const blankQueue:any[][] = [];
		let remainder = 0;

		if(boardClass_l[square[0]][square[1]].root_hints.length>1){
			resolve([]);
			return;
		}
		if(boardClass_l[square[0]][square[1]].root_hints.length==1){
			const hint_coord = boardClass_l[square[0]][square[1]].root_hints[0]
			remainder = parseInt(board_l[hint_coord[0]][hint_coord[1]])
		}

		//highlight the hint square and isle squares
		for (let i = 0; i < queue.length; i++) {
			const value:any[] = queue[i];


			Object.values(directions).forEach((coord:number[]) => {
				const near:number[] = [value[0]+coord[0],value[1]+coord[1]];
				if( queue.some( v=>v[0]==near[0] && v[1]==near[1] )) return;
				if( !(boardClass_l[near[0]] && boardClass_l[near[0]][near[1]]) ) return;

				const neighboringSquare = boardClass_l[near[0]][near[1]];
				if(neighboringSquare.wall) return;

				if( board_l[near[0]][near[1]]== "  " ){
					// boardClass[ near[0] ][ near[1] ].island_highlighted=true;
					blankQueue.push([near[0], near[1], ' ●'])
				}else{
					queue.push(near);
				}
			});

			remainder--;
		}

		if(remainder==0){
			resolve([]);
			return;
		}
		if(blankQueue.length==1){
			resolve(blankQueue);
			return;
		}
		remainder = Math.abs(remainder)

		let options:any[][] = [];
		blankQueue.forEach(([x,y]) => {
			if(isValidBlank([x, y, remainder], square, queue, blankQueue, board_l, boardClass_l)){
				options.push([x,y, " ●"]);
				return;
			}
			if(boardClass_l[square[0]][square[1]].root_hints.length>0) return;

			for(const direction of Object.values(directions)){
				const near = [x+direction[0],y+direction[1]]

				if( !(boardClass_l[near[0]] && boardClass_l[near[0]][near[1]]) ) continue;

				const nearClass = boardClass_l[near[0]][near[1]];
				if(nearClass.root_hints.length == 0) continue;

				const hint = toRaw(nearClass.root_hints[0]);
				const hintVal = parseInt(board_l[hint[0]][hint[1]]);
				const islandSize = nearClass.island_size;
				const neededSpace = hintVal - islandSize;

				if(remainder > neededSpace) continue;
				if(options.some(v=>v[0]==hint[0] && v[1]==hint[1])) continue;

				// boardClass[x][y].island_highlighted = true;
				options.push([x,y, " ●"]);
			}
		});

		resolve(options);
	})
}


export function completeIsland(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise( async (resolve, reject)=>{

		let changes:Move[] = [];


		for(const hint of props.hints.value.values()){
			const [x,y] = hint;
			const hintVal = parseInt(board_l[x][y]);
			const islandSize = boardClass_l[x][y].island_size;

			if(hintVal == islandSize) continue;

			const remainder = hintVal - islandSize;
			const res:any = await highlightIsland([x,y], board_l, boardClass_l);

			if(res.length!=remainder) continue

			// turn blanks, which island can reach, to land
			for(const blank of res){
				if(board_l[blank[0]][blank[1]]!="  " ) continue;
				changes.push([blank[0],blank[1], 'down'])
			}

			// turn blanks, which island adjacently cannot reach, to wall
			for(const blank of res){
				for(const direction of Object.values(directions)){
					const near = [ blank[0]+direction[0], blank[1]+direction[1] ];

					if( !(board_l[near[0]] &&  board_l[near[0]][near[1]]) ) continue; //edge

					let nearVal = board_l[near[0]][near[1]];

					if(nearVal != "  ") continue;
					changes.push([near[0], near[1], 'up'])
				}
			}
		}

		//surround the complete islands
		for(const [x, row] of board_l.entries()){
			for( const [y, cell] of row.entries()){
				if(board_l[x][y] != "  ") continue;

				for(const c of Object.values(directions)){
					const [nearX, nearY] = [x+c[0], y+c[1]];
					if( !(board_l[nearX] && board_l[nearX][nearY]) ) continue;

					const nearCell = boardClass_l[nearX][nearY];

					if(nearCell.root_hints.length!=1) continue;

					const rootHint = nearCell.root_hints[0];
					const hintVal = parseInt(board_l[rootHint[0]][rootHint[1]])

					if(hintVal != nearCell.island_size) continue;

					changes.push([x,y, 'up'])
					break;
				}
			}
		}

	//remove duplicates
	changes = changes.filter((option, index, self) =>
		index === self.findIndex((v) => v[0] === option[0] && v[1] === option[1])
	);

	 if(changes.length>0){
			resolve({action: "completeIsland", changes:changes});
	 }else{
		reject({})
	 }
 })
}


// set tile to sea if an island need 1 more land and the 2 options has one tile separation
export async function fillThreatenedCell(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{
		let options = []

		for(const hint of toRaw(props.hints.value)){
			const [x,y] = hint;

			const hintVal = parseInt(board_l[x][y]);
			const islandSize = boardClass_l[x][y].island_size

			if(hintVal == islandSize) continue;// complete island

			const res:any = await highlightIsland([x,y], board_l, boardClass_l);

			if(!res) continue;

			//list all the surrounding adjacent unreachable blanks
			let blanks:any = {};
			for(const response of res){
				for(const dir of Object.values(directions)){
					const near = [ response[0]+dir[0], response[1]+dir[1] ];
					if( !(board_l[near[0]] &&  board_l[near[0]][near[1]]) ) continue; //edge
					if(board_l[near[0]][near[1]] != "  ") continue;

					if(boardClass_l[near[0]][near[1]].possible_roots.some(v=>v[0]==hint[0] && v[1]==hint[1])) continue;
					if(blanks[near.toString()] == undefined) blanks[near.toString()]=0;
					blanks[near.toString()]++;

				}
			}

			//finding contradiction
			for(const [coord, count] of Object.entries(blanks) ){
				if(count==1) continue;
				const blank = coord.split(',').map(v=>parseInt(v));

				board_l[blank[0]][blank[1]] = " ●";
				boardClass_l[blank[0]][blank[1]].island_size = 1000; // 1000 is arbitrarily large number
				const blankCount = await highlightIsland(hint, board_l, boardClass_l);
				board_l[blank[0]][blank[1]] = "  ";
				boardClass_l[blank[0]][blank[1]].island_size = 0;

				if(hintVal<=islandSize+blankCount.length) continue;

				options.push([blank[0], blank[1], "up"]);
			}
		}


		if(options.length>0){
			resolve({action: "fillThreatenedCell", changes:options});
		}else{
			reject({})
		}
	})
}

export async function hiddenIslandExpansion(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{
		// let boardLocal = toRaw(props.board.value).map(row => [...row]);
		let changes:number[][] = [];

		for(const cell of toRaw(props.hints.value)){
			const [x,y] = cell;
			const cellVal = parseInt(board_l[x][y]);
			const islandSize = boardClass_l[x][y].island_size;

			if(cellVal == islandSize) continue;
			const options:any = await highlightIsland([x,y], board_l, boardClass_l)

			//find contradiction
			for(const [x2,y2] of options){
				if(board_l[x2][y2] != "  ") continue;

				boardClass_l[x2][y2].wall = true;
				const options:any = await highlightIsland([x,y], board_l, boardClass_l)
				boardClass_l[x2][y2].wall = false;

				if(cellVal <= islandSize+options.length) continue;

				changes.push([x2,y2, 'down'])
			}
		}

		if(changes.length>0){
			resolve({action: "hiddenIslandExpansion", changes:changes});
		}else{
			reject({})
		}
	})
}


export async function hiddenWallExpansion(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{

		let changes:Move[] = [];
		let options:Move[] = [];
		// let boardLocal = toRaw(props.board.value).map(row => [...row]);


		let wallIds:number[] = [];
		let promises:any = [];
		for(const [x, row] of board_l.entries()){
			for( const [y, cell] of row.entries()){
				if(cell != " ■") continue;

				const wallId = boardClass_l[x][y].wall_id;
				if(wallIds.includes(wallId)) continue;
				wallIds.push(wallId);

				promises.push(processWallExpansion(x,y, board_l.map(row => [...row]), boardClass_l.map(row => [...row])))
			}
		}

		if(wallIds.length<2) {reject([]); return;}// cannot reach other wall if there is only 1 wall or none.

		const responses = await Promise.all(promises);
		for(const response of responses){
			if(response[0] == -1 && response[1] == -1) continue;
				options.push(response);
		}

		//remove duplicates
		changes = options.filter((option, index, self) =>
			index === self.findIndex((v) => v[0] === option[0] && v[1] === option[1])
		);

		if(changes.length>0){
			resolve({action: "hiddenWallExpansion", changes:changes});
		}else{
			reject({})
		}
	})
}
function processWallExpansion(x:number, y:number, board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise<Move>( async resolve => {
		// const boardClass_l = props.boardClass.value;
		// let board_l:string[][] = toRaw(props.board.value).map(row => [...row]);

		let option:Move = [-1, -1];
		let curWall:Coord[] = [{x:x,y:y}];

		//collect immediate blanks
		let blanks:Coord[] = [];
		for(let i = 0; i< curWall.length; i++){
			const qCoord = curWall[i];

			for(const direction of Object.values(directions)){
				const near:Coord = {x:qCoord.x+direction[0],y:qCoord.y+direction[1]};
				if(curWall.some(v => v.x==near.x && v.y==near.y )) continue;
				if(blanks.some(v => v.x==near.x && v.y==near.y )) continue;
				if( !(boardClass_l[near.x] && boardClass_l[near.x][near.y]) ) continue;

				const nearClass = boardClass_l[near.x][near.y];

				if(nearClass.wall){
					curWall.push(near)
				}else if(board_l[near.x][near.y] == "  "){
					blanks.push(near)
				}
			}
		}
		let ogBlanks = [...blanks];


		// gather all the blanks wall can reach
		for(let i = 0; i< blanks.length; i++){
			const qCoord = blanks[i];

			for(const direction of Object.values(directions)){
				const near:Coord = {x:qCoord.x+direction[0], y:qCoord.y+direction[1]};
				if(blanks.some(v => v.x==near.x && v.y==near.y )) continue;
				if( !(boardClass_l[near.x] && boardClass_l[near.x][near.y]) ) continue;
				if(board_l[near.x][near.y] != "  ") continue;

				blanks.push(near);
			}
		}
		// find contradictions
		for(let i = 0; i<blanks.length; i++){
			const blank = blanks[i];

			board_l[blank.x][blank.y] = " ●";

			const tof = await isWallUnreachable([...ogBlanks], curWall, board_l);
			board_l[blank.x][blank.y] = "  ";
			if(tof) continue;

			option = [blank.x, blank.y, "up"];
			break;
		}

		resolve(option);
	})
}
function isWallUnreachable(queue:Coord[], curWall:Coord[], board_l:string[][]){
	return new Promise<boolean>( resolve =>{

		for(let i = 0; i< queue.length; i++){
			const qCoord = queue[i];
			if(board_l[qCoord.x][qCoord.y] == " ●") continue;

			for(const direction of Object.values(directions)){
				const near:Coord = {x:qCoord.x+direction[0], y:qCoord.y+direction[1]};
				if(queue.some(v => v.x==near.x && v.y==near.y )) continue;
				if(curWall.some(v=> v.x == near.x && v.y == near.y)) continue;
				if( !(board_l[near.x] && board_l[near.x][near.y] )) continue;
				if(board_l[near.x][near.y] == " ■"){ resolve(true); return;};
				if(board_l[near.x][near.y] != "  ") continue;

				queue.push(near);
			}
		}
		resolve(false);
	})
}


// if the islet has ONLY one possible island, then check it can be expanded
export async function hiddenIsletExpansion(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{

		let changes:number[][] = [];

		const isletIds:number[] = []
		for(const [x, row] of boardClass_l.entries()){
			for( const [y, cell] of row.entries()){
				if(board_l[x][y] != " ●" || cell.possible_roots.length !=1 || cell.root_hints.length!=0) continue;
				if(isletIds.includes(cell.islet_id)) continue;

				isletIds.push(cell.islet_id);
				const res = await highlightIslet([x,y], board_l, boardClass_l );

				// console.log(res.queue)
				for(const blank of res.queue){
					boardClass_l[blank[0]][blank[1]].wall=true;
					board_l[blank[0]][blank[1]]=" ■";

					const r = await highlightIslet([x,y], board_l, boardClass_l);

					boardClass_l[blank[0]][blank[1]].wall=false;
					board_l[blank[0]][blank[1]]="  ";

					if(r.hints.length == 0){
						changes.push([blank[0], blank[1], "down"]);
					}

				}
			}
		}
		//remove duplicates
		changes = changes.filter((option, index, self) =>
			index === self.findIndex((v) => v[0] === option[0] && v[1] === option[1])
		);


		if(changes.length>0){
			resolve({action: "hiddenIsletExpansion", changes:changes});
		}else{
			reject({})
		}
	})
}


export async function edgeExit(board_l:string[][], boardClass_l:CellClass[][]){
	return new Promise(async (resolve, reject)=>{

		// const boardClass_l = props.boardClass.value;
		// const board = props.board.value;

		// const boardLocal = toRaw(props.board.value).map(row => [...row]);

		let changes:Move[] = [];
		let options:Move[] = [];


		for(const [x, row] of board_l.entries()){
			for( const [y, cell] of row.entries()){

				if(cell != "  ") continue;

				let nearBlankCtr = 0;
				let nearBlank:Coord = {x:-1,y:-1};
				let isValid = false;

				// if there is atleast one wall in the corner, then it is valid
				for(const corner of Object.values(CORNERS)){
					const near = {x:x+corner[0], y:y+corner[1]};
					if( !(board_l[near.x] && board_l[near.x][near.y])) continue;
					if( !boardClass_l[near.x][near.y].wall ) continue;

					isValid=true;
					break
				};
				if(!isValid) continue;


				for(const direction of Object.values(directions)){
					const near = {x:x+direction[0], y:y+direction[1]};
					if( !(board_l[near.x] && board_l[near.x][near.y])) continue;

					if(board_l[near.x][near.y] == " ●" || boardClass_l[near.x][near.y].hint){
						isValid = false;
						break;
					}
					if(board_l[near.x][near.y] == "  "){
						nearBlankCtr++;
						nearBlank = near;
					}
				}
				if(!isValid || nearBlankCtr!=1) continue;

				options.push([nearBlank.x, nearBlank.y, 'down']);
			}
		}


		options.forEach(value=>{
			if(changes.some(v=>v[0]==value[0] && v[1]==value[1] )) return;
			// boardLocal[value[0]][value[1]] = " ●";
			changes.push(value);
		})
		if(changes.length>0){
			resolve({action: "edgeExit", changes:changes});
		}else{
			reject({})
		}
	})
}