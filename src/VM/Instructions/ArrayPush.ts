import {State} from '../State.js';

/**
 * @opcode Opcode.ARRAY_PUSH
 */
export function arrayPush(state: State, arg: any): void
{
    const value = state.pop();
    const array = state.pop(); // Pop the array reference

    if (!Array.isArray(array)) throw new Error("Expected array");

    array.push(value);
}
