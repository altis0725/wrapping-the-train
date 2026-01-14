"use client";

import Link from "next/link";
import { Train, Video, Calendar, Sparkles, Check, ArrowRight, Layers, Smartphone, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    icon: Video, // Changed to match "SELECT" -> Video/Layers appropriate icon
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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center py-20 sm:py-32 overflow-hidden min-h-[80vh]">
        <motion.div
          className="mx-auto max-w-7xl px-6 lg:px-8 text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-6 inline-block">
            <span className="px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-sm md:text-base tracking-widest uppercase backdrop-blur-sm box-glow">
              Next Gen Projection Mapping
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-300 text-glow font-orbitron"
          >
            WRAPPING<br />THE TRAIN
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto tracking-wide leading-relaxed"
          >
            夜の水間鉄道を、あなたのキャンバスに。<br />
            世界に一つだけのデジタルアートトレインを創ろう。
          </motion.p>

          <motion.div variants={itemVariants} className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" className="h-16 px-10 text-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-none skew-x-[-10deg] shadow-[0_0_20px_rgba(6,182,212,0.4)] neon-button" asChild>
              <Link href="/create">
                <span className="skew-x-[10deg] flex items-center gap-2">
                  <Train className="mr-2 h-5 w-5" />
                  今すぐ始める
                </span>
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-10 text-xl font-bold border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 rounded-none skew-x-[-10deg] box-glow hover:text-cyan-300" asChild>
              <Link href="#how-it-works">
                <span className="skew-x-[10deg]">詳しく見る</span>
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <span className="text-xs text-slate-400 tracking-widest uppercase">Scroll</span>
          <div className="w-px h-16 bg-gradient-to-b from-cyan-500 to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-32 relative">
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900 to-transparent" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-glow font-orbitron">
              HOW IT WORKS
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              3ステップで簡単に始められます
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-900 to-transparent z-0" />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="relative z-10 flex flex-col items-center text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="w-24 h-24 rounded-2xl bg-[#0f172a] border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:border-cyan-400 transition-colors duration-300">
                  <step.icon className="h-10 w-10 text-cyan-400 group-hover:text-cyan-200 transition-colors duration-300" />
                </div>
                <div className="absolute -top-4 -right-4 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white text-sm font-bold shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                  {index + 1}
                </div>

                <h3 className="text-2xl font-bold mb-2 tracking-wider mt-4">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-20 sm:py-32 relative bg-[#020617]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-glow-purple font-orbitron">
              PLANS
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              あなたに合ったプランをお選びください
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Card
                  className={`relative h-full border-white/5 bg-black/40 backdrop-blur-md shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-2 ${plan.popular ? "border-purple-500/50 shadow-[0_0_20px_rgba(147,51,234,0.1)]" : "hover:border-white/20"
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 p-4">
                      <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]">
                        おすすめ
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className={`text-2xl font-bold mb-2 ${plan.popular ? "text-purple-300 text-glow-purple" : "text-slate-300"}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-slate-400">{plan.description}</CardDescription>
                    <div className="mt-6 mb-2">
                      <span className="text-4xl font-bold text-white">¥{plan.price}</span>
                      {plan.price !== "0" && (
                        <span className="text-slate-500 text-sm ml-1">/回</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4 mb-8 mt-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className={`p-1 rounded-full ${plan.popular ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-slate-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full h-12 text-lg font-bold transition-all duration-300 ${plan.popular
                          ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] border-none"
                          : "bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
                        }`}
                      asChild
                    >
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900 to-transparent" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-glow">
              特別な体験を、今すぐ始めよう
            </h2>
            <p className="mt-4 text-lg text-slate-400 mb-10">
              あなたの動画が水間鉄道の車両に投影される、
              <br />
              忘れられない瞬間を体験してください。
            </p>
            <Button size="lg" className="h-16 px-12 text-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-none skew-x-[-10deg] shadow-[0_0_20px_rgba(6,182,212,0.4)] neon-button" asChild>
              <Link href="/create">
                <span className="skew-x-[10deg] flex items-center gap-2">
                  <Train className="mr-2 h-5 w-5" />
                  今すぐ始める
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
