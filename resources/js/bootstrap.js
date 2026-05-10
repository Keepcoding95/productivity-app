import axios from 'axios';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';

// API base: set VITE_API_URL in .env when Vite dev server and Laravel are on different hosts
// (e.g. VITE_API_URL=http://productivity-app.test/api and npm run dev on http://localhost:5173)
const apiBase = import.meta.env.VITE_API_URL;
if (apiBase) {
    window.axios.defaults.baseURL = apiBase;
} else {
    window.axios.defaults.baseURL = '/api';
}

window.axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

function requestIsAuthEndpoint(urlString, baseURL) {
    const raw = String(urlString ?? '').trim();
    const base = String(baseURL ?? '').trim();
    try {
        const origin =
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

        let pathname;
        if (/^https?:\/\//i.test(raw)) {
            pathname = new URL(raw).pathname;
        } else {
            const baseForResolve = /^https?:\/\//i.test(base)
                ? base.replace(/\/?$/, '/')
                : `${origin}${base.startsWith('/') ? '' : '/'}${base}`.replace(/\/?$/, '/');
            pathname = new URL(raw.replace(/^\//, ''), baseForResolve).pathname;
        }

        const trimmedApi = pathname.replace(/^\/api(?:\/|$)/i, '/');
        const normalized = trimmedApi.replace(/^\/+/, '');
        const segment = normalized.split('/').filter(Boolean)[0] ?? '';
        return ['login', 'register', 'forgot-password', 'reset-password', 'logout'].includes(
            segment,
        );
    } catch {
        return /\b(login|register|forgot-password|reset-password|logout)(\/|$|\?)/.test(raw);
    }
}

window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const cfg = error.config;
        const url = cfg?.url;
        const baseURL = cfg?.baseURL ?? window.axios.defaults.baseURL;
        if (
            status === 401 &&
            typeof window !== 'undefined' &&
            !requestIsAuthEndpoint(url, baseURL)
        ) {
            setAuthToken(null);
            window.dispatchEvent(new CustomEvent('flow-auth-session-expired'));
        }
        return Promise.reject(error);
    },
);

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('auth_token', token);
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        localStorage.removeItem('auth_token');
        delete window.axios.defaults.headers.common['Authorization'];
    }
}
