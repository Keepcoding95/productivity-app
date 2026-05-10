<script setup>
import { computed } from 'vue';
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';
import {
    energyPickTierClass,
    energyMeterSegmentClass,
    calendarTaskPillClass,
    calendarTaskTooltip,
    formatTaskDuePlain,
    taskTitleClass,
    taskRowClass,
} from '../taskPresentation';

const {
    taskEnergyLevels,
    taskViewMode,
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
    beginEditTask,
    calendarMonthTitle,
    shiftCalendarMonth,
    shiftCalendarWeek,
    goCalendarToday,
    calendarCells,
    calendarWeekStrip,
    calendarSelectedIso,
    calendarAgendaHeading,
    isCalendarSelectedToday,
    tasksOnCalendarDay,
    tasksWithoutDue,
    selectCalendarDay,
} = injectTaskWorkspace();

const agendaTasks = computed(() =>
    tasksOnCalendarDay(calendarSelectedIso.value),
);
</script>

<template>
    <div class="mt-4">
        <div
            class="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-neutral-950/50"
        >
            <button
                type="button"
                class="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                aria-label="Previous month"
                @click="shiftCalendarMonth(-1)"
            >
                ←
            </button>
            <h3
                class="text-sm font-semibold capitalize text-slate-800 dark:text-neutral-100"
            >
                {{ calendarMonthTitle }}
            </h3>
            <button
                type="button"
                class="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                aria-label="Next month"
                @click="shiftCalendarMonth(1)"
            >
                →
            </button>
        </div>

        <!-- Mobile / tablet: week strip + agenda (standard pattern for narrow viewports) -->
        <div class="space-y-3 lg:hidden">
            <div
                class="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white/70 px-2 py-2 dark:border-white/10 dark:bg-neutral-950/55"
            >
                <button
                    type="button"
                    class="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    aria-label="Previous week"
                    @click="shiftCalendarWeek(-1)"
                >
                    ‹ Week
                </button>
                <button
                    type="button"
                    class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default disabled:opacity-45 border-cyan-500/35 bg-cyan-500/10 text-cyan-900 hover:bg-cyan-500/15 dark:border-cyan-400/28 dark:bg-cyan-500/12 dark:text-cyan-100 dark:hover:bg-cyan-500/18"
                    :disabled="isCalendarSelectedToday"
                    @click="goCalendarToday"
                >
                    Today
                </button>
                <button
                    type="button"
                    class="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    aria-label="Next week"
                    @click="shiftCalendarWeek(1)"
                >
                    Week ›
                </button>
            </div>

            <div
                class="rounded-xl border border-slate-200/65 bg-white/80 p-2 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-neutral-950/65 dark:shadow-black/25"
                role="tablist"
                aria-label="Select a day this week"
            >
                <div class="grid grid-cols-7 gap-1">
                    <button
                        v-for="day in calendarWeekStrip"
                        :key="'strip-' + day.iso"
                        type="button"
                        role="tab"
                        class="flex min-h-[3.75rem] flex-col items-center justify-center rounded-lg border px-0.5 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/55 dark:focus-visible:ring-cyan-400/45"
                        :aria-selected="calendarSelectedIso === day.iso"
                        :class="[
                            day.inMonth
                                ? ''
                                : 'opacity-45 dark:opacity-40',
                            calendarSelectedIso === day.iso
                                ? 'border-cyan-500/50 bg-cyan-500/12 shadow-inner shadow-cyan-500/10 dark:border-cyan-400/40 dark:bg-cyan-500/15'
                                : 'border-slate-200/70 bg-white/90 hover:border-slate-300 dark:border-white/10 dark:bg-neutral-900/75 dark:hover:border-white/18',
                            day.isToday && calendarSelectedIso !== day.iso
                                ? 'ring-1 ring-cyan-500/35 dark:ring-cyan-400/28'
                                : '',
                        ]"
                        @click="selectCalendarDay(day.iso)"
                    >
                        <span
                            class="text-[10px] font-semibold uppercase leading-none tracking-wide text-slate-500 dark:text-neutral-500"
                            aria-hidden="true"
                            >{{ day.weekdayNarrow }}</span
                        >
                        <span
                            class="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-neutral-50"
                            >{{ day.dayNum }}</span
                        >
                        <span class="mt-1 flex h-3 items-center justify-center">
                            <span
                                v-if="day.taskCount > 0"
                                class="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-bold leading-none text-white dark:bg-cyan-400 dark:text-neutral-950"
                            >
                                {{
                                    day.taskCount > 9
                                        ? '9+'
                                        : day.taskCount
                                }}
                            </span>
                            <span v-else class="size-1 rounded-full bg-transparent" />
                        </span>
                    </button>
                </div>
            </div>

            <section
                class="rounded-xl border border-slate-200/70 bg-white/90 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-neutral-950/75"
                aria-labelledby="cal-agenda-heading"
            >
                <p
                    id="cal-agenda-heading"
                    class="flow-section-label mb-1 text-slate-500 dark:text-neutral-500"
                >
                    Agenda
                </p>
                <p
                    class="text-base font-semibold leading-snug text-slate-900 dark:text-neutral-50"
                >
                    {{ calendarAgendaHeading }}
                </p>
                <ul
                    v-if="agendaTasks.length"
                    class="mt-3 space-y-2"
                >
                    <li
                        v-for="t in agendaTasks"
                        :key="'ag-' + t.id"
                    >
                        <button
                            type="button"
                            class="w-full rounded-xl border px-3 py-3 text-left shadow-sm transition hover:ring-2 hover:ring-cyan-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45 dark:hover:ring-cyan-400/25 dark:focus-visible:ring-cyan-400/40"
                            :class="taskRowClass(t.status)"
                            :title="calendarTaskTooltip(t)"
                            @click="beginEditTask(t)"
                        >
                            <p
                                class="text-sm font-semibold leading-snug"
                                :class="taskTitleClass(t.status)"
                            >
                                {{ t.title }}
                            </p>
                            <p
                                v-if="t.description"
                                class="mt-1 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-neutral-400"
                            >
                                {{ t.description }}
                            </p>
                            <p
                                v-if="formatTaskDuePlain(t)"
                                class="mt-2 text-xs tabular-nums text-slate-500 dark:text-neutral-500"
                            >
                                {{ formatTaskDuePlain(t) }}
                            </p>
                        </button>
                    </li>
                </ul>
                <p
                    v-else
                    class="mt-4 rounded-lg border border-dashed border-slate-200/90 bg-slate-50/80 px-3 py-6 text-center text-sm text-slate-500 dark:border-white/12 dark:bg-neutral-900/40 dark:text-neutral-400"
                >
                    Nothing due this day — pick another date or add a due date to a task.
                </p>
            </section>
        </div>

        <!-- Desktop: classic month grid -->
        <div class="hidden lg:block">
            <div
                class="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500"
            >
                <span>Sun</span><span>Mon</span><span>Tue</span
                ><span>Wed</span><span>Thu</span><span>Fri</span
                ><span>Sat</span>
            </div>
            <div class="grid grid-cols-7 gap-1">
                <div
                    v-for="cell in calendarCells"
                    :key="'cal-' + cell.iso"
                    class="flex min-h-[5rem] cursor-pointer flex-col rounded-lg border border-slate-200/60 p-1.5 text-left transition lg:min-h-[4.75rem] dark:border-white/10"
                    :class="[
                        cell.inMonth
                            ? 'bg-white/85 dark:bg-neutral-950/65'
                            : 'opacity-40',
                        cell.isToday
                            ? 'ring-2 ring-cyan-500/50 dark:ring-cyan-400/35'
                            : '',
                        calendarSelectedIso === cell.iso
                            ? 'ring-2 ring-cyan-600/55 ring-offset-2 ring-offset-white dark:ring-cyan-400/45 dark:ring-offset-neutral-950'
                            : '',
                    ]"
                    @click="selectCalendarDay(cell.iso)"
                >
                    <span
                        class="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-neutral-300"
                        >{{ cell.dayNum }}</span
                    >
                    <ul
                        class="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                        @click.stop
                    >
                        <li
                            v-for="ct in tasksOnCalendarDay(cell.iso)"
                            :key="'cd-' + cell.iso + '-' + ct.id"
                        >
                            <button
                                type="button"
                                class="w-full cursor-pointer rounded-md px-2 py-1 text-left text-[10px] leading-tight transition hover:ring-2 hover:ring-cyan-500/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 dark:hover:ring-cyan-400/30 dark:focus-visible:ring-cyan-400/45"
                                :class="calendarTaskPillClass(ct.status)"
                                :title="calendarTaskTooltip(ct)"
                                @click.stop="beginEditTask(ct)"
                            >
                                {{ ct.title }}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div
            v-if="taskViewMode === 'calendar' && editingTaskId !== null"
            class="mt-4 rounded-xl border border-cyan-500/25 bg-white/85 px-3 py-3 shadow-[0_0_24px_-12px_rgb(34_211_238_/_.2)] backdrop-blur-sm dark:border-cyan-400/20 dark:bg-neutral-950/75 dark:shadow-[0_0_28px_-12px_rgb(0_0_0_/_.5)]"
        >
            <p
                class="flow-section-label mb-2 text-slate-500 dark:text-neutral-500"
            >
                Edit task
            </p>
            <form
                class="space-y-2"
                @submit.prevent="saveTaskEdit"
            >
                <div>
                    <label
                        class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                        :for="'cal-edit-title-' + editingTaskId"
                        >Title</label
                    >
                    <input
                        :id="'cal-edit-title-' + editingTaskId"
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
                        :for="'cal-edit-desc-' + editingTaskId"
                        >Description</label
                    >
                    <input
                        :id="'cal-edit-desc-' + editingTaskId"
                        v-model="editTaskDescription"
                        type="text"
                        class="flow-input py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label
                        class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                        :for="'cal-edit-due-' + editingTaskId"
                        >Due date</label
                    >
                    <input
                        :id="'cal-edit-due-' + editingTaskId"
                        v-model="editTaskDueDate"
                        type="date"
                        class="flow-input max-w-[12rem] py-1.5 text-sm"
                    />
                </div>
                <div class="flex flex-wrap gap-2">
                    <div class="min-w-[7rem] flex-1">
                        <label
                            class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                            :for="'cal-edit-due-time-' + editingTaskId"
                            >Due time</label
                        >
                        <input
                            :id="'cal-edit-due-time-' + editingTaskId"
                            v-model="editTaskDueTime"
                            type="time"
                            :disabled="!editTaskDueDate"
                            class="flow-input max-w-[11rem] py-1.5 text-sm disabled:opacity-50"
                        />
                    </div>
                    <div class="min-w-[7rem] flex-1">
                        <label
                            class="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-neutral-400"
                            :for="'cal-edit-est-' + editingTaskId"
                            >Est. min</label
                        >
                        <input
                            :id="'cal-edit-est-' + editingTaskId"
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
                        :aria-label="'Focus demand · ' + editTaskTitle"
                    >
                        <div class="grid grid-cols-3 gap-0.5">
                            <button
                                v-for="opt in taskEnergyLevels"
                                :key="
                                    'cal-ee-tier-' +
                                    editingTaskId +
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
                                    editTaskEnergyLevel === opt.value
                                "
                                @click="
                                    editTaskEnergyLevel =
                                        editTaskEnergyLevel === opt.value
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
                                            v-for="(seg, si) in [0, 1, 2]"
                                            :key="
                                                'cal-ee-bar-' +
                                                editingTaskId +
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
                <div class="flex flex-wrap justify-end gap-1.5 pt-0.5">
                    <button
                        type="button"
                        class="rounded-md border border-slate-200/80 bg-slate-100/80 px-1.5 py-1 text-[10px] font-medium leading-none text-slate-700 hover:bg-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 sm:text-[11px]"
                        @click="cancelEditTask"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        :disabled="savingTaskId === editingTaskId"
                        class="flow-btn-primary px-2 py-1 text-[10px] leading-none shadow-md shadow-cyan-500/15 sm:text-[11px]"
                    >
                        {{
                            savingTaskId === editingTaskId
                                ? 'Saving…'
                                : 'Save'
                        }}
                    </button>
                </div>
            </form>
        </div>

        <div
            v-if="tasksWithoutDue.length"
            class="mt-4 rounded-xl border-2 border-dashed border-slate-300/80 bg-slate-100/95 p-3 shadow-inner shadow-black/5 dark:border-white/15 dark:bg-neutral-900/65 dark:shadow-black/30"
        >
            <p
                class="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-300"
            >
                No due date ({{ tasksWithoutDue.length }})
            </p>
            <p
                class="mb-2 text-[11px] leading-snug text-slate-600 dark:text-neutral-400"
            >
                No calendar day until you set a due date — moving the card in
                Kanban only changes status.
            </p>
            <ul class="flex flex-wrap gap-2">
                <li
                    v-for="u in tasksWithoutDue"
                    :key="'ud-' + u.id"
                >
                    <button
                        type="button"
                        class="max-w-full cursor-pointer rounded-lg px-3 py-1 text-left text-[11px] transition hover:ring-2 hover:ring-cyan-500/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 dark:hover:ring-cyan-400/30 dark:focus-visible:ring-cyan-400/45"
                        :class="calendarTaskPillClass(u.status)"
                        :title="calendarTaskTooltip(u)"
                        @click="beginEditTask(u)"
                    >
                        {{ u.title }}
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>
