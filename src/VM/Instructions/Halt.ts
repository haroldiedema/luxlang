import {State} from '../State.js';

/**
 * @opcode Opcode.HALT
 */
export function halt(state: State): void
{
    state.isHalted = true;
}
