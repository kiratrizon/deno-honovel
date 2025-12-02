import { Route } from "Illuminate/Support/Facades/index.ts";
import ProjectController from "App/Http/Controllers/ProjectController.ts";

import {
  GraphQLObjectType,
  graphql,
  GraphQLSchema,
  GraphQLString,
} from "graphql";

Route.prefix("/portfolio")
  .middleware(["ensure_accepts_json"])
  .group(() => {
    Route.post("/projects", [ProjectController, "projects"]);
  });

Route.prefix("/portfolio").group(() => {
  Route.get("/my-resume", async () => {
    return response().download(basePath("genesis-troy-torrecampo.pdf"));
  });
});

interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

Route.any("/graphql", async ({ request }) => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        hello: {
          type: GraphQLString,
          resolve: () => "Hello, world!",
        },
        goodbye: {
          type: GraphQLString,
          resolve: () => "Goodbye, world!",
        },
      },
    }),
    mutation: new GraphQLObjectType({
      name: "Mutation",
      fields: {
        createMessage: {
          type: GraphQLString,
          args: {
            input: { type: GraphQLString },
          },
          resolve: (_, { input }) => {
            // Handle message creation logic here
            return `Message created: ${input}`;
          },
        },
      },
    }),
  });

  const {
    query = "",
    variables = {},
    operationName,
  } = request.all() as unknown as GraphQLRequest;

  const result = await graphql({
    schema,
    source: query,
    variableValues: variables,
    operationName,
  });
  return response().json(result);
});
