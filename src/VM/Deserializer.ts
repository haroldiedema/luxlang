import { State } from './State.js';

export class Deserializer
{
    private idToObject: Map<number, any> = new Map();
    private heap: Record<number, any>    = {};

    public deserialize(hash: string, json: string, state: State): void
    {
        const data = JSON.parse(json);
        this.heap  = data.heap;
        this.idToObject.clear();

        if (data.state.hash !== hash) {
            throw new Error(`The state is incompatible with the current program. Hash mismatch: ${hash} !== ${data.state.hash}`);
        }

        state.ip = data.state.ip;
        state.import({
            scopes: this.restore(data.state.scopes),
            stack:  this.restore(data.state.stack),
            frames: this.restore(data.state.frames),
            events: this.restore(data.state.events),
        });
    }

    private restore(value: any): any
    {
        if (value && typeof value === 'object' && '$ref' in value) {
            const id = value.$ref;

            if (this.idToObject.has(id)) return this.idToObject.get(id);

            const raw      = this.heap[id];
            const instance = Array.isArray(raw) ? [] : {}; // Or new Map() checks

            this.idToObject.set(id, instance);

            for (const k in raw) {
                (instance as any)[k] = this.restore(raw[k]);
            }

            return instance;
        }

        return value;
    }
}
