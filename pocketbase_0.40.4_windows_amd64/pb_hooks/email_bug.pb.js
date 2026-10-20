onRecordAfterCreate((e) => {
    const titre = e.record.get("titre");
    const description = e.record.get("description");
    const auteur = e.record.get("auteur");

    const message = new mailer.Message({
        from: {
            address: $app.settings().meta.senderAddress,
            name: "Le Grimoire du Néombre",
        },
        to: [{ address: "aurelien.a3g@gmail.com" }],
        subject: "🐛 Nouveau Bug signalé : " + titre,
        html: `
            <div style="font-family: sans-serif; color: #333;">
                <h2 style="color: #8b0000;">Un nouveau bug a été inscrit dans le grimoire !</h2>
                <p><strong>Auteur :</strong> ${auteur}</p>
                <p><strong>Titre :</strong> ${titre}</p>
                <p><strong>Description :</strong></p>
                <blockquote style="border-left: 4px solid #8b0000; padding-left: 10px; background: #f9f9f9; padding: 10px; font-style: italic;">
                    ${description}
                </blockquote>
                <p><em>Connecte-toi à l'interface d'administration PocketBase pour purger ce bug.</em></p>
            </div>
        `,
    });

    try {
        $app.newMailClient().send(message);
        console.log("Email de bug envoyé à Aurélien pour : " + titre);
    } catch (err) {
        console.error("Erreur lors de l'envoi de l'email de bug :", err);
    }
}, "maledictions");