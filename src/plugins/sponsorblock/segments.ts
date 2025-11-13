// Segments are an array [ [start, end], … ]
import type { Segment, SegmentWithCategory } from './types';

export const sortSegments = (segments: Segment[]) => {
  segments.sort((segment1, segment2) =>
    segment1[0] === segment2[0]
      ? segment1[1] - segment2[1]
      : segment1[0] - segment2[0],
  );

  const compiledSegments: Segment[] = [];
  let currentSegment: Segment | undefined;

  for (const segment of segments) {
    if (!currentSegment) {
      currentSegment = segment;
      continue;
    }

    if (currentSegment[1] < segment[0]) {
      compiledSegments.push(currentSegment);
      currentSegment = segment;
      continue;
    }

    currentSegment[1] = Math.max(currentSegment[1], segment[1]);
  }

  if (currentSegment) {
    compiledSegments.push(currentSegment);
  }

  return compiledSegments;
};

export const sortSegmentsWithCategory = (
  segments: SegmentWithCategory[],
): SegmentWithCategory[] => {
  // Sort segments by start time, but don't merge overlapping segments
  // since we want to preserve category information for visual indicators
  return segments.sort((a, b) =>
    a.segment[0] === b.segment[0]
      ? a.segment[1] - b.segment[1]
      : a.segment[0] - b.segment[0],
  );
};
