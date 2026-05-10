<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskCompletedAtTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: Project} */
    private function userAndProject(): array
    {
        $user = User::factory()->create();
        $project = Project::create([
            'name' => 'Test project',
            'user_id' => $user->id,
        ]);

        return [$user, $project];
    }

    public function test_completed_at_is_set_when_marking_task_done(): void
    {
        [$user, $project] = $this->userAndProject();
        $task = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'A task',
            'status' => 'todo',
        ]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/tasks/{$task->id}", [
            'status' => 'done',
        ])->assertOk();

        $task->refresh();
        $this->assertNotNull($task->completed_at);
    }

    public function test_completed_at_is_cleared_when_reopening_task(): void
    {
        [$user, $project] = $this->userAndProject();
        $task = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Done task',
            'status' => 'done',
            'completed_at' => now()->subHour(),
        ]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/tasks/{$task->id}", [
            'status' => 'todo',
        ])->assertOk();

        $task->refresh();
        $this->assertNull($task->completed_at);
    }

    public function test_completed_at_is_preserved_when_updating_done_task_without_status(): void
    {
        [$user, $project] = $this->userAndProject();
        $completedAt = now()->subDays(2)->startOfSecond();
        $task = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Stay done',
            'status' => 'done',
            'completed_at' => $completedAt,
        ]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/tasks/{$task->id}", [
            'title' => 'Renamed but still done',
        ])->assertOk();

        $task->refresh();
        $this->assertTrue($completedAt->equalTo($task->completed_at));
    }

    public function test_store_with_done_status_sets_completed_at(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Already done',
            'status' => 'done',
        ]);

        $response->assertCreated();
        $this->assertNotNull($response->json('completed_at'));
    }
}
