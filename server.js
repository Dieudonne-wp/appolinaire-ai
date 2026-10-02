const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v26.0";

// ======================================================
// PAGE D'ACCUEIL
// ======================================================

app.get("/", (req, res) => {
  res.status(200).send("Appolinaire Vitowanou AI — Webhook OK");
});

// ======================================================
// VÉRIFICATION DU WEBHOOK META
// ======================================================

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Meta vérifié avec succès.");
    return res.status(200).send(challenge);
  }

  console.log("Échec de vérification du webhook.");
  return res.sendStatus(403);
});

// ======================================================
// ENVOYER UN MESSAGE À UN CLIENT MESSENGER
// ======================================================

async function envoyerMessage(senderId, texte) {
  if (!PAGE_ACCESS_TOKEN) {
    console.log("META_PAGE_ACCESS_TOKEN n'est pas encore configuré.");
    return;
  }

  const url =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages` +
    `?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient: {
          id: senderId
        },
        message: {
          text: texte
        }
      })
    });

    const result = await response.json();

    console.log("Réponse Messenger :", JSON.stringify(result));

    if (!response.ok) {
      console.log("Erreur Messenger :", JSON.stringify(result));
    }

  } catch (error) {
    console.log("Erreur lors de l'envoi du message :", error);
  }
}

// ======================================================
// RÉCEPTION DES MESSAGES META
// ======================================================

app.post("/webhook", async (req, res) => {
  console.log(
    "Meta webhook reçu :",
    JSON.stringify(req.body, null, 2)
  );

  // Meta attend rapidement une confirmation
  res.sendStatus(200);

  if (req.body.object !== "page") {
    return;
  }

  for (const entry of req.body.entry || []) {

    for (const event of entry.messaging || []) {

      // Ignorer les événements qui ne sont pas des messages
      if (!event.message) {
        continue;
      }

      // Ignorer les messages envoyés par la Page elle-même
      if (event.message.is_echo) {
        continue;
      }

      const senderId = event.sender?.id;
      const texte = event.message?.text;

      if (!senderId) {
        continue;
      }

      console.log("Client :", senderId);
      console.log("Message :", texte || "[message sans texte]");

      // ==================================================
      // PREMIÈRE RÉPONSE DE TEST
      // ==================================================

      if (texte) {
        await envoyerMessage(
          senderId,
          "Bonjour 👋 Bienvenue chez Appolinaire Vitowanou. Que recherchez-vous aujourd'hui ? 😊"
        );
      }
    }
  }
});

// ======================================================
// DÉMARRAGE DU SERVEUR
// ======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Webhook running on port ${PORT}`);
});
