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
    expect(parsed.datePrecision).toBe('day');
    expect(parsed.serviceSuffix).toBeNull();
    expect(parsed.title).toBe('Faith Is The Substance');
  });

  it('handles extra separators and underscores in title', () => {
    const parsed = parseSermonMetadataFromFilenameStem('47-0412___Faith_Is_The_Substance___VGR');

    expect(parsed.sermonCode).toBe('47-0412');
    expect(parsed.date).toBe('1947-04-12');
    expect(parsed.title).toBe('Faith Is The Substance');
  });

  it('preserves service suffix letters in the sermon code', () => {
    const parsed = parseSermonMetadataFromFilenameStem('65-0221M Marriage And Divorce VGR');

    expect(parsed.sermonCode).toBe('65-0221M');
    expect(parsed.date).toBe('1965-02-21');
    expect(parsed.datePrecision).toBe('day');
    expect(parsed.serviceSuffix).toBe('M');
  });

  it('supports month precision dates with unknown day', () => {
    const parsed = parseSermonMetadataFromFilenameStem('54-0900 Have Faith In God VGR');

    expect(parsed.sermonCode).toBe('54-0900');
    expect(parsed.date).toBe('1954-09-00');
    expect(parsed.year).toBe(1954);
    expect(parsed.month).toBe(9);
    expect(parsed.day).toBeNull();
    expect(parsed.datePrecision).toBe('month');
  });

  it('supports year precision dates with unknown month and day', () => {
    const parsed = parseSermonMetadataFromFilenameStem('48-0000 Prayer Line VGR');

    expect(parsed.sermonCode).toBe('48-0000');
    expect(parsed.date).toBe('1948-00-00');
    expect(parsed.year).toBe(1948);
    expect(parsed.month).toBeNull();
    expect(parsed.day).toBeNull();
    expect(parsed.datePrecision).toBe('year');
  });

  it('rejects missing sermon code pattern', () => {
    expect(() =>
      parseSermonMetadataFromFilenameStem('Faith Is The Substance VGR')
    ).toThrow('Expected format: YY-MMDD[Suffix] Title [VGR]');
  });

  it('rejects invalid month/day values', () => {
    expect(() =>
      parseSermonMetadataFromFilenameStem('47-1332 Faith Is The Substance VGR')
    ).toThrow('is not valid');
  });

  it('rejects unknown month with a concrete day', () => {
    expect(() =>
      parseSermonMetadataFromFilenameStem('47-0012 Faith Is The Substance VGR')
    ).toThrow('is not valid');
  });
});
