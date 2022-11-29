const express = require('express');
const app = express();
const config = require('./helpers/config');

const users = require('./routes/users');
const stores = require('./routes/stores');
const products = require('./routes/products');

const CLIENT_ID = config.client_id;
const CLIENT_SECRET = config.client_secret;
const DOMAIN = config.domain;
const AUTH_SECRET = config.auth_secret;
const BASE_URL = config.base_url;

// from https://auth0.com/docs/quickstart/webapp/express
const { auth } = require('express-openid-connect');

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

app.enable('trust proxy');

app.use(auth(o_auth_config));
app.use('/', users);
app.use('/stores', stores.router);
app.use('/products', products.router);

app.use(function(err, req, res, next){
    if (err.name === "UnauthorizedError") {
        res.status(401).json({
            "Error": "Unauthorized"
        });
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