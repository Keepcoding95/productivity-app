<script setup>
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';
import {
    energyPickTierClass,
    energyMeterSegmentClass,
} from '../taskPresentation';

const {
    taskEnergyLevels,
    newTaskTitle,
    newTaskDescription,
    newTaskDueDate,
    newTaskDueTime,
    newTaskEstimatedMinutes,
    newTaskEnergyLevel,
    taskFormError,
    creatingTask,
    newTaskEnergyCoach,
    createTask,
} = injectTaskWorkspace();
</script>

<template>
    <form
        class="mt-5 space-y-3 border-b border-slate-200/50 pb-5 dark:border-white/[0.06]"
        @submit.prevent="createTask"
    >
        <p class="flow-section-label text-slate-500 dark:text-neutral-500">
            New task
        </p>
        <div>
            <label
                class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                for="task-title"
                >Title</label
            >
            <input
                id="task-title"
                v-model="newTaskTitle"
                type="text"
                required
                maxlength="255"
                placeholder="What needs to be done?"
                class="flow-input"
            />
        </div>
        <div>
            <label
                class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                for="task-desc"
                >Description (optional)</label
            >
            <input
                id="task-desc"
                v-model="newTaskDescription"
                type="text"
                class="flow-input"
            />
        </div>
        <div>
            <label
                class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                for="task-due"
                >Due date (optional)</label
            >
            <input
                id="task-due"
                v-model="newTaskDueDate"
                type="date"
                class="flow-input max-w-[12rem]"
            />
        </div>
        <div class="flex flex-wrap gap-4">
            <div class="min-w-[9rem] flex-1">
                <label
                    class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                    for="task-due-time"
                    >Due time (optional)</label
                >
                <input
                    id="task-due-time"
                    v-model="newTaskDueTime"
                    type="time"
                    :disabled="!newTaskDueDate"
                    class="flow-input max-w-[12rem] disabled:opacity-50"
                />
            </div>
            <div class="min-w-[9rem] flex-1">
                <label
                    class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                    for="task-est"
                    >Estimate (minutes)</label
                >
                <input
                    id="task-est"
                    v-model="newTaskEstimatedMinutes"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 25"
                    class="flow-input max-w-[12rem]"
                />
            </div>
        </div>
        <div>
            <div
                class="mb-2 flex flex-wrap items-end justify-between gap-2"
            >
                <div>
                    <p
                        class="flow-section-label text-slate-500 dark:text-neutral-500"
                    >
                        Focus demand
                    </p>
                    <p
                        class="mt-0.5 text-sm font-medium text-slate-700 dark:text-neutral-200"
                    >
                        How heavy is this mentally?
                    </p>
                </div>
            </div>
            <div
                class="flow-focus-rail"
                role="group"
                aria-label="Focus demand tier"
            >
                <div
                    class="grid grid-cols-3 gap-1 sm:gap-1.5"
                >
                    <button
                        v-for="opt in taskEnergyLevels"
                        :key="'ne-tier-' + opt.value"
                        type="button"
                        :class="
                            energyPickTierClass(
                                opt.value,
                                newTaskEnergyLevel,
                            )
                        "
                        :title="opt.hint"
                        :aria-pressed="
                            newTaskEnergyLevel === opt.value
                        "
                        @click="
                            newTaskEnergyLevel =
                                newTaskEnergyLevel ===
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
                                    :key="'ne-bar-' + opt.value + si"
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
            <p
                class="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-neutral-500"
            >
                {{ newTaskEnergyCoach }}
            </p>
        </div>
        <div class="flex justify-end">
            <button
                type="submit"
                :disabled="creatingTask"
                class="flow-btn-primary"
            >
                {{ creatingTask ? 'Saving…' : 'Add task' }}
            </button>
        </div>
        <p
            v-if="taskFormError"
            class="text-sm text-red-600 dark:text-red-300"
        >
            {{ taskFormError }}
        </p>
    </form>
</template>
