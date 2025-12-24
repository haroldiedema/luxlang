import {State} from '../State.js';

/**
 * @opcode Opcode.MAKE_OBJECT
 */
export function makeObject(state: State, arg: number): void
{
    const obj: Record<string, any> = {};

    // Mark this object as a VM object with a hidden property
    Object.defineProperty(obj, '__is_vm_object__', {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
    });

    for (let i = 0; i < arg; i++) {
        const val = state.pop();
        const key = state.pop();
        obj[key] = val;
    }

    state.push(obj);
}
