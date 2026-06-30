import { type MessageKey, t } from '../i18n';
import { icon } from '../icons';
import type { PopupActions } from '../song';
import type { LoadError } from '../../shared/types';

export interface ErrorProps {
    actions: PopupActions;
    error: LoadError | null;
}

interface ErrorCopy {
    titleKey: MessageKey;
    bodyKey: MessageKey;
    /** Show an "Open suno.com" action — true for errors a Suno visit can fix. */
    openSuno: boolean;
}

/** Distinct, specific copy per failure mode (FR-011). */
function errorCopy(error: LoadError | null): ErrorCopy {
    switch (error?.kind) {
        case 'bad-link':
            return { titleKey: 'error_title_load', bodyKey: 'err_bad_link', openSuno: false };
        case 'not-signed-in':
            return { titleKey: 'error_title', bodyKey: 'err_not_signed_in', openSuno: true };
        case 'session-expired':
            return { titleKey: 'error_title', bodyKey: 'err_session_expired', openSuno: true };
        case 'song-inaccessible':
            return { titleKey: 'error_title_load', bodyKey: 'err_song_inaccessible', openSuno: false };
        case 'offline':
            return { titleKey: 'error_title_load', bodyKey: 'err_offline', openSuno: false };
        default:
            return { titleKey: 'error_title_load', bodyKey: 'err_unknown', openSuno: true };
    }
}

/** Load/auth error state — Reconnect (auto retry) + Open suno.com for auth issues. */
export function renderError(root: HTMLElement, props: ErrorProps): void {
    const { actions, error } = props;
    const copy = errorCopy(error);

    root.innerHTML = `
        <div class="error">
            <div class="circle">${icon('warning', 26)}</div>
            <h2>${t(copy.titleKey)}</h2>
            <p>${t(copy.bodyKey)}</p>
            <button class="btn btn-primary" id="reconnectBtn">${icon('refresh', 15)} ${t('reconnect')}</button>
            ${
                copy.openSuno
                    ? `<button class="btn btn-ghost" id="openSunoErr">${icon('external', 15)} ${t('open_suno')}</button>`
                    : ''
            }
        </div>
    `;

    root.querySelector('#reconnectBtn')!.addEventListener('click', () => actions.reconnect());
    root.querySelector('#openSunoErr')?.addEventListener('click', () => actions.openSuno());
}
