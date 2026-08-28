import { describe, expect, it } from 'vitest';
import { exportIcs, importIcs, parseIcsDate, zonedDateToUtc } from '../src/ics';
import type { AppData } from '../src/types';

describe('ICS portability', () => {
  it('parses folded text, UTC time, tags and named responsibility', () => {
    const members = [{ id: 'alex', name: 'Alex', color: '#42E8B4' }];
    const source = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:school-1', 'DTSTART:20260828T153000Z', 'DTEND:20260828T160000Z', 'SUMMARY:School pick-', ' up', 'CATEGORIES:PICKUP', 'X-FAMILY-HANDOFF-OWNER:Alex', 'LOCATION:North gate', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const result = importIcs(source, members);
    expect(result.warnings).toEqual([]);
    expect(result.events[0]).toMatchObject({ id: 'ics-school-1', title: 'School pick-up', kind: 'pickup', ownerId: 'alex', location: 'North gate' });
    expect(result.events[0].start).toBe('2026-08-28T15:30:00.000Z');
  });

  it('converts an IANA local time across daylight saving', () => {
    expect(zonedDateToUtc('20260701T090000', 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedDateToUtc('20260101T090000', 'America/New_York').toISOString()).toBe('2026-01-01T14:00:00.000Z');
  });

  it('keeps date-only events marked all day', () => {
    const parsed = parseIcsDate({ value: '20261225', params: { VALUE: 'DATE' } });
    expect(parsed.allDay).toBe(true);
    expect(parsed.date.getFullYear()).toBe(2026);
    expect(parsed.date.getMonth()).toBe(11);
    expect(parsed.date.getDate()).toBe(25);
  });

  it('exports custom ownership fields that round-trip', () => {
    const data: AppData = {
      householdName: 'Market Street', updatedAt: '2026-08-28T00:00:00.000Z',
      members: [{ id: 'a', name: 'Ari', color: '#42E8B4' }, { id: 'b', name: 'Bea', color: '#FF6B9E' }],
      events: [{ id: 'handoff-1', title: 'Keys & bag', start: '2026-08-28T15:00:00.000Z', end: '2026-08-28T15:30:00.000Z', kind: 'handoff', ownerId: '', fromId: 'a', toId: 'b', location: 'Gate, 2', notes: 'Bring water', allDay: false, source: 'local', updatedAt: '2026-08-28T00:00:00.000Z' }]
    };
    const output = exportIcs(data);
    expect(output).toContain('LOCATION:Gate\\, 2');
    const imported = importIcs(output, data.members).events[0];
    expect(imported).toMatchObject({ title: 'Keys & bag', kind: 'handoff', fromId: 'a', toId: 'b', location: 'Gate, 2' });
  });

  it('reports malformed events while retaining good events', () => {
    const source = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Broken\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Good\nDTSTART:20260828T120000Z\nEND:VEVENT\nEND:VCALENDAR';
    const result = importIcs(source, []);
    expect(result.events).toHaveLength(1);
    expect(result.warnings).toEqual(['event has no start time']);
  });
});
