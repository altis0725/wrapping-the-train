"use client";

import { useState } from "react";
import { Send, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: 実際の送信処理を実装
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            お問い合わせ
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            ご質問やご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <Mail className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">メール</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  info@wrapping-the-train.jp
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <Phone className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">電話</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  072-446-1006
                  <br />
                  <span className="text-xs">
                    平日 9:00-17:00
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <MapPin className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">所在地</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  〒597-0105
                  <br />
                  大阪府貝塚市三ツ松2296-1
                  <br />
                  水間鉄道株式会社
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>お問い合わせフォーム</CardTitle>
                <CardDescription>
                  以下のフォームに必要事項をご記入ください。
                  通常2-3営業日以内にご返信いたします。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                      <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">
                      送信完了しました
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      お問い合わせいただきありがとうございます。
                      <br />
                      内容を確認の上、担当者よりご連絡いたします。
                    </p>
                    <Button
                      className="mt-6"
                      variant="outline"
                      onClick={() => setIsSubmitted(false)}
                    >
                      新しいお問い合わせ
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium mb-2"
                        >
                          お名前 <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="山田 太郎"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium mb-2"
                        >
                          メールアドレス{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="example@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium mb-2"
                      >
                        件名 <span className="text-destructive">*</span>
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">選択してください</option>
                        <option value="service">サービスについて</option>
                        <option value="reservation">予約について</option>
                        <option value="payment">決済について</option>
                        <option value="technical">技術的な問題</option>
                        <option value="other">その他</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium mb-2"
                      >
                        お問い合わせ内容{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        placeholder="お問い合わせ内容をご記入ください..."
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          送信中...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          送信する
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
