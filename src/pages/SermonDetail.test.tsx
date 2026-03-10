import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SermonDetail from './SermonDetail';

const fetchSermonByIdMock = vi.fn();
const fetchAdjacentSermonsMock = vi.fn();

vi.mock('@/hooks/useSermons', () => ({
  fetchSermonById: (...args: unknown[]) => fetchSermonByIdMock(...args),
  fetchAdjacentSermons: (...args: unknown[]) => fetchAdjacentSermonsMock(...args),
}));

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ play: vi.fn() }),
}));

vi.mock('@/components/SermonBreadcrumb', () => ({
  default: () => <div data-testid="breadcrumb" />,
}));

vi.mock('@/components/MetadataCard', () => ({
  default: () => <div data-testid="metadata-card" />,
}));

const sermonDetailFixture = {
  id: 'sermon-1',
  sermon_code: '65-1010',
  title: 'Leadership',
  date: '1965-10-10',
  year: 1965,
  location: 'Jeffersonville, IN',
  city: null,
  state: null,
  scripture: null,
  tags: [],
  text_content: 'First I am looking forward to this week. Later i am looking forward to that.',
  fts: null,
  created_at: '2026-03-09T00:00:00.000Z',
  updated_at: '2026-03-09T00:00:00.000Z',
  pdf_source_path: null,
  audio_url: null,
  duration_seconds: null,
  paragraphs: [
    {
      paragraph_number: 4,
      printed_paragraph_number: 4,
      paragraph_text: 'First I am looking forward to this week. Later i am looking forward to that.',
    },
  ],
};

function renderDetail(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/sermons/:id" element={<SermonDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SermonDetail', () => {
  beforeEach(() => {
    fetchSermonByIdMock.mockReset();
    fetchAdjacentSermonsMock.mockReset();
    fetchSermonByIdMock.mockResolvedValue(sermonDetailFixture);
    fetchAdjacentSermonsMock.mockResolvedValue({ prev: null, next: null });

    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  it('scrolls to the selected chunk when hit id has :chunk suffix', async () => {
    const scrolledTexts: string[] = [];
    const scrollSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(function () {
        scrolledTexts.push((this as HTMLElement).textContent || '');
      });

    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward&source=paragraph_text&paragraph=4&hit=sermon-1:para:4:chunk:2');

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledTimes(1);
    });

    expect(scrolledTexts[0]).toBe('i am looking forward');
    scrollSpy.mockRestore();
  });

  it('defaults to first highlighted match when no chunk suffix is present', async () => {
    const scrolledTexts: string[] = [];
    const scrollSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(function () {
        scrolledTexts.push((this as HTMLElement).textContent || '');
      });

    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward&source=paragraph_text&paragraph=4&hit=sermon-1:para:4');

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledTimes(1);
    });

    expect(scrolledTexts[0]).toBe('I am looking forward');
    scrollSpy.mockRestore();
  });
});
