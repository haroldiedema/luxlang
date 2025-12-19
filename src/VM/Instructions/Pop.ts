import {State} from '../State.js';

/**
 * @opcode Opcode.POP
 */
export function pop(state: State): void
{
    state.pop();
}
