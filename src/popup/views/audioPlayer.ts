import { icon } from '../icons';
import { formatDuration } from '../song';

const BAR_COUNT = 44;

// A single, persistent <audio> shared across re-renders. Re-mounting the Audio
// tab (e.g. after switching tabs) reuses this element instead of creating a new
// one, so playback position/state survive and the transport can always stop it.
let sharedAudio: HTMLAudioElement | null = null;
let sharedUrl = '';
let unloadBound = false;

/** Stops and discards the shared audio element (e.g. on popup teardown). */
export function stopAudioPlayback(): void {
    if (sharedAudio) {
        sharedAudio.pause();
    }
}

/** Deterministic, music-ish bar heights (8–56px) so the waveform looks varied. */
function barHeights(): number[] {
    const heights: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
        const wave = Math.sin(i * 0.5) * 0.5 + Math.sin(i * 1.3) * 0.3 + Math.sin(i * 0.21) * 0.2;
        heights.push(Math.round(20 + (wave + 1) * 18)); // ~8..56
    }
    return heights;
}

/**
 * Mounts an audio preview player into `root` (spec §3.5a): a clickable waveform
 * that fills to the REAL playback position, a play/pause transport, a
 * `current / total` readout, and the file name. Progress is driven by the
 * <audio> element's currentTime/duration — never a timer.
 */
export function mountAudioPlayer(root: HTMLElement, audioUrl: string, totalLabel?: string, fileName = ''): void {
    const heights = barHeights();
    const bars = heights.map((h) => `<div class="bar" style="height:${h}px"></div>`).join('');

    root.innerHTML = `
        <div class="audio-card">
            <div class="waveform" role="slider" tabindex="0" aria-label="Seek">${bars}</div>
            <div class="audio-transport">
                <button class="play-btn" type="button" aria-label="Play">${icon('play', 18)}</button>
                <div class="audio-time"><span class="cur">0:00</span> / <span class="total">${totalLabel || '0:00'}</span></div>
                <div class="audio-fname">${fileName}</div>
            </div>
        </div>
    `;

    const waveform = root.querySelector<HTMLElement>('.waveform')!;
    const barEls = Array.from(root.querySelectorAll<HTMLElement>('.waveform .bar'));
    const playBtn = root.querySelector<HTMLButtonElement>('.play-btn')!;
    const curEl = root.querySelector<HTMLElement>('.audio-time .cur')!;
    const totalEl = root.querySelector<HTMLElement>('.audio-time .total')!;

    // Reuse the persistent element when it's already this track; otherwise (re)create.
    if (!sharedAudio || sharedUrl !== audioUrl) {
        if (sharedAudio) sharedAudio.pause();
        sharedAudio = new Audio();
        sharedAudio.preload = 'metadata';
        sharedAudio.src = audioUrl;
        sharedUrl = audioUrl;
    }
    const audio = sharedAudio;

    function renderFill(fraction: number): void {
        const filled = Math.round(fraction * barEls.length);
        barEls.forEach((bar, i) => bar.classList.toggle('filled', i < filled));
    }
    function setPlayIcon(playing: boolean): void {
        playBtn.innerHTML = icon(playing ? 'pause' : 'play', 18);
        playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }

    // Bind via on* properties so re-mounts overwrite (no listener stacking on the
    // persistent element) and always target the current DOM nodes.
    audio.onloadedmetadata = () => {
        if (!totalLabel && isFinite(audio.duration)) totalEl.textContent = formatDuration(audio.duration);
    };
    audio.ontimeupdate = () => {
        curEl.textContent = formatDuration(audio.currentTime);
        if (audio.duration > 0) renderFill(audio.currentTime / audio.duration);
    };
    audio.onplay = () => setPlayIcon(true);
    audio.onpause = () => setPlayIcon(false);
    audio.onended = () => {
        setPlayIcon(false);
        renderFill(0);
        curEl.textContent = '0:00';
    };

    playBtn.addEventListener('click', () => {
        if (audio.paused) void audio.play();
        else audio.pause();
    });

    function seekFromEvent(clientX: number): void {
        if (!(audio.duration > 0)) return;
        const rect = waveform.getBoundingClientRect();
        const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        audio.currentTime = fraction * audio.duration;
        renderFill(fraction);
    }
    waveform.addEventListener('click', (e) => seekFromEvent(e.clientX));
    waveform.addEventListener('keydown', (e) => {
        if (!(audio.duration > 0)) return;
        if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        else if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
    });

    // Reflect the live state immediately (so returning to the tab shows the right
    // play/pause icon, time, and fill, and lets you pause an already-playing track).
    setPlayIcon(!audio.paused);
    if (isFinite(audio.duration) && audio.duration > 0) {
        totalEl.textContent = totalLabel || formatDuration(audio.duration);
        curEl.textContent = formatDuration(audio.currentTime);
        renderFill(audio.currentTime / audio.duration);
    }

    if (!unloadBound) {
        window.addEventListener('unload', stopAudioPlayback);
        unloadBound = true;
    }
}
