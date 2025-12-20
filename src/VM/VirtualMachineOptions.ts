import { Program } from '../Compiler/index.js';

export interface VirtualMachineOptions
{
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
}
