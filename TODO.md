# To-do

Running list of what's left. Not urgent — pick these up whenever.

## Demo polish

- [ ] **Hover/click help hints in demo mode** — small "?" icons next to key
      buttons/fields (add household, book appointment, etc.) that show a
      tooltip explaining what they do, only when clicked or hovered — no
      automatic tour, visitor discovers them at their own pace.
      Still to decide: show only in "Try the demo" mode, or also to a real
      groomer the first time they finish onboarding.

## Phase 2+ (see README → "What's next")

- [ ] Messaging (BYOA Twilio, two-way SMS threaded by pet)
- [ ] Automations (reminders, confirmations, rebook nudges)
- [ ] Billing (Stripe subscriptions, coupons/discounts — see chat notes:
      Stripe Dashboard coupons handle both pre- and post-subscription
      discounts, no app changes needed)
- [ ] Polish / beta

## Engineering follow-ups (see README → "Suggested next steps")

- [ ] CI on PRs (run `npm run build` / `tsc -b` before merge, not just at deploy)
- [ ] Automated Firestore rules tests (`@firebase/rules-unit-testing`)
- [ ] Code-split the Firebase SDK bundle (~960 KB currently)
