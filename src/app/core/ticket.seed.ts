import { Agent, Ticket, TicketPriority, TicketStatus } from './ticket.model';

type Seed = readonly [string, string, string, TicketStatus, TicketPriority, Agent, number];

const SEEDS: readonly Seed[] = [
  [
    'SSO login fails for new starters',
    'Acme Studio',
    'New employees get redirected to the login page after authenticating with their company account. Existing accounts are unaffected.',
    'Open',
    'Urgent',
    'Alex Morgan',
    -3,
  ],
  [
    'Monthly export is missing invoices',
    'Harbor Finance',
    'The October CSV export contains only 42 of the expected 58 invoices. Finance needs a complete export before closing the books.',
    'In progress',
    'High',
    'Jamie Chen',
    2,
  ],
  [
    'Invite link expires immediately',
    'Juniper Labs',
    'Invitations sent to external collaborators show an expired-link message on the first click.',
    'Open',
    'High',
    'Unassigned',
    -1,
  ],
  [
    'Update billing contact',
    'Fieldwork Co.',
    'Please change the billing contact before the next renewal. Awaiting confirmation from the account owner.',
    'Waiting',
    'Low',
    'Sam Rivera',
    48,
  ],
  [
    'Dashboard feels slow on large accounts',
    'Acme Studio',
    'The analytics dashboard takes over 12 seconds to load for accounts with more than 10,000 records.',
    'In progress',
    'High',
    'Alex Morgan',
    6,
  ],
  [
    'Webhook deliveries arrive twice',
    'Orbit Logistics',
    'Our warehouse receives duplicate shipment notifications. We have attached delivery IDs for investigation.',
    'Open',
    'Urgent',
    'Unassigned',
    1,
  ],
  [
    'Add purchase order to renewal',
    'Harbor Finance',
    'Procurement needs the purchase order reference displayed on the upcoming renewal invoice.',
    'Waiting',
    'Medium',
    'Jamie Chen',
    24,
  ],
  [
    'Cannot upload a profile photo',
    'Cedar Health',
    'PNG files larger than 2 MB fail without an error message. Smaller images upload correctly.',
    'Open',
    'Medium',
    'Sam Rivera',
    12,
  ],
  [
    'Restore archived project',
    'Juniper Labs',
    'A team member accidentally archived the spring rollout. The project and its tasks have now been restored.',
    'Resolved',
    'Medium',
    'Alex Morgan',
    -12,
  ],
  [
    'Keyboard navigation skips menu',
    'Fieldwork Co.',
    'The account menu cannot be reached with the Tab key in Firefox. This blocks a keyboard-only user.',
    'In progress',
    'High',
    'Sam Rivera',
    4,
  ],
  [
    'New workspace onboarding',
    'Atlas Design',
    'We would like help setting up roles and importing our first customer list before the team kickoff.',
    'Open',
    'Low',
    'Unassigned',
    72,
  ],
  [
    'Timezone in scheduled reports',
    'Orbit Logistics',
    'Scheduled reports were delivered in UTC rather than the workspace timezone. The configuration has been corrected.',
    'Resolved',
    'Low',
    'Jamie Chen',
    -24,
  ],
];

export function createSeedTickets(now = Date.now()): Ticket[] {
  return SEEDS.map(
    ([title, customer, description, status, priority, assignee, dueHours], index) => {
      const createdAt = new Date(now - (index + 3) * 3_600_000).toISOString();
      return {
        id: `NS-${1041 + index}`,
        title,
        customer,
        email: `support@${customer.toLowerCase().replace(/[^a-z]/g, '')}.example`,
        description,
        status,
        priority,
        assignee,
        createdAt,
        dueAt: new Date(now + dueHours * 3_600_000).toISOString(),
        activity: [
          {
            id: `seed-${index}`,
            message: 'Ticket received through the customer portal.',
            createdAt,
          },
        ],
      };
    },
  );
}
