import { toLocalDateTimeInputValue } from '../../../src/utils/dateTimeLocal';

describe('dateTimeLocal utils', () => {
  it('converts ISO datetime to local datetime-local input format', () => {
    const utcIso = '2026-04-03T12:34:56.000Z';
    const parsed = new Date(utcIso);
    const expected = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    expect(toLocalDateTimeInputValue(utcIso)).toBe(expected);
  });

  it('returns empty string for invalid date input', () => {
    expect(toLocalDateTimeInputValue('not-a-date')).toBe('');
  });
});
