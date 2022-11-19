const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const checkJWT = require('./auth').checkJWT;
const ds = require('./datastore');
const datastore = ds.datastore;
const helper = require('./helper');

const STORE = "Store";

router.use(bodyParser.json());


/* ------------- Begin Store Model Functions ------------- */

async function get_all_stores(owner){
    const q = datastore.createQuery(STORE);
    return await datastore.runQuery(q).then( (entities) => {
        return entities[0].map(ds.fromDatastore)
        .filter( item => item.owner === owner );
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
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": "Not Acceptable"
        });
        return;
    } else {
        get_all_stores(req.auth.sub)
        .then( (stores) => {
            res.status(200).json(stores);
            return;
        });
    }
});

router.get('/:id', checkJWT, function(req, res){
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": "Not Acceptable"
        });
        return;
    } else {
        get_store(id)
        .then( (store) => {
            if (store[0] === undefined || store[0] === null){
                res.status(404).json({
                    "Error": "No store with this store_id exists"
                });
                return;
            } else if (!helper.check_owner(store[0].owner, req.auth.sub)){
                res.status(403).json({
                    "Error": "this store is owned by another user"
                });
            }
        });
    }
})


/* ------------- End Controller Functions ------------- */

/* ------------- Begin Relationship Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Relationship Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */

module.exports = router;