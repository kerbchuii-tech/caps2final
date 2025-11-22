<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $fillable = [
        'expense_type',
        'amount',
        'expense_date',
        'description',
        'contribution_id',
        'donation_id'
    ];

  public function contribution()
{
    return $this->belongsTo(Contribution::class, 'contribution_id');
}

    public function donation()
{
    return $this->belongsTo(Donation::class, 'donation_id');
}

    public function schoolYear()
{
    return $this->belongsTo(SchoolYear::class, 'school_year_id');
}

}
