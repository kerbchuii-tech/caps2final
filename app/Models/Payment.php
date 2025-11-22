<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'contribution_id',
        'school_year_id',
        'amount_paid',
        'payment_date',
    ];

    /**
     * A payment belongs to a student.
     */

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    /**
     * A payment belongs to a contribution.
     */
    public function contribution()
    {
        return $this->belongsTo(Contribution::class);
    }

    /**
     * A payment may be linked to a fund history.
     */
   public function fundHistories()
{
    return $this->hasMany(FundHistory::class, 'payment_id');
}


public function schoolYearContribution()
{
    return $this->belongsTo(\App\Models\SchoolYearContribution::class, 'contribution_id', 'contribution_id');
}

public function schoolYear()
{
    return $this->belongsTo(SchoolYear::class, 'school_year_id');
}
}
