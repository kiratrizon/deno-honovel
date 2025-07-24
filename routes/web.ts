import { DB, Route } from "Illuminate/Support/Facades/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});

Route.get("/", async () => {
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;

  // Subquery: Messages in last 7 days
  const messages = DB.table("messages")
    .select("user_id", DB.raw("COUNT(*) as total_messages"))
    .where("created_at", ">=", DB.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
    .groupBy("user_id");

  // Subquery: Tips in current month
  const tips = DB.table("tips")
    .select("sender_id as user_id", DB.raw("SUM(amount) as total_tips"))
    .where("created_at", ">=", firstDayOfMonth)
    .groupBy("sender_id");

  const messagesSub = DB.raw(`(${messages.toSql()}) as m`);
  const tipsSub = DB.raw(`(${tips.toSql()}) as t`);

  const query = DB.table("users as u")
    .select("u.id", "u.name", "m.total_messages", "t.total_tips")
    .join(messagesSub, "m.user_id", "=", "u.id")
    .mergeBindings(messages)
    .join(tipsSub, "t.user_id", "=", "u.id")
    .mergeBindings(tips)
    .joinSub(
      DB.table("teachers as t").select(
        "t.user_id",
        DB.raw("COUNT(*) as total_classes")
      ),
      "td",
      (td) => {
        td.on("td.user_id", "=", "u.id");
        td.where("td.status", "=", "completed");
      }
    )
    .where("m.total_messages", ">=", 5)
    .whereBetween("u.created_at", [
      DB.raw("DATE_SUB(NOW(), INTERVAL 1 MONTH)"),
      DB.raw("NOW()"),
    ]) // ← this part shows DB.raw in whereBetween
    .orderBy("t.total_tips", "desc")
    .limit(10);

  return response().json({
    sql: query.toSql(),
    bindings: query.getBindings(),
  });
});
