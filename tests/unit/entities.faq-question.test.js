import { isValidFaqQuestion, normalizeFaqQuestion } from '../../src/entities/faq-question/index.js';

describe('entities/faq-question', () => {
  test('normalizeFaqQuestion maps alternate keys', () => {
    expect(normalizeFaqQuestion({ question_id: 'q1', title: 'What?', content: 'Answer' })).toEqual({
      id: 'q1',
      question: 'What?',
      answer: 'Answer',
    });
  });

  test('isValidFaqQuestion requires id/question/answer', () => {
    expect(isValidFaqQuestion({ id: 'q1', question: 'Q', answer: 'A' })).toBe(true);
    expect(isValidFaqQuestion({ id: 'q1', question: 'Q', answer: '' })).toBe(false);
  });
});
