import "dotenv/config";
import { client } from "./src/bot/client.js";
import { handleMessage } from "./src/bot/messageHandler.js";

client.on("message", async (msg) => {
  const reply = await handleMessage(msg);
  await msg.reply(reply);
});

client.initialize();
