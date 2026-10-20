/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "verificationTemplate": {
      "body": "<p>Salutations,</p>\n<p>Merci de rejoindre l'aventure des <strong>Nominés du Néombre</strong> !</p>\n<p>Avant de pouvoir t'enfoncer dans les ténèbres, tu dois prouver que tu n'es pas une illusion. Clique sur le bouton ci-dessous pour valider ton compte :</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-verification/{TOKEN}\" target=\"_blank\" rel=\"noopener\" style=\"background-color: #8b0000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 3px; display: inline-block;\">Valider mon inscription</a>\n</p>\n<p><i>Si tu n'as jamais demandé à rejoindre cette quête, ignore simplement ce message.</i></p>\n<p>\n  Que les Ombres te soient favorables,<br/>\n  Le Développeur du Néombre\n</p>",
      "subject": "[Les Nominés du Néombre] Valide ton inscription"
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "verificationTemplate": {
      "body": "<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-verification/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Verify</a>\n</p>\n<p><i>If you didn't recently register, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
      "subject": "Verify your {APP_NAME} email"
    }
  }, collection)

  return app.save(collection)
})
