<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'guardian_id',
        'grade_level_id',
        'section_id',
        'school_year_id',
        'lrn',
        'first_name',
        'middle_name',
        'last_name',
        'balance',
        'contribution_balance',
        'status',
        'archived', 
    ];

    // Belongs to a guardian
    public function guardian()
    {
        return $this->belongsTo(Guardian::class);
    }

    // Belongs to a grade level
    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class, 'grade_level_id');
    }

    // Contributions via grade level
    public function contributions()
    {
        return $this->gradeLevel
            ? $this->gradeLevel->schoolYearContributions()->with('contribution')->get()
            : collect([]);
    }

    // Belongs to a section
    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    // Belongs to a school year
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    // ✅ Add payments relationship
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    // public function student()
    // {
    //     return $this->belongsTo(Student::class);
    // }

    public function getTotalBalanceAttribute()
{
    return $this->balances()->sum('amount');
}

}
