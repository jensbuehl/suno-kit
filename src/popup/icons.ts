// Inline stroke-icon helper. Every icon is a single <svg> using `currentColor`
// (CSS variables don't work inside SVG presentation attributes — drive `color`
// from a token on a parent). No emoji anywhere in the UI (spec §1).

export type IconName =
    | 'link'
    | 'download'
    | 'list'
    | 'waveform'
    | 'image'
    | 'play'
    | 'pause'
    | 'clock'
    | 'check'
    | 'refresh'
    | 'warning'
    | 'music-note'
    | 'chevron-down'
    | 'copy'
    | 'external';

// viewBox is 24×24 for every glyph; bodies are stroked unless noted.
const PATHS: Record<IconName, string> = {
    link: '<path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M13 18l-1 1a4 4 0 0 1-6-6l1-1"/>',
    download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
    list: '<path d="M8 7h12"/><path d="M8 12h12"/><path d="M8 17h12"/><path d="M4 7h.01"/><path d="M4 12h.01"/><path d="M4 17h.01"/>',
    waveform:
        '<path d="M4 10v4"/><path d="M8 6v12"/><path d="M12 9v6"/><path d="M16 4v16"/><path d="M20 10v4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5L5 20"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    refresh:
        '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 5v6h-6"/>',
    warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    'music-note': '<path d="M9 18V6l10-2v10"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="14" r="3"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    external: '<path d="M14 5h5v5"/><path d="M19 5l-7 7"/><path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>'
};

/** Returns an inline SVG string for `name`, sized `size`px (default 16). */
export function icon(name: IconName, size = 16): string {
    return (
        `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
        `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
        `stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`
    );
}
