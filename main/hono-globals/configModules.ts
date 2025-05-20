import jwt from "../../config/jwt.ts";
import app from "../../config/app.ts";
import debug from "../../config/debug.ts";
import view from "../../config/view.ts";
import factory from "../../config/factory.ts";
import query_trace from "../../config/query_trace.ts";
import database from "../../config/database.ts";
import origins from "../../config/origins.ts";
import irregular_words from "../../config/irregular_words.ts";
import auth from "../../config/auth.ts";

export default {
  jwt,
  app,
  debug,
  view,
  factory,
  query_trace,
  database,
  origins,
  irregular_words,
  auth,
};
