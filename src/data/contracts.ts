export interface SermonRecord {
  id: string;
  sermon_code: string;
  title: string;
  summary: string | null;
  date: string;
  year: number | null;
  location: string | null;
  city: string | null;
  state: string | null;
  scripture: string | null;
  tags: string[];
  text_content: string;
  created_at: string;
  updated_at: string;
}

export interface SearchHitRecord {
  hit_id: string;
  sermon_id: string;
  sermon_code: string;
  title: string;
  summary: string | null;
  date: string;
  location: string | null;
  tags: string[];
  paragraph_number: number | null;
  printed_paragraph_number: number | null;
  chunk_index: number | null;
  chunk_total: number | null;
  match_source: string;
  is_exact_match: boolean;
  snippet: string;
  relevance: number;
  total_count: number;
}

export interface SermonParagraphRecord {
  paragraph_number: number;
  printed_paragraph_number: number | null;
  paragraph_text: string;
}

export interface SermonDetailRecord extends SermonRecord {
  pdf_source_path: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  paragraphs: SermonParagraphRecord[];
}

export interface AdjacentSermonRecord {
  id: string;
  title: string;
  date: string;
}

export interface SearchMeta {
  years: number[];
  titles: string[];
  locations: string[];
}

export interface ListSermonsParams {
  year: number | null;
  title: string | null;
  location: string | null;
  limit: number;
  offset: number;
  sort: 'relevance-desc' | 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
}

export interface SearchSermonsParams extends ListSermonsParams {
  query: string;
  matchCase: boolean;
  wholeWord: boolean;
  fuzzy: boolean;
}

export interface SearchSuggestionsParams {
  query: string;
  maxSuggestions?: number;
}

export interface ShortcutBindingRow {
  action: string;
  key: string;
  updated_at: string;
}

export interface DataPort {
  getSearchMeta(): Promise<SearchMeta>;
  listSermons(params: ListSermonsParams): Promise<{ rows: SermonRecord[]; total: number }>;
  searchSermonHits(params: SearchSermonsParams): Promise<SearchHitRecord[]>;
  getSearchSuggestions(params: SearchSuggestionsParams): Promise<string[]>;
  getSermonDetail(id: string): Promise<SermonDetailRecord | null>;
  getAdjacentSermons(date: string): Promise<{ prev: AdjacentSermonRecord | null; next: AdjacentSermonRecord | null }>;
  getBoundarySermons(): Promise<{ first: AdjacentSermonRecord | null; last: AdjacentSermonRecord | null }>;
  getShortcutBindings(): Promise<ShortcutBindingRow[]>;
  saveShortcutBindings(bindings: ShortcutBindingRow[]): Promise<void>;
}

export type { BootstrapPhase, BootstrapStatus } from '@/data/desktopBootstrap';
