import { State } from './State.js';

export class Deserializer
{
    private idToObject: Map<number, any> = new Map();
    private heap: Record<number, any>    = {};
    private state: State | null          = null;

    public deserialize(hash: string, json: string, state: State): void
    {
        const data: any = JSON.parse(json);
        this.heap       = data.heap;
        this.state      = state;

        this.idToObject.clear();

        if (data.state.hash !== hash) {
            throw new Error(`The state is incompatible with the current program. Hash mismatch: ${hash} !== ${data.state.hash}`);
        }

        state.ip = data.state.ip;

        state.import({
            scopes:    this.restore(data.state.scopes),
            stack:     this.restore(data.state.stack),
            frames:    this.restore(data.state.frames),
            events:    this.restore(data.state.events),
            sleepTime: data.state.sleepTime,
            deltaTime: data.state.deltaTime,
        });

        this.state = null;
    }

    private restore(value: any): any
    {
        if (value && typeof value === 'object' && '$ref' in value) {
            const id = value.$ref;

            if (this.idToObject.has(id)) return this.idToObject.get(id);

            const raw = this.heap[id];

            if (raw && raw.$type === 'ModuleNamespace') {
                const moduleObj: any = {};
                this.idToObject.set(id, moduleObj);

                const state = this.state!;

                Object.defineProperty(moduleObj, '__vm_meta', {
                    value:        {hash: raw.hash, bindings: raw.bindings},
                    enumerable:   false,
                    writable:     true,
                    configurable: true,
                });

                for (const [exportName, sourceName] of Object.entries(raw.bindings)) {
                    Object.defineProperty(moduleObj, exportName, {
                        enumerable:   true,
                        configurable: true,
                        get:          () => {
                            // [FIX] Use the local 'state' variable, NOT 'this.state'
                            const scope = state.scopes[raw.hash];
                            return scope ? scope[sourceName as string] : undefined;
                        },
                        set:          (val: any) => {
                            // [FIX] Use the local 'state' variable, NOT 'this.state'
                            const scope = state.scopes[raw.hash];
                            if (scope) {
                                scope[sourceName as string] = val;
                            }
                        },
                    });
                }

                return moduleObj;
            }

            const instance = Array.isArray(raw) ? [] : {};
            this.idToObject.set(id, instance);

            for (const k in raw) {
                (instance as any)[k] = this.restore(raw[k]);
            }

            return instance;
        }

        return value;
    }
}
