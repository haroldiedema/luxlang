import { State } from '../State.js';

/**
 * @opcode Opcode.EXPORT
 */
export function _export(state: State): void
{
    const exportName = state.pop();
    const sourceName = state.pop();
    const frame = state.frames[state.frames.length - 1];

    if (!frame) return;

    const moduleHash = frame.program.hash;
    const exports    = frame.exports;

    // 1. Metadata setup (Same as before)
    if (!Object.prototype.hasOwnProperty.call(exports, '__vm_meta')) {
        Object.defineProperty(exports, '__vm_meta', {
            value: {
                hash: moduleHash,
                bindings: {} as Record<string, string>
            },
            enumerable: false,
            writable: true,
            configurable: true
        });
    }

    exports.__vm_meta.bindings[exportName] = sourceName;

    // 2. Define Getter AND Setter
    Object.defineProperty(exports, exportName, {
        enumerable: true,
        configurable: true,
        get: () => {
            const scope = state.scopes[moduleHash];
            return scope ? scope[sourceName] : undefined;
        },
        set: (val: any) => {
            const scope = state.scopes[moduleHash];
            if (scope) {
                scope[sourceName] = val;
            }
        }
    });
}
