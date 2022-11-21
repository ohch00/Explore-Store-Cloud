const express = require('express');
const bodyParser = require('body-parser');
const checkJWT = require('./auth').checkJwt;
const ds = require('./datastore');
const datastore = ds.datastore;
const errors = require('./errors');
const helper = require('./helper');
const router = express.Router();

const STORE = "Store";

router.use(bodyParser.json());


/* ------------- Begin Store Model Functions ------------- */

async function get_all_stores(owner){
    const q = datastore.createQuery(STORE).limit(5);
    var results = {};
    if (Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
    return await datastore.runQuery(q).then( (entities) => {
        results.stores = entities[0].map(ds.fromDatastore)
        .filter( item => item.owner === owner);

        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS){
            results.next = req.protocol + "://" + req.get("host") + "/stores?cursor=" + entities[1].endCursor;
        }
        return results;
    });
}

async function get_store(id){
    const key = datastore.key([STORE, parseInt(id,10)]);
    const entity = await datastore.get(key);
    if (entity[0] === undefined || entity[0] === null) {
        return entity;
    }
    else {
        return entity.map(ds.fromDatastore);
    }
}

async function post_store(name, location, size, owner){
    var key = datastore.key(STORE);
	const new_store = {"name": name, "location": location, "size": size, "owner": owner, "stock": []};
	return await datastore.save({"key": key, "data": new_store}).then(() => {return key});
}

async function patch_put_store(id, name, location, size){
    const key = datastore.key([STORE, parseInt(id,10)]);
    const store = {"name": name, "location": location, "size": size};
    return await datastore.save({"key": key, "data": store}).then(() => {return key});
}

async function delete_store(id){
    const key = datastore.key([STORE, parseInt(id,10)]);
    return await datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Store Controller Functions ------------- */

router.get('/', checkJWT, function(req, res){
    res.set("Content", "application/json");
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    } else {
        get_all_stores(req.auth.sub)
        .then( (stores) => {
            for (i=0; i< stores["stores"].length; i++){
                const self = req.protocol + "://" + req.get("host") + "/stores/" + stores["stores"][i]["id"];
                stores["stores"][i]["self"] = self;
            }
            const stock = stores["stores"][i]["stock"];
            if (stock.length > 0){
                for (j=0; j < stock.length; j++) {
                    var stock_self = req.protocol + "://" + req.get("host") + "/products/" + stock[j];
                    const stock_info = { "product_id": stock[j], "self": stock_self };
                    stock[j] = stock_info;
                }
            }
            res.status(200).json(stores);
            return;
        });
    }
});

router.get('/:id', checkJWT, function(req, res){
    res.set("Content", "application/json");
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    } else {
        get_store(id)
        .then( (store) => {
            if (store[0] === undefined || store[0] === null){
                res.status(404).json({
                    "Error": errors['404_store']
                });
                return;
            } else if (!helper.check_owner(store[0].owner, req.auth.sub)){
                res.status(403).json({
                    "Error": errors['403_owner']
                });
            } else {
                const self = req.protocol + "://" + req.get("host") + "/stores/" + id;
                store[0]["self"] = self;

                const stock = store[0]["stock"]
                if (stock.length > 0){
                    for (j=0; j < stock.length; j++) {
                        var stock_self = req.protocol + "://" + req.get("host") + "/products/" + stock[j];
                        const stock_info = { "product_id": stock[j], "self": stock_self };
                        stock[j] = stock_info;
                    }
                }
                res.status(200).json(store[0]);
                return;
            }
        });
    }
});

router.post('/', checkJWT, function(req, res){
    res.set("Content", "application/json");
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    } else if (
        !check_missing_attributes(req.body.name, req.body.location, req.body.size) || 
        !check_invalid_name_location(req.body.name) || 
        !check_invalid_name_location(req.body.location) ||
        !check_invalid_size(req.body.size) ||
        !check_req_body(req.body)){
            res.status(400).json({
                "Error": errors[400]
            });
    } else if (!check_unique_name(req.body.name)){
        res.status(403).json({
            "Error": errors['403_name']
        });
    } else {
        post_store(req.body.name, req.body.location, req.body.size, req.auth.sub)
        .then( (key)  => {
            const self = req.protocol + "://" + req.get("host") + "/stores/" + key;
            res.status(201).json({
                "id": key,
                "name": req.body.name,
                "location": req.body.location,
                "size": req.body.size,
                "stock": [],
                "owner": req.auth.sub,
                "self": self
            });
        });
    }
});

router.patch('/', checkJWT, function(req, res){
    res.set("Content", "application/json");
    var has_name = false;
    var has_location = false;
    var has_size = false;
    
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    }
});


/* ------------- End Controller Functions ------------- */

/* ------------- Begin Relationship Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Relationship Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */

/* ------------- Begin Helper Functions ------------- */

// 400 - missing attributes
function check_missing_attributes(name, location, size) {
    if (name === null || name === undefined ||
        location === null || location === undefined ||
        size === null || size === undefined) {
            return false;
        } else {
            return true;
        }
}

// 400 - invalid inputs
function check_invalid_name_location(str) {
    if (typeof str !== 'string') {
        return false;
    }
    if (str.length < 1 || str.length > 255) {
        return false;
    }
    return true;
}
function check_invalid_size(size) {
    if (typeof size !== 'number') {
        return false;
    }
    if (size < 1 || size > 2147483647) {
        return false;
    }
    return true;
}
function check_req_body(req_body) {
    for (var i in req_body){
        if (i !== 'name' && i !== 'location' && i !== 'size') {
            return false;
        }
    }
    return true;
}

// 403 - Forbidden; Store is not assigned to the current user
async function check_owner(store_owner, current_user){
    if (store_owner === current_user){
        return true;
    }
    return false;
}

// 403 - Forbidden; Name already exists in Datastore
async function check_unique_name(name){
    const q = datastore.createQuery(STORE);
    const entities = await datastore.runQuery(q);
    const stores = entities[0];

    for (i=0; i < stores.length; i++) {
        if (name === stores[i].name) {
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