import { FormFile } from "multiParser2";
import Storage from "Illuminate/Support/Facades/Storage.ts";

export default class HonoFile {
  public name: string;
  public filename: string | undefined;
  public contentType: string | undefined;
  public size: number | undefined;

  #content: FormFile["content"];
  constructor(file: FormFile) {
    if (!file) {
      throw new Error("File is empty");
    }

    this.name = file.name;
    this.filename = file.filename;
    this.contentType = file.contentType;
    this.size = file.size;
    this.#content = file.content;
  }

  /**
   * Save the uploaded file to the specified path and what disk to use.
   * @param disk The disk to use, defaults to 'local'.
   * @param path The path where the file should be saved.
   */
  async store(disk: string, path: string): Promise<string | null> {
    const storage = Storage.disk(disk);
    try {
      return await storage.put(path, this.#content);
    } catch (error: any) {
      consoledeno.error(
        "Error storing file:",
        error.message ? error.message : error
      );
      return null;
    }
  }

  /**
   * Check if the file is valid based on its content type
   * @returns Whether the file is valid based on its content type
   */
  valid(): boolean {
    return !!this.contentType;
  }

  _getContent(): FormFile["content"] {
    return this.#content;
  }
}
