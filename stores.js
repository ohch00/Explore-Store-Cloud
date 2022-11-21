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
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
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
    if (!helper.check_header_type(req)){
        res.status(406).json({
            "Error": errors[406]
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

router


/* ------------- End Controller Functions ------------- */

/* ------------- Begin Relationship Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Relationship Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */

module.exports = router;