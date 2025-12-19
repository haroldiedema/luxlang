import {State} from '../State.js';

/**
 * @opcode Opcode.STORE
 */
export function store(state: State, arg: any): void
{
    const value = state.pop();

    state.setVar(arg, value);
}
