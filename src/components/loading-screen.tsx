"use client";

import { motion } from "framer-motion";
import { Box } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Box className="size-12 text-amber-400" />
        </motion.div>
        <p className="text-sm font-medium text-slate-400">Memuat...</p>
      </motion.div>
    </div>
  );
}
