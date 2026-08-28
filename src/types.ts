export const MEMBER_COLORS = ['#42E8B4', '#FF6B9E', '#7BB7FF', '#FFC857', '#B895FF'] as const;
export type EventKind = 'pickup' | 'dropoff' | 'handoff' | 'activity';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: EventKind;
  ownerId: string;
  fromId: string;
  toId: string;
  location: string;
  notes: string;
  allDay: boolean;
  source: 'local' | 'ics';
  updatedAt: string;
}

export interface AppData {
  members: Member[];
  events: CalendarEvent[];
  householdName: string;
  updatedAt: string;
}

export const EMPTY_DATA: AppData = {
  members: [],
  events: [],
  householdName: 'Our household',
  updatedAt: new Date(0).toISOString()
};
