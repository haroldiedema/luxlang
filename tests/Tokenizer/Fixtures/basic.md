# Basic Tokenizer Test

```
a_string = "bar"
a_number = 42
a_float = 3.14
a_boolean = true
an_array = [1, 2, 3]
an_object = {"key": "value"}
null_value = null
```

## PASS

- IDENTIFIER a_string
- OPERATOR =
- STRING bar
- NEWLINE \n
- IDENTIFIER a_number
- OPERATOR =
- NUMBER 42
- NEWLINE \n
- IDENTIFIER a_float
- OPERATOR =
- NUMBER 3.14
- NEWLINE \n
- IDENTIFIER a_boolean
- OPERATOR =
- KEYWORD true
- NEWLINE \n
- IDENTIFIER an_array
- OPERATOR =
- PUNCTUATION [
- NUMBER 1
- PUNCTUATION ,
- NUMBER 2
- PUNCTUATION ,
- NUMBER 3
- PUNCTUATION ]
- NEWLINE \n
- IDENTIFIER an_object
- OPERATOR =
- PUNCTUATION {
- STRING key
- PUNCTUATION : 
- STRING value
- PUNCTUATION }
- NEWLINE \n
- IDENTIFIER null_value
- OPERATOR =
- KEYWORD null

---
