import { t } from '../i18n';

/** Skeleton-shimmer loading view shown while GET_LRC_DATA is in flight (spec §5). */
export function renderLoading(root: HTMLElement): void {
    root.innerHTML = `
        <div class="loading">
            <div class="skeleton-card">
                <div class="skeleton skeleton-cover"></div>
                <div class="skeleton-lines">
                    <div class="skeleton skeleton-line"></div>
                    <div class="skeleton skeleton-line short"></div>
                </div>
            </div>
            <div class="skeleton skeleton-toolbar"></div>
            <div class="skeleton skeleton-lyrics"></div>
            <div class="spinner-row">
                <div class="spinner"></div>
                <span>${t('loading_text')}</span>
            </div>
        </div>
    `;
}
