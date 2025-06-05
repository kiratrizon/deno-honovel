import jwt from "../../../../../config/jwt.ts";
import app from "../../../../../config/app.ts";
import debug from "../../../../../config/debug.ts";
import redis from "../../../../../config/redis.ts";
import view from "../../../../../config/view.ts";
import factory from "../../../../../config/factory.ts";
import query_trace from "../../../../../config/query_trace.ts";
import session from "../../../../../config/session.ts";
import database from "../../../../../config/database.ts";
import cors from "../../../../../config/cors.ts";
import origins from "../../../../../config/origins.ts";
import irregular_words from "../../../../../config/irregular_words.ts";
import auth from "../../../../../config/auth.ts";
import logging from "../../../../../config/logging.ts";

export default {
  jwt,
  app,
  debug,
  redis,
  view,
  factory,
  query_trace,
  session,
  database,
  cors,
  origins,
  irregular_words,
  auth,
  logging,
};
