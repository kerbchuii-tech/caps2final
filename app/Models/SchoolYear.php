<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_active',
    ];

    /**
     * Scope to get only the active school year.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get all students in this school year.
     */
    public function students()
    {
        return $this->hasMany(Student::class);
    }

    /**
     * Get all payments through students in this school year.
     */
    public function payments()
    {
        return $this->hasManyThrough(Payment::class, Student::class);
    }

    /**
     * Get all donations for this school year.
     */
    public function donations()
    {
        return $this->hasMany(Donation::class);
    }

    // App\Models\SchoolYear.php
public function contributions()
{
    return $this->hasMany(SchoolYearContribution::class);
}

}
