/** Робочі години тижневого календаря, поки занять поза ними немає. */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 21;

/**
 * Межі сітки тижня (min/max для react-big-calendar). Заняття раніше 8:00 чи
 * пізніше 21:00 розширюють сітку: з фіксованими межами воно просто зникало з
 * тижня, хоча в місяці й на дашборді було.
 */
export const calendarHours = (events: { start: Date; end: Date }[]) => {
  let first = DAY_START_HOUR;
  let last = DAY_END_HOUR;

  for (const { start, end } of events) {
    first = Math.min(first, start.getHours());
    const endsNextDay = end.toDateString() !== start.toDateString();
    const endHour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
    last = Math.max(last, endsNextDay ? 24 : endHour);
  }

  return {
    min: new Date(1970, 0, 1, first),
    max: last >= 24 ? new Date(1970, 0, 1, 23, 59) : new Date(1970, 0, 1, last),
  };
};
