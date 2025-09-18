// ExpressResponse.d.ts

declare class ExpressResponse {
  /**
   * Create a new ExpressResponse instance.
   * @param html Optional initial HTML content to respond with.
   */
  constructor(html?: string | null);

  /**
   * Set a JSON response with optional status code.
   * @param data The JSON-serializable data.
   * @param statusCode Optional HTTP status code.
   */
  json(data: Record<string, any>, statusCode?: number): this;

  /**
   * Set a single header key-value pair.
   * @param key Header name.
   * @param value Header value.
   */
  header(key: string, value: string): this;

  /**
   * Set HTML content to be returned with optional status code.
   * @param content HTML string.
   * @param statusCode Optional HTTP status code.
   */
  html(content: string, statusCode?: number): this;

  /**
   * Set multiple headers at once.
   * @param headers Key-value pairs of headers.
   */
  withHeaders(headers: Record<string, string>): this;

  /**
   * Set a file to send as a response.
   * @param filePath Path to the file.
   * @param statusCode Optional HTTP status code.
   */
  file(filePath: string, statusCode?: number): this;

  /**
   * Set a file to download as a response.
   * @param filePath A string path or a tuple of [filePath, downloadName].
   * @param statusCode Optional HTTP status code.
   */
  download(filePath: string | [string, string], statusCode?: number): this;
}

export default ExpressResponse;
