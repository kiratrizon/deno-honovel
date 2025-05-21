interface IGroupParams {
  prefix?: string;
  middleware?:
    | string
    | (() => Promise<unknown>)
    | (string | (() => Promise<unknown>))[];
  as?: string;
}

export interface IGroupRoute {
  new (id: number): this;
  middleware(handler: string | (() => Promise<unknown>)): this;
  group(handler: IGroupParams): void;
}

export interface IRoute {
  group(): void;
}
