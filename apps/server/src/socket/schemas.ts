import { z } from 'zod';

export const NicknameSchema = z
  .string()
  .trim()
  .min(2, 'Nickname must be at least 2 characters')
  .max(16, 'Nickname must not exceed 16 characters')
  .regex(/^[a-zA-Z0-9 _-]+$/, 'Nickname can only contain alphanumeric characters, spaces, underscores, and dashes');

export const RoomCodeSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().length(6, 'Room code must be exactly 6 characters').regex(/^[A-Z0-9]{6}$/, 'Room code must be 6 alphanumeric characters'));

export const TierIdSchema = z.enum(['STREET', 'BISTRO', 'CHEFS_TABLE']);

export const BotDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const CreateRoomPayloadSchema = z.object({
  nickname: NicknameSchema,
  tier: TierIdSchema,
});

export const CreateBotRoomPayloadSchema = z.object({
  nickname: NicknameSchema,
  tier: TierIdSchema,
  difficulty: BotDifficultySchema,
});

export const JoinRoomPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  nickname: NicknameSchema,
});

export const ReconnectPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: z.string().min(1),
  reconnectToken: z.string().min(1),
});

export const SelectTierPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  tier: TierIdSchema,
});

export const ReadyPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  ready: z.boolean(),
});

export const LockBidPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  roundIndex: z.number().int().min(0).max(10),
  ingredientId: z.string().min(1),
  amount: z.number().int().min(0),
  idempotencyKey: z.string().min(1),
});

export const RematchPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
});

export const NewTierPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  tier: TierIdSchema,
});

export const QueueJoinPayloadSchema = z.object({
  nickname: NicknameSchema,
  tier: TierIdSchema,
});

export const QueueLeavePayloadSchema = z.object({
  ticketId: z.string().min(1),
});

export const TelemetryPayloadSchema = z.object({
  event: z.enum(['TUTORIAL_COMPLETE', 'FIRST_BID_LOCKED', 'SHARE_CLICKED', 'REMATCH_CLICKED']),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
