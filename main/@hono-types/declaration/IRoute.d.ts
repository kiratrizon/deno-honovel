import BaseController from "../../Base/BaseController.ts";

interface IGroupParams {
  prefix?: string;
  middleware?:
    | string
    | (() => Promise<unknown>)
    | (string | (() => Promise<unknown>))[];
  as?: string;
}

export type ICallback = (
  httpObj: HttpHono,
  ...args: unknown[]
) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : never;
}[keyof T];

export interface IGroupRoute {
  middleware(
    handler: string | string[] | (() => Promise<unknown>)
  ): IGroupRoute;
  prefix(uri: string): IGroupRoute;
  domain(domain: string): IGroupRoute;
  name(name: string): IGroupRoute;
  as(name: string): IGroupRoute; // alias for name()
  where(key: string, regex: string): IGroupRoute;
  whereNumber(key: string): IGroupRoute;
  whereAlpha(key: string): IGroupRoute;
  whereAlphaNumeric(key: string): IGroupRoute;
  namespace(namespace: string): IGroupRoute;
  group(param: IGroupParams, callback: () => void): void;
}

export interface IMethodRoute {
  name(name: string): IMethodRoute;
  middleware(
    handler: string | string[] | (() => Promise<unknown>)
  ): IMethodRoute;
  where(key: string, regex: string): IMethodRoute;
  whereNumber(key: string): IMethodRoute;
  whereAlpha(key: string): IMethodRoute;
  whereAlphaNumeric(key: string): IMethodRoute;
}

export interface IRoute extends IGroupRoute {
  get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  post<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  put<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  delete<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  patch<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  options<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  head<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  any<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  match<T extends BaseController, K extends KeysWithICallback<T>>(
    methods: string[],
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;
  redirect(uri: string, destination: string, status?: number): void;
  view(uri: string, view: string, data?: object): void;
  fallback(callback: () => unknown): void;
}
