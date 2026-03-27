import { describe, expect, it } from 'vitest';
import {
  buildCanonicalSermonText,
  chunkParagraphText,
  parseSermonParagraphsFromExtractedPages,
  parseSermonParagraphsFromExtractedText,
} from './sermonImport';

describe('sermon import utilities', () => {
  it('parses title and preserves normalized and printed paragraph numbers', () => {
    const sample = `FAITH IS THE SUBSTANCE
We're getting some new gadgets for recording.
2 We hardly know each night where we're going to be at. That's just, I think the, about the third move in the last four nights.
3 I trust that sometime when I come back again to Oakland, why, maybe we can get something like the auditorium here for a week or two.
4 Well, I would say this: We're just a night or two here.`;

    const parsed = parseSermonParagraphsFromExtractedText(sample);

    expect(parsed.title_from_pdf).toBe('FAITH IS THE SUBSTANCE');
    expect(parsed.paragraphs).toHaveLength(4);

    expect(parsed.paragraphs[0].paragraph_number).toBe(1);
    expect(parsed.paragraphs[0].printed_paragraph_number).toBeNull();
    expect(parsed.paragraphs[0].paragraph_text).toBe("We're getting some new gadgets for recording.");

    expect(parsed.paragraphs[1].paragraph_number).toBe(2);
    expect(parsed.paragraphs[1].printed_paragraph_number).toBe(2);

    expect(parsed.paragraphs[2].paragraph_number).toBe(3);
    expect(parsed.paragraphs[2].printed_paragraph_number).toBe(3);
  });

  it('chunks paragraph text with deterministic overlap', () => {
    const source = 'abcdefghijklmnopqrstuvwxyz'.repeat(25);
    const chunks = chunkParagraphText(source, 80, 20);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].chunk_start).toBe(0);
    expect(chunks[0].chunk_end).toBe(80);
    expect(chunks[1].chunk_start).toBe(60);
    expect(chunks[1].chunk_end).toBe(140);
    expect(chunks[1].chunk_text).toBe(source.slice(60, 140));
  });

  it('builds canonical text by joining paragraph content', () => {
    const text = buildCanonicalSermonText([
      {
        paragraph_number: 1,
        printed_paragraph_number: null,
        paragraph_text: 'First paragraph.',
      },
      {
        paragraph_number: 2,
        printed_paragraph_number: 2,
        paragraph_text: 'Second paragraph.',
      },
    ]);

    expect(text).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('parses extracted pages and strips alternating printed headers', () => {
    const parsed = parseSermonParagraphsFromExtractedPages([
      `Have Faith In God
1 Thank you, Brother Joseph.
2 Lord, it is good to be here tonight.`,
      `2 The Spoken Word
3 We are happy to be here.`,
      `Have Faith In God 3
4 Faith is a substance.`,
      `4
The Spoken Word
5 Another paragraph begins here.`,
      `Have Faith In God
5
6 Closing paragraph text.`,
    ]);

    expect(parsed.title_from_pdf).toBe('Have Faith In God');
    expect(parsed.paragraphs).toHaveLength(6);

    expect(parsed.paragraphs[0].printed_paragraph_number).toBe(1);
    expect(parsed.paragraphs[0].paragraph_text).toBe('Thank you, Brother Joseph.');

    expect(parsed.paragraphs[1].printed_paragraph_number).toBe(2);
    expect(parsed.paragraphs[2].printed_paragraph_number).toBe(3);
    expect(parsed.paragraphs[3].printed_paragraph_number).toBe(4);
    expect(parsed.paragraphs[4].printed_paragraph_number).toBe(5);
    expect(parsed.paragraphs[5].printed_paragraph_number).toBe(6);

    expect(parsed.paragraphs.map((paragraph) => paragraph.paragraph_text).join(' ')).not.toContain('The Spoken Word');
    expect(parsed.paragraphs.map((paragraph) => paragraph.paragraph_text).join(' ')).not.toContain('Have Faith In God 3');
  });

  it('treats the icon line as paragraph one and strips spaced title/header text', () => {
    const parsed = parseSermonParagraphsFromExtractedPages([
      `FA ITH IS THE SUBSTA N CE
\uF6E1 We’re getting some new gadgets for recording.
2 We’re hardly sure where we are each night.`,
      `2 THE SPOKEN WOR D
9 Now, we do not have much time.`,
      `FAITH IS THE SUBS TA NCE 3
18 And friends, I can only help you if you believe me.`,
    ]);

    expect(parsed.title_from_pdf).toBe('FA ITH IS THE SUBSTA N CE');
    expect(parsed.paragraphs[0]).toEqual({
      paragraph_number: 1,
      printed_paragraph_number: null,
      paragraph_text: 'We’re getting some new gadgets for recording.',
    });

    const combinedText = parsed.paragraphs.map((paragraph) => paragraph.paragraph_text).join(' ');
    expect(combinedText).not.toContain('FA ITH IS THE SUBSTA N CE');
    expect(combinedText).not.toContain('THE SPOKEN WOR D');
  });
});
