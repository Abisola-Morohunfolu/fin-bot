import "dotenv/config";
import { client } from "./src/bot/client.js";
import { handleMessage } from "./src/bot/messageHandler.js";
import { ensureDefaultCategories } from "./src/services/categoryService.js";

client.on("message", async (msg) => {
  const reply = await handleMessage(msg);
  await msg.reply(reply);
});

async function bootstrap() {
  try {
    await ensureDefaultCategories();
  } catch (error) {
    console.error("Failed to seed default categories:", error.message);
  }
  client.initialize();
}

bootstrap();
