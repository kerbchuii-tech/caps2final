<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentHistory extends Model
{
    protected $fillable = [
        'payment_id',
        'school_year_contribution_id',
        'amount_paid',
        'payment_date',
        'balance_before',
        'balance_after',
    ];

    protected $casts = [
        'payment_date' => 'datetime',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function schoolYearContribution()
    {
        return $this->belongsTo(SchoolYearContribution::class);
    }
}
