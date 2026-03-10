import Application from "Illuminate/Foundation/Application.ts";
import BindContent from "App/Http/Middlewares/BindContent.ts";

export default Application.withRouting({
  web: async () => await import("../routes/web.ts"),
  api: async () => await import("../routes/api.ts"),
}).withMiddleware((middleware)=>{
  middleware.alias({
    bind_content: BindContent,
  });
}).create();
