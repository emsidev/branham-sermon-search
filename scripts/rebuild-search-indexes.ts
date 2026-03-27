import { type DatabaseSync } from 'node:sqlite';
import { extractSearchTerms, termPrefix2 } from '../src/data/sqlite/searchIndex';

export function rebuildSearchFtsIndex(db: DatabaseSync): void {
  db.prepare("INSERT INTO search_documents_fts(search_documents_fts) VALUES('rebuild')").run();
}

export function rebuildSearchTermsIndex(db: DatabaseSync): void {
  db.exec('DELETE FROM search_terms');

  const documentFrequencyByTerm = new Map<string, number>();
  const iterator = db
    .prepare('SELECT normalized_text FROM search_documents')
    .iterate() as Iterable<{ normalized_text: string | null }>;

  for (const row of iterator) {
    const uniqueTerms = new Set(extractSearchTerms(row.normalized_text ?? '').filter((term) => term.length >= 2));
    for (const term of uniqueTerms) {
      documentFrequencyByTerm.set(term, (documentFrequencyByTerm.get(term) ?? 0) + 1);
    }
  }

  const statement = db.prepare(`
    INSERT INTO search_terms(term, prefix2, length, doc_freq)
    VALUES (?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const [term, docFrequency] of [...documentFrequencyByTerm.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      statement.run(term, termPrefix2(term), term.length, docFrequency);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function rebuildSearchIndexes(db: DatabaseSync): void {
  rebuildSearchFtsIndex(db);
  rebuildSearchTermsIndex(db);
}
