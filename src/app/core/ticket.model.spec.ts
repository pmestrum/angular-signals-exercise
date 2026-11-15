import { DEFAULT_FILTERS, filterTickets, summarizeTickets } from './ticket.model';
import { createSeedTickets } from './ticket.seed';

describe('Ticket projections', () => {
  const now = Date.parse('2026-11-15T10:00:00Z');
  const tickets = createSeedTickets(now);

  it('combines case-insensitive trimmed search with status and priority filters', () => {
    const result = filterTickets(tickets, {
      ...DEFAULT_FILTERS,
      query: '  ACME  ',
      status: 'Open',
      priority: 'Urgent',
    });
    expect(result.map((ticket) => ticket.id)).toEqual(['NS-1041']);
  });

  it('searches by ticket ID and contact email', () => {
    expect(filterTickets(tickets, { ...DEFAULT_FILTERS, query: 'NS-1043' })).toHaveLength(1);
    expect(
      filterTickets(tickets, { ...DEFAULT_FILTERS, query: 'support@acmestudio.example' }),
    ).toHaveLength(2);
  });

  it('filters by assignee and sorts priority without mutating the original array', () => {
    const original = [...tickets];
    const result = filterTickets(tickets, {
      ...DEFAULT_FILTERS,
      assignee: 'Alex Morgan',
      sort: 'priority',
    });
    expect(result.map((ticket) => ticket.priority)).toEqual(['Urgent', 'High', 'Medium']);
    expect(tickets).toEqual(original);
  });

  it('supports deadline and newest-first ordering', () => {
    const due = filterTickets(tickets, DEFAULT_FILTERS);
    expect(due[0].id).toBe('NS-1052');
    const newest = filterTickets(tickets, { ...DEFAULT_FILTERS, sort: 'newest' });
    expect(newest[0].id).toBe('NS-1041');
  });

  it('excludes resolved tickets from active, overdue and unassigned counts', () => {
    expect(summarizeTickets(tickets, now)).toEqual({
      total: 12,
      active: 10,
      unassigned: 3,
      overdue: 2,
      resolved: 2,
    });
    expect(summarizeTickets([], now)).toEqual({
      total: 0,
      active: 0,
      unassigned: 0,
      overdue: 0,
      resolved: 0,
    });
  });

  it('updates overdue counts as time passes, without a ticket change', () => {
    expect(summarizeTickets(tickets, now + 3 * 3_600_000).overdue).toBe(4);
  });
});
