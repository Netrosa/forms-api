#! /usr/bin/env node

const sdk = require('netrosa-admin-sdk')
const fs = require("fs")
const program = require('commander');

let client;

const validateEnv = () => {
    let errors = false;
    if (!process.env.NETROSA_API_KEY) {
        console.error("NETROSA_API_KEY environment variable must be set")
        errors = true;
    }
    if (!process.env.NETROSA_API_ID) {
        console.error("NETROSA_API_ID environment variable must be set")
        errors = true;
    }
    if (!process.env.NETROSA_API_SECRET) {
        console.error("NETROSA_API_SECRET environment variable must be set")
        errors = true;
    }
    if (errors) {
        process.exit(1);
    }
}

const initClient = async () => {
    validateEnv();
    client = sdk.initAdminClient(
        process.env.NETROSA_API_KEY,
        process.env.NETROSA_API_ID,
        process.env.NETROSA_API_SECRET
    )
}

const listForms = async () => {
    initClient();
    let forms = await client.GetFormList();
    console.log(JSON.stringify({
        forms: forms
    }, null, 4));
}

const exportSubmissions = async (formId, filename) => {
    initClient();
    let form = await client.GetForm(formId)
    if (!form) {
        console.error(`Form ${formId} not found.`)
        process.exit(1);
    }

    filename = filename || `${formId}.json`
    var logger = fs.createWriteStream(filename, {
        flags: 'ax'
    })
      
    try {
        let entries = [];
        await client.ExportSubmissions(formId, function (response) {
            console.log(`extracting ${response.index+1} of ${response.total} to ${filename}`)
            entries.push({
                integrity: {
                    proof: response.proof,
                    publicKey: response.publicKey,
                    validProof: response.validProof
                },
                payload: response.decrypted
            });
        })
        logger.write(JSON.stringify({
            formId: formId,
            total: entries.length,
            entries: entries
        }));
    } finally {
        if (logger) logger.end();
    }

}

program
    .version('0.0.1')
    .command('list')
    .action(async function (cmd) {
        await listForms();
    })

program
    .command('export <formId>')
    .option('-f, --file [value]', 'filename to export to (default: ./<formId>.json)')
    .action(async function (formId, cmd) {
        await exportSubmissions(formId, cmd.file);
    })

program.parse(process.argv)
