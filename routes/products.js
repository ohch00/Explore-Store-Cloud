const express = require('express');
const bodyParser = require('body-parser');
const ds = require('../helpers/datastore');
const datastore = ds.datastore;
const errors = require('../helpers/errors');
const router = express.Router();
const store_exports = require('./stores');

const PRODUCT = "Product";

router.use(bodyParser.json());



/* ------------- Begin Product Model Functions ------------- */

async function get_all_products(req){
    var q = datastore.createQuery(PRODUCT).limit(5);
    var results = {};
    var total_products = false;

    if (Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    } else { var total_products = get_total_products()}

    return Promise.all([total_products, datastore.runQuery(q)])
    .then((resolved) => {
        var total_count = resolved[0];
        if (total_count !== false){
            results.total_count = total_count;
        }
        var entities = resolved[1];
        results.products = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS){
            results.next = req.protocol + "://" + req.get("host") + "/products?cursor=" + entities[1].endCursor;
        }
        return results;
    });
}

async function get_total_products(){
    const q = datastore.createQuery(PRODUCT);
    return datastore.runQuery(q)
    .then((entities) => { return entities[0].map(ds.fromDatastore).length });
}

async function get_all_products_general(){
    const q = datastore.createQuery(PRODUCT);
    return datastore.runQuery(q)
    .then((entities) => { return entities[0].map(ds.fromDatastore) });
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
	return await datastore.save({"key": key, "data": new_product}).then(() => { return key });
}

async function patch_put_product(id, name, type, description, stores){
    const key = datastore.key([PRODUCT, parseInt(id,10)]);
    const product = {"name": name, "type": type, "description": description, "stores": stores };
    return await datastore.save({"key": key, "data": product}).then(() => { return key });
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
        get_all_products(req)
        .then((entities) => {
            const products = entities.products;
            for (i=0; i< products.length; i++){
                const self = req.protocol + "://" + req.get("host") + "/products/" + products[i]["id"];
                entities.products[i]["self"] = self;

                const stores = products[i]["stores"];
                if (stores.length > 0){
                    for (j=0; j < stores.length; j++) {
                        var store_self = req.protocol + "://" + req.get("host") + "/stores/" + stores[j];
                        const store_info = { "store_id": stores[j], "self": store_self };
                        entities.products[i]["stores"][j] = store_info;
                    }
                }
            }
            res.status(200).json(entities);
            return;
        });
    }
});

router.get('/:id', function(req, res){
    res.set("Content", "application/json");
    if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else {
        get_product(req.params.id)
        .then( (product) => {
            if (product[0] === undefined || product[0] === null){
                res.status(404).json({
                    "Error": errors['404_product']
                });
                return;
            } else {
                const self = req.protocol + "://" + req.get("host") + "/products/" + req.params.id;
                product[0]["self"] = self;
                const stores = product[0]["stores"]
                if (stores.length > 0){
                    for (j=0; j < stores.length; j++) {
                        var store_self = req.protocol + "://" + req.get("host") + "/stores/" + stores[j];
                        const store_info = { "store_id": stock[j], "self": store_self };
                        stock[j] = store_info;
                    }
                }
                res.status(200).json(product[0]);
                return;
            }
        });
    }
});

router.post('/', function(req, res){
    res.set("Content", "application/json");
    if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (!check_missing_attributes(req.body.name, req.body.type) || 
        !check_invalid_string(req.body.name) || 
        !check_invalid_string(req.body.type) ||
        !check_req_body(req.body)){
            res.status(400).json({
                "Error": errors[400]
            });
            return;
    } else {
        check_unique_name(req.body.name)
        .then( (result) => {
            if (!result){
                res.status(403).json({
                    "Error": errors['403_name_product']
                });
                return;
            } else {
                var new_description = req.body.description;
                if (new_description !== null && new_description !== undefined && new_description !== ""){
                    if(!check_invalid_string(new_description)){
                        res.status(400).json({
                            "Error": errors[400]
                        });
                        return;
                    }
                } else {
                    new_description = "";
                }
                post_product(req.body.name, req.body.type, new_description)
                .then( (key)  => {
                    const self = req.protocol + "://" + req.get("host") + "/products/" + key.id;
                    res.status(201).json({
                        "id": key.id,
                        "name": req.body.name,
                        "type": req.body.type,
                        "description": new_description,
                        "stores": [],
                        "self": self
                    });
                    return;
                });
            }
            return;
        });
    }
});

router.patch('/:product_id', async function(req, res){
    res.set("Content", "application/json");
    var has_name = false;
    var has_type = false;
    var unique_name = false;

    if (req.body.name !== null && req.body.name !== undefined){
        if (!check_invalid_string(req.body.name)) {
            res.status(400).json({
                "Error": errors['400_patch']
            });
            return;
        } else {
            unique_name = check_unique_name(req.body.name);
        }
    }
    if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.params.product_id === null || req.params.product_id === undefined){
        res.status(404).json({
            "Error": errors['404_product']
        });
        return;
    } else if ((req.body.name === null || req.body.name === undefined) && 
        (req.body.type === null || req.body.type === undefined) &&
        (req.body.description === null || req.body.description === undefined)){
            res.status(400).json({
                "Error": errors['400_patch']
            });
            return;
    } else if (!check_req_body(req.body)){
        res.status(400).json({
            "Error": errors['400_patch']
        });
        return;
    }
    if (req.body.type !== null && req.body.type !== undefined){
        if (!check_invalid_string(req.body.type)) {
            res.status(400).json({
                "Error": errors['400_patch']});
            return;
        } else {
            has_type = true;            
        }
    }
    var get_product_info = get_product(req.params.product_id);
    Promise.all([unique_name, get_product_info])
    .then((results) => {
        const result = results[0];
        const product = results[1];
        if (!result){
            res.status(403).json({
                "Error": errors['403_name_product']
            });
            return;
        } else { has_name = true }
        if (has_name === true && has_type === true) {
            res.status(400).json({
                "Error": errors['400_patch']
            });
            return;
        } else if (product[0] === null || product[0] === undefined){
            res.status(404).json({
                "Error": errors['404_product']
            });
            return;
        } else {
            var update_name = product[0].name;
            var update_type = product[0].type;
            var update_description = product[0].description;

            if (has_name){
                update_name = req.body.name;
            }
            if (has_type){
                update_type = req.body.type;
            }
            if (req.body.description === ""){
                update_description = "";
            } else if (req.body.description !== null && req.body.description !== undefined && req.body.description !== ""){
                if (!check_invalid_string(req.body.description)){
                    res.status(400).json({
                        "Error": errors['400_patch']
                    });
                    return;
                } else {
                    update_description = req.body.description;
                }
            }
            patch_put_product(req.params.product_id, update_name, update_type, update_description, product[0].stores)
            .then((key) => {
                const self = req.protocol + "://" + req.get("host") + "/products/" + key.id;
                res.status(200).json({
                    "id": key.id,
                    "name": update_name,
                    "type": update_type,
                    "description": update_description,
                    "stores": product[0].stores,
                    "self": self
                });
            });
        }
    });
});

router.put('/:product_id', function(req, res){
    res.set("Content", "application/json");
    if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.params.product_id === null || req.params.product_id === undefined){
        res.status(404).json({
            "Error": errors['404_product']
        });
        return;
    } else if (!check_missing_attributes(req.body.name, req.body.type) || 
        !check_invalid_string(req.body.name) || 
        !check_invalid_string(req.body.type) ||
        !check_req_body(req.body)){
            res.status(400).json({
                "Error": errors[400]
            });
            return;        
    } else {
        check_unique_name(req.body.name)
        .then((result) => {
            if (!result){
                res.status(403).json({
                    "Error": errors['403_name_product']
                });
                return;
            } else {
                get_product(req.params.product_id)
                .then((product) => {
                    if (product[0] === null || product[0] === undefined){
                        res.status(404).json({
                            "Error": errors['404_product']
                        });
                    } else {
                        var update_description = product[0].description;
                        if (req.body.description === ""){
                            update_description = "";
                        } else if (req.body.description !== null && req.body.description !== undefined && req.body.description !== ""){
                            if (!check_invalid_string(req.body.description)){
                                res.status(400).json({
                                    "Error": errors[400]
                                });
                                return;
                            } else {
                                update_description = req.body.description;
                            }
                        }                        
                        patch_put_product(req.params.product_id, req.body.name, req.body.type, update_description, product[0].stores)
                        .then((key) => {
                            const self = req.protocol + "://" + req.get("host") + "/products/" + key.id;
                            res.status(200).json({
                                "id": key.id,
                                "name": req.body.name,
                                "type": req.body.type,
                                "description": update_description,
                                "stores": product[0].stores,
                                "self": self
                            });
                            return;
                        });
                    }
                });
            }
        });
    }
});

router.put('/', function(req, res){
    res.status(405).json({
        "Error": errors['405_edit']
    });
});

router.delete('/:product_id', function(req, res){
    res.set("Content", "application/json");
    if (req.params.product_id === null || req.params.product_id === undefined){
        res.status(404).json({
            "Error": errors['404_product']
        });
        return;
    } else if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return
    } else {
        get_product(req.params.product_id)
        .then((product) => {
            if (product[0] === null || product[0] === undefined){
                res.status(404).json({
                    "Error": errors['404_product']
                });
                return;
            } else {
                if (product[0].stores.length > 0){
                    product_deleted(req.params.product_id)
                    .then(() => {
                        delete_product(req.params.product_id)
                        .then(() => {
                            res.status(204).end();
                        });
                    });
                } else {
                    delete_product(req.params.product_id)
                    .then(() => {
                        res.status(204).end();
                    });
                }
            }
        });
    }
});

router.delete('/', function(req, res){
    res.status(405).json({
        "Error": errors['405_delete']
    });
});

/* ------------- End Controller Functions ------------- */



/* ------------- Begin Relationship Model Functions ------------- */

async function add_store_to_product(product_id, store_id){
    const key = datastore.key([PRODUCT, parseInt(product_id, 10)]);
    const entity = await datastore.get(key);
    var product = entity[0];
    product.stores.push(store_id);
    update_product = { "name": product.name, "type": product.type, "description": product.description, "stores": product.stores }
    await datastore.save({ "key": key, "data": update_product });
    return key;
}

async function remove_store_from_product(product_id, stores){
    const key = datastore.key([PRODUCT, parseInt(product_id, 10)]);
    const entity = await datastore.get(key);
    var product = entity[0];
    update_product = { "name": product.name, "type": product.type, "description": product.description, "stores": stores }
    await datastore.save({ "key": key, "data": update_loads });
    return key;
}

async function product_deleted(product_id){
    const all_stores = await store_exports.get_all_stores_general();
    //const all_stores = entities[0];
    for (i=0; i < all_stores.length; i++){
        const store_stock = all_stores[i].stock;
        for (j=0; j < store_stock.length; j++){
            if (store_stock[j] === product_id){
                store_stock.splice(j, 1);
                break;
            }
        }
        await store_exports.remove_product_from_store(all_stores[i], store_stock);
    }
}

/* ------------- End Model Functions ------------- */



/* ------------- Begin Helper Functions ------------- */

// 400 - missing attributes
function check_missing_attributes(name, type) {
    if (name === null || name === undefined ||
        type === null || type === undefined) {
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
    const products = await get_all_products_general();
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

module.exports = {
    router,
    get_all_products_general,
    get_product,
    add_store_to_product,
    remove_store_from_product
}