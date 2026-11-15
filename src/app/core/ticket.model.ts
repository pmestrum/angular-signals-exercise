export const STATUSES = ['Open', 'In progress', 'Waiting', 'Resolved'] as const;
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export const AGENTS = ['Alex Morgan', 'Jamie Chen', 'Sam Rivera', 'Unassigned'] as const;

export type TicketStatus = (typeof STATUSES)[number];
export type TicketPriority = (typeof PRIORITIES)[number];
export type Agent = (typeof AGENTS)[number];

export interface Ticket {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly customer: string;
  readonly email: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly assignee: Agent;
  readonly createdAt: string;
  readonly dueAt: string;
  readonly activity: readonly Activity[];
}

export interface Activity {
  readonly id: string;
  readonly message: string;
  readonly createdAt: string;
}

export interface NewTicket {
  readonly title: string;
  readonly description: string;
  readonly customer: string;
  readonly email: string;
  readonly priority: TicketPriority;
}

export interface TicketUpdate {
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly assignee: Agent;
  readonly note: string;
}

export interface TicketFilters {
  readonly query: string;
  readonly status: TicketStatus | 'All';
  readonly priority: TicketPriority | 'All';
  readonly assignee: Agent | 'All';
  readonly sort: 'due' | 'priority' | 'newest';
}

export const DEFAULT_FILTERS: TicketFilters = {
  query: '',
  status: 'All',
  priority: 'All',
  assignee: 'All',
  sort: 'due',
};

export interface TicketSummary {
  readonly total: number;
  readonly active: number;
  readonly unassigned: number;
  readonly overdue: number;
  readonly resolved: number;
}

const PRIORITY_RANK: Record<TicketPriority, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Urgent: 3,
};

export function filterTickets(tickets: readonly Ticket[], filters: TicketFilters): Ticket[] {
  const query = filters.query.trim().toLowerCase();
  return tickets
    .filter(
      (ticket) =>
        (filters.status === 'All' || ticket.status === filters.status) &&
        (filters.priority === 'All' || ticket.priority === filters.priority) &&
        (filters.assignee === 'All' || ticket.assignee === filters.assignee) &&
        `${ticket.id} ${ticket.title} ${ticket.customer} ${ticket.email}`
          .toLowerCase()
          .includes(query),
    )
    .sort((a, b) => {
      switch (filters.sort) {
        case 'priority':
          return (
            PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
            Date.parse(a.dueAt) - Date.parse(b.dueAt)
          );
        case 'newest':
          return Date.parse(b.createdAt) - Date.parse(a.createdAt);
        case 'due':
          return Date.parse(a.dueAt) - Date.parse(b.dueAt);
      }
    });
}

export function summarizeTickets(tickets: readonly Ticket[], now: number): TicketSummary {
  const active = tickets.filter((ticket) => ticket.status !== 'Resolved');
  return {
    total: tickets.length,
    active: active.length,
    unassigned: active.filter((ticket) => ticket.assignee === 'Unassigned').length,
    overdue: active.filter((ticket) => Date.parse(ticket.dueAt) < now).length,
    resolved: tickets.length - active.length,
  };
}
