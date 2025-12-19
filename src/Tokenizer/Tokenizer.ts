import { Keywords }    from './Keywords.js';
import { Operators }   from './Operators.js';
import { Punctuation } from './Punctuation.js';
import { Token }       from './Token.js';
import { TokenStream } from './TokenStream.js';
import { TokenType }   from './TokenType.js';

export class Tokenizer
{
    private static readonly KEYWORD_SET     = new Set<string>(Keywords);
    private static readonly PUNCTUATION_SET = new Set<string>(Object.values(Punctuation));
    private static readonly SYMBOL_MAP      = new Map<string, string>([
        ...Object.entries(Operators).map(([k, v]) => [v, k] as [string, string]),
        ...Object.entries(Punctuation).map(([k, v]) => [v, k] as [string, string]),
    ]);
    private static readonly SORTED_SYMBOLS  = Array
        .from(Tokenizer.SYMBOL_MAP.keys())
        .sort((a, b) => b.length - a.length);

    private readonly _tokens: Token[] = [];
    private readonly _source: string;

    private index: number            = 0;
    private line: number             = 1;
    private col: number              = 1;
    private indentStack: number[]    = [0];
    private isAtStartOfLine: boolean = true;

    private constructor(source: string)
    {
        this._source = source.replace(/\r\n/g, '\n');
    }

    public static tokenize(source: string): TokenStream
    {
        // Ensure source ends with a newline
        if (! source.endsWith('\n')) {
            source += '\n';
        }

        return new Tokenizer(source).tokenize();
    }

    private tokenize(): TokenStream
    {
        while (! this.isEof) {
            if (this.isAtStartOfLine) {
                if (this.handleIndentation()) {
                    continue;
                }
            }

            const char = this._source[this.index];

            if (char === '\n') {
                this.handleNewline();
                continue;
            }

            if (char === ' ' || char === '\t') {
                this.advance(1);
                continue;
            }

            if (this.parseComment()) continue;
            if (this.parseBlockComment()) continue;
            if (this.parseNumberLiteral()) continue;
            if (this.parseStringLiteral()) continue;
            if (this.parseWord()) continue;
            if (this.parseSymbol()) continue;

            this.throwUnexpectedCharacterError();
        }

        while (this.indentStack.length > 1) {
            this.indentStack.pop();
            this._tokens.push(this.createToken(TokenType.DEDENT, ''));
        }

        return new TokenStream(this._tokens);
    }

    private handleNewline()
    {
        const lastToken = this._tokens[this._tokens.length - 1];
        if (lastToken && lastToken.type !== TokenType.NEWLINE && lastToken.type !== TokenType.INDENT && lastToken.type !== TokenType.DEDENT) {
            this._tokens.push(this.createToken(TokenType.NEWLINE, '\\n'));
        }

        this.index++;
        this.line++;
        this.col             = 1;
        this.isAtStartOfLine = true;
    }

    private handleIndentation(): boolean
    {
        let spaces    = 0;
        let tempIndex = this.index;

        while (tempIndex < this._source.length && (this._source[tempIndex] === ' ' || this._source[tempIndex] === '\t')) {
            spaces += this._source[tempIndex] === '\t' ? 4 : 1;
            tempIndex++;
        }

        const char = this._source[tempIndex];

        if (tempIndex >= this._source.length || char === '\n' || this._source.startsWith('//', tempIndex) || this._source.startsWith('/*', tempIndex)) {
            this.isAtStartOfLine = false;
            return false;
        }

        this.advance(tempIndex - this.index);

        const currentIndent = this.indentStack[this.indentStack.length - 1];

        if (spaces > currentIndent) {
            this.indentStack.push(spaces);
            this._tokens.push(this.createToken(TokenType.INDENT, spaces.toString()));
        } else if (spaces < currentIndent) {
            while (spaces < this.indentStack[this.indentStack.length - 1]) {
                this.indentStack.pop();
                this._tokens.push(this.createToken(TokenType.DEDENT, ''));
            }
            if (spaces !== this.indentStack[this.indentStack.length - 1]) {
                this.throwError('Indentation error: Indent level does not match any outer block');
            }
        }

        this.isAtStartOfLine = false;
        return false;
    }

    private parseWord(): boolean
    {
        let tempIndex = this.index;
        if (! /[a-zA-Z_]/.test(this._source[tempIndex])) return false;

        while (tempIndex < this._source.length && /[a-zA-Z0-9_]/.test(this._source[tempIndex])) {
            tempIndex++;
        }

        const value = this._source.slice(this.index, tempIndex);
        const type  = Tokenizer.KEYWORD_SET.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;

        this._tokens.push(this.createToken(type, value));
        this.advance(value.length);
        return true;
    }

    private parseSymbol(): boolean
    {
        for (const symbol of Tokenizer.SORTED_SYMBOLS) {
            if (this._source.startsWith(symbol, this.index)) {
                const type = Tokenizer.PUNCTUATION_SET.has(symbol)
                    ? TokenType.PUNCTUATION
                    : TokenType.OPERATOR;

                this._tokens.push(this.createToken(type, symbol));
                this.advance(symbol.length);
                return true;
            }
        }
        return false;
    }

    private parseNumberLiteral(): boolean
    {
        const char       = this._source[this.index];
        const nextChar   = this._source[this.index + 1];
        const isDigit    = char >= '0' && char <= '9';
        const isDotStart = char === '.' && (nextChar >= '0' && nextChar <= '9');

        if (! isDigit && ! isDotStart) return false;

        let tempIndex = this.index;
        let value     = '';
        while (tempIndex < this._source.length && /[0-9.eE_]/.test(this._source[tempIndex])) {
            value += this._source[tempIndex];
            tempIndex++;
        }
        this._tokens.push(this.createToken(TokenType.NUMBER, value));
        this.advance(tempIndex - this.index);
        return true;
    }

    private parseStringLiteral(): boolean
    {
        const quoteChar = this._source[this.index];
        if (quoteChar !== '"' && quoteChar !== '\'') return false;

        let content   = '';
        let tempIndex = this.index + 1;

        while (tempIndex < this._source.length && this._source[tempIndex] !== quoteChar) {
            if (this._source[tempIndex] === '\\') {
                tempIndex++;
                content += this._source[tempIndex];
            } else {
                content += this._source[tempIndex];
            }
            tempIndex++;
        }

        this._tokens.push(this.createToken(TokenType.STRING, content));
        this.advance(tempIndex - this.index + 1);
        return true;
    }

    private parseComment(): boolean
    {
        if (! this._source.startsWith('//', this.index)) return false;
        while (! this.isEof && this._source[this.index] !== '\n') {
            this.advance(1);
        }
        return true;
    }

    private parseBlockComment(): boolean
    {
        if (! this._source.startsWith('/*', this.index)) return false;
        this.advance(2);
        while (! this.isEof && ! this._source.startsWith('*/', this.index)) {
            if (this._source[this.index] === '\n') {
                this.line++;
                this.col = 1;
                this.index++;
            } else {
                this.advance(1);
            }
        }
        if (! this.isEof) this.advance(2);
        return true;
    }

    private createToken(type: keyof typeof TokenType, value: string): Token
    {
        return {
            type,
            value,
            position: {
                lineStart:   this.line,
                columnStart: this.col,
                lineEnd:     this.line,
                columnEnd:   this.col + value.length,
            },
        };
    }

    private advance(n: number)
    {
        this.index += n;
        this.col += n;
    }

    private get isEof(): boolean
    {
        return this.index >= this._source.length;
    }

    private throwError(msg: string): void
    {
        throw new Error(`${msg} at line ${this.line}, column ${this.col}`);
    }

    private throwUnexpectedCharacterError(): void
    {
        this.throwError(`Unexpected character "${this._source[this.index]}"`);
    }
}
