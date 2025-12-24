import { describe, expect, it } from 'vitest';
import { Tokenizer, TokenType } from '../../dist/Tokenizer/index.js';

const simplify = (tokens: any[]) => tokens.map(t => ({type: t.type, value: t.value}));

describe('Tokenizer', () => {

    it('should tokenize basic variable assignment', () => {
        const source = `score = 100`;
        const stream = Tokenizer.tokenize(source);
        const tokens = simplify(stream['_tokens']); // Accessing private property for testing

        expect(tokens).toEqual([
            {type: TokenType.IDENTIFIER, value: 'score'},
            {type: TokenType.OPERATOR, value: '='},
            {type: TokenType.NUMBER, value: '100'},
            {type: TokenType.NEWLINE, value: '\\n'},
        ]);
    });

    it('should handle indentation blocks (INDENT/DEDENT)', () => {
        const source = `
fn start:
    print "Hello"
`;
        const stream = Tokenizer.tokenize(source);
        const tokens = simplify(stream['_tokens']);

        // Filter out initial newlines if any, focus on structure
        const meaningfulTokens = tokens.filter(t => t.type !== TokenType.NEWLINE);

        expect(meaningfulTokens).toEqual([
            {type: TokenType.KEYWORD, value: 'fn'},
            {type: TokenType.IDENTIFIER, value: 'start'},
            {type: TokenType.PUNCTUATION, value: ':'},
            {type: TokenType.INDENT, value: '4'},
            {type: TokenType.IDENTIFIER, value: 'print'},
            {type: TokenType.STRING, value: 'Hello'},
            {type: TokenType.DEDENT, value: ''},
        ]);
    });

    it('should handle nested blocks (multi-level indentation)', () => {
        const source = `
if player.alive:
    if player.score > 1000:
        win_game
`;
        const stream = Tokenizer.tokenize(source);
        const tokens = simplify(stream['_tokens']);

        // Let's verify the sequence of types specifically
        const types = tokens.map(t => t.type);

        expect(types).toEqual([
            // Line 2: if player.alive:
            TokenType.KEYWORD, TokenType.IDENTIFIER, TokenType.PUNCTUATION, TokenType.IDENTIFIER, TokenType.PUNCTUATION,
            TokenType.NEWLINE,

            // Line 3: Indent -> if ...
            TokenType.INDENT,
            TokenType.KEYWORD, TokenType.IDENTIFIER, TokenType.PUNCTUATION, TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.NUMBER, TokenType.PUNCTUATION,
            TokenType.NEWLINE,

            // Line 4: Indent again -> win_game
            TokenType.INDENT,
            TokenType.IDENTIFIER,
            TokenType.NEWLINE,

            // End of File -> Dedent both levels
            TokenType.DEDENT,
            TokenType.DEDENT,
        ]);
    });

    it('should correctly pop multiple indent levels at once', () => {
        // This is the "Python" behavior: returning to zero indent closes all open blocks
        const source = `
if true:
    if true:
        do_something
end_of_program
`;
        const stream = Tokenizer.tokenize(source);
        const tokens = simplify(stream['_tokens']);

        // Find the index of 'do_something'
        const doIndex  = tokens.findIndex(t => t.value === 'do_something');
        // Find the index of 'end_of_program'
        const endIndex = tokens.findIndex(t => t.value === 'end_of_program');

        // Between 'do_something' and 'end_of_program', we expect:
        // 1. Newline (end of do_something line)
        // 2. DEDENT (inner block)
        // 3. DEDENT (outer block)
        const transitionTokens = tokens.slice(doIndex + 1, endIndex);

        expect(transitionTokens).toEqual([
            {type: TokenType.NEWLINE, value: '\\n'},
            {type: TokenType.DEDENT, value: ''},
            {type: TokenType.DEDENT, value: ''},
        ]);
    });

    it('should ignore empty lines and comments regarding indentation', () => {
        const source = `
fn test:
    // This is a comment
    
    // Another comment with empty lines around it
    x = 1
`;
        const stream = Tokenizer.tokenize(source);
        const tokens = simplify(stream['_tokens']);

        // Check that we only have ONE indent level
        const indents = tokens.filter(t => t.type === TokenType.INDENT);
        const dedents = tokens.filter(t => t.type === TokenType.DEDENT);

        expect(indents.length).toBe(1);
        expect(dedents.length).toBe(1);

        // Ensure x = 1 is inside the block
        const xIndex      = tokens.findIndex(t => t.value === 'x');
        const indentIndex = tokens.findIndex(t => t.type === TokenType.INDENT);

        expect(xIndex).toBeGreaterThan(indentIndex);
    });

    it('should throw error on mismatched indentation', () => {
        const source = `
fn bad_indent:
    x = 1
  y = 2  // This is indented by 2 spaces, but previous was 4. Error!
`;
        expect(() => {
            Tokenizer.tokenize(source);
        }).toThrowError(/Indentation error/);
    });

    it('should handle optional parentheses style function calls', () => {
        const source = `print "Hello World"`;
        const stream = Tokenizer.tokenize(source);
        const tokens = simplify(stream['_tokens']);

        expect(tokens).toEqual([
            {type: TokenType.IDENTIFIER, value: 'print'},
            {type: TokenType.STRING, value: 'Hello World'},
            {type: TokenType.NEWLINE, value: '\\n'},
        ]);
    });
});
