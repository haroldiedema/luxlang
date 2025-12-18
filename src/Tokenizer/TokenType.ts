export const TokenType = {
    IDENTIFIER:    'IDENTIFIER',
    KEYWORD:       'KEYWORD',
    OPERATOR:      'OPERATOR',
    PUNCTUATION:   'PUNCTUATION',
    STRING:        'STRING',
    NUMBER:        'NUMBER',
    COMMENT:       'COMMENT',
    BLOCK_COMMENT: 'BLOCK_COMMENT',
    NEWLINE:       'NEWLINE',
    INDENT:        'INDENT',
    DEDENT:        'DEDENT',
    EOF:           'EOF',
} as const;
