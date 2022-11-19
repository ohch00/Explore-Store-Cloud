// Client secret is stored in an external file (config.js). An example of the format of config.js is located in config.js.example.
// config.js will not be included with the assignment submission. Please contact me if the client secret is needed.
const config = require('./config');

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
const datastore = ds.datastore;
const helper = require('./helper');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const USER = "User";

const CLIENT_ID = config.client_id;
const CLIENT_SECRET = config.client_secret;
const DOMAIN = config.domain;
const AUTH_SECRET = config.auth_secret;
const BASE_URL = config.base_url;

// from https://auth0.com/docs/quickstart/webapp/express
const { auth, requiresAuth } = require('express-openid-connect');

const o_auth_config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: BASE_URL,
    clientID: CLIENT_ID,
    issuerBaseURL: `https://${DOMAIN}/`,
    secret: AUTH_SECRET,
    clientSecret: CLIENT_SECRET,
    routes: {
        login: false,
    },
};

app.use(auth(o_auth_config));
router.use(bodyParser.json());

module.exports.checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),
    credentialsRequired: false,
    // Validate the audience and the issuer.
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256']
});



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
    add_user(req.oidc.sub)
    .then( () => {
        res.send("JWT Token: " + req.oidc.idToken);
    });
});

router.get('/', function(req, res){
    if (!helper.check_header_type(req)){
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

