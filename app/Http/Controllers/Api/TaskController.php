<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    /** @var list<string> */
    private const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'];

    /** @var list<string> */
    private const ENERGY_LEVELS = ['low', 'medium', 'high'];

    /**
     * List tasks for the authenticated user, with optional filters.
     */
    public function index(Request $request)
    {
        $request->validate([
            'project_id' => ['sometimes', 'integer'],
            'q' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(self::TASK_STATUSES)],
            'energy_level' => ['sometimes', 'string', Rule::in(self::ENERGY_LEVELS)],
            'due_from' => ['sometimes', 'date'],
            'due_to' => ['sometimes', 'date'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = $request->user()->tasks()->orderBy('position')->orderByDesc('updated_at');

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('q')) {
            $term = '%'.addcslashes($request->string('q')->trim(), '%_\\').'%';
            $query->where('title', 'like', $term);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('energy_level')) {
            $query->where('energy_level', $request->string('energy_level'));
        }

        if ($request->filled('due_from')) {
            $query->whereDate('due_date', '>=', $request->date('due_from'));
        }

        if ($request->filled('due_to')) {
            $query->whereDate('due_date', '<=', $request->date('due_to'));
        }

        $perPage = min(max((int) $request->query('per_page', 50), 1), 500);

        $tasks = $query->paginate(perPage: $perPage, page: $request->integer('page', 1));

        return response()->json([
            'data' => $tasks->items(),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
                'has_more' => $tasks->hasMorePages(),
            ],
        ]);
    }

    /**
     * Atomically update status + position for Kanban drag-and-drop (same user only).
     */
    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'updates' => ['required', 'array', 'min:1', 'max:120'],
            'updates.*.id' => ['required', 'integer'],
            'updates.*.status' => ['required', 'string', Rule::in(self::TASK_STATUSES)],
            'updates.*.position' => ['required', 'integer', 'min:0'],
        ]);

        $userId = $request->user()->id;

        DB::transaction(function () use ($validated, $userId): void {
            foreach ($validated['updates'] as $row) {
                $task = Task::query()
                    ->where('user_id', $userId)
                    ->whereKey($row['id'])
                    ->firstOrFail();

                $patch = [
                    'status' => $row['status'],
                    'position' => $row['position'],
                ];

                $this->applyCompletedAtForStatusChange($task, $patch);

                $task->update($patch);
            }
        });

        return response()->json([
            'message' => 'Tasks updated',
            'updated' => count($validated['updates']),
        ]);
    }

    /**
     * Create a task for the user, under a project they own.
     */
    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $validated = $request->validate([
            'project_id' => [
                'required',
                'integer',
                Rule::exists('projects', 'id')->where('user_id', $userId),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(self::TASK_STATUSES)],
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'estimated_duration' => ['nullable', 'integer', 'min:0'],
            'energy_level' => ['nullable', 'string', Rule::in(self::ENERGY_LEVELS)],
            'position' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['user_id'] = $userId;

        if (empty($validated['status'] ?? null)) {
            $validated['status'] = 'todo';
        }

        if (empty($validated['due_date'] ?? null)) {
            $validated['due_time'] = null;
        }

        $validated['completed_at'] = ($validated['status'] ?? 'todo') === 'done'
            ? now()
            : null;

        $task = Task::create($validated);

        return response()->json($task, 201);
    }

    /**
     * Show a task if it belongs to the user.
     */
    public function show(Request $request, Task $task)
    {
        $this->authorizeTask($request, $task);

        $task->load('project');

        return response()->json($task);
    }

    /**
     * Update a task if it belongs to the user.
     */
    public function update(Request $request, Task $task)
    {
        $this->authorizeTask($request, $task);

        $userId = $request->user()->id;

        $validated = $request->validate([
            'project_id' => [
                'sometimes',
                'integer',
                Rule::exists('projects', 'id')->where('user_id', $userId),
            ],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(self::TASK_STATUSES)],
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'estimated_duration' => ['nullable', 'integer', 'min:0'],
            'energy_level' => ['nullable', 'string', Rule::in(self::ENERGY_LEVELS)],
            'position' => ['nullable', 'integer', 'min:0'],
        ]);

        $effectiveDueDate = array_key_exists('due_date', $validated)
            ? $validated['due_date']
            : $task->due_date;

        if ($effectiveDueDate === null || $effectiveDueDate === '') {
            $validated['due_time'] = null;
        }

        $this->applyCompletedAtForStatusChange($task, $validated);

        $task->update($validated);

        return response()->json($task->fresh());
    }

    /**
     * Delete a task if it belongs to the user.
     */
    public function destroy(Request $request, Task $task)
    {
        $this->authorizeTask($request, $task);

        $task->delete();

        return response()->json(['message' => 'Task deleted']);
    }

    private function authorizeTask(Request $request, Task $task): void
    {
        abort_unless($task->user_id === $request->user()->id, 403);
    }

    /**
     * Set or clear completed_at when entering/leaving "done". Preserves timestamp while task stays done.
     *
     * @param  array<string, mixed>  $validated
     */
    private function applyCompletedAtForStatusChange(Task $task, array &$validated): void
    {
        $wasDone = $task->status === 'done';
        $willBeDone = array_key_exists('status', $validated)
            ? $validated['status'] === 'done'
            : $wasDone;

        if (! $wasDone && $willBeDone) {
            $validated['completed_at'] = now();
        } elseif ($wasDone && ! $willBeDone) {
            $validated['completed_at'] = null;
        }
    }
}
