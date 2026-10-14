# Privacy policy: proposed additions

Drafted 2026-10-14. **Nothing here is live.** The live page is `src/app/(marketing)/privacy/page.tsx` and has not been edited. When you approve, I apply this to that page (and update its "Last updated" date), and it goes live with the next deploy.

This is a draft of plain-language policy text, not legal advice. Everything stated as fact below was checked against the code and the database; items marked **[DECIDE]** need a choice from you, and the last section lists questions for a lawyer.

The wording follows the existing policy: first person plural, an "In short" line where a section has one, and the same section numbers.

---

## What these additions cover

Since the last update (August 29, 2026) we added: a campaign cookie, measurement events, usage records for cost limits, school-email verification, and a school waitlist.

## Summary of key points (add one bullet)

> **Do we collect information about your school?** Only if you give us a school email address or join our waitlist. We use the address to confirm it is a school address and to record which school it belongs to. We do not receive student records from any school.

## 1. What information do we collect?

**Personal information you disclose to us** (add two list items):

> - School email addresses, if you sign up with one
> - If you join our school waitlist: your email address and, if you choose to give it, the name of your school

**Add after the "Social login data" paragraph:**

> **School verification.** If you sign up with an email address ending in .edu, we send a confirmation link to that address. When you open it, we record that the address is a verified school address and, where we recognize its domain, which school it belongs to. We do not receive student records, enrollment details, or grades from any school, and we do not tell any school that you use {brand.name}.

**Information automatically collected** (add three list items):

> - *Campaign link information.* When you arrive through a link that carries a source or campaign label (for example, a poster or a club's link), we remember those labels in a cookie for 30 days and save them with your account if you sign up. They describe the link, not you.
> - *Measurement events.* We record when certain things happen: visiting our students page, starting and completing signup, verifying a school email, opening your first place, saving a place, using Surprise Me, and starting a Premium subscription. If you are signed in, an event is linked to your account; every event also carries the campaign labels above. Events do not contain your name, your email address, or anything you type.
> - *Service usage records.* To keep the Services reliable and to control costs, we record each request we make to our AI and places providers: which feature triggered it, how much was used, and its estimated cost, linked to your account. We use these records to apply daily limits that protect the Services from abuse.

## 2. How do we process your information? (add four bullets)

> - **To verify school email addresses.** To confirm that an address is a school address and to record which school it belongs to.
> - **To keep a school waitlist.** To write to people who asked to hear when we reach their school.
> - **To understand where people come from.** To see which links and schools bring people to {brand.name}, using the campaign labels and measurement events described above.
> - **To keep the Services within safe limits.** Using the service usage records described above, we apply daily limits on AI and places requests per account.

*(When campus features ship, add: "To show you what is relevant at your school." I left it out because it would describe something that does not exist yet.)*

## 4. When and with whom do we share your personal information?

No new vendors: the new data lives in the same database (Supabase) and is processed by the same providers already listed. Add one sentence after the vendor list:

> Email addresses on our school waitlist are kept in our database and are not shared with schools or anyone else.

## 5. Do we use cookies and other tracking technologies?

**Add a paragraph:**

> **Campaign cookie.** If you arrive through a link carrying a source or campaign label, we set a first-party cookie named `zolo_attr` that holds those labels for 30 days. It is used to credit the link that brought you if you sign up, and to attach the same labels to the measurement events described above. It does not contain your name, email address, or any identifier of yours, and we do not use it for advertising.

**Existing gap to close at the same time (not from the new work):** the policy says we use cookies only for sign-in and security, but the site also loads **Google Analytics 4** and **Endorsely** (affiliate-click tracking) on every page (see `src/app/layout.tsx`). Both normally set cookies or similar identifiers. The section should name them and say what they are for, or they should be removed. **[DECIDE]** which: I can draft the wording once you confirm what you want each to do, or take them out.

## 9. How long do we keep your information?

**Add:**

> - **Campaign cookie:** 30 days.
> - **Measurement events and service usage records:** when you delete your account, the link to your account is removed and what remains cannot be tied to you.
> - **School waitlist:** until we write to you about your school, or until you ask us to remove your address, whichever comes first. **[DECIDE]** whether to add an outer limit; I would suggest deleting entries 24 months after they are added.

(Facts checked: deleting an account sets the user reference on events and usage rows to null; it does not delete the row. The waitlist has no automatic expiry today. If you choose an outer limit, I will add a scheduled cleanup.)

## 14. Do United States residents have specific privacy rights?

In the "Categories of personal information we collect" table, **leave** the existing row `Education information | Student records | No` (we receive none) and **add** a row:

> School affiliation | That your email is a verified school address, and which school it belongs to (not student records) | Yes

The existing "Internet/network activity" row already covers measurement events.

---

## Questions for a lawyer

1. **Education information.** Whether "school affiliation" derived from an email domain needs to be treated as "education information" under California's categories, even though no school record is involved. I drafted it as a separate row with a clear note.
2. **Cookie consent.** The policy has no section for the EU or UK, and the site has no cookie banner. A campaign cookie and analytics cookies are normally fine for U.S. visitors, but if you expect visitors from the EU, UK, or similar, consent rules differ.
3. **Google Analytics 4 and Endorsely** (see section 5): the existing policy does not mention them.
4. **Students under 18.** The policy says 16 and over. A small number of college students, such as dual-enrollment students, may be under 18. Whether that needs any additional treatment.
5. **Promo codes** (next phase) will record who redeemed which code and when. That will need one more addition when it ships.

## What I did not claim

- No retention period was invented: the only periods stated are ones the system does today (30-day cookie, account deletion anonymizes events) or are marked **[DECIDE]**.
- Nothing says we sell or share data with schools, because we do not.
- Nothing says anything about "student records", because we receive none.
