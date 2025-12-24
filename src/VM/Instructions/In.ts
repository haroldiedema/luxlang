import {State} from '../State.js';

/**
 * @opcode Opcode.IN
 */
export function _in(state: State): void
{
    const container = state.pop(); // The haystack (array, string, object)
    const item      = state.pop(); // The needle

    if (container == null) {
        throw new Error("Argument 'in' null/undefined is invalid.");
    }

    if (Array.isArray(container)) {
        state.push(container.includes(item));
        return;
    }

    if (typeof container === 'string') {
        // Enforce string-to-string comparison to avoid "true" in "string" weirdness
        state.push(container.includes(String(item)));
        return;
    }

    if (container instanceof Map) {
        state.push(container.has(item));
        return;
    }

    if (typeof container === 'object') {
        state.push(item in container);
        return;
    }

    throw new Error(`Runtime Error: 'in' operator not supported for type '${typeof container}'`);
}
