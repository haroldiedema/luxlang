import {State} from '../State.js';

/**
 * @opcode Opcode.CONST
 */
export function constant(state: State, arg: any): void
{
    state.push(arg);
}
