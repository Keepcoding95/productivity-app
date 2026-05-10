<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * List all projects belonging to the authenticated user.
     */
    public function index(Request $request)
    {
        $projects = $request->user()
            ->projects()
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $projects]);
    }

    /**
     * Create a new project for the authenticated user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $validated['user_id'] = $request->user()->id;

        $project = Project::create($validated);

        return response()->json($project, 201);
    }

    /**
     * Show a single project if it belongs to the user.
     */
    public function show(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);

        $project->load('tasks');

        return response()->json($project);
    }

    /**
     * Update a project if it belongs to the user.
     */
    public function update(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $project->update($validated);

        return response()->json($project);
    }

    /**
     * Delete a project if it belongs to the user (tasks are removed by DB cascade).
     */
    public function destroy(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);

        $project->delete();

        return response()->json(['message' => 'Project deleted']);
    }

    private function authorizeProject(Request $request, Project $project): void
    {
        abort_unless($project->user_id === $request->user()->id, 403);
    }
}
