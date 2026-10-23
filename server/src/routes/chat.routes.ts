import { Router, Request, Response, NextFunction } from "express";
import { ChatService } from "../services/chat.service.js";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../lib/db.js";
import { hashPassword } from "../lib/auth-crypto.js";

const router = Router();

// Semua rute chat memerlukan login
router.use(requireAuth);

// Ambil daftar percakapan aktif milik user
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const conversations = await ChatService.listUserConversations(user.userId);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Mulai percakapan baru atau buka yang sudah ada dengan targetUserId (K5)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      res.status(400).json({ error: "targetUserId wajib disertakan" });
      return;
    }

    const conversation = await ChatService.getOrCreateConversation(user.userId, targetUserId);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// Mulai percakapan langsung dengan Mitra Grosir / Supplier berdasarkan businessId
router.post("/start-with-business/:businessId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const businessId = req.params.businessId as string;

    const business = await db.business.findUnique({
      where: { id: businessId },
      include: { user: true },
    });

    if (!business) {
      res.status(404).json({ error: "Mitra / Bisnis tidak ditemukan" });
      return;
    }

    let partnerUserId = business.userId;

    // Jika mitra belum punya akun User, buatkan akun User khusus mitra
    if (!partnerUserId) {
      const sanitizedUsername = `mitra_${business.id.slice(0, 8)}`;
      let partnerUser = await db.user.findUnique({ where: { username: sanitizedUsername } });
      if (!partnerUser) {
        partnerUser = await db.user.create({
          data: {
            username: sanitizedUsername,
            name: business.name,
            passwordHash: await hashPassword("mitra12345"),
            role: "STAF",
            isActive: true,
          },
        });
      }
      await db.business.update({
        where: { id: business.id },
        data: { userId: partnerUser.id },
      });
      partnerUserId = partnerUser.id;
    }

    const conversation = await ChatService.getOrCreateConversation(user.userId, partnerUserId);

    // Cek apakah percakapan baru memiliki pesan, jika belum ada kirim salam otomatis
    const messageCount = await db.message.count({ where: { conversationId: conversation.id } });
    if (messageCount === 0) {
      const initialGreeting = `Halo! Kami dari ${business.name}. Terima kasih sudah menghubungi kami melalui Warung Madura. Kami siap melayani pemesanan sembako, beras, atau barang grosir kebutuhan warung Anda. Silakan sampaikan barang yang ingin dipesan!`;
      const clientMessageId = `auto-welcome-${Date.now()}`;
      await ChatService.sendMessage(conversation.id, partnerUserId, clientMessageId, initialGreeting);
    }

    // Ambil detail percakapan lengkap
    const fullConv = await db.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, role: true } },
          },
        },
        messages: {
          take: 20,
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    res.json(fullConv);
  } catch (err) {
    next(err);
  }
});

// Ambil pesan dari suatu percakapan (K8, K9)
router.get("/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const conversationId = req.params.id as string;
    const afterSeqId = req.query.after ? parseInt(req.query.after as string, 10) : undefined;

    const messages = await ChatService.getMessages(conversationId, user.userId, afterSeqId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// Kirim pesan lewat REST (K6, K7, K8)
router.post("/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const conversationId = req.params.id as string;
    const { clientMessageId, body } = req.body;

    if (!clientMessageId || !body?.trim()) {
      res.status(400).json({ error: "clientMessageId dan body wajib diisi" });
      return;
    }

    const message = await ChatService.sendMessage(
      conversationId,
      user.userId,
      clientMessageId,
      body.trim()
    );

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

export default router;
