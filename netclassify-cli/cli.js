#! /usr/bin/env node

const sdk = require('../sdk-admin')
const pubSdk = require('../sdk-public')
const fs = require("fs")
const program = require('commander');
const encryptor = require('file-encryptor');
const generator = require('generate-password');


let timeouts = {
    "ropsten": 600000,
    "netvote": 60000
}

const tempDir = process.cwd() + "/.netclassify";

let client;
let pubClient;

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

const initClient = () => {
    validateEnv();
    client = sdk.initAdminClient(
        process.env.NETROSA_API_KEY,
        process.env.NETROSA_API_ID,
        process.env.NETROSA_API_SECRET
    )

    pubClient = pubSdk.initPublicClient(
        process.env.NETROSA_API_KEY
    )
}

const listForms = async () => {
    initClient();
    let forms = await client.GetFormList();
    console.log(JSON.stringify({
        forms: forms
    }, null, 4));
}

const initDirectory = async (obj) => {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    let cfgFile = `${tempDir}/${obj.name}.json`
    fs.writeFileSync(cfgFile, JSON.stringify(obj));
    console.log(`config created: ${cfgFile}`)
}

const encryptFile = async (path, pw) => {
    return new Promise((resolve, reject) => {
        let encryptedPath = `${path}-encrypted`
        encryptor.encryptFile(path, encryptedPath, pw, { encoding: 'base64' }, function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(encryptedPath)
        });
    })
}

const decryptFile = async (encPath, decryptPath, pw) => {
    return new Promise((resolve, reject) => {
        encryptor.decryptFile(encPath, decryptPath, pw, { encoding: 'base64' }, function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(true)
        });
    })
}

const exportSubmissions = async (bucketId) => {
    initClient();
    let form = await client.GetForm(bucketId)
    if (!form) {
        console.error(`Bucket ${bucketId} not found.`)
        process.exit(1);
    }

    let entries = [];
    await client.ExportSubmissions(bucketId, function (response) {
        console.log(`extracting ${response.index + 1} of ${response.total}`)
        entries.push({
            integrity: {
                proof: response.proof,
                publicKey: response.publicKey,
                validProof: response.validProof
            },
            payload: response.decrypted
        });
    })
    return entries;
}

program
    .version('0.0.1')
    .command('list')
    .action(async function (cmd) {
        await listForms();
    })

program
    .command('create <bucketName>')
    .option('-n, --network [value]', 'netvote, ropsten, or mainnet')
    .option('-t, --test', 'netvote, ropsten, or mainnet')
    .action(async function (bucketName, cmd) {
        let network = cmd.network || "netvote";
        let res = await client.CreateForm({
            name: bucketName,
            form: "bucket",
            formType: "file",
            network: network,
            continuousReveal: false,
            test: !!(cmd.test)
        })
        form = res;
        console.log(`creating bucket ${form.formId}`);

        await client.PollForStatus(form.formId, "open", timeouts[network]);
        let f = await client.GetForm(form.formId);

        var password = generator.generate({
            length: 100
        });
        initDirectory({
            bucketId: form.formId,
            name: bucketName,
            test: !!(cmd.test),
            network: network,
            address: f.logAddress,
            idHash: f.formIdHash,
            password: password
        });
        console.log(`bucket ${form.formId} is created`);
    })

program
    .command('download-all <bucket>')
    .action(async function (bucket, cmd) {
        let bucketObj = require(`${tempDir}/${bucket}.json`)
        let bucketId = bucketObj.bucketId;

        let items = await exportSubmissions(bucketId);
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let hash = item.payload.hash;
            
            // get item
            let metadata = await client.GetFromIPFS(hash);
            let fileHash = metadata.hash;
            let filePath = metadata.path;
            let fileContents = await client.GetFromIPFS(fileHash);
            let encryptedPath = `${filePath}-encrypted`;

            // decrypt
            fs.writeFileSync(encryptedPath, Buffer.from(fileContents, 'base64'));
            await decryptFile(encryptedPath, filePath, bucketObj.password);
            fs.unlinkSync(encryptedPath);
        }
        //console.log(entries);
    })

program
    .command('test <bucket>')
    .action(async function (bucket, cmd) {
        let path = "file.txt"
        let bucketObj = require(`${tempDir}/${bucket}.json`)
        let bucketId = bucketObj.bucketId;
        let originalName = path;

        let password = cmd.password || bucketObj.password;
        let fileName = await encryptFile(originalName, password);

        var contents = fs.readFileSync(fileName, "base64");

        fs.writeFileSync(`${path}-saved`, Buffer.from(contents, "base64"));
        await decryptFile(fileName, `${fileName}-expected-decrypt`, bucketObj.password)
        await decryptFile(`${path}-saved`, `${fileName}-actual-decrypt`, bucketObj.password)
    })

program
    .command('upload <path> <bucket>')
    .option('-p, --password [value]', 'password for encryption')
    .option('-w, --wait', 'wait until blockchain confirmation before exiting')
    .action(async function (path, bucket, cmd) {
        let bucketObj = require(`${tempDir}/${bucket}.json`)
        let bucketId = bucketObj.bucketId;
        let originalName = path;

        let password = cmd.password || bucketObj.password;
        let fileName = await encryptFile(originalName, password);

        var contents = fs.readFileSync(fileName, "base64");
        let fileIpfsRef = await client.SaveToIPFS(contents)
        let metadata = {
            hash: fileIpfsRef.hash,
            path: originalName
        }
        let hash = await client.SaveToIPFS(metadata)

        //auth
        let k = await client.GenerateKeys(bucketObj.bucketId, 1);
        let res = await pubClient.GetJwtToken(bucketId, k.keys[0])

        let submissionResult = await pubClient.SubmitForm(bucketId, hash, res.token)
        let response = submissionResult.response;

        if (cmd.wait) {
            await pubClient.PollSubmissionForStatus(bucketId, response.subId, "complete", timeouts[bucketObj.network]);
        }

        fs.unlinkSync(fileName);
        console.log(`${originalName} uploaded`);
    })

initClient();

program
    .command('export <formId>')
    .option('-f, --file [value]', 'filename to export to (default: ./<formId>.json)')
    .action(async function (formId, cmd) {
        await exportSubmissions(formId, cmd.file);
    })

program.parse(process.argv)

