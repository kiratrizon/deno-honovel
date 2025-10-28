export type RenderFn = (
  template: string,
  data: Record<string, unknown>
) => Promise<string>;

export type ViewEngine = {
  render: RenderFn;
};

export interface ViewParams {
  viewName?: string;
  data?: Record<string, unknown>;
  mergeData?: Record<string, unknown>;
}

declare class HonoView {
  constructor(params?: ViewParams);

  element(viewName: string, data?: Record<string, unknown>): string;

  static init(): void;

  getView(): {
    viewFile: string;
    data: Record<string, unknown>;
  };
}

export default HonoView;
