module.exports = {
    "400": "The request object is missing at least one of the required attributes or contains an invalid input for an attribute",
    "400_patch": "The request object does not contain at least one attribute, contains all attributes of the entity, or contains an invalid input for an attribute",
    "401": "Unauthorized",
    "403_owner": "This store is owned by another user",
    "403_name": "The requested name attribute is already assigned to another store",
    "403_owner_and_name": "The requested name attribute already assigned to another store or is owned by another user",
    "403_already_stocked": "This store is owned by another user or the product is already stocked at this store",
    "403_no_stock": "This store is owned by another user or the product is not at this store",
    "404_store": "No store with this store_id exists",
    "404_product": "No product with this product_id exists",
    "405_edit": "The functionality to edit all entities at once is not supported",
    "405_delete": "The functionality to delete all entities at once is not supported",
    "406": "Not Acceptable"
}