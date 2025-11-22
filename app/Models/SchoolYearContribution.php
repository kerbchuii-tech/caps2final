<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYearContribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_year_id',
        'grade_level_id',
        'contribution_id',
        'total_amount',
    ];

    // Relationships
    // public function schoolYear()
    // {
    //     return $this->belongsTo(SchoolYear::class);
    // }

    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }

    // public function contribution()
    // {
    //     return $this->belongsTo(Contribution::class);
    // }



    public function contribution()
    {
        return $this->belongsTo(Contribution::class, 'contribution_id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }
}


