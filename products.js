const express = require('express');
const bodyParser = require('body-parser');
const ds = require('./datastore');
const datastore = ds.datastore;
const errors = require('./errors');
const router = express.Router();

const PRODUCT = "Product";

router.use(bodyParser.json());



/* ------------- Begin Product Model Functions ------------- */

async function get_all_products(){
    const q = datastore.createQuery(PRODUCT).limit(5);
    var results = {};
    if (Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
    return await datastore.runQuery(q).then( (entities) => {
        results.stores = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS){
            results.next = req.protocol + "://" + req.get("host") + "/products?cursor=" + entities[1].endCursor;
        }
        return results;
    });
}

async function get_product(id){
    const key = datastore.key([PRODUCT, parseInt(id,10)]);
    const entity = await datastore.get(key);
    if (entity[0] === undefined || entity[0] === null) {
        return entity;
    }
    else {
        return entity.map(ds.fromDatastore);
    }
}

async function post_product(name, type, description){
    var key = datastore.key(PRODUCT);
	const new_product = {"name": name, "type": type, "description": description, "stores": []};
	return await datastore.save({"key": key, "data": new_product}).then(() => {return key});
}

async function patch_put_product(id, name, type, description){
    const key = datastore.key([PRODUCT, parseInt(id,10)]);
    const product = {"name": name, "type": type, "description": description};
    return await datastore.save({"key": key, "data": product}).then(() => {return key});
}

async function delete_product(id){
    const key = datastore.key([PRODUCT, parseInt(id,10)]);
    return await datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Product Controller Functions ------------- */
router.get('/', function(req, res){
    res.set("Content", "application/json");
    if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else {
        get_all_products()
        .then( (all_products) => {
            const products = all_products["products"];
            for (i=0; i< products.length; i++){
                const self = req.protocol + "://" + req.get("host") + "/products/" + products[i]["id"];
                products[i]["self"] = self;
            }
            const stores = products[i]["stores"];
            if (stores.length > 0){
                for (j=0; j < stores.length; j++) {
                    var store_self = req.protocol + "://" + req.get("host") + "/stores/" + stores[j];
                    const store_info = { "product_id": stores[j], "self": store_self };
                    products[i]["stores"][j] = store_info;
                }
            }
            res.status(200).json(products);
            return;
        });
    }
});


/* ------------- End Controller Functions ------------- */




/* ------------- Begin Relationship Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Relationship Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */



/* ------------- Begin Helper Functions ------------- */

// 400 - missing attributes
function check_missing_attributes(name, type, description) {
    if (name === null || name === undefined ||
        type === null || type === undefined ||
        description === null || description === undefined) {
            return false;
        } else {
            return true;
        }
}

// 400 - invalid inputs
function check_invalid_string(str) {
    if (typeof str !== 'string') {
        return false;
    }
    if (str.length < 1 || str.length > 255) {
        return false;
    }
    return true;
}
function check_req_body(req_body) {
    for (var i in req_body){
        if (i !== 'name' && i !== 'type' && i !== 'description') {
            return false;
        }
    }
    return true;
}

// 403 - Forbidden; Name already exists in Datastore
async function check_unique_name(name){
    const q = datastore.createQuery(PRODUCT);
    const entities = await datastore.runQuery(q);
    const products = entities[0];

    for (i=0; i < products.length; i++) {
        if (name === products[i].name) {
            return false;
        }
    }
    return true;
}

// 406 - Accept Header is not JSON
function check_header_type(req){
    if(req.get('accept') !== 'application/json'){
        return false;
    } else {
        return true;
    }
}
/* ------------- End Helper Functions ------------- */

module.exports = router;