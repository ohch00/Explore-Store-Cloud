// Client secret is stored in an external file (config.js). An example of the format of config.js is located in config.js.example.
// config.js will not be included with the assignment submission. Please contact me if the client secret is needed.
const config = require('./config');

const express = require('express');
const app = express();

const { Datastore } = require('@google-cloud/datastore');

const bodyParser = require('body-parser');

const datastore = new Datastore();

const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const USER = "User";
const STORE = "Store";
const PRODUCT = "Product";

const router = express.Router();
const stores = express.Router();
const products = express.Router();

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
app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

const checkJwt = jwt({
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
            return entities[0].map(fromDatastore)
    });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin User Controller Functions ------------- */

// route customization from https://github.com/auth0/express-openid-connect/blob/master/EXAMPLES.md#3-route-customization
router.get('/login', function(req, res){
    res.oidc.login({ returnTo: '/user' });
});

router.get('/user', requiresAuth(), function(req, res){
    res.send("JWT Token: " + req.oidc.idToken);
});

router.get('/', function(req, res){
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



/* ------------- Begin Store Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Store Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */



/* ------------- Begin Product Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Product Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */



/* ------------- Begin Relationship Model Functions ------------- */

/* ------------- End Model Functions ------------- */

/* ------------- Begin Relationship Controller Functions ------------- */

/* ------------- End Controller Functions ------------- */

/* ------------- Begin Helper Functions ------------- */

// 406 - Accept Header is not JSON
function check_header_type(req){
    if(req.get('accept') !== 'application/json'){
        return false;
    } else {
        return true;
    }
}

/* ------------- End Helper Functions ------------- */



app.use('/', router);
app.use('/stores', stores);
app.use('/products', products);
app.use(function(err, req, res, next){
    if (err.name === "UnauthorizedError") {
        res.status(401).end();
        return;
    } else {
        next(err);
    }
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});