
import { ForbiddenKeys }  from './ForbiddenKeys.js';
import { dispatchNative } from './NativeDispatcher.js';
import { State }          from './State.js';
import { Opcode }         from '../Compiler/Opcodes.js';
import { Program }        from '../Compiler/Program.js';

/**
 * Handles instruction execution for the VM.
 *
 * This class is auto-generated. Do not edit directly.
 */
export abstract class InstructionSet
{
    protected abstract state: State;
    protected abstract program: Program;
    protected abstract natives: Map<string, Function>;

    /**
     * Executes instructions until the budget is exhausted or the VM halts.
     *
     * @param {number} budget The maximum number of instructions to execute.
     * @returns {boolean} True if the VM has halted, false otherwise.
     */
    public execute(budget: number): boolean
    {
        const state = this.state;
        const instructions = this.program.instructions;

        while (budget > 0 && !state.isHalted) {
            const instr = instructions[state.ip];
            state.ip++; // Automatic IP Increment (Standard VM behavior)

            switch (instr.op) {
                case Opcode.ADD: this.__op_add(instr.arg); break;
                case Opcode.CALL: this.__op_call(instr.arg); break;
                case Opcode.CALL_METHOD: this.__op_callMethod(instr.arg); break;
                case Opcode.CONST: this.__op_constant(instr.arg); break;
                case Opcode.DIV: this.__op_div(instr.arg); break;
                case Opcode.DUP: this.__op_dup(instr.arg); break;
                case Opcode.EQ: this.__op_eq(instr.arg); break;
                case Opcode.GET_PROP: this.__op_getProp(instr.arg); break;
                case Opcode.GT: this.__op_gt(instr.arg); break;
                case Opcode.GTE: this.__op_gte(instr.arg); break;
                case Opcode.HALT: this.__op_halt(instr.arg); break;
                case Opcode.ITER_INIT: this.__op_iterInit(instr.arg); break;
                case Opcode.ITER_NEXT: this.__op_iterNext(instr.arg); break;
                case Opcode.JMP: this.__op_jmp(instr.arg); break;
                case Opcode.JMP_IF_FALSE: this.__op_jmpIfFalse(instr.arg); break;
                case Opcode.JMP_IF_TRUE: this.__op_jmpIfTrue(instr.arg); break;
                case Opcode.LOAD: this.__op_load(instr.arg); break;
                case Opcode.LT: this.__op_lt(instr.arg); break;
                case Opcode.LTE: this.__op_lte(instr.arg); break;
                case Opcode.MAKE_ARRAY: this.__op_makeArray(instr.arg); break;
                case Opcode.MAKE_FUNCTION: this.__op_makeFunction(instr.arg); break;
                case Opcode.MAKE_OBJECT: this.__op_makeObject(instr.arg); break;
                case Opcode.MUL: this.__op_mul(instr.arg); break;
                case Opcode.NEG: this.__op_neg(instr.arg); break;
                case Opcode.NEQ: this.__op_neq(instr.arg); break;
                case Opcode.NOT: this.__op_not(instr.arg); break;
                case Opcode.POP: this.__op_pop(instr.arg); break;
                case Opcode.RET: this.__op_ret(instr.arg); break;
                case Opcode.SET_PROP: this.__op_setProp(instr.arg); break;
                case Opcode.STORE: this.__op_store(instr.arg); break;
                case Opcode.SUB: this.__op_sub(instr.arg); break;
            }

            budget--;
        }

        return state.isHalted;
    }
    
    protected __op_add(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a + b);
    }

    protected __op_call(arg: any): void
    {
        if (arg.name && this.natives.has(arg.name)) {
            const args = [];
    
            for (let i = 0; i < arg.args; i++) {
                args.unshift(this.state.pop());
            }
    
            const result = this.natives.get(arg.name)!(...args);
    
            if (typeof result !== 'undefined') {
                this.state.push(result);
            }
            return;
        }
    
        this.state.pushFrame(this.state.ip);
        this.state.ip = arg.addr;
    }

    protected __op_callMethod(arg: any): void
    {
        const name: string      = arg.name;
        const argsCount: number = arg.args;
        const receiver: any     = this.state.pop();
    
        if (!receiver || typeof receiver !== 'object') {
            throw new Error(`CALL_METHOD: Receiver is not an object`);
        }
    
        const func = receiver[name];
    
        // Method is a user-defined function (bytecode).
        if (typeof func === 'object' && func.addr !== undefined) {
            const currentFrame = this.state.pushFrame(this.state.ip);
    
            currentFrame.locals['this'] = receiver;
            this.state.ip                    = func.addr;
    
            return;
        }
    
        // Native method call.
        if (typeof func === 'function') {
            const args = [];
    
            for (let i = 0; i < argsCount; i++) {
                args.unshift(this.state.pop());
            }
    
            const result = dispatchNative(receiver, name, args)
            this.state.push(result);
            return;
        }
    
        throw new Error(`CALL_METHOD: Method '${name}' not found on receiver`);
    }

    protected __op_constant(arg: any): void
    {
        this.state.push(arg);
    }

    protected __op_div(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a / b);
    }

    protected __op_dup(arg: any): void
    {
        const val = this.state.peek();
    
        this.state.push(val);
    }

    protected __op_eq(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a == b);
    }

    protected __op_getProp(arg: any): void
    {
        const key: string = this.state.pop();
        const obj: any    = this.state.pop();
    
        if (ForbiddenKeys.has(key)) {
            throw new Error(`Access to property '${key}' is forbidden.`);
        }
    
        if (Array.isArray(obj)) {
            const index = Number(key);
            if (isNaN(index)) throw new Error(`Runtime Error: Array index must be a number, got '${key}'`);
            if (index < 0 || index >= obj.length) throw new Error(`Index #${index} is out of bounds.`);
    
            this.state.push(obj[index]);
        } else if (obj instanceof Map) {
            const val = obj.get(key);
            this.state.push(val === undefined ? null : val);
        } else if (obj && typeof obj === 'object') {
            const val = obj[key];
            this.state.push(val === undefined ? null : val);
        } else {
            const target = arg ? `'${arg}'` : 'object';
            throw new Error(`Cannot access property '${key}' of ${target} because ${target} is not defined.`);
        }
    }

    protected __op_gt(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a > b);
    }

    protected __op_gte(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a >= b);
    }

    protected __op_halt(arg: any): void
    {
        this.state.isHalted = true;
    }

    protected __op_iterInit(arg: any): void
    {
        this.state.push({items: this.state.pop(), index: 0});
    }

    protected __op_iterNext(arg: any): void
    {
        const iterator = this.state.peek();
    
        if (iterator.index >= iterator.items.length) {
            this.state.pop();
            this.state.ip = arg;
            return;
        }
    
        const item = iterator.items[iterator.index];
        iterator.index++;
        this.state.push(item);
    }

    protected __op_jmp(arg: any): void
    {
        this.state.ip = arg;
    }

    protected __op_jmpIfFalse(arg: any): void
    {
        const condition = this.state.pop();
    
        if (!condition) {
            this.state.ip = arg;
        }
    }

    protected __op_jmpIfTrue(arg: any): void
    {
        const condition = this.state.pop();
    
        if (condition) {
            this.state.ip = arg;
        }
    }

    protected __op_load(arg: any): void
    {
        const value = this.state.getVar(arg);
    
        this.state.push(value);
    }

    protected __op_lt(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a < b);
    }

    protected __op_lte(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a <= b);
    }

    protected __op_makeArray(arg: any): void
    {
        const arr: any[] = [];
    
        for (let i: number = 0; i < arg; i++) {
            arr.unshift(this.state.pop());
        }
    
        this.state.push(arr);
    }

    protected __op_makeFunction(arg: any): void
    {
        this.state.push({
            type: 'ScriptFunction',
            addr: arg.addr,
            args: arg.args
        });
    }

    protected __op_makeObject(arg: any): void
    {
        const obj: Record<string, any> = {};
    
        for (let i = 0; i < arg; i++) {
            const val = this.state.pop();
            const key = this.state.pop();
            obj[key] = val;
        }
    
        this.state.push(obj);
    }

    protected __op_mul(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a * b);
    }

    protected __op_neg(arg: any): void
    {
        const value = this.state.pop();
        this.state.push(-value);
    }

    protected __op_neq(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a != b);
    }

    protected __op_not(arg: any): void
    {
        const value = this.state.pop();
        this.state.push(!value);
    }

    protected __op_pop(arg: any): void
    {
        this.state.pop();
    }

    protected __op_ret(arg: any): void
    {
        const frame = this.state.popFrame();
    
        if (!frame) {
            this.state.isHalted = true;
            return;
        }
    
        this.state.ip = frame.returnIp;
    
        if (frame.isInterrupt) {
            this.state.pop(); // Clean the returned value from the stack.
        }
    }

    protected __op_setProp(arg: any): void
    {
        const val = this.state.pop();
        const key = this.state.pop();
        const obj = this.state.pop();
    
        if (ForbiddenKeys.has(key)) {
            throw new Error(`Access to property '${key}' is forbidden.`);
        }
    
        if (Array.isArray(obj)) {
            const index = Number(key);
    
            if (isNaN(index)) {
                throw new Error(`Runtime Error: Array index must be a number, got '${key}'`);
            }
    
            obj[index] = val;
        } else if (obj instanceof Map) {
            obj.set(key, val);
        } else if (obj && typeof obj === 'object') {
            obj[key] = val;
        } else {
            const target = arg ? `'${arg}'` : 'object';
            throw new Error(`Cannot set property '${key}' of ${target} because ${target} is not defined.`);
        }
    
        this.state.push(val);
    }

    protected __op_store(arg: any): void
    {
        const value = this.state.pop();
    
        this.state.setVar(arg, value);
    }

    protected __op_sub(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a - b);
    }
}
