import { State } from '../State.js';

/**
 * @opcode Opcode.MAKE_METHOD
 */
export function makeMethod(state: State): void
{
    const methodFunc = state.pop(); // The ScriptFunction object
    const blueprint  = state.pop(); // The Blueprint object

    if (!blueprint || !blueprint.methods) {
        throw new Error("Runtime Error: Cannot add method to non-blueprint.");
    }

    blueprint.methods[methodFunc.name] = methodFunc;
}
