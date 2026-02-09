/**
 * @file Browser adapters for clipboard and file downloads used by GitHub tools UI.
 */

import { copyToClipboard } from '@/core/data/services/clipboardService.js';
import { downloadJson, downloadText } from '@/core/data/services/downloadService.js';

export { copyToClipboard, downloadJson, downloadText };
