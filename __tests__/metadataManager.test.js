const path = require('path');

describe('SiteMetadata.updateForRoute', () => {
  const modulePath = path.resolve(__dirname, '../assets/js/metadataManager.js');

  beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    delete global.SiteMetadata;
    require(modulePath);
  });

  test('applies provided route metadata to document head', () => {
    const route = {
      id: 'projects',
      title: 'Projects',
      metadata: {
        description: 'Detailed showcase of current Android and web experiments.',
        keywords: ['android case study', 'jetpack compose ui'],
        canonicalSlug: 'projects',
        openGraph: {
          title: 'Projects | Showcase',
          description: 'Detailed showcase of current Android and web experiments.',
          type: 'article',
          image: 'https://example.com/og-image.png',
          imageAlt: 'Preview of featured projects'
        },
        twitter: {
          card: 'summary',
          title: 'Projects on Display',
          description: 'Detailed showcase of current Android and web experiments.',
          image: 'https://example.com/twitter-image.png',
          site: '@ExampleSite',
          creator: '@ExampleCreator'
        }
      }
    };

    const result = global.SiteMetadata.updateForRoute(route, { pageTitle: 'Projects', pageId: 'projects' });

    expect(result.canonicalUrl).toBe('https://mihaicristiancondrea.github.io/profile/#projects');
    expect(document.querySelector('meta[name="description"]').getAttribute('content'))
      .toBe('Detailed showcase of current Android and web experiments.');
    expect(document.querySelector('meta[name="keywords"]').getAttribute('content'))
      .toBe('android case study, jetpack compose ui');
    expect(document.querySelector('meta[property="og:title"]').getAttribute('content'))
      .toBe('Projects | Showcase');
    expect(document.querySelector('meta[property="og:type"]').getAttribute('content'))
      .toBe('article');
    expect(document.querySelector('meta[property="og:image"]').getAttribute('content'))
      .toBe('https://example.com/og-image.png');
    expect(document.querySelector('meta[property="og:image:alt"]').getAttribute('content'))
      .toBe('Preview of featured projects');
    expect(document.querySelector('meta[name="twitter:card"]').getAttribute('content'))
      .toBe('summary');
    expect(document.querySelector('meta[name="twitter:title"]').getAttribute('content'))
      .toBe('Projects on Display');
    expect(document.querySelector('meta[name="twitter:image"]').getAttribute('content'))
      .toBe('https://example.com/twitter-image.png');
    expect(document.querySelector('meta[name="twitter:site"]').getAttribute('content'))
      .toBe('@ExampleSite');
    expect(document.querySelector('meta[name="twitter:creator"]').getAttribute('content'))
      .toBe('@ExampleCreator');
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href'))
      .toBe('https://mihaicristiancondrea.github.io/profile/#projects');
  });

  test('falls back to defaults when metadata is missing', () => {
    const route = { id: 'unknown-page', title: 'Unknown Page' };

    const result = global.SiteMetadata.updateForRoute(route, {});

    expect(result.canonicalUrl).toBe('https://mihaicristiancondrea.github.io/profile/#unknown-page');
    expect(document.querySelector('meta[property="og:title"]').getAttribute('content'))
      .toBe('Unknown Page');
    expect(document.querySelector('meta[name="description"]').getAttribute('content'))
      .toContain('Mihai-Cristian Condrea');
    expect(document.querySelector('meta[name="keywords"]').getAttribute('content'))
      .toContain('Android developer');
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href'))
      .toBe('https://mihaicristiancondrea.github.io/profile/#unknown-page');
  });
});
