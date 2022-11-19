const express = require('express');
const app = express();

const router = express.Router();

router.use('/', require('./auth'));
router.use('/stores', require('./stores'));
router.use('/products', require('./products'));
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