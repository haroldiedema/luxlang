import {ForbiddenKeys} from '../ForbiddenKeys.js';
import {State}         from '../State.js';

/**
 * @opcode Opcode.SET_PROP
 */
export function setProp(state: State, arg: string): void
{
    const val = state.pop();
    const key = state.pop();
    const obj = state.pop();

    if (ForbiddenKeys.has(key)) {
        throw new Error(`Access to property '${key}' is forbidden.`);
    }

    if (Array.isArray(obj)) {
        const index = Number(key);

        if (isNaN(index)) {
            throw new Error(`Runtime Error: Array index must be a number, got '${key}'`);
        }

        obj[index] = val;
    } else if (obj instanceof Map) {
        obj.set(key, val);
    } else if (obj && typeof obj === 'object') {
        obj[key] = val;
    } else {
        const target = arg ? `'${arg}'` : 'object';
        throw new Error(`Cannot set property '${key}' of ${target} because ${target} is not defined.`);
    }

    state.push(val);
}
