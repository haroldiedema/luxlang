// This file is auto-generated via "scripts/generate.ts". Do not edit directly.
import { ForbiddenKeys }       from './ForbiddenKeys.js';
import { dispatchNative }      from './NativeDispatcher.js';
import { State }               from './State.js';
import { Instruction, Opcode } from '../Compiler/Opcodes.js';
import { Program }             from '../Compiler/Program.js';

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
    protected abstract moduleCache: Record<string, any>;
    protected abstract resolveModule: (moduleName: string) => Program | undefined;
    
    /**
     * Executes instructions until the budget is exhausted or the VM halts.
     *
     * @param {number} budget The maximum number of instructions to execute.
     * @param {number} deltaTime The time elapsed since the last execution (in milliseconds).
     * @returns {boolean} True if the VM has halted, false otherwise.
     */
    protected execute(budget: number, deltaTime: number = 16.6): [number, boolean]
    {
        const state = this.state;

        state.wallTime += deltaTime;

        for (const frame of state.frames) {
            if (frame.sleepTimer > 0) {
                frame.sleepTimer -= deltaTime;
                frame.sleepTimer = Math.max(0, frame.sleepTimer);
            }
        }

        if (state.sleepTime > 0) {
            state.sleepTime -= deltaTime;
            state.sleepTime = Math.max(0, state.sleepTime);
        }

        if (state.isSleeping) {
            return [budget, false];
        }

        while (budget > 0 && ! state.isHalted && ! state.isSleeping) {
            budget--;

            // Note: Don't use the cached version of program/instructions here,
            //       as the currentProgram may change due to CALL/CALL_METHOD/IMPORT.
            const instructions = state.currentProgram.instructions;
            if (state.ip >= instructions.length) {
                state.isHalted = true;
                break;
            }

            const instr = instructions[state.ip];
            if (! instr?.op) {
                throw new Error(`Instruction format invalid: ${JSON.stringify(instr)}`);
            }

            state.ip++; // Automatic IP Increment (Standard VM behavior)

            switch (instr.op) {
                case Opcode.ADD: this.__op_add(instr.arg); break;
                case Opcode.ARRAY_PUSH: this.__op_arrayPush(instr.arg); break;
                case Opcode.CALL: this.__op_call(instr.arg); break;
                case Opcode.CALL_METHOD: this.__op_callMethod(instr.arg); break;
                case Opcode.CONST: this.__op_constant(instr.arg); break;
                case Opcode.DIV: this.__op_div(instr.arg); break;
                case Opcode.DUP: this.__op_dup(instr.arg); break;
                case Opcode.EQ: this.__op_eq(instr.arg); break;
                case Opcode.EXP: this.__op_exp(instr.arg); break;
                case Opcode.EXPORT: this.__op__export(instr.arg); break;
                case Opcode.GET_PROP: this.__op_getProp(instr.arg); break;
                case Opcode.GT: this.__op_gt(instr.arg); break;
                case Opcode.GTE: this.__op_gte(instr.arg); break;
                case Opcode.HALT: this.__op_halt(instr.arg); break;
                case Opcode.IMPORT: this.__op__import(instr.arg); break;
                case Opcode.IN: this.__op__in(instr.arg); break;
                case Opcode.ITER_INIT: this.__op_iterInit(instr.arg); break;
                case Opcode.ITER_NEXT: this.__op_iterNext(instr.arg); break;
                case Opcode.JMP: this.__op_jmp(instr.arg); break;
                case Opcode.JMP_IF_FALSE: this.__op_jmpIfFalse(instr.arg); break;
                case Opcode.JMP_IF_TRUE: this.__op_jmpIfTrue(instr.arg); break;
                case Opcode.LOAD: this.__op_load(instr.arg); break;
                case Opcode.LT: this.__op_lt(instr.arg); break;
                case Opcode.LTE: this.__op_lte(instr.arg); break;
                case Opcode.MAKE_ARRAY: this.__op_makeArray(instr.arg); break;
                case Opcode.MAKE_BLUEPRINT: this.__op_makeBlueprint(instr.arg); break;
                case Opcode.MAKE_FUNCTION: this.__op_makeFunction(instr.arg); break;
                case Opcode.MAKE_METHOD: this.__op_makeMethod(instr.arg); break;
                case Opcode.MAKE_OBJECT: this.__op_makeObject(instr.arg); break;
                case Opcode.MOD: this.__op_mod(instr.arg); break;
                case Opcode.MUL: this.__op_mul(instr.arg); break;
                case Opcode.NEG: this.__op_neg(instr.arg); break;
                case Opcode.NEQ: this.__op_neq(instr.arg); break;
                case Opcode.NEW: this.__op__new(instr.arg); break;
                case Opcode.NOT: this.__op_not(instr.arg); break;
                case Opcode.POP: this.__op_pop(instr.arg); break;
                case Opcode.RET: this.__op_ret(instr.arg); break;
                case Opcode.SET_PROP: this.__op_setProp(instr.arg); break;
                case Opcode.STORE: this.__op_store(instr.arg); break;
                case Opcode.SUB: this.__op_sub(instr.arg); break;
                case Opcode.SWAP: this.__op_swap(instr.arg); break;
                case Opcode.WAIT: this.__op_wait(instr.arg); break;
                default:
                    throw new Error(`Unknown opcode: ${instr.op}`);
            }
        }

        return [budget, state.isHalted];
    }
    
    protected __op_add(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a + b);
    }

    protected __op_arrayPush(arg: any): void
    {
        const value = this.state.pop();
        const array = this.state.pop(); // Pop the array reference
    
        if (!Array.isArray(array)) throw new Error("Expected array");
    
        array.push(value);
    }

    protected __op_call(arg: any): void
    {
        const operand: {
            name: string,
            addr: number | null, // explicitly allow null
            args: number,
        } = arg;
    
        if (operand.addr !== null && operand.addr !== undefined) {
            this.state.pushFrame(this.state.ip, {
                name: operand.name,
            });
            this.state.ip = operand.addr;
            return;
        }
    
        if (operand.name && this.natives.has(operand.name)) {
            const args: any[] = [];
            for (let i = 0; i < operand.args; i++) {
                args.unshift(this.state.pop());
            }
    
            const result = this.natives.get(operand.name)!(...args);
            this.state.push(result ?? null);
            return;
        }
    
        throw new Error(`The function "${operand.name}" does not exist.`);
    }

    protected __op_callMethod(arg: any): void
    {
        const name: string      = arg.name;
        const argsCount: number = arg.args;
        const receiver: any     = this.state.pop();
    
        if (! receiver || typeof receiver !== 'object') {
            throw new Error(receiver
                ? `Attempt to call method '${name}' on ${typeof receiver}.`
                : `Attempt to call method '${name}' on an undefined value.`
            );
        }
    
        const func = receiver[name];
    
        // Method is a user-defined function (bytecode).
        if (typeof func === 'object' && func.addr !== undefined && func.prog !== undefined) {
            const currentFrame = this.state.pushFrame(this.state.ip, {
                name:    func.name,
                program: func.prog,
            });
    
            currentFrame.locals['this'] = receiver;
            this.state.ip                    = func.addr;
            return;
        }
    
        // Native method call.
        if (typeof func === 'function') {
            const args: any[] = [];
    
            for (let i = 0; i < argsCount; i++) {
                args.unshift(this.state.pop());
            }
    
            const result = dispatchNative(receiver, name, args);
            this.state.push(result);
            return;
        }
    
        // Blueprint method call.
        if (receiver && typeof receiver === 'object' && '__methods' in receiver && '__blueprint' in receiver) {
            if (! (receiver.__methods && typeof receiver.__methods[name] === 'object')) {
                throw new Error(`The method "${name}" does not exist on "${receiver.__blueprint.name}".`);
            }
    
            const methodFunc = receiver.__methods[name];
    
            const currentFrame = this.state.pushFrame(this.state.ip, {
                name:    methodFunc.name,
                program: methodFunc.prog,
            });
    
            currentFrame.locals['this'] = receiver;
            this.state.ip                    = methodFunc.addr;
            return;
        }
    
        throw new Error(`The method "${name}" does not exist on the receiver object.`);
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

    protected __op_exp(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a ** b);
    }

    protected __op__export(arg: any): void
    {
        const val  = this.state.pop();
        const name = this.state.pop();
    
        const frame = this.state.frames[this.state.frames.length - 1];
    
        // If we are in the main scope (no frames) or a frame without export tracking,
        // we can either throw or ignore. Usually, modules run inside a frame.
        if (! frame) {
            return;
        }
    
        frame.exports[name] = val;
    }

    protected __op_getProp(arg: any): void
    {
        const key: string = this.state.pop();
        const obj: any    = this.state.pop();
    
        if (ForbiddenKeys.has(key)) {
            throw new Error(`Access to property '${key}' is forbidden.`);
        }
    
        if (Array.isArray(obj)) {
            if (key === 'length' || key === 'size') {
                this.state.push(obj.length);
                return;
            }
    
            const index = Number(key);
            if (isNaN(index)) throw new Error(`Array index must be a number, got '${key}'`);
            if (index < 0 || index >= obj.length) throw new Error(`The index #${index} is out of bounds [0] - [${obj.length - 1}].`);
    
            this.state.push(obj[index]);
        } else if (obj instanceof Map) {
            const val = obj.get(key);
            this.state.push(val === undefined ? null : val);
        } else if (obj && typeof obj === 'object') {
            if (! (key in obj)) {
                const o = arg ? `"${arg}"` : '"object"';
                throw new Error (`The property '${key}' does not exist on ${o}.`);
            }
    
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

    protected __op__import(arg: any): void
    {
        // 1. Cache Check
        if (this.moduleCache[arg]) {
            const moduleExports = this.moduleCache[arg];
    
            if (typeof moduleExports !== 'object') {
                throw new Error(`Cached module is invalid: ${arg}`);
            }
    
            // 2. Handle Cached Module (No instructions)
            if (! moduleExports.instructions) {
                this.state.push(moduleExports);
                return;
            }
    
            // 3. Execution Setup (The Context Switch)
            this.state.pushFrame(this.state.ip, {
                isModule:   true,
                program:    moduleExports,
                moduleName: arg,
            });
    
            this.state.ip = 0;
            return;
        }
    
        const moduleProgram = this.resolveModule(arg);
        if (! moduleProgram || typeof moduleProgram !== 'object') {
            throw new Error(`The module "${arg}" does not exist.`);
        }
    
        // 3. Handle Native/JSON Modules (No instructions)
        if (! moduleProgram.instructions) {
            this.state.push(moduleProgram);
            // Save to cache immediately since there is no execution step
            this.moduleCache[arg] = moduleProgram;
            return;
        }
    
        // 4. Execution Setup (The Context Switch)
        this.state.pushFrame(this.state.ip, {
            isModule:   true,
            program:    moduleProgram,
            moduleName: arg,
        });
    
        this.state.ip = 0;
    }

    protected __op__in(arg: any): void
    {
        const container = this.state.pop(); // The haystack (array, string, object)
        const item      = this.state.pop(); // The needle
    
        if (container == null) {
            throw new Error("Argument 'in' null/undefined is invalid.");
        }
    
        if (Array.isArray(container)) {
            this.state.push(container.includes(item));
            return;
        }
    
        if (typeof container === 'string') {
            // Enforce string-to-string comparison to avoid "true" in "string" weirdness
            this.state.push(container.includes(String(item)));
            return;
        }
    
        if (container instanceof Map) {
            this.state.push(container.has(item));
            return;
        }
    
        if (typeof container === 'object') {
            this.state.push(item in container);
            return;
        }
    
        throw new Error(`Runtime Error: 'in' operator not supported for type '${typeof container}'`);
    }

    protected __op_iterInit(arg: any): void
    {
        this.state.push({items: this.state.pop(), index: 0});
    }

    protected __op_iterNext(arg: any): void
    {
        const iterator = this.state.peek();
    
        if (! iterator) {
            throw new Error('Iterator expected on stack');
        }
    
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

    protected __op_makeBlueprint(arg: any): void
    {
        const [name, addr, paramCount] = arg;
    
        this.state.push({
            type:            'Blueprint',
            name:            name,
            constructorAddr: addr,
            paramCount:      paramCount || 0,
            methods:         {},
            prog:            this.state.currentProgram,
        });
    }

    protected __op_makeFunction(arg: any): void
    {
        this.state.push({
            type: 'ScriptFunction',
            addr: arg.addr,
            args: arg.args,
            name: arg.name,
            prog: this.state.currentProgram,
        });
    }

    protected __op_makeMethod(arg: any): void
    {
        const methodFunc = this.state.pop(); // The ScriptFunction object
        const blueprint  = this.state.pop(); // The Blueprint object
    
        if (!blueprint || !blueprint.methods) {
            throw new Error("Runtime Error: Cannot add method to non-blueprint.");
        }
    
        console.log('ATTACH:', methodFunc);
    
        // Attach it!
        blueprint.methods[methodFunc.name] = methodFunc;
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

    protected __op_mod(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a % b);
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

    protected __op__new(arg: any): void
    {
        const argCount: number = arg;
    
        // 1. Pop the Blueprint (It is now at the top!)
        const blueprint = this.state.pop();
    
        console.log("BLUEPRINT:", blueprint);
    
        if (!blueprint || blueprint.type !== 'Blueprint') {
            throw new Error('\'new\' requires a Blueprint.');
        }
    
        // 2. Create Instance (Pre-allocation)
        const instance: any = {
            __blueprint: blueprint,
            __methods:   blueprint.methods,
        };
    
        // 3. Create Frame
        // We do NOT pop args here. We leave them for the constructor's STORE ops to consume.
        const frame = this.state.pushFrame(this.state.ip, {
            program:    blueprint.prog,
            moduleName: blueprint.prog.name,
            name:       `new ${blueprint.name}`,
        });
    
        // 4. Inject 'this'
        frame.locals['this'] = instance;
    
        // 5. Jump to Constructor
        this.state.ip = blueprint.constructorAddr;
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
    
            if (this.state.eventQueue.length > 0) {
                // A. Get the next event
                const nextEvent = this.state.eventQueue.shift()!;
                const eventInfo = this.program.references.events[nextEvent.name];
    
                // B. Push Args for the NEXT event
                for (let i = 0; i < eventInfo.numArgs; i++) {
                    this.state.stack.push(nextEvent.args[i] ?? null);
                }
    
                // C. Push a NEW Interrupt Frame
                // CRITICAL: We reuse the 'returnIp' from the frame we JUST popped.
                // This ensures that when the chain finally ends, we go back to the Main Script.
                this.state.pushFrame(frame.returnIp, {
                    name:       `<interrupt:${nextEvent.name}>`,
                    isInterrupt: true
                });
    
                // D. Jump to the next event
                this.state.ip = eventInfo.address;
    
                // We are done. We do NOT restore this.state.ip from the old frame yet.
                return;
            }
    
            // 3. Chain Empty? Now we actually return to the Main Script.
            this.state.ip = frame.returnIp;
            return;
        }
    
        if (frame.isModule) {
            const exports: Record<string, any> = {};
            for (const [key, value] of Object.entries(frame.exports)) {
                exports[key] = value;
            }
    
            if (frame.moduleName) {
                this.moduleCache[frame.moduleName] = exports;
            }
    
            this.state.push(exports);
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
        const [name, isLocal] = arg;
        const value = this.state.pop();
    
        this.state.setVar(name, value, isLocal ?? false);
    }

    protected __op_sub(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(a - b);
    }

    protected __op_swap(arg: any): void
    {
        const b = this.state.pop();
        const a = this.state.pop();
    
        this.state.push(b);
        this.state.push(a);
    }

    protected __op_wait(arg: any): void
    {
        const duration = this.state.pop();
    
        if (typeof duration !== 'number' || duration < 0) {
            throw new Error(`Invalid duration for WAIT: ${duration}`);
        }
    
        // Check if we are inside a function/interrupt
        if (this.state.frames.length > 0) {
            const frame = this.state.frames[this.state.frames.length - 1];
            frame.sleepTimer = duration;
        } else {
            // Otherwise, we are pausing the Main Script
            this.state.sleepTime = duration;
        }
    }
}
