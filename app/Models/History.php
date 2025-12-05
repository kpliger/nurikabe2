<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class History extends Model
{
	/**
	* The attributes that are mass assignable.
	*
	* @var list<string>
	*/
   protected $fillable = [
		'difficulty',
		'game_date',
		'win_second',
		'user_id',
   ];

   /**
	* The attributes that should be hidden for serialization.
	*
	* @var list<string>
	*/
   protected $hidden = [
	//    'password',
	//    'remember_token',
   ];

   /**
	* Get the attributes that should be cast.
	*
	* @return array<string, string>
	*/
   protected function casts(): array
   {
	   return [
		//    'email_verified_at' => 'datetime',
		//    'password' => 'hashed',
	   ];
   }

   public function user(): BelongsTo
   {
		return $this->belongsTo(User::class);
   }
}
