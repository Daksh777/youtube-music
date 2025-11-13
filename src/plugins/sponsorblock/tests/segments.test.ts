import { test, expect } from '@playwright/test';

import { sortSegments, sortSegmentsWithCategory } from '../segments';

test('Segment sorting', () => {
  expect(
    sortSegments([
      [0, 3],
      [7, 8],
      [5, 6],
    ]),
  ).toEqual([
    [0, 3],
    [5, 6],
    [7, 8],
  ]);

  expect(
    sortSegments([
      [0, 5],
      [6, 8],
      [4, 6],
    ]),
  ).toEqual([[0, 8]]);

  expect(
    sortSegments([
      [0, 6],
      [7, 8],
      [4, 6],
    ]),
  ).toEqual([
    [0, 6],
    [7, 8],
  ]);
});

test('Segment sorting with category', () => {
  expect(
    sortSegmentsWithCategory([
      { segment: [0, 3], category: 'sponsor' },
      { segment: [7, 8], category: 'intro' },
      { segment: [5, 6], category: 'outro' },
    ]),
  ).toEqual([
    { segment: [0, 3], category: 'sponsor' },
    { segment: [5, 6], category: 'outro' },
    { segment: [7, 8], category: 'intro' },
  ]);

  // Test overlapping segments - should not merge
  expect(
    sortSegmentsWithCategory([
      { segment: [0, 5], category: 'sponsor' },
      { segment: [4, 6], category: 'intro' },
      { segment: [6, 8], category: 'outro' },
    ]),
  ).toEqual([
    { segment: [0, 5], category: 'sponsor' },
    { segment: [4, 6], category: 'intro' },
    { segment: [6, 8], category: 'outro' },
  ]);
});
