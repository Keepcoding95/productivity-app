<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_cannot_access_projects(): void
    {
        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/projects')->assertForbidden();
    }

    public function test_guest_cannot_list_projects(): void
    {
        $this->getJson('/api/projects')->assertUnauthorized();
    }

    public function test_authenticated_user_lists_projects(): void
    {
        $user = User::factory()->create();
        Project::create(['name' => 'Alpha', 'user_id' => $user->id]);
        Project::create(['name' => 'Beta', 'user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/projects');
        $response->assertOk();

        $names = collect($response->json('data'))->pluck('name')->sort()->values()->all();
        $this->assertSame(['Alpha', 'Beta'], $names);
    }

    public function test_authenticated_user_creates_project(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/projects', [
            'name' => 'New ship',
            'description' => 'Dock notes',
            'color' => '#112233',
        ]);

        $response->assertCreated();
        $this->assertSame('New ship', $response->json('name'));
        $this->assertDatabaseHas('projects', [
            'name' => 'New ship',
            'user_id' => $user->id,
        ]);
    }

    public function test_user_cannot_view_another_users_project(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $project = Project::create(['name' => 'Secret', 'user_id' => $owner->id]);

        Sanctum::actingAs($other);

        $this->getJson("/api/projects/{$project->id}")->assertForbidden();
    }

    public function test_user_updates_own_project(): void
    {
        $user = User::factory()->create();
        $project = Project::create(['name' => 'Old', 'user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->putJson("/api/projects/{$project->id}", [
            'name' => 'Renamed',
        ])
            ->assertOk()
            ->assertJsonPath('name', 'Renamed');

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Renamed',
        ]);
    }

    public function test_user_deletes_own_project(): void
    {
        $user = User::factory()->create();
        $project = Project::create(['name' => 'Trash', 'user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/projects/{$project->id}")
            ->assertOk();

        $this->assertDatabaseMissing('projects', [
            'id' => $project->id,
        ]);
    }

    public function test_user_cannot_delete_another_users_project(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $project = Project::create(['name' => 'Hands off', 'user_id' => $owner->id]);

        Sanctum::actingAs($other);

        $this->deleteJson("/api/projects/{$project->id}")->assertForbidden();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
        ]);
    }
}
