import {ForbiddenKeys} from '../ForbiddenKeys.js';
import {State}         from '../State.js';

/**
 * @opcode Opcode.GET_PROP
 */
export function getProp(state: State, arg: string): void
{
    const key: string = state.pop();
    const obj: any    = state.pop();

    if (ForbiddenKeys.has(key)) {
        throw new Error(`Access to property "${key}" is forbidden.`);
    }

    if (Array.isArray(obj)) {
        if (key === 'length' || key === 'size') {
            state.push(obj.length);
            return;
        }

        const index = Number(key);
        if (isNaN(index)) throw new Error(`Array index must be a number, got "${key}".`);
        if (index < 0 || index >= obj.length) throw new Error(`The index #${index} is out of bounds [0] - [${obj.length - 1}].`);

        state.push(obj[index]);
    } else if (obj instanceof Map) {
        const val = obj.get(key);
        state.push(val === undefined ? null : val);
    } else if (obj && typeof obj === 'object') {
        if (! (key in obj)) {
            const o = arg ? `"${arg}"` : '"object"';
            throw new Error (`The property "${key}" does not exist on ${o}.`);
        }

        const val = obj[key];
        state.push(val === undefined ? null : val);
    } else {
        const target = arg ? `'${arg}'` : 'object';
        throw new Error(`Cannot access property "${key}" of "${target}" because "${target}" is not defined.`);
    }
}
