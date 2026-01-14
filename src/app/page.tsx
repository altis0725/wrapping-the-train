"use client";

import Link from "next/link";
import { Train, Video, Calendar, Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const steps = [
  {
    icon: Video,
    title: "SELECT TEMPLATE",
    subtitle: "動画を作成",
    description:
      "3つのテンプレートを組み合わせて、\nあなただけのオリジナル動画を作成。",
  },
  {
    icon: Calendar,
    title: "RESERVE",
    subtitle: "投影日時を予約",
    description: "ご希望の日時を選んで、投影予約を確定。\n決済はオンラインで完結。",
  },
  {
    icon: Sparkles,
    title: "EXPERIENCE",
    subtitle: "投影を体験",
    description:
      "水間鉄道の車両にあなたの動画が投影される、\n特別な瞬間をお楽しみください。",
  },
];

const plans = [
  {
    name: "FREE PLAN",
    subtitle: "無料プラン",
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
    name: "PROJECTION PLAN",
    subtitle: "投影プラン",
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
      <section className="relative flex items-center justify-center py-20 sm:py-24 lg:py-28 overflow-hidden min-h-[90vh]">
        {/* Decorative Circles */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-glow delay-1000" />

        <motion.div
          className="mx-auto max-w-7xl px-6 lg:px-8 text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-8 inline-block">
            <span className="px-6 py-2 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-sm md:text-base tracking-[0.2em] font-orbitron uppercase backdrop-blur-sm shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              Next Gen Projection Mapping
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-50 to-slate-400 text-glow font-orbitron leading-none"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="tracking-tighter">WRAPPING</span>
              <span className="tracking-tighter">THE TRAIN</span>
            </div>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto tracking-wide leading-relaxed font-light font-sans"
          >
            夜の水間鉄道を、あなたのキャンバスに。<br className="hidden md:block" />
            世界に一つだけのデジタルアートトレインを創ろう。
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-none skew-x-[-10deg] shadow-[0_0_20px_rgba(6,182,212,0.4)] neon-button group" asChild>
              <Link href="/create">
                <span className="skew-x-[10deg] flex items-center gap-3">
                  <Train className="h-5 w-5" />
                  動画作成をはじめる
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 rounded-none skew-x-[-10deg] shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:text-cyan-300 transition-all duration-300" asChild>
              <Link href="#how-it-works">
                <span className="skew-x-[10deg]">詳細を見る</span>
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <span className="text-xs text-slate-400 tracking-[0.3em] font-orbitron uppercase">Scroll</span>
          <div className="w-px h-20 bg-gradient-to-b from-cyan-500 to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 sm:py-32 relative bg-black/20">
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-glow font-orbitron bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              HOW IT WORKS
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              3ステップで簡単に始められます
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-16 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent z-0" />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="relative z-10 flex flex-col items-center text-center group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="w-32 h-32 rounded-3xl bg-[#0f172a] border border-cyan-500/30 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-all duration-500 relative">
                  <div className="absolute inset-0 bg-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <step.icon className="h-12 w-12 text-cyan-400 group-hover:text-cyan-200 transition-colors duration-300 group-hover:scale-110 transform" />
                  <div className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-white text-lg font-bold shadow-[0_0_15px_rgba(6,182,212,0.6)] font-orbitron">
                    {index + 1}
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-2 tracking-wider font-orbitron text-white">{step.title}</h3>
                <h4 className="text-cyan-400 text-sm font-bold mb-4 tracking-widest">{step.subtitle}</h4>
                <p className="text-slate-400 leading-relaxed whitespace-pre-line">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-24 sm:py-32 relative bg-[#020617]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-glow-purple font-orbitron bg-clip-text text-transparent bg-gradient-to-b from-white to-purple-200">
              PLANS
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              あなたに合ったプランをお選びください
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="h-full"
              >
                <Card
                  className={`relative h-full border-0 bg-black/40 backdrop-blur-md overflow-hidden transition-all duration-500 hover:-translate-y-2 group
                    ${plan.popular
                      ? "ring-1 ring-purple-500/50 shadow-[0_0_30px_rgba(147,51,234,0.1)] hover:shadow-[0_0_50px_rgba(147,51,234,0.2)]"
                      : "ring-1 ring-white/10 hover:ring-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                    }`}
                >
                  {/* Card Gradient Background */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
                    ${plan.popular
                      ? "bg-gradient-to-b from-purple-500/5 to-transparent"
                      : "bg-gradient-to-b from-cyan-500/5 to-transparent"
                    }`}
                  />

                  {plan.popular && (
                    <div className="absolute top-0 right-0 p-4 z-10">
                      <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)] font-orbitron tracking-wider">
                        RECOMMENDED
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 relative z-10 pt-10">
                    <CardTitle className={`text-3xl font-bold mb-2 font-orbitron tracking-tight ${plan.popular ? "text-purple-300 text-glow-purple" : "text-slate-200"}`}>
                      {plan.name}
                    </CardTitle>
                    <p className={`text-sm font-bold tracking-widest mb-4 ${plan.popular ? "text-purple-400" : "text-cyan-400"}`}>
                      {plan.subtitle}
                    </p>
                    <CardDescription className="text-slate-400 text-base">{plan.description}</CardDescription>
                    <div className="mt-8 mb-4">
                      <span className="text-5xl font-bold text-white font-orbitron tracking-tight">¥{plan.price}</span>
                      {plan.price !== "0" && (
                        <span className="text-slate-500 text-sm ml-2">/回</span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="relative z-10 p-8 pt-4 flex flex-col h-full">
                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 group/item">
                          <div className={`p-1 rounded-full transition-colors ${plan.popular ? "bg-purple-500/20 text-purple-400 group-hover/item:text-purple-300" : "bg-cyan-500/20 text-cyan-400 group-hover/item:text-cyan-300"}`}>
                            <Check className="h-4 w-4" />
                          </div>
                          <span className="text-slate-300 text-sm group-hover/item:text-white transition-colors">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full h-14 text-lg font-bold transition-all duration-300 bg-opacity-90 hover:bg-opacity-100 font-orbitron tracking-wide
                        ${plan.popular
                          ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] border-none hover:shadow-[0_0_30px_rgba(147,51,234,0.6)]"
                          : "bg-transparent border border-white/20 hover:border-cyan-400/50 hover:bg-cyan-950/30 text-white"
                        }`}
                      asChild
                    >
                      <Link href={plan.href}>
                        {plan.name === "FREE PLAN" ? "START FOR FREE" : "BOOK NOW"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900 to-transparent" />

        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-cyan-950/10 to-[#020617]" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-glow font-orbitron bg-clip-text text-transparent bg-gradient-to-b from-white to-cyan-100">
              CREATE YOUR LEGACY
            </h2>
            <p className="mt-4 text-xl text-slate-300 mb-12 leading-relaxed">
              あなたの動画が水間鉄道の車両に投影される、<br />
              忘れられない瞬間を体験してください。
            </p>
            <Button size="lg" className="h-20 px-16 text-2xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-none skew-x-[-10deg] shadow-[0_0_30px_rgba(6,182,212,0.4)] neon-button hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] group" asChild>
              <Link href="/create">
                <span className="skew-x-[10deg] flex items-center gap-3">
                  <Train className="mr-2 h-7 w-7" />
                  START NOW
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
