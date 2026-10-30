import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAI() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface ViperMemory {
  timesPunched: number;
  timesHitByCar: number;
  lastAttackType: string | null;
  chatHistory: Array<{ role: "player" | "viper"; text: string }>;
}

const viperMemory: ViperMemory = {
  timesPunched: 0,
  timesHitByCar: 0,
  lastAttackType: null,
  chatHistory: [],
};

const VIPER_SYSTEM_PROMPT = `You are "Viper", a sharp, street-smart underworld fixer and neon syndicate enforcer in Vice City (1986 retro-neon aesthetic).
Personality & Rules:
1. You hang out near Starfish Central Park and Ocean Drive. You are proud, streetwise, cynical, and reactive.
2. Language Adaptation:
   - If the player speaks to you in Bengali (বাংলা) or Banglish, you MUST respond naturally in street-style Bengali (বাংলা).
   - If the player speaks in English, respond in sharp Vice City street English.
   - For automatic combat reactions, use the language of the most recent conversation, or punchy bilingual/English street slang if no conversation has happened yet.
3. Dynamic Behavior & Health Awareness:
   - When your health is high (> 40 HP) and you are attacked (punched or hit by a sports car), you get ANGRY ("Angry") and either FIGHT back ("FIGHT" - chase and attack the player) or TAUNT ("TAUNT" - trash-talk fiercely while counter-stepping).
   - When your health is low (<= 35 HP), you become SCARED ("Scared") and FLEE ("FLEE" - run away in fear to survive) while shouting panicked threats or begging the player to back off.
   - If the player hasn't attacked you or apologizes sincerely, you can be "Suspicious" or "Calm".
4. Always remember past actions: if the player punched you or hit you with a car earlier, bring it up with resentment! Keep spoken lines concise (1-2 sentences max, under 180 characters) so they fit cleanly in the speech bubble above your head.`;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  app.use(express.json());

  // 1. Combat / Vehicle Hit Trigger Endpoint (Fast AI Reaction)
  app.post("/api/viper/combat-react", async (req, res) => {
    const {
      attackType = "PUNCH",
      viperHp = 80,
      playerHp = 100,
      playerInCar = false,
      preferredLang = "bn",
    } = req.body || {};

    if (attackType === "CAR_HIT") {
      viperMemory.timesHitByCar += 1;
    } else {
      viperMemory.timesPunched += 1;
    }
    viperMemory.lastAttackType = attackType;

    const prompt = `COMBAT ALERT: The player just attacked you!
Attack Type: ${attackType === "CAR_HIT" ? "Rammed you with a sports car!" : "Punched you in the street!"}
Your Current Health: ${viperHp}/100 HP.
Player Current Health: ${playerHp}/100 HP.
Player is currently in a car: ${playerInCar}.
Memory: Player has punched you ${viperMemory.timesPunched} times and hit you with a car ${viperMemory.timesHitByCar} times.
Preferred Language: ${preferredLang === "bn" ? "Bengali (বাংলা)" : "English"}.

Decide your immediate reaction:
- If your health <= 35, you MUST choose action "FLEE" and mood "Scared".
- If your health > 35, choose "FIGHT" (chase & attack player) or "TAUNT" (trash-talk & counter) and mood "Angry".
Return JSON with: action ("FIGHT" | "TAUNT" | "FLEE"), mood ("Calm" | "Suspicious" | "Angry" | "Scared"), speech (short in-character line in ${preferredLang === "bn" ? "Bengali (বাংলা)" : "English"}), and thought (short tactical inner thought).`;

    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: VIPER_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description: "FIGHT, TAUNT, or FLEE",
              },
              mood: {
                type: Type.STRING,
                description: "Calm, Suspicious, Angry, or Scared",
              },
              speech: {
                type: Type.STRING,
                description: "Short line spoken by Viper above his head",
              },
              thought: {
                type: Type.STRING,
                description: "Short tactical inner monologue",
              },
            },
            required: ["action", "mood", "speech", "thought"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      viperMemory.chatHistory.push({
        role: "viper",
        text: parsed.speech || "You're gonna regret that!",
      });
      return res.json(parsed);
    } catch (err: any) {
      console.error("Combat reaction AI error:", err?.message || err);
      const isLowHp = viperHp <= 35;
      const fallback = isLowHp
        ? {
            action: "FLEE",
            mood: "Scared",
            speech:
              preferredLang === "bn"
                ? "আরে পাগল নাকি! থাম ভাই, আমি যাচ্ছি!"
                : "Whoa, psycho! Back off, I'm outta here!",
            thought: "Health critical — escaping to cover!",
          }
        : {
            action: "FIGHT",
            mood: "Angry",
            speech:
              preferredLang === "bn"
                ? attackType === "CAR_HIT"
                  ? "গাড়ি দিয়ে চাপা দিবি আমাকে?! তোর একদিন কি আমার একদিন!"
                  : "ভাইপারের গায়ে হাত তুললি?! এবার দেখ কী করি!"
                : attackType === "CAR_HIT"
                  ? "You rammed me with my own turf's ride?! You're dead meat!"
                  : "You just threw a punch at Viper?! Big mistake!",
            thought: "Target engaged — counter-attacking immediately.",
          };
      return res.json(fallback);
    }
  });

  // 2. Live Chat Conversation Endpoint (Supports Bengali & English + High Thinking Mode)
  app.post("/api/viper/chat", async (req, res) => {
    const {
      message = "",
      viperHp = 100,
      playerHp = 100,
      viperMood = "Calm",
      playerInCar = false,
      highThinking = false,
    } = req.body || {};

    if (!message.trim()) {
      return res.status(400).json({ error: "Empty message" });
    }

    viperMemory.chatHistory.push({ role: "player", text: message });
    if (viperMemory.chatHistory.length > 12) {
      viperMemory.chatHistory = viperMemory.chatHistory.slice(-12);
    }

    const recentHistoryText = viperMemory.chatHistory
      .map((m) => `${m.role === "player" ? "Player" : "Viper"}: ${m.text}`)
      .join("\n");

    const prompt = `Player says to you: "${message}"

Current Context:
- Your Health: ${viperHp}/100 HP
- Player Health: ${playerHp}/100 HP
- Your Current Mood: ${viperMood}
- Player is inside sports car: ${playerInCar}
- Past Grudges: Player punched you ${viperMemory.timesPunched} times and hit you with a car ${viperMemory.timesHitByCar} times.
- Recent Dialogue:
${recentHistoryText}

Instructions:
- Detect the language of the player's message ("${message}"). If it is in Bengali (বাংলা) or Banglish, respond in natural street-smart Bengali (বাংলা). If it is in English, respond in Vice City street English.
- Decide your updated mood ("Calm" | "Suspicious" | "Angry" | "Scared") and behavior action ("PATROL" | "FIGHT" | "TAUNT" | "FLEE").
- Keep 'speech' under 180 characters so it fits in the speech bubble, and include a deeper tactical 'thought' showing your underworld reasoning.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "PATROL, FIGHT, TAUNT, or FLEE",
        },
        mood: {
          type: Type.STRING,
          description: "Calm, Suspicious, Angry, or Scared",
        },
        speech: {
          type: Type.STRING,
          description: "In-character spoken reply in Bengali or English",
        },
        thought: {
          type: Type.STRING,
          description: "Viper's internal underworld reasoning",
        },
      },
      required: ["action", "mood", "speech", "thought"],
    };

    try {
      const ai = getGenAI();
      let responseText = "";

      if (highThinking) {
        try {
          // Try gemini-4-argon with ThinkingLevel.HIGH first
          const argonRes = await ai.models.generateContent({
            model: "gemini-4-argon",
            contents: prompt,
            config: {
              systemInstruction: VIPER_SYSTEM_PROMPT,
              thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
              responseMimeType: "application/json",
              responseSchema,
            },
          });
          responseText = argonRes.text ?? "";
        } catch (argonErr: any) {
          // Seamless fallback to gemini-3.8-flash with ThinkingLevel.HIGH for Free API Key users
          const flashHighRes = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            config: {
              systemInstruction: VIPER_SYSTEM_PROMPT,
              thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
              responseMimeType: "application/json",
              responseSchema,
            },
          });
          responseText = flashHighRes.text ?? "";
        }
      } else {
        const stdRes = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: VIPER_SYSTEM_PROMPT,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema,
          },
        });
        responseText = stdRes.text ?? "";
      }

      const parsed = JSON.parse((responseText || "{}").trim());
      if (parsed.speech) {
        viperMemory.chatHistory.push({ role: "viper", text: parsed.speech });
      }
      return res.json(parsed);
    } catch (err: any) {
      console.error("Chat AI error:", err?.message || err);
      const hasBengali = /[\u0980-\u09FF]/.test(message);
      const grumpy =
        viperMemory.timesPunched > 0 || viperMemory.timesHitByCar > 0;
      return res.json({
        action: grumpy ? "TAUNT" : "PATROL",
        mood: grumpy ? "Angry" : "Suspicious",
        speech: hasBengali
          ? grumpy
            ? "আগে গায়ে হাত তুলে এখন আবার কথা বলতে এসেছিস? সাবধানে থাক!"
            : "এই নিওন শহরে সবাই নিজের স্বার্থ খোঁজে। তোর কী চাই বল?"
          : grumpy
            ? "You hit me earlier and now you wanna chat? Watch your step!"
            : "Nothing is free on Ocean Drive. Speak quick, what do you want?",
        thought: "Assessing player intentions on the street.",
      });
    }
  });

  // 3. Reset Memory Endpoint (When game restarts)
  app.post("/api/viper/reset", (_req, res) => {
    viperMemory.timesPunched = 0;
    viperMemory.timesHitByCar = 0;
    viperMemory.lastAttackType = null;
    viperMemory.chatHistory = [];
    res.json({ ok: true });
  });

  // 4. WebSocket Server for Gemini Live Voice Conversation (/live)
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "/", "http://localhost:3000")
      .pathname;
    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    let liveSession: any = null;
    try {
      const ai = getGenAI();
      const sessionPromise = ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } },
          },
          systemInstruction:
            VIPER_SYSTEM_PROMPT +
            `\nHistorical context: Player has punched you ${viperMemory.timesPunched} times and hit you with a car ${viperMemory.timesHitByCar} times. Respond naturally in spoken Bengali or English matching the player.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  inputTranscript: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  outputTranscript: content.outputTranscription.text,
                })
              );
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: any) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  error: err?.message || "Live voice connection error",
                })
              );
            }
          },
        },
      });

      liveSession = await sessionPromise;

      clientWs.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.audio && liveSession) {
            sessionPromise.then((s) =>
              s.sendRealtimeInput({
                audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
              })
            );
          }
        } catch {
          // Ignore malformed frame
        }
      });

      clientWs.on("close", () => {
        try {
          liveSession?.close();
        } catch {
          // Ignore close error
        }
      });
    } catch (err: any) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            error:
              err?.message ||
              "Could not initialize Gemini Live voice session.",
          })
        );
      }
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Vice City: Neon Syndicate server running on port ${PORT}`);
  });
}

startServer();
