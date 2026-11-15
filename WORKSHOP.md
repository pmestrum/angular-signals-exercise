# Angular Signals migration workshop

## Goal

Migrate an existing Angular 22 application incrementally without changing its
customer-support behavior. Start from a working RxJS implementation, not an
intentionally broken application. Do not replace every Observable just because
Signals exist.

Suggested duration: 2-3 hours. Prerequisites: standalone components, RxJS basics,
typed reactive forms, and familiarity with `signal` and `computed`.

## 0. Establish the baseline (10 minutes)

Run the application and its tests using the README. Select an open ticket,
change its owner, add a note, and save. Create another ticket. Combine filters.
Simulate an API outage, attempt a save, restore the API, and resubmit the draft.

Trace the two flows:

```text
UI event -> EventEmitter -> page -> store command -> HttpClient
         -> delayed demo API -> store state -> derived streams -> AsyncPipe -> inputs

Filter event -> filters BehaviorSubject -> debounced query + immediate dropdowns
             -> combineLatest -> pure projection -> ticket list
```

Locate every `BehaviorSubject`, `AsyncPipe`, `EventEmitter`, `@Input`,
`@Output`, and `ngOnChanges` in `src/app`. Classify each value as source state,
derived state, editable draft, or asynchronous event stream.

## 1. Migrate leaf component contracts (20 minutes)

Begin with `queue-summary.component.ts` and `ticket-list.component.ts`.
Replace decorator inputs with `input` / `input.required`, and outputs with `output`.
Update template and class reads. Keep the same public binding names.

Then migrate the filters component. Keep its immutable, controlled update
contract: a changed field emits a new filters object, never mutates the input.
Discuss whether `model` adds value here, rather than automatically converting
every input/output pair into two-way binding.

Acceptance:

- Required inputs remain required.
- The selected ticket remains visually highlighted.
- A keyboard-activated ticket button emits the same ID.
- All dropdown values, labels, filtering behavior, and sort orders are unchanged.
- No parent needs knowledge of how a child stores its inputs.

## 2. Convert synchronous source and derived state (30 minutes)

In `ticket-store.service.ts`, identify state that is owned synchronously by the
page: tickets, filters, selected ID, loading/saving flags, errors, and notices.
Convert suitable private `BehaviorSubject`s to private writable Signals with
read-only public access.

Replace derived filtering, selection, and totals with `computed` where appropriate.
Reuse `filterTickets` and `summarizeTickets`; do not duplicate domain logic.
Adapt callers and tests as public state APIs change.

Acceptance:

- State updates are immutable and owned by the store.
- Sorting never rearranges the source array.
- Totals describe the full queue regardless of filters.
- Filtering does not discard selection.
- Replacing a ticket updates both the list and the selected detail.
- No effect copies one derivable value into another Signal.

Discussion: a computed that calls `Date.now()` does not magically update as time
passes. Keep the minute clock reactive and pass its value into overdue projections.

## 3. Keep the asynchronous semantics (25 minutes)

Retain `HttpClient` Observables. Preserve cancellation on refresh, 250 ms search
debounce, and protection against duplicate writes. Bridge selected boundaries
with `toSignal` and/or `toObservable` instead of rewriting every RxJS pipeline.

Create each bridge once in an injection context, not in a getter or template
helper. Give it an appropriate initial value. Use `requireSync` only for a source
that really emits synchronously: HTTP, timers, and debounced streams do not.

Acceptance:

- Dropdowns remain immediate; only text search is debounced.
- A cancelled refresh cannot replace newer data.
- A double-click cannot create two tickets or two activity notes.
- Read and write errors remain distinct and recoverable.
- Failed refresh preserves the last successful data.
- Failed save preserves the form draft.
- Subscriptions and timers end when the page/store is destroyed.

Discussion: `switchMap` is useful for replaceable reads, but dangerous as a default
for writes to a real server. Client cancellation cannot guarantee that a real
server has not already committed a write. This simulator only commits after its
delay, so distinguish that teaching convenience from production behavior.

## 4. Remove presentation-only AsyncPipe usage (15 minutes)

Update `tickets-page.component.html` to read signal values. Decide whether a
computed view model is helpful, or whether direct state reads are clearer.
Do not independently subscribe to the same cold HTTP Observable for each card.
Keep any remaining `AsyncPipe` where it is genuinely the appropriate boundary.

Acceptance:

- Loading, save progress, errors, and success notifications render immediately.
- The application remains zoneless and `OnPush`.
- Do not add Zone.js, manual `detectChanges`, or a blanket effect to make it render.
- Multiple template reads do not create multiple API requests.

## 5. Handle editable drafts deliberately (25 minutes)

Migrate the detail and creation inputs/outputs, including their `ngOnChanges`
reset behavior. The selected ticket is server state; the form is a local draft.
Do not bind an editable control directly to a read-only input and mutate the ticket.

Keep classic reactive forms during the core workshop. Decide explicitly how an
input change resets the form. A narrowly scoped effect that synchronizes an
external form API can be appropriate; an effect that copies arbitrary derived
application state usually is not.

For an optional separate exercise, model an editable draft using `linkedSignal`
and compare its reset behavior with the reactive-form version. Do not attempt
to migrate forms, state, and HTTP all at once.

Acceptance:

- Switching tickets loads the new ticket's fields and clears the previous detail draft.
- A failed write never clears typed text.
- A successful save adds exactly one activity entry.
- Successful creation clears only the creation form and selects the new ticket.
- Whitespace-only values, malformed email, and oversized notes remain invalid.
- Save controls remain disabled while another write or refresh is in flight.

## Final behavior checklist (15 minutes)

Run the build and test suite, updating tests to the new public state API where
necessary. Then manually exercise:

1. Load the queue; confirm 12 tickets, 10 active, 3 unassigned, and 2 resolved.
2. Search for `acme`, then combine status, priority, and owner filters.
3. Select a ticket, filter it out, and confirm its details remain available.
4. Resolve an open ticket and observe both its row and whole-queue totals.
5. Create a valid ticket; confirm a unique ID, unassigned owner, and deadline.
6. Simulate an outage, attempt a refresh, and confirm old data remains visible.
7. Attempt a save offline; reconnect and retry without retyping the draft.
8. Double-submit while saving; confirm only one mutation and activity entry.
9. Check keyboard navigation and a narrow viewport.

Overdue totals depend on the clock and can increase during a long session.
Reloading the browser resets data and deadlines relative to the new session.

## Facilitator notes

There is no pre-migrated solution hidden in the starter. Work in small,
buildable steps and discuss tradeoffs rather than rewarding the fewest RxJS imports.
Automated Angular migrations can be useful for decorator syntax; compare their
output with the manual leaf migration, and inspect lifecycle behavior separately.

The meaningful lessons are ownership, pure derivation, asynchronous semantics,
and rendering notifications. Signals are not a substitute for server persistence,
validation, error recovery, or request-concurrency policy.

Possible extensions after the core workshop: route-backed selection, URL query
filters, optimistic updates with rollback, or a real backend. These are deliberately
not part of the baseline migration because each introduces an independent behavior change.
