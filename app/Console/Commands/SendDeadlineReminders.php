<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\UniqueConstraintViolationException;

class SendDeadlineReminders extends Command
{
    protected $signature = 'notifications:send-deadline-reminders';

    protected $description = 'Create in-app notifications for tasks due today or tomorrow';

    public function handle(): int
    {
        $today = Carbon::today();
        $tomorrow = Carbon::tomorrow();

        $created = 0;

        Task::query()
            ->where('status', '!=', 'done')
            ->whereNotNull('due_date')
            ->where(function ($q) use ($today, $tomorrow) {
                $q->whereDate('due_date', $today)
                    ->orWhereDate('due_date', $tomorrow);
            })
            ->each(function (Task $task) use ($today, $tomorrow, &$created) {
                $dueDate = Carbon::parse($task->due_date)->startOfDay();

                $kind = null;
                if ($dueDate->equalTo($today)) {
                    $kind = 'today';
                } elseif ($dueDate->equalTo($tomorrow)) {
                    $kind = 'tomorrow';
                }

                if ($kind === null) {
                    return;
                }

                $label = $kind === 'today' ? 'today' : 'tomorrow';

                try {
                    Notification::create([
                        'user_id' => $task->user_id,
                        'task_id' => $task->id,
                        'type' => 'deadline_reminder',
                        'title' => $kind === 'today' ? 'Due today' : 'Due tomorrow',
                        'message' => sprintf('"%s" is due %s.', $task->title, $label),
                        'reminder_kind' => $kind,
                        'reminder_calendar_date' => $dueDate->toDateString(),
                        'data' => [
                            'reminder_kind' => $kind,
                        ],
                    ]);

                    $created++;
                } catch (UniqueConstraintViolationException) {
                    return;
                }
            });

        $this->info("Deadline reminders created: {$created}.");

        return self::SUCCESS;
    }
}
