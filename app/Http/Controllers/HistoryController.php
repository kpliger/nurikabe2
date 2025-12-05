<?php

namespace App\Http\Controllers;

use App\Models\History;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class HistoryController extends Controller
{
	/**
	 * Display a listing of the resource.
	 */
	public function index(Request $request)
	{
		$search = $request->input('search');
		$sortField = $request->input('sort', 'id');
		$sortDirection = $request->input('direction', 'desc');

		$histories = $request->user()->history()
			->where('game_date', 'like', '%'.$search.'%')
			->orderBy($sortField, $sortDirection)
			->paginate(10)
			->withQueryString();

		return Inertia::render("history/History", [
			"history"=> $histories,
			"search"=>$search,
			"sort"=> $sortField,
			"direction"=> $sortDirection,
		]);
	}

	/**
	 * Show the form for creating a new resource.
	 */
	public function create()
	{
		//
	}

	/**
	 * Store a newly created resource in storage.
	 */
	public function store(Request $request)
	{
		//
	}

	/**
	 * Display the specified resource.
	 */
	public function show(string $id)
	{
		//
	}

	/**
	 * Show the form for editing the specified resource.
	 */
	public function edit(string $id)
	{
		//
	}

	/**
	 * Update the specified resource in storage.
	 */
	public function update(Request $request, string $id)
	{
		//
	}

	/**
	 * Remove the specified resource from storage.
	 */
	public function destroy(string $id)
	{
		//
	}
	public function recordWin(Request $request)
	{

		$user = $request->user();

		History::create([
			'difficulty' => $request->difficulty,
			'game_date' => $request->date,
			'win_second' => $request->time,
			'user_id' => $user->id
		]);

		$response = [
			'code'=>0,
			'data'=> "Successfully recorded game. ",
		];
		return \json_encode($response);
	}
	public function getPersonalsBest(Request $request)
	{
		$user = $request->user();
		if($user === null) return [
			'code'=>'1',
			'data'=>'No user found',
		];

		$pb = $request->user()->history()
			->select(["win_second",])
			->where([
				["difficulty",$request->difficulty],
				["game_date", $request->date],
			])
			->orderBy("win_second", "asc")
			->first()
		;

		$response = [
			'code'=>0,
			'data'=> $pb,
		];
		return \json_encode($response);
	}
}
