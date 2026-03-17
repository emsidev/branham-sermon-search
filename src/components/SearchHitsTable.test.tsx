import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SearchHitsTable from './SearchHitsTable';
import type { SearchHit } from '@/hooks/useSermons';
import type { SearchMatchOptions } from '@/lib/search';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderTable(
  hits: SearchHit[],
  query: string,
  linkState?: unknown,
  matchOptions?: SearchMatchOptions,
) {
  return render(
    <MemoryRouter>
      <SearchHitsTable
        hits={hits}
        loading={false}
        selectedIndex={-1}
        query={query}
        matchOptions={matchOptions}
        linkState={linkState}
      />
    </MemoryRouter>
  );
}

describe('SearchHitsTable', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders hit rows with required fields', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-1:para:3:chunk:1',
        sermon_id: 'sermon-1',
        sermon_code: '54-0815',
        title: 'Questions And Answers',
        summary: null,
        date: '1954-08-15',
        location: 'Jeffersonville, IN',
        paragraph_number: 3,
        printed_paragraph_number: 4,
        chunk_index: 1,
        chunk_total: 3,
        match_source: 'paragraph_text',
        snippet: '... they be healed unless there is something hindering ...',
        relevance: 2.4,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'they be healed unless');

    expect(screen.getByText('54-0815')).toBeInTheDocument();
    const titleLink = screen.getByRole('link', { name: 'Questions And Answers' });
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('/sermons/sermon-1?'));
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('q=they+be+healed+unless'));
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('source=paragraph_text'));
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('paragraph=3'));
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('hit=sermon-1%3Apara%3A3%3Achunk%3A1'));
    expect(screen.getByText('Aug 15, 1954')).toBeInTheDocument();
    expect(screen.getByText('Jeffersonville, IN')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 3 [PDF 4]')).toBeInTheDocument();
  });

  it('includes active match options in hit links', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-case:para:2:chunk:1',
        sermon_id: 'sermon-case',
        sermon_code: '54-0815',
        title: 'Questions And Answers',
        summary: null,
        date: '1954-08-15',
        location: 'Jeffersonville, IN',
        paragraph_number: 2,
        printed_paragraph_number: 2,
        chunk_index: 1,
        chunk_total: 1,
        match_source: 'paragraph_text',
        snippet: 'Only Believe',
        relevance: 2.4,
        is_exact_match: true,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'Only Believe', undefined, { matchCase: true, wholeWord: true });

    const titleLink = screen.getByRole('link', { name: 'Questions And Answers' });
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('matchCase=1'));
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('wholeWord=1'));
  });

  it('includes fuzzy mode in hit links and omits strict flags', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-fuzzy:para:2:chunk:1',
        sermon_id: 'sermon-fuzzy',
        sermon_code: '54-0815',
        title: 'Questions And Answers',
        summary: null,
        date: '1954-08-15',
        location: 'Jeffersonville, IN',
        paragraph_number: 2,
        printed_paragraph_number: 2,
        chunk_index: 1,
        chunk_total: 1,
        match_source: 'paragraph_text',
        snippet: 'Only Believ',
        relevance: 2.4,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'Only Believ', undefined, { fuzzy: true, matchCase: true, wholeWord: true });

    const titleLink = screen.getByRole('link', { name: 'Questions And Answers' });
    expect(titleLink).toHaveAttribute('href', expect.stringContaining('fuzzy=1'));
    expect(titleLink.getAttribute('href')).not.toContain('matchCase=1');
  });

  it('highlights fallback-style incomplete term like "unle"', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-2:para:6:chunk:1',
        sermon_id: 'sermon-2',
        sermon_code: '63-0901E',
        title: 'Desperation',
        summary: null,
        date: '1963-09-01',
        location: 'Jeffersonville, IN',
        paragraph_number: 6,
        printed_paragraph_number: 7,
        chunk_index: 1,
        chunk_total: 2,
        match_source: 'paragraph_text',
        snippet: '... and they be healed unless they stand in unbelief ...',
        relevance: 1.8,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'they be healed unle');

    const marks = screen.getAllByText(/unle/i, { selector: 'mark' });
    expect(marks.length).toBeGreaterThan(0);
  });

  it('highlights a contiguous multi-word phrase as one match', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-phrase:para:4:chunk:1',
        sermon_id: 'sermon-phrase',
        sermon_code: '65-1010',
        title: 'Leadership',
        summary: null,
        date: '1965-10-10',
        location: 'Jeffersonville, IN',
        paragraph_number: 4,
        printed_paragraph_number: 4,
        chunk_index: 1,
        chunk_total: 1,
        match_source: 'paragraph_text',
        snippet: '... Amen. I am looking forward to this week and this campaign is opening ...',
        relevance: 2.0,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'i am looking forward');

    expect(screen.getByText(/i am looking forward/i, { selector: 'mark' })).toBeInTheDocument();
    expect(screen.queryByText(/^i$/i, { selector: 'mark' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^am$/i, { selector: 'mark' })).not.toBeInTheDocument();
  });

  it('falls back to token highlighting when phrase is not contiguous', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-fallback:para:8:chunk:1',
        sermon_id: 'sermon-fallback',
        sermon_code: '63-1110',
        title: 'Souls That Are In Prison',
        summary: null,
        date: '1963-11-10',
        location: 'Jeffersonville, IN',
        paragraph_number: 8,
        printed_paragraph_number: 8,
        chunk_index: 1,
        chunk_total: 2,
        match_source: 'paragraph_text',
        snippet: '... I am really looking very far forward to this week ...',
        relevance: 1.7,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'i am looking forward');

    expect(screen.getByText(/^am$/i, { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText(/^looking$/i, { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText(/^forward$/i, { selector: 'mark' })).toBeInTheDocument();
    expect(screen.queryByText(/^i$/i, { selector: 'mark' })).not.toBeInTheDocument();
  });

  it('renders paragraph labels for duplicate matches in one paragraph', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-dup:para:4:chunk:1',
        sermon_id: 'sermon-dup',
        sermon_code: '65-1010',
        title: 'Leadership',
        summary: null,
        date: '1965-10-10',
        location: 'Jeffersonville, IN',
        paragraph_number: 4,
        printed_paragraph_number: 4,
        chunk_index: 1,
        chunk_total: 2,
        match_source: 'paragraph_text',
        snippet: '... I am looking forward to this week ...',
        relevance: 2.4,
        is_exact_match: false,
        tags: [],
        total_count: 2,
      },
      {
        hit_id: 'sermon-dup:para:4:chunk:2',
        sermon_id: 'sermon-dup',
        sermon_code: '65-1010',
        title: 'Leadership',
        summary: null,
        date: '1965-10-10',
        location: 'Jeffersonville, IN',
        paragraph_number: 4,
        printed_paragraph_number: 4,
        chunk_index: 2,
        chunk_total: 2,
        match_source: 'paragraph_text',
        snippet: '... I am looking forward to that ...',
        relevance: 2.3,
        is_exact_match: false,
        tags: [],
        total_count: 2,
      },
    ];

    renderTable(hits, 'i am looking forward');

    expect(screen.getAllByText('Paragraph 4')).toHaveLength(2);
  });

  it('highlights complete phrase term like "unless"', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-3:meta:title',
        sermon_id: 'sermon-3',
        sermon_code: '60-0101',
        title: 'Unless A Man Be Born Again',
        summary: null,
        date: '1960-01-01',
        location: 'Phoenix, AZ',
        paragraph_number: null,
        printed_paragraph_number: null,
        chunk_index: null,
        chunk_total: null,
        match_source: 'title',
        snippet: 'Unless A Man Be Born Again',
        relevance: 2.1,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'they be healed unless');

    expect(screen.getByText(/unless/i, { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText('Title', { selector: 'td' })).toBeInTheDocument();
  });

  it('highlights apostrophe variants for punctuation-insensitive queries', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-4:para:10:chunk:1',
        sermon_id: 'sermon-4',
        sermon_code: '58-0105',
        title: 'Have Faith In God',
        summary: null,
        date: '1958-01-05',
        location: 'Jeffersonville, IN',
        paragraph_number: 10,
        printed_paragraph_number: 10,
        chunk_index: 1,
        chunk_total: 1,
        match_source: 'paragraph_text',
        snippet: '... but she’s had an experience and she’d had a testimony ...',
        relevance: 2.6,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'shes shed');

    expect(screen.getByText('she’s', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText('she’d', { selector: 'mark' })).toBeInTheDocument();
  });

  it('does not render exact badges for exact match hits', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-exact:meta:title',
        sermon_id: 'sermon-exact',
        sermon_code: '61-0428',
        title: 'Only Believe',
        summary: null,
        date: '1961-04-28',
        location: 'Phoenix, AZ',
        paragraph_number: null,
        printed_paragraph_number: null,
        chunk_index: null,
        chunk_total: null,
        match_source: 'title',
        snippet: 'Only Believe',
        relevance: 3.1,
        is_exact_match: true,
        tags: [],
        total_count: 1,
      },
    ];

    renderTable(hits, 'only believe');

    expect(screen.queryByText('exact')).not.toBeInTheDocument();
  });

  it('navigates row selection with preserved search return state', () => {
    const hits: SearchHit[] = [
      {
        hit_id: 'sermon-state:para:3:chunk:1',
        sermon_id: 'sermon-state',
        sermon_code: '61-0428',
        title: 'Only Believe',
        summary: null,
        date: '1961-04-28',
        location: 'Phoenix, AZ',
        paragraph_number: 3,
        printed_paragraph_number: 3,
        chunk_index: 1,
        chunk_total: 2,
        match_source: 'paragraph_text',
        snippet: '... only believe ...',
        relevance: 2.3,
        is_exact_match: false,
        tags: [],
        total_count: 1,
      },
    ];
    const linkState = { searchReturnTo: '/search?q=only+believe&sort=date-desc&page=3&view=table' };
    renderTable(hits, 'only believe', linkState);

    const row = document.querySelector('tr[role="link"]');
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('/sermons/sermon-state?'),
      { state: linkState },
    );
  });
});

