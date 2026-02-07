/**
 * @file Resume route registration.
 */

import { RouterRoutes } from '@/core/ui/router/routes.js';
import resumeScreenTemplate from './ResumeScreen.html?raw';
import { initResumePage } from './ResumeScreen.js';

/**
 * Registers the resume route so hash navigation can render the resume builder.
 *
 * @returns {void}
 */
export function registerResumeRoute() {
  if (RouterRoutes.hasRoute('resume')) {
    return;
  }

  RouterRoutes.registerRoute({
    id: 'resume',
    title: 'Resume Builder',
    inlineHtml: resumeScreenTemplate,
    onLoad: initResumePage,
    metadata: {
      description: 'Build and print a personal resume using a live Material-style preview.',
      keywords: ['resume', 'cv builder', 'print resume'],
      canonicalSlug: 'resume',
      openGraph: {
        title: 'Resume Builder',
        description: 'Build and print a personal resume using a live Material-style preview.',
        type: 'website',
      },
      twitter: {
        title: 'Resume Builder',
        description: 'Build and print a personal resume using a live Material-style preview.',
      },
    },
  });
}

registerResumeRoute();
