import { State } from '../State.js';

/**
 * @opcode Opcode.IMPORT
 */
export function _import(state: State, arg: string, moduleCache: any, resolveModule: any): void
{
    // 1. Cache Check
    if (moduleCache[arg]) {
        const moduleExports = moduleCache[arg];

        if (typeof moduleExports !== 'object') {
            throw new Error(`Cached module is invalid: ${arg}`);
        }

        // 2. Handle Cached Module (No instructions)
        if (! moduleExports.instructions) {
            state.push(moduleExports);
            return;
        }

        // 3. Execution Setup (The Context Switch)
        state.pushFrame(state.ip, {
            isModule:   true,
            program:    moduleExports,
            moduleName: arg,
        });

        state.ip = 0;
        return;
    }

    const moduleProgram = resolveModule(arg);
    if (! moduleProgram || typeof moduleProgram !== 'object') {
        throw new Error(`The module "${arg}" does not exist.`);
    }

    // 3. Handle Native/JSON Modules (No instructions)
    if (! moduleProgram.instructions) {
        state.push(moduleProgram);
        // Save to cache immediately since there is no execution step
        moduleCache[arg] = moduleProgram;
        return;
    }

    // 4. Execution Setup (The Context Switch)
    state.pushFrame(state.ip, {
        isModule:   true,
        program:    moduleProgram,
        moduleName: arg,
    });

    state.ip = 0;
}
