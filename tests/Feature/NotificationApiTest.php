<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unread_count_and_index_and_mark_read(): void
    {
        $user = User::factory()->create();
        $project = Project::create(['name' => 'P', 'user_id' => $user->id]);
        $task = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'T',
            'status' => 'todo',
        ]);

        $n = Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'deadline_reminder',
            'title' => 'Due',
            'message' => 'Soon',
            'reminder_kind' => 'today',
            'reminder_calendar_date' => now()->toDateString(),
            'data' => ['reminder_kind' => 'today'],
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJson(['count' => 1]);

        $index = $this->getJson('/api/notifications')->assertOk();
        $this->assertCount(1, $index->json('data'));
        $this->assertSame(1, $index->json('unread_count'));

        $read = $this->patchJson("/api/notifications/{$n->id}/read")
            ->assertOk();

        $this->assertNotNull($read->json('read_at'));

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJson(['count' => 0]);
    }

    public function test_mark_all_read(): void
    {
        $user = User::factory()->create();
        Notification::create([
            'user_id' => $user->id,
            'task_id' => null,
            'type' => 'test',
            'title' => 'A',
            'message' => null,
        ]);
        Notification::create([
            'user_id' => $user->id,
            'task_id' => null,
            'type' => 'test',
            'title' => 'B',
            'message' => null,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/notifications/read-all')->assertOk();

        $this->assertSame(0, $user->notifications()->whereNull('read_at')->count());
    }

    public function test_cannot_mark_another_users_notification_read(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $n = Notification::create([
            'user_id' => $owner->id,
            'task_id' => null,
            'type' => 'test',
            'title' => 'X',
            'message' => null,
        ]);

        Sanctum::actingAs($other);

        $this->patchJson("/api/notifications/{$n->id}/read")->assertForbidden();
    }
}
