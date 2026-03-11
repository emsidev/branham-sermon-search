export type SermonFilenameMetadata = {
  sermonCode: string;
  title: string;
  date: string;
  year: number;
  month: number;
  day: number;
};

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function normalizeTitle(rawTitle: string): string {
  return rawTitle
    .replace(/(?:[\s_-]+)VGR$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSermonMetadataFromFilenameStem(filenameStem: string): SermonFilenameMetadata {
  const normalizedStem = filenameStem.replace(/\s+/g, ' ').trim();
  const match = normalizedStem.match(/^(\d{2})-(\d{2})(\d{2})(?:[\s_-]+(.+))?$/);

  if (!match) {
    throw new Error(
      `Could not derive sermon metadata from filename "${filenameStem}". Expected format: YY-MMDD Title [VGR]`
    );
  }

  const [, yearTwoDigits, monthPart, dayPart, rawTitle = ''] = match;
  const year = Number.parseInt(`19${yearTwoDigits}`, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  const title = normalizeTitle(rawTitle);

  if (!title) {
    throw new Error(
      `Could not derive sermon title from filename "${filenameStem}". Include title after the sermon code.`
    );
  }

  if (!isValidDate(year, month, day)) {
    throw new Error(
      `Invalid sermon date in filename "${filenameStem}". Derived date "19${yearTwoDigits}-${padTwo(month)}-${padTwo(day)}" is not valid.`
    );
  }

  return {
    sermonCode: `${yearTwoDigits}-${monthPart}${dayPart}`,
    title,
    date: `${year}-${padTwo(month)}-${padTwo(day)}`,
    year,
    month,
    day,
  };
}
