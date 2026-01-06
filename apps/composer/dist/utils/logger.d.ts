export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    SUCCESS = 2,
    WARN = 3,
    ERROR = 4,
    TIP = 5,
    GENERIC = 6,
    SECTION = 7,
    INPUT = 8
}
export declare class Logger {
    private static config;
    private static formatMessage;
    static setLevel(level: LogLevel): void;
    static enableDebug(): void;
    /**
     * Formats template literal strings with highlighted variables
     * Standardized approach for all logging methods
     */
    static formatVariables(strings: TemplateStringsArray, ...values: any[]): string;
    /**
     * Internal logging method with standardized template literal support
     */
    private static log;
    /**
     * Overloaded logging method for backwards compatibility with string arguments
     */
    private static logString;
    static debug(strings: TemplateStringsArray, ...values: any[]): void;
    static info(strings: TemplateStringsArray, ...values: any[]): void;
    static success(strings: TemplateStringsArray, ...values: any[]): void;
    static warn(strings: TemplateStringsArray, ...values: any[]): void;
    static error(strings: TemplateStringsArray, ...values: any[]): void;
    static tip(strings: TemplateStringsArray, ...values: any[]): void;
    static debugString(message: string): void;
    static infoString(message: string): void;
    static successString(message: string): void;
    static warnString(message: string): void;
    static errorString(message: string): void;
    static tipString(message: string): void;
    static generic(message: string): void;
    static input(message: string): string;
    static section(text: string): void;
    static header(text: string): void;
    static commandInfo(command: string, description: string): void;
    static defaultValueInfo(message: string, overrideCommand: string): void;
    static defaultValueWarning(message: string, overrideCommand: string): void;
    static debugObject(label: string, obj: any): void;
    static initialize(): void;
    static timing(label: string, timeMs: number): void;
    static fileList(title: string, files: string[]): void;
    static errorFileList(title: string, files: string[]): void;
    static showReferenceCommands(): void;
}
//# sourceMappingURL=logger.d.ts.map