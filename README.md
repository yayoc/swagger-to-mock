# swagger-to-mock

Mock data generator CLI for Swagger3 (OpenAPI 3)

## Install

```shell
npm i swagger-to-mock
```

## Generate mock data

```shell
swagger-to-mock <YOUR SWAGGER FILE OR URL>
```

will generate `mock.json` includes every API responses.  
And JSON data values should be example values on your swagger if you specified,  
Otherwise values should be default values below.

```yaml
string: ""
number: 0
integer: 0
boolean: true
array: []
object: {}
```

## Data Type Support

`swagger-to-mock` will follow rules based on [OpenAPI 3 specification](https://swagger.io/docs/specification/data-models/data-types/) for each data type, If the example value is not specified.

### Mixed Types

If you specify `oneOf` or `anyOf`, The value should be at the top type.

### Numbers

- format
- Minimum and Maximum
- Multiples

### String

- format
- pattern

### Boolean

value should be `true` or `false`.

### Null

### Arrays

- Mixed-Type Arrays
- Array Length

### Objects

- Free-Form Object

### Files

### Any Type
