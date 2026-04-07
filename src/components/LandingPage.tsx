import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <motion.div
      className="absolute inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black"
      initial={{ y: 0 }}
      exit={{ y: "-100vh", opacity: 0, transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } }}
    >
      {/* Background Video */}
      <div className="absolute inset-0 z-0 h-full w-full">
        {/* We use a stunning aerial public domain video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="h-full w-full object-cover opacity-60 mix-blend-screen grayscale-[20%]"
        >
          <source src="https://cdn.pixabay.com/video/2019/04/17/22822-330689405_large.mp4" type="video/mp4" />
        </video>
        {/* Deep gradient overlay to ensure text readability and match UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <motion.h1 
          className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 mb-4"
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        >
          Basho
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl font-medium text-white/70 max-w-lg mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        >
          Trip planning made easy.
        </motion.p>
        
        <motion.button
          onClick={onStart}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform hover:scale-110 active:scale-95"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
        >
          <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
          <ArrowUp className="h-6 w-6 transition-transform group-hover:-translate-y-1" />
        </motion.button>
        
        <motion.span
          className="mt-4 text-xs font-bold uppercase tracking-widest text-white/40"
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
