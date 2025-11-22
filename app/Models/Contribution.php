<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'contribution_type',
        'amount',
        'mandatory', // ✅ Add this
    ];
    public function payments()
    {
        return $this->hasMany(Payment::class, 'contribution_id', 'id');
    }
    public function schoolYearContributions()
    {
        return $this->hasMany(SchoolYearContribution::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}
