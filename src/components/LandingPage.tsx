import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import { useState } from "react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [brushMode, setBrushMode] = useState(false);

  return (
    <motion.div
      className={`absolute inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-colors duration-700`}
      style={{ background: brushMode ? "#f6f6f6" : "#000000" }}
      initial={{ y: 0 }}
      exit={{ y: "-100vh", opacity: 0, transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } }}
    >
      {/* Toggle Button — top right */}
      <motion.button
        onClick={() => setBrushMode((m) => !m)}
        className="absolute top-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-white/70 hover:bg-white/20 hover:text-white transition-all"
        title={brushMode ? "Switch to aerial view" : "Switch to brush stroke view"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          color: brushMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
          borderColor: brushMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
          background: brushMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.10)",
        }}
      >
        <Sparkles className="h-4 w-4" />
      </motion.button>

      <AnimatePresence mode="wait">
        {!brushMode ? (
          /* ── AERIAL MODE ─────────────────────── */
          <motion.div
            key="aerial"
            className="absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <video
              autoPlay loop muted playsInline
              className="h-full w-full object-cover opacity-60 mix-blend-screen grayscale-[20%]"
            >
              <source src="https://cdn.pixabay.com/video/2019/04/17/22822-330689405_large.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </motion.div>
        ) : (
          /* ── BRUSH STROKE MODE ───────────────── */
          <motion.div
            key="brush"
            className="absolute inset-0 z-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Video centered over text — covers heading + tagline */}
            <video
              autoPlay loop muted playsInline
              className="w-[120vw] max-w-none"
              style={{ mixBlendMode: "multiply", marginTop: "-40px" }}
            >
              <source src="/basho/brush.mp4" type="video/mp4" />
            </video>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <motion.h1
          className="text-7xl md:text-9xl font-black tracking-tighter mb-4"
          style={{ color: brushMode ? "#f6f6f6" : "transparent",
            backgroundImage: brushMode ? "none" : "linear-gradient(135deg, white, white, rgba(255,255,255,0.4))",
            WebkitBackgroundClip: brushMode ? "unset" : "text",
            backgroundClip: brushMode ? "unset" : "text",
          }}
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        >
          Basho
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl font-medium max-w-lg mb-12"
          style={{ color: brushMode ? "#f6f6f6" : "rgba(255,255,255,0.7)" }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        >
          Trip planning made easy.
        </motion.p>

        <motion.button
          onClick={onStart}
          className={`group relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${
            brushMode ? "bg-black text-white" : "bg-white text-black"
          }`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
        >
          <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${brushMode ? "bg-black" : "bg-white"}`} />
          <ArrowUp className="h-6 w-6 transition-transform group-hover:-translate-y-1" />
        </motion.button>

        <motion.span
          className={`mt-4 text-xs font-bold uppercase tracking-widest transition-colors duration-700 ${
            brushMode ? "text-black/30" : "text-white/40"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          Explore
        </motion.span>
      </div>
    </motion.div>
  );
}
