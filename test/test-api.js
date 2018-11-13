const assert = require('assert');
const FORM_EXAMPLES = require("./form-examples").FORMS;
const adminSdk = require("../sdk-admin")
const publicSdk = require("../sdk-public")


const API_VERSION = process.env.NETROSA_API_VERSION || "dev";


const adminApis = adminSdk.initAdminClient(
    process.env.NETROSA_API_KEY, 
    process.env.NETROSA_API_ID, 
    process.env.NETROSA_API_SECRET, 
    API_VERSION
)

const publicApis = publicSdk.initPublicClient(
    process.env.NETROSA_API_KEY,
    API_VERSION
)

let timeouts = {
    "ropsten": 600000,
    "netvote": 60000
}


describe(`Form Admin APIs`, function() {

    let form;
    let keys;
    let subId;
    let network = "netvote"

    it('should create form', async()=>{
        let res = await adminApis.CreateForm({
            form: FORM_EXAMPLES.ALL_TYPES,
            name: "test form",
            network: network,
            continuousReveal: true,
            authType: "key",
            test: true
        })
        form = res;
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
        console.log(form.formId);
        await adminApis.PollForStatus(form.formId, "ready", timeouts[network]);
    });

    it('should get form', async()=>{
        let res = await adminApis.GetForm(form.formId)
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
    });

    it('should list forms', async()=>{
        let res = await adminApis.GetFormList()
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
    });

    it('should open form', async()=>{
        await adminApis.OpenForm(form.formId);
        let res = await adminApis.GetForm(form.formId)
        assert.equal("opening", res.formStatus, "should be opening")
        await adminApis.PollForStatus(form.formId, "open", timeouts[network]);
    });

    it('should stop form', async()=>{
        await adminApis.StopForm(form.formId);
        let res = await adminApis.GetForm(form.formId)
        assert.equal("stopped", res.formStatus, "should be stopped")
    });

    it('should reopen form', async()=>{
        await adminApis.OpenForm(form.formId);
        let res = await adminApis.GetForm(form.formId)
        assert.equal("open", res.formStatus, "should be open")
    });

    it('should generate keys', async()=>{
        let k = await adminApis.GenerateKeys(form.formId, 3);
        assert.equal(k.keys.length, 3, "should have 3 keys")
        keys = k.keys;
    });

    it('should get form', async() =>{
        let res = await publicApis.GetForm(form.formId);
        assert.equal(res.metadata.formId, form.formId, "should return form")
        assert.equal(JSON.stringify(res.form), JSON.stringify(FORM_EXAMPLES.ALL_TYPES), "should be same form")
    })

    it('should get voter jwt token and submit', async()=>{
        let res = await publicApis.GetJwtToken(form.formId, keys[0])
        assert.equal(res.token != null, true, "token should be set")
        let submissionResult = await publicApis.SubmitForm(form.formId, {
            value: { signatureSeed: "seed", test: true },
            proof: "abc123",
            publicKey: new Buffer("test").toString("base64"),
        }, res.token)
        assert.equal(submissionResult.subId != null, true, "subId should be in result");
        subId = submissionResult.subId;
        await publicApis.PollSubmissionForStatus(form.formId, submissionResult.subId, "complete", timeouts[network]);
    })

    it('should confirm submission proof', async ()=>{
        //throws Error if proof not preserved 
        await publicApis.ConfirmSubmissionProof(form.formId, subId, "abc123");
    })

    it('should get decryption key', async()=>{
        let k = await adminApis.GetDecryptionKey(form.formId);
        assert.equal(k != null, true, "should not be null")
    })

    it('should close form', async()=>{
        await adminApis.StopForm(form.formId);
        await adminApis.CloseForm(form.formId);
        let res = await adminApis.GetForm(form.formId)
        assert.equal("closing", res.formStatus, "should be closing")
        await adminApis.PollForStatus(form.formId, "closed", timeouts[network]);
    });

    it('should export submissions', async() => {
        let count = 0;
        let result;
        await adminApis.ExportSubmissions(form.formId, function(obj){
            result  =obj;
            count++;
        })
        assert.equal(count, 1, "count should be 1")
        assert.deepEqual(result.decrypted, { signatureSeed: "seed", test: true }, "submission should be what was sent")
    })


})