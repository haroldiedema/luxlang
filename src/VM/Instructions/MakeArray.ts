import {State} from '../State.js';

/**
 * @opcode Opcode.MAKE_ARRAY
 */
export function makeArray(state: State, arg: number): void
{
    const arr: any[] = [];

    for (let i: number = 0; i < arg; i++) {
        arr.unshift(state.pop());
    }

    state.push(arr);
}
