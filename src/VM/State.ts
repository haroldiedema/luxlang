export type StackFrame = {
    returnIp: number;
    isInterrupt: boolean;
    isModule: boolean;
    moduleName?: string;
    locals: Record<string, any>;
    exports: Record<string, any>;
}

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

    private _stack: any[]                 = [];
    private _frames: StackFrame[]         = [];
    private _globals: Record<string, any> = {};

    constructor(globals: Record<string, any> = {})
    {
        this._globals = globals;
    }

    /**
     * Import state data from an object.
     *
     * This overwrites the current stack, frames, and globals with the
     * provided data.
     */
    public import(data: { stack?: any[]; frames?: StackFrame[]; globals?: Record<string, any> })
    {
        if (data.stack) {
            this._stack = data.stack;
        }

        if (data.frames) {
            this._frames = data.frames;
        }

        if (data.globals) {
            this._globals = data.globals;
        }
    }

    // FIXME: This should not be exposed like this.
    public get stack(): any[]
    {
        return this._stack;
    }

    // FIXME: This should not be exposed like this.
    public get frames(): StackFrame[]
    {
        return this._frames;
    }

    // FIXME: This should not be exposed like this.
    public get globals(): Record<string, any>
    {
        return this._globals;
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
     * @param {boolean} isInterrupt - Whether this frame is for an interrupt handler.
     * @param {boolean} isModule - Whether this frame is for a module.
     * @param {string} moduleName - The name of the module, if applicable.
     */
    public pushFrame(returnIp: number, isInterrupt: boolean = false, isModule: boolean = false, moduleName: string | undefined = undefined): StackFrame
    {
        const frame = {
            returnIp,
            isInterrupt,
            isModule,
            moduleName,
            locals:  {},
            exports: {},
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

        if (name in this._globals) {
            return this._globals[name];
        }

        throw new Error(`Runtime Error: Variable '${name}' is not defined.`);
    }

    /**
     * Sets a value of a variable in the local scope if available, otherwise
     * in the global scope.
     *
     * @param {string} name
     * @param value
     */
    public setVar(name: string, value: any)
    {
        if (this._frames.length > 0) {
            const locals = this._frames[this._frames.length - 1].locals;

            if (typeof locals[name] === 'undefined' && typeof this._globals[name] !== 'undefined') {
                this._globals[name] = value;
                return;
            }

            locals[name] = value;
            return;
        }

        this._globals[name] = value;
    }
}
