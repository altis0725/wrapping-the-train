import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | WRAPPING THE TRAIN",
};

export default function TermsPage() {
  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
          利用規約
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            最終更新日: 2026年1月1日
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">第1条（適用）</h2>
            <p className="text-muted-foreground">
              本規約は、水間鉄道株式会社（以下「当社」）が提供する「WRAPPING THE
              TRAIN」サービス（以下「本サービス」）の利用条件を定めるものです。
              ユーザーは本規約に同意の上、本サービスをご利用ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">第2条（定義）</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                「ユーザー」とは、本サービスを利用する全ての方を指します。
              </li>
              <li>
                「コンテンツ」とは、ユーザーが本サービスを通じて作成した動画を指します。
              </li>
              <li>
                「投影」とは、当社が管理する車両にコンテンツを投影することを指します。
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">第3条（利用登録）</h2>
            <p className="text-muted-foreground">
              本サービスの利用にはLINEアカウントによるログインが必要です。
              ユーザーは正確な情報を提供し、常に最新の状態を維持する責任を負います。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              第4条（サービス内容）
            </h2>
            <p className="text-muted-foreground mb-4">
              本サービスでは以下の機能を提供します：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>動画作成機能</li>
              <li>投影予約機能</li>
              <li>決済機能</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">第5条（料金・決済）</h2>
            <p className="text-muted-foreground">
              投影サービスの利用には、1回あたり5,000円（税込）の料金が発生します。
              決済はStripeを通じて行われ、予約確定時に請求されます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              第6条（キャンセル・返金）
            </h2>
            <p className="text-muted-foreground">
              予約のキャンセルは投影開始時刻の48時間前まで可能です。
              期限内のキャンセルについては全額返金いたします。
              期限を過ぎたキャンセルについては返金いたしかねます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">第7条（禁止事項）</h2>
            <p className="text-muted-foreground mb-4">
              ユーザーは以下の行為を行ってはなりません：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>法令または公序良俗に違反する内容の投影</li>
              <li>第三者の権利を侵害するコンテンツの作成</li>
              <li>不正アクセス、システムへの攻撃</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">第8条（免責事項）</h2>
            <p className="text-muted-foreground">
              当社は、天候、機材トラブル等のやむを得ない事情により
              投影が中止となった場合、代替日程の提供または返金にて対応いたします。
              その他の損害について、当社は責任を負いかねます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              第9条（規約の変更）
            </h2>
            <p className="text-muted-foreground">
              当社は、必要に応じて本規約を変更することがあります。
              変更後の規約は本サービス上に掲載した時点で効力を生じます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              第10条（準拠法・管轄）
            </h2>
            <p className="text-muted-foreground">
              本規約の解釈にあたっては日本法を準拠法とし、
              本サービスに関する紛争については大阪地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
