<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    use HasFactory;

    protected $fillable = [
        'donated_by',
        'donation_type',
        'donation_amount',
        'donation_quantity',
        'usable_quantity',
        'damaged_quantity',
        'unusable_quantity',
        'donation_date',
        'donation_description',
        'item_type',
        'received_by',
        'usage_status',
        'usage_location',
        'usage_notes',
    ];

    
}
