import { ContentfulStatusCode } from "hono/utils/http-status";
import fs from "node:fs";

type ReturnType = "html" | "json" | "file" | "download" | undefined;
type ReturnData = {
  html: string | null;
  // deno-lint-ignore no-explicit-any
  json: Record<string, any> | null;
  file: string | null;
  download: [string] | [string, string] | null;
  error: string | null;
};
class HonoResponse {
  #defaultStatusCode: ContentfulStatusCode = 200;
  #returnStatusCode: ContentfulStatusCode = 200;
  #headers: Record<string, string> = {};
  #returnData: ReturnData = {
    html: null,
    json: null,
    file: null,
    download: null,
    error: null,
  };
  #returnType: ReturnType;

  /**
   * Create a new HonoResponse instance.
   * @param html Optional initial HTML content to respond with.
   */
  constructor(html: string | null = null) {
    if (typeof html === "string" && html.trim() !== "") {
      this.#returnData.html = html;
      this.#returnType = "html";
    }
  }
  /**
   * Set a JSON response with optional status code.
   * @param data The JSON-serializable data.
   * @param statusCode Optional HTTP status code.
   */
  json(
    //   deno-lint-ignore no-explicit-any
    data: Record<string, any> | null,
    statusCode: ContentfulStatusCode = this.#defaultStatusCode
  ): this {
    try {
      this.#responseValidator("json");
      this.#returnData.json = data;
      this.#returnType = "json";
      this.#returnStatusCode = statusCode;
      return this;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.#returnData.error = error.message;
      } else {
        this.#returnData.error = String(error);
      }
      this.#returnStatusCode = 400;
      return this;
    }
  }
  /**
   * Set a single header key-value pair.
   * @param key Header name.
   * @param value Header value.
   */
  header(key: string, value: string): this {
    if (typeof key !== "string") {
      throw new Error("Header key must be a string");
    }
    this.#headers[key] = value;
    return this;
  }
  /**
   * Set HTML content to be returned with optional status code.
   * @param content HTML string.
   * @param statusCode Optional HTTP status code.
   */
  html(
    content: string,
    statusCode: ContentfulStatusCode = this.#defaultStatusCode
  ): this {
    try {
      this.#responseValidator("html");
      this.#returnData.html = content;
      this.#returnType = "html";
      this.#returnStatusCode = statusCode;
      return this;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.#returnData.error = error.message;
      } else {
        this.#returnData.error = String(error);
      }
      this.#returnStatusCode = 400;
      return this;
    }
  }
  /**
   * Set multiple headers at once.
   * @param headers Key-value pairs of headers.
   */
  withHeaders(headers: Record<string, string> = {}): this {
    if (typeof headers !== "object") {
      throw new Error("Headers must be an object");
    }
    this.#headers = { ...this.#headers, ...headers };
    return this;
  }
  /**
   * Returns all internal response data for processing by the server layer.
   */
  accessData(): {
    html: string | null;
    // deno-lint-ignore no-explicit-any
    json: Record<string, any> | null;
    file: string | null;
    download: [string] | [string, string] | null;
    error: string | null;
    headers: Record<string, string>;
    statusCode: ContentfulStatusCode;
    returnType: ReturnType;
  } {
    return {
      ...this.#returnData,
      headers: this.#headers,
      statusCode: this.#returnStatusCode,
      returnType: this.#returnType,
    };
  }
  /**
   * Set a file to send as a response.
   * @param filePath Path to the file.
   * @param statusCode Optional HTTP status code.
   */
  file(
    filePath: string,
    statusCode: ContentfulStatusCode = this.#defaultStatusCode
  ): this {
    try {
      this.#responseValidator("file");
      this.#returnData.file = filePath;
      this.#returnType = "file";
      this.#returnStatusCode = statusCode;
      return this;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.#returnData.error = error.message;
      } else {
        this.#returnData.error = String(error);
      }
      this.#returnStatusCode = 400;
      return this;
    }
  }
  /**
   * Set a file to download as a response.
   * @param filePath A string path or a tuple of [filePath, downloadName].
   * @param statusCode Optional HTTP status code.
   */
  download(
    filePath: string | [string, string],
    statusCode: ContentfulStatusCode = this.#defaultStatusCode
  ): this {
    try {
      this.#responseValidator("download");

      let downloadPayload: [string] | [string, string];

      if (typeof filePath === "string") {
        if (this.#filePathValidator(filePath)) {
          console.error(`Invalid file path: ${filePath}`);
        }
        downloadPayload = [filePath];
      } else if (Array.isArray(filePath) && filePath.length === 2) {
        const [path, name] = filePath;
        if (this.#filePathValidator(path)) {
          console.error(`Invalid file path: ${path}`);
        }
        if (typeof name !== "string") {
          console.error("Download name must be a string");
        }
        downloadPayload = [path, name];
      } else {
        console.error(
          "Invalid argument: must be a string or [filePath, downloadName]"
        );
        downloadPayload = [""];
      }

      this.#returnData.download = downloadPayload;
      this.#returnType = "download";
      this.#returnStatusCode = statusCode;
      return this;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.#returnData.error = error.message;
      } else {
        this.#returnData.error = String(error);
      }
      this.#returnStatusCode = 400;
      return this;
    }
  }

  #responseValidator(insertType: ReturnType = "html") {
    const returnTypes: (keyof ReturnData)[] = [
      "html",
      "json",
      "file",
      "download",
    ];
    // splice the insertType from returnTypes
    returnTypes.splice(returnTypes.indexOf(insertType), 1);
    let countErrors = 0;
    returnTypes.forEach((type) => {
      if (keyExist(this.#returnData, type) && !empty(this.#returnData[type])) {
        countErrors++;
      }
    });
    if (countErrors > 0) {
      throw new Error(
        `Cannot set ${insertType} response after ${returnTypes.join(
          ", "
        )} response`
      );
    }
  }

  #filePathValidator(filePath: string): boolean {
    // Path checks are stubbed/disabled — enable if needed
    try {
      if (typeof filePath !== "string") return true;
      const stats = fs.statSync(filePath);
      return !stats.isFile() || stats.isDirectory();
    } catch {
      return true;
    }
  }
}

export default HonoResponse;
