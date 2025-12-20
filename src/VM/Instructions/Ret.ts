import {State} from '../State.js';

/**
 * @opcode Opcode.RET
 */
export function ret(state: State, arg: any, moduleCache: any): void
{
    const frame = state.popFrame();

    if (!frame) {
        state.isHalted = true;
        return;
    }

    state.ip = frame.returnIp;

    if (frame.isInterrupt) {
        state.pop(); // Clean the returned value from the stack.
        return;
    }

    if (frame.isModule) {
        // Collect exports
        const exports: Record<string, any> = {};
        for (const [key, value] of Object.entries(frame.exports)) {
            exports[key] = value;
        }

        if (frame.moduleName) {
            moduleCache[frame.moduleName] = exports;
        }

        state.push(exports);
    }
}
