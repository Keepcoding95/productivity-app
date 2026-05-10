<script setup>
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';
import {
    energyPickTierClass,
    energyMeterSegmentClass,
    energyBadgeSegmentClass,
    taskEnergyBadgePillClass,
    formatTaskDuePlain,
    isTaskOverdue,
    taskListShellClass,
    taskTitleClass,
    taskSelectClass,
    formatTaskEnergyLine,
    taskEnergyHint,
} from '../taskPresentation';

const {
    taskStatuses,
    taskEnergyLevels,
    listSearchQuery,
    listStatusFilter,
    listSortWrapRef,
    listSortMenuOpen,
    toggleListSortMenu,
    selectListSortMode,
    listSortMode,
    listShowOverdueOnly,
    openQuickCapture,
    listViewTasks,
    listDiscoveryNoMatches,
    editingTaskId,
    saveTaskEdit,
    cancelEditTask,
    editTaskTitle,
    editTaskDescription,
    editTaskDueDate,
    editTaskDueTime,
    editTaskEstimatedMinutes,
    editTaskEnergyLevel,
    savingTaskId,
    deleteTask,
    beginEditTask,
    updateTaskStatus,
    deletingTaskId,
} = injectTaskWorkspace();
</script>

<template>
<div
            class="mt-4 flex flex-col gap-3 border-b border-slate-200/40 pb-4 dark:border-white/[0.06]"
        >
            <div
                class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            >
                <label class="sr-only" for="task-list-search"
                    >Search tasks by title</label
                >
                <input
                    id="task-list-search"
                    v-model="listSearchQuery"
                    type="search"
                    autocomplete="off"
                    placeholder="Search titles…"
                    class="flow-input min-w-0 flex-1 py-2 text-sm sm:min-w-[10rem] sm:max-w-xs"
                />
                <label class="sr-only" for="task-list-status"
                    >Filter by status</label
                >
                <select
                    id="task-list-status"
                    v-model="listStatusFilter"
                    class="flow-input w-full py-2 text-sm sm:w-auto sm:min-w-[10rem]"
                >
                    <option value="">All statuses</option>
                    <option
                        v-for="opt in taskStatuses"
                        :key="'ls-' + opt.value"
                        :value="opt.value"
                    >
                        {{ opt.label }}
                    </option>
                </select>
            <div
                ref="listSortWrapRef"
                class="relative w-full sm:w-auto"
            >
                <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-xl border border-slate-300/55 bg-white/40 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-white/[0.08] dark:focus-visible:ring-cyan-400/45 dark:focus-visible:ring-offset-neutral-950"
                    aria-haspopup="listbox"
                    :aria-expanded="listSortMenuOpen"
                    @click="toggleListSortMenu"
                >
                    Sort
                    <svg
                        class="size-4 shrink-0 text-slate-500 transition-transform dark:text-neutral-400"
                        :class="
                            listSortMenuOpen ? '-rotate-180' : ''
                        "
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                <transition name="flow-fade">
                    <ul
                        v-show="listSortMenuOpen"
                        class="absolute left-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 py-1 text-sm shadow-[0_12px_40px_-16px_rgb(15_23_42_/_.35)] backdrop-blur-md dark:border-white/[0.1] dark:bg-neutral-950/95 dark:shadow-[0_16px_48px_-16px_rgb(0_0_0_/_.65)]"
                        role="listbox"
                        aria-label="Sort list"
                    >
                        <li role="presentation">
                            <button
                                type="button"
                                role="option"
                                class="flex w-full items-center px-3 py-2 text-left text-slate-800 transition hover:bg-slate-100/90 focus-visible:bg-slate-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/35 dark:text-neutral-100 dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06] dark:focus-visible:ring-cyan-400/35"
                                :class="
                                    listSortMode === 'due_date'
                                        ? 'bg-slate-50 font-medium dark:bg-white/[0.04]'
                                        : ''
                                "
                                :aria-selected="
                                    listSortMode === 'due_date'
                                "
                                @click="
                                    selectListSortMode(
                                        'due_date',
                                    )
                                "
                            >
                                Due date
                            </button>
                        </li>
                        <li role="presentation">
                            <button
                                type="button"
                                role="option"
                                class="flex w-full items-center px-3 py-2 text-left text-slate-800 transition hover:bg-slate-100/90 focus-visible:bg-slate-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/35 dark:text-neutral-100 dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06] dark:focus-visible:ring-cyan-400/35"
                                :class="
                                    listSortMode === 'manual'
                                        ? 'bg-slate-50 font-medium dark:bg-white/[0.04]'
                                        : ''
                                "
                                :aria-selected="
                                    listSortMode === 'manual'
                                "
                                @click="
                                    selectListSortMode(
                                        'manual',
                                    )
                                "
                            >
                                Manual
                            </button>
                        </li>
                    </ul>
                </transition>
            </div>
            <button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-neutral-950"
                :class="
                    listShowOverdueOnly
                        ? 'border-rose-400/50 bg-rose-500/15 text-rose-800 dark:border-rose-400/35 dark:bg-rose-950/50 dark:text-rose-100'
                        : 'border-slate-300/55 bg-white/40 text-slate-600 hover:bg-white/70 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:bg-white/[0.08]'
                "
                @click="
                    listShowOverdueOnly =
                        !listShowOverdueOnly
                "
            >
                {{
                    listShowOverdueOnly
                        ? 'Overdue only · on'
                        : 'Overdue only · off'
                }}
            </button>
            <div
                class="flex flex-wrap gap-2 border-t border-slate-200/50 pt-2 sm:border-0 sm:pt-0"
            >
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-950 transition hover:bg-cyan-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:border-cyan-400/35 dark:bg-cyan-400/10 dark:text-cyan-50 dark:hover:bg-cyan-400/15 dark:focus-visible:ring-cyan-400/40 dark:focus-visible:ring-offset-neutral-950"
                    title="Add a task quickly (Ctrl+Shift+K)"
                    aria-keyshortcuts="Control+Shift+K"
                    @click="openQuickCapture"
                >
                    <svg
                        class="h-3.5 w-3.5 shrink-0 opacity-70"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <rect
                            width="20"
                            height="12"
                            x="2"
                            y="8"
                            rx="2"
                            ry="2"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"
                        />
                    </svg>
                    Quick add
                </button>
            </div>
            </div>
        </div>

        <p
            v-if="
                listViewTasks.length === 0 &&
                    listShowOverdueOnly
            "
            class="mt-4 rounded-xl border border-rose-200/60 bg-rose-50/80 px-3 py-2.5 text-sm text-rose-900 dark:border-rose-500/25 dark:bg-rose-950/40 dark:text-rose-100"
        >
            No overdue tasks right now. Tap
            <span class="font-semibold">Overdue only · on</span>
            above to turn the filter off, or use this shortcut:
            <button
                type="button"
                class="mt-3 block w-full rounded-xl border border-rose-400/40 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-900 transition hover:bg-white dark:border-rose-400/30 dark:bg-rose-950/60 dark:text-rose-50 dark:hover:bg-rose-900/50 sm:inline-block sm:w-auto"
                @click="listShowOverdueOnly = false"
            >
                Show all tasks
            </button>
        </p>

        <p
            v-else-if="listDiscoveryNoMatches"
            class="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/90 px-3 py-2.5 text-sm text-slate-800 dark:border-white/10 dark:bg-neutral-900/50 dark:text-neutral-200"
        >
            No tasks match this search or filters.
            <button
                type="button"
                class="ml-2 font-semibold text-cyan-700 underline decoration-cyan-600/40 underline-offset-2 hover:text-cyan-600 dark:text-cyan-400 dark:decoration-cyan-400/40"
                @click="
                    listSearchQuery = '';
                    listStatusFilter = '';
                "
            >
                Clear filters
            </button>
        </p>

        <ul
            v-else-if="listViewTasks.length > 0"
            class="mt-3 space-y-3"
        >
        <li
            v-for="t in listViewTasks"
            :key="t.id"
            class="rounded-lg border px-3 py-3 transition-colors duration-200"
            :class="taskListShellClass(t)"
        >
            <form
                v-if="editingTaskId === t.id"
                class="space-y-3"
                @submit.prevent="saveTaskEdit"
            >
                <div>
                    <label
                        class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                        :for="'edit-title-' + t.id"
                        >Title</label
                    >
                    <input
                        :id="'edit-title-' + t.id"
                        v-model="editTaskTitle"
                        type="text"
                        required
                        maxlength="255"
                        class="flow-input py-2"
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                        :for="'edit-desc-' + t.id"
                        >Description</label
                    >
                    <input
                        :id="'edit-desc-' + t.id"
                        v-model="editTaskDescription"
                        type="text"
                        class="flow-input py-2"
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                        :for="'edit-due-' + t.id"
                        >Due date</label
                    >
                    <input
                        :id="'edit-due-' + t.id"
                        v-model="editTaskDueDate"
                        type="date"
                        class="flow-input max-w-[12rem] py-2"
                    />
                </div>
                <div class="flex flex-wrap gap-4">
                    <div class="min-w-[9rem] flex-1">
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            :for="'edit-due-time-' + t.id"
                            >Due time</label
                        >
                        <input
                            :id="'edit-due-time-' + t.id"
                            v-model="editTaskDueTime"
                            type="time"
                            :disabled="!editTaskDueDate"
                            class="flow-input max-w-[12rem] py-2 disabled:opacity-50"
                        />
                    </div>
                    <div class="min-w-[9rem] flex-1">
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            :for="'edit-est-' + t.id"
                            >Estimate (minutes)</label
                        >
                        <input
                            :id="'edit-est-' + t.id"
                            v-model="editTaskEstimatedMinutes"
                            type="number"
                            min="0"
                            step="1"
                            class="flow-input max-w-[12rem] py-2"
                        />
                    </div>
                </div>
                <div>
                    <p
                        class="mb-2 text-sm font-medium text-slate-500 dark:text-neutral-400"
                    >
                        Focus demand
                    </p>
                    <div
                        class="flow-focus-rail"
                        role="group"
                        :aria-label="
                            'Focus demand for ' + t.title
                        "
                    >
                        <div
                            class="grid grid-cols-3 gap-1 sm:gap-1.5"
                        >
                            <button
                                v-for="opt in taskEnergyLevels"
                                :key="
                                    'ee-tier-' +
                                    t.id +
                                    '-' +
                                    opt.value
                                "
                                type="button"
                                :class="
                                    energyPickTierClass(
                                        opt.value,
                                        editTaskEnergyLevel,
                                    )
                                "
                                :title="opt.hint"
                                :aria-pressed="
                                    editTaskEnergyLevel ===
                                    opt.value
                                "
                                @click="
                                    editTaskEnergyLevel =
                                        editTaskEnergyLevel ===
                                        opt.value
                                            ? ''
                                            : opt.value
                                "
                            >
                                <div class="flow-focus-tier-stack">
                                    <div
                                        class="flow-focus-meter"
                                        aria-hidden="true"
                                    >
                                        <span
                                            v-for="(seg, si) in [
                                                0, 1, 2,
                                            ]"
                                            :key="
                                                'ee-bar-' +
                                                t.id +
                                                opt.value +
                                                si
                                            "
                                            class="flow-focus-meter-seg"
                                        >
                                            <span
                                                class="flow-focus-meter-bar"
                                                :class="
                                                    energyMeterSegmentClass(
                                                        opt.value,
                                                        seg,
                                                    )
                                                "
                                            />
                                        </span>
                                    </div>
                                    <span class="flow-focus-tier-label">{{
                                        opt.title
                                    }}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        class="rounded-xl border border-slate-200/80 bg-slate-100/80 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                        @click="cancelEditTask"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        :disabled="savingTaskId === t.id"
                        class="flow-btn-primary px-3 py-1.5 text-xs shadow-md shadow-cyan-500/15"
                    >
                        {{
                            savingTaskId === t.id
                                ? 'Saving…'
                                : 'Save'
                        }}
                    </button>
                </div>
            </form>
            <div v-else>
                <div
                    class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                >
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span
                                v-if="t.status === 'done'"
                                class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                                title="Done"
                            >
                                <svg
                                    class="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </span>
                            <p
                                class="font-medium tracking-tight transition-colors"
                                :class="taskTitleClass(t.status)"
                            >
                                {{ t.title }}
                            </p>
                        </div>
                        <p
                            v-if="t.description"
                            class="mt-1 text-sm"
                            :class="
                                t.status === 'done'
                                    ? 'text-emerald-600/80 dark:text-emerald-300/70'
                                    : 'text-slate-500 dark:text-neutral-400'
                            "
                        >
                            {{ t.description }}
                        </p>
                        <span
                            v-if="formatTaskDuePlain(t)"
                            class="mt-2 block text-[11px] leading-relaxed tabular-nums"
                            :class="
                                isTaskOverdue(t)
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-neutral-500'
                            "
                        >{{ formatTaskDuePlain(t) }}</span>
                        <div
                            v-if="t.energy_level"
                            class="mt-1.5 flex flex-wrap items-center gap-2"
                        >
                            <span
                                class="max-w-full"
                                :title="
                                    taskEnergyHint(
                                        t.energy_level,
                                    )
                                "
                                :class="
                                    taskEnergyBadgePillClass(
                                        t.energy_level,
                                    )
                                "
                            >
                                <span
                                    class="inline-flex w-7 shrink-0 gap-px self-center"
                                    aria-hidden="true"
                                >
                                    <span
                                        v-for="seg in [
                                            0, 1, 2,
                                        ]"
                                        :key="
                                            'lb-' +
                                            t.id +
                                            '-' +
                                            seg
                                        "
                                        :class="
                                            energyBadgeSegmentClass(
                                                t.energy_level,
                                                seg,
                                            )
                                        "
                                    />
                                </span>
                                {{ formatTaskEnergyLine(t) }}
                            </span>
                        </div>
                    </div>
                    <div
                        class="flex flex-wrap items-center gap-2 sm:justify-end"
                    >
                        <label class="sr-only" :for="'st-' + t.id"
                            >Status</label
                        >
                        <select
                            :id="'st-' + t.id"
                            class="max-sm:min-h-11 rounded-md border px-2 py-2 text-xs transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 sm:px-1.5 sm:py-1 dark:focus:ring-cyan-500/40"
                            :class="taskSelectClass(t.status)"
                            :value="t.status"
                            :disabled="
                                savingTaskId === t.id ||
                                deletingTaskId === t.id
                            "
                            @change="
                                updateTaskStatus(
                                    t,
                                    $event.target.value,
                                )
                            "
                        >
                            <option
                                v-for="opt in taskStatuses"
                                :key="opt.value"
                                :value="opt.value"
                            >
                                {{ opt.label }}
                            </option>
                        </select>
                        <button
                            type="button"
                            class="max-sm:min-h-11 max-sm:min-w-[2.75rem] rounded-md border border-slate-200/80 bg-slate-100/80 px-2 py-2 text-xs font-medium leading-none text-slate-700 hover:bg-slate-200/80 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 sm:px-1.5 sm:py-1 sm:text-[11px]"
                            :disabled="
                                savingTaskId === t.id ||
                                deletingTaskId === t.id
                            "
                            @click="beginEditTask(t)"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            class="max-sm:min-h-11 max-sm:min-w-[2.75rem] rounded-md border border-red-200/90 bg-red-50 px-2 py-2 text-xs font-medium leading-none text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 sm:px-1.5 sm:py-1 sm:text-[11px]"
                            :disabled="
                                savingTaskId === t.id ||
                                deletingTaskId === t.id
                            "
                            @click="deleteTask(t)"
                        >
                            {{
                                deletingTaskId === t.id
                                    ? '…'
                                    : 'Delete'
                            }}
                        </button>
                    </div>
                </div>
            </div>
        </li>
    </ul>
</template>
