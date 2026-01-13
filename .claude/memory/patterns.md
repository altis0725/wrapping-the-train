# 再利用パターン (patterns.md)

プロジェクトで確立したコードパターン・ベストプラクティス。

## 形式

```
### パターン名
**用途**: いつ使うか
**コード例**:
```

---

## Next.js パターン

### RSC + Client Component 分離

**用途**: データ取得を伴うページ

```tsx
// src/app/(public)/example/page.tsx (Server Component)
import "server-only";
import { db } from "@/db";
import { ExampleContent } from "@/components/example/example-content";

export default async function ExamplePage() {
  const data = await db.query.examples.findMany();
  return <ExampleContent data={data} />;
}

// src/components/example/example-content.tsx (Client Component)
"use client";

interface ExampleContentProps {
  data: Example[];
}

export function ExampleContent({ data }: ExampleContentProps) {
  // インタラクティブな UI ロジック
}
```

---

## Supabase パターン

### Server Actions での DB 操作

**用途**: フォーム送信、データ更新

```tsx
// src/actions/example.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createExample(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // DB 操作
  await db.insert(examples).values({ ... });

  revalidatePath("/examples");
}
```

---

## Drizzle パターン

### スキーマ定義

**用途**: テーブル定義

```ts
// src/db/schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const examples = pgTable("examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

## Zod パターン

### フォームバリデーション

**用途**: 入力値検証

```ts
// src/lib/validations/example.ts
import { z } from "zod";

export const createExampleSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(100),
  description: z.string().max(500).optional(),
});

export type CreateExampleInput = z.infer<typeof createExampleSchema>;
```
