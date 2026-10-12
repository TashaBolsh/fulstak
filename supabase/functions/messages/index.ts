// supabase/functions/messages/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
    fetch: withSupabase(
        { auth: ["none"] },
        async (req: Request, ctx: any): Promise<Response> => {
            const url = new URL(req.url);
            const clientId = url.searchParams.get("client_id");
            const limit = Number(url.searchParams.get("limit") ?? 30);
            const before = url.searchParams.get("before"); // ISO-дата для курсора

            if (!clientId) {
                return Response.json(
                    { error: "Query parameter 'client_id' is required" },
                    { status: 400 }
                );
            }

            let query = ctx.supabaseAdmin
                .from("messages")
                .select("*")
                .eq("client_id", Number(clientId))
                .order("created_at", { ascending: false }) // свежие сначала
                .limit(limit);

            // Если передан курсор — берём сообщения старше него
            if (before) {
                query = query.lt("created_at", before);
            }

            const { data, error } = await query;

            if (error) {
                return Response.json({ error: error.message }, { status: 500 });
            }

            // Определяем, есть ли ещё сообщения (hasMore)
            const hasMore = data.length === limit;
            // Курсор для следующей страницы = самый старый загруженный
            const nextCursor =
                data.length > 0 ? data[data.length - 1].created_at : null;

            return Response.json({
                messages: data,
                nextCursor,
                hasMore,
            });
        }
    ),
};