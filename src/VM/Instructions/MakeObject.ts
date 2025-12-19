import {State} from '../State.js';

/**
 * @opcode Opcode.MAKE_OBJECT
 */
export function makeObject(state: State, arg: number): void
{
    const obj: Record<string, any> = {};

    for (let i = 0; i < arg; i++) {
        const val = state.pop();
        const key = state.pop();
        obj[key] = val;
    }

    state.push(obj);
}
