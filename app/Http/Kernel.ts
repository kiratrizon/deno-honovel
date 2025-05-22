class Kernel {
  protected middlewareGroups: { [key: string]: string[] } = {
    web: [],
    api: [],
  };

  protected routeMiddleware: { [key: string]: unknown } = {};
}

export default Kernel;
