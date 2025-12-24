const ANSI_CODES = {
    reset: '\x1b[0m',

    // Standard Colors
    black:   '\x1b[30m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    white:   '\x1b[37m',

    // Bright/Bold Colors
    gray:          '\x1b[90m', // "Bright Black" acts as Gray
    brightred:     '\x1b[91m',
    brightgreen:   '\x1b[92m',
    brightyellow:  '\x1b[93m',
    brightblue:    '\x1b[94m',
    brightmagenta: '\x1b[95m',
    brightcyan:    '\x1b[96m',
    brightwhite:   '\x1b[97m',

    // Text Styles
    bold:      '\x1b[1m',
    dim:       '\x1b[2m',
    underline: '\x1b[4m',
};

export const ANSI = new class
{
    public enabled: boolean = false;

    /**
     * Wraps the given text with the specified ANSI code and resets the formatting at the end.
     *
     * Supported tags are: &lt;black&gt;, &lt;red&gt;, &lt;green&gt;, &lt;yellow&gt;, &lt;blue&gt;, &lt;magenta&gt;, &lt;cyan&gt;, &lt;white&gt;,
     * &lt;gray&gt;, &lt;brightred&gt;, &lt;brightgreen&gt;, &lt;brightyellow&gt;, &lt;brightblue&gt;, &lt;brightmagenta&gt;, &lt;brightcyan&gt;, &lt;brightwhite&gt;,
     * &lt;bold&gt;, &lt;dim&gt;, &lt;underline&gt; and their corresponding closing tags (e.g., &lt;/red&gt;).
     *
     * @param {string} text - The text to be wrapped.
     * @param {string} code - The ANSI code to wrap the text with.
     * @returns {string} The wrapped text with ANSI codes.
     */
    public wrap(text: string, code: keyof typeof ANSI_CODES): string
    {
        return this.enabled ? `${ANSI_CODES[code]}${text}${ANSI_CODES.reset}` : text;
    }

    /**
     * Formats a string containing custom color/style tags into a string with ANSI escape codes.
     *
     * Supported tags are: &lt;black&gt;, &lt;red&gt;, &lt;green&gt;, &lt;yellow&gt;, &lt;blue&gt;, &lt;magenta&gt;, &lt;cyan&gt;, &lt;white&gt;,
     * &lt;gray&gt;, &lt;brightred&gt;, &lt;brightgreen&gt;, &lt;brightyellow&gt;, &lt;brightblue&gt;, &lt;brightmagenta&gt;, &lt;brightcyan&gt;, &lt;brightwhite&gt;,
     * &lt;bold&gt;, &lt;dim&gt;, &lt;underline&gt; and their corresponding closing tags (e.g., &lt;/red&gt;).
     *
     * @param {string} str - The input string with custom tags.
     * @returns {string} The formatted string with ANSI escape codes.
     */
    public format(str: string): string
    {
        return str.replace(/<(\/?)([a-z]+)>/gi, (match, isClosing, colorName) => {
            const key: keyof typeof ANSI_CODES = colorName.toLowerCase();
            if (! ANSI_CODES[key]) return match;
            if (! this.enabled) return '';
            if (isClosing) return ANSI_CODES.reset;
            return ANSI_CODES[key];
        });
    }

    public autoDetectSupport(): boolean
    {
        if (typeof process !== 'undefined' && process.stdout && process.stdout.isTTY !== undefined) {
            return (process.stdout.isTTY && process.env['TERM'] !== 'dumb') || process.env['FORCE_COLOR'] !== undefined;
        }

        return false;
    }
}
