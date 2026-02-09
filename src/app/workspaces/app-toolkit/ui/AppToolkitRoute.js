import { RouterRoutes } from '@/core/ui/router/routes.js';
import {
  mountAppToolkitRoute,
  unmountAppToolkitRoute,
} from './controllers/appToolkitWorkspaceController.js';

/**
 * @file Route registration entrypoint for the App Toolkit workspace feature.
 *
 * Change Rationale: The previous route file mixed route registration with a multi-thousand-line
 * workspace controller implementation. Keeping route ownership in this thin module and delegating
 * UI orchestration to dedicated controllers improves feature scanability and preserves the
 * data/domain/ui boundary contract.
 */

/**
 * Registers App Toolkit route lifecycle through RouterRoutes.
 *
 * @returns {void}
 */
export function registerAppToolkitRoute() {
  const existing = RouterRoutes.getRoute('app-toolkit-api');
  if (!existing) {
    return;
  }

  RouterRoutes.registerRoute({
    ...existing,
    onLoad: mountAppToolkitRoute,
    onUnload: unmountAppToolkitRoute,
  });
}

registerAppToolkitRoute();
