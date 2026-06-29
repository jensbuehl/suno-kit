import { t } from '../i18n';
import { icon } from '../icons';
import type { PopupActions } from '../song';

export interface EmptyProps {
    actions: PopupActions;
}

/** No-song state: prompt to open a song on suno.com (spec §4, paste removed). */
export function renderEmpty(root: HTMLElement, props: EmptyProps): void {
    root.innerHTML = `
        <div class="empty">
            <img class="empty-mark" src="public/icon128.png" alt="" />
            <h2>${t('empty_title')}</h2>
            <p>${t('empty_body')}</p>
            <button class="link-accent" id="openSunoBtn">${t('open_suno')} ${icon('external', 14)}</button>
        </div>
    `;

    root.querySelector('#openSunoBtn')!.addEventListener('click', () => props.actions.openSuno());
}
