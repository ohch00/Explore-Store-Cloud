const { Datastore } = require('@google-cloud/datastore');

const datastore = new Datastore();
function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

/* Functions from ./routes/stores.js to fix circular import */
async function get_all_stores_general(){
    const q = datastore.createQuery('Store');
    return datastore.runQuery(q)
    .then((entities) => { return entities[0].map(fromDatastore) });
}

async function remove_product_from_store(store_id, stock){
    const key = datastore.key(['Store', parseInt(store_id,10)]);
    const entity = await datastore.get(key);
    var store = entity[0];
    const update_store = {"name": store.name, "location": store.location, "size": store.size, "owner": store.owner, "stock": stock};
    await datastore.save({ "key": key, "data": update_store });
    return key;
}

module.exports = {
    Datastore,
    datastore,
    fromDatastore,
    get_all_stores_general,
    remove_product_from_store
}