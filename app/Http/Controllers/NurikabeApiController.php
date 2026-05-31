<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class NurikabeApiController extends Controller
{
	function __construct(){

	}
	public function getBoard(Request $request){
		$difficulty = $request->difficulty;
		$date = str_replace('-','/', $request->date);

		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, "https://puzzlemadness.co.uk/api/user/data/nurikabe/$difficulty/$date");
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$response = curl_exec($ch);
		curl_close($ch);

		echo $response;
	}

	public function playBoard(Request $request, ?string $size=null, ?string $year=null, ?string $month=null, ?string $day=null){
		return Inertia::render("board/Board", [
			"user"	=> $request->user(),
			"size"	=> $size,
			"year"	=> $year,
			"month"	=> $month,
			"day"		=> $day,
			"env" 	=> env('APP_ENV'),
		]);
	}

	public function showCalendar(Request $request, ?string $year=null, ?string $month=null){

		if($year === null){
			$year = date("Y");
		}
		if($month === null){
			$month = date("m");
		}
		$search = sprintf("%d-%02d", $year, $month);

		$histories = [];
		if($request->user()){
			$histories = $request->user()->history()
				->where('game_date', 'like', '%'.$search.'%')
				->groupby('game_date', 'difficulty')
				->get(["difficulty", 'game_date']);
		}

		$prevMonth = date("Y-m", strtotime("$year-$month -1 month"));
		$prevMonth = explode("-", $prevMonth);
		$nextMonth = date("Y-m", strtotime("$year-$month +1 month"));
		$nextMonth = explode("-",$nextMonth);



		return Inertia::render("calendar/Calendar", [
			"user"			=> $request->user(),
			"year"			=> $year,
			"month"			=> $month,
			"history" 	=> $histories,
			"prevMonth"	=> [
				"year" =>$prevMonth[0],
				"month" =>$prevMonth[1],
			],
			"nextMonth"	=> [
				"year" =>$nextMonth[0],
				"month" =>$nextMonth[1],
			],
		]);
	}
}
