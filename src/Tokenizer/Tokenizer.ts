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

        const startLine = this.line;
        const startCol  = this.col;

        this.advance(1); // Skip opening quote

        let rawContent         = '';
        let braceCount         = 0;
        let maybeInterpolation = false;
        let hasInterpolation   = false;
        let isMultiLine        = false;

        while (! this.isEof) {
            const char = this._source[this.index];

            if (char === '\\') {
                rawContent += char;
                this.advance(1);

                if (! this.isEof) {
                    const nextChar = this._source[this.index];
                    rawContent += nextChar;
                    this.advance(1);
                }
                continue;
            }

            if (char === '{') {
                braceCount++;
                maybeInterpolation = true;
            } else if (char === '}' && braceCount > 0) {
                braceCount--;
            }

            if (char === quoteChar) {
                this.advance(1);

                if (maybeInterpolation && braceCount === 0) {
                    hasInterpolation = true;
                }

                if (maybeInterpolation && braceCount > 0) {
                    rawContent += char;
                    continue;
                }

                break;
            }

            if (char === '\n') {
                isMultiLine = true;
                this.line++;
                this.col = 1;
            }

            rawContent += char;
            this.advance(1);
        }

        // Check for unterminated string
        if (this.isEof && this._source[this.index - 1] !== quoteChar) {
            this.throwError('Unterminated string literal');
        }

        if (isMultiLine) {
            rawContent = this.stripIndentation(rawContent);
        }

        if (braceCount !== 0) {
            throw new Error(`Unterminated interpolation expression in string literal at line ${startLine}, column ${startCol}`);
        }

        if (! hasInterpolation) {
            this._tokens.push({
                type:     TokenType.STRING,
                value:    this.unescapeString(rawContent),
                position: {lineStart: startLine, columnStart: startCol, lineEnd: this.line, columnEnd: this.col},
            });

            return true;
        }

        const segments = this.parseInterpolationSegments(rawContent);

        let hasEmittedTokens = false;
        for (const segment of segments) {
            if (hasEmittedTokens) {
                this._tokens.push({
                    type:     TokenType.OPERATOR,
                    value:    Operators.PLUS,
                    position: this.currentPos(),
                });
            }

            if (segment.type === 'text') {
                const unescapedValue = this.unescapeString(segment.value);
                hasEmittedTokens     = true;
                this._tokens.push({
                    type:     TokenType.STRING,
                    value:    unescapedValue,
                    position: {lineStart: startLine, columnStart: startCol, lineEnd: this.line, columnEnd: this.col},
                });
                continue;
            }

            if (segment.type === 'expr') {
                hasEmittedTokens = true;
                const tokens     = this.tokenizeExpression(segment.value);

                if (tokens.length === 0) {
                    this.throwError('Empty expression in string interpolation');
                }

                this._tokens.push({type: TokenType.PUNCTUATION, value: '(', position: {...this.currentPos()}});
                for (const token of tokens) {
                    this._tokens.push(token);
                }
                this._tokens.push({type: TokenType.PUNCTUATION, value: ')', position: {...this.currentPos()}});
            }
        }

        return true;
    }

    private parseInterpolationSegments(rawInput: string): { type: 'text' | 'expr', value: string }[]
    {
        const segments: { type: 'text' | 'expr', value: string }[] = [];
        let currentText                                            = '';
        let i                                                      = 0;

        let hasIndentedContent = false;

        while (i < rawInput.length) {
            const char = rawInput[i];

            // 1. Handle Escapes (pass them through to text)
            if (char === '\\') {
                currentText += char;
                i++;
                if (i < rawInput.length) {
                    currentText += rawInput[i];
                    i++;
                }
                continue;
            }

            if (char === '{') {
                const result = this.extractBalancedExpression(rawInput, i + 1);

                if (result !== null) {
                    hasIndentedContent = hasIndentedContent || currentText.trim().length > 0;

                    segments.push({type: 'text', value: currentText});
                    currentText = '';
                    segments.push({type: 'expr', value: result.code});

                    i = result.endIndex + 1;
                    continue;
                }
            }

            currentText += char;
            hasIndentedContent = hasIndentedContent || currentText.trim().length > 0;
            i++;
        }

        segments.push({type: 'text', value: currentText});

        if (hasIndentedContent) {
            this.stripInterpolatedIndentation(segments);
        }

        return segments;
    }

    private extractBalancedExpression(input: string, startIndex: number): { code: string, endIndex: number } | null
    {
        for (let i = startIndex, braceCount = 1; i < input.length; i++) {
            const char = input[i];

            if (char === '\\') {
                i++;
                continue;
            }

            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    return {
                        code:     input.slice(startIndex, i),
                        endIndex: i,
                    };
                }
            }
        }

        return null;
    }

    private unescapeString(raw: string): string
    {
        let result = '';
        let i      = 0;
        while (i < raw.length) {
            if (raw[i] === '\\' && i + 1 < raw.length) {
                const next = raw[i + 1];
                switch (next) {
                    case 'n':
                        result += '\n';
                        break;
                    case 't':
                        result += '\t';
                        break;
                    case 'r':
                        result += '\r';
                        break;
                    case '"':
                        result += '"';
                        break;
                    case '\'':
                        result += '\'';
                        break;
                    case '\\':
                        result += '\\';
                        break;
                    case '{':
                        result += '{';
                        break;
                    case '}':
                        result += '}';
                        break;
                    default:
                        result += '\\' + next; // Unknown escape, keep literal
                }
                i += 2;
            } else {
                result += raw[i];
                i++;
            }
        }
        return result;
    }

    private currentPos(): any
    {
        return {lineStart: this.line, columnStart: this.col, lineEnd: this.line, columnEnd: this.col + 1};
    }

    private stripInterpolatedIndentation(segments: { type: 'text' | 'expr', value: string }[])
    {
        let minIndent = Infinity;

        // Calculate Minimum Indentation
        for (const seg of segments) {
            if (seg.type !== 'text') continue;

            const lines = seg.value.split('\n');

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().length === 0) continue; // Ignore empty lines

                let indent = 0;
                while (indent < line.length && (line[indent] === ' ' || line[indent] === '\t')) {
                    indent++;
                }
                if (indent < minIndent) minIndent = indent;
            }
        }

        if (minIndent === Infinity) minIndent = 0;

        // Strip Indentation
        for (const seg of segments) {
            if (seg.type !== 'text') continue;

            const lines = seg.value.split('\n');

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].length >= minIndent) {
                    lines[i] = lines[i].slice(minIndent);
                }
            }

            seg.value = lines.join('\n');
        }

        if (segments[0].type === 'text' && segments[0].value.startsWith('\n')) {
            segments[0].value = segments[0].value.slice(1);
        }

        const last = segments[segments.length - 1];

        if (last.type === 'text') {
            const lines = last.value.split('\n');
            if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                lines.pop();
                last.value = lines.join('\n');
            }
        }
    }

    private stripIndentation(raw: string): string
    {
        const lines = raw.split('\n');

        if (lines.length > 0 && lines[0].trim() === '') {
            lines.shift();
        }

        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            if (lastLine.trim() === '') {
                lines.pop();
            }
        }

        let minIndent = Infinity;

        for (const line of lines) {
            if (line.trim().length === 0) continue;

            let indent = 0;
            while (indent < line.length && (line[indent] === ' ' || line[indent] === '\t')) {
                indent++;
            }

            if (indent < minIndent) minIndent = indent;
        }

        if (minIndent === Infinity) minIndent = 0;

        return lines.map(line => {
            if (line.length < minIndent) return line.trim();
            return line.slice(minIndent);
        }).join('\n');
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

    private tokenizeExpression(str: string): Token[]
    {
        const tokens = Tokenizer.tokenize(str.trim()).tokens;

        return tokens.filter(t => (
            t.type !== TokenType.NEWLINE &&
            t.type !== TokenType.INDENT &&
            t.type !== TokenType.DEDENT
        ));
    }
}
