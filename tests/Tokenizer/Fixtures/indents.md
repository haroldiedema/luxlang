# Indentation Tests

```
fn main():
    print("Level 1")
    if true:
        print("Level 2")
    
print("Back to no indent")
```

## PASS

- KEYWORD fn
- IDENTIFIER main
- PUNCTUATION (
- PUNCTUATION )
- PUNCTUATION :
- NEWLINE \n
- INDENT 4
- IDENTIFIER print
- PUNCTUATION (
- STRING Level 1
- PUNCTUATION )
- NEWLINE \n
- KEYWORD if
- KEYWORD true
- PUNCTUATION :
- NEWLINE \n
- INDENT 8
- IDENTIFIER print
- PUNCTUATION (
- STRING Level 2
- PUNCTUATION )
- NEWLINE \n
- DEDENT
- DEDENT
- IDENTIFIER print
- PUNCTUATION (
- STRING Back to no indent
- PUNCTUATION )
- NEWLINE \n
