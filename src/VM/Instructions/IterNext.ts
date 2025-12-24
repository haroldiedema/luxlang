import {State} from '../State.js';

/**
 * @opcode Opcode.ITER_NEXT
 */
export function iterNext(state: State, arg: number): void
{
    const iterator = state.peek();

    if (! iterator) {
        throw new Error('Iterator expected on stack');
    }

    if (iterator.index >= iterator.items.length) {
        state.pop();
        state.ip = arg;
        return;
    }

    const item = iterator.items[iterator.index];
    iterator.index++;
    state.push(item);
}
