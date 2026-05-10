<script setup>
import {
    ref,
    computed,
    onMounted,
    onUnmounted,
    watch,
    provide,
} from 'vue';
import axios from 'axios';
import { setAuthToken } from './bootstrap';
import TaskWorkspace from './features/tasks/components/TaskWorkspace.vue';
import { TASK_WORKSPACE_KEY } from './features/tasks/constants';
import { useTaskWorkspace } from './features/tasks/composables/useTaskWorkspace';
import { formatNotificationTimestamp } from './features/tasks/taskPresentation';

const mode = ref('login');
const email = ref('');
const password = ref('');
const name = ref('');
const passwordConfirm = ref('');
const resetToken = ref('');
const resendVerificationLoading = ref(false);

const user = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const toasts = ref([]);
let toastSeq = 0;
/** @type {Set<ReturnType<typeof setTimeout>>} */
const toastDismissTimers = new Set();

const THEME_KEY = 'theme-preference';

function getInitialTheme() {
    if (typeof localStorage === 'undefined') {
        return 'light';
    }
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

const theme = ref(getInitialTheme());

const isAuthed = computed(() => user.value !== null);

const notificationsUnreadCount = ref(0);
const notificationsPanelOpen = ref(false);
const notificationsList = ref([]);
const notificationsLoading = ref(false);

function showToast(message, type = 'success') {
    const id = ++toastSeq;
    toasts.value.push({ id, message, type });
    const tid = setTimeout(() => {
        toastDismissTimers.delete(tid);
        toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3800);
    toastDismissTimers.add(tid);
}

const workspace = useTaskWorkspace({
    showToast,
    getIsAuthed: () => user.value !== null,
});
provide(TASK_WORKSPACE_KEY, workspace);

function clearError() {
    errorMessage.value = '';
}

function closeNotificationsPanel() {
    notificationsPanelOpen.value = false;
}

let notificationsEscapeHandler = null;

watch(notificationsPanelOpen, (open) => {
    if (notificationsEscapeHandler && typeof window !== 'undefined') {
        window.removeEventListener('keydown', notificationsEscapeHandler);
        notificationsEscapeHandler = null;
    }
    if (!open || typeof window === 'undefined') {
        return;
    }
    notificationsEscapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeNotificationsPanel();
        }
    };
    window.addEventListener('keydown', notificationsEscapeHandler);
});

onUnmounted(() => {
    toastDismissTimers.forEach((tid) => clearTimeout(tid));
    toastDismissTimers.clear();
    if (notificationsEscapeHandler && typeof window !== 'undefined') {
        window.removeEventListener('keydown', notificationsEscapeHandler);
    }
    workspace.disposeWorkspaceListeners();
    if (typeof window !== 'undefined') {
        window.removeEventListener(
            'keydown',
            workspace.handleQuickCaptureHotkey,
        );
        window.removeEventListener(
            'flow-auth-session-expired',
            onAuthSessionExpiredFromApi,
        );
    }
});

async function loadUnreadNotificationsCount() {
    if (!user.value) {
        notificationsUnreadCount.value = 0;
        return;
    }
    try {
        const { data } = await axios.get('notifications/unread-count');
        notificationsUnreadCount.value = data.count ?? 0;
    } catch {
        notificationsUnreadCount.value = 0;
    }
}

async function loadNotificationsList() {
    notificationsLoading.value = true;
    try {
        const { data } = await axios.get('notifications');
        notificationsList.value = data.data ?? [];
        if (typeof data.unread_count === 'number') {
            notificationsUnreadCount.value = data.unread_count;
        }
    } catch {
        notificationsList.value = [];
    } finally {
        notificationsLoading.value = false;
    }
}

function toggleNotificationsPanel() {
    notificationsPanelOpen.value = !notificationsPanelOpen.value;
    if (notificationsPanelOpen.value) {
        loadNotificationsList();
    }
}

async function markAllNotificationsRead() {
    try {
        await axios.post('notifications/read-all');
        notificationsUnreadCount.value = 0;
        await loadNotificationsList();
    } catch {
        showToast('Could not mark notifications read', 'error');
    }
}

async function onNotificationRowActivate(n) {
    try {
        if (!n.read_at) {
            await axios.patch(`notifications/${n.id}/read`);
            notificationsUnreadCount.value = Math.max(
                0,
                notificationsUnreadCount.value - 1,
            );
            n.read_at = new Date().toISOString();
        }
        closeNotificationsPanel();
        const projId = n.task?.project_id;
        const taskId = n.task?.id ?? n.task_id;
        if (projId != null && taskId != null) {
            await workspace.activateNotificationTask(projId, taskId);
        }
    } catch {
        showToast('Could not open notification', 'error');
    }
}

async function loadSession() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        return;
    }
    setAuthToken(token);
    try {
        const { data } = await axios.get('user');
        user.value = data;
        await workspace.loadProjects();
        if (workspace.projectsLoadError.value) {
            showToast(
                'Couldn’t load your projects — check your connection or refresh.',
                'error',
            );
        }
        await loadUnreadNotificationsCount();
    } catch {
        setAuthToken(null);
        user.value = null;
    }
}

function applyTheme(value) {
    if (typeof document === 'undefined') {
        return;
    }
    document.documentElement.classList.toggle('dark', value === 'dark');
    try {
        localStorage.setItem(THEME_KEY, value);
    } catch {
        /* ignore */
    }
}

function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

watch(theme, (v) => {
    applyTheme(v);
});

onMounted(async () => {
    applyTheme(theme.value);
    applyResetPasswordQueryFromUrl();
    await loadSession();
    await handleVerifiedRedirectToast();
    if (typeof window !== 'undefined') {
        window.addEventListener(
            'keydown',
            workspace.handleQuickCaptureHotkey,
        );
        window.addEventListener(
            'flow-auth-session-expired',
            onAuthSessionExpiredFromApi,
        );
    }
});

function applyResetPasswordQueryFromUrl() {
    if (typeof window === 'undefined') {
        return;
    }
    const u = new URL(window.location.href);
    const rp = u.searchParams.get('reset-password');
    const em = u.searchParams.get('email');
    if (!rp || !em) {
        return;
    }
    resetToken.value = rp;
    email.value = em;
    password.value = '';
    passwordConfirm.value = '';
    clearError();
    mode.value = 'reset-password';
    u.searchParams.delete('reset-password');
    u.searchParams.delete('email');
    history.replaceState(
        {},
        '',
        u.pathname + (u.search ? u.search : '') + u.hash,
    );
}

async function handleVerifiedRedirectToast() {
    if (typeof window === 'undefined') {
        return;
    }
    const u = new URL(window.location.href);
    if (u.searchParams.get('verified') !== '1') {
        return;
    }
    u.searchParams.delete('verified');
    history.replaceState(
        {},
        '',
        u.pathname + (u.search ? u.search : '') + u.hash,
    );
    showToast('Email verified');
    const token = localStorage.getItem('auth_token');
    if (!token || !user.value) {
        return;
    }
    setAuthToken(token);
    try {
        const { data } = await axios.get('user');
        user.value = data;
    } catch {
        return;
    }
    await workspace.loadProjects();
    if (workspace.projectsLoadError.value) {
        showToast('Could not refresh projects — try reloading the page.', 'error');
    }
}

async function submitLogin() {
    clearError();
    loading.value = true;
    try {
        const { data } = await axios.post('login', {
            email: email.value,
            password: password.value,
        });
        setAuthToken(data.token);
        user.value = data.user;
        await workspace.loadProjects();
        if (workspace.projectsLoadError.value) {
            showToast(
                'Signed in, but projects couldn’t load — try refreshing.',
                'error',
            );
        }
        await loadUnreadNotificationsCount();
    } catch (e) {
        errorMessage.value =
            e.response?.data?.message ||
            e.response?.data?.errors?.email?.[0] ||
            'Login failed.';
    } finally {
        loading.value = false;
    }
}

async function submitRegister() {
    clearError();
    loading.value = true;
    try {
        const { data } = await axios.post('register', {
            name: name.value,
            email: email.value,
            password: password.value,
            password_confirmation: passwordConfirm.value,
        });
        setAuthToken(data.token);
        user.value = data.user;
        await workspace.loadProjects();
        if (workspace.projectsLoadError.value) {
            showToast(
                'Signed in, but projects couldn’t load — try refreshing.',
                'error',
            );
        }
        await loadUnreadNotificationsCount();
        showToast('Check your email to verify your address.');
    } catch (e) {
        const errs = e.response?.data?.errors;
        if (errs) {
            errorMessage.value = Object.values(errs).flat().join(' ');
        } else {
            errorMessage.value = e.response?.data?.message || 'Registration failed.';
        }
    } finally {
        loading.value = false;
    }
}

async function submitForgotPassword() {
    clearError();
    loading.value = true;
    try {
        await axios.post('forgot-password', { email: email.value.trim() });
        showToast('If that email is registered, you’ll get a reset link.');
        mode.value = 'login';
    } catch (e) {
        errorMessage.value =
            e.response?.data?.message ||
            e.response?.data?.errors?.email?.[0] ||
            'Could not send reset link.';
    } finally {
        loading.value = false;
    }
}

async function submitPasswordReset() {
    clearError();
    loading.value = true;
    try {
        await axios.post('reset-password', {
            token: resetToken.value,
            email: email.value.trim(),
            password: password.value,
            password_confirmation: passwordConfirm.value,
        });
        showToast('Password updated — you can log in.');
        password.value = '';
        passwordConfirm.value = '';
        resetToken.value = '';
        mode.value = 'login';
    } catch (e) {
        const errs = e.response?.data?.errors;
        if (errs) {
            errorMessage.value = Object.values(errs).flat().join(' ');
        } else {
            errorMessage.value =
                e.response?.data?.message || 'Could not reset password.';
        }
    } finally {
        loading.value = false;
    }
}

function backToLogin() {
    mode.value = 'login';
    resetToken.value = '';
    clearError();
}

async function resendVerificationEmail() {
    if (!user.value || user.value.email_verified_at) {
        return;
    }
    resendVerificationLoading.value = true;
    try {
        await axios.post('email/verification-notification');
        showToast('Verification email sent');
    } catch (e) {
        showToast(
            e.response?.data?.message || 'Could not resend email.',
            'error',
        );
    } finally {
        resendVerificationLoading.value = false;
    }
}

function clearClientSessionAfterAuthLoss() {
    setAuthToken(null);
    user.value = null;
    workspace.resetAfterAuthLoss();
    notificationsUnreadCount.value = 0;
    notificationsList.value = [];
    notificationsPanelOpen.value = false;
    notificationsLoading.value = false;
    mode.value = 'login';
}

function onAuthSessionExpiredFromApi() {
    clearClientSessionAfterAuthLoss();
    showToast('Session expired — please sign in again.', 'error');
}

async function logout() {
    clearError();
    loading.value = true;
    try {
        await axios.post('logout');
    } catch {
        /* invalid token is ok — client clears anyway */
    } finally {
        clearClientSessionAfterAuthLoss();
        loading.value = false;
    }
}
</script>

<template>
    <div
        class="relative min-h-screen overflow-x-hidden bg-slate-100 bg-[linear-gradient(to_right,rgb(148_163_184_/_.055)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184_/_.055)_1px,transparent_1px)] bg-[length:40px_40px] font-sans text-slate-800 antialiased dark:bg-neutral-950 dark:bg-[linear-gradient(to_right,rgb(255_255_255_/_.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255_/_.035)_1px,transparent_1px)] dark:text-neutral-200"
    >
        <div
            class="pointer-events-none fixed inset-0 flow-app-aurora bg-[radial-gradient(ellipse_85%_55%_at_50%_-18%,rgba(34,211,238,0.11),transparent)] dark:bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(34,211,238,0.07),transparent)]"
        />
        <div
            class="pointer-events-none fixed inset-0 flow-app-aurora flow-app-aurora--b bg-[radial-gradient(ellipse_45%_45%_at_100%_0%,rgba(139,92,246,0.07),transparent)] dark:bg-[radial-gradient(ellipse_45%_45%_at_100%_0%,rgba(139,92,246,0.09),transparent)]"
        />
        <div
            class="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_35%_45%_at_0%_100%,rgba(34,197,94,0.04),transparent)] dark:bg-[radial-gradient(ellipse_35%_45%_at_0%_100%,rgba(255,255,255,0.02),transparent)]"
        />

        <div
            class="pointer-events-none fixed left-1/2 z-[100] flex w-[min(17rem,calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1rem))] -translate-x-1/2 flex-col items-stretch gap-1.5"
            style="
                top: max(1rem, env(safe-area-inset-top, 0px));
            "
            aria-live="polite"
            aria-relevant="additions text"
        >
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3 py-2 shadow-[0_12px_40px_-16px_rgb(15_23_42_/_.2)] backdrop-blur-md dark:shadow-[0_14px_40px_-18px_rgb(0_0_0_/_.75)]"
                :class="
                    toast.type === 'error'
                        ? 'border-red-200/90 bg-white/[0.97] text-red-900 dark:border-red-500/30 dark:bg-neutral-900/[0.97] dark:text-red-50'
                        : 'border-emerald-200/85 bg-white/[0.97] text-emerald-900 dark:border-emerald-500/[0.22] dark:bg-neutral-900/[0.97] dark:text-emerald-50'
                "
                :role="toast.type === 'error' ? 'alert' : 'status'"
                :aria-label="
                    (toast.type === 'error' ? 'Error. ' : 'Success. ') +
                    toast.message
                "
            >
                <span
                    class="shrink-0"
                    :class="
                        toast.type === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                    "
                    aria-hidden="true"
                >
                    <svg
                        v-if="toast.type !== 'error'"
                        class="size-[15px]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M5 13l4 4L19 7" />
                    </svg>
                    <svg
                        v-else
                        class="size-[15px]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                    >
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </span>
                <p
                    class="min-w-0 flex-1 text-[13px] font-medium leading-[1.35] tracking-tight"
                    :class="
                        toast.type === 'error'
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-emerald-950 dark:text-emerald-50'
                    "
                >
                    {{ toast.message }}
                </p>
            </div>
        </div>

        <div
            class="relative z-10 mx-auto px-4 py-10 sm:py-12"
            :class="
                isAuthed &&
                workspace.projects.length > 0 &&
                workspace.taskViewMode !== 'list'
                    ? 'max-w-6xl'
                    : 'max-w-2xl'
            "
        >
            <div
                v-if="!isAuthed"
                class="mb-6 flex justify-end sm:mb-8"
            >
                <button
                    type="button"
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300/55 bg-white/55 text-base text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white/85 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 dark:border-white/12 dark:bg-neutral-950/45 dark:text-neutral-200 dark:hover:bg-neutral-900/65 dark:focus-visible:ring-cyan-400/30"
                    :aria-label="
                        theme === 'dark'
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    "
                    @click="toggleTheme"
                >
                    <span v-if="theme === 'dark'" aria-hidden="true">☀</span>
                    <span v-else aria-hidden="true">☽</span>
                </button>
            </div>

            <header class="mb-12 text-center">
                <p
                    class="flow-section-label flow-kicker-glow mb-3 font-mono text-cyan-600/90 dark:text-cyan-400/75"
                >
                    Flow · workspace sync
                </p>
                <h1
                    class="flow-brand-title bg-gradient-to-br from-cyan-500 via-slate-800 to-violet-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl dark:from-cyan-300 dark:via-neutral-100 dark:to-violet-400"
                >
                    Productivity
                </h1>
                <p
                    class="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-neutral-400"
                >
                    A calm, sharp cockpit for your tasks — syncs with your API.
                    Sign in to fly.
                </p>
                <div
                    class="mx-auto mt-6 h-px max-w-xs bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent dark:via-cyan-400/25"
                    aria-hidden="true"
                />
            </header>

            <div
                v-if="!isAuthed"
                class="flow-panel mx-auto max-w-lg p-6 sm:p-8"
            >
                <div
                    v-if="mode === 'login' || mode === 'register'"
                    class="flow-tab-track mb-6 font-mono"
                >
                    <button
                        type="button"
                        class="flow-tab flex-1 sm:flex-none"
                        :class="mode === 'login' ? 'flow-tab-active' : ''"
                        @click="
                            mode = 'login';
                            clearError();
                        "
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        class="flow-tab flex-1 sm:flex-none"
                        :class="mode === 'register' ? 'flow-tab-active' : ''"
                        @click="
                            mode = 'register';
                            clearError();
                        "
                    >
                        Register
                    </button>
                </div>

                <form
                    v-if="mode === 'login'"
                    class="space-y-4"
                    @submit.prevent="submitLogin"
                >
                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400" for="email"
                            >Email</label
                        >
                        <input
                            id="email"
                            v-model="email"
                            type="email"
                            required
                            autocomplete="email"
                            class="flow-input"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="password"
                            >Password</label
                        >
                        <input
                            id="password"
                            v-model="password"
                            type="password"
                            required
                            autocomplete="current-password"
                            class="flow-input"
                        />
                    </div>
                    <button
                        type="submit"
                        :disabled="loading"
                        class="flow-btn-primary w-full"
                    >
                        {{ loading ? '…' : 'Enter' }}
                    </button>
                    <p class="text-center text-sm">
                        <button
                            type="button"
                            class="font-medium text-cyan-700 underline decoration-cyan-600/35 underline-offset-2 hover:text-cyan-600 dark:text-cyan-400 dark:decoration-cyan-400/40 dark:hover:text-cyan-300"
                            @click="
                                mode = 'forgot-password';
                                clearError();
                            "
                        >
                            Forgot password?
                        </button>
                    </p>
                </form>

                <form
                    v-else-if="mode === 'register'"
                    class="space-y-4"
                    @submit.prevent="submitRegister"
                >
                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400" for="name"
                            >Name</label
                        >
                        <input
                            id="name"
                            v-model="name"
                            type="text"
                            required
                            autocomplete="name"
                            class="flow-input"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="reg-email"
                            >Email</label
                        >
                        <input
                            id="reg-email"
                            v-model="email"
                            type="email"
                            required
                            autocomplete="email"
                            class="flow-input"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="reg-password"
                            >Password (min. 8)</label
                        >
                        <input
                            id="reg-password"
                            v-model="password"
                            type="password"
                            required
                            minlength="8"
                            autocomplete="new-password"
                            class="flow-input"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="password-confirm"
                            >Confirm password</label
                        >
                        <input
                            id="password-confirm"
                            v-model="passwordConfirm"
                            type="password"
                            required
                            minlength="8"
                            autocomplete="new-password"
                            class="flow-input"
                        />
                    </div>
                    <button
                        type="submit"
                        :disabled="loading"
                        class="flow-btn-primary w-full"
                    >
                        {{ loading ? '…' : 'Launch' }}
                    </button>
                </form>

                <form
                    v-else-if="mode === 'forgot-password'"
                    class="space-y-4"
                    @submit.prevent="submitForgotPassword"
                >
                    <p class="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                        Enter the email for your account. If it’s registered,
                        you’ll receive a link to choose a new password.
                    </p>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="forgot-email"
                            >Email</label
                        >
                        <input
                            id="forgot-email"
                            v-model="email"
                            type="email"
                            required
                            autocomplete="email"
                            class="flow-input"
                        />
                    </div>
                    <button
                        type="submit"
                        :disabled="loading"
                        class="flow-btn-primary w-full"
                    >
                        {{ loading ? '…' : 'Send reset link' }}
                    </button>
                    <p class="text-center text-sm">
                        <button
                            type="button"
                            class="font-medium text-slate-600 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            @click="
                                mode = 'login';
                                clearError();
                            "
                        >
                            ← Back to log in
                        </button>
                    </p>
                </form>

                <form
                    v-else-if="mode === 'reset-password'"
                    class="space-y-4"
                    @submit.prevent="submitPasswordReset"
                >
                    <p class="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                        Choose a new password for
                        <span class="font-medium text-slate-800 dark:text-neutral-200">{{
                            email
                        }}</span>.
                    </p>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="reset-pass"
                            >New password</label
                        >
                        <input
                            id="reset-pass"
                            v-model="password"
                            type="password"
                            required
                            minlength="8"
                            autocomplete="new-password"
                            class="flow-input"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-1 block text-sm font-medium text-slate-500 dark:text-neutral-400"
                            for="reset-pass-confirm"
                            >Confirm new password</label
                        >
                        <input
                            id="reset-pass-confirm"
                            v-model="passwordConfirm"
                            type="password"
                            required
                            minlength="8"
                            autocomplete="new-password"
                            class="flow-input"
                        />
                    </div>
                    <button
                        type="submit"
                        :disabled="loading"
                        class="flow-btn-primary w-full"
                    >
                        {{ loading ? '…' : 'Update password' }}
                    </button>
                    <p class="text-center text-sm">
                        <button
                            type="button"
                            class="font-medium text-slate-600 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            @click="backToLogin()"
                        >
                            ← Back to log in
                        </button>
                    </p>
                </form>

                <p
                    v-if="errorMessage"
                    class="mt-4 rounded-xl border border-red-200/90 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200"
                >
                    {{ errorMessage }}
                </p>
            </div>

            <div v-else class="space-y-6">
                <div
                    v-if="user && !user.email_verified_at"
                    class="flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/25 dark:bg-amber-950/45 dark:text-amber-50"
                >
                    <div>
                        <p class="font-semibold">Verify your email</p>
                        <p class="mt-0.5 text-xs leading-snug text-amber-900/85 dark:text-amber-100/85">
                            We sent a verification link to
                            <span class="font-mono">{{ user.email }}</span>.
                            Check your inbox and spam. Still nothing? Try
                            Resend below.
                        </p>
                    </div>
                    <button
                        type="button"
                        class="shrink-0 rounded-lg border border-amber-400/50 bg-white/90 px-3 py-2 text-xs font-semibold text-amber-950 transition hover:bg-white disabled:opacity-50 dark:border-amber-400/35 dark:bg-amber-900/60 dark:text-amber-50 dark:hover:bg-amber-900/80"
                        :disabled="resendVerificationLoading"
                        @click="resendVerificationEmail"
                    >
                        {{
                            resendVerificationLoading
                                ? 'Sending…'
                                : 'Resend link'
                        }}
                    </button>
                </div>
                <div class="flow-panel relative z-30 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                    <div class="min-w-0">
                        <p class="flow-section-label mb-1 text-slate-500 dark:text-neutral-500">
                            Session
                        </p>
                        <p class="truncate font-semibold tracking-tight text-slate-900 dark:text-neutral-100">
                            {{ user.name }}
                        </p>
                        <p class="truncate font-mono text-xs text-slate-500 dark:text-neutral-400">
                            {{ user.email }}
                        </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300/60 bg-white/50 text-base text-slate-700 shadow-inner shadow-white/40 backdrop-blur-md transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 sm:h-11 sm:w-11 sm:text-lg dark:border-white/12 dark:bg-neutral-950/50 dark:text-neutral-200 dark:shadow-inner dark:shadow-black/30 dark:hover:bg-neutral-900/60 dark:focus-visible:ring-cyan-400/35"
                            :aria-label="
                                theme === 'dark'
                                    ? 'Switch to light mode'
                                    : 'Switch to dark mode'
                            "
                            @click="toggleTheme"
                        >
                            <span v-if="theme === 'dark'" aria-hidden="true">☀</span>
                            <span v-else aria-hidden="true">☽</span>
                        </button>
                        <button
                            type="button"
                            class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300/60 bg-white/50 text-slate-700 shadow-inner shadow-white/40 backdrop-blur-md transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 sm:h-11 sm:w-11 dark:border-white/12 dark:bg-neutral-950/50 dark:text-neutral-200 dark:shadow-inner dark:shadow-black/30 dark:hover:bg-neutral-900/60 dark:focus-visible:ring-cyan-400/35"
                            :class="
                                notificationsPanelOpen
                                    ? 'ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-100 dark:ring-offset-neutral-950'
                                    : ''
                            "
                            aria-label="Notifications"
                            :aria-expanded="notificationsPanelOpen"
                            @click="toggleNotificationsPanel"
                        >
                            <svg
                                class="h-4 w-4 sm:h-5 sm:w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                            </svg>
                            <span
                                v-if="notificationsUnreadCount > 0"
                                class="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-violet-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_12px_-2px_rgb(34_211_238_/_.8)] ring-2 ring-white dark:ring-neutral-950"
                            >
                                {{
                                    notificationsUnreadCount > 99
                                        ? '99+'
                                        : notificationsUnreadCount
                                }}
                            </span>
                        </button>
                        <button
                            type="button"
                            class="flow-btn-ghost"
                            @click="logout"
                        >
                            Log out
                        </button>
                    </div>
                </div>

                <TaskWorkspace />
            </div>
        </div>

        <Teleport to="body">
            <Transition name="flow-fade">
                <div
                    v-if="notificationsPanelOpen && isAuthed"
                    class="fixed inset-0 z-[240] bg-neutral-950/35 backdrop-blur-[2px] dark:bg-black/55"
                    aria-hidden="true"
                    @click="closeNotificationsPanel"
                />
            </Transition>
            <Transition name="flow-pop">
                <div
                    v-if="notificationsPanelOpen && isAuthed"
                    class="flow-hud-float fixed z-[250] flex w-[min(18.5rem,calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.25rem))] max-h-[min(50vh,15rem)] flex-col overflow-hidden left-[max(1rem,env(safe-area-inset-left,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] top-[max(3.25rem,calc(env(safe-area-inset-top,0px)+2.25rem))] max-lg:rounded-xl sm:left-auto sm:right-[max(1.25rem,env(safe-area-inset-right,0px))] lg:max-h-[min(72vh,24rem)] lg:w-[min(22rem,calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1rem))] lg:rounded-2xl"
                    role="dialog"
                    aria-label="Notifications"
                    @click.stop
                >
                    <div
                        class="flex shrink-0 items-center justify-between border-b border-white/15 bg-white/30 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03] lg:px-4 lg:py-3"
                    >
                        <div>
                            <p class="flow-section-label text-slate-500 dark:text-neutral-500">
                                Signals
                            </p>
                            <p class="text-xs font-semibold text-slate-900 lg:text-sm dark:text-neutral-100">
                                Notifications
                            </p>
                        </div>
                        <button
                            v-if="notificationsList.some((x) => !x.read_at)"
                            type="button"
                            class="text-[10px] font-semibold uppercase tracking-wide text-cyan-600 transition hover:text-cyan-500 lg:text-[11px] dark:text-cyan-400 dark:hover:text-cyan-300"
                            @click="markAllNotificationsRead"
                        >
                            Mark all read
                        </button>
                    </div>
                    <div class="min-h-0 flex-1 overflow-y-auto">
                        <p
                            v-if="notificationsLoading"
                            class="px-3 py-5 text-center text-xs text-slate-500 lg:px-4 lg:py-8 lg:text-sm dark:text-neutral-400"
                        >
                            Loading…
                        </p>
                        <p
                            v-else-if="notificationsList.length === 0"
                            class="px-3 py-5 text-center text-xs leading-relaxed text-slate-500 lg:px-4 lg:py-8 lg:text-sm dark:text-neutral-400"
                        >
                            No signals yet. Deadline reminders appear when tasks are
                            due today or tomorrow.
                        </p>
                        <ul
                            v-else
                            class="divide-y divide-slate-200/60 dark:divide-white/[0.06]"
                        >
                            <li v-for="n in notificationsList" :key="n.id">
                                <button
                                    type="button"
                                    class="flex w-full gap-2 px-3 py-2.5 text-left transition hover:bg-white/40 lg:gap-3 lg:px-4 lg:py-3.5 dark:hover:bg-white/[0.04]"
                                    @click="onNotificationRowActivate(n)"
                                >
                                    <span
                                        class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full lg:mt-1 lg:h-2 lg:w-2"
                                        :class="
                                            n.read_at
                                                ? 'bg-slate-400/70 dark:bg-neutral-600'
                                                : 'bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_10px_rgb(34_211_238_/_.45)]'
                                        "
                                        aria-hidden="true"
                                    />
                                    <span class="min-w-0 flex-1">
                                        <span
                                            class="block text-xs font-semibold tracking-tight text-slate-900 lg:text-sm dark:text-neutral-100"
                                        >{{ n.title }}</span>
                                        <span
                                            v-if="n.message"
                                            class="mt-0.5 block text-[11px] leading-snug text-slate-600 lg:text-xs dark:text-neutral-400"
                                        >{{ n.message }}</span>
                                        <span
                                            class="mt-0.5 block text-[10px] tabular-nums text-slate-400 lg:mt-1 lg:text-[11px] dark:text-neutral-500"
                                        >{{ formatNotificationTimestamp(n.created_at) }}</span>
                                    </span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </Transition>
        </Teleport>

    </div>
</template>
