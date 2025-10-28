self.addEventListener('message', async (event) => {
  const { id, url } = event.data || {};
  if (typeof id === 'undefined' || !url) {
    return;
  }
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const payload = { id, status: 'success', width: bitmap.width, height: bitmap.height };
    bitmap.close();
    self.postMessage(payload);
  } catch (error) {
    self.postMessage({ id, status: 'error', error: error.message || 'Unable to load image.' });
  }
});
