<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'grade_level_id'];

    /**
     * A section belongs to one grade level.
     */
    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }

    public function students()
{
    return $this->hasMany(Student::class);
}

}
