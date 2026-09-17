FROM denoland/deno:2.7.11

WORKDIR /app

COPY . .

RUN deno install --entrypoint vendor/honovel/framework/src/hono/run-server.ts

CMD ["deno", "run", "-A", "vendor/honovel/framework/src/hono/run-server.ts"]
