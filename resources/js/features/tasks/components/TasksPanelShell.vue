<script setup>
import { ref, nextTick } from 'vue';
import TaskCreateForm from './TaskCreateForm.vue';
import TaskListView from './TaskListView.vue';
import TaskKanbanView from './TaskKanbanView.vue';
import TaskCalendarView from './TaskCalendarView.vue';
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';

const taskViewTabs = [
    { key: 'list', label: 'List' },
    { key: 'kanban', label: 'Kanban' },
    { key: 'calendar', label: 'Calendar' },
];

const VIEW_TAB_KEYS = taskViewTabs.map((t) => t.key);

const taskViewTablistRef = ref(null);

/** List view only — avoids fighting Kanban horizontal scroll + calendar week strip */
let swipeStartX = 0;
let swipeStartY = 0;

const {
    projects,
    selectedProjectId,
    taskViewMode,
    taskOpError,
    tasks,
    loadingTasks,
    loadingTasksMore,
    syncingBoardTasks,
    tasksLoadError,
    tasksLoadHasMore,
    tasksListTotal,
    loadTasks,
    loadMoreTasks,
} = injectTaskWorkspace();

function focusTaskViewTab(index) {
    const root = taskViewTablistRef.value;
    if (!root) {
        return;
    }
    const tabs = root.querySelectorAll('button[role="tab"]');
    tabs[index]?.focus?.();
}

function onTaskViewTablistKeydown(e) {
    const idx = VIEW_TAB_KEYS.indexOf(taskViewMode.value);
    let nextIdx = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIdx = (idx + 1) % VIEW_TAB_KEYS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIdx = (idx - 1 + VIEW_TAB_KEYS.length) % VIEW_TAB_KEYS.length;
    } else if (e.key === 'Home') {
        e.preventDefault();
        nextIdx = 0;
    } else if (e.key === 'End') {
        e.preventDefault();
        nextIdx = VIEW_TAB_KEYS.length - 1;
    } else {
        return;
    }
    taskViewMode.value = VIEW_TAB_KEYS[nextIdx];
    nextTick(() => focusTaskViewTab(nextIdx));
}

function onSwipeTouchStart(e) {
    if (taskViewMode.value !== 'list') {
        return;
    }
    const t = e.touches?.[0];
    if (!t) {
        return;
    }
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
}

function onSwipeTouchEnd(e) {
    if (taskViewMode.value !== 'list') {
        return;
    }
    const t = e.changedTouches?.[0];
    if (!t) {
        return;
    }
    const dx = t.clientX - swipeStartX;
    const dy = t.clientY - swipeStartY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < 72 || ax < ay * 1.35) {
        return;
    }
    const idx = VIEW_TAB_KEYS.indexOf(taskViewMode.value);
    if (dx < 0 && idx < VIEW_TAB_KEYS.length - 1) {
        taskViewMode.value = VIEW_TAB_KEYS[idx + 1];
        nextTick(() => focusTaskViewTab(idx + 1));
    } else if (dx > 0 && idx > 0) {
        taskViewMode.value = VIEW_TAB_KEYS[idx - 1];
        nextTick(() => focusTaskViewTab(idx - 1));
    }
}
</script>

<template>
    <div
        v-if="projects.length > 0"
        class="flow-panel p-5 sm:p-6"
    >
        <div
            class="sticky z-30 -mx-5 mb-4 border-b border-slate-200/55 bg-white/90 px-5 pb-3 pt-0 backdrop-blur-lg dark:border-white/10 dark:bg-neutral-950/90 sm:-mx-6 sm:px-6"
            style="
                top: max(0.35rem, env(safe-area-inset-top, 0px));
            "
        >
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="flow-section-label mb-1">
                        Tasks
                    </h2>
                    <p class="text-xs text-slate-500 dark:text-neutral-500">
                        <template v-if="selectedProjectId">
                            Scope ·
                            <span
                                class="font-semibold text-cyan-600 dark:text-cyan-400"
                                >{{
                                    projects.find(
                                        (p) => p.id === selectedProjectId,
                                    )?.name
                                }}</span
                            >
                        </template>
                    </p>
                </div>
                <!-- Compact legend on phones -->
                <div
                    class="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden dark:text-neutral-500"
                    aria-label="Status colors"
                >
                    <span class="inline-flex items-center gap-1"
                        ><span
                            class="size-1.5 shrink-0 rounded-full bg-slate-500"
                        />To do</span
                    >
                    <span class="inline-flex items-center gap-1"
                        ><span
                            class="size-1.5 shrink-0 rounded-full bg-cyan-400"
                        />Active</span
                    >
                    <span class="inline-flex items-center gap-1"
                        ><span
                            class="size-1.5 shrink-0 rounded-full bg-amber-400"
                        />Review</span
                    >
                    <span class="inline-flex items-center gap-1"
                        ><span
                            class="size-1.5 shrink-0 rounded-full bg-emerald-400"
                        />Done</span
                    >
                </div>
                <div
                    class="hidden flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:flex dark:text-neutral-500"
                >
                    <span class="flex items-center gap-1.5"
                        ><span
                            class="h-2 w-2 rounded-full bg-slate-500"
                        />To do</span
                    >
                    <span class="flex items-center gap-1.5"
                        ><span
                            class="h-2 w-2 rounded-full bg-cyan-400"
                        />Active</span
                    >
                    <span class="flex items-center gap-1.5"
                        ><span
                            class="h-2 w-2 rounded-full bg-amber-400"
                        />Review</span
                    >
                    <span class="flex items-center gap-1.5"
                        ><span
                            class="h-2 w-2 rounded-full bg-emerald-400"
                        />Done</span
                    >
                </div>
            </div>

            <div
                ref="taskViewTablistRef"
                class="flow-tab-track mt-3"
                role="tablist"
                aria-label="Task view mode"
                @keydown="onTaskViewTablistKeydown"
            >
                <button
                    v-for="opt in taskViewTabs"
                    :key="opt.key"
                    type="button"
                    role="tab"
                    class="flow-tab min-h-11 min-w-[4.75rem] flex-1 sm:flex-none sm:min-h-0"
                    :class="
                        taskViewMode === opt.key ? 'flow-tab-active' : ''
                    "
                    :aria-selected="taskViewMode === opt.key"
                    :tabindex="taskViewMode === opt.key ? 0 : -1"
                    @click="taskViewMode = opt.key"
                >
                    {{ opt.label }}
                </button>
            </div>
            <p
                class="mt-2 text-center text-[10px] leading-snug text-slate-400 lg:hidden dark:text-neutral-500"
            >
                List: swipe the task area horizontally to switch views.
                Kanban &amp; Calendar: use tabs — avoids scroll clashes.
            </p>
        </div>

        <p
            v-if="
                syncingBoardTasks &&
                (taskViewMode === 'kanban' ||
                    taskViewMode === 'calendar')
            "
            class="mt-1 flex items-center gap-2 text-xs font-medium text-cyan-700 dark:text-cyan-300/95"
            role="status"
        >
            <span
                class="flow-sync-pulse"
                aria-hidden="true"
            />
            Pulling every card onto the board…
        </p>

        <TaskCreateForm />

        <p
            v-if="taskOpError"
            class="mt-4 rounded-xl border border-red-200/90 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200"
        >
            {{ taskOpError }}
        </p>

        <div
            v-if="tasksLoadError"
            class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200/90 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200"
        >
            <span>{{ tasksLoadError }}</span>
            <button
                type="button"
                class="shrink-0 rounded-lg border border-red-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-900 transition hover:bg-white dark:border-red-500/40 dark:bg-red-950/80 dark:text-red-100 dark:hover:bg-red-900/60"
                @click="loadTasks"
            >
                Retry
            </button>
        </div>

        <p
            v-if="loadingTasks && tasks.length > 0"
            class="mt-4 text-xs text-slate-500 dark:text-neutral-500"
        >
            Refreshing task list…
        </p>

        <div
            v-if="
                tasksLoadHasMore &&
                !tasksLoadError &&
                tasks.length > 0 &&
                taskViewMode === 'list'
            "
            class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/90 px-3 py-2.5 text-xs dark:border-white/10 dark:bg-neutral-950/50"
        >
            <span class="text-slate-600 dark:text-neutral-400">
                Showing {{ tasks.length }} task{{
                    tasks.length === 1 ? '' : 's'
                }}<template v-if="tasksListTotal != null">
                    ({{ tasksListTotal }} total)</template
                >.
            </span>
            <button
                type="button"
                class="flow-btn-ghost shrink-0 px-3 py-1.5 text-xs"
                :disabled="loadingTasksMore || loadingTasks"
                @click="loadMoreTasks"
            >
                {{
                    loadingTasksMore ? 'Loading…' : 'Load more'
                }}
            </button>
        </div>

        <template v-if="!tasksLoadError">
            <p
                v-if="tasks.length === 0 && !loadingTasks"
                class="mt-4 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/70 px-3 py-4 text-sm leading-relaxed text-slate-600 dark:border-white/12 dark:bg-neutral-900/45 dark:text-neutral-400"
            >
                No tasks in this project yet — add one above. Try
                <span class="font-semibold text-slate-800 dark:text-neutral-200"
                    >Kanban</span
                >
                for drag-and-drop status, or
                <span class="font-semibold text-slate-800 dark:text-neutral-200"
                    >Calendar</span
                >
                once tasks have due dates.
            </p>
            <div
                v-else-if="tasks.length > 0"
                class="touch-pan-y"
                @touchstart.passive="onSwipeTouchStart"
                @touchend.passive="onSwipeTouchEnd"
            >
                <TaskListView
                    v-if="taskViewMode === 'list'"
                />
                <TaskKanbanView
                    v-else-if="taskViewMode === 'kanban'"
                />
                <TaskCalendarView
                    v-else-if="taskViewMode === 'calendar'"
                />
            </div>
            <div
                v-else-if="loadingTasks && tasks.length === 0"
                class="mt-4 space-y-3"
                aria-busy="true"
                aria-live="polite"
            >
                <div class="flow-task-skeleton-bar h-14 w-full" />
                <div class="flow-task-skeleton-bar h-14 w-full opacity-90" />
                <div class="flow-task-skeleton-bar h-14 w-full opacity-75" />
                <p class="text-center text-xs text-slate-500 dark:text-neutral-500">
                    Loading tasks…
                </p>
            </div>
        </template>
    </div>
</template>
