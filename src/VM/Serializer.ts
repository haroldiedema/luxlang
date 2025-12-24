import events    from 'node:events';
import { State } from './State.js';

export class Serializer
{
    private idCounter: number            = 0;
    private objectToId: Map<any, number> = new Map();
    private heap: Record<number, any>    = {};

    public serialize(hash: string, state: State): string
    {
        this.reset();

        const serializedState = {
            hash,
            ip:        state.ip,
            stack:     this.process(state.stack),
            globals:   this.process(state.globals),
            frames:    this.process(state.frames),
            events:    this.process(events),
            sleepTime: state.sleepTime,
            deltaTime: state.deltaTime,
        };

        return JSON.stringify({
            state: serializedState,
            heap:  this.heap,
        });
    }

    private reset(): void
    {
        this.idCounter = 0;
        this.objectToId.clear();
        this.heap = {};
    }

    private process(value: any): any
    {
        if (! value || typeof value !== 'object') return value;

        if (this.objectToId.has(value)) {
            return {$ref: this.objectToId.get(value)};
        }

        const id = ++this.idCounter;
        this.objectToId.set(value, id);

        const data: any = Array.isArray(value) ? [] : {};
        for (const k in value) {
            data[k] = this.process(value[k]);
        }

        this.heap[id] = data;

        return {$ref: id};
    }
}
