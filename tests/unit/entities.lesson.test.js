import { isValidLesson, normalizeLesson } from '../../src/entities/lesson/index.js';

describe('entities/lesson', () => {
  test('normalizeLesson maps alternate keys', () => {
    expect(normalizeLesson({ lesson_id: 'id-1', lesson_title: 'Intro', description: 'Basics' })).toEqual({
      id: 'id-1',
      title: 'Intro',
      summary: 'Basics',
    });
  });

  test('isValidLesson enforces required id/title', () => {
    expect(isValidLesson({ id: '1', title: 'A', summary: '' })).toBe(true);
    expect(isValidLesson({ id: '', title: 'A', summary: '' })).toBe(false);
  });
});
