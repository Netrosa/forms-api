const FORMS = {
    ALL_TYPES: {
        "title": {
            "en": "Test Form"
        },
        "fields": [
            {
                "id": "name",
                "type": "string",
                "text": {
                    "en": "name"
                },
                "required": true
            },
            {
                "id": "age",
                "type": "number",
                "text": {
                    "en": "age"
                },
                "required": true
            },
            {
                "id": "prop123",
                "type": "selection",
                "text": {
                    "en": "Do you support Prop 123?"
                },
                "options": [
                    {
                        "id": "yes",
                        "text": {
                            "en": "Yes"
                        }
                    },
                    {
                        "id": "no",
                        "text": {
                            "en": "No"
                        }
                    }
                ],
                "required": true
            }
        ]
    }
}


module.exports = {
    FORMS: FORMS
}