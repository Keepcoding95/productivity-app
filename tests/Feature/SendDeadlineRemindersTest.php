<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SendDeadlineRemindersTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_creates_reminder_for_task_due_today(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10 09:00:00', 'UTC'));

        $user = User::factory()->create();
        $project = Project::create(['name' => 'P', 'user_id' => $user->id]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Due today task',
            'status' => 'todo',
            'due_date' => '2026-06-10',
        ]);

        Artisan::call('notifications:send-deadline-reminders');

        $this->assertSame(1, Notification::query()->count());
        $n = Notification::first();
        $this->assertSame('deadline_reminder', $n->type);
        $this->assertSame('Due today', $n->title);
        $this->assertSame('today', $n->data['reminder_kind']);
        $this->assertSame('today', $n->reminder_kind);
        $this->assertSame('2026-06-10', $n->reminder_calendar_date->format('Y-m-d'));
    }

    public function test_creates_reminder_for_task_due_tomorrow_with_due_date_as_calendar_key(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10 09:00:00', 'UTC'));

        $user = User::factory()->create();
        $project = Project::create(['name' => 'P', 'user_id' => $user->id]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Due tomorrow task',
            'status' => 'todo',
            'due_date' => '2026-06-11',
        ]);

        Artisan::call('notifications:send-deadline-reminders');

        $this->assertSame(1, Notification::query()->count());
        $n = Notification::first();
        $this->assertSame('tomorrow', $n->reminder_kind);
        $this->assertSame('Due tomorrow', $n->title);
        $this->assertSame('2026-06-11', $n->reminder_calendar_date->format('Y-m-d'));
    }

    public function test_two_tasks_due_same_tomorrow_both_get_reminders(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10 09:00:00', 'UTC'));

        $user = User::factory()->create();
        $project = Project::create(['name' => 'P', 'user_id' => $user->id]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'A',
            'status' => 'todo',
            'due_date' => '2026-06-11',
        ]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'B',
            'status' => 'todo',
            'due_date' => '2026-06-11',
        ]);

        Artisan::call('notifications:send-deadline-reminders');

        $this->assertSame(2, Notification::query()->count());
    }

    public function test_does_not_duplicate_same_day_reminder(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10 09:00:00', 'UTC'));

        $user = User::factory()->create();
        $project = Project::create(['name' => 'P', 'user_id' => $user->id]);
        $task = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Due today task',
            'status' => 'todo',
            'due_date' => '2026-06-10',
        ]);

        Artisan::call('notifications:send-deadline-reminders');
        Artisan::call('notifications:send-deadline-reminders');

        $this->assertSame(1, Notification::query()->where('task_id', $task->id)->count());
    }

    public function test_skips_done_tasks(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10 09:00:00', 'UTC'));

        $user = User::factory()->create();
        $project = Project::create(['name' => 'P', 'user_id' => $user->id]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Already done',
            'status' => 'done',
            'due_date' => '2026-06-10',
            'completed_at' => now(),
        ]);

        Artisan::call('notifications:send-deadline-reminders');

        $this->assertSame(0, Notification::query()->count());
    }
}
