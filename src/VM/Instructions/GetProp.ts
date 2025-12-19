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
        throw new Error(`Access to property '${key}' is forbidden.`);
    }

    if (Array.isArray(obj)) {
        const index = Number(key);
        if (isNaN(index)) throw new Error(`Runtime Error: Array index must be a number, got '${key}'`);
        if (index < 0 || index >= obj.length) throw new Error(`Index #${index} is out of bounds.`);

        state.push(obj[index]);
    } else if (obj instanceof Map) {
        const val = obj.get(key);
        state.push(val === undefined ? null : val);
    } else if (obj && typeof obj === 'object') {
        const val = obj[key];
        state.push(val === undefined ? null : val);
    } else {
        const target = arg ? `'${arg}'` : 'object';
        throw new Error(`Cannot access property '${key}' of ${target} because ${target} is not defined.`);
    }
}
