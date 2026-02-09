const {
  createDrawerState,
  openDrawerState,
  closeDrawerState,
  setSectionExpandedState,
} = require('../../app/src/main/js/core/domain/navigation/navigationDrawerState.js');

describe('navigationDrawerState', () => {
  test('creates normalized state', () => {
    expect(createDrawerState({ isOpen: 1, sections: { about: true } })).toEqual({
      isOpen: true,
      sections: { about: true },
    });
  });

  test('open and close transitions are pure', () => {
    const initial = createDrawerState({ isOpen: false, sections: { about: false } });
    const opened = openDrawerState(initial);
    const closed = closeDrawerState(opened);

    expect(initial.isOpen).toBe(false);
    expect(opened.isOpen).toBe(true);
    expect(closed.isOpen).toBe(false);
    expect(closed.sections).toEqual({ about: false });
  });

  test('sets section expanded state immutably', () => {
    const initial = createDrawerState({ sections: { about: false } });
    const updated = setSectionExpandedState(initial, 'about', true);

    expect(initial.sections.about).toBe(false);
    expect(updated.sections.about).toBe(true);
  });
});
