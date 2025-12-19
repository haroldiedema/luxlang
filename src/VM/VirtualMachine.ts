import {Printer}               from '../Compiler/index.js';
import {Instruction, Opcode}   from '../Compiler/Opcodes.js';
import {Deserializer}          from './Deserializer.js';
import {InstructionSet}        from './InstructionSet.js';
import {Serializer}            from './Serializer.js';
import {State}                 from './State.js';
import {VirtualMachineOptions} from './VirtualMachineOptions.js';

export class VirtualMachine extends InstructionSet
{
    protected readonly instructions: Instruction[];
    protected readonly natives: Map<string, Function> = new Map();

    protected state: State;
    protected throwOnError: boolean;

    private readonly options: VirtualMachineOptions;
    private readonly serializer: Serializer;
    private readonly deserializer: Deserializer;

    constructor(bytecode: Instruction[], options: VirtualMachineOptions = {})
    {
        super();

        this.options      = options;
        this.serializer   = new Serializer();
        this.deserializer = new Deserializer();

        this.instructions = bytecode;
        this.state        = new State(options.variables ?? {});
        this.throwOnError = options.throwOnError ?? false;

        for (const [name, fn] of Object.entries(options.functions ?? {})) {
            this.registerNative(name, fn);
        }
    }

    /**
     * Register a native function that can be called from the VM.
     *
     * @param {string} name
     * @param {Function} fn
     */
    public registerNative(name: string, fn: Function)
    {
        this.natives.set(name, fn);
    }

    /**
     * Run the VM for a specific number of "ops".
     *
     * @returns TRUE if the script finished, FALSE if it paused (ran out of budget or crashed).
     */
    public run(budget: number = 1000): boolean
    {
        try {
            return this.execute(budget);
        } catch (e) {
            this.handleError(e as Error);
            return true; // Halt on error
        }
    }

    /**
     * Saves the current state of the VM to a string.
     *
     * @returns {string}
     */
    public save(): string
    {
        return this.serializer.serialize(this.romHash, this.state);
    }

    /**
     * Restores the VM state from a string.
     *
     * @param {string} state
     */
    public load(state: string): void
    {
        this.deserializer.deserialize(this.romHash, state, this.state);
    }

    /**
     * Returns a ROM hash based on the loaded instructions.
     *
     * @returns {string}
     */
    public get romHash(): string
    {
        let hash = 0;

        for (const instr of this.instructions) {
            const opStr = `${instr.op}:${JSON.stringify(instr.arg)}`;
            for (let i = 0; i < opStr.length; i++) {
                const char = opStr.charCodeAt(i);
                hash       = ((hash << 5) - hash) + char;
                hash |= 0; // Convert to 32bit integer
            }
        }

        return hash.toString(16);
    }

    /**
     * Dump the current state of the VM instructions to the console.
     */
    public dump(): void
    {
        const lines: string[] = Printer.print(this.instructions, {
            includeComments:  true,
            includePositions: true,
        });

        for (let i = 0; i < lines.length; i++) {
            console.log(` ${this.state.ip === i ? '>' : ' '} ` + lines[i]);
        }
    }

    /**
     * Handle a runtime error.
     *
     * @param {Error} err
     * @private
     */
    private handleError(err: Error)
    {
        this.state.isHalted = true;

        if (this.throwOnError) {
            throw err;
        }

        const failedInstruction = this.instructions[this.state.ip - 1];

        if (failedInstruction && failedInstruction.pos) {
            const {lineStart, columnStart} = failedInstruction.pos;

            console.error(`\x1b[31m[Runtime Error] at line ${lineStart}, col ${columnStart}\x1b[0m`);
            console.error(` > ${err.message}`);
        } else {
            console.error(`[Runtime Error]: ${err.message}`);
        }
    }
}
