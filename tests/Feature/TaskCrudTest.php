<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskCrudTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: Project} */
    private function userAndProject(): array
    {
        $user = User::factory()->create();
        $project = Project::create([
            'name' => 'P',
            'user_id' => $user->id,
        ]);

        return [$user, $project];
    }

    public function test_index_filters_by_project_and_search_query(): void
    {
        [$user, $project] = $this->userAndProject();
        $other = Project::create(['name' => 'Other', 'user_id' => $user->id]);

        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Alpha beta',
            'status' => 'todo',
        ]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Gamma',
            'status' => 'todo',
        ]);
        Task::create([
            'user_id' => $user->id,
            'project_id' => $other->id,
            'title' => 'Alpha other',
            'status' => 'todo',
        ]);

        Sanctum::actingAs($user);

        $res = $this->getJson('/api/tasks?project_id='.$project->id.'&q=beta');
        $res->assertOk();
        $titles = collect($res->json('data'))->pluck('title')->all();
        $this->assertSame(['Alpha beta'], $titles);
    }

    public function test_store_show_update_destroy_task(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $create = $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'New item',
            'description' => 'Desc',
            'status' => 'in_progress',
        ]);

        $create->assertCreated();
        $id = $create->json('id');
        $this->assertSame('New item', $create->json('title'));
        $this->assertSame('in_progress', $create->json('status'));

        $this->getJson("/api/tasks/{$id}")
            ->assertOk()
            ->assertJsonPath('title', 'New item');

        $this->patchJson("/api/tasks/{$id}", [
            'title' => 'Updated',
            'status' => 'review',
        ])->assertOk();

        $this->assertSame('Updated', Task::find($id)->title);

        $this->deleteJson("/api/tasks/{$id}")
            ->assertOk();

        $this->assertNull(Task::find($id));
    }

    public function test_user_cannot_access_another_users_task(): void
    {
        [$user, $project] = $this->userAndProject();
        $other = User::factory()->create();
        Sanctum::actingAs($other);

        $task = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Secret',
            'status' => 'todo',
        ]);

        $this->getJson("/api/tasks/{$task->id}")->assertForbidden();
        $this->patchJson("/api/tasks/{$task->id}", ['title' => 'X'])->assertForbidden();
        $this->deleteJson("/api/tasks/{$task->id}")->assertForbidden();
    }

    public function test_store_and_update_energy_level_and_index_filter(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $low = $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Light task',
            'energy_level' => 'low',
        ]);
        $low->assertCreated();
        $this->assertSame('low', $low->json('energy_level'));

        $high = $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Deep task',
            'energy_level' => 'high',
        ]);
        $high->assertCreated();

        $filtered = $this->getJson('/api/tasks?project_id='.$project->id.'&energy_level=high');
        $filtered->assertOk();
        $titles = collect($filtered->json('data'))->pluck('title')->all();
        $this->assertSame(['Deep task'], $titles);

        $id = $high->json('id');
        $this->patchJson("/api/tasks/{$id}", [
            'energy_level' => 'medium',
        ])->assertOk();
        $this->assertSame('medium', Task::find($id)->energy_level);

        $this->patchJson("/api/tasks/{$id}", [
            'energy_level' => null,
        ])->assertOk();
        $this->assertNull(Task::find($id)->energy_level);
    }

    public function test_store_rejects_invalid_energy_level(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Bad energy',
            'energy_level' => 'extreme',
        ])->assertUnprocessable();

        $created = $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Ok',
        ]);
        $created->assertCreated();
        $id = $created->json('id');

        $this->patchJson("/api/tasks/{$id}", [
            'energy_level' => 'invalid',
        ])->assertUnprocessable();
    }

    public function test_index_rejects_invalid_query_filters(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $this->getJson('/api/tasks?project_id='.$project->id.'&energy_level=nope')
            ->assertUnprocessable();

        $this->getJson('/api/tasks?project_id='.$project->id.'&status=phantom')
            ->assertUnprocessable();
    }

    public function test_store_and_patch_reject_invalid_status(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'X',
            'status' => 'bogus',
        ])->assertUnprocessable();

        $created = $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Y',
        ]);
        $created->assertCreated();
        $id = $created->json('id');

        $this->patchJson("/api/tasks/{$id}", ['status' => 'invalid'])
            ->assertUnprocessable();
    }

    public function test_guest_cannot_list_tasks(): void
    {
        $this->getJson('/api/tasks')->assertUnauthorized();
    }

    public function test_index_returns_meta_and_has_more_with_per_page(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        for ($i = 0; $i < 4; $i++) {
            Task::create([
                'user_id' => $user->id,
                'project_id' => $project->id,
                'title' => 'Task '.$i,
                'status' => 'todo',
                'position' => $i,
            ]);
        }

        $res = $this->getJson('/api/tasks?project_id='.$project->id.'&per_page=2');
        $res->assertOk();
        $this->assertCount(2, $res->json('data'));
        $this->assertTrue($res->json('meta.has_more'));
        $this->assertSame(2, $res->json('meta.per_page'));
        $this->assertSame(1, $res->json('meta.current_page'));
        $this->assertSame(4, $res->json('meta.total'));

        $all = $this->getJson('/api/tasks?project_id='.$project->id.'&per_page=50');
        $all->assertOk();
        $this->assertCount(4, $all->json('data'));
        $this->assertFalse($all->json('meta.has_more'));
        $this->assertSame(4, $all->json('meta.total'));
    }

    public function test_index_rejects_invalid_per_page(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $this->getJson('/api/tasks?project_id='.$project->id.'&per_page=0')
            ->assertUnprocessable();

        $this->getJson('/api/tasks?project_id='.$project->id.'&per_page=501')
            ->assertUnprocessable();
    }

    public function test_index_second_page(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        for ($i = 0; $i < 5; $i++) {
            Task::create([
                'user_id' => $user->id,
                'project_id' => $project->id,
                'title' => 'Task '.$i,
                'status' => 'todo',
                'position' => $i,
            ]);
        }

        $p2 = $this->getJson('/api/tasks?project_id='.$project->id.'&per_page=2&page=2');
        $p2->assertOk();
        $this->assertCount(2, $p2->json('data'));
        $this->assertSame(2, $p2->json('meta.current_page'));
        $this->assertSame(5, $p2->json('meta.total'));
        $this->assertTrue($p2->json('meta.has_more'));

        $p3 = $this->getJson('/api/tasks?project_id='.$project->id.'&per_page=2&page=3');
        $p3->assertOk();
        $this->assertCount(1, $p3->json('data'));
        $this->assertFalse($p3->json('meta.has_more'));
    }

    public function test_batch_reorder_updates_positions(): void
    {
        [$user, $project] = $this->userAndProject();
        Sanctum::actingAs($user);

        $a = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'A',
            'status' => 'todo',
            'position' => 0,
        ]);
        $b = Task::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'B',
            'status' => 'todo',
            'position' => 1,
        ]);

        $this->postJson('/api/tasks/reorder', [
            'updates' => [
                ['id' => $a->id, 'status' => 'in_progress', 'position' => 0],
                ['id' => $b->id, 'status' => 'in_progress', 'position' => 1],
            ],
        ])->assertOk()
            ->assertJsonPath('updated', 2);

        $a->refresh();
        $b->refresh();
        $this->assertSame('in_progress', $a->status);
        $this->assertSame(0, $a->position);
        $this->assertSame('in_progress', $b->status);
        $this->assertSame(1, $b->position);
    }

    public function test_reorder_rejects_other_users_task(): void
    {
        [$user, $project] = $this->userAndProject();
        $intruder = User::factory()->create();
        $foreignProject = Project::create(['name' => 'Foreign', 'user_id' => $intruder->id]);
        $foreign = Task::create([
            'user_id' => $intruder->id,
            'project_id' => $foreignProject->id,
            'title' => 'Secret',
            'status' => 'todo',
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/tasks/reorder', [
            'updates' => [
                ['id' => $foreign->id, 'status' => 'todo', 'position' => 0],
            ],
        ])->assertNotFound();
    }

    public function test_store_rejects_project_owned_by_other_user(): void
    {
        [$owner, $project] = $this->userAndProject();
        $intruder = User::factory()->create();
        Sanctum::actingAs($intruder);

        $this->postJson('/api/tasks', [
            'project_id' => $project->id,
            'title' => 'Nope',
        ])->assertUnprocessable();
    }
}
