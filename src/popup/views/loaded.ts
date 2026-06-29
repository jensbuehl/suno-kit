import { t } from '../i18n';
import { icon } from '../icons';
import { renderedLyrics } from '../lyrics';
import { type LoadedProps, type SongModel } from '../song';
import { type PopupState, type Tab } from '../state';
import { cleanFilename } from '../textProcessing';
import { mountAudioPlayer } from './audioPlayer';

const TAB_ORDER: { id: Tab; key: 'tab_lyrics' | 'tab_audio' | 'tab_cover' | 'tab_video'; icon: 'list' | 'waveform' | 'image' | 'play' }[] = [
    { id: 'lyrics', key: 'tab_lyrics', icon: 'list' },
    { id: 'audio', key: 'tab_audio', icon: 'waveform' },
    { id: 'cover', key: 'tab_cover', icon: 'image' },
    { id: 'video', key: 'tab_video', icon: 'play' }
];

/** Whether a given tab's asset is present (lyrics always; others need a URL). */
function tabAvailable(song: SongModel, tab: Tab): boolean {
    if (tab === 'lyrics') return true;
    if (tab === 'audio') return !!song.audio;
    if (tab === 'cover') return !!song.image;
    return !!song.video && song.videoAvailable !== false;
}

/** Human label for where the loaded song was sourced from. */
function originLabel(source: SongModel['source']): string {
    if (source === 'paste') return t('src_paste');
    if (source === 'background-tab') return t('src_background');
    return t('src_active');
}

function sourceCardHtml(song: SongModel): string {
    const coverStyle = song.image ? ` style="background-image:url('${song.image}');background-size:cover"` : '';
    // The origin chip doubles as the override affordance — clicking it opens the
    // paste row (prefilled with the current URL) so any auto-detected source can
    // be replaced by a pasted link.
    const origin = `<button class="source-origin" id="overrideBtn" type="button" title="${t('change_source')}" aria-label="${t('change_source')}">
        ${icon('link', 12)} ${originLabel(song.source)}
    </button>`;
    const extras = [origin];
    if (song.duration) extras.push(`<span>${song.duration}</span>`);
    if (song.model) extras.push(`<span>${song.model}</span>`);

    return `
        <div class="source-card">
            <div class="cover"${coverStyle}></div>
            <div class="source-meta">
                <div class="source-title">${song.title}</div>
                <div class="source-artist">by ${song.artist}</div>
                <div class="source-extra">${extras.join('<span class="dot"></span>')}</div>
            </div>
            <button class="btn btn-ghost zip-btn" id="zipToggle" aria-pressed="false">
                ${icon('download', 14)} ${t('zip_label')}
            </button>
        </div>
    `;
}

function zipRowHtml(checked: boolean, available: boolean, key: string, label: string, fname: string): string {
    const cls = `zip-row${checked && available ? ' checked' : ''}${available ? '' : ' disabled'}`;
    return `
        <div class="${cls}" data-zip="${key}">
            <span class="checkbox">${icon('check', 12)}</span>
            <span class="label">${label}</span>
            <span class="caption">${available ? fname : '—'}</span>
        </div>
    `;
}

/** Counts only items that are both selected AND available — i.e. what will
 * actually be zipped, so the button label matches the visibly-checked rows. */
function effectiveZipCount(state: PopupState, song: SongModel): number {
    let n = 0;
    if (state.zip.lyrics) n++;
    if (state.zip.audio && song.audio) n++;
    if (state.zip.cover && song.image) n++;
    if (state.zip.video && song.video) n++;
    return n;
}

function zipPanelHtml(state: PopupState, song: SongModel): string {
    const cleanTitle = cleanFilename(song.title) || 'song';
    const n = effectiveZipCount(state, song);
    const label = n === 0 ? t('zip_nothing') : `${t('zip_download')} · ${n} files`;
    return `
        <div class="zip-panel">
            <div class="zip-head">
                <span class="title">${t('package_title')}</span>
                <span class="fname">${cleanTitle}.zip</span>
            </div>
            ${zipRowHtml(state.zip.lyrics, true, 'lyrics', t('tab_lyrics'), `${cleanTitle}.lrc`)}
            ${zipRowHtml(state.zip.audio, !!song.audio, 'audio', t('tab_audio'), `${cleanTitle}.mp3`)}
            ${zipRowHtml(state.zip.cover, !!song.image, 'cover', t('tab_cover'), 'cover.jpg')}
            ${zipRowHtml(state.zip.video, !!song.video, 'video', t('tab_video'), 'visualizer.mp4')}
            <button class="btn btn-primary btn-block" id="zipDownload" ${n === 0 ? 'disabled' : ''}>
                ${icon('download', 15)} ${label}
            </button>
            <div class="inline-error" id="zipError" hidden></div>
        </div>
    `;
}

function tabsHtml(state: PopupState, song: SongModel): string {
    const buttons = TAB_ORDER.map((tdef) => {
        const active = state.tab === tdef.id ? ' active' : '';
        const disabled = tabAvailable(song, tdef.id) ? '' : ' disabled';
        return `<button class="tab${active}" data-tab="${tdef.id}"${disabled ? ' disabled' : ''}>
            ${icon(tdef.icon, 15)} ${t(tdef.key)}
        </button>`;
    }).join('');
    return `<div class="tabs">${buttons}</div>`;
}

/** The lyrics box inner HTML — exported so the trim panel can live-refresh just
 *  this region on keystroke without a full re-render (keeps input focus). */
export function lyricsLinesHtml(song: SongModel, state: PopupState): string {
    const text = renderedLyrics(song.lrcContent, state);
    return text
        .split('\n')
        .map((line) => {
            const m = line.match(/^\[(\d{2}:\d{2}\.\d{2,3})\]\s*(.*)$/);
            if (m) return `<div class="lyric-line"><span class="ts">[${m[1]}]</span><span class="txt">${m[2]}</span></div>`;
            return `<div class="lyric-line"><span class="txt">${line}</span></div>`;
        })
        .join('');
}

function escapeAttr(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Collapsible trim-rule panel (drop boilerplate lines around the lyrics). */
function trimPanelHtml(state: PopupState): string {
    const { trim } = state;
    return `
        <div class="trim-panel">
            <label class="trim-field">
                <span>${t('trim_start')}</span>
                <input class="text-input" id="trimStart" type="text"
                    value="${escapeAttr(trim.startAfter)}" placeholder="${t('trim_placeholder')}" />
            </label>
            <label class="trim-field">
                <span>${t('trim_end')}</span>
                <input class="text-input" id="trimEnd" type="text"
                    value="${escapeAttr(trim.endBefore)}" placeholder="${t('trim_placeholder')}" />
            </label>
            <div class="trim-toggles">
                <button class="chip" id="trimCase" type="button" aria-pressed="${trim.caseSensitive}">
                    ${t('trim_case')}
                </button>
            </div>
        </div>
    `;
}

function lyricsTabHtml(state: PopupState, song: SongModel): string {
    const segActive = (m: string): string => (state.caseMode === m ? ' active' : '');
    return `
        <div class="lyrics-toolbar">
            <button class="chip" id="tsChip" aria-pressed="${state.timestamps}">
                ${icon('clock', 14)} ${t('timestamps')}
            </button>
            <button class="chip" id="cleanChip" aria-pressed="${state.removePunct}">
                ${icon('check', 14)} ${t('clean')}
            </button>
            <div class="split-chip">
                <button class="chip split-toggle" id="trimChip" aria-pressed="${state.trim.enabled}"
                    title="${t('trim_toggle_hint')}">
                    ${icon('list', 14)} ${t('trim_label')}
                </button>
                <button class="chip split-caret${state.trimOpen ? ' open' : ''}" id="trimEdit"
                    aria-expanded="${state.trimOpen}" aria-label="${t('trim_edit_hint')}" title="${t('trim_edit_hint')}">
                    ${icon('chevron-down', 14)}
                </button>
            </div>
            <span class="toolbar-spacer"></span>
            <div class="case-segment">
                <button class="seg${segActive('none')}" data-case="none">Aa</button>
                <button class="seg${segActive('upper')}" data-case="upper">A</button>
                <button class="seg${segActive('lower')}" data-case="lower">a</button>
            </div>
        </div>
        ${state.trimOpen ? trimPanelHtml(state) : ''}
        <div class="lyrics-box">${lyricsLinesHtml(song, state)}</div>
        <div class="lyrics-actions">
            <button class="btn btn-primary copy" id="copyBtn">${icon('copy', 15)} ${t('copy_lyrics')}</button>
            <button class="btn btn-ghost lrc" id="lrcBtn">${icon('download', 15)} ${t('download_lrc')}</button>
        </div>
    `;
}

function coverTabHtml(song: SongModel): string {
    // Show the entire cover at its natural aspect ratio (no cropping).
    const preview = song.image
        ? `<img class="cover-preview" src="${song.image}" alt="${song.title}" />`
        : `<div class="cover-preview placeholder"></div>`;
    return `
        <div class="asset-panel">
            ${preview}
            <button class="btn btn-primary btn-block" id="dlCover" ${song.image ? '' : 'disabled'}>
                ${icon('download', 15)} ${t('download_cover')}
            </button>
            <div class="inline-error" id="coverError" hidden></div>
        </div>
    `;
}

function videoTabHtml(song: SongModel): string {
    const reachable = !!song.video && song.videoAvailable !== false;
    // Native controls give an inline preview-on-play; full frame, no aspect crop.
    const preview = song.video
        ? `<video class="video-preview" src="${song.video}" controls preload="metadata"></video>`
        : `<div class="video-preview placeholder"></div>`;
    return `
        <div class="asset-panel">
            ${preview}
            <button class="btn btn-primary btn-block" id="dlVideo" ${reachable ? '' : 'disabled'}>
                ${icon('download', 15)} ${t('download_video')}
            </button>
            <div class="inline-error" id="videoError" hidden></div>
        </div>
    `;
}

function audioTabHtml(song: SongModel): string {
    return `
        <div class="asset-panel">
            <div id="audioMount"></div>
            <button class="btn btn-primary btn-block" id="dlAudio" ${song.audio ? '' : 'disabled'}>
                ${icon('download', 15)} ${t('download_mp3')}
            </button>
            <div class="inline-error" id="audioError" hidden></div>
        </div>
    `;
}

function tabContentHtml(state: PopupState, song: SongModel): string {
    switch (state.tab) {
        case 'audio':
            return audioTabHtml(song);
        case 'cover':
            return coverTabHtml(song);
        case 'video':
            return videoTabHtml(song);
        default:
            return lyricsTabHtml(state, song);
    }
}

/** Renders the full loaded view (source card, ZIP panel, tabs, active tab). */
export function renderLoaded(root: HTMLElement, props: LoadedProps): void {
    const { state, song, actions } = props;

    root.innerHTML = `
        ${sourceCardHtml(song)}
        ${state.zipOpen ? zipPanelHtml(state, song) : ''}
        ${tabsHtml(state, song)}
        <div class="tab-content">${tabContentHtml(state, song)}</div>
    `;

    // Source card / ZIP
    root.querySelector('#overrideBtn')?.addEventListener('click', () => actions.togglePaste());
    const zipToggle = root.querySelector<HTMLButtonElement>('#zipToggle')!;
    zipToggle.setAttribute('aria-pressed', String(state.zipOpen));
    zipToggle.addEventListener('click', () => actions.toggleZipOpen());

    if (state.zipOpen) {
        root.querySelectorAll<HTMLElement>('.zip-row:not(.disabled)').forEach((row) => {
            row.addEventListener('click', () =>
                actions.toggleZipItem(row.dataset.zip as 'lyrics' | 'audio' | 'cover' | 'video')
            );
        });
        root.querySelector('#zipDownload')?.addEventListener('click', () => actions.downloadZip());
    }

    // Tabs
    root.querySelectorAll<HTMLButtonElement>('.tab:not(:disabled)').forEach((tab) => {
        tab.addEventListener('click', () => actions.setTab(tab.dataset.tab as Tab));
    });

    // Per-tab wiring
    if (state.tab === 'lyrics') {
        root.querySelector('#tsChip')!.addEventListener('click', () => actions.toggleTimestamps());
        root.querySelector('#cleanChip')!.addEventListener('click', () => actions.toggleClean());
        root.querySelector('#trimChip')!.addEventListener('click', () => actions.toggleTrimEnabled());
        root.querySelector('#trimEdit')!.addEventListener('click', () => actions.toggleTrim());
        root.querySelectorAll<HTMLButtonElement>('.case-segment .seg').forEach((seg) => {
            seg.addEventListener('click', () => actions.setCaseMode(seg.dataset.case as 'none' | 'upper' | 'lower'));
        });
        if (state.trimOpen) {
            root.querySelector<HTMLInputElement>('#trimStart')?.addEventListener('input', (e) =>
                actions.setTrimText('startAfter', (e.target as HTMLInputElement).value)
            );
            root.querySelector<HTMLInputElement>('#trimEnd')?.addEventListener('input', (e) =>
                actions.setTrimText('endBefore', (e.target as HTMLInputElement).value)
            );
            root.querySelector('#trimCase')?.addEventListener('click', () => actions.toggleTrimCase());
        }
        root.querySelector('#copyBtn')!.addEventListener('click', () => actions.copyLyrics());
        root.querySelector('#lrcBtn')!.addEventListener('click', () => actions.downloadLrc());
    } else if (state.tab === 'audio') {
        if (song.audio) {
            const mount = root.querySelector<HTMLElement>('#audioMount')!;
            const fname = `${cleanFilename(song.title) || 'song'}.mp3`;
            mountAudioPlayer(mount, song.audio, song.duration, fname);
        }
        root.querySelector('#dlAudio')?.addEventListener('click', () => actions.downloadAsset('audio'));
    } else if (state.tab === 'cover') {
        root.querySelector('#dlCover')?.addEventListener('click', () => actions.downloadAsset('cover'));
    } else if (state.tab === 'video') {
        root.querySelector('#dlVideo')?.addEventListener('click', () => actions.downloadAsset('video'));
    }
}
