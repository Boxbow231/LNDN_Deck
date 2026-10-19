/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1638856567")

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2654332757",
    "help": "",
    "hidden": false,
    "id": "relation509009483",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "aventure",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1638856567")

  // remove field
  collection.fields.removeById("relation509009483")

  return app.save(collection)
})
