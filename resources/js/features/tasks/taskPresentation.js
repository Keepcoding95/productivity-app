import { taskEnergyLevels } from './constants';

export function padDatePart(n) {
    return String(n).padStart(2, '0');
}

/** YYYY-MM-DD in local timezone */
export function toIsoDate(d) {
    return `${d.getFullYear()}-${padDatePart(d.getMonth() + 1)}-${padDatePart(d.getDate())}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseIsoDateLocal(iso) {
    const part = String(iso ?? '').slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
    if (!m) {
        return new Date(NaN);
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const day = Number(m[3]);
    return new Date(y, mo - 1, day);
}

/** Add calendar days to an ISO date string; returns `YYYY-MM-DD`. */
export function addDaysToIso(iso, deltaDays) {
    const d = parseIsoDateLocal(iso);
    if (Number.isNaN(d.getTime())) {
        return toIsoDate(new Date());
    }
    d.setDate(d.getDate() + deltaDays);
    return toIsoDate(d);
}

export function taskDueDayKey(task) {
    if (!task.due_date) {
        return null;
    }
    const s =
        typeof task.due_date === 'string'
            ? task.due_date
            : String(task.due_date);
    return s.slice(0, 10);
}

export function formatNotificationTimestamp(iso) {
    if (!iso) {
        return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return String(iso).slice(0, 16).replace('T', ' ');
    }
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/** HH:mm for <input type="time"> from API due_time */
export function dueTimeForInput(task) {
    const raw = task?.due_time;
    if (raw == null || raw === '') {
        return '';
    }
    const s = String(raw).trim();
    if (/^\d{2}:\d{2}$/.test(s)) {
        return s;
    }
    if (/^\d{2}:\d{2}:\d{2}/.test(s)) {
        return s.slice(0, 5);
    }
    return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Compact duration chip text */
export function estimatedMinutesLabel(task) {
    const n = Number(task?.estimated_duration);
    if (!Number.isFinite(n) || n <= 0) {
        return '';
    }
    return `${n} min est.`;
}

/** Due date line — compact like notification meta (no chip chrome) */
export function formatTaskDuePlain(task) {
    const key = taskDueDayKey(task);
    const completedMeta =
        task.status === 'done' && task.completed_at
            ? formatNotificationTimestamp(task.completed_at)
            : '';

    const scheduleParts = [];
    const tm = dueTimeForInput(task);
    if (tm) {
        scheduleParts.push(tm);
    }
    const est = estimatedMinutesLabel(task);
    if (est) {
        scheduleParts.push(est);
    }
    const scheduleSuffix = scheduleParts.length
        ? ` · ${scheduleParts.join(' · ')}`
        : '';

    if (!key) {
        if (task.status === 'done') {
            return completedMeta ? `Completed · ${completedMeta}` : 'Completed';
        }
        return '';
    }
    const [y, mo, d] = key.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    const dateStr = dt.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const today = toIsoDate(new Date());
    if (task.status === 'done') {
        return completedMeta
            ? `${dateStr}${scheduleSuffix} · Completed · ${completedMeta}`
            : `${dateStr}${scheduleSuffix} · Completed`;
    }
    if (key < today) {
        return `${dateStr} · Overdue${scheduleSuffix}`;
    }
    if (key === today) {
        return `${dateStr} · Today${scheduleSuffix}`;
    }
    return `${dateStr}${scheduleSuffix}`;
}

export function isTaskOverdue(task) {
    if (task.status === 'done') {
        return false;
    }
    const key = taskDueDayKey(task);
    if (!key) {
        return false;
    }
    return key < toIsoDate(new Date());
}

/** Card / badge label for focus demand (API: low | medium | high) */
export function formatTaskEnergyLine(task) {
    if (!task?.energy_level) {
        return '';
    }
    const o = taskEnergyLevels.find((x) => x.value === task.energy_level);
    return o?.title ?? '';
}

export function taskEnergyHint(level) {
    if (!level) {
        return '';
    }
    return taskEnergyLevels.find((o) => o.value === level)?.hint ?? '';
}

/** Tooltip on calendar pills — includes focus tier when set */
export function calendarTaskTooltip(task) {
    if (!task?.title) {
        return '';
    }
    const focus = formatTaskEnergyLine(task);
    const est = estimatedMinutesLabel(task);
    const bits = [focus ? `Focus: ${focus}` : '', est].filter(Boolean);
    return bits.length ? `${task.title} · ${bits.join(' · ')}` : task.title;
}

export function energyPickTierClass(tier, selected) {
    const parts = ['flow-focus-tier'];
    if (selected === tier) {
        if (tier === 'low') {
            parts.push('flow-focus-tier-active-low');
        } else if (tier === 'medium') {
            parts.push('flow-focus-tier-active-medium');
        } else {
            parts.push('flow-focus-tier-active-high');
        }
    }
    return parts.join(' ');
}

/** Lit/unlit fill only — pair with .flow-focus-meter-bar layout */
export function energyMeterSegmentClass(tierValue, segmentIndex) {
    const lit =
        (tierValue === 'low' && segmentIndex === 0) ||
        (tierValue === 'medium' && segmentIndex <= 1) ||
        tierValue === 'high';
    if (!lit) {
        return 'bg-slate-400/20 dark:bg-neutral-600/30';
    }
    if (tierValue === 'low') {
        return 'bg-red-500 shadow-[0_0_8px_rgb(239_68_68_/_.45)] dark:bg-red-500';
    }
    if (tierValue === 'medium') {
        return 'bg-amber-400 shadow-[0_0_8px_rgb(251_191_36_/_.45)] dark:bg-amber-400';
    }
    return 'bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153_/_.45)] dark:bg-emerald-400';
}

/** Read-only meter segments on task rows */
export function energyBadgeSegmentClass(level, segmentIndex) {
    const base = 'h-1 flex-1 rounded-full';
    const lit =
        (level === 'low' && segmentIndex === 0) ||
        (level === 'medium' && segmentIndex <= 1) ||
        level === 'high';
    if (!lit) {
        return `${base} bg-slate-300/45 dark:bg-neutral-600/45`;
    }
    if (level === 'low') {
        return `${base} bg-red-500 shadow-[0_0_6px_rgb(239_68_68_/_.4)]`;
    }
    if (level === 'medium') {
        return `${base} bg-amber-400 shadow-[0_0_6px_rgb(251_191_36_/_.4)]`;
    }
    return `${base} bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153_/_.45)]`;
}

export function taskEnergyBadgePillClass(level, compact = false) {
    const size = compact
        ? 'inline-flex gap-1.5 px-1.5 py-px text-[9px]'
        : 'inline-flex gap-2 px-2 py-0.5 text-[10px]';
    const base = `${size} max-w-full items-center rounded-full border font-semibold leading-tight tracking-wide`;
    if (level === 'low') {
        return `${base} border-red-400/45 bg-red-500/[0.1] text-red-950 dark:border-red-400/40 dark:bg-red-500/12 dark:text-red-100`;
    }
    if (level === 'medium') {
        return `${base} border-amber-400/40 bg-amber-500/[0.1] text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/12 dark:text-amber-50`;
    }
    return `${base} border-emerald-400/40 bg-emerald-500/[0.09] text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/12 dark:text-emerald-100`;
}

export function taskListShellClass(task) {
    const base = taskRowClass(task.status);
    if (!isTaskOverdue(task)) {
        return base;
    }
    return `${base} ring-1 ring-rose-500/35 shadow-[0_0_24px_-12px_rgb(244_63_94_/_.35)] dark:ring-rose-400/30`;
}

/** HUD-style task surfaces — calmer fills, accent bar */
export function taskRowClass(status) {
    const base =
        'rounded-xl border bg-white/55 backdrop-blur-md transition-colors duration-200 dark:bg-neutral-950/40';
    const map = {
        todo: `${base} border-slate-200/55 border-l-[3px] border-l-slate-400 dark:border-white/[0.08] dark:border-l-slate-500`,
        in_progress: `${base} border-cyan-500/20 border-l-[3px] border-l-cyan-500 bg-cyan-500/[0.06] dark:border-cyan-400/20 dark:border-l-cyan-400 dark:bg-cyan-400/[0.05]`,
        review: `${base} border-amber-500/25 border-l-[3px] border-l-amber-500 bg-amber-500/[0.06] dark:border-amber-400/25 dark:border-l-amber-400 dark:bg-amber-400/[0.05]`,
        done: `${base} border-emerald-500/25 border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.06] dark:border-emerald-400/25 dark:border-l-emerald-400 dark:bg-emerald-400/[0.05]`,
    };
    return map[status] || map.todo;
}

export function taskSelectClass(status) {
    const map = {
        todo: 'border-slate-300/70 bg-white/90 text-slate-800 dark:border-white/12 dark:bg-neutral-950/70 dark:text-neutral-200',
        in_progress:
            'border-cyan-400/40 bg-cyan-500/10 text-cyan-950 dark:border-cyan-400/35 dark:bg-cyan-400/10 dark:text-cyan-50',
        review: 'border-amber-400/45 bg-amber-500/10 text-amber-950 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-50',
        done: 'border-emerald-400/45 bg-emerald-500/12 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-50',
    };
    return map[status] || map.todo;
}

export function taskTitleClass(status) {
    if (status === 'done') {
        return 'text-emerald-700/95 line-through decoration-emerald-400/70 decoration-2 dark:text-emerald-200/90 dark:decoration-emerald-500/50';
    }
    return 'text-slate-900 dark:text-neutral-100';
}

/** Calendar pills — glass chips */
export function calendarTaskPillClass(status) {
    const map = {
        todo:
            'border border-slate-400/35 bg-slate-100/90 py-1.5 text-left text-slate-900 shadow-sm backdrop-blur-sm hover:bg-slate-200/90 dark:border-white/12 dark:bg-neutral-800/90 dark:text-neutral-50 dark:hover:bg-neutral-700/90',
        in_progress:
            'border border-cyan-400/40 bg-cyan-500/15 py-1.5 text-left font-medium text-cyan-950 shadow-[0_0_16px_-6px_rgb(34_211_238_/_.5)] backdrop-blur-sm dark:border-cyan-400/35 dark:bg-cyan-400/10 dark:text-cyan-50 dark:shadow-[0_0_20px_-8px_rgb(34_211_238_/_.35)]',
        review:
            'border border-amber-400/40 bg-amber-500/15 py-1.5 text-left font-medium text-amber-950 shadow-[0_0_16px_-6px_rgb(251_191_36_/_.4)] backdrop-blur-sm dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-50',
        done:
            'border border-emerald-400/40 bg-emerald-500/15 py-1.5 text-left font-semibold text-emerald-950 line-through decoration-emerald-900/60 decoration-[1.5px] backdrop-blur-sm dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-50 dark:decoration-emerald-300/80',
    };
    return map[status] || map.todo;
}
