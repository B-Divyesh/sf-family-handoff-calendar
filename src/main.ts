import './style.css';
import { exportIcs, importIcs } from './ics';
import { buyUrl, checkLicense, saveLicense, type LicenseState } from './license';
import { loadData, normalizeData, saveData } from './store';
import { EMPTY_DATA, MEMBER_COLORS, type AppData, type CalendarEvent, type EventKind, type Member } from './types';

type View = 'board' | 'week' | 'settings';
const app = document.querySelector<HTMLDivElement>('#app')!;
let data: AppData = { ...EMPTY_DATA };
let view: View = 'board';
let weekOffset = 0;
let license: LicenseState = { unlocked: false, token: '', notice: '' };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
const member = (id: string) => data.members.find(item => item.id === id);
const memberName = (id: string) => member(id)?.name ?? 'Unassigned';
const memberColor = (id: string) => member(id)?.color ?? '#C8C4B4';
const timeOnly = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function icon(name: 'arrow' | 'clock' | 'pin' | 'ticket'): string {
  const paths = {
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/>',
    ticket: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Z"/><path d="M12 7v10"/>'
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function eventOwner(event: CalendarEvent): string {
  if (event.kind === 'handoff') {
    return `<span class="member-chip" style="--member:${memberColor(event.fromId)}">${escapeHtml(memberName(event.fromId))}</span><span class="handoff-arrow" aria-label="hands off to">→</span><span class="member-chip" style="--member:${memberColor(event.toId)}">${escapeHtml(memberName(event.toId))}</span>`;
  }
  return `<span class="member-chip" style="--member:${memberColor(event.ownerId)}">${escapeHtml(memberName(event.ownerId))}</span>`;
}

function eventTicket(event: CalendarEvent, compact = false): string {
  const unassigned = event.kind === 'handoff' ? !event.fromId || !event.toId : !event.ownerId;
  return `<article class="event-ticket ${unassigned ? 'unassigned' : ''} ${compact ? 'compact' : ''}" data-event-id="${escapeHtml(event.id)}">
    <div class="ticket-time">${event.allDay ? 'All day' : escapeHtml(timeOnly(event.start))}</div>
    <div class="ticket-main">
      <div class="ticket-kicker"><span>${escapeHtml(event.kind)}</span>${unassigned ? '<strong>Needs an owner</strong>' : ''}</div>
      <h3>${escapeHtml(event.title)}</h3>
      <div class="owner-route">${eventOwner(event)}</div>
      ${!compact && event.location ? `<p class="ticket-meta">${icon('pin')}${escapeHtml(event.location)}</p>` : ''}
    </div>
    <button class="ticket-edit ghost-button" data-action="edit-event" data-id="${escapeHtml(event.id)}" aria-label="Edit ${escapeHtml(event.title)}">Edit</button>
  </article>`;
}

function boardView(): string {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 3600000);
  const upcoming = data.events.filter(event => new Date(event.end) >= now && new Date(event.start) <= cutoff).sort((a, b) => a.start.localeCompare(b.start));
  if (!data.members.length && !data.events.length) {
    return `<section class="first-run" aria-labelledby="first-run-title">
      <div><p class="eyebrow">Your local dispatch board</p><h2 id="first-run-title">Start with the people who trade the keys.</h2>
      <p>Add household members, then record a pickup or import the calendar you already use. Nothing leaves this device.</p>
      <div class="button-row"><button class="primary-button" data-action="add-member">Add first member</button><button class="secondary-button" data-action="import">Import an ICS file</button></div></div>
      <img src="/assets/handoff-market-hero.webp" srcset="/assets/handoff-market-hero-640.webp 640w, /assets/handoff-market-hero.webp 1024w" sizes="(max-width: 850px) calc(100vw - 24px), 590px" width="768" height="512" alt="School satchel, blank week sheet, key sets and handoff tickets on a rain-dark night-market counter" decoding="async" fetchpriority="high" />
    </section>`;
  }
  if (!upcoming.length) {
    return `<section class="empty-state"><span class="empty-icon">48</span><div><p class="eyebrow">The next two days</p><h2>No handoffs on the board</h2><p>Add the next pickup or bring in an ICS file. The board will surface unclear ownership first.</p><div class="button-row"><button class="primary-button" data-action="add-event">Add a handoff</button><button class="secondary-button" data-action="import">Import calendar</button></div></div></section>`;
  }
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of upcoming) {
    const key = dateKey(new Date(event.start));
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return `<section class="board" aria-labelledby="board-title"><div class="section-heading"><div><p class="eyebrow">Rolling responsibility board</p><h2 id="board-title">Next 48 hours</h2></div><p>${upcoming.length} ${upcoming.length === 1 ? 'stop' : 'stops'} ahead · ${upcoming.filter(event => event.kind === 'handoff' ? !event.toId : !event.ownerId).length} unassigned</p></div>
    <div class="timeline">${[...grouped].map(([key, events]) => {
      const date = new Date(`${key}T12:00:00`);
      const label = dateKey(now) === key ? 'Today' : dateKey(new Date(now.getTime() + 86400000)) === key ? 'Tomorrow' : new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
      return `<section class="day-group"><header><span>${escapeHtml(label)}</span><time datetime="${key}">${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}</time></header><div>${events.map(event => eventTicket(event)).join('')}</div></section>`;
    }).join('')}</div></section>`;
}

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1 + weekOffset * 7);
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekView(): string {
  const start = startOfWeek();
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86400000));
  const end = new Date(start.getTime() + 7 * 86400000);
  const weekEvents = data.events.filter(event => new Date(event.start) < end && new Date(event.end) >= start).sort((a, b) => a.start.localeCompare(b.start));
  return `<section class="week-view" aria-labelledby="week-title"><div class="section-heading week-heading"><div><p class="eyebrow">Print-ready route sheet</p><h2 id="week-title">Week of ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(start)}</h2></div><div class="week-actions no-print"><button class="ghost-button" data-action="previous-week" aria-label="Previous week">←</button><button class="ghost-button" data-action="this-week">Today</button><button class="ghost-button" data-action="next-week" aria-label="Next week">→</button><button class="secondary-button" data-action="print">Print week</button></div></div>
  <div class="week-grid">${days.map(day => { const key = dateKey(day); const events = weekEvents.filter(event => dateKey(new Date(event.start)) === key); return `<section class="week-day ${key === dateKey(new Date()) ? 'today' : ''}"><header><span>${new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)}</span><strong>${day.getDate()}</strong></header><div>${events.length ? events.map(event => eventTicket(event, true)).join('') : '<p class="day-empty">Clear</p>'}</div></section>`; }).join('')}</div>
  <footer class="print-footer"><strong>${escapeHtml(data.householdName)}</strong><span>Printed ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())} · Family Handoff Calendar</span></footer></section>`;
}

function settingsView(): string {
  return `<section class="settings" aria-labelledby="settings-title"><div class="section-heading"><div><p class="eyebrow">Household & portability</p><h2 id="settings-title">Set up the route board</h2></div><p>Saved only in this browser</p></div>
  <div class="settings-grid"><section><h3>Household members</h3><p>Use first names, roles, or initials—whatever is clear on a shared screen.</p><ul class="member-list">${data.members.map(item => `<li><span class="member-dot" style="--member:${item.color}"></span><strong>${escapeHtml(item.name)}</strong><span>${data.events.filter(event => [event.ownerId, event.fromId, event.toId].includes(item.id)).length} items</span><button class="ghost-button" data-action="edit-member" data-id="${escapeHtml(item.id)}">Edit</button><button class="icon-button danger-button" data-action="delete-member" data-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}">×</button></li>`).join('') || '<li class="plain-empty">No members yet.</li>'}</ul><button class="secondary-button" data-action="add-member">Add member</button></section>
  <section><h3>Bring your calendar</h3><p>ICS import understands UTC, local times, IANA timezones, and all-day events. Imported events stay editable.</p><div class="stack-actions"><button class="secondary-button" data-action="import">Import ICS or backup</button><button class="ghost-button" data-action="export-ics">Export calendar (.ics)</button><button class="ghost-button" data-action="export-json">Back up everything (.json)</button></div><p class="fine-print">Exports can contain personal schedule details. Only share the downloaded file with people you trust.</p></section>
  <section class="pass-panel"><p class="eyebrow">Household pass · $12 once</p><h3>${license.unlocked ? 'Your household pass is active' : 'Keep the board growing'}</h3><p>${license.unlocked ? 'Thanks for supporting a private, account-free family utility.' : 'The free board includes every core feature. A one-time pass supports ongoing browser and calendar compatibility, and unlocks unlimited household members beyond two.'}</p>${license.notice ? `<p class="license-notice" role="status">${escapeHtml(license.notice)}</p>` : ''}
    ${license.unlocked ? '<span class="status-chip">✓ Unlocked on this device</span>' : `<a class="primary-button link-button" href="${buyUrl()}">Buy household pass</a><form id="license-form"><label for="license-token">Have a license? Paste it here</label><div class="inline-form"><input id="license-token" name="license" autocomplete="off" required /><button class="secondary-button">Restore</button></div></form>`}<p class="fine-print">One-time purchase. Sociobot/Dodo is the merchant of record and handles refunds. A refund revokes the license.</p></section>
  <section><h3>About this device</h3><p>There is no account, tracking, location access, or cloud sync. Clear site data to erase the calendar from this browser.</p><div class="legal-links"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><button class="text-button danger-text" data-action="erase">Erase this calendar</button></div></section></div></section>`;
}

function shell(): string {
  const content = view === 'board' ? boardView() : view === 'week' ? weekView() : settingsView();
  return `<header class="site-header"><a class="brand" href="#board" data-nav="board"><span class="brand-mark" aria-hidden="true">↗</span><span>Family Handoff <small>calendar</small></span></a>
  <nav aria-label="Primary"><button data-nav="board" aria-pressed="${view === 'board'}">48-hour board</button><button data-nav="week" aria-pressed="${view === 'week'}">Week sheet</button><button data-nav="settings" aria-pressed="${view === 'settings'}">Household</button></nav>
  <button class="primary-button add-button" data-action="add-event">+ Add handoff</button></header>
  <div class="offline-banner" role="status" hidden>You’re offline. Everything here still works and saves on this device.</div>
  <main id="main"><div class="hero-strip ${data.events.length || data.members.length ? 'compact-hero' : ''}"><div><p class="route-code">PRIVATE ROUTE · LOCAL TIME</p><h1>Know who’s next.</h1><p>Pickups, drop-offs, and handoffs—owned at a glance.</p></div>${data.events.length || data.members.length ? `<img src="/assets/handoff-market-hero.webp" width="768" height="512" alt="" decoding="async" />` : ''}</div>${content}</main>
  <footer class="site-footer"><p>Private by default. Your calendar stays in this browser.</p><div><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><span>Original AI-assisted artwork</span></div></footer>
  <label class="visually-hidden" for="file-input">Choose an ICS calendar or JSON backup</label><input id="file-input" class="visually-hidden" type="file" accept=".ics,.ical,.json,text/calendar,application/json" />
  <div id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
  <div id="dialog-root"></div>`;
}

function render(): void {
  app.innerHTML = shell();
  updateOnlineState();
  document.title = `${view === 'board' ? '48-hour board' : view === 'week' ? 'Week sheet' : 'Household'} — Family Handoff Calendar`;
}

function notify(message: string): void {
  const toast = document.querySelector<HTMLDivElement>('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  window.setTimeout(() => toast.classList.remove('visible'), 3200);
}

function updateOnlineState(): void {
  const banner = document.querySelector<HTMLElement>('.offline-banner');
  if (banner) banner.hidden = navigator.onLine;
}

function options(selected: string, emptyLabel: string): string {
  return `<option value="">${emptyLabel}</option>${data.members.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}`;
}

function showEventDialog(existing?: CalendarEvent): void {
  const start = existing?.start ?? new Date(Math.ceil(Date.now() / 1800000) * 1800000 + 1800000).toISOString();
  const end = existing?.end ?? new Date(new Date(start).getTime() + 3600000).toISOString();
  const item = existing ?? { kind: 'pickup', ownerId: '', fromId: '', toId: '', title: '', location: '', notes: '', allDay: false };
  document.querySelector('#dialog-root')!.innerHTML = `<dialog class="editor-dialog"><form id="event-form"><div class="dialog-heading"><div><p class="eyebrow">Responsibility ticket</p><h2>${existing ? 'Edit the stop' : 'Add the next stop'}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close">×</button></div>
  <input type="hidden" name="id" value="${escapeHtml(existing?.id ?? '')}"/><label>What’s happening?<input name="title" value="${escapeHtml(item.title)}" maxlength="100" required autofocus /></label>
  <div class="form-row"><label>Starts<input name="start" type="datetime-local" value="${toLocalInput(start)}" required /></label><label>Ends<input name="end" type="datetime-local" value="${toLocalInput(end)}" required /></label></div>
  <div class="form-row"><label>Type<select name="kind"><option value="pickup" ${item.kind === 'pickup' ? 'selected' : ''}>Pickup</option><option value="dropoff" ${item.kind === 'dropoff' ? 'selected' : ''}>Drop-off</option><option value="handoff" ${item.kind === 'handoff' ? 'selected' : ''}>Handoff</option><option value="activity" ${item.kind === 'activity' ? 'selected' : ''}>Activity</option></select></label><label>Responsible person<select name="ownerId">${options(item.ownerId, 'Needs an owner')}</select></label></div>
  <fieldset><legend>For a person-to-person handoff</legend><div class="form-row"><label>From<select name="fromId">${options(item.fromId, 'Choose person')}</select></label><label>To<select name="toId">${options(item.toId, 'Choose person')}</select></label></div></fieldset>
  <label>Place <span>(optional)</span><input name="location" value="${escapeHtml(item.location)}" maxlength="120" /></label><label>Note <span>(optional)</span><textarea name="notes" maxlength="500">${escapeHtml(item.notes)}</textarea></label>
  <label class="check-label"><input name="allDay" type="checkbox" ${item.allDay ? 'checked' : ''}/> This is an all-day item</label><div id="form-error" class="form-error" role="alert"></div>
  <div class="dialog-actions">${existing ? '<button type="button" class="text-button danger-text" data-action="delete-event">Delete event</button>' : '<span></span>'}<button type="button" class="ghost-button" data-action="close-dialog">Cancel</button><button class="primary-button">Save to board</button></div></form></dialog>`;
  const dialog = document.querySelector<HTMLDialogElement>('.editor-dialog')!;
  dialog.showModal();
  dialog.addEventListener('close', () => { document.querySelector('#dialog-root')!.innerHTML = ''; });
}

function showMemberDialog(existing?: Member): void {
  if (!existing && data.members.length >= 2 && !license.unlocked) {
    view = 'settings'; render(); notify('A household pass unlocks more than two members.'); return;
  }
  const color = existing?.color ?? MEMBER_COLORS[data.members.length % MEMBER_COLORS.length];
  document.querySelector('#dialog-root')!.innerHTML = `<dialog class="editor-dialog small-dialog"><form id="member-form"><div class="dialog-heading"><div><p class="eyebrow">Household person</p><h2>${existing ? 'Edit member' : 'Add member'}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close">×</button></div><input type="hidden" name="id" value="${escapeHtml(existing?.id ?? '')}"/><label>Name or role<input name="name" value="${escapeHtml(existing?.name ?? '')}" maxlength="32" required autofocus /><small>Try “Alex”, “Dad”, or “Gran”. Avoid full names on shared devices.</small></label><fieldset><legend>Ticket color</legend><div class="color-choices">${MEMBER_COLORS.map(item => `<label style="--swatch:${item}"><input type="radio" name="color" value="${item}" ${item === color ? 'checked' : ''}/><span>${item}</span></label>`).join('')}</div></fieldset><div class="dialog-actions"><span></span><button type="button" class="ghost-button" data-action="close-dialog">Cancel</button><button class="primary-button">Save member</button></div></form></dialog>`;
  document.querySelector<HTMLDialogElement>('.editor-dialog')!.showModal();
}

async function persist(message: string): Promise<void> {
  await saveData(data);
  render(); notify(message);
}

function download(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

async function handleFile(file: File): Promise<void> {
  if (file.size > 5_000_000) throw new Error('That file is over 5 MB. Export a smaller calendar range and try again.');
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    const incoming = normalizeData(JSON.parse(text) as unknown);
    if (!confirm(`Replace this device’s calendar with “${incoming.householdName}” (${incoming.events.length} events)?`)) return;
    data = incoming; await persist('Backup restored on this device.'); return;
  }
  const result = importIcs(text, data.members);
  const ids = new Map(data.events.map((event, index) => [event.id, index]));
  for (const event of result.events) { const index = ids.get(event.id); if (index === undefined) data.events.push(event); else data.events[index] = event; }
  await persist(`${result.events.length} event${result.events.length === 1 ? '' : 's'} imported${result.warnings.length ? `; ${result.warnings.length} skipped` : ''}.`);
}

document.addEventListener('click', async event => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-nav]');
  if (!target) return;
  const nav = target.dataset.nav as View | undefined;
  if (nav) { event.preventDefault(); view = nav; render(); location.hash = nav; return; }
  const action = target.dataset.action;
  if (action === 'add-event') showEventDialog();
  if (action === 'edit-event') showEventDialog(data.events.find(item => item.id === target.dataset.id));
  if (action === 'add-member') showMemberDialog();
  if (action === 'edit-member') showMemberDialog(data.members.find(item => item.id === target.dataset.id));
  if (action === 'close-dialog') target.closest('dialog')?.close();
  if (action === 'import') document.querySelector<HTMLInputElement>('#file-input')?.click();
  if (action === 'export-ics') { download(exportIcs(data), 'family-handoff-calendar.ics', 'text/calendar'); notify('Portable calendar exported.'); }
  if (action === 'export-json') { download(JSON.stringify(data, null, 2), 'family-handoff-backup.json', 'application/json'); notify('Private backup exported.'); }
  if (action === 'print') window.print();
  if (action === 'previous-week') { weekOffset -= 1; render(); }
  if (action === 'next-week') { weekOffset += 1; render(); }
  if (action === 'this-week') { weekOffset = 0; render(); }
  if (action === 'delete-member') {
    const item = data.members.find(member => member.id === target.dataset.id);
    if (item && confirm(`Delete ${item.name}? Their events will stay but become unassigned.`)) {
      data.members = data.members.filter(member => member.id !== item.id);
      data.events = data.events.map(calendarEvent => ({ ...calendarEvent, ownerId: calendarEvent.ownerId === item.id ? '' : calendarEvent.ownerId, fromId: calendarEvent.fromId === item.id ? '' : calendarEvent.fromId, toId: calendarEvent.toId === item.id ? '' : calendarEvent.toId }));
      await persist(`${item.name} removed; their stops are now unassigned.`);
    }
  }
  if (action === 'delete-event') {
    const id = new FormData(target.closest('form')!).get('id')?.toString();
    const item = data.events.find(event => event.id === id);
    if (item && confirm(`Delete “${item.title}”? This cannot be undone.`)) { data.events = data.events.filter(event => event.id !== id); target.closest('dialog')?.close(); await persist('Event deleted.'); }
  }
  if (action === 'erase' && confirm(`Erase all ${data.events.length} events and ${data.members.length} members from this browser? Export a backup first if you need one.`)) { data = { ...EMPTY_DATA, members: [], events: [], updatedAt: new Date().toISOString() }; await persist('Calendar erased from this browser.'); }
});

document.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const values = new FormData(form);
  if (form.getAttribute('id') === 'event-form') {
    const start = new Date(values.get('start')!.toString()); const end = new Date(values.get('end')!.toString());
    const error = form.querySelector<HTMLElement>('#form-error')!;
    if (end <= start) { error.textContent = 'End time must be after the start time.'; form.querySelector<HTMLInputElement>('[name="end"]')?.focus(); return; }
    const id = values.get('id')?.toString() || crypto.randomUUID();
    const previous = data.events.find(item => item.id === id);
    const item: CalendarEvent = { id, title: values.get('title')!.toString().trim(), start: start.toISOString(), end: end.toISOString(), kind: values.get('kind')!.toString() as EventKind, ownerId: values.get('ownerId')!.toString(), fromId: values.get('fromId')!.toString(), toId: values.get('toId')!.toString(), location: values.get('location')!.toString().trim(), notes: values.get('notes')!.toString().trim(), allDay: values.has('allDay'), source: previous?.source ?? 'local', updatedAt: new Date().toISOString() };
    data.events = previous ? data.events.map(event => event.id === id ? item : event) : [...data.events, item];
    form.closest('dialog')?.close(); view = 'board'; location.hash = 'board'; await persist(previous ? 'Stop updated.' : 'Stop added to the board.');
  }
  if (form.getAttribute('id') === 'member-form') {
    const id = values.get('id')?.toString() || crypto.randomUUID(); const previous = data.members.find(member => member.id === id);
    const item: Member = { id, name: values.get('name')!.toString().trim(), color: values.get('color')!.toString() };
    data.members = previous ? data.members.map(member => member.id === id ? item : member) : [...data.members, item];
    form.closest('dialog')?.close(); await persist(previous ? 'Member updated.' : `${item.name} added to the household.`);
  }
  if (form.getAttribute('id') === 'license-form') {
    saveLicense(values.get('license')!.toString()); notify('Checking this license…'); license = await checkLicense(true); render(); notify(license.unlocked ? 'Household pass restored.' : license.notice || 'That license is not valid.');
  }
});

document.addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  if (input.id !== 'file-input' || !input.files?.[0]) return;
  try { await handleFile(input.files[0]); } catch (error) { notify(error instanceof Error ? error.message : 'That file could not be imported.'); }
  input.value = '';
});

window.addEventListener('online', updateOnlineState); window.addEventListener('offline', updateOnlineState);

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  const registration = await navigator.serviceWorker.register('/sw.js');
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        const toast = document.querySelector<HTMLDivElement>('#toast');
        if (toast) { toast.innerHTML = 'A fresh version is ready. <button id="update-app">Update now</button>'; toast.classList.add('visible'); document.querySelector('#update-app')?.addEventListener('click', () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' })); }
      }
    });
  });
  if (hadController) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

async function init(): Promise<void> {
  app.innerHTML = '<main id="main" class="loading-state"><span></span><p>Opening your local route board…</p></main>';
  try { data = await loadData(); } catch { data = { ...EMPTY_DATA }; }
  view = (location.hash.slice(1) as View) || 'board';
  if (!['board', 'week', 'settings'].includes(view)) view = 'board';
  render();
  checkLicense().then(result => { license = result; if (view === 'settings') render(); });
  registerServiceWorker().catch(() => undefined);
}

void init();
