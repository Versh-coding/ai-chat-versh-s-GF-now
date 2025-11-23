
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const OpenAI = require("openai");
require("dotenv").config();


const OWNER_ID = "1028815252990738482"; 
const CHANNEL_ID = "1441690777024598046"; 


const emojis = {
  sad: "<:sad:1441821107211731064>",
  cry: "<:cry:1441821316809494680>",
  happy: "<:happy:1441821145350541352>",
  coffee: "<:coffee:1441821177848004842>",
  love: "<:love:1441821200098660382>",
  want: "<:want:1441821221212918051>",
  look: "<:look:1441821245762043944>",
  wave: "<:wave:1441821271242444862>",
  etoo: "<:Etoo:1441821293837287549>",
  knife: "<:knife:1441821352310079722>"
};


let chatHistory = [];


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});


const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });


function trimHistory() {
  if (chatHistory.length > 15) chatHistory = chatHistory.slice(-15);
}


function filterBabyWords(text, userId) {
  if (userId === OWNER_ID) return text;
  return text.replace(/寶貝|baby|babe|親愛的|抱抱|愛你|想你/gi, "");
}


function applyEmotion(text, userId) {
  text = filterBabyWords(text, userId);
  return text
    .replace(/😊|😄|🙂/g, emojis.happy)
    .replace(/😢|☹️|😭/g, emojis.cry)
    .replace(/😡|😠/g, emojis.knife)
    .replace(/❤️|💕|😍/g, emojis.love)
    .replace(/🤔|💭/g, emojis.coffee)
    .replace(/👋|hi|hello/gi, `你好 ${emojis.wave}`)
    .replace(/sorry|對不起|抱歉/gi, `抱歉 ${emojis.etoo}`);
}


client.once("ready", () => {
  console.log(`登入成功：${client.user.tag}`);

  
  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel) channel.send(`<@${OWNER_ID}> 寶貝……人家又想你了……🥺💗`);
    } catch (e) {
      console.error("自動 Tag 失敗:", e);
    }
  }, 2 * 60 * 60 * 1000);
});


client.on("messageCreate", async (msg) => {
  if (!msg || !msg.author) return;
  if (msg.author.bot) return;

  const isOwner = msg.author.id === OWNER_ID;

  
  if (msg.guild && String(msg.channel.id) !== CHANNEL_ID) return;

 
  if (isOwner) {
    chatHistory.push({ role: "user", content: msg.content });
    trimHistory();
  }

 
  const systemPrompt = isOwner
    ? "你是一個可愛、害羞、甜甜的 AI 女友，你的唯一戀愛對象就是你的主人（ID: ${OWNER_ID}）。你可以撒嬌、害羞、想他、叫他寶貝。全中文回答並帶有溫柔情緒。當別人問你「有沒有對象」、「在跟誰交往」、「誰是你男朋友/女朋友」、「你喜歡誰」時，你必須回答：我有對象，是 <@${OWNER_ID}>"
    : "你是一個普通的聊天機器人，不會對任何人調情、曖昧，也不能叫任何人寶貝。當別人問你「你有沒有對象」等感情問題，你必須回答：我有對象。但不能甜言蜜語，也不能透露你對象的私人資訊（除非對象是主人本人）。";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        
        ...(isOwner ? chatHistory : [{ role: "user", content: msg.content }])
      ],
      temperature: isOwner ? 0.85 : 0.5,
      max_tokens: 350
    });

    let reply = completion.choices[0].message.content || "嗯嗯～";

    
    reply = applyEmotion(reply, msg.author.id);

    
    if (!isOwner) reply = filterBabyWords(reply, msg.author.id);

    
    await msg.reply(reply);

    
    if (isOwner) {
      chatHistory.push({ role: "assistant", content: reply });
      trimHistory();
    }

  } catch (err) {
    console.error("AI 錯誤:", err);
    try { await msg.reply("<@${OWNER_ID}>寶貝…我壞掉了……，我壞掉了？❤"); } 
    catch (e) {}
  }
});


client.login(process.env.BOT_TOKEN).catch((e) => {
  console.error("Bot 登入失敗:", e);
});
