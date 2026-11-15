# Northstar Service Desk

A realistic **Angular 22** starter for an Angular Signals migration workshop.
This is deliberately the **before** version: application code uses Observables,
`AsyncPipe`, `@Input`, `@Output`, and `EventEmitter`, not Signals.

## Run it

Use Node 24.15+ (24 LTS recommended) and npm.

```sh
cd workshop-app
npm ci
npm start
```

Open <http://localhost:4200>. If your terminal is already in `workshop-app`, omit
the `cd` command. No account, API key, external service, or backend process is needed.

```sh
npm run build
npm test -- --watch=false
```

## The application

Northstar is a customer support team's shared inbox. It includes:

- Twelve seeded requests with customers, owners, priorities, SLA deadlines, and activity.
- Debounced text search, combined status/priority/owner filters, and three sort orders.
- Whole-queue totals for active, unassigned, overdue, and resolved tickets.
- A detail editor for assignment, status, priority, and internal notes.
- Validated ticket creation and activity history for successful writes.
- Loading states, empty results, refresh, failed-request recovery, and duplicate-submit protection.
- Responsive layout, labeled forms, keyboard-operable ticket buttons, and live status messages.

**Simulate API outage** makes subsequent requests fail with HTTP 503. Refresh or
save to see the error; restore the connection and retry. Failed writes retain drafts.
Data lives in memory: **Refresh queue** refetches the current data, while reloading
the browser resets the demo. Nothing is sent to a remote API, and there is no authentication.

## Deliberate migration surfaces

| Starting pattern                                           | Where                                        | Migration discussion                                          |
| ---------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Private `BehaviorSubject` state with read-only Observables | `tickets/ticket-store.service.ts`            | `signal()` and read-only signal APIs                          |
| `combineLatest`, `map`, derived streams                    | Store filters, totals, selection, view model | `computed()` vs asynchronous pipelines                        |
| `AsyncPipe`                                                | `tickets/tickets-page.component.html`        | Template signal reads and `toSignal()`                        |
| `@Input` decorators                                        | Filters, list, summary, detail, creation     | `input()` / `input.required()`                                |
| `@Output` + `EventEmitter`                                 | Filters, list, detail, creation              | `output()`; when `model()` is appropriate                     |
| `ngOnChanges` resetting form drafts                        | Detail and creation components               | Controlled inputs, editable state, `linkedSignal()` tradeoffs |
| HTTP Observables                                           | `core/ticket-api.service.ts`                 | Keep asynchronous boundaries; bridge at the consumer          |
| Debounce, cancellation, write concurrency                  | Store                                        | Keep RxJS where its semantics matter                          |
| Minute clock stream                                        | Store `now$`                                 | Time is a dependency, not an implicit computed input          |

Start with [WORKSHOP.md](WORKSHOP.md) for exercises, behavior contracts, and facilitator notes.
There is intentionally no completed Signals solution alongside the starter.

## Structure

```text
src/app/
  app.config.ts                  Router and HTTP providers
  app.routes.ts                  Lazy-loaded queue page
  core/
    ticket.model.ts              Domain types and pure projections
    ticket.seed.ts               Relative-date fixture data
    ticket-api.service.ts        Typed HttpClient boundary
    demo-api.interceptor.ts      Delayed, validated, in-memory HTTP simulator
  tickets/
    ticket-store.service.ts      Page-scoped RxJS state and commands
    tickets-page.component.*    Container / AsyncPipe view model
    ticket-filters.component.ts Controlled filter inputs and outputs
    queue-summary.component.ts  Whole-queue metrics
    ticket-list.component.ts    Selection output and deadline display
    ticket-detail.component.*   Editable draft and activity timeline
    create-ticket.component.*   Validated creation form
```

All components use `OnPush`. Angular 22's zoneless default is preserved: there is
no Zone.js dependency or zone-based change-detection provider. `AsyncPipe`, input
updates, and template events provide the necessary rendering notifications.
Strict TypeScript and template checking are enabled.

## Domain rules and boundaries

Search matches ID, title, customer, or email after a 250 ms pause. Dropdown
filters apply immediately. Summary cards always describe the entire queue, not
just filtered results. Filtering does not close the selected ticket.

Resolved tickets are excluded from active, unassigned, and overdue counts.
Overdue means an unresolved ticket whose deadline is strictly before the current
time; the clock refreshes every minute. Creation assigns SLA deadlines of 2, 8,
24, or 72 hours for urgent, high, medium, or low priority. Reprioritization does
not renegotiate the original deadline.

Writes are pessimistic and serialized by ignoring duplicate in-flight submissions.
While saving, selection, refresh, and other writes are blocked. While refreshing,
writes are blocked so an older response cannot overwrite a successful mutation.
Read errors preserve the last loaded data; write errors preserve the editable draft.
Selecting another ticket or refreshing successfully replaces a detail draft.
Creation drafts reset only after a successful create.

The simulator intercepts same-origin `/api/` requests and adds 450 ms latency.
Unsubscribing cancels the delayed operation before it mutates server state.
Unknown endpoints, malformed payloads, no-op updates, and unknown ticket IDs
produce explicit HTTP errors. It is a teaching substitute for a backend, not a
production security, persistence, or multi-user implementation.

## Behavior safety net

The generated CLI's Vitest runner covers pure filters and totals, HTTP behavior,
validation, cancellation, RxJS debounce/concurrency/recovery, decorator contracts,
and zoneless page interaction. Keep the behavior, not the internal RxJS API, as
the migration's acceptance criterion. Store tests will need mechanical adaptation
when public Observables become Signals; the UI workflows should remain unchanged.
