declare module "hono" {
  interface ContextRenderer {
    (content: string, head: Record<string, string>):
      | Response
      | Promise<Response>;
  }
}
export {};