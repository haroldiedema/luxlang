import { State } from '../State.js';

/**
 * @opcode Opcode.MAKE_RANGE
 */
export function makeRange(state: State, arg: number): void
{
    const end: number   = state.pop();
    const start: number = state.pop();
    const arr: number[] = [];

    for (let i: number = start; i < end; i++) {
        arr.push(i);
    }

    state.push(arr);
}
