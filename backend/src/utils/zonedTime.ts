/** На скільки мс годинник у поясі випереджає UTC у момент `date` (Київ улітку: +3 год). */
const zoneOffsetMs = (timeZone: string, date: Date): number => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)])
  );
  const wallClock = Date.UTC(
    parts.year!,
    parts.month! - 1,
    parts.day!,
    parts.hour!,
    parts.minute!,
    parts.second!
  );
  return wallClock - Math.floor(date.getTime() / 1000) * 1000;
};

/**
 * Момент, коли в поясі `timeZone` на годиннику — вказані день і час. День може
 * виходити за межі місяця (31 + 3 → наступний місяць), як у Date.UTC.
 */
export const zonedTime = (
  timeZone: string,
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes = 0
): Date => {
  const asIfUtc = Date.UTC(year, monthIndex, day, hours, minutes);
  const guess = asIfUtc - zoneOffsetMs(timeZone, new Date(asIfUtc));
  // У день переходу на літній/зимовий час зсув у самому guess може бути іншим
  return new Date(asIfUtc - zoneOffsetMs(timeZone, new Date(guess)));
};

/** Сьогоднішня дата в поясі — не на сервері: о 01:00 за Києвом у UTC ще вчора. */
export const todayIn = (timeZone: string, now = new Date()) => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone })
    .format(now)
    .split('-')
    .map(Number);
  return { year: year!, monthIndex: month! - 1, day: day! };
};
