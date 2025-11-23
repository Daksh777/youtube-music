import { createPlugin } from '@/utils';
import { t } from '@/i18n';

let observer: MutationObserver | null = null;
let lastAdCheck = 0;
let checkInterval: NodeJS.Timeout | null = null;
let isCurrentlyAd = false;
let lastStateChange = 0;
let videoWasMuted = false;

// Minimum time between state changes (in ms) to prevent rapid toggling
const STATE_CHANGE_COOLDOWN = 1000;
// Maximum duration for ads (in seconds) - ads are typically under 2 minutes
const MAX_AD_DURATION = 120;

function checkAndSkipAd() {
  // Throttle checks to avoid performance issues
  const now = Date.now();
  if (now - lastAdCheck < 500) return;
  lastAdCheck = now;

  const video = document.querySelector<HTMLVideoElement>('video');
  if (!video) return;

  // Multiple validation checks to ensure we're actually watching an ad
  const adIndicators = {
    // Check for ad overlay containers
    adOverlay: document.querySelector(
      '.ytp-ad-player-overlay, .video-ads, .ytp-ad-module',
    ),
    // Check for ad text/countdown
    adText: document.querySelector('.ytp-ad-text, .ytp-ad-preview-text'),
    // Check for ad countdown timer (strong indicator)
    adCountdown: document.querySelector(
      '.ytp-ad-simple-ad-badge, .ytp-ad-duration-remaining',
    ),
    // Check for skip button (appears during ads)
    skipButton: document.querySelector(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern',
    ),
    // Check if player is showing ad
    adShowing: document.querySelector('.ad-showing, .ad-container'),
    // Check for "Ad" badge
    adBadge: document.querySelector('.ytp-ad-text[class*="ad"]'),
  };

  // Check if video element has ad-specific attributes
  const videoContainer = video.closest('.html5-video-player');
  const hasAdClass =
    videoContainer?.classList.contains('ad-showing') ||
    videoContainer?.classList.contains('ad-interrupting');

  // Count how many ad indicators are present
  const indicatorCount = Object.values(adIndicators).filter(Boolean).length;

  // Verify video duration - ads are typically short (< 2 minutes)
  const hasShortDuration =
    video.duration > 0 && video.duration < MAX_AD_DURATION;

  // Require multiple indicators to be absolutely certain it's an ad
  // Either: 2+ indicators OR (has ad class AND at least 1 indicator AND short duration)
  const isDefinitelyAd =
    indicatorCount >= 2 ||
    (hasAdClass && indicatorCount >= 1 && hasShortDuration);

  // Apply cooldown to prevent rapid state changes
  const canChangeState = now - lastStateChange >= STATE_CHANGE_COOLDOWN;

  if (isDefinitelyAd && (!isCurrentlyAd || canChangeState)) {
    // Only change state if we're not already treating it as an ad
    if (!isCurrentlyAd) {
      isCurrentlyAd = true;
      lastStateChange = now;

      // Remember if video was already muted
      videoWasMuted = video.muted;

      // Mute and speed up the video
      video.muted = true;
      video.playbackRate = 16;
    }

    // Try to click skip button if available
    const skipButton = document.querySelector<HTMLElement>(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button',
    );
    if (skipButton && skipButton.offsetParent !== null) {
      skipButton.click();
    }
  } else if (!isDefinitelyAd && (isCurrentlyAd || canChangeState)) {
    // Only restore normal playback if we previously detected an ad
    if (isCurrentlyAd) {
      isCurrentlyAd = false;
      lastStateChange = now;

      // Restore normal playback
      // Only unmute if it wasn't muted before we started
      if (!videoWasMuted) {
        video.muted = false;
      }
      video.playbackRate = 1;
    }
  }
}

export default createPlugin({
  name: () => t('plugins.ad-speedup.name'),
  description: () => t('plugins.ad-speedup.description'),
  restartNeeded: false,
  config: {
    enabled: true,
  },
  renderer: {
    start() {
      // Check for ads periodically
      checkInterval = setInterval(() => {
        checkAndSkipAd();
      }, 500);

      // Also watch for DOM changes
      observer = new MutationObserver(() => {
        checkAndSkipAd();
      });

      const targetNode = document.body;
      if (targetNode) {
        observer.observe(targetNode, {
          childList: true,
          subtree: true,
        });
      }
    },

    stop() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    },
  },
});
