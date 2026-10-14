/**
 * A tiny stand-in for the Supabase admin client, for tests of server logic that
 * reads and writes a few tables. It does not run SQL: every query is recorded as
 * a Call (table, operation, values, equality filters) and answered by a function
 * the test supplies, so a test states exactly what the database would say and
 * then checks exactly what was asked.
 */

export interface Call {
  table: string;
  op: "select" | "insert" | "update";
  values?: Record<string, unknown>;
  filters: Record<string, unknown>;
}

export interface Reply {
  data: unknown;
  error: { code?: string; message: string } | null;
}

export function createFakeAdmin(respond: (call: Call) => Reply, calls: Call[]) {
  return {
    from(table: string) {
      const call: Call = { table, op: "select", filters: {} };
      const run = () => {
        calls.push({ ...call, filters: { ...call.filters } });
        return Promise.resolve(respond(call));
      };
      const builder: Record<string, unknown> = {
        select: () => builder,
        insert: (values: Record<string, unknown>) => {
          call.op = "insert";
          call.values = values;
          return builder;
        },
        update: (values: Record<string, unknown>) => {
          call.op = "update";
          call.values = values;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          call.filters[column] = value;
          return builder;
        },
        limit: () => builder,
        maybeSingle: run,
        single: run,
        then: (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) => run().then(resolve, reject),
      };
      return builder;
    },
  };
}

export const ok = (data: unknown = null): Reply => ({ data, error: null });
export const fail = (message: string, code?: string): Reply => ({ data: null, error: { message, code } });
