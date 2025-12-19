// VM/MethodDispatcher.ts

// 1. Define allowed methods for Primitives (The "Standard Lib")
const ARRAY_ALLOWLIST = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'indexOf', 'reverse', 'sort', 'join']);
const STRING_ALLOWLIST = new Set(['substring', 'toLowerCase', 'toUpperCase', 'trim']);
const NUMBER_ALLOWLIST = new Set(['toFixed', 'toString']);

// 2. Define forbidden methods on Objects (even if they exist)
const BANNED_OBJECT_METHODS = new Set([
    'constructor', '__defineGetter__', '__defineSetter__',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
]);

export function dispatchNative(receiver: any, name: string, args: any[]): any {
    // --- CASE A: Arrays (Intercept & Emulate) ---
    if (Array.isArray(receiver)) {
        if (!ARRAY_ALLOWLIST.has(name)) {
            throw new Error(`Method '${name}' is not allowed on Arrays. Allowed methods: ${Array.from(ARRAY_ALLOWLIST).join(', ')}`);
        }
        // Direct safe invocation. We know 'push' is safe on an array.
        // We do NOT use receiver[name].apply() because a user could have shadowed 'push'.
        // We use the Array.prototype directly to guarantee behavior.
        return (Array.prototype as any)[name].apply(receiver, args);
    }

    // --- CASE B: Strings (Intercept & Emulate) ---
    if (typeof receiver === 'string') {
        if (!STRING_ALLOWLIST.has(name)) {
            throw new Error(`Method '${name}' is not allowed on Strings. Allowed methods: ${Array.from(STRING_ALLOWLIST).join(', ')}`);
        }
        return (String.prototype as any)[name].apply(receiver, args);
    }

    // --- CASE B2: Numbers (Intercept & Emulate) ---
    if (typeof receiver === 'number') {
        if (!NUMBER_ALLOWLIST.has(name)) {
            throw new Error(`Method '${name}' is not allowed on Numbers. Allowed methods: ${Array.from(NUMBER_ALLOWLIST).join(', ')}`);
        }

        return (Number.prototype as any)[name].apply(receiver, args);
    }

    // --- CASE C: Host Objects (The "Functions" you passed) ---
    if (typeof receiver === 'object' && receiver !== null) {

        // 1. Security Check: Is this a banned prototype method?
        if (BANNED_OBJECT_METHODS.has(name)) {
            throw new Error(`Security Error: Call to '${name}' is forbidden.`);
        }

        // 2. Existence Check
        const func = receiver[name];
        if (typeof func !== 'function') {
            throw new Error(`Property '${name}' is not a function.`);
        }

        // 3. Execution
        // This is safe because 'receiver' is an object YOU provided.
        // We blocked 'constructor' in GET_PROP, and we blocked 'toString' etc above.
        return func.apply(receiver, args);
    }

    throw new Error(`Runtime Error: Cannot call method '${name}' on this type.`);
}
