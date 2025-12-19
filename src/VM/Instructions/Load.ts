import {State} from '../State.js';

/**
 * @opcode Opcode.LOAD
 */
export function load(state: State, arg: any): void
{
    const value = state.getVar(arg);

    state.push(value);
}
