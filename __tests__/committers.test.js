const path = require('path');

describe('committers helpers', () => {
  beforeAll(() => {
    jest.resetModules();
    // Load the committers script so it attaches helpers to the JSDOM window.
    require(path.join('..', 'assets', 'js', 'committers.js'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('formatOrdinal', () => {
    test('formats standard ordinal numbers', () => {
      expect(window.formatOrdinal(1)).toBe('1st');
      expect(window.formatOrdinal(2)).toBe('2nd');
      expect(window.formatOrdinal(3)).toBe('3rd');
      expect(window.formatOrdinal(4)).toBe('4th');
    });

    test('handles teen suffix rules', () => {
      expect(window.formatOrdinal(11)).toBe('11th');
      expect(window.formatOrdinal(12)).toBe('12th');
      expect(window.formatOrdinal(13)).toBe('13th');
    });

    test('supports negative and non-numeric edge cases', () => {
      expect(window.formatOrdinal(-21)).toBe('-21st');
      expect(window.formatOrdinal(Number.NaN)).toBe('NaN');
      expect(window.formatOrdinal('not-a-number')).toBe('not-a-number');
    });
  });

  describe('formatDataAsOf', () => {
    test('parses committers timestamps', () => {
      const toLocaleSpy = jest
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('Formatted Timestamp');

      const result = window.formatDataAsOf('2024-02-20 12:34:56 +0300');

      expect(toLocaleSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe('Formatted Timestamp');
    });

    test('falls back to native Date parsing when needed', () => {
      const toLocaleSpy = jest
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('Fallback Parsed Date');

      const result = window.formatDataAsOf('Tue, 01 Jan 2025 12:00:00 GMT');

      expect(toLocaleSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe('Fallback Parsed Date');
    });

    test('returns trimmed string when parsing fails', () => {
      expect(window.formatDataAsOf('  not a date  ')).toBe('not a date');
    });

    test('returns null for empty or non-string values', () => {
      expect(window.formatDataAsOf('   ')).toBeNull();
      expect(window.formatDataAsOf(null)).toBeNull();
      expect(window.formatDataAsOf(42)).toBeNull();
    });
  });

  describe('fetchCommittersRanking', () => {
    let dynamicElementMock;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="committers-rank"></div>
        <div id="committers-status" class="status"></div>
        <div id="committers-updated"></div>
      `;

      dynamicElementMock = jest.fn((id) => document.getElementById(id));
      global.getDynamicElement = dynamicElementMock;
      window.getDynamicElement = dynamicElementMock;

      global.fetch = jest.fn();
      window.fetch = global.fetch;
    });

    afterEach(() => {
      document.body.innerHTML = '';
      delete global.getDynamicElement;
      delete window.getDynamicElement;
      delete global.fetch;
      delete window.fetch;
      jest.clearAllMocks();
    });

    test('updates DOM on successful fetch', async () => {
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('Formatted Timestamp');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          user: ['Someone Else', 'MihaiCristianCondrea', 'Another Person'],
          data_asof: '2024-02-20 12:34:56 +0300'
        })
      });

      await window.fetchCommittersRanking();

      expect(global.fetch).toHaveBeenCalledWith('https://committers.top/rank_only/romania.json', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      expect(dynamicElementMock).toHaveBeenCalledWith('committers-rank');
      expect(dynamicElementMock).toHaveBeenCalledWith('committers-status');
      expect(dynamicElementMock).toHaveBeenCalledWith('committers-updated');

      expect(document.getElementById('committers-rank').textContent).toBe('#2');
      const statusElement = document.getElementById('committers-status');
      expect(statusElement.textContent).toBe(
        "Mihai-Cristian Condrea is currently 2nd in Romania's GitHub committers leaderboard."
      );
      expect(statusElement.classList.contains('error')).toBe(false);
      expect(document.getElementById('committers-updated').textContent).toBe('Last updated: Formatted Timestamp');
    });

    test('shows missing user message when profile is absent', async () => {
      const toLocaleSpy = jest
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('Should not be used');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          user: ['Someone Else'],
          data_asof: '2024-02-20 12:34:56 +0300'
        })
      });

      await window.fetchCommittersRanking();

      expect(document.getElementById('committers-rank').textContent).toBe('—');
      const statusElement = document.getElementById('committers-status');
      expect(statusElement.textContent).toBe('Mihai-Cristian Condrea is not listed in the current ranking.');
      expect(statusElement.classList.contains('error')).toBe(true);
      expect(document.getElementById('committers-updated').textContent).toBe('Last updated: —');
      expect(toLocaleSpy).not.toHaveBeenCalled();
    });

    test('logs and displays error state when fetch fails', async () => {
      const error = new Error('Network down');
      global.fetch.mockRejectedValueOnce(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await window.fetchCommittersRanking();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Committers ranking error:', error);
      const statusElement = document.getElementById('committers-status');
      expect(statusElement.textContent).toBe('Ranking data is unavailable right now. Please try again later.');
      expect(statusElement.classList.contains('error')).toBe(true);
      expect(document.getElementById('committers-updated').textContent).toBe('Last updated: —');
      expect(document.getElementById('committers-rank').textContent).toBe('—');
    });
  });
});
