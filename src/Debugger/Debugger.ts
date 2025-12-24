import * as Readline                       from 'node:readline';
import { Instruction, Program }            from '../Compiler/index.js';
import { ANSI }                            from '../Utility/ANSI.js';
import { ExecutionResult, VirtualMachine } from '../VM/index.js';
import { StackFrame }                      from '../VM/State.js';

export class Debugger
{
    private readonly keys: DebuggerKey[] = [
        {key: 'Q', name: 'Quit', fn: this.quit.bind(this)},
        {key: 'H', name: 'Display a list of commands', fn: this.printHelp.bind(this) },
        {key: 'Return', name: 'Executes all instructions in the current frame.', fn: this.continue.bind(this)},
        {key: 'Space', name: 'Executes a single instruction.', fn: this.step.bind(this)},
        {key: 'S', name: 'Show the values currently in the stack', fn: this.showStack.bind(this)},
        {key: 'F', name: 'Show the stack frames.', fn: this.showFrames.bind(this)},
        {key: 'B', name: 'Show the bytecode surrounding the current instruction. (Hold shift to show all)', fn: this.showBytecode.bind(this)},
    ];

    private lastFrame: StackFrame | null       = null;
    private lastResult: ExecutionResult | null = null;

    public static create(vm: VirtualMachine): void
    {
        if (! process.stdin.isTTY) {
            console.error('Debugger can only be started from a TTY.');
            return process.exit(1);
        }

        new Debugger(vm).prompt();
    }

    private constructor(private readonly vm: VirtualMachine)
    {
        Readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        this.print(`Debugger started. Press ${this.printKey('H')} for help.`);

        this.vm.budget       = 1;
        this.vm.throwOnError = false;
    }

    /**
     * Steps the VM by one instruction.
     *
     * @private
     */
    private step(): void
    {
        if (this.lastResult?.isCompleted) {
            this.print(`<green>Program halted.</green> Press [<yellow>Q</yellow>] to quit.`);
            return;
        }

        if (this.lastFrame !== this.vm.state.topFrame) {
            this.lastFrame = this.vm.state.topFrame;
            if (null === this.lastFrame) {
                this.print('<yellow>--- Returned to Global Frame ---</yellow>');
            } else {
                this.print(`<yellow>--- New Call Frame ---</yellow>`);
                this.printStackFrame(this.lastFrame, this.vm.state.numFrames - 1);
            }
        }

        this.printInstruction(this.vm.state.currentProgram, this.vm.state.ip);

        this.lastResult = this.vm.run(1);

        if (this.lastResult.error) {
            this.printError();
        }
    }

    private continue(): void
    {
        let lastFrame = this.lastFrame;
        this.step();

        if (lastFrame === this.lastFrame && ! this.lastResult?.isCompleted) {
            this.continue();
        }
    }

    private showStack(): void
    {
        const stack = this.vm.state.stack;
        if (stack.length === 0) {
            this.print('<gray>[Empty Stack]</gray>');
            return;
        }

        this.print('<yellow>Stack:</yellow>');
        for (let i = stack.length - 1; i >= 0; i--) {
            this.print(`  <cyan>[${i}]</cyan> ${this.formatObject(stack[i])}`);
        }
    }

    private showFrames(): void
    {
        const frames = this.vm.state.frames;
        if (frames.length === 0) {
            this.print('<gray>[No Call Frames]</gray>');
            return;
        }

        this.print('<yellow>Stack Frames:</yellow>');
        for (let i = frames.length - 1; i >= 0; i--) {
            this.printStackFrame(frames[i], i);
        }
    }

    private showBytecode(key: any): void
    {
        const program: Program            = this.vm.state.currentProgram;
        const instructions: Instruction[] = program.instructions;
        const ip: number                  = this.vm.state.ip;
        const start: number               = key.shift ? 0 : Math.max(0, ip - 5);
        const end: number                 = key.shift ? instructions.length : Math.min(instructions.length, ip + 5);

        const termWidth = process.stdout.columns || 80;
        const title = `Bytecode for module '${program.moduleName || 'MAIN'}'`;

        this.print('<gray>' + '─'.repeat(2) + `</gray> <yellow>${title}</yellow> <gray>` + '─'.repeat(termWidth - title.length - 4) + '</gray>');
        this.print('');

        for (let i = start; i < end; i++) {
            this.printInstruction(program, i, ip - 1);
        }

        this.print('');

        if (!key.shift) {
            this.print(`<gray>Press</gray> ${this.printKey('SHIFT + B')} <gray>to show all bytecode for this module.</gray>`);
        }

        this.print('<gray>' + '─'.repeat(termWidth) + '</gray>');
    }

    /**
     * Prompts the user for input.
     *
     * @private
     */
    private prompt(): void
    {
        process.stdout.write('> ');

        process.stdin.once('keypress', (_: string, key: InputKey) => {
            process.stdout.write('\r\x1b[K');

            // Find the command to run.
            const cmd = this.keys.find(k => k.key.toLowerCase() === key.name.toLowerCase());
            if (! cmd) {
                return this.prompt();
            }

            try {
                cmd.fn(key);
            } catch (e: any) {
                console.error(e);
            } finally {
                this.prompt();
            }
        });
    }

    /**
     * Quits the debugger.
     *
     * @private
     */
    private quit(): void
    {
        process.stdin.setRawMode(false);
        process.stdin.resume();
        process.exit(0);
    }

    /**
     * Prints the given string to the console.
     *
     * @private
     */
    private print(str: string): void
    {
        console.log(ANSI.format(str));
    }

    /**
     * Prints a single instruction.
     *
     * @private
     */
    private printInstruction(program: Program, ip: number, cursor?: number): void
    {
        const instr            = program.instructions[ip];
        const addr             = ip.toString().padStart(8, '0');
        const color = ip === cursor ? 'white' : 'gray';
        const result: string[] = [
            ip === cursor ? '<brightCyan>→</brightCyan>' : ' ',
            `<${color}>[${program.moduleName ?? 'MAIN'}]</${color}>`,
            `<${color}>${addr}</${color}>`,
        ];

        if (! instr) {
            result.push(`<red>[No Instruction Found]</red>`);
        } else {
            const iLength: number = instr.op.length;
            const mLength: number = 16;
            const pLength: number = mLength - iLength;

            result.push(
                `<gray>${'·'.repeat(pLength)}</gray> <green>${instr.op}</green>`,
                `${this.formatObject(instr.arg)}`,
            );

            if (instr.comment) {
                result.push(`<gray>// ${instr.comment}</gray>`);
            }
        }

        this.print(result.join(' '));
    }

    /**
     * Prints a stack frame.
     *
     * @private
     */
    private printStackFrame(frame: StackFrame, index: number): void
    {
        const type    = frame.isModule ? 'Module' : frame.isInterrupt ? 'Interrupt' : 'Function';
        const subType = frame.moduleName ? ` (${frame.moduleName})` : '';
        this.print(`  <cyan>[${index}]</cyan> ${type}${subType} - IP: <magenta>${frame.ip}</magenta> - Return IP: <magenta>${frame.returnIp}</magenta>`);
        this.print(`       Locals  : ${this.formatObject(frame.locals)}`);
        this.print(`       Exports : ${this.formatObject(frame.exports)}`);
    }

    /**
     * Prints the last error message.
     *
     * @private
     */
    private printError(): void
    {
        if (! this.lastResult?.error) return;
        console.error(this.vm.createErrorMessageFromDiagnostic(this.lastResult.error));
    }

    /**
     * Formats the given object for colored output.
     *
     * @private
     */
    private formatObject(obj: any): string
    {
        if (typeof obj === 'string') {
            return ANSI.format(`<cyan>"${obj}"</cyan>`);
        }

        if (typeof obj === 'number') {
            return ANSI.format(`<magenta>${obj}</magenta>`);
        }

        if (typeof obj === 'boolean') {
            return ANSI.format(`<yellow>${obj}</yellow>`);
        }

        if (typeof obj === 'function') {
            return ANSI.format(`<red><fn:${obj.name}></red>`);
        }

        if (obj === null || typeof obj === 'undefined') {
            return '<gray>~</gray>';
        }

        if (Array.isArray(obj)) {
            return [
                `<gray>[</gray>`,
                obj.map(v => this.formatObject(v)).join(', '),
                `<gray>]</gray>`,
            ].join('');
        }

        const result: string[] = [];
        for (const key of Object.keys(obj)) {
            if (key === 'prog' && typeof obj[key] === 'object' && obj[key]?.instructions) {
                result.push(`${key}: <gray>[Program: ${obj[key].moduleName || 'MAIN'}]</gray>`);
                continue;
            }
            result.push(`${key}: ${this.formatObject(obj[key])}`);
        }

        return [
            `<gray>{</gray>`,
            result.join(', '),
            `<gray>}</gray>`,
        ].join('');
    }

    private printKey(key: string): string
    {
        return ANSI.format(`<gray>[</gray><yellow>${key.toUpperCase()}</yellow><gray>]</gray>`);
    }

    private printHelp(): void
    {
        this.print('');
        this.print('<yellow>Debugger Commands:</yellow>');

        for (const cmd of this.keys) {
            this.print(`  ${this.printKey(cmd.key)} : ${cmd.name}`);
        }

        this.print('');
    }
}

type DebuggerKey = {
    key: string;   // Key name.
    name: string;  // Command name.
    fn: (key: InputKey) => any; // Callback.
}

type InputKey = {
    sequence: string,
    name: string,
    ctrl: boolean,
    meta: boolean,
    shift: boolean
};
