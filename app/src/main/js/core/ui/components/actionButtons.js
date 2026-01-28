/**
 * @file Action button helpers that enforce primary/secondary/tertiary roles.
 */

// Change Rationale: Centralize button role styling so UI code consistently applies
// filled/outlined/text treatments without ad-hoc class combinations.

/**
 * Builds a BeerCSS-styled action button element.
 *
 * @param {Object} options Configuration for the button.
 * @param {'primary'|'secondary'|'tertiary'} options.variant Button role variant.
 * @param {string} options.label Visible label text.
 * @param {string} [options.id] Optional id for the button.
 * @param {string} [options.type='button'] Button type attribute.
 * @param {string} [options.icon] Optional Material Symbol icon name.
 * @param {string[]} [options.classNames] Additional CSS classes.
 * @param {Record<string, string>} [options.attrs] Additional attributes to apply.
 * @returns {HTMLButtonElement} Configured button element.
 */
function buildActionButton({
  variant,
  label,
  id,
  type = 'button',
  icon,
  classNames = [],
  attrs = {},
}) {
  const button = document.createElement('button');
  button.type = type;

  const variantClasses = {
    primary: ['button', 'primary'],
    secondary: ['button', 'border'],
    tertiary: ['button', 'transparent'],
  };

  const classes = variantClasses[variant] || variantClasses.tertiary;
  button.classList.add(...classes, ...classNames);

  if (id) {
    button.id = id;
  }

  Object.entries(attrs).forEach(([key, value]) => {
    button.setAttribute(key, value);
  });

  if (icon) {
    button.innerHTML = `<i aria-hidden="true">${icon}</i><span>${label}</span>`;
  } else {
    button.textContent = label;
  }

  return button;
}

/**
 * Creates a primary (filled) action button.
 *
 * @param {Object} options Button configuration.
 * @returns {HTMLButtonElement} Primary action button.
 */
export function createPrimaryActionButton(options) {
  return buildActionButton({ ...options, variant: 'primary' });
}

/**
 * Creates a secondary (outlined) action button.
 *
 * @param {Object} options Button configuration.
 * @returns {HTMLButtonElement} Secondary action button.
 */
export function createSecondaryActionButton(options) {
  return buildActionButton({ ...options, variant: 'secondary' });
}

/**
 * Creates a tertiary (text) action button.
 *
 * @param {Object} options Button configuration.
 * @returns {HTMLButtonElement} Tertiary action button.
 */
export function createTertiaryActionButton(options) {
  return buildActionButton({ ...options, variant: 'tertiary' });
}
