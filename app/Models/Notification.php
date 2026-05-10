<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Notification extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'task_id',
        'type',
        'title',
        'message',
        'reminder_kind',
        'reminder_calendar_date',
        'read_at',
        'data',
    ];

    protected static function booted(): void
    {
        static::creating(function (Notification $model): void {
            if ($model->getKey() === null) {
                $model->setAttribute($model->getKeyName(), (string) Str::uuid());
            }
        });
    }

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'reminder_calendar_date' => 'date',
            'data' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}

