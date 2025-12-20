import {State} from '../State.js';

/**
 * @opcode Opcode.EXPORT
 */
export function _export(state: State): void
{
    const val  = state.pop();
    const name = state.pop();

    const frame = state.frames[state.frames.length - 1];

    // If we are in the main scope (no frames) or a frame without export tracking,
    // we can either throw or ignore. Usually, modules run inside a frame.
    if (! frame) {
        return;
    }

    frame.exports[name] = val;
}
