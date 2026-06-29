import { t } from '../i18n';
import { icon } from '../icons';
import type { PopupActions } from '../song';
import type { SongRef } from '../../shared/types';

export interface EmptyProps {
    actions: PopupActions;
    songTabs: SongRef[];
}

/** No active song: offer a paste-a-link input, any open Suno song tabs to pick
 *  from, and a link to open suno.com. Never a dead end (FR-001). */
export function renderEmpty(root: HTMLElement, props: EmptyProps): void {
    const { actions, songTabs } = props;

    const chooser = songTabs.length
        ? `<div class="tab-chooser">
                <div class="chooser-label">${t('pick_song')}</div>
                ${songTabs
                    .map(
                        (r, i) =>
                            `<button class="btn btn-ghost btn-block chooser-item" type="button" data-i="${i}">
                                ${icon('music-note', 14)} <span class="chooser-id">${r.songId.slice(0, 8)}…</span>
                            </button>`
                    )
                    .join('')}
           </div>`
        : '';

    root.innerHTML = `
        <div class="empty">
            <img class="empty-mark" src="public/icon128.png" alt="" />
            <h2>${t('empty_title')}</h2>
            <p>${t('empty_body')}</p>
            <div class="empty-paste">
                <input class="text-input" id="emptyPasteInput" type="url" inputmode="url"
                    placeholder="${t('paste_placeholder')}" aria-label="${t('paste_title')}" />
                <button class="btn btn-primary" id="emptyPasteLoad" type="button">${t('paste_load')}</button>
            </div>
            <div class="inline-error" id="emptyPasteError" hidden></div>
            ${chooser}
            <button class="link-accent" id="openSunoBtn">${t('open_suno')} ${icon('external', 14)}</button>
        </div>
    `;

    const input = root.querySelector<HTMLInputElement>('#emptyPasteInput')!;
    const submit = (): void => actions.loadFromInput(input.value);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
    });
    input.addEventListener('dragover', (e) => e.preventDefault());
    input.addEventListener('drop', (e) => {
        e.preventDefault();
        const text = e.dataTransfer?.getData('text') || '';
        if (text) {
            input.value = text;
            submit();
        }
    });
    root.querySelector('#emptyPasteLoad')!.addEventListener('click', submit);

    songTabs.forEach((ref, i) => {
        root.querySelector(`.chooser-item[data-i="${i}"]`)?.addEventListener('click', () =>
            actions.loadRef(ref)
        );
    });

    root.querySelector('#openSunoBtn')!.addEventListener('click', () => actions.openSuno());
}
