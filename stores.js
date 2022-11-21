const express = require('express');
const bodyParser = require('body-parser');
const checkJWT = require('./auth').checkJwt;
const ds = require('./datastore');
const datastore = ds.datastore;
const errors = require('./errors');
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
    if (!check_header_type(req)){
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
        .then( (all_stores) => {
            const stores = all_stores["stores"];
            for (i=0; i < stores.length; i++){
                const self = req.protocol + "://" + req.get("host") + "/stores/" + stores[i]["id"];
                stores[i]["self"] = self;
            }
            const stock = stores[i]["stock"];
            if (stock.length > 0){
                for (j=0; j < stock.length; j++) {
                    var stock_self = req.protocol + "://" + req.get("host") + "/products/" + stock[j];
                    const stock_info = { "product_id": stock[j], "self": stock_self };
                    stores[i]["stock"][j] = stock_info;
                }
            }
            res.status(200).json(stores);
            return;
        });
    }
});

router.get('/:id', checkJWT, function(req, res){
    res.set("Content", "application/json");
    if (!check_header_type(req)){
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
                return;
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
    if (!check_header_type(req)){
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
        return;
    } else {
        post_store(req.body.name, req.body.location, req.body.size, req.auth.sub)
        .then( (key)  => {
            const self = req.protocol + "://" + req.get("host") + "/stores/" + key.id;
            res.status(201).json({
                "id": key.id,
                "name": req.body.name,
                "location": req.body.location,
                "size": req.body.size,
                "stock": [],
                "owner": req.auth.sub,
                "self": self
            });
            return;
        });
    }
});

router.patch('/:store_id', checkJWT, function(req, res){
    res.set("Content", "application/json");
    var has_name = false;
    var has_location = false;
    var has_size = false;

    if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return;
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    } else if (req.params.store_id === null || req.params.store_id === undefined){
        res.status(404).json({
            "Error": errors['404_store']
        });
        return;
    } else if ((req.body.name === null || req.body.name === undefined) && 
    (req.body.location === null || req.body.location === undefined) &&
    (req.body.size === null || req.body.size === undefined)) {
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
    if (req.body.location !== undefined && req.body.location !== null) {
        if (!check_invalid_name_location(req.body.location)) {
            res.status(400).json({
                "Error": errors['400_patch']});
            return;
        } else {
            has_location = true;            
        }
    } 
    if (req.body.size !== undefined && req.body.size !== null) {
        if (!check_invalid_size(req.body.size)) {
            res.status(400).json({
                "Error": errors['400_patch']
            });
            return;
        } else {
            has_size = true;
        }
    }
    if (req.body.name !== null || req.body.name === undefined){
        if (!check_invalid_name_location(req.body.name)) {
            res.status(400).json({
                "Error": errors['400_patch']
            });
            return;
        } else {
            check_unique_name(req.body.name)
            .then( (result) => {
                if (!result){
                    res.status(403).json({
                        "Error": errors['403_owner_and_name']
                    });
                    return;
                } else {
                    has_name = true;
                }
            });
        }
    }
    if (has_name === true && has_location === true && has_size === true) {
        res.status(400).json({
            "Error": errors['400_patch']
        });
        return;
    } else {
        get_store(req.params.store_id)
        .then( (store) => {
            if (store[0] === null || store[0] === undefined){
                res.status(404).json({
                    "Error": errors['404_store']
                });
                return;
            } else if (!check_owner(store[0].owner, req.auth.sub)){
                res.status(403).json({
                    "Error": errors['403_owner_and_name']
                });
            } else {
                var update_name = store[0].name;
                var update_location = store[0].location;
                var update_size = store[0].size;

                if (has_name){
                    update_name = req.body.name;
                }
                if (has_location){
                    update_location = req.body.location;
                }
                if (has_size){
                    update_size = req.body.size;
                }
                patch_put_store(req.params.store_id, req.body.name, req.body.location, req.body.size)
                .then( (key) => {
                    const self = req.protocol + "://" + req.get("host") + "/stores/" + key.id;
                    res.status(200).json({
                        "id": key.id,
                        "name": update_name,
                        "location": update_location,
                        "size": update_size,
                        "stock": store[0].stock,
                        "owner": store[0].owner,
                        "self": self
                    });
                });
            }
        });
    }
});

router.put('/:store_id', checkJWT, function(req, res){
    res.set("Content", "application/json");
    if (req.params.store_id === null || req.params.store_id === undefined){
        res.status(404).json({
            "Error": errors['404_store']
        });
        return;
    } else if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    } else if (!check_invalid_name_location(req.body.name) ||
    !check_invalid_name_location(req.body.location) ||
    !check_invalid_size(req.body.size) || 
    !check_req_body(req.body) ||
    !check_missing_attributes(req.body.name, req.body.location, req.body.size)){
        res.status(400).json({
            "Error": errors[400]
        });
        return;
    } else {
        check_unique_name(req.params.name)
        .then( (result) => {
            if (!result){
                res.status(403).json({
                    "Error": errors['403_owner_and_name']
                });
                return;
            } else {
                get_store(req.params.store_id)
                .then( (store) => {
                    if (store[0] === null || store[0] === undefined){
                        res.status(404).json({
                            "Error": errors['404_store']
                        });
                        return;
                    } else if (!check_owner(store[0].owner, req.auth.sub)){
                        res.status(403).json({
                            "Error": errors['403_owner_and_name']
                        });
                    } else {
                        patch_put_store(req.params.store_id, req.body.name, req.body.location, req.body.size)
                        .then( (key) => {
                            const self = req.protocol + "://" + req.get("host") + "/stores/" + key.id;
                            res.status(200).json({
                                "id": key.id,
                                "name": req.body.name,
                                "location": req.body.location,
                                "size": req.body.size,
                                "stock": store[0].stock,
                                "owner": store[0].owner,
                                "self": self
                            });
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

router.delete('/:store_id', checkJWT, function(req, res){
    res.set("Content", "application/json");
    if (req.params.store_id === null || req.params.store_id === undefined){
        res.status(404).json({
            "Error": errors['404_store']
        });
        return;
    } else if (!check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
        });
        return
    } else if (req.auth === null || req.auth === undefined) {
        res.status(401).json({
            "Error": errors[401]
        });
        return;
    } else {
        get_store(req.params.store_id)
        .then( (store) => {
            if (store[0] === null || store[0] === undefined){
                res.status(404).json({
                    "Error": errors['404_store']
                });
                return;
            } else if (!check_owner(store[0].owner, req.auth.sub)){
                res.status(403).json({
                    "Error": errors['403_owner']
                });
            } else {
                delete_store(req.params.store_id)
                .then( () => {
                    res.status(204).end();
                });
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