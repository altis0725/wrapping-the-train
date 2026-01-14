import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | WRAPPING THE TRAIN",
};

export default function LawPage() {
  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
          特定商取引法に基づく表記
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top w-1/3">
                  販売業者
                </th>
                <td className="py-4 text-slate-300">
                  水間鉄道株式会社
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  運営統括責任者
                </th>
                <td className="py-4 text-slate-300">
                  代表取締役 [氏名]
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  所在地
                </th>
                <td className="py-4 text-slate-300">
                  〒597-0105
                  <br />
                  大阪府貝塚市三ツ松2296-1
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  電話番号
                </th>
                <td className="py-4 text-slate-300">
                  072-446-1006
                  <br />
                  <span className="text-sm">
                    ※お問い合わせはフォームよりお願いいたします
                  </span>
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  メールアドレス
                </th>
                <td className="py-4 text-slate-300">
                  info@wrapping-the-train.jp
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  サービス名
                </th>
                <td className="py-4 text-slate-300">
                  WRAPPING THE TRAIN
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  サービス内容
                </th>
                <td className="py-4 text-slate-300">
                  プロジェクションマッピング投影サービス
                  <br />
                  ・動画作成機能
                  <br />
                  ・投影予約機能
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  販売価格
                </th>
                <td className="py-4 text-slate-300">
                  投影サービス: 5,000円（税込）/回
                  <br />
                  <span className="text-sm">
                    ※動画作成のみは無料でご利用いただけます
                  </span>
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  支払方法
                </th>
                <td className="py-4 text-slate-300">
                  クレジットカード決済（Stripe）
                  <br />
                  <span className="text-sm">
                    対応カード: Visa, Mastercard, American Express, JCB
                  </span>
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  支払時期
                </th>
                <td className="py-4 text-slate-300">
                  予約確定時に即時決済
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  サービス提供時期
                </th>
                <td className="py-4 text-slate-300">
                  予約された投影日時
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  キャンセル・返金
                </th>
                <td className="py-4 text-slate-300">
                  投影開始時刻の48時間前まで: 全額返金
                  <br />
                  投影開始時刻の48時間以内: 返金不可
                  <br />
                  <span className="text-sm">
                    ※天候等やむを得ない事情による中止の場合は、
                    代替日程の提供または全額返金
                  </span>
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  動作環境
                </th>
                <td className="py-4 text-slate-300">
                  インターネット接続環境
                  <br />
                  推奨ブラウザ: Chrome, Safari, Firefox, Edge（最新版）
                </td>
              </tr>

              <tr className="border-b">
                <th className="py-4 pr-4 text-left font-semibold align-top">
                  その他費用
                </th>
                <td className="py-4 text-slate-300">
                  インターネット接続料金、現地までの交通費等は
                  お客様のご負担となります。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
