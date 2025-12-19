import {State} from '../State.js';

/**
 * @opcode Opcode.ITER_INIT
 */
export function iterInit(state: State): void
{
    state.push({items: state.pop(), index: 0});
}
