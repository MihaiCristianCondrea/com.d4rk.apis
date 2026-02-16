/**
 * @file Feature-first entrypoint for the FAQ workspace route.
 */

// Change Rationale: FAQ routes now register with composed Screen markup from the feature UI layer,
// matching the GitHub tools Screen + Views contract and keeping routing free of workspace-specific
// layout paths while preserving Material 3 surface structure.
import { RouterRoutes } from '@/core/ui/router/routes.js';
import { renderWorkspaceInsightCards } from '@/widgets/workspace-dashboard/workspace-insight-card.js';
import faqScreenTemplate from './ui/faq.page.html?raw';

/**
 * Builds the FAQ workspace screen markup.
 *
 * @returns {string} Composed FAQ screen HTML.
 */
function buildFaqScreenHtml() {
  // Change Rationale: During Jest compatibility mapping, raw HTML imports can be stubbed.
  // Providing a tiny fallback keeps route registration deterministic while preserving production markup.
  return faqScreenTemplate || '<section id="faqPage"></section>';
}

/**
 * Initializes the FAQ workspace UI after the screen mounts.
 *
 * @returns {void}
 */
function initFaqWorkspace() {
  renderWorkspaceInsightCards();
}

/**
 * Registers the FAQ workspace route with the core router.
 *
 * @returns {void}
 */
export function registerFaqRoute() {
  if (RouterRoutes.hasRoute('faq-api')) {
    return;
  }

  RouterRoutes.registerRoute({
    id: 'faq-api',
    title: 'FAQ API',
    inlineHtml: buildFaqScreenHtml(),
    onLoad: initFaqWorkspace,
    metadata: {
      description:
        'Publish structured FAQ answers with featured snippets and Material icon suggestions for web and Android surfaces.',
      keywords: ['FAQ API builder', 'Material Symbols autocomplete', 'support answers JSON'],
      canonicalSlug: 'faq-api',
      openGraph: {
        title: 'FAQ API workspace',
        description:
          'Publish structured FAQ answers with featured snippets and Material icon suggestions for web and Android surfaces.',
        type: 'website',
      },
      twitter: {
        title: 'FAQ API workspace',
        description:
          'Publish structured FAQ answers with featured snippets and Material icon suggestions for web and Android surfaces.',
      },
    },
  });
}

registerFaqRoute();

export { initFaqWorkspace };
