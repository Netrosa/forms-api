# Netrosa CLI

## Installation

```bash
$ npm install netrosa-cli
```

### Environment Settings

The CLI expects these three credential enviornment variables to be set

```
NETROSA_API_KEY
NETROSA_API_ID
NETROSA_API_SECRET
```

## Usage

```bash
$ netrosa 
Usage: netrosa [options] [command]

Options:
  -V, --version              output the version number
  -h, --help                 output usage information

Commands:
  list
  export [options] <formId>
```

### List all Forms

Example:
```
$ netrosa list
{
    "forms": [
        {
            "authType": "key",
            "version": 3,
            "formStatus": "open",
            "logAddress": "0x250d1992b0cfe4cb33467826d2dad3b86df12780",
            "txId": "0x53b487eb0c338d3a28c46959bc6c44d741f8da802268d375e8849e09badd85e2",
            "mode": "TEST",
            "formId": "66755c0c-2106-48f9-aef9-def02bbc6731",
            "createdAt": 1543077204071,
            "createdBy": "emali@email.com",
            "name": "2019 Official Form",
            "network": "netvote",
            "company": "netvote",
            "formIdHash": "0xa3272ab536b9ddab862df3f418249288351cc18d5987f2d5de53a5a8e5095ac0",
            "txStatus": "complete",
            "ipfsHash": "QmXUeLRjdXmJjPwfacZ57mfzDKXGWjncx9ftZ6FL5X7ykV",
            "formType": "openrosa"
        }
    ]
}
```

Note the `formId` is what is used for exporting submissions.

### Export to File

```bash
$ netrosa export --help
Usage: export [options] <formId>

Options:
  -f, --file [value]  filename to export to (default: ./<formId>.json)
  -h, --help          output usage information
```

Example:
```bash
$ netrosa export 66755c0c-2106-48f9-aef9-def02bbc6731 --file submissions.json
extracting 1 of 2 to submissions.json
extracting 2 of 2 to submissions.json
```

File Contents:

```bash
{
  "formId": "66755c0c-2106-48f9-aef9-def02bbc6731",
  "total": 2,
  "entries": [
    {
      "integrity": {
        "proof": "SZSTXSnG5ZNek7isb+N8Xio3HMjhrl4Mn0rbKlIi7servVXjk/QpQ29BaNZH/tsXnZC7Pmbx0o8r+d9e0BXaTjvrD0UmeQqduUjech91v7aBV25cwRFz7dnrPChbwL1Ug3DykyowHh7UihKGvYidn8FcYf9E+68V+C4keRqtlK+xLr+LcN7djHx8v5jknsTAxvFynlln8z1xSJ2BdehkzdzM9rAVPsv/FGI7jUOWoBDTzLGezt+46vXKswquqDn1m87PFMgPEki+XCsvKtD8VluNEEHKaFf0MPiXukTonZ9wBXzLHUz5qCu+dbatlx5Ku/5wUqwzt4Niol8iYGmjYA==",
        "publicKey": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUEyUmhVQzBKZVhsYWdTdnJmNDgzZQpxQkZ2SEM5VVdBd0xiRHdwQndGVk5OKzFLT2VqVThseVZ4c0JqcWtJR2NEQjlrWVBSTTFkYmxkeUdTQVNFSDcwCjZrQTY5QmZOek9ZVmdSbjZRSlpJVFB6cHFDT2ZpbUhPTW5YNGR1RUN1Q3NlRytkQ3A2R1hBaFZqVnpBSjF1YkwKcTRxcTViL3k1ZEVYUkczUGN2S1IwODBrWG9EY0dvZ0dtVXNYVmhvVHJISGFKaVNCSjc4aml0WVhtc3JDOHIvbwowSm5FTGlFVGovTU1EbEFXWjdFbHN0RC80K2RxWUZiS2RSdENuSmk5NTNLZXNjdHcwOXV6djByZzZBYWxmVHo1CjJkQXIwYnlRTGpXdG1oU0ZoZXFOVzlZYU5UZkl4QzB6NVVsM1NtWmkzRmJrdlNIM1lJRTA3U3AzWDYxUWIzdHAKTFFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t",
        "validProof": true
      },
      "payload": {
        "odkFormId": "MY_FORM_1538503436",
        "odkSubmitId": "uuid:b9df15cc-70df-417c-bc5f-ab3be9e11ac4",
        "submission": {CONTENTS OF SUBMISSION},
        "attachments": []
      }
    },
    {
      "integrity": {
        "proof": "XpyRQwVdtczwu0eWZaOUsV4BoWIcBxE+HYOVlRRxeyolYwBfK+LfYbSNeVV5xjA82h/i7YquCWpyCSjquC1Oc3i7SOhDZkh2cKPWtm1frhcaZxfLRMCromp9HWNMR5pRux1NZYvMv/npMZ6RdQE4exfOS6cslOXr2pUaIyeb2Tltsw5HESL3+IE4lRAnzjbr9cgJoOEr6ESexL3jnuzKi0S2yD6J9QhIRlbRl0m7cCUh/WPtX7Hgl80IrE6J/hoHVHeG9hcwbUGl/0Ft7WRFzOyBJhqo/PVSlpJfOk+tfc6ZpN2247D0VJkYSfdSLvHbOHjQVhnwk4ddcTNwvYhCUw==",
        "publicKey": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF2L0pnUW43TW05ekM4RFp1Tmp0cgozWTQvWHRYMDgyQkJyUnc0OGdqUjIyQzRQY2dMK21NRXNZeUlseUp3ZVpkVEhsV1I0MHhoWkh2dFdnaWtUWXgxCnVBWDgrRFNyM3k2TVpKUjNkMHh0N0lCUDBDUlFVUzRFS3ZlRDRhcFBRM0xKVFhkaDIzTlVUTW0xWUpTTmw4VVcKMzhNR09HWDVlSkd6NDNiYnRDYnN5T0VzWG15Wi9aQXNvNDhMeDNuc2xpZHJtYmdtQXpyMzhTZFdUckNTVjR1dwpldGhUVlNoZlU1SmxxSDFQVWYyRTlaUERaLzkvektYNk1sbDFOWDJlWEpscUx2YUZKZWhYRG9lZ1BRdU9ZSXpMCkk3eFJYK2ZweUtZWUEvN3lzamFLdFlhYmJWNmdMU2ZMRGcrZW9EV09uWlMyWU84T05LMzRWcVgyN3FyMUVvWU8KT3dJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t",
        "validProof": true
      },
      "payload": {
        "odkFormId": "MY_FORM_1538503436",
        "odkSubmitId": "uuid:8264c523-ffc0-4644-a1c1-6f09adf286df",
        "submission": { CONTENTS OF SUBMISSION },
        "attachments": []
      }
    }
  ]
}

```