<script setup>
import { injectTaskWorkspace } from '../composables/injectTaskWorkspace';

const {
    quickCaptureOpen,
    closeQuickCapture,
    quickCaptureInputRef,
    quickCaptureTitle,
    quickCaptureSaving,
    submitQuickCapture,
} = injectTaskWorkspace();
</script>

<template>
<Teleport to="body">
    <Transition name="flow-fade">
        <div
            v-if="quickCaptureOpen"
            class="fixed inset-0 z-[260] bg-neutral-950/40 backdrop-blur-[2px] dark:bg-black/60"
            aria-hidden="true"
            @click="closeQuickCapture"
        />
    </Transition>
    <Transition name="flow-pop">
        <div
            v-if="quickCaptureOpen"
            class="flow-hud-float fixed left-4 right-4 top-[20vh] z-[270] mx-auto max-w-md p-5 sm:left-auto sm:right-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-cap-label"
            @click.stop
        >
            <p
                id="quick-cap-label"
                class="flow-section-label text-slate-500 dark:text-neutral-500"
            >
                Quick add
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-neutral-500">
                Title only, saved to this project
            </p>
            <form class="mt-4 space-y-3" @submit.prevent="submitQuickCapture">
                <input
                    ref="quickCaptureInputRef"
                    v-model="quickCaptureTitle"
                    type="text"
                    required
                    maxlength="255"
                    placeholder="Task title"
                    class="flow-input py-2.5"
                    autocomplete="off"
                />
                <div class="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        class="flow-btn-ghost px-4 py-2 text-sm"
                        @click="closeQuickCapture"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="flow-btn-primary px-4 py-2 text-sm"
                        :disabled="quickCaptureSaving"
                    >
                        {{
                            quickCaptureSaving ? 'Saving…' : 'Add task'
                        }}
                    </button>
                </div>
            </form>
        </div>
    </Transition>
</Teleport>
</template>
