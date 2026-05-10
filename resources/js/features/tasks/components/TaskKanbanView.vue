<script setup>
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';
import {
    energyPickTierClass,
    energyMeterSegmentClass,
    energyBadgeSegmentClass,
    taskEnergyBadgePillClass,
    formatTaskDuePlain,
    isTaskOverdue,
    taskRowClass,
    taskTitleClass,
    formatTaskEnergyLine,
    taskEnergyHint,
} from '../taskPresentation';

const {
    taskStatuses,
    taskEnergyLevels,
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
    deletingTaskId,
    deleteTask,
    beginEditTask,
    tasksForKanban,
    onKanbanDragOver,
    onKanbanDrop,
    onKanbanDragStart,
    onKanbanDropOnCard,
} = injectTaskWorkspace();
</script>

<template>
    <div
        class="mt-4 flex snap-x snap-mandatory flex-row gap-3 overflow-x-auto overflow-y-visible pb-2 [-webkit-overflow-scrolling:touch] lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0 lg:snap-none"
        role="region"
        aria-label="Kanban board — swipe sideways on smaller screens"
    >
        <div
            v-for="col in taskStatuses"
            :key="'col-' + col.value"
            class="flex max-h-[min(70vh,26rem)] w-[min(85vw,17.25rem)] shrink-0 snap-start flex-col rounded-xl border border-dashed border-slate-300/50 bg-slate-50/40 p-2 backdrop-blur-sm lg:max-h-none lg:w-auto lg:min-h-0 lg:min-w-0 lg:shrink md:min-h-[min(52vh,320px)] lg:min-h-[min(60vh,380px)] dark:border-white/[0.08] dark:bg-neutral-950/50"
            @dragover="onKanbanDragOver"
            @drop.prevent="onKanbanDrop($event, col.value)"
        >
            <div
                class="mb-2 shrink-0 border-b border-slate-200/60 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-neutral-400"
            >
                {{ col.label }}
            </div>
            <div
                class="flex min-h-[5rem] flex-none flex-col gap-2 overflow-y-auto md:min-h-0 md:flex-1 md:overscroll-y-contain [-webkit-overflow-scrolling:touch]"
            >
                <div
                    v-for="t in tasksForKanban(col.value)"
                    :key="'kb-' + t.id"
                    :draggable="editingTaskId !== t.id"
                    class="group relative min-w-0 w-full px-3 py-3 text-left shadow-sm transition"
                    :class="
                        editingTaskId === t.id
                            ? [
                                  taskRowClass(t.status),
                                  'cursor-default ring-2 ring-cyan-500/30 ring-offset-2 ring-offset-white dark:ring-cyan-400/35 dark:ring-offset-neutral-950',
                              ]
                            : [
                                  taskRowClass(t.status),
                                  'cursor-grab active:cursor-grabbing',
                              ]
                    "
                    @dragstart="onKanbanDragStart($event, t)"
                    @dragover.prevent
                    @drop.stop.prevent="
                        onKanbanDropOnCard($event, t)
                    "
                >
                    <form
                        v-if="editingTaskId === t.id"
                        class="space-y-2"
                        @submit.prevent="saveTaskEdit"
                        @click.stop
                    >
                        <div>
                            <label
                                class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                                :for="'kb-edit-title-' + t.id"
                                >Title</label
                            >
                            <input
                                :id="'kb-edit-title-' + t.id"
                                v-model="editTaskTitle"
                                type="text"
                                required
                                maxlength="255"
                                class="flow-input py-1.5 text-sm"
                            />
                        </div>
                        <div>
                            <label
                                class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                                :for="'kb-edit-desc-' + t.id"
                                >Description</label
                            >
                            <input
                                :id="'kb-edit-desc-' + t.id"
                                v-model="editTaskDescription"
                                type="text"
                                class="flow-input py-1.5 text-sm"
                            />
                        </div>
                        <div>
                            <label
                                class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                                :for="'kb-edit-due-' + t.id"
                                >Due date</label
                            >
                            <input
                                :id="'kb-edit-due-' + t.id"
                                v-model="editTaskDueDate"
                                type="date"
                                class="flow-input max-w-[12rem] py-1.5 text-sm"
                            />
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <div class="min-w-[7rem] flex-1">
                                <label
                                    class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                                    :for="'kb-edit-due-time-' + t.id"
                                    >Due time</label
                                >
                                <input
                                    :id="'kb-edit-due-time-' + t.id"
                                    v-model="editTaskDueTime"
                                    type="time"
                                    :disabled="!editTaskDueDate"
                                    class="flow-input max-w-[11rem] py-1.5 text-sm disabled:opacity-50"
                                />
                            </div>
                            <div class="min-w-[7rem] flex-1">
                                <label
                                    class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                                    :for="'kb-edit-est-' + t.id"
                                    >Est. min</label
                                >
                                <input
                                    :id="'kb-edit-est-' + t.id"
                                    v-model="editTaskEstimatedMinutes"
                                    type="number"
                                    min="0"
                                    step="1"
                                    class="flow-input max-w-[11rem] py-1.5 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <p
                                class="mb-0.5 text-[10px] font-medium text-slate-500 dark:text-neutral-400"
                            >
                                Focus demand
                            </p>
                            <div
                                class="flow-focus-rail flow-focus-rail--compact"
                                role="group"
                                :aria-label="
                                    'Focus demand for ' +
                                    t.title
                                "
                            >
                                <div
                                    class="grid grid-cols-3 gap-0.5"
                                >
                                    <button
                                        v-for="opt in taskEnergyLevels"
                                        :key="
                                            'kb-ee-tier-' +
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
                                                    v-for="(
                                                        seg, si
                                                    ) in [
                                                        0, 1, 2,
                                                    ]"
                                                    :key="
                                                        'kb-ee-bar-' +
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
                        <div
                            class="flex flex-wrap justify-end gap-1.5 pt-0.5"
                        >
                            <button
                                type="button"
                                class="rounded-lg border border-slate-200/80 bg-slate-100/80 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                                @click="cancelEditTask"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                :disabled="
                                    savingTaskId === t.id
                                "
                                class="flow-btn-primary px-2.5 py-1 text-[11px] shadow-md shadow-cyan-500/15"
                            >
                                {{
                                    savingTaskId === t.id
                                        ? 'Saving…'
                                        : 'Save'
                                }}
                            </button>
                        </div>
                    </form>
                    <div v-else class="min-w-0">
                        <p
                            class="text-sm font-medium leading-snug"
                            :class="taskTitleClass(t.status)"
                        >
                            {{ t.title }}
                        </p>
                        <p
                            v-if="t.description"
                            class="mt-1 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-neutral-400"
                        >
                            {{ t.description }}
                        </p>
                        <span
                            v-if="formatTaskDuePlain(t)"
                            class="mt-1.5 block text-[11px] leading-relaxed tabular-nums"
                            :class="
                                isTaskOverdue(t)
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-neutral-500'
                            "
                        >{{ formatTaskDuePlain(t) }}</span>
                        <div
                            v-if="t.energy_level"
                            class="mt-1.5 flex flex-wrap items-center gap-1.5"
                        >
                            <span
                                :title="taskEnergyHint(t.energy_level)"
                                :class="
                                    taskEnergyBadgePillClass(
                                        t.energy_level,
                                        true,
                                    )
                                "
                            >
                                <span
                                    class="inline-flex w-6 gap-px self-center"
                                    aria-hidden="true"
                                >
                                    <span
                                        v-for="seg in [0, 1, 2]"
                                        :key="
                                            'kb-' +
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
                        <!-- Match list actions; hidden until hover/focus on md+ (touch phones always see controls) -->
                        <div
                            class="mt-2 flex flex-wrap justify-end gap-1.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        >
                            <button
                                type="button"
                                class="rounded-md border border-slate-200/80 bg-slate-100/80 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-slate-700 hover:bg-slate-200/80 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 sm:text-[11px] sm:py-1"
                                :disabled="
                                    savingTaskId === t.id ||
                                    deletingTaskId === t.id
                                "
                                @click.stop="beginEditTask(t)"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                class="rounded-md border border-red-200/90 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 sm:text-[11px] sm:py-1"
                                :disabled="
                                    savingTaskId === t.id ||
                                    deletingTaskId === t.id
                                "
                                @click.stop="deleteTask(t)"
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
            </div>
        </div>
    </div>
</template>
