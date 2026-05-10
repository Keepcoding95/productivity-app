import { ref, computed, watch, nextTick } from 'vue';
import axios from 'axios';
import {
    TASK_VIEW_KEY,
    readStoredTaskView,
    LIST_SORT_KEY,
    LIST_OVERDUE_FILTER_KEY,
    readStoredListSort,
    readStoredOverdueOnlyFilter,
    taskStatuses,
    taskEnergyLevels,
} from '../constants';
import {
    taskDueDayKey,
    toIsoDate,
    parseIsoDateLocal,
    addDaysToIso,
    isTaskOverdue,
    dueTimeForInput,
} from '../taskPresentation';

const TASK_PAGE_SIZE = 50;
/** Safety cap: ~3000 tasks auto-fetched for Kanban/Calendar */
const BOARD_SYNC_MAX_PAGES = 60;

export function useTaskWorkspace({ showToast, getIsAuthed }) {
    /** Month shown in calendar (year/month only used) */
    const calendarCursor = ref(new Date());

    const taskViewMode = ref(readStoredTaskView());
    /** Focused day for mobile week strip + agenda (YYYY-MM-DD local). */
    const calendarSelectedIso = ref(toIsoDate(new Date()));

    watch(taskViewMode, async (v) => {
        try {
            localStorage.setItem(TASK_VIEW_KEY, v);
        } catch {
            /* ignore */
        }
        if (v === 'calendar') {
            const now = new Date();
            calendarCursor.value = now;
            calendarSelectedIso.value = toIsoDate(now);
        }
        await syncBoardTasksIfNeeded();
    });

    watch(calendarSelectedIso, (iso) => {
        const d = parseIsoDateLocal(iso);
        if (Number.isNaN(d.getTime())) {
            return;
        }
        const cur = calendarCursor.value;
        if (
            d.getFullYear() !== cur.getFullYear() ||
            d.getMonth() !== cur.getMonth()
        ) {
            calendarCursor.value = new Date(d.getFullYear(), d.getMonth(), 1);
        }
    });

    const calendarMonthTitle = computed(() =>
        calendarCursor.value.toLocaleString(undefined, {
            month: 'long',
            year: 'numeric',
        }),
    );

    const calendarCells = computed(() => {
        const d = calendarCursor.value;
        const y = d.getFullYear();
        const m = d.getMonth();
        const firstDay = new Date(y, m, 1);
        const gridStart = new Date(firstDay);
        gridStart.setDate(firstDay.getDate() - firstDay.getDay());
        const todayIso = toIsoDate(new Date());
        const cells = [];
        for (let i = 0; i < 42; i++) {
            const cellDate = new Date(gridStart);
            cellDate.setDate(gridStart.getDate() + i);
            const iso = toIsoDate(cellDate);
            cells.push({
                iso,
                dayNum: cellDate.getDate(),
                inMonth: cellDate.getMonth() === m,
                isToday: iso === todayIso,
            });
        }
        return cells;
    });

    const calendarAgendaHeading = computed(() => {
        const d = parseIsoDateLocal(calendarSelectedIso.value);
        if (Number.isNaN(d.getTime())) {
            return '';
        }
        return d.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    });

    const isCalendarSelectedToday = computed(
        () => calendarSelectedIso.value === toIsoDate(new Date()),
    );

    function tasksOnCalendarDay(iso) {
        return tasks.value.filter((t) => taskDueDayKey(t) === iso);
    }

    function shiftCalendarMonth(delta) {
        const d = new Date(calendarCursor.value);
        d.setMonth(d.getMonth() + delta);
        calendarCursor.value = d;
        calendarSelectedIso.value = toIsoDate(
            new Date(d.getFullYear(), d.getMonth(), 1),
        );
    }

    function shiftCalendarWeek(delta) {
        calendarSelectedIso.value = addDaysToIso(
            calendarSelectedIso.value,
            delta * 7,
        );
    }

    function goCalendarToday() {
        const now = new Date();
        calendarCursor.value = new Date(now.getFullYear(), now.getMonth(), 1);
        calendarSelectedIso.value = toIsoDate(now);
    }

    function selectCalendarDay(iso) {
        const day = String(iso ?? '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            calendarSelectedIso.value = day;
        }
    }

    function tasksForKanban(status) {
        return tasks.value
            .filter((t) => t.status === status)
            .sort((a, b) => {
                const pa = Number(a.position) || 0;
                const pb = Number(b.position) || 0;
                if (pa !== pb) {
                    return pa - pb;
                }
                return a.id - b.id;
            });
    }

    function onKanbanDragStart(evt, task) {
        evt.dataTransfer.setData('text/plain', String(task.id));
        evt.dataTransfer.effectAllowed = 'move';
    }

    function onKanbanDragOver(evt) {
        evt.preventDefault();
    }

    async function applyKanbanOrder(columnStatus, orderedTasks) {
        taskOpError.value = '';
        const updates = orderedTasks.map((t, i) => ({
            id: t.id,
            status: columnStatus,
            position: i,
        }));
        const prevSnapshot = tasks.value.map((t) => ({
            id: t.id,
            status: t.status,
            position: Number(t.position) || 0,
        }));
        for (const u of updates) {
            const row = tasks.value.find((x) => x.id === u.id);
            if (row) {
                row.status = u.status;
                row.position = u.position;
            }
        }
        try {
            await axios.post('tasks/reorder', { updates });
        } catch {
            for (const snap of prevSnapshot) {
                const row = tasks.value.find((x) => x.id === snap.id);
                if (row) {
                    row.status = snap.status;
                    row.position = snap.position;
                }
            }
            await loadTasks();
            showToast('Could not save board order', 'error');
        }
    }

    async function onKanbanDrop(evt, targetStatus) {
        evt.preventDefault();
        const id = Number(evt.dataTransfer.getData('text/plain'));
        const dragged = tasks.value.find((t) => t.id === id);
        if (!dragged) {
            return;
        }
        const inCol = tasksForKanban(targetStatus).filter((t) => t.id !== id);
        const newOrder = [...inCol, dragged];
        await applyKanbanOrder(targetStatus, newOrder);
    }

    async function onKanbanDropOnCard(evt, targetTask) {
        evt.preventDefault();
        evt.stopPropagation();
        const id = Number(evt.dataTransfer.getData('text/plain'));
        const dragged = tasks.value.find((t) => t.id === id);
        if (!dragged || dragged.id === targetTask.id) {
            return;
        }
        const targetStatus = targetTask.status;
        const inCol = tasksForKanban(targetStatus).filter((t) => t.id !== id);
        const insertIdx = inCol.findIndex((t) => t.id === targetTask.id);
        if (insertIdx === -1) {
            return;
        }
        const newOrder = [
            ...inCol.slice(0, insertIdx),
            dragged,
            ...inCol.slice(insertIdx),
        ];
        await applyKanbanOrder(targetStatus, newOrder);
    }

    const projects = ref([]);
    const newProjectName = ref('');
    const newProjectDescription = ref('');
    const newProjectColor = ref('#22d3ee');
    const projectFormError = ref('');
    const creatingProject = ref(false);
    const deletingProjectId = ref(null);

    const selectedProjectId = ref(null);
    const tasks = ref([]);
    const newTaskTitle = ref('');
    const newTaskDescription = ref('');
    const newTaskDueDate = ref('');
    const newTaskDueTime = ref('');
    const newTaskEstimatedMinutes = ref('');
    const newTaskEnergyLevel = ref('');
    const taskFormError = ref('');
    const creatingTask = ref(false);

    const newTaskEnergyCoach = computed(() => {
        if (!newTaskEnergyLevel.value) {
            return 'Tag mental weight so you can match tasks to how sharp you feel — tap again to clear.';
        }
        return (
            taskEnergyLevels.find((o) => o.value === newTaskEnergyLevel.value)
                ?.hint ?? ''
        );
    });

    const editingTaskId = ref(null);
    const editTaskTitle = ref('');
    const editTaskDescription = ref('');
    const editTaskDueDate = ref('');
    const editTaskDueTime = ref('');
    const editTaskEstimatedMinutes = ref('');
    const editTaskEnergyLevel = ref('');
    const taskOpError = ref('');
    const savingTaskId = ref(null);
    const deletingTaskId = ref(null);

    const loadingProjects = ref(false);
    const projectsLoadError = ref('');
    const loadingTasks = ref(false);
    const loadingTasksMore = ref(false);
    /** Kanban/Calendar: fetching remaining pages */
    const syncingBoardTasks = ref(false);
    const tasksLoadError = ref('');
    const tasksLoadHasMore = ref(false);
    const tasksLoadedPage = ref(1);
    const tasksListTotal = ref(null);

    const editingProjectId = ref(null);
    const editProjectName = ref('');
    const editProjectDescription = ref('');
    const editProjectColor = ref('');
    const savingProjectId = ref(null);

    const tasksWithoutDue = computed(() =>
        tasks.value.filter((t) => !taskDueDayKey(t)),
    );

    const calendarWeekStrip = computed(() => {
        const todayIso = toIsoDate(new Date());
        const anchor = parseIsoDateLocal(calendarSelectedIso.value);
        if (Number.isNaN(anchor.getTime())) {
            return [];
        }
        const weekStart = new Date(anchor);
        weekStart.setDate(anchor.getDate() - anchor.getDay());
        const cy = calendarCursor.value.getFullYear();
        const cm = calendarCursor.value.getMonth();
        const days = [];
        for (let i = 0; i < 7; i++) {
            const x = new Date(weekStart);
            x.setDate(weekStart.getDate() + i);
            const iso = toIsoDate(x);
            let taskCount = 0;
            for (const t of tasks.value) {
                if (taskDueDayKey(t) === iso) {
                    taskCount++;
                }
            }
            days.push({
                iso,
                dayNum: x.getDate(),
                weekdayNarrow: x.toLocaleDateString(undefined, {
                    weekday: 'narrow',
                }),
                inMonth:
                    x.getMonth() === cm && x.getFullYear() === cy,
                isToday: iso === todayIso,
                taskCount,
            });
        }
        return days;
    });

    const listSortMode = ref(readStoredListSort());
    const listShowOverdueOnly = ref(readStoredOverdueOnlyFilter());

    watch(listSortMode, (v) => {
        try {
            localStorage.setItem(LIST_SORT_KEY, v);
        } catch {
            /* ignore */
        }
    });

    watch(listShowOverdueOnly, (v) => {
        try {
            localStorage.setItem(LIST_OVERDUE_FILTER_KEY, v ? '1' : '0');
        } catch {
            /* ignore */
        }
    });

    const listSearchQuery = ref('');
    const listStatusFilter = ref('');

    const listSortMenuOpen = ref(false);
    const listSortWrapRef = ref(null);

    function closeListSortMenu() {
        listSortMenuOpen.value = false;
    }

    function toggleListSortMenu() {
        listSortMenuOpen.value = !listSortMenuOpen.value;
    }

    function selectListSortMode(mode) {
        listSortMode.value = mode;
        listSortMenuOpen.value = false;
    }

    function listSortOutsidePointerDown(evt) {
        const el = listSortWrapRef.value;
        if (!el || !listSortMenuOpen.value) {
            return;
        }
        if (!el.contains(evt.target)) {
            listSortMenuOpen.value = false;
        }
    }

    let listSortEscapeHandler = null;

    let loadTasksAbortController = null;
    let loadTasksSeq = 0;

    function isTasksLoadAborted(err) {
        return (
            err?.code === 'ERR_CANCELED' ||
            err?.name === 'CanceledError' ||
            axios.isCancel?.(err)
        );
    }

    watch(listSortMenuOpen, (open) => {
        if (listSortEscapeHandler && typeof window !== 'undefined') {
            window.removeEventListener('keydown', listSortEscapeHandler);
            listSortEscapeHandler = null;
        }
        if (typeof document === 'undefined') {
            return;
        }
        if (open) {
            document.addEventListener('pointerdown', listSortOutsidePointerDown);
            listSortEscapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeListSortMenu();
                }
            };
            window.addEventListener('keydown', listSortEscapeHandler);
        } else {
            document.removeEventListener(
                'pointerdown',
                listSortOutsidePointerDown,
            );
        }
    });

    const listViewTasks = computed(() => {
        let rows = tasks.value.slice();
        const q = listSearchQuery.value.trim().toLowerCase();
        if (q) {
            rows = rows.filter((t) =>
                String(t.title ?? '')
                    .toLowerCase()
                    .includes(q),
            );
        }
        if (listStatusFilter.value) {
            rows = rows.filter((t) => t.status === listStatusFilter.value);
        }
        if (listShowOverdueOnly.value) {
            rows = rows.filter(isTaskOverdue);
        }
        if (listSortMode.value === 'due_date') {
            rows.sort((a, b) => {
                const ka = taskDueDayKey(a);
                const kb = taskDueDayKey(b);
                if (!ka && !kb) {
                    return a.id - b.id;
                }
                if (!ka) {
                    return 1;
                }
                if (!kb) {
                    return -1;
                }
                const c = ka.localeCompare(kb);
                return c !== 0 ? c : a.id - b.id;
            });
        }
        return rows;
    });

    const listDiscoveryNoMatches = computed(
        () =>
            tasks.value.length > 0 &&
            listViewTasks.value.length === 0 &&
            !listShowOverdueOnly.value &&
            (listSearchQuery.value.trim() !== '' ||
                listStatusFilter.value !== ''),
    );

    watch([listViewTasks, editingTaskId, taskViewMode], () => {
        if (taskViewMode.value !== 'list' || editingTaskId.value == null) {
            return;
        }
        const id = editingTaskId.value;
        if (!listViewTasks.value.some((t) => t.id === id)) {
            cancelEditTask();
            showToast(
                'Stopped editing — this task isn’t visible with your current list filters.',
                'error',
            );
        }
    });

    const quickCaptureOpen = ref(false);
    const quickCaptureTitle = ref('');
    const quickCaptureSaving = ref(false);
    const quickCaptureInputRef = ref(null);

    let quickCaptureEscapeHandler = null;

    function isTextInputTarget(el) {
        if (!el || typeof el.tagName !== 'string') {
            return false;
        }
        const tag = el.tagName.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return true;
        }
        return Boolean(el.isContentEditable);
    }

    function openQuickCapture() {
        if (!selectedProjectId.value) {
            showToast('Select a project first', 'error');
            return;
        }
        quickCaptureOpen.value = true;
        nextTick(() => {
            quickCaptureInputRef.value?.focus?.();
        });
    }

    function closeQuickCapture() {
        quickCaptureOpen.value = false;
        quickCaptureTitle.value = '';
    }

    async function submitQuickCapture() {
        const title = quickCaptureTitle.value.trim();
        if (!title || !selectedProjectId.value) {
            return;
        }
        quickCaptureSaving.value = true;
        try {
            await axios.post('tasks', {
                project_id: selectedProjectId.value,
                title,
            });
            closeQuickCapture();
            await loadTasks();
            showToast('Task captured');
        } catch (e) {
            showToast(
                e.response?.data?.message || 'Could not add task.',
                'error',
            );
        } finally {
            quickCaptureSaving.value = false;
        }
    }

    watch(quickCaptureOpen, (open) => {
        if (quickCaptureEscapeHandler && typeof window !== 'undefined') {
            window.removeEventListener('keydown', quickCaptureEscapeHandler);
            quickCaptureEscapeHandler = null;
        }
        if (!open || typeof window === 'undefined') {
            return;
        }
        quickCaptureEscapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeQuickCapture();
            }
        };
        window.addEventListener('keydown', quickCaptureEscapeHandler);
    });

    function handleQuickCaptureHotkey(e) {
        if (!getIsAuthed() || !selectedProjectId.value) {
            return;
        }
        if (!e.ctrlKey || !e.shiftKey) {
            return;
        }
        if (e.key !== 'k' && e.key !== 'K') {
            return;
        }
        if (isTextInputTarget(e.target)) {
            return;
        }
        e.preventDefault();
        if (quickCaptureOpen.value) {
            closeQuickCapture();
        } else {
            openQuickCapture();
        }
    }

    async function loadProjects() {
        projectsLoadError.value = '';
        loadingProjects.value = true;
        try {
            const { data } = await axios.get('projects');
            projects.value = data.data ?? [];

            if (projects.value.length === 0) {
                loadTasksAbortController?.abort();
                loadTasksAbortController = null;
                loadTasksSeq++;
                selectedProjectId.value = null;
                tasks.value = [];
                tasksLoadError.value = '';
                tasksLoadHasMore.value = false;
                tasksLoadedPage.value = 1;
                tasksListTotal.value = null;
                loadingTasks.value = false;
                loadingTasksMore.value = false;
                syncingBoardTasks.value = false;
                return;
            }

            const hasSelection =
                selectedProjectId.value &&
                projects.value.some((p) => p.id === selectedProjectId.value);
            if (!hasSelection) {
                selectedProjectId.value = projects.value[0].id;
            }
        } catch (e) {
            if (e.response?.status === 403) {
                projectsLoadError.value =
                    e.response?.data?.message ||
                    'Verify your email to load projects and tasks.';
                return;
            }
            projectsLoadError.value =
                e.response?.data?.message || 'Could not load projects.';
            return;
        } finally {
            loadingProjects.value = false;
        }

        await loadTasks();
        await syncBoardTasksIfNeeded();
    }

    async function loadTasks(opts = {}) {
        const append = opts.append === true;

        loadTasksAbortController?.abort();
        loadTasksAbortController = null;

        if (!selectedProjectId.value) {
            tasks.value = [];
            tasksLoadError.value = '';
            tasksLoadHasMore.value = false;
            tasksLoadedPage.value = 1;
            tasksListTotal.value = null;
            loadingTasks.value = false;
            loadingTasksMore.value = false;
            return;
        }

        tasksLoadError.value = '';

        const projectId = selectedProjectId.value;
        const seq = ++loadTasksSeq;
        const controller = new AbortController();
        loadTasksAbortController = controller;

        const requestedPage = append ? tasksLoadedPage.value + 1 : 1;

        if (!append) {
            tasksLoadHasMore.value = false;
            loadingTasks.value = true;
        } else {
            loadingTasksMore.value = true;
        }

        try {
            const { data } = await axios.get('tasks', {
                params: {
                    project_id: projectId,
                    per_page: TASK_PAGE_SIZE,
                    page: requestedPage,
                },
                signal: controller.signal,
            });
            if (seq !== loadTasksSeq) {
                return;
            }
            const rows = data.data ?? [];
            tasksListTotal.value =
                typeof data.meta?.total === 'number'
                    ? data.meta.total
                    : null;
            tasksLoadHasMore.value = Boolean(data.meta?.has_more);
            tasksLoadedPage.value = requestedPage;

            if (append) {
                const seen = new Set(tasks.value.map((t) => t.id));
                const extras = rows.filter((r) => !seen.has(r.id));
                tasks.value = [...tasks.value, ...extras];
            } else {
                tasks.value = rows;
            }
        } catch (err) {
            if (isTasksLoadAborted(err)) {
                return;
            }
            if (seq !== loadTasksSeq) {
                return;
            }
            tasksLoadError.value =
                err.response?.data?.message || 'Could not load tasks.';
            if (!append) {
                tasks.value = [];
                tasksLoadedPage.value = 1;
                tasksListTotal.value = null;
            }
        } finally {
            if (loadTasksAbortController === controller) {
                loadTasksAbortController = null;
            }
            if (seq === loadTasksSeq) {
                loadingTasks.value = false;
                loadingTasksMore.value = false;
            }
        }
    }

    async function loadMoreTasks() {
        if (
            !tasksLoadHasMore.value ||
            loadingTasksMore.value ||
            loadingTasks.value ||
            tasksLoadError.value
        ) {
            return;
        }
        await loadTasks({ append: true });
    }

    async function ensureBoardTasksLoaded() {
        if (!selectedProjectId.value || tasksLoadError.value) {
            return;
        }
        let pages = 0;
        while (tasksLoadHasMore.value && pages < BOARD_SYNC_MAX_PAGES) {
            pages++;
            await loadTasks({ append: true });
            if (tasksLoadError.value) {
                break;
            }
        }
        if (tasksLoadHasMore.value && pages >= BOARD_SYNC_MAX_PAGES) {
            showToast(
                'Very large project — board shows loaded tasks only. Use List and Load more for the rest.',
                'error',
            );
        }
    }

    async function syncBoardTasksIfNeeded() {
        const mode = taskViewMode.value;
        if (
            (mode !== 'kanban' && mode !== 'calendar') ||
            !selectedProjectId.value ||
            tasksLoadError.value
        ) {
            return;
        }
        syncingBoardTasks.value = true;
        try {
            await ensureBoardTasksLoaded();
        } finally {
            syncingBoardTasks.value = false;
        }
    }

    function beginEditProject(p) {
        projectFormError.value = '';
        editingProjectId.value = p.id;
        editProjectName.value = String(p.name ?? '');
        editProjectDescription.value = p.description
            ? String(p.description)
            : '';
        editProjectColor.value = p.color || '#22d3ee';
    }

    function cancelEditProject() {
        editingProjectId.value = null;
        editProjectName.value = '';
        editProjectDescription.value = '';
        editProjectColor.value = '#22d3ee';
        savingProjectId.value = null;
    }

    async function saveProjectEdit() {
        const id = editingProjectId.value;
        if (!id) {
            return;
        }
        projectFormError.value = '';
        savingProjectId.value = id;
        try {
            await axios.patch(`projects/${id}`, {
                name: editProjectName.value.trim(),
                description:
                    editProjectDescription.value.trim() || null,
                color: editProjectColor.value || undefined,
            });
            cancelEditProject();
            await loadProjects();
            showToast('Project updated');
        } catch (e) {
            const errs = e.response?.data?.errors;
            projectFormError.value = errs
                ? Object.values(errs).flat().join(' ')
                : e.response?.data?.message ||
                  'Could not update project.';
        } finally {
            savingProjectId.value = null;
        }
    }

    async function selectProject(id) {
        cancelEditProject();
        selectedProjectId.value = id;
        editingTaskId.value = null;
        taskOpError.value = '';
        tasksLoadError.value = '';
        await loadTasks();
        await syncBoardTasksIfNeeded();
    }

    async function createProject() {
        projectFormError.value = '';
        creatingProject.value = true;
        try {
            const payload = {
                name: newProjectName.value.trim(),
                description:
                    newProjectDescription.value.trim() || undefined,
                color: newProjectColor.value || undefined,
            };
            const { data: created } = await axios.post('projects', payload);
            newProjectName.value = '';
            newProjectDescription.value = '';
            newProjectColor.value = '#22d3ee';
            selectedProjectId.value = created.id;
            await loadProjects();
            showToast(
                projectsLoadError.value
                    ? 'Project created, but the list couldn’t reload.'
                    : 'Project created — you’re on a roll',
                projectsLoadError.value ? 'error' : 'success',
            );
        } catch (e) {
            const errs = e.response?.data?.errors;
            if (errs) {
                projectFormError.value = Object.values(errs).flat().join(' ');
            } else {
                projectFormError.value =
                    e.response?.data?.message ||
                    'Could not create project.';
            }
        } finally {
            creatingProject.value = false;
        }
    }

    async function deleteProject(project) {
        const msg = `Delete project "${project.name}"?\n\nAll tasks in this project will be removed. This cannot be undone.`;
        if (!window.confirm(msg)) {
            return;
        }
        if (editingProjectId.value === project.id) {
            cancelEditProject();
        }
        projectFormError.value = '';
        deletingProjectId.value = project.id;
        try {
            await axios.delete(`projects/${project.id}`);
            await loadProjects();
            showToast('Project deleted');
        } catch (e) {
            showToast(
                e.response?.data?.message || 'Could not delete project.',
                'error',
            );
        } finally {
            deletingProjectId.value = null;
        }
    }

    async function createTask() {
        if (!selectedProjectId.value) {
            return;
        }
        taskFormError.value = '';
        creatingTask.value = true;
        try {
            const payload = {
                project_id: selectedProjectId.value,
                title: newTaskTitle.value.trim(),
                description:
                    newTaskDescription.value.trim() || undefined,
                due_date: newTaskDueDate.value || undefined,
                due_time:
                    newTaskDueDate.value && newTaskDueTime.value
                        ? newTaskDueTime.value
                        : undefined,
                estimated_duration: (() => {
                    const raw = String(
                        newTaskEstimatedMinutes.value ?? '',
                    ).trim();
                    if (!raw) {
                        return undefined;
                    }
                    const n = Number.parseInt(raw, 10);
                    return Number.isFinite(n) && n >= 0 ? n : undefined;
                })(),
                energy_level: newTaskEnergyLevel.value || undefined,
            };
            await axios.post('tasks', payload);
            newTaskTitle.value = '';
            newTaskDescription.value = '';
            newTaskDueDate.value = '';
            newTaskDueTime.value = '';
            newTaskEstimatedMinutes.value = '';
            newTaskEnergyLevel.value = '';
            await loadTasks();
            showToast('Task added to your list');
        } catch (e) {
            const errs = e.response?.data?.errors;
            if (errs) {
                taskFormError.value = Object.values(errs).flat().join(' ');
            } else {
                taskFormError.value =
                    e.response?.data?.message || 'Could not create task.';
            }
        } finally {
            creatingTask.value = false;
        }
    }

    function beginEditTask(t) {
        taskOpError.value = '';
        editingTaskId.value = t.id;
        editTaskTitle.value = String(t.title ?? '');
        editTaskDescription.value = t.description || '';
        editTaskDueDate.value = taskDueDayKey(t) || '';
        editTaskDueTime.value = dueTimeForInput(t);
        const dur = t.estimated_duration;
        editTaskEstimatedMinutes.value =
            dur != null && dur !== '' && Number(dur) >= 0
                ? String(dur)
                : '';
        editTaskEnergyLevel.value = t.energy_level || '';
    }

    function cancelEditTask() {
        editingTaskId.value = null;
        taskOpError.value = '';
    }

    async function saveTaskEdit() {
        if (!editingTaskId.value) {
            return;
        }
        taskOpError.value = '';
        savingTaskId.value = editingTaskId.value;
        try {
            await axios.patch(`tasks/${editingTaskId.value}`, {
                title: editTaskTitle.value.trim(),
                description: editTaskDescription.value.trim() || null,
                due_date: editTaskDueDate.value || null,
                due_time:
                    editTaskDueDate.value && editTaskDueTime.value
                        ? editTaskDueTime.value
                        : null,
                estimated_duration: (() => {
                    const raw = String(
                        editTaskEstimatedMinutes.value ?? '',
                    ).trim();
                    if (!raw) {
                        return null;
                    }
                    const n = Number.parseInt(raw, 10);
                    return Number.isFinite(n) && n >= 0 ? n : null;
                })(),
                energy_level: editTaskEnergyLevel.value || null,
            });
            editingTaskId.value = null;
            await loadTasks();
            showToast('Task updated');
        } catch (e) {
            const errs = e.response?.data?.errors;
            if (errs) {
                taskOpError.value = Object.values(errs).flat().join(' ');
            } else {
                taskOpError.value =
                    e.response?.data?.message || 'Could not update task.';
            }
        } finally {
            savingTaskId.value = null;
        }
    }

    async function updateTaskStatus(task, newStatus) {
        if (task.status === newStatus) {
            return;
        }
        taskOpError.value = '';
        savingTaskId.value = task.id;
        try {
            await axios.patch(`tasks/${task.id}`, { status: newStatus });
            await loadTasks();
            if (newStatus === 'done') {
                showToast('Done — crushed it');
            } else {
                showToast('Status updated');
            }
        } catch (e) {
            taskOpError.value =
                e.response?.data?.message || 'Could not update status.';
            showToast('Couldn’t update status', 'error');
            await loadTasks();
        } finally {
            savingTaskId.value = null;
        }
    }

    async function deleteTask(task) {
        if (!window.confirm('Delete this task? This cannot be undone.')) {
            return;
        }
        taskOpError.value = '';
        deletingTaskId.value = task.id;
        if (editingTaskId.value === task.id) {
            editingTaskId.value = null;
        }
        try {
            await axios.delete(`tasks/${task.id}`);
            await loadTasks();
            showToast('Task removed');
        } catch (e) {
            taskOpError.value =
                e.response?.data?.message || 'Could not delete task.';
        } finally {
            deletingTaskId.value = null;
        }
    }

    async function activateNotificationTask(projId, taskId) {
        cancelEditProject();
        cancelEditTask();
        selectedProjectId.value = projId;
        await loadTasks();
        let t = tasks.value.find((x) => x.id === taskId);
        if (!t) {
            try {
                const { data } = await axios.get(`tasks/${taskId}`);
                if (Number(data.project_id) === Number(projId)) {
                    const rest = tasks.value.filter((x) => x.id !== data.id);
                    tasks.value = [data, ...rest];
                    t = data;
                }
            } catch {
                showToast('Could not open that task.', 'error');
                return;
            }
        }
        if (t) {
            taskViewMode.value = 'list';
            await nextTick();
            beginEditTask(t);
        } else {
            showToast('Task not found for this project.', 'error');
        }
    }

    function resetAfterAuthLoss() {
        loadTasksAbortController?.abort();
        loadTasksAbortController = null;
        loadTasksSeq++;

        projects.value = [];
        selectedProjectId.value = null;
        tasks.value = [];
        calendarCursor.value = new Date();
        calendarSelectedIso.value = toIsoDate(new Date());

        listSearchQuery.value = '';
        listStatusFilter.value = '';

        newProjectName.value = '';
        newProjectDescription.value = '';
        newProjectColor.value = '#22d3ee';

        newTaskTitle.value = '';
        newTaskDescription.value = '';
        newTaskDueDate.value = '';
        newTaskDueTime.value = '';
        newTaskEstimatedMinutes.value = '';
        newTaskEnergyLevel.value = '';

        editingTaskId.value = null;
        editTaskTitle.value = '';
        editTaskDescription.value = '';
        editTaskDueDate.value = '';
        editTaskDueTime.value = '';
        editTaskEstimatedMinutes.value = '';
        editTaskEnergyLevel.value = '';

        editingProjectId.value = null;
        editProjectName.value = '';
        editProjectDescription.value = '';
        editProjectColor.value = '#22d3ee';
        savingProjectId.value = null;

        savingTaskId.value = null;
        deletingTaskId.value = null;
        taskOpError.value = '';
        taskFormError.value = '';
        projectFormError.value = '';
        creatingTask.value = false;
        creatingProject.value = false;
        deletingProjectId.value = null;
        listSortMenuOpen.value = false;
        quickCaptureOpen.value = false;
        quickCaptureTitle.value = '';
        quickCaptureSaving.value = false;

        loadingProjects.value = false;
        loadingTasks.value = false;
        loadingTasksMore.value = false;
        syncingBoardTasks.value = false;
        projectsLoadError.value = '';
        tasksLoadError.value = '';
        tasksLoadHasMore.value = false;
        tasksLoadedPage.value = 1;
        tasksListTotal.value = null;
    }

    function disposeWorkspaceListeners() {
        if (listSortEscapeHandler && typeof window !== 'undefined') {
            window.removeEventListener('keydown', listSortEscapeHandler);
            listSortEscapeHandler = null;
        }
        if (quickCaptureEscapeHandler && typeof window !== 'undefined') {
            window.removeEventListener('keydown', quickCaptureEscapeHandler);
            quickCaptureEscapeHandler = null;
        }
        if (typeof document !== 'undefined') {
            document.removeEventListener(
                'pointerdown',
                listSortOutsidePointerDown,
            );
        }
    }

    return {
        taskStatuses,
        taskEnergyLevels,
        calendarCursor,
        taskViewMode,
        calendarMonthTitle,
        calendarCells,
        calendarSelectedIso,
        calendarWeekStrip,
        calendarAgendaHeading,
        isCalendarSelectedToday,
        tasksOnCalendarDay,
        shiftCalendarMonth,
        shiftCalendarWeek,
        goCalendarToday,
        selectCalendarDay,
        tasksForKanban,
        onKanbanDragStart,
        onKanbanDragOver,
        onKanbanDrop,
        onKanbanDropOnCard,
        projects,
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
        tasks,
        newTaskTitle,
        newTaskDescription,
        newTaskDueDate,
        newTaskDueTime,
        newTaskEstimatedMinutes,
        newTaskEnergyLevel,
        taskFormError,
        creatingTask,
        newTaskEnergyCoach,
        editingTaskId,
        editTaskTitle,
        editTaskDescription,
        editTaskDueDate,
        editTaskDueTime,
        editTaskEstimatedMinutes,
        editTaskEnergyLevel,
        taskOpError,
        savingTaskId,
        deletingTaskId,
        loadingProjects,
        projectsLoadError,
        loadingTasks,
        loadingTasksMore,
        syncingBoardTasks,
        tasksLoadError,
        tasksLoadHasMore,
        tasksListTotal,
        loadMoreTasks,
        tasksWithoutDue,
        listSortMode,
        listShowOverdueOnly,
        listSearchQuery,
        listStatusFilter,
        listSortMenuOpen,
        listSortWrapRef,
        closeListSortMenu,
        toggleListSortMenu,
        selectListSortMode,
        listViewTasks,
        listDiscoveryNoMatches,
        quickCaptureOpen,
        quickCaptureTitle,
        quickCaptureSaving,
        quickCaptureInputRef,
        openQuickCapture,
        closeQuickCapture,
        submitQuickCapture,
        handleQuickCaptureHotkey,
        loadProjects,
        loadTasks,
        selectProject,
        createProject,
        createTask,
        beginEditTask,
        cancelEditTask,
        saveTaskEdit,
        updateTaskStatus,
        deleteTask,
        activateNotificationTask,
        resetAfterAuthLoss,
        disposeWorkspaceListeners,
    };
}
