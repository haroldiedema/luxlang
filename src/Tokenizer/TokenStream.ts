import { Token }     from './Token.js';

export class TokenStream
{
    private readonly _tokens: Token[];
    private _index: number = 0;

    constructor(tokens: Token[])
    {
        this._tokens = tokens;
    }

    public get length(): number
    {
        return this._tokens.length;
    }

    public peek(offset: number = 0): Token | null
    {
        const targetIndex = this._index + offset;

        if (targetIndex < 0 || targetIndex >= this._tokens.length) {
            return null;
        }

        return this._tokens[targetIndex];
    }

    public consume(): Token
    {
        const token = this.peek(0);
        if (! token) {
            throw new Error('Unexpected End of File');
        }
        this._index++;
        return token;
    }

    public get isEof(): boolean
    {
        return this._index >= this._tokens.length;
    }
}
