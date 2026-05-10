import { inject } from 'vue';
import { TASK_WORKSPACE_KEY } from '../constants';

export function injectTaskWorkspace() {
    const workspace = inject(TASK_WORKSPACE_KEY);
    if (!workspace) {
        throw new Error('Missing TASK_WORKSPACE_KEY');
    }
    return workspace;
}
