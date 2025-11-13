import is from 'electron-is';

import { createPlugin } from '@/utils';

import { sortSegments, sortSegmentsWithCategory } from './segments';
import { SponsorBlockIndicators } from './indicators';

import { t } from '@/i18n';

import type { GetPlayerResponse } from '@/types/get-player-response';
import type { Segment, SkipSegment, SegmentWithCategory } from './types';

export type SponsorBlockPluginConfig = {
  enabled: boolean;
  apiURL: string;
  categories: (
    | 'sponsor'
    | 'intro'
    | 'outro'
    | 'interaction'
    | 'selfpromo'
    | 'music_offtopic'
  )[];
};

let currentSegments: Segment[] = [];
let indicators: SponsorBlockIndicators | null = null;

export default createPlugin({
  name: () => t('plugins.sponsorblock.name'),
  description: () => t('plugins.sponsorblock.description'),
  restartNeeded: true,
  config: {
    enabled: false,
    apiURL: 'https://sponsor.ajay.app',
    categories: [
      'sponsor',
      'intro',
      'outro',
      'interaction',
      'selfpromo',
      'music_offtopic',
    ],
  } as SponsorBlockPluginConfig,
  async backend({ getConfig, ipc }) {
    const fetchSegments = async (
      apiURL: string,
      categories: string[],
      videoId: string,
    ) => {
      const sponsorBlockURL = `${apiURL}/api/skipSegments?videoID=${videoId}&categories=${JSON.stringify(
        categories,
      )}`;
      try {
        const resp = await fetch(sponsorBlockURL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          redirect: 'follow',
        });
        if (resp.status !== 200) {
          return { segments: [], segmentsWithCategory: [] };
        }

        const skipSegments = (await resp.json()) as SkipSegment[];

        // Extract segments for skipping (merged/overlapping)
        const segments = sortSegments(
          skipSegments.map((submission) => submission.segment),
        );

        // Extract segments with category for visual indicators (not merged)
        const segmentsWithCategory = sortSegmentsWithCategory(
          skipSegments.map((submission) => ({
            segment: submission.segment,
            category: submission.category,
          })),
        );

        return { segments, segmentsWithCategory };
      } catch (error) {
        if (is.dev()) {
          console.log('error on sponsorblock request:', error);
        }

        return { segments: [], segmentsWithCategory: [] };
      }
    };

    const config = await getConfig();

    const { apiURL, categories } = config;

    ipc.on('peard:video-src-changed', async (data: GetPlayerResponse) => {
      const { segments, segmentsWithCategory } = await fetchSegments(
        apiURL,
        categories,
        data?.videoDetails?.videoId,
      );
      ipc.send('sponsorblock-skip', segments);
      ipc.send('sponsorblock-segments', segmentsWithCategory);
    });
  },
  renderer: {
    timeUpdateListener: (e: Event) => {
      if (e.target instanceof HTMLVideoElement) {
        const target = e.target;

        for (const segment of currentSegments) {
          if (
            target.currentTime >= segment[0] &&
            target.currentTime < segment[1]
          ) {
            target.currentTime = segment[1];
            if (window.electronIs.dev()) {
              console.log('SponsorBlock: skipping segment', segment);
            }
          }
        }
      }
    },
    resetSegments: () => {
      currentSegments = [];
    },
    start({ ipc }) {
      ipc.on('sponsorblock-skip', (_event: unknown, segments: Segment[]) => {
        currentSegments = segments;
      });
      ipc.on(
        'sponsorblock-segments',
        (_event: unknown, segments: SegmentWithCategory[]) => {
          currentSegmentsWithCategory = segments;
          // Trigger visual indicator update
          const event = new CustomEvent('sponsorblock-segments-updated', {
            detail: segments,
          });
          document.dispatchEvent(event);
        },
      );

      // Initialize visual indicators
      indicators = new SponsorBlockIndicators();
    },
    onPlayerApiReady() {
      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) return;

      video.addEventListener('timeupdate', this.timeUpdateListener);
      // Reset segments on song end
      video.addEventListener('emptied', this.resetSegments);
    },
    stop() {
      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) return;

      video.removeEventListener('timeupdate', this.timeUpdateListener);
      video.removeEventListener('emptied', this.resetSegments);

      // Cleanup indicators
      if (indicators) {
        indicators.destroy();
        indicators = null;
      }
    },
  },
});
