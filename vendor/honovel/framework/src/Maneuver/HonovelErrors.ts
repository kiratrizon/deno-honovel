export class DDError {
  constructor(private _data: unknown) {}

  public get data(): unknown {
    return this._data;
  }
}
