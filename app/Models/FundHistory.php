<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FundHistory extends Model
{
    use HasFactory;

    protected $table = 'funds_histories';

    protected $fillable = [
        'fund_id',
        'fund_date',
        'fund_description',
        'amount',
        'fund_type',
        'balance_before',
        'balance_after',
        'donation_id',
        'payment_id',
        'expense_id',
    ];

   public function fund()
{
    return $this->belongsTo(Fund::class);
}


    public function donation()
    {
        return $this->belongsTo(Donation::class);
    }

   public function payment()
{
    return $this->belongsTo(Payment::class);
}

    public function expense()
    {
        return $this->belongsTo(Expense::class);
    }
}
