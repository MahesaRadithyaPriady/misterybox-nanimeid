"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import {
  Coins,
  Box,
  Gift,
  RotateCcw,
  Trophy,
  Gem,
  HelpCircle,
  History,
  Zap,
  Wallet,
  Dices,
  Crown,
  Frame,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RejectedScreen } from "@/components/rejected-screen";
import { LoadingScreen } from "@/components/loading-screen";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type TierType = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
type RewardType = "COIN" | "SUPER_BADGE" | "VIP" | "AVATAR_BORDER" | "XP";

interface MysteryBoxTier {
  id: number;
  tier_type: TierType;
  label: string;
  weight: number;
  reward_type: RewardType;
  coin_min: number;
  coin_max: number;
  xp_min: number;
  xp_max: number;
  image_url: string | null;
  badge: { id: number; code: string; name: string; badge_url: string } | null;
  border: { id: number; code: string; title: string; image_url: string } | null;
  vip_plan: { id: number; name: string; duration_days: number; color: string } | null;
}

interface MysteryBoxData {
  id: number;
  code: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  cost_coins: number;
  tiers: MysteryBoxTier[];
}

interface PullReward {
  type: RewardType;
  coins?: number;
  xp?: number;
  id?: number;
  name?: string;
  image_url?: string;
  already_owned?: boolean;
  converted_to_coins?: number;
  vip_days?: number;
  plan_name?: string;
  plan_color?: string;
  end_at?: string;
}

interface PullItem {
  pull_id: number;
  tier: { id: number; tier_type: TierType; label: string; image_url: string | null };
  reward: PullReward;
  is_pity?: boolean;
}

interface PityInfo {
  spin_count: number;
  threshold: number;
  remaining: number;
  triggered: boolean;
}

interface PullResult {
  box: { id: number; code: string; name: string };
  pulls: PullItem[];
  total_coins_won: number;
  total_xp_won: number;
  total_cost: number;
  net_coins: number;
  wallet_balance: number;
  pity: PityInfo;
}

interface PullHistoryItem {
  id: number;
  reward_type: RewardType;
  coins_won: number;
  item_granted: PullReward | null;
  rolled_at: string;
  box: { id: number; code: string; name: string; image_url: string | null };
  tier: { id: number; tier_type: TierType; label: string; image_url: string | null; reward_type: RewardType };
}

interface BoxStats {
  total_pulls: number;
  total_coins_won: number;
  total_xp_won: number;
  tier_breakdown: { id: number; tier_type: TierType; label: string; image_url: string | null; count: number; total_coins: number }[];
  reward_breakdown: { reward_type: RewardType; count: number }[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/2.1.0/mystery-box";

function playSound(type: "spin" | "shake" | "shake_special" | "reveal" | "legendary") {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = new AC();
    const now = ctx.currentTime;

    if (type === "shake_special") {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.15);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      masterGain.connect(ctx.destination);

      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      notes.forEach((freq, i) => {
        const t = now + i * 0.12;
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq * 0.5, t);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(4000, t + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.35);
      });

      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(1046.5, now);
      shimmer.frequency.exponentialRampToValueAtTime(2093.0, now + 1.5);
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.setValueAtTime(0.001, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.08, now + 0.3);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      shimmer.start(now);
      shimmer.stop(now + 1.8);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "spin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "shake") {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.connect(gain);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.start(now);
      noise.stop(now + 0.08);
    } else if (type === "reveal") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {
    // ignore audio errors
  }
}

const tierLabel: Record<TierType, string> = {
  COMMON: "Biasa",
  RARE: "Langka",
  EPIC: "Epik",
  LEGENDARY: "Legendaris",
  MYTHIC: "Mistik",
};

const tierStyles: Record<TierType, string> = {
  COMMON: "text-slate-400",
  RARE: "text-emerald-400",
  EPIC: "text-violet-400",
  LEGENDARY: "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-rose-600",
  MYTHIC: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400",
};

const tierBadge: Record<TierType, string> = {
  COMMON: "bg-slate-800 text-slate-300 border-slate-700",
  RARE: "bg-emerald-950/60 text-emerald-300 border-emerald-800",
  EPIC: "bg-violet-950/60 text-violet-300 border-violet-800",
  LEGENDARY: "bg-gradient-to-r from-orange-950/80 via-red-950/80 to-rose-950/80 text-orange-200 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
  MYTHIC: "bg-gradient-to-r from-pink-950/80 via-fuchsia-950/80 to-violet-950/80 text-pink-200 border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.3)]",
};

const tierRing: Record<TierType, string> = {
  COMMON: "ring-slate-400",
  RARE: "ring-emerald-400",
  EPIC: "ring-violet-400",
  LEGENDARY: "ring-red-500 ring-[5px] shadow-[0_0_25px_rgba(239,68,68,0.45)]",
  MYTHIC: "ring-pink-500 ring-[6px] shadow-[0_0_30px_rgba(236,72,153,0.5)]",
};

const tierIconColor: Record<TierType, string> = {
  COMMON: "text-slate-600",
  RARE: "text-emerald-600",
  EPIC: "text-violet-600",
  LEGENDARY: "text-red-600",
  MYTHIC: "text-pink-600",
};

function isMythic(tier: TierType): boolean {
  return tier?.toUpperCase() === "MYTHIC";
}

function isLegendary(tier: TierType): boolean {
  return tier?.toUpperCase() === "LEGENDARY";
}

function isSpecialTier(tier: TierType): boolean {
  return isLegendary(tier) || isMythic(tier);
}

const rewardIcon: Record<RewardType, React.ReactNode> = {
  COIN: <Coins className="size-6" />,
  SUPER_BADGE: <Trophy className="size-6" />,
  VIP: <Crown className="size-6" />,
  AVATAR_BORDER: <Frame className="size-6" />,
  XP: <Star className="size-6" />,
};

const rewardColor: Record<RewardType, string> = {
  COIN: "from-amber-400 to-orange-500",
  SUPER_BADGE: "from-red-500 to-red-700",
  VIP: "from-violet-500 to-fuchsia-700",
  AVATAR_BORDER: "from-sky-400 to-blue-600",
  XP: "from-emerald-400 to-teal-600",
};

const rewardLabel: Record<RewardType, string> = {
  COIN: "Koin",
  SUPER_BADGE: "Super Badge",
  VIP: "VIP",
  AVATAR_BORDER: "Avatar Border",
  XP: "XP",
};

function getRewardDisplay(reward: PullReward): { title: string; subtitle: string } {
  switch (reward.type) {
    case "COIN":
      return { title: `${reward.coins} Koin`, subtitle: "Reward Koin" };
    case "XP":
      return { title: `${reward.xp} XP`, subtitle: `Reward XP · dapat ${reward.xp} XP` };
    case "SUPER_BADGE":
      if (reward.already_owned && reward.converted_to_coins) {
        return { title: reward.name || "Badge", subtitle: `Sudah dimiliki · Dikonversi ${reward.converted_to_coins.toLocaleString()} koin` };
      }
      return { title: reward.name || "Badge", subtitle: reward.already_owned ? "Sudah dimiliki" : "Baru didapat" };
    case "AVATAR_BORDER":
      return { title: reward.name || "Border", subtitle: reward.already_owned ? "Sudah dimiliki" : "Baru didapat" };
    case "VIP":
      if (reward.already_owned) {
        return { title: `VIP ${reward.plan_name || ""}`, subtitle: `Upgrade · ${reward.vip_days} hari` };
      }
      return { title: `VIP ${reward.plan_name || ""}`, subtitle: `${reward.vip_days} hari` };
    default:
      return { title: "Hadiah", subtitle: "" };
  }
}

function RewardImage({
  reward,
  imageUrl,
  className,
  imgClassName,
}: {
  reward: PullReward;
  imageUrl?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  const src = reward.image_url || imageUrl;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={reward.name || rewardLabel[reward.type]}
        className={imgClassName ?? "size-full rounded-xl object-cover"}
      />
    );
  }
  return <span className={className}>{rewardIcon[reward.type]}</span>;
}

const boxThemes = [
  {
    name: "Mystic Gold",
    body: "from-amber-500 to-orange-600",
    lid: "from-amber-400 to-orange-500",
    border: "border-amber-500/30",
  },
  {
    name: "Royal Purple",
    body: "from-violet-600 to-fuchsia-700",
    lid: "from-violet-500 to-fuchsia-600",
    border: "border-violet-500/30",
  },
  {
    name: "Cyber Blue",
    body: "from-sky-500 to-blue-700",
    lid: "from-sky-400 to-blue-600",
    border: "border-sky-500/30",
  },
];

function GachaPageInner() {
  const [coins, setCoins] = useState(0);
  const [boxData, setBoxData] = useState<MysteryBoxData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "shaking" | "opening" | "revealed">("idle");
  const [pullResult, setPullResult] = useState<PullResult | null>(null);
  const [history, setHistory] = useState<PullHistoryItem[]>([]);
  const [stats, setStats] = useState<BoxStats | null>(null);
  const [pityInfo, setPityInfo] = useState<PityInfo | null>(null);
  const [multiPulls, setMultiPulls] = useState<PullItem[]>([]);
  const [multiIndex, setMultiIndex] = useState(0);
  const [isMulti, setIsMulti] = useState(false);
  const [spinMode, setSpinMode] = useState<1 | 10>(1);
  const [isPulling, setIsPulling] = useState(false);
  const searchParams = useSearchParams();
  const boxCode = searchParams?.get("code") || null;
  const [accessToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const url = new URLSearchParams(window.location.search);
    const urlToken = url.get("access_token") || url.get("token");
    if (urlToken) {
      sessionStorage.setItem("mb_access_token", urlToken);
      return urlToken;
    }
    return sessionStorage.getItem("mb_access_token");
  });
  const isTokenMissing = !accessToken || !boxCode;
  const [isLoading, setIsLoading] = useState(!!accessToken && !!boxCode);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URLSearchParams(window.location.search);
    if (url.get("access_token") || url.get("token")) {
      url.delete("access_token");
      url.delete("token");
      const cleanUrl = url.toString()
        ? `${window.location.pathname}?${url.toString()}`
        : window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !boxCode) return;
    const fetchAll = async () => {
      setIsLoading(true);
      const headers = { Authorization: `Bearer ${accessToken}` };
      try {
        const [boxRes, walletRes, historyRes, statsRes, pityRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/${boxCode}`),
          axios.get(`${API_BASE_URL}/me/wallet`, { headers }),
          axios.get(`${API_BASE_URL}/me/history?page=1&limit=20`, { headers }),
          axios.get(`${API_BASE_URL}/me/stats`, { headers }),
          axios.get(`${API_BASE_URL}/me/pity`, { headers }),
        ]);
        if (boxRes.data?.success) setBoxData(boxRes.data.data);
        if (walletRes.data?.success && typeof walletRes.data?.data?.balance_coins === "number") {
          setCoins(walletRes.data.data.balance_coins);
        } else {
          setWalletError("Gagal mengambil saldo");
        }
        if (historyRes.data?.success) setHistory(historyRes.data.data.items || []);
        if (statsRes.data?.success) setStats(statsRes.data.data);
        if (pityRes.data?.success) {
          const pityArr = pityRes.data.data as { box: { code: string }; spin_count: number; threshold: number; remaining: number }[];
          const currentPity = pityArr.find((p) => p.box.code === boxCode);
          if (currentPity) {
            setPityInfo({ spin_count: currentPity.spin_count, threshold: currentPity.threshold, remaining: currentPity.remaining, triggered: false });
          }
        }
      } catch {
        setWalletError("Gagal memuat data");
        toast.error("Gagal memuat data dari server");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [accessToken, boxCode]);

  useEffect(() => {
    if (!isMulti) return;
    if (multiIndex >= multiPulls.length) return;
    const currentPull = multiPulls[multiIndex];
    const isHighRarity = isSpecialTier(currentPull.tier.tier_type);
    playSound(isHighRarity ? "legendary" : "reveal");
    const timer = setTimeout(() => {
      setMultiIndex((prev) => prev + 1);
    }, isHighRarity ? 3500 : 1700);
    return () => clearTimeout(timer);
  }, [isMulti, multiIndex, multiPulls]);

  useEffect(() => {
    if (phase !== "shaking") return;
    const isSpecial = spinMode === 1
      ? isSpecialTier(pullResult?.pulls[0]?.tier.tier_type || "COMMON")
      : pullResult?.pulls.some((p) => isSpecialTier(p.tier.tier_type));
    if (isSpecial) {
      playSound("shake_special");
      return;
    }
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count > 4) {
        clearInterval(interval);
        return;
      }
      playSound("shake");
    }, 350);
    return () => clearInterval(interval);
  }, [phase, pullResult, spinMode]);

  const handleBoxClick = async (index: number) => {
    if (phase !== "idle" || isMulti || isPulling || !boxCode || !accessToken || !boxData) return;
    const cost = boxData.cost_coins * spinMode;
    if (coins < cost) {
      toast.error("Koin tidak cukup!", { description: `Butuh ${cost} koin untuk ${spinMode}x spin.` });
      return;
    }

    playSound("spin");
    setSelectedIndex(index);
    setIsPulling(true);

    try {
      const endpoint = spinMode === 10 ? "pull10" : "pull";
      const body = spinMode === 10 ? {} : { count: 1 };
      const res = await axios.post(
        `${API_BASE_URL}/${boxCode}/${endpoint}`,
        body,
        { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } },
      );

      if (!res.data?.success) {
        toast.error(res.data?.message || "Gagal melakukan pull");
        setIsPulling(false);
        setSelectedIndex(null);
        return;
      }

      const result: PullResult = res.data.data;
      setPullResult(result);
      setCoins(result.wallet_balance);
      if (result.pity) setPityInfo(result.pity);

      if (spinMode === 1) {
        setPhase("shaking");
        setTimeout(() => {
          setPhase("opening");
        }, 1800);
        setTimeout(() => {
          setPhase("revealed");
          const pull = result.pulls[0];
          if (pull) {
            const display = getRewardDisplay(pull.reward);
            toast.success(`Kamu mendapatkan ${display.title}!`, {
              description: `${tierLabel[pull.tier.tier_type]} · ${display.subtitle}`,
            });
          }
        }, 2800);
      } else {
        const hasSpecial = result.pulls.some((p) => isSpecialTier(p.tier.tier_type));
        if (hasSpecial) {
          setPhase("shaking");
          setTimeout(() => {
            setPhase("idle");
            setIsPulling(false);
            setMultiPulls(result.pulls);
            setMultiIndex(0);
            setIsMulti(true);
          }, 2500);
        } else {
          setPhase("idle");
          setIsPulling(false);
          setMultiPulls(result.pulls);
          setMultiIndex(0);
          setIsMulti(true);
        }
      }

      const [historyRes, statsRes, pityRes, walletRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/me/history?page=1&limit=20`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/me/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/me/pity`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/me/wallet`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      if (historyRes.data?.success) setHistory(historyRes.data.data.items || []);
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (pityRes.data?.success && boxCode) {
        const pityArr = pityRes.data.data as { box: { code: string }; spin_count: number; threshold: number; remaining: number }[];
        const currentPity = pityArr.find((p) => p.box.code === boxCode);
        if (currentPity) {
          setPityInfo({ spin_count: currentPity.spin_count, threshold: currentPity.threshold, remaining: currentPity.remaining, triggered: result.pity?.triggered ?? false });
        }
      }
      if (walletRes.data?.success && typeof walletRes.data?.data?.balance_coins === "number") {
        setCoins(walletRes.data.data.balance_coins);
      }
    } catch {
      toast.error("Gagal melakukan pull");
      setSelectedIndex(null);
    } finally {
      setIsPulling(false);
    }
  };

  const playAgain = () => {
    setPhase("idle");
    setSelectedIndex(null);
    setPullResult(null);
    setIsMulti(false);
    setMultiPulls([]);
    setMultiIndex(0);
  };

  const boxContainerVariants = {
    idle: {},
    shaking: {
      transition: {
        staggerChildren: 0.08,
        repeat: Infinity,
        repeatType: "reverse" as const,
        duration: 0.3,
      },
    },
  };

  const boxItemVariants = {
    idle: { y: 0, rotate: 0, scale: 1 },
    shaking: {
      y: [0, -12, 8, -6, 12, -4, 0],
      rotate: [-2, 3, -3, 2, -1, 1, 0],
      scale: [1, 1.02, 0.98, 1.01, 1],
      transition: { duration: 0.4, repeat: Infinity, ease: "easeInOut" as const },
    },
  };

  if (isTokenMissing) {
    return <RejectedScreen />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-slate-950 via-transparent to-slate-950 opacity-80" />

      <div className="relative z-10">
        <header className="border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 sm:size-9">
                <Box className="size-5" />
              </div>
              <span className="text-base font-bold text-white sm:text-lg">NanimeID</span>
            </div>
            <nav className="hidden items-center gap-6 text-sm text-slate-400 sm:flex">
              <span className="hover:text-white">Gacha</span>
              <span className="hover:text-white">Prize Pool</span>
              <span className="hover:text-white">Cara Main</span>
            </nav>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5">
              <Coins className="size-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">
                {coins.toLocaleString()}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-6 sm:px-6 sm:space-y-8 sm:pb-16 sm:pt-8">
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Selamat datang</p>
                  <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{boxData?.name || "Mystery Box"}</h1>
                          <p className="mt-2 max-w-md text-sm text-slate-400">
                    {boxData?.description || "Pilih kotak misterius dan buka untuk mendapatkan hadiah."}
                  </p>
                </div>
                <div className="hidden rounded-xl bg-amber-500/10 p-3 sm:block">
                  <Dices className="size-8 text-amber-400" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <Wallet className="size-4 text-emerald-400" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-500">Saldo</p>
                    <p className="text-sm font-semibold text-white">
                      {coins.toLocaleString()} koin
                    </p>
                    {walletError && (
                      <p className="text-[10px] text-red-400">{walletError}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <Zap className="size-4 text-yellow-400" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-500">Biaya spin</p>
                    <p className="text-sm font-semibold text-white">{boxData?.cost_coins ?? "-"} koin</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <History className="size-4 text-blue-400" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-500">Total spin</p>
                    <p className="text-sm font-semibold text-white">{stats?.total_pulls ?? 0}x</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <Sparkles className="size-4 text-pink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase text-slate-500">Pity</p>
                    <p className="text-sm font-semibold text-white">
                      {pityInfo ? `${pityInfo.spin_count}/${pityInfo.threshold}` : "-/90"}
                    </p>
                    <p className="text-[10px] text-pink-400">
                      {pityInfo ? `${pityInfo.remaining} spin lagi` : ""}
                    </p>
                    {pityInfo && (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all"
                          style={{ width: `${Math.min((pityInfo.spin_count / pityInfo.threshold) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Gift className="size-4 text-amber-400" />
                Hadiah Terakhir
              </div>
              {history.length > 0 ? (
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${rewardColor[history[0].reward_type]} text-white overflow-hidden`}
                  >
                    {history[0].item_granted ? (
                      <RewardImage reward={history[0].item_granted} imageUrl={history[0].tier.image_url} className="flex items-center justify-center" imgClassName="size-12 rounded-xl object-cover" />
                    ) : (
                      rewardIcon[history[0].reward_type]
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {history[0].item_granted
                        ? getRewardDisplay(history[0].item_granted).title
                        : rewardLabel[history[0].reward_type]}
                    </p>
                    <p className={`text-xs ${tierStyles[history[0].tier.tier_type]}`}>
                      {tierLabel[history[0].tier.tier_type]} · {history[0].coins_won > 0 ? `${history[0].coins_won} koin` : rewardLabel[history[0].reward_type]}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-4 text-center">
                  <p className="text-sm text-slate-500">Belum ada spin</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg text-white sm:text-xl">
                      <Gem className="size-5 text-amber-400" />
                      NanimeID Mistery Box
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Kotak pilihanmu akan bergetar, lalu terbuka untuk memperlihatkan hadiah.
                    </CardDescription>
                  </div>
                  <div className="hidden rounded-lg bg-slate-800/60 px-3 py-1 text-xs text-slate-400 sm:block">
                    {phase === "idle" && "Siap spin"}
                    {phase === "shaking" && "Sedang mengocok..."}
                    {phase === "opening" && "Membuka kotak..."}
                    {phase === "revealed" && "Hadiah terbuka!"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8"
                  variants={boxContainerVariants}
                  animate={phase}
                >
                  {boxThemes.map((theme, index) => {
                    const isSelected = selectedIndex === index;
                    const isOpening = phase === "opening" && isSelected;
                    const isRevealed = phase === "revealed" && isSelected;
                    const isDimmed = phase !== "idle" && !isSelected;

                    return (
                      <motion.button
                        key={theme.name}
                        variants={boxItemVariants}
                        animate={phase === "shaking" ? "shaking" : "idle"}
                        disabled={phase !== "idle"}
                        onClick={() => handleBoxClick(index)}
                        className="group relative w-full max-w-[260px] focus:outline-none sm:w-auto"
                        whileHover={phase === "idle" ? { scale: 1.03 } : {}}
                        whileTap={phase === "idle" ? { scale: 0.98 } : {}}
                      >
                        <div
                          className={`relative h-44 w-full sm:h-48 sm:w-52 md:h-56 md:w-60 ${
                            isDimmed ? "opacity-40 grayscale" : "opacity-100"
                          }`}
                          style={{ perspective: "1000px" }}
                        >
                          {phase === "shaking" && isSelected && spinMode === 10 && pullResult?.pulls.some((p) => isSpecialTier(p.tier.tier_type)) && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0.4, 0.8, 0.4, 0.8, 0.4] }}
                              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute -inset-6 -z-10 rounded-3xl blur-2xl"
                              style={{
                                background: pullResult?.pulls.some((p) => isMythic(p.tier.tier_type))
                                  ? "radial-gradient(circle, rgba(236,72,153,0.7) 0%, rgba(168,85,247,0.4) 50%, transparent 70%)"
                                  : "radial-gradient(circle, rgba(239,68,68,0.7) 0%, rgba(249,115,22,0.4) 50%, transparent 70%)",
                              }}
                            />
                          )}
                          {isRevealed && isSpecialTier(pullResult?.pulls[0]?.tier.tier_type || "COMMON") && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute -inset-4 -z-10 rounded-3xl blur-2xl"
                              style={{
                                background: isMythic(pullResult?.pulls[0]?.tier.tier_type || "COMMON")
                                  ? "radial-gradient(circle, rgba(236,72,153,0.55) 0%, rgba(168,85,247,0.25) 50%, transparent 70%)"
                                  : "radial-gradient(circle, rgba(239,68,68,0.55) 0%, rgba(249,115,22,0.25) 50%, transparent 70%)",
                              }}
                            />
                          )}
                          <motion.div
                            animate={
                              isRevealed && isSpecialTier(pullResult?.pulls[0]?.tier.tier_type || "COMMON")
                                ? {
                                    x: [0, -6, 6, -5, 5, -3, 3, 0],
                                    y: [0, -4, 4, -3, 3, -2, 2, 0],
                                    rotate: [0, -3, 3, -2, 2, -1, 1, 0],
                                    scale: [1, 1.05, 1.02, 1.04, 1.02, 1.03, 1.01, 1],
                                  }
                                : {}
                            }
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            className={`relative h-full w-full rounded-2xl border-2 ${theme.border} bg-gradient-to-b ${theme.body} shadow-lg`}
                            style={{
                              boxShadow: isRevealed
                                ? pullResult?.pulls[0]?.tier.tier_type === "MYTHIC"
                                  ? "0 0 60px 15px rgba(236,72,153,0.5)"
                                  : pullResult?.pulls[0]?.tier.tier_type === "LEGENDARY"
                                    ? "0 0 55px 12px rgba(239,68,68,0.45)"
                                    : "0 0 50px 10px rgba(250,200,80,0.35)"
                                : "0 12px 30px -10px rgba(0,0,0,0.6)",
                            }}
                          >
                            <div className="absolute inset-x-0 top-0 h-2 rounded-t-2xl bg-white/20" />
                            <div className="flex h-full flex-col items-center justify-center gap-2">
                              <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
                                <Box className="size-12 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-white/90">{theme.name}</span>
                              <span className="text-[10px] text-white/60">Ketuk untuk spin</span>
                            </div>

                            {(isSelected || isOpening || isRevealed) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 overflow-hidden rounded-2xl"
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                  className="absolute -inset-[50%] rounded-2xl bg-gradient-conic from-amber-400/30 via-amber-600/20 to-amber-400/30"
                                />
                              </motion.div>
                            )}

                            {(isOpening || isRevealed) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <div className="size-16 rounded-full bg-white/20 blur-xl sm:size-20" />
                              </motion.div>
                            )}
                          </motion.div>

                          <motion.div
                            className={`absolute left-0 right-0 top-0 h-14 rounded-t-2xl bg-gradient-to-b ${theme.lid} shadow-md sm:h-16`}
                            style={{ transformOrigin: "top center" }}
                            initial={{ rotateX: 0 }}
                            animate={{
                              rotateX: isOpening || isRevealed ? -120 : 0,
                              y: isOpening || isRevealed ? -6 : 0,
                            }}
                            transition={{ type: "spring", stiffness: 120, damping: 14 }}
                          >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10" />
                            <div className="flex h-full items-center justify-center">
                              <div className="h-3 w-14 rounded-full bg-black/20 sm:w-16" />
                            </div>
                          </motion.div>
                        </div>

                        {phase === "idle" && (
                          <span className="mt-3 block w-full rounded-full border border-slate-700 bg-slate-800/60 py-2 text-center text-xs font-medium text-slate-300 transition-colors group-hover:border-amber-500/50 group-hover:text-amber-300">
                            Spin {spinMode}x
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>

                {phase === "idle" && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-xs text-slate-400">Pilih mode spin</p>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 p-1">
                      <button
                        onClick={() => setSpinMode(1)}
                        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                          spinMode === 1
                            ? "bg-amber-500 text-slate-950"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        1x
                      </button>
                      <button
                        onClick={() => setSpinMode(10)}
                        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                          spinMode === 10
                            ? "bg-amber-500 text-slate-950"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        10x
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Biaya: {(boxData?.cost_coins ?? 0) * spinMode} koin per klik kotak
                    </p>
                    {spinMode === 10 && (
                      <p className="text-xs font-medium text-violet-400">
                        Dijamin mendapatkan 1 EPIC+ di 10x spin
                      </p>
                    )}
                  </div>
                )}

                {phase === "revealed" && pullResult && pullResult.pulls.length === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 flex justify-center"
                  >
                    <Button
                      size="lg"
                      onClick={playAgain}
                      className="gap-2 rounded-xl bg-amber-500 px-8 text-slate-950 hover:bg-amber-400"
                    >
                      <RotateCcw className="size-4" />
                      Spin Lagi
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gift className="size-5 text-emerald-400" />
                  Prize Pool
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Daftar hadiah yang bisa kamu menangkan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {boxData?.tiers.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3"
                    >
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${rewardColor[t.reward_type]} text-white overflow-hidden`}
                      >
                        {t.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.image_url} alt={t.label} className="size-10 rounded-lg object-cover" />
                        ) : (
                          rewardIcon[t.reward_type]
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{t.label}</p>
                        <p className="text-xs text-slate-400">
                          {t.reward_type === "COIN" ? `${t.coin_min}-${t.coin_max} koin` : t.reward_type === "XP" ? `${t.xp_min}-${t.xp_max} XP` : rewardLabel[t.reward_type]}
                        </p>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${tierBadge[t.tier_type]}`}
                      >
                        {tierLabel[t.tier_type]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <HelpCircle className="size-5 text-blue-400" />
                  Cara Bermain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {[
                    `Pastikan saldo koin mencukupi (biaya spin ${boxData?.cost_coins ?? 0} koin).`,
                    "Pilih salah satu dari 3 kotak misterius.",
                    "Tunggu animasi shake dan kotak terbuka.",
                    "Lihat hadiahmu di dialog hasil dan riwayat.",
                    "Klik \"Spin Lagi\" untuk bermain lagi.",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-300">{text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>

          {history.length > 0 && (
            <section>
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <History className="size-5 text-blue-400" />
                    Riwayat Spin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {history.map((h, i) => (
                      <div
                        key={`${h.id}-${i}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3"
                      >
                        <div
                          className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${rewardColor[h.reward_type]} text-white overflow-hidden`}
                        >
                          {h.item_granted ? (
                            <RewardImage reward={h.item_granted} imageUrl={h.tier.image_url} className="flex items-center justify-center" imgClassName="size-10 rounded-lg object-cover" />
                          ) : (
                            rewardIcon[h.reward_type]
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {h.item_granted ? getRewardDisplay(h.item_granted).title : rewardLabel[h.reward_type]}
                          </p>
                          <p className={`text-xs ${tierStyles[h.tier.tier_type]}`}>
                            {tierLabel[h.tier.tier_type]} · {h.coins_won > 0 ? `${h.coins_won} koin` : rewardLabel[h.reward_type]}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {stats && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-slate-800">
                    <History className="size-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Statistik Pull</p>
                    <p className="text-xs text-slate-400">{stats.total_pulls} total pull · {stats.total_coins_won.toLocaleString()} koin dimenangkan{stats.total_xp_won > 0 ? ` · ${stats.total_xp_won.toLocaleString()} XP` : ""}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {stats.reward_breakdown.map((rb) => (
                    <span key={rb.reward_type} className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${tierBadge.COMMON}`}>
                      {rewardLabel[rb.reward_type]}: {rb.count}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="border-t border-slate-800 bg-slate-900/80 py-6 text-center text-xs text-slate-500">
          <p>© 2026 NanimeID - Mystery Box Spin.</p>
        </footer>
      </div>

      <AnimatePresence>
        {phase === "revealed" && pullResult && pullResult.pulls.length === 1 && (() => {
          const pull = pullResult.pulls[0];
          const display = getRewardDisplay(pull.reward);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="flex w-full max-w-md flex-col items-center text-center"
              >
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`mb-2 text-sm font-semibold uppercase tracking-widest ${isMythic(pull.tier.tier_type) ? "bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent" : isLegendary(pull.tier.tier_type) ? "bg-gradient-to-r from-orange-400 via-red-500 to-rose-600 bg-clip-text text-transparent" : "text-amber-400"}`}
                >
                  {isMythic(pull.tier.tier_type) ? "✦ MYTHIC ✦" : isLegendary(pull.tier.tier_type) ? "✦ LEGENDARY ✦" : "Selamat!"}
                </motion.div>
                {pull.is_pity && (
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-pink-500/50 bg-pink-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                    <Sparkles className="size-3" />
                    Guaranteed LEGENDARY+
                  </div>
                )}
                <h2 className="mb-8 text-xl font-bold text-white sm:text-2xl">
                  Kamu mendapatkan hadiah
                </h2>

                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.2 }}
                  className="relative"
                >
                  <div className={`absolute inset-0 animate-pulse rounded-full blur-2xl ${isMythic(pull.tier.tier_type) ? "bg-pink-400/30" : isLegendary(pull.tier.tier_type) ? "bg-red-500/30" : "bg-amber-400/20"}`} />
                  {isSpecialTier(pull.tier.tier_type) && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className={`absolute -inset-4 rounded-full bg-gradient-conic ${isMythic(pull.tier.tier_type) ? "from-pink-500 via-fuchsia-500 to-violet-500" : "from-orange-500 via-red-500 to-rose-500"} opacity-20 blur-xl`}
                    />
                  )}
                  <div
                    className={`relative flex size-36 items-center justify-center rounded-3xl bg-white shadow-2xl ring-4 ${tierRing[pull.tier.tier_type]} ${tierIconColor[pull.tier.tier_type]} sm:size-44 overflow-hidden`}
                  >
                    <RewardImage reward={pull.reward} imageUrl={pull.tier.image_url} className="flex items-center justify-center" imgClassName="size-36 rounded-3xl object-cover sm:size-44" />
                  </div>
                </motion.div>

                <div className="mt-8 space-y-2">
                  <p className="text-2xl font-bold text-white sm:text-3xl">{display.title}</p>
                  <p className={`text-sm font-semibold ${tierStyles[pull.tier.tier_type]}`}>
                    {tierLabel[pull.tier.tier_type]}
                  </p>
                  <p className="text-sm text-slate-400">{display.subtitle}</p>
                  {pull.reward.type === "COIN" && (
                    <p className="text-3xl font-bold text-amber-300 sm:text-4xl">
                      +{pull.reward.coins?.toLocaleString()} koin
                    </p>
                  )}
                  {pull.reward.type === "SUPER_BADGE" && pull.reward.already_owned && pull.reward.converted_to_coins && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-2">
                      <p className="text-sm text-amber-300">
                        Badge sudah dimiliki, dikonversi menjadi
                      </p>
                      <p className="text-2xl font-bold text-amber-300">
                        +{pull.reward.converted_to_coins.toLocaleString()} koin
                      </p>
                    </div>
                  )}
                  {pull.reward.type === "VIP" && pull.reward.already_owned && (
                    <div className="rounded-lg border border-violet-500/30 bg-violet-950/40 px-4 py-2">
                      <p className="text-sm text-violet-300">
                        VIP di-upgrade ke {pull.reward.plan_name}
                      </p>
                      <p className="text-xs text-violet-400">
                        Durasi {pull.reward.vip_days} hari · Aktif sampai {pull.reward.end_at ? new Date(pull.reward.end_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                      </p>
                    </div>
                  )}
                  {pull.reward.type === "VIP" && !pull.reward.already_owned && pull.reward.end_at && (
                    <p className="text-xs text-slate-500">
                      Aktif sampai {new Date(pull.reward.end_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  {pityInfo && (
                    <p className="text-xs text-slate-500">
                      Pity: {pityInfo.spin_count}/{pityInfo.threshold} · {pityInfo.remaining} spin lagi untuk guaranteed LEGENDARY+
                    </p>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={playAgain}
                  className="mt-8 gap-2 rounded-xl bg-amber-500 px-10 text-slate-950 hover:bg-amber-400"
                >
                  <RotateCcw className="size-4" />
                  Spin Lagi
                </Button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {isMulti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-6 backdrop-blur-md"
          >
            {multiIndex < multiPulls.length && isSpecialTier(multiPulls[multiIndex].tier.tier_type) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.7, 0, 0.5, 0] }}
                transition={{ duration: 1.5, times: [0, 0.15, 0.35, 0.6, 1] }}
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  background: isMythic(multiPulls[multiIndex].tier.tier_type)
                    ? "radial-gradient(circle at center, rgba(236,72,153,0.6) 0%, rgba(168,85,247,0.25) 45%, transparent 70%)"
                    : "radial-gradient(circle at center, rgba(239,68,68,0.6) 0%, rgba(249,115,22,0.25) 45%, transparent 70%)",
                }}
              />
            )}
            <button
              onClick={playAgain}
              className="absolute right-4 top-4 rounded-full border border-slate-700 bg-slate-800/60 p-2 text-xs text-slate-400 hover:text-white"
            >
              Tutup ✕
            </button>

            {multiIndex < multiPulls.length ? (
              <motion.div
                key={multiIndex}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="relative flex w-full max-w-md flex-col items-center text-center"
              >
                {isSpecialTier(multiPulls[multiIndex].tier.tier_type) && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.6, 0, 0.4, 0] }}
                      transition={{ duration: 1.2, times: [0, 0.15, 0.35, 0.55, 1] }}
                      className="pointer-events-none fixed inset-0 z-0"
                      style={{
                        background: isMythic(multiPulls[multiIndex].tier.tier_type)
                          ? "radial-gradient(circle at center, rgba(236,72,153,0.45) 0%, transparent 60%)"
                          : "radial-gradient(circle at center, rgba(239,68,68,0.45) 0%, transparent 60%)",
                      }}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.5 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="pointer-events-none absolute -inset-16 -z-10 rounded-full blur-3xl"
                      style={{
                        background: isMythic(multiPulls[multiIndex].tier.tier_type)
                          ? "radial-gradient(circle, rgba(236,72,153,0.8) 0%, rgba(168,85,247,0.5) 40%, transparent 70%)"
                          : "radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(249,115,22,0.5) 40%, transparent 70%)",
                      }}
                    />
                  </>
                )}
                <p className={`relative z-10 mb-2 text-sm font-semibold uppercase tracking-widest ${isMythic(multiPulls[multiIndex].tier.tier_type) ? "bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent" : isLegendary(multiPulls[multiIndex].tier.tier_type) ? "bg-gradient-to-r from-orange-400 via-red-500 to-rose-600 bg-clip-text text-transparent" : "text-amber-400"}`}>
                  {isMythic(multiPulls[multiIndex].tier.tier_type) ? `✦ MYTHIC ✦ — Hadiah ${multiIndex + 1}/${multiPulls.length}` : isLegendary(multiPulls[multiIndex].tier.tier_type) ? `✦ LEGENDARY ✦ — Hadiah ${multiIndex + 1}/${multiPulls.length}` : `Spin 10x — Hadiah ${multiIndex + 1}/${multiPulls.length}`}
                </p>
                {multiPulls[multiIndex].is_pity && (
                  <div className="relative z-10 mb-2 inline-flex items-center gap-1 rounded-full border border-pink-500/50 bg-pink-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                    <Sparkles className="size-3" />
                    Guaranteed LEGENDARY+
                  </div>
                )}
                <h2 className="relative z-10 mb-6 text-xl font-bold text-white sm:text-2xl">Selamat!</h2>

                <motion.div
                  animate={
                    isSpecialTier(multiPulls[multiIndex].tier.tier_type)
                      ? {
                          x: [0, -16, 16, -12, 12, -8, 8, -4, 4, 0],
                          y: [0, -10, 10, -8, 8, -6, 6, -4, 4, 0],
                          rotate: [0, -6, 6, -4, 4, -3, 3, -2, 2, 0],
                          scale: [1, 1.08, 1.04, 1.06, 1.04, 1.05, 1.03, 1.04, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <div className={`absolute inset-0 animate-pulse rounded-full blur-2xl ${isMythic(multiPulls[multiIndex].tier.tier_type) ? "bg-pink-400/60" : isLegendary(multiPulls[multiIndex].tier.tier_type) ? "bg-red-500/60" : "bg-amber-400/20"}`} />
                  {isSpecialTier(multiPulls[multiIndex].tier.tier_type) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.6 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="pointer-events-none absolute -inset-12 -z-10 rounded-full blur-3xl"
                      style={{
                        background: isMythic(multiPulls[multiIndex].tier.tier_type)
                          ? "radial-gradient(circle, rgba(236,72,153,0.9) 0%, rgba(168,85,247,0.6) 40%, transparent 70%)"
                          : "radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(249,115,22,0.6) 40%, transparent 70%)",
                      }}
                    />
                  )}
                  {isSpecialTier(multiPulls[multiIndex].tier.tier_type) && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className={`absolute -inset-6 rounded-full bg-gradient-conic ${isMythic(multiPulls[multiIndex].tier.tier_type) ? "from-pink-500 via-fuchsia-500 to-violet-500" : "from-orange-500 via-red-500 to-rose-500"} opacity-40 blur-xl`}
                    />
                  )}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
                    className={`relative flex size-32 items-center justify-center rounded-3xl bg-white shadow-2xl ring-4 ${tierRing[multiPulls[multiIndex].tier.tier_type]} ${tierIconColor[multiPulls[multiIndex].tier.tier_type]} sm:size-40 overflow-hidden`}
                  >
                    <RewardImage reward={multiPulls[multiIndex].reward} imageUrl={multiPulls[multiIndex].tier.image_url} className="flex items-center justify-center" imgClassName="size-32 rounded-3xl object-cover sm:size-40" />
                  </motion.div>
                </motion.div>

                <div className="mt-6 space-y-1">
                  <p className="text-2xl font-bold text-white sm:text-3xl">
                    {getRewardDisplay(multiPulls[multiIndex].reward).title}
                  </p>
                  <p className={`text-sm font-semibold ${tierStyles[multiPulls[multiIndex].tier.tier_type]}`}>
                    {tierLabel[multiPulls[multiIndex].tier.tier_type]}
                  </p>
                  <p className="text-sm text-slate-400">
                    {getRewardDisplay(multiPulls[multiIndex].reward).subtitle}
                  </p>
                  {multiPulls[multiIndex].reward.type === "COIN" && (
                    <p className="text-2xl font-bold text-amber-300 sm:text-3xl">
                      +{multiPulls[multiIndex].reward.coins?.toLocaleString()} koin
                    </p>
                  )}
                  {multiPulls[multiIndex].reward.type === "SUPER_BADGE" && multiPulls[multiIndex].reward.already_owned && multiPulls[multiIndex].reward.converted_to_coins && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1.5">
                      <p className="text-xs text-amber-300">
                        Sudah dimiliki → +{multiPulls[multiIndex].reward.converted_to_coins?.toLocaleString()} koin
                      </p>
                    </div>
                  )}
                  {multiPulls[multiIndex].reward.type === "VIP" && multiPulls[multiIndex].reward.already_owned && (
                    <div className="rounded-lg border border-violet-500/30 bg-violet-950/40 px-3 py-1.5">
                      <p className="text-xs text-violet-300">
                        Upgrade ke {multiPulls[multiIndex].reward.plan_name} · {multiPulls[multiIndex].reward.vip_days} hari
                      </p>
                    </div>
                  )}
                  {multiPulls[multiIndex].reward.type === "VIP" && !multiPulls[multiIndex].reward.already_owned && multiPulls[multiIndex].reward.end_at && (
                    <p className="text-xs text-slate-500">
                      Aktif sampai {new Date(multiPulls[multiIndex].reward.end_at!).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setMultiIndex(multiPulls.length)}
                  className="mt-8 text-sm text-slate-400 underline hover:text-white"
                >
                  Skip ke ringkasan
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="flex w-full max-w-2xl flex-col items-center"
              >
                <h2 className="mb-2 text-center text-xl font-bold text-white sm:text-2xl">
                  Hasil Spin 10x
                </h2>
                <p className="mb-6 text-center text-sm text-slate-400">
                  Total koin dimenangkan:{" "}
                  <span className="font-bold text-amber-300">
                    {pullResult?.total_coins_won.toLocaleString()} koin
                  </span>
                  {pullResult && pullResult.total_xp_won > 0 && (
                    <>
                      {" · "}Total XP dimenangkan:{" "}
                      <span className="font-bold text-emerald-300">
                        {pullResult.total_xp_won.toLocaleString()} XP
                      </span>
                    </>
                  )}
                </p>
                <div className="grid max-h-[50vh] w-full gap-3 overflow-y-auto sm:grid-cols-2">
                  {multiPulls.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={isSpecialTier(p.tier.tier_type) ? { scale: 0.9, opacity: 0 } : { opacity: 0, y: 10 }}
                      animate={isSpecialTier(p.tier.tier_type) ? { scale: [0.9, 1.05, 1], opacity: 1, x: [0, -4, 4, -2, 2, 0] } : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${isSpecialTier(p.tier.tier_type) ? (isMythic(p.tier.tier_type) ? "border-pink-500/50 bg-pink-950/20 shadow-[0_0_20px_rgba(236,72,153,0.2)]" : "border-red-500/50 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]") : "border-slate-800 bg-slate-800/60"}`}
                    >
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg bg-white shadow-md ring-2 ${tierRing[p.tier.tier_type]} ${tierIconColor[p.tier.tier_type]} overflow-hidden`}
                      >
                        <RewardImage reward={p.reward} imageUrl={p.tier.image_url} className="flex items-center justify-center" imgClassName="size-10 rounded-lg object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {getRewardDisplay(p.reward).title}
                        </p>
                        <p className={`text-xs ${tierStyles[p.tier.tier_type]}`}>
                          {tierLabel[p.tier.tier_type]} · {getRewardDisplay(p.reward).subtitle}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={playAgain}
                    className="gap-2 rounded-xl bg-amber-500 px-8 text-slate-950 hover:bg-amber-400"
                  >
                    <RotateCcw className="size-4" />
                    Spin Lagi
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={playAgain}
                    className="rounded-xl border-slate-700 bg-slate-800/50 px-8 text-white hover:bg-slate-700 hover:text-white"
                  >
                    Tutup
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GachaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <GachaPageInner />
    </Suspense>
  );
}
