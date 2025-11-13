import { SPONSORBLOCK_COLORS } from './colors';

import type { SegmentWithCategory } from './types';

/**
 * Creates and manages visual indicators for SponsorBlock segments on the progress bar
 */
export class SponsorBlockIndicators {
  private container: HTMLDivElement | null = null;
  private progressBar: HTMLElement | null = null;
  private video: HTMLVideoElement | null = null;
  private observer: MutationObserver | null = null;
  private boundUpdateIndicators: (e: Event) => void;

  constructor() {
    this.boundUpdateIndicators = this.handleSegmentUpdate.bind(this);
    this.init();
  }

  private init() {
    // Wait for progress bar to be available
    const checkProgressBar = () => {
      this.progressBar = document.querySelector('#progress-bar');
      this.video = document.querySelector('video');

      if (this.progressBar) {
        this.setupContainer();
        this.setupObserver();
      } else {
        // Retry after a short delay
        setTimeout(checkProgressBar, 1000);
      }
    };

    checkProgressBar();

    // Listen for segment updates
    document.addEventListener(
      'sponsorblock-segments-updated',
      this.boundUpdateIndicators as EventListener,
    );
  }

  private handleSegmentUpdate(e: Event) {
    const customEvent = e as CustomEvent<SegmentWithCategory[]>;
    this.updateIndicators(customEvent.detail);
  }

  private setupContainer() {
    if (!this.progressBar) return;

    // Create container for indicators
    this.container = document.createElement('div');
    this.container.id = 'sponsorblock-indicators';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    // Find the parent element to insert the container
    const sliderContainer = this.progressBar.querySelector('#sliderContainer');
    if (sliderContainer) {
      const element = sliderContainer as HTMLElement;
      element.style.position = 'relative';
      element.appendChild(this.container);
    }
  }

  private setupObserver() {
    if (!this.progressBar) return;

    // Observe changes to the progress bar value to update indicators
    this.observer = new MutationObserver(() => {
      this.updateIndicatorPositions();
    });

    this.observer.observe(this.progressBar, {
      attributes: true,
      attributeFilter: ['aria-valuemax'],
    });
  }

  private updateIndicators(segments: SegmentWithCategory[]) {
    if (!this.container || !this.video) return;

    // Clear existing indicators
    this.container.innerHTML = '';

    const duration = this.video.duration;
    if (!duration || isNaN(duration)) return;

    // Create indicator for each segment
    for (const { segment, category } of segments) {
      const [start, end] = segment;
      const startPercent = (start / duration) * 100;
      const widthPercent = ((end - start) / duration) * 100;

      // Get color for category
      const color = SPONSORBLOCK_COLORS[category] || '#ffffff';

      // Create indicator element
      const indicator = document.createElement('div');
      indicator.className = 'sponsorblock-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: ${startPercent}%;
        width: ${widthPercent}%;
        height: 4px;
        background-color: ${color};
        opacity: 0.8;
        border-radius: 2px;
        pointer-events: none;
        min-width: 2px;
      `;

      // Add title for accessibility
      indicator.title = `${category}: ${start.toFixed(1)}s - ${end.toFixed(1)}s`;

      this.container.appendChild(indicator);
    }
  }

  private updateIndicatorPositions() {
    // This method can be used to update indicator positions if needed
    // Currently positions are percentage-based so they scale automatically
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }

    document.removeEventListener(
      'sponsorblock-segments-updated',
      this.boundUpdateIndicators as EventListener,
    );
  }
}
