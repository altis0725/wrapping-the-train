import type { Metadata } from "next";
import { MessageCircle, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "お問い合わせ | WRAPPING THE TRAIN",
};

export default function ContactPage() {
  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            お問い合わせ
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            ご質問やご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>

        <div className="space-y-6">
          {/* LINE お問い合わせ */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-xl">LINE公式アカウント</CardTitle>
              <CardDescription>
                LINEでのお問い合わせが最も早く対応可能です
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild size="lg" className="bg-green-500 hover:bg-green-600">
                <a
                  href="https://lin.ee/QgS5XWv"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  LINEでお問い合わせ
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* その他の連絡先 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <Phone className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">電話</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  072-422-4567
                  <br />
                  <span className="text-xs">平日 9:00-17:00</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <MapPin className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">所在地</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  〒597-0001
                  <br />
                  大阪府貝塚市近木町2-2
                  <br />
                  水間鉄道株式会社
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
