/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1757051097")

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1638856567",
    "help": "",
    "hidden": false,
    "id": "relation4252084677",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "joueur",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1757051097")

  // remove field
  collection.fields.removeById("relation4252084677")

  return app.save(collection)
})
