/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_653341844")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2654332757",
    "help": "",
    "hidden": false,
    "id": "relation4196270541",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "aventures",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_653341844")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2654332757",
    "help": "",
    "hidden": false,
    "id": "relation4196270541",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "aventure",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
