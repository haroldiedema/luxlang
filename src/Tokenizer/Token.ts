import { TokenType } from './TokenType.js';

export type TokenPosition = {
    lineStart: number;
    lineEnd: number;
    columnStart: number;
    columnEnd: number;
}

export type Token = {
    type: keyof typeof TokenType;
    value: string;
    position: TokenPosition;
}
