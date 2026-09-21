// supabase/functions/clients/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import {withSupabase} from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["none"] }, async (_req: Request, ctx: any) => {
    const { data, error } = await ctx.supabaseAdmin
        .from("clients")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  }),
};