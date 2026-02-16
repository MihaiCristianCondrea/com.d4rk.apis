import {
  fetchAppToolkitJson,
  requestGithubContents
} from '../../src/features/app-toolkit/data/services/app-toolkit-network-service.js';

describe('appToolkitNetworkService', () => {
  test('delegates remote JSON fetch to global fetch', async () => {
    const originalFetch = global.fetch;
    const response = { ok: true };
    global.fetch = jest.fn().mockResolvedValue(response);

    const result = await fetchAppToolkitJson('/api/test.json');
    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalledWith('/api/test.json', undefined);

    global.fetch = originalFetch;
  });

  test('delegates GitHub request to global fetch', async () => {
    const originalFetch = global.fetch;
    const response = { ok: false };
    global.fetch = jest.fn().mockResolvedValue(response);

    const result = await requestGithubContents('https://api.github.com/repos/a/b/contents/c', {
      method: 'GET',
      headers: { Authorization: 'token x' }
    });

    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    global.fetch = originalFetch;
  });
});
