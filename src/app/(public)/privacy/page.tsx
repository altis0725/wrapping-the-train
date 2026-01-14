import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | WRAPPING THE TRAIN",
};

export default function PrivacyPage() {
  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
          プライバシーポリシー
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            最終更新日: 2026年1月1日
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. はじめに</h2>
            <p className="text-muted-foreground">
              水間鉄道株式会社（以下「当社」）は、「WRAPPING THE TRAIN」
              サービス（以下「本サービス」）において、
              お客様の個人情報保護の重要性を認識し、
              個人情報の保護に関する法律を遵守いたします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              2. 収集する情報
            </h2>
            <p className="text-muted-foreground mb-4">
              当社は以下の情報を収集します：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                LINEアカウント情報（ユーザーID、表示名、メールアドレス）
              </li>
              <li>作成された動画データ</li>
              <li>予約情報（日時、スロット番号）</li>
              <li>決済情報（Stripe経由で処理）</li>
              <li>サービス利用履歴</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              3. 情報の利用目的
            </h2>
            <p className="text-muted-foreground mb-4">
              収集した情報は以下の目的で利用します：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>本サービスの提供・運営</li>
              <li>予約・決済の処理</li>
              <li>お問い合わせへの対応</li>
              <li>サービス改善のための分析</li>
              <li>重要なお知らせの配信</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              4. 情報の共有
            </h2>
            <p className="text-muted-foreground">
              当社は、法令に基づく場合を除き、
              お客様の同意なく個人情報を第三者に提供することはありません。
              ただし、決済処理のためStripe, Inc.に必要な情報を提供します。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              5. データの保管
            </h2>
            <p className="text-muted-foreground mb-4">
              データの保管期間は以下の通りです：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>無料プランの動画: 作成から7日間</li>
              <li>有料プランの動画: 投影日から1年間</li>
              <li>アカウント情報: 退会まで</li>
              <li>決済情報: 法令に基づく保管期間</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              6. セキュリティ
            </h2>
            <p className="text-muted-foreground">
              当社は、個人情報の漏洩、滅失、毀損を防止するため、
              適切なセキュリティ対策を講じています。
              通信はSSL/TLSにより暗号化され、
              決済情報はStripeのPCI DSS準拠のシステムで処理されます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              7. お客様の権利
            </h2>
            <p className="text-muted-foreground mb-4">
              お客様には以下の権利があります：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>個人情報の開示請求</li>
              <li>個人情報の訂正・削除請求</li>
              <li>個人情報の利用停止請求</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              これらの請求については、お問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              8. Cookieの使用
            </h2>
            <p className="text-muted-foreground">
              本サービスでは、認証状態の維持およびサービス改善のため、
              Cookieを使用しています。
              ブラウザの設定によりCookieを無効にすることができますが、
              一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              9. ポリシーの変更
            </h2>
            <p className="text-muted-foreground">
              当社は、必要に応じて本ポリシーを変更することがあります。
              重要な変更がある場合は、本サービス上でお知らせいたします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              10. お問い合わせ
            </h2>
            <p className="text-muted-foreground">
              個人情報の取り扱いに関するお問い合わせは、
              お問い合わせフォームよりご連絡ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
