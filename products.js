const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const checkJWT = require('./auth').checkJWT;
const ds = require('./datastore');
const datastore = ds.datastore;
const helper = require('./helper');

const PRODUCT = "Product";

router.use(bodyParser.json());



/* ------------- Begin Product Model Functions ------------- */

async function get_all_products(){
    const q = datastore.createQuery(PRODUCT);
    return await datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

async function get_product(id){
    const key = datastore.key([PRODUCT, parseInt(id,10)]);
    const entity = await datastore.get(key);
    if (entity[0] === undefined || entity[0] === null) {
        return entity;
    }
    else {
        return entity.map(fromDatastore);
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

/* ------------- End Controller Functions ------------- */

/* ------------- Begin Relationship Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Relationship Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */

module.exports = router;