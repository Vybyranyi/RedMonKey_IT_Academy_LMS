import { describe, expect, it } from 'vitest';
import { calendarHours } from '../calendarHours';

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const lesson = (start: Date, durationMin: number) => ({
  start,
  end: new Date(start.getTime() + durationMin * 60_000),
});

describe('calendarHours', () => {
  it('без занять — 8:00–21:00', () => {
    const { min, max } = calendarHours([]);
    expect([min.getHours(), max.getHours()]).toEqual([8, 21]);
  });

  it('заняття о 18:00 на 3 години вміщається в стандартну сітку', () => {
    const { max } = calendarHours([lesson(at(25, 18), 180)]);
    expect(max.getHours()).toBe(21);
  });

  // Саме так «зникали» заняття, засіяні на сервері в UTC: 19:00 UTC — це 22:00 у Києві
  it('пізнє заняття розширює сітку до години, на якій воно закінчується', () => {
    const { max } = calendarHours([lesson(at(25, 22), 60)]);
    expect(max.getHours()).toBe(23);
  });

  it('ранкове заняття опускає початок сітки', () => {
    const { min } = calendarHours([lesson(at(25, 7, 30), 80)]);
    expect(min.getHours()).toBe(7);
  });

  it('заняття, що переходить за північ, тягне сітку до кінця доби', () => {
    const { max } = calendarHours([lesson(at(25, 23), 90)]);
    expect([max.getHours(), max.getMinutes()]).toEqual([23, 59]);
  });
});
