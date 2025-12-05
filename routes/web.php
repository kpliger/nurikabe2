<?php

use App\Http\Controllers\HistoryController;
use App\Http\Controllers\NurikabeApiController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    // return Inertia::render('Welcome');
    return Inertia::render('Dashboard');
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('Dashboard');
})->name('dashboard');

Route::get('leaderboard', function () {
    return Inertia::render('Leaderboard');
})->middleware(['auth', 'verified'])->name('leaderboard');

Route::get('user/{id}', function ($id) {
    return Inertia::render('User', ['id'=>$id]);
})->middleware(['auth', 'verified'])->name('User');

Route::get('history', [HistoryController::class, 'index'])
    ->middleware(['auth', 'verified'])->name('history.index');

Route::get('tictactoe', function () {
    return Inertia::render('tictactoe/Tictactoe');
})->middleware(['auth', 'verified'])->name('Tictactoe');

Route::get('explanation', function () {
    return Inertia::render('explanation/Explanation');
})->middleware(['auth', 'verified'])->name('Explanation');


Route::get('board/{size?}/{year:year?}/{month:month?}/{day:day?}', [NurikabeApiController::class, 'playBoard'])
    // ->middleware(['auth', 'verified'])
    ->name('Board');

Route::post('fetchapi', [NurikabeApiController::class, 'getBoard']);
Route::post('history/recordWin', [HistoryController::class, 'recordWin']);
Route::post('history/getPersonalsBest', [HistoryController::class, 'getPersonalsBest']);



Route::fallback(function(){
    return 'Please try again. Kevin made this page. fallback';
});



require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
