import { Program } from '../Compiler/index.js';

export interface VirtualMachineOptions
{
    /**
     * The maximum number of operations (instructions) the VM is allowed to
     * execute in a single run.
     *
     * Defaults to {@link Infinity} if not specified.
     *
     * You can tweak this value during runtime via {@link VirtualMachine.budget}
     * property on the VM instance. A typical use-case is to set a budget for
     * AI agents that are far away from the player, and increase it when they
     * come closer (AI LOD).
     */
    budget?: number;

    /**
     * Custom functions that can be invoked by scripts running inside the
     * virtual machine.
     */
    functions?: Record<string, (...args: any[]) => any>;

    /**
     * Initial global variables to set in the VM's state.
     *
     * Variables set here are mutable by scripts running in the VM. Once a
     * script modifies a variable, it can be fetched again via the VM's
     * `globals` property.
     */
    variables?: Record<string, any>;

    /**
     * Whether the VM should throw an {@link Error} when it encounters a
     * runtime error, or simply write the error message to the console and
     * halt execution.
     */
    throwOnError?: boolean;

    /**
     * A function that resolves and returns a module by its name.
     *
     * The function should return a {@link Program} instance if the module
     * exists, or `undefined` if it cannot be found. Scripts can import modules
     * using the "import" statement.
     *
     * @param moduleName
     */
    resolveModule?: (moduleName: string) => Program | undefined;

    /**
     * A cache of previously loaded and evaluated modules to avoid redundant
     * execution of shared code between scripts. This object should be shared
     * among multiple VM instances to maximize cache hits.
     *
     * The value of each entry can either be a {@link Program} instance or
     * a plain object containing exported functions and variables.
     *
     * @remarks Functions and variables can be shared by using the "public"
     *          modifier. It is important to remember that each script can
     *          modify the values of exported variables, so care must be taken
     *          when sharing state between multiple VM instances.
     */
    moduleCache?: Record<string, any>;

    /**
     * A custom function that returns the current time in milliseconds.
     *
     * This is used to manage time-based operations inside the VM, such as
     * delays and timeouts. If not provided, the VM will use the built-in
     * {@link performance.now()} function or {@link Date.now()} as a fallback.
     *
     * @returns The current time in milliseconds.
     */
    now?: () => number;

    /**
     * Whether the VM should write ANSI escape codes to error messages.
     *
     * Defaults to {@link process.stdout.isTTY} and the ENV variable
     * "TERM" is not set to "dumb" or ENV variable "FORCE_COLOR" is set.
     *
     * @remarks Defaults to `false` in browser environments.
     */
    colors?: boolean;
}
