import { z } from "zod";

/**
 * 前后端共用 zod schema —— technical.md §5 / §7 / FR 交叉引用。
 * 客户端 react-hook-form 与服务端 Route Handler 都从这里 import，确保约束一致。
 */

// ---------- 通用 ----------

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少 3 个字符")
  .max(32, "用户名最多 32 个字符")
  .regex(/^[a-zA-Z0-9_.-]+$/u, "仅允许字母 / 数字 / 下划线 / 点 / 连字符");

export const passwordSchema = z.string().min(8, "密码至少 8 个字符").max(256);

// ---------- 初始化 ----------

export const setupSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });
export type SetupInput = z.infer<typeof setupSchema>;

// ---------- 认证 ----------

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  // 默认值由调用方（表单 defaultValues / 服务端解析兜底）给出，避免 zod
  // 的 `.default()` 把 input 类型变 optional 而与 react-hook-form 不兼容
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * 改密 schema —— 只做"两次输入一致"的校验。
 * "新旧密码不能相同"由服务端判等后抛 CONFLICT（technical.md §5），
 * 不在 schema 里 refine，避免误走 VALIDATION 路径。前端若想提前提示，
 * 可在表单层自己比对。
 */
export const changePasswordSchema = z
  .object({
    oldPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forceResetSchema = changePasswordSchema;
export type ForceResetInput = z.infer<typeof forceResetSchema>;

// ---------- 剪贴板 ----------

export const clipboardCreateSchema = z.object({
  text: z.string().max(1_000_000).default(""),
});
export type ClipboardCreateInput = z.infer<typeof clipboardCreateSchema>;

/** PATCH 三选一子动作 —— FR-013 / FR-021 / FR-022；strict() 保证互斥 */
export const clipboardPatchSchema = z.union([
  z.strictObject({ text: z.string().max(1_000_000) }),
  z.strictObject({ pinned: z.boolean() }),
  z.strictObject({ clear: z.literal(true) }),
]);
export type ClipboardPatchInput = z.infer<typeof clipboardPatchSchema>;

// ---------- 管理员 ----------

export const adminCreateUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminResetPasswordSchema = z.object({
  password: passwordSchema,
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

/** FR-054 附件大小上限（MB），1–1024 */
export const attachmentLimitFormSchema = z.object({
  max_attachment_mb: z.number().int().min(1).max(1024),
});
export type AttachmentLimitFormInput = z.infer<typeof attachmentLimitFormSchema>;

/** FR-055 公开访问基址（CR-004）：空串 = 未设置；非空必须 http(s):// 开头且不以 / 结尾 */
export const publicBaseUrlSchema = z
  .string()
  .max(512, "不能超过 512 字符")
  .refine(
    (v) => v === "" || /^https?:\/\/.+[^/]$/.test(v),
    "必须以 http:// 或 https:// 开头，且不含末尾 /",
  );

export const publicBaseUrlFormSchema = z.object({
  public_base_url: publicBaseUrlSchema,
});
export type PublicBaseUrlFormInput = z.infer<typeof publicBaseUrlFormSchema>;

/** PATCH /api/admin/config：两者可选但至少一项；前端按卡独立提交，各自只带一个字段 */
export const adminConfigPatchSchema = z
  .object({
    max_attachment_mb: z.number().int().min(1).max(1024).optional(),
    public_base_url: publicBaseUrlSchema.optional(),
  })
  .refine(
    (v) =>
      v.max_attachment_mb !== undefined || v.public_base_url !== undefined,
    { message: "至少需要提供一个字段" },
  );
export type AdminConfigPatchInput = z.infer<typeof adminConfigPatchSchema>;
