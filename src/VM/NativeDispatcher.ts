// Allowed methods for Primitives (The "Standard Lib")
const ARRAY_ALLOWLIST  = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'indexOf', 'reverse', 'sort', 'join']);
const STRING_ALLOWLIST = new Set(['substring', 'toLowerCase', 'toUpperCase', 'trim']);
const NUMBER_ALLOWLIST = new Set(['toFixed', 'toString']);

// Forbidden methods on Objects (even if they exist)
const BANNED_OBJECT_METHODS = new Set([
    'constructor', '__defineGetter__', '__defineSetter__',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
]);

export function dispatchNative(receiver: any, name: string, args: any[]): any {
    // Arrays (Intercept & Emulate)
    if (Array.isArray(receiver)) {
        if (!ARRAY_ALLOWLIST.has(name)) {
            throw new Error(`Method '${name}' is not allowed on Arrays. Allowed methods: ${Array.from(ARRAY_ALLOWLIST).join(', ')}`);
        }

        return (Array.prototype as any)[name].apply(receiver, args);
    }

    // Strings (Intercept & Emulate)
    if (typeof receiver === 'string') {
        if (!STRING_ALLOWLIST.has(name)) {
            throw new Error(`Method '${name}' is not allowed on Strings. Allowed methods: ${Array.from(STRING_ALLOWLIST).join(', ')}`);
        }
        return (String.prototype as any)[name].apply(receiver, args);
    }

    // Numbers (Intercept & Emulate)
    if (typeof receiver === 'number') {
        if (!NUMBER_ALLOWLIST.has(name)) {
            throw new Error(`Method '${name}' is not allowed on Numbers. Allowed methods: ${Array.from(NUMBER_ALLOWLIST).join(', ')}`);
        }

        return (Number.prototype as any)[name].apply(receiver, args);
    }

    // Host Functions passed to the VirtualMachine options.
    if (typeof receiver === 'object' && receiver !== null) {

        if (BANNED_OBJECT_METHODS.has(name)) {
            throw new Error(`Security Error: Call to '${name}' is forbidden.`);
        }

        const func = receiver[name];
        if (typeof func !== 'function') {
            throw new Error(`Property '${name}' is not a function.`);
        }

        return func.apply(receiver, args);
    }

    throw new Error(`Runtime Error: Cannot call method '${name}' on this type.`);
}
