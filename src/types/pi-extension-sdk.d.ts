// Type stub for the Pi extension SDK — see Pi documentation for full API.
// The real types are provided by the Pi runtime when the extension is loaded.

declare module 'pi-extension-sdk' {
  export interface ToolContext {
    /** Absolute path to the project root directory */
    projectDir: string;
    /** Start a new Pi session with the given kickoff message */
    newSession(message: string): void;
    /** Send a message to the user in the current session */
    sendUserMessage(message: string): Promise<void>;
  }

  export interface PiExtension {
    name: string;
    tools: Array<{
      name: string;
      description: string;
      parameters: unknown;
      execute(args: unknown, ctx: ToolContext): Promise<unknown>;
    }>;
  }
}
