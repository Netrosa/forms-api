const assert = require('assert');
const FORM_EXAMPLES = require("./form-examples").FORMS;
const apis = require("../sdk")

const API_VERSION = process.env.NETROSA_API_VERSION || "dev";


const adminApis = apis.initAdminClient(
    process.env.NETROSA_API_KEY, 
    process.env.NETROSA_API_ID, 
    process.env.NETROSA_API_SECRET, 
    API_VERSION
)

const publicApis = apis.initPublicClient(
    process.env.NETROSA_API_KEY,
    API_VERSION
)

describe(`Form Admin APIs`, function() {

    let form;
    let keys;

    it('should create form', async()=>{
        let res = await adminApis.CreateForm({
            form: FORM_EXAMPLES.ALL_TYPES,
            name: "test form",
            network: "netvote",
            continuousReveal: true,
            authType: "key",
            test: true
        })
        form = res;
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
        console.log(form.formId);
        await adminApis.PollForStatus(form.formId, "ready", 60000);
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
        await adminApis.PollForStatus(form.formId, "open", 60000);
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
        let k = await adminApis.GenerateKeys(form.formId, 10);
        assert.equal(k.keys.length, 10, "should have 10 keys")
        keys = k.keys;
        console.log(keys);
    });

    it('should get voter jwt token and submit', async()=>{
        let res = await publicApis.GetJwtToken(form.formId, keys[0])
        assert.equal(res.token != null, true, "token should be set")
        let submissionResult = await publicApis.SubmitForm(form.formId, {
            value: { signatureSeed: "seed", test: true },
            proof: "abc123",
            publicKey: new Buffer("test").toString("base64"),
        }, res.token)
        console.log(submissionResult);
    })

    it('should get decryption key', async()=>{
        let k = await adminApis.GetDecryptionKey(form.formId);
        assert.equal(k != null, true, "should not be null")
    })

    // it('should close form', async()=>{
    //     await adminApis.StopForm(form.formId);
    //     await adminApis.CloseForm(form.formId);
    //     let res = await adminApis.GetForm(form.formId)
    //     assert.equal("closing", res.formStatus, "should be closing")
    //     await adminApis.PollForStatus(form.formId, "closed", 60000);
    // });

    

})