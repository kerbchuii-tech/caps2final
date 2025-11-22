<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    // ✅ Update fillable fields
    protected $fillable = [
        'title',
        'message',
        'announcement_date',
        'type',
        'created_by',
        'is_archived',
    ];

    // ✅ Relationship to user who created the announcement
    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
