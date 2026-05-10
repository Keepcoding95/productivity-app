export const TASK_WORKSPACE_KEY = Symbol('taskWorkspace');

export const TASK_VIEW_KEY = 'flow-task-view';
export const safeTaskViews = ['list', 'kanban', 'calendar'];

export function readStoredTaskView() {
    if (typeof localStorage === 'undefined') {
        return 'list';
    }
    const v = localStorage.getItem(TASK_VIEW_KEY);
    return safeTaskViews.includes(v) ? v : 'list';
}

export const LIST_SORT_KEY = 'flow-task-list-sort';
export const LIST_OVERDUE_FILTER_KEY = 'flow-task-list-overdue-only';

export function readStoredListSort() {
    if (typeof localStorage === 'undefined') {
        return 'due_date';
    }
    const v = localStorage.getItem(LIST_SORT_KEY);
    return v === 'manual' ? 'manual' : 'due_date';
}

export function readStoredOverdueOnlyFilter() {
    if (typeof localStorage === 'undefined') {
        return false;
    }
    return localStorage.getItem(LIST_OVERDUE_FILTER_KEY) === '1';
}

/** Matches API / migration: todo | in_progress | review | done */
export const taskStatuses = [
    { value: 'todo', label: 'To do' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
];

/** Focus demand tiers — API: low | medium | high · UI colors: light→red, steady→yellow, deep→green */
export const taskEnergyLevels = [
    {
        value: 'low',
        title: 'Light',
        hint: 'Low demand — fine when you’re tired, scattered, or between meetings.',
    },
    {
        value: 'medium',
        title: 'Steady',
        hint: 'Medium demand — one main thread, few hard jumps.',
    },
    {
        value: 'high',
        title: 'Deep',
        hint: 'Peak demand — block calendar time for hard thinking or careful craft.',
    },
];
