import {State} from '../State.js';

/**
 * @opcode Opcode.STORE
 */
export function store(state: State, arg: any): void
{
    const [name, isLocal] = arg;
    const value = state.pop();

    state.setVar(name, value, isLocal ?? false);
}
