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
            network: "netvote"
        })
        form = res;
        //TODO: verify more than this
        assert.equal(res != null, true, "res should be set")
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

})