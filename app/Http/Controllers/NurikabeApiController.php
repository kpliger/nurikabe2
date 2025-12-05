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
			"day"	=> $day,
		]);
	}
}
