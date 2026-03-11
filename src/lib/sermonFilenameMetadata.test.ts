import { describe, expect, it } from 'vitest';
import { parseSermonMetadataFromFilenameStem } from './sermonFilenameMetadata';

describe('parseSermonMetadataFromFilenameStem', () => {
  it('derives sermon code, date, and title from filename stem', () => {
    const parsed = parseSermonMetadataFromFilenameStem('47-0412 Faith Is The Substance VGR');

    expect(parsed.sermonCode).toBe('47-0412');
    expect(parsed.date).toBe('1947-04-12');
    expect(parsed.year).toBe(1947);
    expect(parsed.month).toBe(4);
    expect(parsed.day).toBe(12);
    expect(parsed.title).toBe('Faith Is The Substance');
  });

  it('handles extra separators and underscores in title', () => {
    const parsed = parseSermonMetadataFromFilenameStem('47-0412___Faith_Is_The_Substance___VGR');

    expect(parsed.sermonCode).toBe('47-0412');
    expect(parsed.date).toBe('1947-04-12');
    expect(parsed.title).toBe('Faith Is The Substance');
  });

  it('rejects missing sermon code pattern', () => {
    expect(() =>
      parseSermonMetadataFromFilenameStem('Faith Is The Substance VGR')
    ).toThrow('Expected format: YY-MMDD Title [VGR]');
  });

  it('rejects invalid month/day values', () => {
    expect(() =>
      parseSermonMetadataFromFilenameStem('47-1332 Faith Is The Substance VGR')
    ).toThrow('is not valid');
  });
});
