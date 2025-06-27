export declare class IMyArtisan {
  /**
   * Execute the command line interface for Honovel.
   * This method is the entry point for the CLI commands.
   * It uses the Deno command line parser to handle various artisan commands.
   * @param args
   */
  public readonly command: (args: string[]) => Promise<void>;
}
