const assert = require('assert');
const FORM_EXAMPLES = require("./form-examples").FORMS;
const netvoteApis = require("../sdk")

const API_VERSION = process.env.NETROSA_API_VERSION || "dev";

const nv = netvoteApis.initAdminClient(
    process.env.NETROSA_API_KEY, 
    process.env.NETROSA_API_ID, 
    process.env.NETROSA_API_SECRET, 
    API_VERSION
)


describe(`Form Admin APIs`, function() {

    let form;

    it('should create form', async()=>{
        let res = await nv.CreateForm({
            form: FORM_EXAMPLES.ALL_TYPES,
            name: "test form",
            network: "ropsten",
            continuousReveal: true,
            authType: "key",
            test: true
        })
        form = res;
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
        await nv.PollForStatus(form.formId, "ready", 60000);
    });

    it('should get form', async()=>{
        let res = await nv.GetForm(form.formId)
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
    });

    it('should list forms', async()=>{
        let res = await nv.GetFormList()
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
    });

    it('should open form', async()=>{
        await nv.OpenForm(form.formId);
        let res = await nv.GetForm(form.formId)
        assert.equal("opening", res.formStatus, "should be opening")
        await nv.PollForStatus(form.formId, "open", 60000);
    });

    it('should stop form', async()=>{
        await nv.StopForm(form.formId);
        let res = await nv.GetForm(form.formId)
        assert.equal("stopped", res.formStatus, "should be stopped")
    });

    it('should reopen form', async()=>{
        await nv.OpenForm(form.formId);
        let res = await nv.GetForm(form.formId)
        assert.equal("open", res.formStatus, "should be open")
    });

    it('should close form', async()=>{
        await nv.StopForm(form.formId);
        await nv.CloseForm(form.formId);
        let res = await nv.GetForm(form.formId)
        assert.equal("closing", res.formStatus, "should be closing")
        await nv.PollForStatus(form.formId, "closed", 60000);
    });

})