import Link from "next/link";
import { Train, Video, Calendar, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    icon: Video,
    title: "動画を作成",
    description:
      "3つのテンプレートを組み合わせて、あなただけのオリジナル動画を作成。",
  },
  {
    icon: Calendar,
    title: "投影日時を予約",
    description: "ご希望の日時を選んで、投影予約を確定。決済はオンラインで完結。",
  },
  {
    icon: Sparkles,
    title: "投影を体験",
    description:
      "水間鉄道の車両にあなたの動画が投影される、特別な瞬間をお楽しみください。",
  },
];

const plans = [
  {
    name: "無料プラン",
    price: "0",
    description: "まずは動画作成を体験",
    features: [
      "動画作成（透かし入り）",
      "プレビュー機能",
      "7日間の動画保持",
    ],
    cta: "無料で始める",
    ctaVariant: "outline" as const,
    href: "/create",
  },
  {
    name: "投影プラン",
    price: "5,000",
    description: "実際に投影を体験",
    features: [
      "高品質動画（透かしなし）",
      "投影予約",
      "投影後1年間の動画保持",
      "現地での投影体験",
    ],
    cta: "動画を作成して予約",
    ctaVariant: "default" as const,
    href: "/create",
    popular: true,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/50 py-20 sm:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-ring/10 hover:ring-ring/20">
                水間鉄道 × プロジェクションマッピング
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              あなたの動画を
              <br />
              <span className="text-primary">電車に投影</span>しよう
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              水間鉄道の夜間停車車両に、あなたが作成した動画を
              プロジェクションマッピングで投影する、新しい体験。
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" asChild>
                <Link href="/create">
                  <Train className="mr-2 h-5 w-5" />
                  今すぐ始める
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#how-it-works">詳しく見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              HOW IT WORKS
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              3ステップで簡単に始められます
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold md:left-1/2 md:-translate-x-1/2 md:top-0 md:right-auto">
                      {index + 1}
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-20 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              PLANS
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              あなたに合ったプランをお選びください
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular ? "border-primary shadow-lg" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      おすすめ
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">¥{plan.price}</span>
                    {plan.price !== "0" && (
                      <span className="text-muted-foreground">/回</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-8 w-full"
                    variant={plan.ctaVariant}
                    asChild
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              特別な体験を、今すぐ始めよう
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              あなたの動画が水間鉄道の車両に投影される、
              <br />
              忘れられない瞬間を体験してください。
            </p>
            <div className="mt-10">
              <Button size="lg" asChild>
                <Link href="/create">
                  <Train className="mr-2 h-5 w-5" />
                  今すぐ始める
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
