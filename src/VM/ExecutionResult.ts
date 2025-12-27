export interface ExecutionResult
{
    /**
     * True if the script has completed execution, false otherwise.
     */
    isCompleted: boolean;

    /**
     * True if the VM is currently sleeping, false otherwise.
     */
    isSleeping: boolean;

    /**
     * Remaining execution budget after the run.
     */
    remainingBudget: number;

    /**
     * Diagnostic information about the error if one occurred.
     *
     * @remarks {@link isCompleted} will be true if an error occurred to
     *          prevent the VM from continuing execution.
     */
    error?: DiagnosticInfo;
}

export type DiagnosticInfo = {
    /**
     * Error message if an error occurred, undefined otherwise.
     */
    message: string;

    /**
     * A couple of lines of source code indicating where the error originated from, if available.
     */
    source?: string;

    /**
     * Stack trace at the point of error, if available.
     */
    trace?: StackTraceFrame[];
}

export type StackTraceFrame = {
    /**
     * The type of the stack frame.
     */
    type: 'module' | 'interrupt' | 'function';

    /**
     * The name of the module where the error occurred, if available.
     */
    moduleName?: string;

    /**
     * The name of the function where the error occurred, if available.
     */
    functionName?: string;

    /**
     * The line number in the source code where the error occurred.
     */
    line: number;

    /**
     * The column number in the source code where the error occurred.
     */
    column: number;

    /**
     * A few lines of source code around the error location, if available.
     */
    source?: string;
}
