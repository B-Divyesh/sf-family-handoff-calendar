import type { AppData, CalendarEvent, EventKind, Member } from './types';

interface IcsProperty { value: string; params: Record<string, string>; }

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const unescapeIcs = (value: string) => value.replace(/\\[nN]/g, '\n').replace(/\\([\\,;])/g, '$1');

function unfold(input: string): string[] {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseProperty(line: string): [string, IcsProperty] | null {
  const colon = line.indexOf(':');
  if (colon < 1) return null;
  const head = line.slice(0, colon).split(';');
  const name = head.shift()!.toUpperCase();
  const params: Record<string, string> = {};
  for (const param of head) {
    const eq = param.indexOf('=');
    if (eq > 0) params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return [name, { value: line.slice(colon + 1), params }];
}

function partsInZone(date: Date, timeZone: string): number[] {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
  return [read('year'), read('month'), read('day'), read('hour'), read('minute'), read('second')];
}

export function zonedDateToUtc(raw: string, timeZone: string): Date {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) throw new Error(`Unsupported date: ${raw}`);
  const wanted = match.slice(1).map(Number);
  let utc = Date.UTC(wanted[0], wanted[1] - 1, wanted[2], wanted[3], wanted[4], wanted[5]);
  try {
    for (let i = 0; i < 2; i += 1) {
      const actual = partsInZone(new Date(utc), timeZone);
      const actualUtc = Date.UTC(actual[0], actual[1] - 1, actual[2], actual[3], actual[4], actual[5]);
      const targetUtc = Date.UTC(wanted[0], wanted[1] - 1, wanted[2], wanted[3], wanted[4], wanted[5]);
      utc += targetUtc - actualUtc;
    }
  } catch {
    throw new Error(`Unknown timezone: ${timeZone}`);
  }
  return new Date(utc);
}

export function parseIcsDate(property: IcsProperty): { date: Date; allDay: boolean } {
  const raw = property.value.trim();
  if (/^\d{8}$/.test(raw) || property.params.VALUE === 'DATE') {
    return { date: new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8))), allDay: true };
  }
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    return { date: new Date(Date.UTC(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)), Number(raw.slice(9, 11)), Number(raw.slice(11, 13)), Number(raw.slice(13, 15)))), allDay: false };
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    const timezone = property.params.TZID;
    const date = timezone ? zonedDateToUtc(raw, timezone) : new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)), Number(raw.slice(9, 11)), Number(raw.slice(11, 13)), Number(raw.slice(13, 15)));
    return { date, allDay: false };
  }
  throw new Error(`Unsupported date: ${raw}`);
}

function inferKind(properties: Map<string, IcsProperty>, title: string): EventKind {
  const custom = properties.get('X-FAMILY-HANDOFF-TYPE')?.value.toLowerCase();
  if (custom && ['pickup', 'dropoff', 'handoff', 'activity'].includes(custom)) return custom as EventKind;
  const tags = `${properties.get('CATEGORIES')?.value ?? ''} ${title}`.toLowerCase();
  if (tags.includes('pickup') || tags.includes('pick-up')) return 'pickup';
  if (tags.includes('dropoff') || tags.includes('drop-off')) return 'dropoff';
  if (tags.includes('handoff') || tags.includes('hand-off')) return 'handoff';
  return 'activity';
}

function memberByName(members: Member[], value = ''): string {
  const clean = unescapeIcs(value).trim().toLocaleLowerCase();
  return members.find(member => member.name.toLocaleLowerCase() === clean)?.id ?? '';
}

const weekdayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function recurrenceStart(base: CalendarEvent, startProperty: IcsProperty, dayOffset: number): Date {
  const raw = startProperty.value.trim();
  if (/^\d{8}T\d{6}$/.test(raw) && startProperty.params.TZID) {
    const anchor = new Date(Date.UTC(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)) + dayOffset));
    const local = `${anchor.getUTCFullYear()}${String(anchor.getUTCMonth() + 1).padStart(2, '0')}${String(anchor.getUTCDate()).padStart(2, '0')}T${raw.slice(9)}`;
    return zonedDateToUtc(local, startProperty.params.TZID);
  }
  if (/^\d{8}$/.test(raw) || startProperty.params.VALUE === 'DATE') {
    const date = new Date(base.start); date.setDate(date.getDate() + dayOffset); return date;
  }
  const date = new Date(base.start); date.setUTCDate(date.getUTCDate() + dayOffset); return date;
}

function expandRecurrence(base: CalendarEvent, rule: string, startProperty: IcsProperty): CalendarEvent[] {
  const values = Object.fromEntries(rule.split(';').map(item => item.split('=', 2).map(part => part.toUpperCase()))) as Record<string, string>;
  if (!['DAILY', 'WEEKLY'].includes(values.FREQ)) throw new Error(`recurrence ${values.FREQ || 'rule'} is not supported`);
  const interval = Math.max(1, Number(values.INTERVAL) || 1);
  const count = values.COUNT ? Math.max(1, Number(values.COUNT) || 1) : Number.POSITIVE_INFINITY;
  const until = values.UNTIL ? parseIcsDate({ value: values.UNTIL, params: startProperty.params }).date : new Date(Date.now() + 366 * 86400000);
  const keepAfter = new Date(Date.now() - 90 * 86400000);
  const byDays = values.BYDAY?.split(',').map(value => value.slice(-2)) ?? [];
  const duration = new Date(base.end).getTime() - new Date(base.start).getTime();
  const occurrences: CalendarEvent[] = [];
  let matched = 0;
  for (let offset = 0; offset <= 20000 && matched < count && occurrences.length < 800; offset += 1) {
    const start = recurrenceStart(base, startProperty, offset);
    if (start > until) break;
    const weekday = weekdayCodes[/^\d{8}/.test(startProperty.value) ? new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())).getUTCDay() : start.getUTCDay()];
    const eligible = values.FREQ === 'DAILY'
      ? offset % interval === 0
      : Math.floor(offset / 7) % interval === 0 && (byDays.length ? byDays.includes(weekday) : offset % 7 === 0);
    if (!eligible) continue;
    matched += 1;
    if (start < keepAfter && new Date(base.start) < keepAfter) continue;
    occurrences.push({ ...base, id: offset ? `${base.id}-${start.toISOString().slice(0, 10)}` : base.id, start: start.toISOString(), end: new Date(start.getTime() + duration).toISOString() });
  }
  return occurrences;
}

export function importIcs(input: string, members: Member[]): { events: CalendarEvent[]; warnings: string[] } {
  if (!input.includes('BEGIN:VCALENDAR')) throw new Error('This does not look like an ICS calendar file.');
  const lines = unfold(input);
  const events: CalendarEvent[] = [];
  const warnings: string[] = [];
  let current: Map<string, IcsProperty> | null = null;
  for (const line of lines) {
    if (line.trim() === 'BEGIN:VEVENT') { current = new Map(); continue; }
    if (line.trim() === 'END:VEVENT' && current) {
      try {
        const startProp = current.get('DTSTART');
        if (!startProp) throw new Error('event has no start time');
        const parsedStart = parseIcsDate(startProp);
        const endProp = current.get('DTEND');
        const parsedEnd = endProp ? parseIcsDate(endProp) : { date: new Date(parsedStart.date.getTime() + (parsedStart.allDay ? 86400000 : 3600000)), allDay: parsedStart.allDay };
        const title = unescapeIcs(current.get('SUMMARY')?.value || 'Untitled event').trim();
        const uid = unescapeIcs(current.get('UID')?.value || crypto.randomUUID());
        const baseEvent: CalendarEvent = {
          id: `ics-${uid}`,
          title,
          start: parsedStart.date.toISOString(), end: parsedEnd.date.toISOString(), allDay: parsedStart.allDay,
          kind: inferKind(current, title),
          ownerId: memberByName(members, current.get('X-FAMILY-HANDOFF-OWNER')?.value),
          fromId: memberByName(members, current.get('X-FAMILY-HANDOFF-FROM')?.value),
          toId: memberByName(members, current.get('X-FAMILY-HANDOFF-TO')?.value),
          location: unescapeIcs(current.get('LOCATION')?.value || ''),
          notes: unescapeIcs(current.get('DESCRIPTION')?.value || ''), source: 'ics', updatedAt: new Date().toISOString()
        };
        const recurrence = current.get('RRULE')?.value;
        if (recurrence) {
          try { events.push(...expandRecurrence(baseEvent, recurrence, startProp)); }
          catch (error) {
            events.push(baseEvent);
            warnings.push(`${title}: ${error instanceof Error ? error.message : 'recurrence could not be expanded'}; imported its first occurrence.`);
          }
        } else events.push(baseEvent);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'One event could not be read.');
      }
      current = null;
      continue;
    }
    if (current) {
      const property = parseProperty(line);
      if (property) current.set(property[0], property[1]);
    }
  }
  if (!events.length && !warnings.length) throw new Error('No calendar events were found in this file.');
  return { events, warnings };
}

const utcIcs = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function exportIcs(data: AppData): string {
  const memberName = (id: string) => data.members.find(member => member.id === id)?.name ?? '';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Family Handoff Calendar//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeIcs(data.householdName)}`];
  for (const event of data.events) {
    const localDate = (iso: string) => { const value = new Date(iso); return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(value.getDate()).padStart(2, '0')}`; };
    lines.push('BEGIN:VEVENT', `UID:${escapeIcs(event.id)}@family-handoff-calendar.local`, `DTSTAMP:${utcIcs(event.updatedAt)}`,
      event.allDay ? `DTSTART;VALUE=DATE:${localDate(event.start)}` : `DTSTART:${utcIcs(event.start)}`,
      event.allDay ? `DTEND;VALUE=DATE:${localDate(event.end)}` : `DTEND:${utcIcs(event.end)}`, `SUMMARY:${escapeIcs(event.title)}`,
      `CATEGORIES:${event.kind.toUpperCase()}`, `X-FAMILY-HANDOFF-TYPE:${event.kind}`);
    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
    if (event.notes) lines.push(`DESCRIPTION:${escapeIcs(event.notes)}`);
    if (event.ownerId) lines.push(`X-FAMILY-HANDOFF-OWNER:${escapeIcs(memberName(event.ownerId))}`);
    if (event.fromId) lines.push(`X-FAMILY-HANDOFF-FROM:${escapeIcs(memberName(event.fromId))}`);
    if (event.toId) lines.push(`X-FAMILY-HANDOFF-TO:${escapeIcs(memberName(event.toId))}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}
