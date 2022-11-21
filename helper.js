/* ------------- Begin Helper Functions ------------- */

// 403 - Forbidden; Store is not assigned to the current user
module.exports.check_owner = function check_owner(store_owner, current_user){
    if (store_owner === current_user){
        return true;
    }
    return false;
}

// 406 - Accept Header is not JSON
module.exports.check_header_type = function check_header_type(req){
    if(req.get('accept') !== 'application/json'){
        return false;
    } else {
        return true;
    }
}



/* ------------- End Helper Functions ------------- */