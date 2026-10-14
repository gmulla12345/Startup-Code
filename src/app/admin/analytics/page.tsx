import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

// Protected twice over: the proxy turns away anyone who is not an admin before
// this page renders, and the check below does the same on the server. The data
// comes from SQL views that only the service role can read (see
// db/migrations/20261015_01_analytics_events.sql), so nothing here is reachable
// from the browser's own database key.

async function requireAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.app_metadata?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) redirect("/home");
}

interface EventCount {
  event: string;
  last_7d: number;
  last_30d: number;
  total: number;
}
interface SignupRow {
  src: string;
  code: string;
  signups: number;
  signups_7d: number;
  signups_30d: number;
  last_signup_at: string | null;
}
interface ReturnRow {
  src: string;
  code: string;
  users: number;
  week2_eligible: number;
  week2_returned: number;
  week2_return_pct: number | null;
  week4_eligible: number;
  week4_returned: number;
  week4_return_pct: number | null;
}
interface SavesRow {
  src: string;
  code: string;
  users: number;
  users_with_save: number;
  users_with_save_pct: number | null;
  total_saves: number;
  saves_per_user: number | null;
  median_saves: number | null;
}
interface EventsBySource {
  src: string;
  code: string;
  event: string;
  events: number;
}
interface PromoRow {
  code: string;
  started: number;
  redeemed: number;
  redeemed_7d: number;
  last_redeemed_at: string | null;
  month_ended: number;
  paid_after: number;
  paid_after_pct: number | null;
}

// The funnel, in the order a person moves through it.
const FUNNEL = [
  "students_page_view",
  "signup_started",
  "signup_completed",
  "edu_verified",
  "first_place_view",
  "place_saved",
  "surprise_me_used",
  "promo_redeemed",
  "premium_started",
] as const;

const th = "p-3 text-left text-xs font-medium uppercase tracking-wide text-foreground-subtle whitespace-nowrap";
const td = "p-3 text-foreground-muted whitespace-nowrap";

function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty: boolean }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken">
          <tr>
            {head.map((h, i) => (
              <th key={i} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={head.length} className="p-4 text-foreground-subtle">
                Nothing recorded yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {note && <p className="mt-1 mb-4 max-w-3xl text-sm text-foreground-muted">{note}</p>}
      {!note && <div className="mb-4" />}
      {children}
    </section>
  );
}

const pct = (value: number | null) => (value == null ? "not yet" : `${value}%`);
const label = (value: string) => (value === "(none)" ? <span className="text-foreground-subtle">(none)</span> : value);

export default async function AdminAnalyticsPage() {
  await requireAdminPage();
  const admin = createAdminClient();

  const [eventCounts, signups, returns, saves, bySource, promos] = await Promise.all([
    admin.from("v_event_counts").select("*"),
    admin.from("v_signups_by_src_code").select("*").order("signups", { ascending: false }),
    admin.from("v_return_rates_by_src_code").select("*").order("users", { ascending: false }),
    admin.from("v_saves_by_src_code").select("*").order("users", { ascending: false }),
    admin.from("v_events_by_src_code").select("*"),
    admin.from("v_promo_redemptions_by_code").select("*").order("redeemed", { ascending: false }),
  ]);

  const counts = new Map(((eventCounts.data ?? []) as EventCount[]).map((r) => [r.event, r]));

  // Pivot (src, code) x event for the funnel table.
  const pivot = new Map<string, { src: string; code: string; byEvent: Record<string, number> }>();
  for (const row of (bySource.data ?? []) as EventsBySource[]) {
    const key = `${row.src}\u0000${row.code}`;
    const entry = pivot.get(key) ?? { src: row.src, code: row.code, byEvent: {} };
    entry.byEvent[row.event] = row.events;
    pivot.set(key, entry);
  }
  const funnelRows = [...pivot.values()].sort(
    (a, b) => (b.byEvent.signup_completed ?? 0) - (a.byEvent.signup_completed ?? 0)
  );

  const errors = [eventCounts, signups, returns, saves, bySource, promos].map((r) => r.error?.message).filter(Boolean);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground mb-2">Analytics</h1>
      <p className="mb-8 max-w-3xl text-sm text-foreground-muted">
        Where people come from and whether they stay. Every row is grouped by the <code>src</code> and{" "}
        <code>code</code> in the link they arrived with, for example{" "}
        <code>/students?code=CAMPUS-CLUB&amp;src=poster-library</code>. Accounts created before tracking began,
        and visitors who arrived without a tagged link, appear as (none).
      </p>

      {errors.length > 0 && (
        <p className="mb-6 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3 text-sm text-foreground">
          Some data could not be read: {errors.join("; ")}
        </p>
      )}

      <Section title="Events">
        <Table head={["Event", "Last 7 days", "Last 30 days", "All time"]} empty={false}>
          {ANALYTICS_EVENTS.map((event) => (
            <tr key={event} className="border-b border-border last:border-0">
              <td className="p-3 text-foreground">{event}</td>
              <td className={td}>{counts.get(event)?.last_7d ?? 0}</td>
              <td className={td}>{counts.get(event)?.last_30d ?? 0}</td>
              <td className={td}>{counts.get(event)?.total ?? 0}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Signups by source and code"
        note="Counted from the user record, so it includes everyone, with the campaign saved at the moment they signed up."
      >
        <Table
          head={["Source", "Code", "Signups", "Last 7 days", "Last 30 days", "Latest"]}
          empty={(signups.data ?? []).length === 0}
        >
          {((signups.data ?? []) as SignupRow[]).map((r) => (
            <tr key={`${r.src}|${r.code}`} className="border-b border-border last:border-0">
              <td className="p-3 text-foreground">{label(r.src)}</td>
              <td className="p-3 text-foreground">{label(r.code)}</td>
              <td className={td}>{r.signups}</td>
              <td className={td}>{r.signups_7d}</td>
              <td className={td}>{r.signups_30d}</td>
              <td className={td}>{r.last_signup_at ? new Date(r.last_signup_at).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Return rate"
        note={
          <>
            A user returned in <strong>week 2</strong> if they did something (viewed a place, saved one, used Surprise
            Me, shared, redeemed a code) 7 to 14 days after signing up, and in <strong>week 4</strong> if they did 21 to
            28 days after. A user counts only once that window has fully passed, so a recent group shows &ldquo;not
            yet&rdquo; rather than a falsely low number. Opening the app and only scrolling is not recorded as an
            action, so these rates are a floor.
          </>
        }
      >
        <Table
          head={["Source", "Code", "Users", "Week 2", "Week 2 rate", "Week 4", "Week 4 rate"]}
          empty={(returns.data ?? []).length === 0}
        >
          {((returns.data ?? []) as ReturnRow[]).map((r) => (
            <tr key={`${r.src}|${r.code}`} className="border-b border-border last:border-0">
              <td className="p-3 text-foreground">{label(r.src)}</td>
              <td className="p-3 text-foreground">{label(r.code)}</td>
              <td className={td}>{r.users}</td>
              <td className={td}>
                {r.week2_returned} of {r.week2_eligible}
              </td>
              <td className="p-3 text-foreground whitespace-nowrap">{pct(r.week2_return_pct)}</td>
              <td className={td}>
                {r.week4_returned} of {r.week4_eligible}
              </td>
              <td className="p-3 text-foreground whitespace-nowrap">{pct(r.week4_return_pct)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Promo codes"
        note={
          <>
            Student codes, each worth one free month. <strong>Started</strong> is a verified student who reached
            checkout with the code; <strong>redeemed</strong> is one who completed it. <strong>Month ended</strong> counts
            redemptions at least 35 days old, and <strong>paid after</strong> is how many of those went on to pay, so a
            recent code shows &ldquo;not yet&rdquo; rather than a falsely low rate. Who redeemed is not shown here; the
            table is <code>promo_redemptions</code>.
          </>
        }
      >
        <Table
          head={["Code", "Started", "Redeemed", "Last 7 days", "Latest", "Month ended", "Paid after", "Paid rate"]}
          empty={(promos.data ?? []).length === 0}
        >
          {((promos.data ?? []) as PromoRow[]).map((r) => (
            <tr key={r.code} className="border-b border-border last:border-0">
              <td className="p-3 text-foreground">{r.code}</td>
              <td className={td}>{r.started}</td>
              <td className={td}>{r.redeemed}</td>
              <td className={td}>{r.redeemed_7d}</td>
              <td className={td}>{r.last_redeemed_at ? new Date(r.last_redeemed_at).toLocaleDateString() : "—"}</td>
              <td className={td}>{r.month_ended}</td>
              <td className={td}>
                {r.paid_after} of {r.month_ended}
              </td>
              <td className="p-3 text-foreground whitespace-nowrap">{pct(r.paid_after_pct)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Saves per user"
        note="Places each user currently has saved, by the source they signed up from. Per-user rows are in the v_saves_per_user view."
      >
        <Table
          head={["Source", "Code", "Users", "With a save", "Share with a save", "Total saves", "Per user", "Median"]}
          empty={(saves.data ?? []).length === 0}
        >
          {((saves.data ?? []) as SavesRow[]).map((r) => (
            <tr key={`${r.src}|${r.code}`} className="border-b border-border last:border-0">
              <td className="p-3 text-foreground">{label(r.src)}</td>
              <td className="p-3 text-foreground">{label(r.code)}</td>
              <td className={td}>{r.users}</td>
              <td className={td}>{r.users_with_save}</td>
              <td className="p-3 text-foreground whitespace-nowrap">{pct(r.users_with_save_pct)}</td>
              <td className={td}>{r.total_saves}</td>
              <td className={td}>{r.saves_per_user ?? "—"}</td>
              <td className={td}>{r.median_saves ?? "—"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Funnel by source and code"
        note="Events recorded with that source and code. Events that have not started firing yet (sharing) show 0 until that feature ships."
      >
        <Table head={["Source", "Code", ...FUNNEL]} empty={funnelRows.length === 0}>
          {funnelRows.map((r) => (
            <tr key={`${r.src}|${r.code}`} className="border-b border-border last:border-0">
              <td className="p-3 text-foreground">{label(r.src)}</td>
              <td className="p-3 text-foreground">{label(r.code)}</td>
              {FUNNEL.map((event) => (
                <td key={event} className={td}>
                  {r.byEvent[event] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}
