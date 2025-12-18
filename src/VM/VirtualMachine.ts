import { Instruction, Opcode } from '../Compiler/Opcodes.js';

export class VirtualMachine
{
    private readonly instructions: Instruction[];
    private readonly natives: Map<string, Function> = new Map();

    private ip: number                = 0;  // Instruction Pointer
    private stack: any[]              = []; // Operand Stack
    private frames: StackFrame[]      = []; // Call Stack
    private globals: Map<string, any> = new Map();
    private isHalted: boolean         = false;

    constructor(bytecode: Instruction[])
    {
        this.instructions = bytecode;
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
            return this.runInternal(budget);
        } catch (e) {
            this.handleError(e as Error);
            return true; // Halt on error
        }
    }

    private runInternal(budget: number): boolean
    {
        if (this.isHalted) return true;

        let opsConsumed = 0;

        while (opsConsumed < budget && this.ip < this.instructions.length) {
            const instr = this.instructions[this.ip];

            // We advance the instruction pointer *before* execution (so JMPs can overwrite it).
            this.ip++;

            opsConsumed++;

            switch (instr.op) {
                case Opcode.HALT:
                    this.isHalted = true;
                    return true;
                case Opcode.CONST:
                    this.stack.push(instr.arg);
                    break;

                // --- Variables ---
                case Opcode.LOAD:
                    this.opLoad(instr.arg);
                    break;
                case Opcode.STORE:
                    this.opStore(instr.arg);
                    break;

                // --- Unary ---
                case Opcode.NOT: {
                    const val = this.stack.pop();
                    this.stack.push(! val); // Lean on JS truthiness.
                    break;
                }
                case Opcode.NEG: {
                    const val = this.stack.pop();
                    if (typeof val !== 'number') {
                        throw new Error(`Runtime Error: Cannot negate non-number '${val}'`);
                    }
                    this.stack.push(-val);
                    break;
                }

                // --- Math ---
                case Opcode.ADD: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a + b); // JS handles string concat automatically here
                    break;
                }
                case Opcode.SUB: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a - b);
                    break;
                }
                case Opcode.MUL: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a * b);
                    break;
                }
                case Opcode.DIV: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    if (b === 0) {
                        throw new Error('Runtime Error: Division by zero');
                    }
                    this.stack.push(a / b);
                    break;
                }

                // --- Comparison ---
                case Opcode.EQ: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a === b);
                    break;
                }
                case Opcode.NEQ: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a !== b);
                    break;
                }
                case Opcode.GT: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a > b);
                    break;
                }
                case Opcode.LT: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a < b);
                    break;
                }
                case Opcode.GTE: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a >= b);
                    break;
                }
                case Opcode.LTE: {
                    const b = this.stack.pop();
                    const a = this.stack.pop();
                    this.stack.push(a <= b);
                    break;
                }

                // --- Control Flow ---
                case Opcode.JMP:
                    this.ip = instr.arg;
                    break;

                case Opcode.JMP_IF_FALSE: {
                    const condition = this.stack.pop();
                    if (! condition) {
                        this.ip = instr.arg;
                    }
                    break;
                }

                case Opcode.JMP_IF_TRUE: {
                    const val = this.stack.pop();
                    if (val) {
                        this.ip = instr.arg;
                    }
                    break;
                }

                case Opcode.DUP: {
                    const val = this.stack[this.stack.length - 1]; // Peek
                    this.stack.push(val);
                    break;
                }

                case Opcode.POP: {
                    this.stack.pop();
                    break;
                }

                case Opcode.PRINT:
                    const val = this.stack.pop();
                    if (this.natives.has('print')) {
                        this.natives.get('print')!(val);
                    } else {
                        console.log('[VM Output]:', val);
                    }
                    break;

                case Opcode.CALL:
                    this.opCall(instr.arg);
                    break;

                case Opcode.RET:
                    if (this.frames.length === 0) {
                        this.isHalted = true;
                        return true;
                    }

                    const frame = this.frames.pop()!;
                    this.ip     = frame.returnAddress;
                    break;

                // --- Collections ---
                case Opcode.MAKE_ARRAY: {
                    const count = instr.arg;
                    const arr   = [];

                    for (let i = 0; i < count; i++) {
                        arr.unshift(this.stack.pop());
                    }

                    this.stack.push(arr);
                    break;
                }

                case Opcode.MAKE_OBJECT: {
                    const count = instr.arg; // Number of properties
                    const obj   = new Map<string, any>();

                    for (let i = 0; i < count; i++) {
                        const val = this.stack.pop();
                        const key = this.stack.pop();
                        obj.set(key, val);
                    }

                    this.stack.push(obj);
                    break;
                }

                case Opcode.GET_PROP: {
                    const key                           = this.stack.pop();
                    const obj                           = this.stack.pop();
                    const debugName: string | undefined = instr.arg;

                    if (Array.isArray(obj)) {
                        const index = Number(key);
                        if (isNaN(index)) throw new Error(`Runtime Error: Array index must be a number, got '${key}'`);
                        if (index < 0 || index >= obj.length) throw new Error(`Index #${index} is out of bounds.`);

                        this.stack.push(obj[index]);
                    } else if (obj instanceof Map) {
                        const val = obj.get(key);
                        this.stack.push(val === undefined ? null : val);
                    } else {
                        const target = debugName ? `'${debugName}'` : 'object';
                        throw new Error(`Cannot access property '${key}' of ${target} because ${target} is not defined.`);
                    }
                    break;
                }

                case Opcode.SET_PROP: {
                    const val = this.stack.pop();
                    const key = this.stack.pop();
                    const obj = this.stack.pop();

                    const debugName: string | undefined = instr.arg;

                    if (Array.isArray(obj)) {
                        const index = Number(key);
                        if (isNaN(index)) throw new Error(`Runtime Error: Array index must be a number, got '${key}'`);

                        obj[index] = val;
                    } else if (obj instanceof Map) {
                        obj.set(key, val);
                    } else {
                        const target = debugName ? `'${debugName}'` : 'object';
                        throw new Error(`Cannot set property '${key}' of ${target} because ${target} is not defined.`);
                    }

                    this.stack.push(val);
                    break;
                }

                case Opcode.ITER_INIT: {
                    const list                     = this.stack.pop();
                    const iterator: IteratorObject = {items: list, index: 0};
                    this.stack.push(iterator);
                    break;
                }

                case Opcode.ITER_NEXT: {
                    const iterator = this.stack[this.stack.length - 1] as IteratorObject;
                    const exitAddr = instr.arg;

                    if (iterator.index >= iterator.items.length) {
                        this.stack.pop();
                        this.ip = exitAddr;
                    } else {
                        const item = iterator.items[iterator.index];
                        iterator.index++;
                        this.stack.push(item);
                    }
                    break;
                }

                default:
                    throw new Error(`VM: Unknown Opcode ${instr.op}`);
            }
        }

        // If we ran out of budget but didn't HALT, return false (Paused)
        return false;
    }

    private opLoad(name: string)
    {
        if (this.frames.length > 0) {
            const frame = this.frames[this.frames.length - 1];
            if (frame.locals.has(name)) {
                this.stack.push(frame.locals.get(name));
                return;
            }
        }

        if (this.globals.has(name)) {
            this.stack.push(this.globals.get(name));
            return;
        }
        throw new Error(`Runtime Error: Variable '${name}' is not defined.`);
    }

    private opStore(name: string)
    {
        const val = this.stack.pop();

        if (this.frames.length > 0) {
            const frame = this.frames[this.frames.length - 1];
            frame.locals.set(name, val);
        } else {
            this.globals.set(name, val);
        }
    }

    private opCall(arg: { addr: number, args: number })
    {
        const args = [];
        for (let i = 0; i < arg.args; i++) {
            args.unshift(this.stack.pop());
        }

        const frame: StackFrame = {
            returnAddress: this.ip,
            locals:        new Map(),
        };

        this.frames.push(frame);
        this.ip = arg.addr;
    }

    private handleError(err: Error)
    {
        this.isHalted = true;

        const failedInstruction = this.instructions[this.ip - 1];

        if (failedInstruction && failedInstruction.pos) {
            const {lineStart, columnStart} = failedInstruction.pos;

            console.error(`\x1b[31m[Runtime Error] at line ${lineStart}, col ${columnStart}\x1b[0m`);
            console.error(` > ${err.message}`);
        } else {
            console.error(`[Runtime Error]: ${err.message}`);
        }
    }
}

interface StackFrame
{
    returnAddress: number;
    locals: Map<string, any>;
}

interface IteratorObject
{
    items: any[];
    index: number;
}
