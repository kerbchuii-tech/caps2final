<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fund extends Model
{
    protected $fillable = [
        'month',
        'total_payments',
        'total_donations',
        'total_in_kind',   // ✅ added here
        'total_expenses',
        'total_funds',
    ];

    public function histories()
    {
        return $this->hasMany(FundHistory::class);
    }
}
