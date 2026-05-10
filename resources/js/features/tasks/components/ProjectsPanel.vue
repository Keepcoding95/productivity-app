<script setup>
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';

const {
    projects,
    loadingProjects,
    projectsLoadError,
    loadProjects,
    newProjectName,
    newProjectDescription,
    newProjectColor,
    projectFormError,
    creatingProject,
    deletingProjectId,
    deleteProject,
    editingProjectId,
    editProjectName,
    editProjectDescription,
    editProjectColor,
    savingProjectId,
    beginEditProject,
    cancelEditProject,
    saveProjectEdit,
    selectedProjectId,
    selectProject,
    createProject,
} = injectTaskWorkspace();
</script>

<template>
<div class="flow-panel p-5 sm:p-6">
    <h2 class="flow-section-label mb-1">
        Projects
    </h2>
    <p class="text-xs text-slate-500 dark:text-neutral-500">
        Organize workstreams — tap to focus.
    </p>

    <p
        v-if="loadingProjects"
        class="mt-4 text-sm text-slate-500 dark:text-neutral-400"
    >
        Loading projects…
    </p>

    <div
        v-if="projectsLoadError"
        class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200/90 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200"
    >
        <span>{{ projectsLoadError }}</span>
        <button
            type="button"
            class="shrink-0 rounded-lg border border-red-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-900 transition hover:bg-white dark:border-red-500/40 dark:bg-red-950/80 dark:text-red-100 dark:hover:bg-red-900/60"
            @click="loadProjects"
        >
            Retry
        </button>
    </div>

    <form
        class="mt-5 space-y-3 border-b border-slate-200/50 pb-5 dark:border-white/[0.06]"
        :class="
            loadingProjects ? 'pointer-events-none opacity-60' : ''
        "
        @submit.prevent="createProject"
    >
        <p class="flow-section-label text-slate-500 dark:text-neutral-500">
            New project
        </p>
        <div>
            <label
                class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                for="project-name"
                >Name</label
            >
            <input
                id="project-name"
                v-model="newProjectName"
                type="text"
                required
                maxlength="255"
                placeholder="e.g. Orbit, Deep work"
                class="flow-input"
            />
        </div>
        <div>
            <label
                class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                for="project-desc"
                >Description (optional)</label
            >
            <input
                id="project-desc"
                v-model="newProjectDescription"
                type="text"
                class="flow-input"
            />
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
                <label
                    class="text-sm text-slate-500 dark:text-neutral-400"
                    for="project-color"
                    >Color</label
                >
                <input
                    id="project-color"
                    v-model="newProjectColor"
                    type="color"
                    class="h-7 w-7 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-full border-2 border-slate-300 bg-white p-0 dark:border-white/20 dark:bg-neutral-950 [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0"
                />
            </div>
            <button
                type="submit"
                :disabled="creatingProject"
                class="flow-btn-primary ml-auto"
            >
                {{ creatingProject ? 'Saving…' : 'Add project' }}
            </button>
        </div>
        <p
            v-if="projectFormError && editingProjectId === null"
            class="text-sm text-red-600 dark:text-red-300"
        >
            {{ projectFormError }}
        </p>
    </form>

    <p
        v-if="
            !loadingProjects &&
                !projectsLoadError &&
                projects.length === 0
        "
        class="mt-4 text-sm text-slate-500 dark:text-neutral-400"
    >
        No projects yet — create one above.
    </p>
    <template v-else>
    <p class="mt-3 text-xs text-slate-500">Tap a project to open its tasks.</p>
    <ul class="mt-2 space-y-2 text-sm">
        <li
            v-for="p in projects"
            :key="p.id"
            class="space-y-2"
        >
            <form
                v-if="editingProjectId === p.id"
                class="flex flex-col gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/40 p-3 dark:border-cyan-400/25 dark:bg-cyan-950/25"
                @submit.prevent="saveProjectEdit"
            >
                <p class="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
                    Edit project
                </p>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-slate-600 dark:text-neutral-400"
                        :for="'ep-name-' + p.id"
                        >Name</label
                    >
                    <input
                        :id="'ep-name-' + p.id"
                        v-model="editProjectName"
                        type="text"
                        required
                        maxlength="255"
                        class="flow-input py-2 text-sm"
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-slate-600 dark:text-neutral-400"
                        :for="'ep-desc-' + p.id"
                        >Description</label
                    >
                    <input
                        :id="'ep-desc-' + p.id"
                        v-model="editProjectDescription"
                        type="text"
                        class="flow-input py-2 text-sm"
                    />
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <label
                        class="text-xs text-slate-600 dark:text-neutral-400"
                        :for="'ep-color-' + p.id"
                        >Color</label
                    >
                    <input
                        :id="'ep-color-' + p.id"
                        v-model="editProjectColor"
                        type="color"
                        class="h-7 w-7 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-full border-2 border-slate-300 bg-white p-0 dark:border-white/20 dark:bg-neutral-950 [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0"
                    />
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        type="submit"
                        class="flow-btn-primary text-xs"
                        :disabled="savingProjectId === p.id"
                    >
                        {{
                            savingProjectId === p.id
                                ? 'Saving…'
                                : 'Save'
                        }}
                    </button>
                    <button
                        type="button"
                        class="flow-btn-ghost text-xs"
                        :disabled="savingProjectId === p.id"
                        @click="cancelEditProject"
                    >
                        Cancel
                    </button>
                </div>
                <p
                    v-if="projectFormError && editingProjectId === p.id"
                    class="text-xs text-red-600 dark:text-red-300"
                >
                    {{ projectFormError }}
                </p>
            </form>
            <div
                v-else
                class="flex items-stretch gap-2"
            >
            <div
                role="button"
                tabindex="0"
                class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition"
                :class="
                    selectedProjectId === p.id
                        ? 'border-cyan-300 bg-cyan-50 ring-1 ring-cyan-200/80 dark:border-cyan-400/50 dark:bg-cyan-950/30 dark:ring-cyan-400/30'
                        : 'border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:border-white/10 dark:bg-neutral-950/45 dark:hover:border-white/20'
                "
                @click="selectProject(p.id)"
                @keydown.enter.prevent="selectProject(p.id)"
            >
                <span
                    v-if="p.color"
                    class="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300/80 shadow-sm dark:border-white/20 dark:shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                    :style="{ background: p.color }"
                />
                <div class="min-w-0">
                    <span class="font-medium text-slate-900 dark:text-neutral-100">{{
                        p.name
                    }}</span>
                    <p
                        v-if="p.description"
                        class="text-xs text-slate-500"
                    >
                        {{ p.description }}
                    </p>
                </div>
            </div>
            <button
                type="button"
                class="flex shrink-0 items-center justify-center self-center rounded-lg border border-slate-200/90 bg-white/90 px-1.5 py-1 text-[10px] font-semibold leading-none text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800/80 sm:text-[11px]"
                @click.stop="beginEditProject(p)"
            >
                Edit
            </button>
            <button
                type="button"
                class="flex shrink-0 items-center justify-center self-center rounded-lg border border-red-200/90 bg-red-50/90 px-1.5 py-1 text-[10px] font-semibold leading-none text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/35 dark:bg-red-950/45 dark:text-red-300 dark:hover:bg-red-950/70 sm:text-[11px]"
                :disabled="deletingProjectId === p.id"
                :aria-label="'Delete project ' + p.name"
                @click.stop="deleteProject(p)"
            >
                {{ deletingProjectId === p.id ? '…' : 'Delete' }}
            </button>
            </div>
        </li>
    </ul>
    </template>
</div>
</template>
