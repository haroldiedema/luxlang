import { Printer, Program }                                 from '../Compiler/index.js';
import { ANSI }                                             from '../Utility/ANSI.js';
import { Deserializer }                                     from './Deserializer.js';
import { DiagnosticInfo, ExecutionResult, StackTraceFrame } from './ExecutionResult.js';
import { InstructionSet }                                   from './InstructionSet.js';
import { Serializer }                                       from './Serializer.js';
import { StackFrame, State }                                from './State.js';
import { VirtualMachineOptions }                            from './VirtualMachineOptions.js';

export class VirtualMachine extends InstructionSet
{
    public readonly state: State;

    public budget: number;
    public throwOnError: boolean;

    protected readonly program: Program;
    protected readonly natives: Map<string, Function>;
    protected readonly resolveModule: (moduleName: string) => Program | undefined;
    protected readonly moduleCache: Record<string, any>;

    private readonly serializer: Serializer;
    private readonly deserializer: Deserializer;
    private readonly result: ExecutionResult;

    constructor(program: Program, options: VirtualMachineOptions = {})
    {
        super();

        ANSI.enabled = options.colors ?? ANSI.autoDetectSupport();

        this.budget        = options.budget ?? Infinity;
        this.program       = program;
        this.natives       = new Map();
        this.serializer    = new Serializer();
        this.deserializer  = new Deserializer();
        this.state         = new State(program, options.variables ?? {});
        this.throwOnError  = options.throwOnError ?? true;
        this.moduleCache   = options.moduleCache ?? {};
        this.resolveModule = options.resolveModule ?? (() => {
            throw new Error('Module resolution is not supported.');
        });

        for (const [name, fn] of Object.entries(options.functions ?? {})) {
            this.registerNative(name, fn);
        }

        this.result = {
            isCompleted:     false,
            isSleeping:      false,
            error:           undefined,
            remainingBudget: this.budget,
        };
    }

    public get globals(): Record<string, any>
    {
        return this.state.globals;
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
    public run(deltaTime: number = 16.6): Readonly<ExecutionResult>
    {
        // Reset execution result.
        this.result.isCompleted     = false;
        this.result.isSleeping      = false;
        this.result.error           = undefined;
        this.result.remainingBudget = this.budget;

        try {
            if (! this.state.isInsideInterrupt && this.state.eventQueue.length > 0) {
                this.executeNextEvent();
            }

            const [b, c]                = this.execute(this.budget, deltaTime);
            this.result.remainingBudget = b;
            this.result.isCompleted     = c;
            this.result.isSleeping      = this.state.isSleeping;
            this.result.remainingBudget = this.budget;
        } catch (e) {
            if (! (e instanceof Error)) {
                throw e;
            }

            this.result.error       = this.createErrorDiagnosticInfo(e);
            this.result.isCompleted = true;

            if (this.throwOnError) {
                throw new Error(this.createErrorMessageFromDiagnostic(this.result.error));
            }
        }

        return this.result;
    }

    /**
     * Returns a list of event names that can be dispatched to the VM.
     *
     * @returns {string[]}
     */
    public get eventNames(): string[]
    {
        return Object.keys(this.program.references.events);
    }

    /**
     * Dispatch an event to the VM.
     *
     * Returns true if a hook for the given event name exists and that the
     * event was successfully queued, false otherwise.
     *
     * @param {string} name - The name of the event.
     * @param {any[]} args  - Arguments to pass to the event handler.
     * @returns {boolean}
     */
    public dispatch(name: string, args: any[] = []): boolean
    {
        const eventInfo = this.program.references.events[name];
        if (! eventInfo) {
            return false;
        }

        this.state.eventQueue.push({name, args});
        this.state.isHalted = false;

        return true;
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

        for (const instr of this.program.instructions) {
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
        Object.keys(this.moduleCache).forEach((name: string) => {
            if (typeof this.moduleCache[name] === 'object' && this.moduleCache[name].instructions) {
                this.dumpProgram(this.moduleCache[name] as unknown as Program);
            }
        });

        this.dumpProgram(this.program);
    }

    private dumpProgram(program: Program): void
    {
        console.log(`--- Program [${program.moduleName || 'main'}] ---`);

        const lines: string[] = Printer.print(program.instructions, {
            includeComments:  true,
            includePositions: true,
        });

        for (let i = 0; i < lines.length; i++) {
            console.log(` ${this.state.ip === i ? '>' : ' '} ` + lines[i]);
        }
    }

    private executeNextEvent(): void
    {
        const event = this.state.eventQueue.shift();
        if (! event) return;

        const eventInfo = this.program.references.events[event.name];

        for (let i = 0; i < eventInfo.numArgs; i++) {
            this.state.stack.push(event.args[i] ?? null);
        }

        this.state.pushFrame(this.state.ip, {
            name:        `<interrupt:${event.name}>`,
            isInterrupt: true,
        });

        this.state.ip = eventInfo.address;
    }

    private createErrorDiagnosticInfo(e: Error): DiagnosticInfo
    {
        return {
            message: e.message,
            source:  this.createErrorSourceLines(this.state.currentProgram, this.state.ip).join('\n'),
            trace:   this.createStackTrace(),
        } satisfies DiagnosticInfo;
    }

    private createStackTrace(): StackTraceFrame[]
    {
        const frames: StackTraceFrame[] = [];
        const stack: StackFrame[]       = [
            ...[...this.state.frames].reverse(),
        ];

        for (const frame of stack) {
            if (frame.ip >= frame.program.instructions.length) continue;

            frames.push({
                type:         frame.isModule ? 'module' : frame.isInterrupt ? 'interrupt' : 'function',
                line:         frame.program.instructions[frame.ip].pos?.lineStart ?? -1,
                column:       frame.program.instructions[frame.ip].pos?.columnStart ?? -1,
                functionName: frame.name,
                moduleName:   frame.moduleName,
                source:       this.createErrorSourceLines(frame.program, frame.ip).join('\n'),
            });
        }

        return frames;
    }

    private createErrorSourceLines(program: Program, ip: number): string[]
    {
        const instr = program.instructions[ip];
        if (! instr?.pos) {
            return [];
        }

        const {lineStart, columnStart} = instr.pos;
        const sourceLines              = program.source.split('\n');

        // Grab the 3 last lines before the error line, the error line itself.
        const result: string[] = [];
        for (let i = Math.max(0, lineStart - 4); i < Math.min(sourceLines.length, lineStart); i++) {
            const prefix = (i + 1 === lineStart) ? '<red>>></red> ' : '   ';
            result.push(`${prefix}<gray>${i + 1}|</gray> ${sourceLines[i]}`.trimEnd());
        }

        // Add a caret pointing to the error column.
        const caretLine = '<gray>' + ('-'.repeat(columnStart + lineStart.toString().length + 4) + '</gray>') + '<red>^</red>';
        result.push(caretLine);

        return result;
    }

    /**
     * Create a human-readable error message from a DiagnosticInfo object.
     *
     * @param {DiagnosticInfo} diag - The diagnostic information.
     * @returns {string} - The formatted error message.
     */
    public createErrorMessageFromDiagnostic(diag: DiagnosticInfo): string
    {
        let msg = `<red>${diag.message}</red>\n`;

        if (diag.source) {
            msg += `\nSource:\n${diag.source}\n`;
        }

        if (diag.trace && diag.trace.length > 0) {
            msg += `\nStack Trace:\n`;
            let id = diag.trace.length;
            for (const frame of diag.trace) {
                id--;
                msg += ` <gray>#${id}: [${frame.type}]</gray> `;
                if (frame.moduleName) {
                    msg += `Module: <cyan>${frame.moduleName}</cyan> `;
                }
                if (frame.functionName && frame.functionName !== '<anonymous>') {
                    msg += `Function: <green>${frame.functionName}</green> `;
                }
                msg += `at line <cyan>${frame.line}</cyan>, column <cyan>${frame.column}</cyan>\n`;
            }
        }

        return ANSI.format(msg);
    }
}
