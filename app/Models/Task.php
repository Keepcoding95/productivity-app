<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = ['title', 'description', 'status', 'completed_at', 'due_date', 'due_time', 'estimated_duration', 'energy_level', 'position', 'user_id', 'project_id'];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
        ];
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
    public function project() {
        return $this->belongsTo(Project::class);
    }
}
