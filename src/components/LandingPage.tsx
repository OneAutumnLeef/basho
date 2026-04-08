import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { getAssetUrl } from "@/lib/app-url";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [brushMode, setBrushMode] = useState(false);
  const [aerialVideoFailed, setAerialVideoFailed] = useState(false);
  const [brushVideoFailed, setBrushVideoFailed] = useState(false);

  return (
    <motion.div
      className={`absolute inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-colors duration-700`}
      style={{ background: brushMode ? "#ffffff" : "#000000" }}
      initial={{ y: 0 }}
      exit={{ y: "-100vh", opacity: 0, transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } }}
    >
      {/* Toggle Button — top right */}
      <motion.button
        onClick={() => setBrushMode((m) => !m)}
        className="absolute top-6 right-6 z-20 hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 hover:text-white lg:flex"
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
            {aerialVideoFailed ? (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.35),transparent_40%),radial-gradient(circle_at_75%_25%,rgba(56,189,248,0.28),transparent_35%),radial-gradient(circle_at_55%_80%,rgba(45,212,191,0.3),transparent_40%),linear-gradient(165deg,rgba(3,7,18,0.98),rgba(7,19,32,0.95))]" />
            ) : (
              <video
                autoPlay
                loop
                muted
                playsInline
                onError={() => setAerialVideoFailed(true)}
                className="h-full w-full scale-[1.2] object-cover opacity-60 mix-blend-screen grayscale-[20%]"
              >
                <source src="https://cdn.pixabay.com/video/2019/04/17/22822-330689405_large.mp4" type="video/mp4" />
              </video>
            )}
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
            {brushVideoFailed ? (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.38),transparent_42%),radial-gradient(circle_at_80%_65%,rgba(0,0,0,0.2),transparent_45%),linear-gradient(145deg,rgba(245,245,245,0.95),rgba(255,255,255,1))]" />
            ) : (
              <video
                autoPlay
                loop
                muted
                playsInline
                onError={() => setBrushVideoFailed(true)}
                className="w-[120vw] max-w-none"
                style={{ mixBlendMode: "multiply", marginTop: "-40px" }}
              >
                <source src={getAssetUrl("brush.mp4")} type="video/mp4" />
              </video>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <motion.h1
          className="text-7xl md:text-9xl font-black tracking-tighter mb-4"
          style={{
            color: brushMode ? "#ffffff" : "transparent",
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
          className="mb-12 whitespace-nowrap px-2 text-[clamp(0.6rem,3.4vw,1.5rem)] font-medium"
          style={{ color: brushMode ? "#ffffff" : "rgba(255,255,255,0.7)" }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        >
          From vibe to viable plans in under 60 seconds.
        </motion.p>

        <motion.button
          onClick={onStart}
          className={`group relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${brushMode ? "bg-black text-white" : "bg-white text-black"
            }`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
        >
          <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${brushMode ? "bg-black" : "bg-white"}`} />
          <ArrowUp className="h-6 w-6 transition-transform group-hover:-translate-y-1" />
        </motion.button>

        <motion.span
          className={`mt-4 text-xs font-bold uppercase tracking-widest transition-colors duration-700 ${brushMode ? "text-black/30" : "text-white/40"
            }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          Explore
        </motion.span>
      </div>

      {/* Credits */}
      <motion.div
        className="absolute bottom-6 left-0 right-0 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.8 }}
      >
        <p className={`text-[11px] font-medium tracking-widest uppercase transition-colors duration-700 ${brushMode ? "text-black/25" : "text-white/25"
          }`}>
          Built by{" "}
          <a
            href="https://derajyojith.dev"
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 transition-colors ${brushMode ? "hover:text-black/50" : "hover:text-white/50"
              }`}
          >
            Deraj Yojith
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
