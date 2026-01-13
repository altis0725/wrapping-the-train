import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const returnTo = params.returnTo ?? "/mypage";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ログイン</h1>
          <p className="mt-2 text-muted-foreground">
            WRAPPING THE TRAIN へようこそ
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error === "invalid_state" && "セッションが無効です。もう一度お試しください。"}
            {error === "auth_failed" && "認証に失敗しました。もう一度お試しください。"}
            {error === "access_denied" && "アクセスが拒否されました。"}
            {!["invalid_state", "auth_failed", "access_denied"].includes(error) &&
              "エラーが発生しました。"}
          </div>
        )}

        <div className="space-y-4">
          <a
            href={`/api/auth/line?returnTo=${encodeURIComponent(returnTo)}`}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#00B900] text-white rounded-lg hover:bg-[#00A000] transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </a>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            ログインすることで、
            <Link href="/terms" className="underline hover:text-foreground">
              利用規約
            </Link>
            と
            <Link href="/privacy" className="underline hover:text-foreground">
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。
          </p>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
