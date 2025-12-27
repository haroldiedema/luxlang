import { Program } from '../Compiler/index.js';

export type StackFrame = {
    ip: number;
    program: Program;
    returnIp: number;
    name: string;
    isInterrupt: boolean;
    isModule: boolean;
    moduleName?: string;
    locals: Record<string, any>;
    exports: Record<string, any>;
    sleepTimer: number;
}

type VMEvent = {
    name: string;
    args: any[];
}

type ModuleScopeMap = Record<string, Record<string, any>>;

/**
 * Represents the current state of the virtual machine.
 *
 * All data inside the State must be considered volatile and can change at any
 * time.
 */
export class State
{
    /**
     * The instruction pointer that indicates the current execution position.
     *
     * @type {number}
     */
    public ip: number = 0;

    /**
     * True if the VM has been halted, false otherwise.
     *
     * @type {boolean}
     */
    public isHalted: boolean = false;

    /**
     * The time in milliseconds the VM is set to sleep.
     *
     * @type {number}
     */
    public sleepTime: number = 0;

    /**
     * The delta time in milliseconds since the last execution cycle.
     *
     * @type {number}
     */
    public deltaTime: number = 0;

    /**
     * The total wall time in milliseconds the VM has been running.
     *
     * @type {number}
     */
    public wallTime: number = 0;

    /**
     * A promise that the VM is currently waiting on, or NULL if not waiting.
     *
     * @type {boolean}
     */
    public isAwaitingPromise: boolean = false;

    private _program: Program;
    private _programs: Record<string, Program> = {};
    private _stack: any[]                      = [];
    private _frames: StackFrame[]              = [];
    private _eventQueue: VMEvent[]             = [];
    private _scopes: ModuleScopeMap            = {};

    constructor(program: Program, globals: Record<string, any> = {})
    {
        this._program                = program; // Root (main) program.
        this._programs[program.hash] = program; // Register main program.
        this._scopes[program.hash]   = globals; // Global scope for main program.
    }

    /**
     * The current program being executed.
     */
    public get currentProgram(): Program
    {
        return this.topFrame?.program ?? this._program;
    }

    /**
     * Import state data from an object.
     *
     * This overwrites the current stack, frames, and globals with the
     * provided data.
     */
    public import(data: {
        stack?: any[];
        programs?: Record<string, Program>,
        frames?: StackFrame[];
        scopes?: Record<string, any>,
        events?: VMEvent[],
        sleepTime?: number
        deltaTime?: number
    })
    {
        if (data.stack) {
            this._stack = data.stack;
        }

        if (data.programs) {
            this._programs = data.programs;
        }

        if (data.frames) {
            this._frames = data.frames;
        }

        if (data.scopes) {
            this._scopes = data.scopes;
        }

        if (data.events) {
            this._eventQueue = data.events;
        }

        if (data.sleepTime) {
            this.sleepTime = data.sleepTime;
        }

        if (data.deltaTime) {
            this.deltaTime = data.deltaTime;
        }
    }

    public get stack(): any[]
    {
        return this._stack;
    }

    public get frames(): StackFrame[]
    {
        return this._frames;
    }

    public get scopes(): Record<string, any>
    {
        return this._scopes;
    }

    public get eventQueue(): VMEvent[]
    {
        return this._eventQueue;
    }

    public get programs(): Record<string, Program>
    {
        return this._programs;
    }

    /**
     * Push a value onto the stack.
     */
    public push(val: any)
    {
        this._stack.push(val);
    }

    /**
     * Pops a value from the stack.
     */
    public pop(): any
    {
        return this._stack.pop();
    }

    /**
     * Returns the last value on the stack without removing it.
     */
    public peek(): any
    {
        return this._stack[this._stack.length - 1];
    }

    /**
     * Push a new frame onto the call stack.
     *
     * @param {number} returnIp - The instruction pointer to return to after the function call.
     * @param {PushFrameOptions} options
     */
    public pushFrame(returnIp: number, options: PushFrameOptions = {}): StackFrame
    {
        const scopeName = (options.program || this.currentProgram).hash;
        if (typeof this._scopes[scopeName] === 'undefined') {
            this._scopes[scopeName] = {};
        }

        if (typeof this._programs[scopeName] === 'undefined') {
            this._programs[scopeName] = options.program || this.currentProgram;
        } else if (options.program && this._programs[scopeName] !== options.program) {
            throw new Error(`Program hash collision detected: ${scopeName}`);
        }

        const frame = {
            returnIp,
            ip:          this.ip,
            program:     options.program ?? this.currentProgram, // TODO: Replace with hash.
            name:        options.name ?? '<anonymous>',
            isInterrupt: options.isInterrupt ?? false,
            isModule:    options.isModule ?? false,
            moduleName:  options.moduleName ?? options.program?.moduleName ?? this.frames[this.frames.length - 1]?.moduleName,
            sleepTimer:  0,
            locals:      {},
            exports:     {},
        } satisfies StackFrame;

        this._frames.push(frame);

        return frame;
    }

    /**
     * Pops the top frame from the call stack.
     *
     * @returns {StackFrame | undefined}
     */
    public popFrame(): StackFrame | undefined
    {
        return this._frames.pop();
    }

    /**
     * Returns the top frame on the call stack or NULL if there are no frames.
     */
    public get topFrame(): StackFrame | null
    {
        if (this.numFrames === 0) {
            return null;
        }

        return this._frames[this._frames.length - 1];
    }

    /**
     * Returns the number of frames on the call stack.
     */
    public get numFrames(): number
    {
        return this._frames.length;
    }

    /**
     * Returns the value of a variable by searching local and global scopes.
     *
     * @param {string} name
     * @returns {any}
     */
    public getVar(name: string): any
    {
        if (this._frames.length > 0) {
            const locals = this._frames[this._frames.length - 1].locals;
            if (name in locals) {
                return locals[name];
            }
        }

        const scope = this._scopes[this.currentProgram.hash] || {};

        // Global scope of the module.
        if (name in scope) {
            return scope[name];
        }

        // Global scope of the main program.
        if (name in this._scopes[this._program.hash]) {
            return this._scopes[this._program.hash][name];
        }

        throw new Error(`The variable "${name}" is not defined.`);
    }

    /**
     * Sets a value of a variable in the local scope if available, otherwise
     * in the global scope.
     *
     * @param {string} name
     * @param {boolean} local - True to force setting in local scope.
     * @param value
     */
    public setVar(name: string, value: any, local: boolean = false) {
        const scopeName = this.currentProgram.hash;
        const scope = this._scopes[scopeName];
        const topFrame = this.topFrame;

        // 1. Explicit Local ('local val = ...')
        if (local && topFrame) {
            topFrame.locals[name] = value;
            return;
        }

        // 2. Check for Shadow (Is it already a local?)
        // This fixes the "Mid-Stream" Shadow test
        if (topFrame && typeof topFrame.locals[name] !== 'undefined') {
            topFrame.locals[name] = value;
            return;
        }

        // 3. Check for Global (Does it exist in the module/program scope?)
        // This fixes the "Pre-flight" Actor Count
        if (scope && typeof scope[name] !== 'undefined') {
            scope[name] = value;
            return;
        }

        // 4. Fallback creation
        if (topFrame && !topFrame.isModule) {
            topFrame.locals[name] = value;
        } else if (scope) {
            scope[name] = value;
        }
    }

    /**
     * True if the VM is currently executing inside an interrupt handler.
     */
    public get isInsideInterrupt(): boolean
    {
        for (let i = this.frames.length - 1; i >= 0; i--) {
            if (this.frames[i].isInterrupt) return true;
        }

        return false;
    }

    public get isSleeping(): boolean
    {
        // 1. If we are running a Function or Interrupt, IT decides if we wait.
        if (this._frames.length > 0) {
            const topFrame = this._frames[this._frames.length - 1];
            return topFrame.sleepTimer > 0;
        }

        // 2. We are in the Main Loop (Global Scope). Check global timer.
        return this.sleepTime > 0;
    }

    public findProgramByHash(hash: string): Program | null
    {
        return this._programs[hash] || null;
    }

    /**
     * A helper method used inside instructions to determine the truthiness of a value.
     */
    public isTruthy(value: any): boolean
    {
        if (value === null || value === undefined || value === false) {
            return false;
        }

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        if (typeof value === 'number') {
            return value !== 0;
        }

        if (typeof value === 'string') {
            return value.length > 0;
        }

        return true;
    }
}

type PushFrameOptions = {
    /**
     * The program associated with the frame.
     */
    program?: Program,

    /**
     * True if the frame is for an interrupt handler.
     */
    isInterrupt?: boolean;

    /**
     * True if the frame is for a module.
     */
    isModule?: boolean;

    /**
     * The name of the function/frame.
     */
    name?: string;

    /**
     * The name of the module, if applicable.
     */
    moduleName?: string;
}
