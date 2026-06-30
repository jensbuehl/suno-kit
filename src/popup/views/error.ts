import { type MessageKey, t } from '../i18n';
import { icon } from '../icons';
import type { PopupActions } from '../song';
import type { LoadError, TokenOption } from '../../shared/types';

export interface ErrorProps {
    actions: PopupActions;
    advancedOpen: boolean;
    tokenOptions: TokenOption[];
    selectedId: string;
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

/** Token/load error state with Reconnect + progressive manual-token fallback (spec §6). */
export function renderError(root: HTMLElement, props: ErrorProps): void {
    const { actions, advancedOpen, tokenOptions, selectedId, error } = props;
    const copy = errorCopy(error);

    const optionsHtml = [
        `<option value="auto"${selectedId === 'auto' ? ' selected' : ''}>${t('token_auto')}</option>`,
        ...tokenOptions.map(
            (o) =>
                `<option value="${o.id}"${o.id === selectedId ? ' selected' : ''}>${o.label || o.id}</option>`
        )
    ].join('');

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
            <button class="advanced-toggle" id="advancedToggle" aria-expanded="${advancedOpen}">
                ${t('try_other')} ${icon('chevron-down', 14)}
            </button>
            ${
                advancedOpen
                    ? `<div class="advanced-panel">
                            <div class="hint">${t('manual_hint')}</div>
                            <select id="tokenSelect">${optionsHtml}</select>
                            <button class="btn btn-ghost btn-block" id="retryWithBtn">${t('retry_with')}</button>
                       </div>`
                    : ''
            }
        </div>
    `;

    root.querySelector('#reconnectBtn')!.addEventListener('click', () => actions.reconnect());
    root.querySelector('#openSunoErr')?.addEventListener('click', () => actions.openSuno());
    root.querySelector('#advancedToggle')!.addEventListener('click', () => actions.toggleAdvanced());

    if (advancedOpen) {
        const select = root.querySelector<HTMLSelectElement>('#tokenSelect')!;
        root.querySelector('#retryWithBtn')!.addEventListener('click', () =>
            actions.retryWithSource(select.value || 'auto')
        );
    }
}
