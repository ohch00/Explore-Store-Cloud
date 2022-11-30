const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../helpers/datastore');
const datastore = ds.datastore;
const { requiresAuth } = require('express-openid-connect');

const USER = "User";


router.use(bodyParser.json());



/* ------------- Begin User Model Functions ------------- */

async function add_user(name){
    var key = datastore.key(USER);
    const new_user = {"name": name};
    return await datastore.save({"key": key, "data": new_user}).then(() => {return key});
}

async function get_all_users(){
    const q = datastore.createQuery(USER);
    return await datastore.runQuery(q)
    .then( (entities) => {
            return entities[0].map(ds.fromDatastore)
    });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin User Controller Functions ------------- */

// route customization from https://github.com/auth0/express-openid-connect/blob/master/EXAMPLES.md#3-route-customization
router.get('/login', function(req, res){
    res.oidc.login({ returnTo: '/user' });
});

router.get('/user', requiresAuth(), function(req, res){
    check_new_user(req.oidc.user.sub)
    .then((result) => {
        if (result){
            add_user(req.oidc.user.sub);
        }
        res.status(200).send("JWT Token: " + req.oidc.idToken);
    });
});

router.get('/users', function(req, res){
    if (!check_header_type(req)){
        res.status(406).json({
            "Error": "Not Acceptable"
        });
        return;
    } else {
        get_all_users()
        .then( (users) => {
            res.status(200).json(users);
            return;
        });
    }
});

/* ------------- End Controller Functions ------------- */

function check_header_type(req){
    if(req.get('accept') !== 'application/json'){
        return false;
    } else {
        return true;
    }
}

async function check_new_user(name){
    var users = await get_all_users();
    for (i=0; i < users.length; i++) {
        if (name === users[i].name) {
            return false;
        }
    }
    return true;
}

module.exports = router;