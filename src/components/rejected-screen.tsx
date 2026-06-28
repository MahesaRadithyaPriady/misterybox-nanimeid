"use client";

import { Box } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const FLOATING_BOXES = [
  { color: "from-amber-400 to-orange-500", delay: 0, x: "10%", y: "15%", size: "size-8" },
  { color: "from-violet-400 to-fuchsia-500", delay: 1.2, x: "75%", y: "20%", size: "size-10" },
  { color: "from-sky-400 to-blue-500", delay: 0.6, x: "60%", y: "65%", size: "size-6" },
  { color: "from-emerald-400 to-teal-500", delay: 1.8, x: "25%", y: "70%", size: "size-9" },
  { color: "from-rose-400 to-pink-500", delay: 2.4, x: "85%", y: "45%", size: "size-7" },
  { color: "from-lime-400 to-green-500", delay: 3, x: "40%", y: "40%", size: "size-5" },
];

export function RejectedScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-slate-100">
      {FLOATING_BOXES.map((box, index) => (
        <motion.div
          key={index}
          className={`pointer-events-none absolute rounded-2xl bg-gradient-to-br ${box.color} p-4 shadow-lg shadow-black/30`}
          style={{ left: box.x, top: box.y }}
          animate={{
            y: [0, -24, 0],
            rotate: [0, 6, -6, 0],
          }}
          transition={{
            duration: 3.5 + index * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: box.delay,
          }}
        >
          <Box className={`${box.size} text-white`} />
        </motion.div>
      ))}

      <motion.div
        className="relative z-10 max-w-lg text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-violet-500/20 ring-2 ring-amber-500/30">
          <Box className="size-10 text-amber-400" />
        </div>
        <h1 className="mt-6 text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-violet-400 to-sky-400 sm:text-6xl">
          Akses Ditolak
        </h1>
        <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">Terjadi kesalahan</h2>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          Maaf, halaman ini tidak dapat diakses saat ini. Silakan coba lagi nanti.
        </p>
        <p className="mt-4 text-xs font-medium text-slate-500">tidak diketahui error code 001</p>
        <Link href="/">
          <Button className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-slate-950 hover:from-amber-400 hover:to-orange-400">
            Coba Lagi
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
