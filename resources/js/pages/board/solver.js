let direction = {
	"top": [-1, 0],
	"right": [0, 1],
	"bottom": [1, 0],
	"left": [0, -1]
}
let opposite = {
	"top": "bottom",
	"right": "left",
	"bottom": "top",
	"left": "right"
}
let highligher = [];

let undoStack = [];
let redoStack = [];

let visited = {
	"top": {
		"clue":[],
		"island":[],
		"enclosed": true
	},
	"right": {
		"clue":[],
		"island": [],
		"enclosed": true
	},
	"bottom": {
		"clue":[],
		"island": [],
		"enclosed": true
	},
	"left": {
		"clue":[],
		"island": [],
		"enclosed": true
	}
}


$(function () {
	var colNum = 0;
	var rowNum = 0;
	var puzzle = [];
	// var puzzle = [
	// 	["  ","  ","  "," 5","  ","  ","  ","  ","  "],
	// 	[" 3","  ","  ","  ","  ","  ","  ","  "," 3"],
	// 	["  ","  ","  ","  ","  ","  "," 8","  ","  "],
	// 	["  ","  ","  ","  ","  ","  ","  ","  ","  "],
	// 	["  ","  "," 5","  ","  ","  ","  ","  ","  "],
	// 	["  ","  ","  ","  "," 2","  ","  ","  ","  "],
	// 	[" 2","  ","  ","  ","  ","  ","  ","  ","  "],
	// 	["  ","  ","  ","  ","  "," 3","  ","  ","  "],
	// 	["  ","  ","  ","  ","  ","  ","  ","  ","  "],
	// 	["  ","  ","  ","  "," 3","  ","  ","  ","  "],
	// 	["  ","  ","  ","  ","  ","  ","  ","  ","  "],
	// 	["  ","  "," 5","  ","  "," 6","  ","  ","  "],
	// 	[" 6","  ","  ","  ","  ","  "," 4","  ","  "]
	// ];

	// puzzle = await getPuzzle();

	rowNum = puzzle.length;
	if (rowNum) {
		colNum = puzzle[0].length;
	}

	if ((colNum * rowNum) == 0) {
		for (let row = 0; row < rowNum; row++) {
			for (let col = 0; col < colNum; col++) {
				$(`#cell_${row}_${col}`).html(`
					<input type='text' id='txtCell_${row}_${col}' class='txtCell' >
				`);
			}
		}
	} else {
		displayPuzzle(puzzle);
	}
})

$(document).on("click", ".gb-cell", function (event) {
	let elem = event.target;

	if ($(".gb-cell.highlight").length || $(".gb-cell.highlight-island").length) {
		resetHighLight();
		return;
	}
	if ($(elem).hasClass("clue")) {
		count = highlightIsland($(elem));
		$("#islandCtr").html(count);
		return;
	}

	redoStack = [];
	log = $(elem).prop("id");
	undoStack.push(log);

	if ($(elem).hasClass("blank")) {
		$(elem).removeClass("blank");
		$(elem).addClass("wall");
	} else if ($(elem).hasClass("wall")) {
		$(elem).removeClass("wall");
		$(elem).addClass("island");
	} else if ($(elem).hasClass("island")) {
		$(elem).removeClass("island");
		$(elem).addClass("blank");
	}
	checkEnclosed($(elem));
})

$(document).on("contextmenu", ".gb-cell", function (event) {

	let elem = event.target;
	event.preventDefault();

	resetHighLight();

	if ($(elem).hasClass("blank")) return;

	if ($(elem).hasClass("clue")) {
		$(".gb-cell").removeClass("near");
		let range = $(elem).text();

		highlightProcess($(elem));
		// highlightBlank($(elem), range);
	} else if ($(elem).hasClass("wall")) {
		highlightWall($(elem));
	}

})

$(document).on("change", "#inputFile", function (event) {
	var file = event.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	reader.onload = function (event) {
		var contents = event.target.result;
		puzzle = toCSV(contents);
		displayPuzzle(puzzle);
	};
	reader.readAsText(file);
})
$(document).on("change", "#ddlPuzzle", function (event) {
	elem = event.target;
	file = $(elem).val();
	getServerPuzzle(file);
})


function undo() {
	resetHighLight();

	if (!undoStack.length) return;

	log = undoStack.pop();
	redoStack.push(log);

	if ($("#" + log).hasClass("blank")) {
		$("#" + log).removeClass("blank");
		$("#" + log).addClass("island");
	} else if ($("#" + log).hasClass("wall")) {
		$("#" + log).removeClass("wall");
		$("#" + log).addClass("blank");
	} else if ($("#" + log).hasClass("island")) {
		$("#" + log).removeClass("island");
		$("#" + log).addClass("wall");
	}
	checkEnclosed($("#" + log));
}
function redo() {
	resetHighLight();

	if (!redoStack.length) return;

	log = redoStack.pop();
	undoStack.push(log);

	if ($("#" + log).hasClass("blank")) {
		$("#" + log).removeClass("blank");
		$("#" + log).addClass("wall");
	} else if ($("#" + log).hasClass("wall")) {
		$("#" + log).removeClass("wall");
		$("#" + log).addClass("island");
	} else if ($("#" + log).hasClass("island")) {
		$("#" + log).removeClass("island");
		$("#" + log).addClass("blank");
	}
	checkEnclosed($("#" + log));
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
async function highlightBlank(range) {

	let remains = Array(highligher.length).fill(range);

	while (highligher.length > 0) {
		let id = highligher.shift();
		let remain = remains.shift();
		remain--;

		// await sleep(1)
		let element = $(`#${id}`);
		isNear(element, remain);

		if (element.hasClass("near")) continue;

		element.addClass("highlight");

		if (!remain) continue;

		let curRow = parseInt(element.data("row"));
		let curCol = parseInt(element.data("col"));

		for (const [key, value] of Object.entries(direction)) {
			let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
			neighborId = neighbor.prop("id");
			if (!neighbor.length) continue; // not exist
			if (highligher.includes(neighborId)) continue; // in the list
			if (neighbor.hasClass("wall") || neighbor.hasClass("near") || neighbor.hasClass("clue") || neighbor.hasClass("invalid")) continue

			highligher.push(neighborId)
			remains.push(remain);
		}

	}
	return;
}
function isNear(element, range) {
	let curRow = element.data("row");
	let curCol = element.data("col");

	for (const [key, value] of Object.entries(direction)) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`)
		if (!neighbor.length) continue;
		if (neighbor.hasClass("highlight")) continue;
		if (neighbor.hasClass("valid")) continue;
		if (neighbor.hasClass("clue") || neighbor.hasClass("invalid")) {
			element.addClass("near");
			break;
		}

		if (neighbor.hasClass("island")) {
			let result = isValidIsland(neighbor);
			// console.log(result);
			if(result>0 && result<=range){
				$(".visited:not(.valid):not(.valid)").addClass("valid");
			} else {
				$(".visited:not(.valid):not(.valid)").addClass("invalid");
				element.addClass("near");
				break;
			}
		}
	}
}
function highlightWall(element) {
	if (element.hasClass("clue") || element.hasClass("island") || element.hasClass("blank")) return 1;
	if (element.hasClass("highlight")) return 0;
	element.addClass("highlight");

	let curRow = parseInt(element.data("row"));
	let curCol = parseInt(element.data("col"));

	$.each(direction, function (key, value) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
		if (!neighbor.length) {
			element.addClass("highlight-" + key);
			return;
		}
		if (highlightWall(neighbor)) {
			element.addClass("highlight-" + key);
			// neighbor.addClass("highlight-" + opposite[key]);
		}
	})
	return 0;
}
function highlightProcess(element) {
	highligher = [];
	let range = element.text();
	var islandCount = countIsland(element);

	remain = range - islandCount;
	if (remain < 1) {
		return;
	}

	highlightBlank(remain);

}
function countIsland(element) {
	if (element.hasClass("blank")) {
		id = element.prop("id");

		if (!highligher.includes(id)) {
			highligher.push(id)
		}
		return 0;
	}
	if (element.hasClass("wall")) return 0;
	if (element.hasClass("highlight")) return 0;

	element.addClass("highlight");

	let curRow = parseInt(element.data("row"));
	let curCol = parseInt(element.data("col"));


	var islandCount = 0;
	$.each(direction, function (key, value) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
		if (!neighbor.length) {
			return;
		}

		result = countIsland(neighbor);
		islandCount += result;
	})
	return islandCount + 1;
}
function highlightIsland(element) {
	if (element.hasClass("blank")) return 0;
	if (element.hasClass("wall")) return 0;
	if (element.hasClass("highlight-island")) return 0;

	element.addClass("highlight-island");

	let curRow = parseInt(element.data("row"));
	let curCol = parseInt(element.data("col"));


	var islandCount = 0;
	$.each(direction, function (key, value) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
		if (!neighbor.length) {
			element.addClass("highlight-" + key);
			return;
		}

		result = highlightIsland(neighbor);
		islandCount += result;

		if (!result && !neighbor.hasClass("highlight-island")) {
			element.addClass("highlight-" + key);
			// neighbor.addClass("highlight-" + opposite[key])
		}
	})
	return islandCount + 1;
}
function resetHighLight() {
	$(".gb-cell").removeClass("near");
	$(".gb-cell").removeClass("highlight");
	$(".gb-cell").removeClass("highlight-top");
	$(".gb-cell").removeClass("highlight-right");
	$(".gb-cell").removeClass("highlight-bottom");
	$(".gb-cell").removeClass("highlight-left");
	$(".gb-cell").removeClass("highlight-island");
	$(".gb-cell").removeClass("visited");
	$(".gb-cell").removeClass("invalid");
	$(".gb-cell").removeClass("valid");

	$("#islandCtr").html("");

	visited = {
		"top": {
			"clue": [],
			"island": [],
			"enclosed": true
		},
		"right": {
			"clue": [],
			"island": [],
			"enclosed": true
		},
		"bottom": {
			"clue": [],
			"island": [],
			"enclosed": true
		},
		"left": {
			"clue": [],
			"island": [],
			"enclosed": true
		}
	}
}

function getPuzzle() {
	return new Promise(resolve => {
		$.ajax({
			type: "GET",
			url: "file:///F:/Porfolio/Nurikabe%20Solver/puzzles/puzzle001.csv",
			dataType: "text",
			success: function (data) {
				var result = toCSV(data);
				resolve(result);
			}
		});
	})
}
function getPuzzleByDate() {
	return new Promise(resolve => {
		$.ajax({
			type: "GET",
			url: "https://puzzlemadness.co.uk/api/user/data/nurikabe/small/2024/3/28",
			dataType: "text",
			success: function (data) {
				var result = toCSV(data);
				resolve(result);
			}
		});
	})
}
function findPuzzleByDate(){

	difficulty = $("#api_difficulty").val();
	date = $("#api_date").val();

	$.ajax({
		url: "puzzle_ctrlr.php",
		method: "POST",
		cache: false,
		data: {
			action: "getPuzzleByAPI",
			difficulty: difficulty,
			date: date,
		},
		crossDomain: true,
		dataType: "text json",
		success: function (data) {
			gridWidth = data.puzzleData.gridWidth;
			gridHeight = data.puzzleData.gridHeight;
			gridData = data.puzzleData.data.startingGrid;


			$("#gameboard").html("");
			for (let rowKey = 0; rowKey < gridHeight; rowKey++) {
				for (let colKey = 0; colKey < gridWidth; colKey++) {
					cell = gridData[(rowKey * gridWidth)+colKey];

					$("#gameboard").append(`<div id='cell_${rowKey}_${colKey}'
					class='gb-cell' data-row='${rowKey}' data-col='${colKey}'></div>`);
					if (cell > 0) {
						$(`#cell_${rowKey}_${colKey}`).html(cell);
						$(`#cell_${rowKey}_${colKey}`).addClass("clue");
					} else {
						$(`#cell_${rowKey}_${colKey}`).addClass("blank");
					}
				}
				$("#gameboard").append(`<br>`);
			}
		},
		error: function (data) {
			alert("Ajax Error: " + data.responseText);
			console.log(data);
		},
		// complete: function(data){
		// 	console.log(data);
		// }

	});
}




function toCSV(allText) {
	var allTextLines = allText.split(/\r\n|\n/);

	var headers = allTextLines[0].split(',');
	var lines = [];

	for (var i = 0; i < allTextLines.length; i++) {
		var data = allTextLines[i].split(',');
		if (data.length == 1) break;
		var tarr = [];
		for (var j = 0; j < headers.length; j++) {
			data[j] = data[j].replaceAll("\"", "");
			tarr.push(data[j]);
		}
		lines.push(tarr);
	}
	return lines;
}
function displayPuzzle(puzzle) {
	$("#gameboard").html("");
	$.each(puzzle, function (rowKey, row) {
		$.each(row, function (colKey, cell) {
			$("#gameboard").append(`<div id='cell_${rowKey}_${colKey}'
					class='gb-cell' data-row='${rowKey}' data-col='${colKey}'></div>`);
			if (cell > 0) {
				$(`#cell_${rowKey}_${colKey}`).html(cell);
				$(`#cell_${rowKey}_${colKey}`).addClass("clue");
			} else {
				$(`#cell_${rowKey}_${colKey}`).addClass("blank");
			}
		})
		$("#gameboard").append(`<br>`);
	})
}
function isValidIsland(element) {
	if (element.hasClass("blank") || element.hasClass("wall") || element.hasClass("visited")) {
		return 0;
	}
	if ( element.hasClass("clue")) {
		return -100;
	}

	element.addClass("visited");// prevent backtrack

	let curRow = parseInt(element.data("row"));
	let curCol = parseInt(element.data("col"));

	var islandCount = 0;
	for (const [key, value] of Object.entries(direction)) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
		if (!neighbor.length) continue;


		result = isValidIsland(neighbor);
		islandCount += result;

		if (result<0) {
			break;
		}
	}
	return islandCount + 1;
}

function createIsland() {

}
function getServerPuzzle(file){
	$.ajax({
		url: "puzzles/"+file,
		method: "GET",
		cache: false,
		data: {
			action: "addOrderConfirmationNumber"
		},
		dataType: "text",
		success: function (data) {
			puzzle = toCSV(data);
			displayPuzzle(puzzle);
		},
		error: function (data) {
			alert("Ajax Error: " + data.responseText);
			console.log(data);
		}
	});
}

function checkEnclosed(element){

	resetHighLight();
	let curRow = element.data("row");
	let curCol = element.data("col");

	$.each(direction, function (key, value) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
		if (!neighbor.length) {
			return;
		}
		if (neighbor.hasClass("blank")) return;
		if (neighbor.hasClass("wall")) return;
		ctr = traverseEnclose(neighbor, key);
		// console.log(visited[key]);

		let isComplete = visited[key]["enclosed"] && visited[key]["clue"].length===1;
		if (isComplete){
			elem = $("#" + visited[key]["clue"][0]);
			elem.html();
			isComplete = elem.html() == ctr;
		}
		$.each(visited[key]["island"], function (key2, value2) {
			elem = $("#"+value2);
			elem.removeClass("enclosed");
			if (isComplete){
				elem.addClass("enclosed");
			}
		})

	})
}
function traverseEnclose(elem, position){
	if (elem.hasClass("wall") || elem.hasClass("visited")) return 0;
	if (elem.hasClass("blank")) {
		visited[position]["enclosed"] = false;
		return 0;
	}
	elem.addClass("visited");
	visited[position]["island"].push(elem.prop("id"));
	if (elem.hasClass("clue")){
		visited[position]["clue"].push(elem.prop("id"));
	}
	let curRow = elem.data("row");
	let curCol = elem.data("col");

	let ctr = 1;
	$.each(direction, function (key, value) {
		let neighbor = $(`#cell_${curRow + value[0]}_${curCol + value[1]}`);
		if (!neighbor.length) {
			return;
		}
		ctr += traverseEnclose(neighbor, position);
	})
	return ctr;
}


