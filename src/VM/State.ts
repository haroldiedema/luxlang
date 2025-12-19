export type StackFrame = {
    returnIp: number;
    locals: Record<string, any>; // Changed from Map to Record for JSON serialization
}

/**
 * Represents the current state of the virtual machine.
 *
 * All data inside the State must be considered volatile and can change at any
 * time.
 */
export class State
{
    public static fromJSON(json: string, variables: Record<string, any> = {}): State
    {
        const data: any = JSON.parse(json);
        const state     = new State();

        state.ip       = data.ip;
        state.isHalted = data.isHalted;
        state._stack   = data.stack;
        state._frames  = data.frames;
        state._globals = Object.assign({}, variables, data.globals);

        return state;
    }

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

        console.log('IMPORT STATE:', data);
    }

    public get stack(): any[]
    {
        return this._stack;
    }

    public get frames(): StackFrame[]
    {
        return this._frames;
    }

    public get globals(): Record<string, any>
    {
        return this._globals;
    }

    public toJSON()
    {
        return {
            ip:       this.ip,
            isHalted: this.isHalted,
            stack:    this._stack,
            frames:   this._frames,
            globals:  this._globals,
        };
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
     */
    public pushFrame(returnIp: number): StackFrame
    {
        const frame = {
            returnIp,
            locals: {}, // Empty record
        };

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
     * Returns the number of frames on the call stack.
     *
     * @returns {number}
     */
    public get frameCount(): number
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
