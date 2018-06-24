# swagger-to-mock [![travis-ci](https://travis-ci.org/yayoc/swagger-to-mock.svg?branch=master)](https://travis-ci.org/yayoc/swagger-to-mock)

Mock data generator CLI for Swagger3 (OpenAPI 3)

## Install

```shell
npm i -g swagger-to-mock
```

## Generate mock data

```shell
swagger-to-mock <YOUR SWAGGER FILE>
```

will generate **JSON file** per each API response.  
JSON data values should be example values on your swagger if you specified examples.  
Otherwise, `swagger-to-mock` follows [data type rules](https://github.com/yayoc/swagger-to-mock/#data-type-support) and generate arbitrary values.  
If there is no rule like `format`, values should be below.

```yaml
string: ""
number: 0
integer: 0
boolean: true
array: []
object: {}
```

## Example

If we pass [an example YAML file](https://github.com/OAI/OpenAPI-Specification/blob/master/examples/v3.0/petstore-expanded.yaml)

```yaml
responses:
  '200':
    description: pet response
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Pet'
```

`swagger-to-mock` will generate file named `pets_get_200.json` and the body should be below

```json
[
  {
    "name": "",
    "tag": "",
    "id": 0
  }
]
```

## File Name

Naming JSON file will follow the format below. 
`${API_PATH}_${HTTP_METHOD}_${RESPONSE_STATUS}.json`

## Data Type Support [In Progress]

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
