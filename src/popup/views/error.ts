import { t } from '../i18n';
import { icon } from '../icons';
import type { PopupActions } from '../song';
import type { TokenOption } from '../../shared/types';

export interface ErrorProps {
    actions: PopupActions;
    advancedOpen: boolean;
    tokenOptions: TokenOption[];
    selectedId: string;
}

/** Token error state with Reconnect + progressive manual-token fallback (spec §6). */
export function renderError(root: HTMLElement, props: ErrorProps): void {
    const { actions, advancedOpen, tokenOptions, selectedId } = props;

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
            <h2>${t('error_title')}</h2>
            <p>${t('error_body')}</p>
            <button class="btn btn-primary" id="reconnectBtn">${icon('refresh', 15)} ${t('reconnect')}</button>
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
    root.querySelector('#advancedToggle')!.addEventListener('click', () => actions.toggleAdvanced());

    if (advancedOpen) {
        const select = root.querySelector<HTMLSelectElement>('#tokenSelect')!;
        root.querySelector('#retryWithBtn')!.addEventListener('click', () =>
            actions.retryWithSource(select.value || 'auto')
        );
    }
}
